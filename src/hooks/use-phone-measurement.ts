import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { PhoneMethod } from '@/data/mobility-tests';

// Rotation adds up gyroscope readings, so it needs a fairly fast rate to not miss turning between them.
const UPDATE_INTERVAL_MS = 20;
/** How long to hold the start position before it's zeroed. */
const ZERO_HOLD_MS = 1500;
/** How long to hold the end position before the result is saved. */
const RESULT_HOLD_MS = 3000;
/** Stillness shorter than this isn't shown as progress towards zeroing or saving. */
const HOLD_SHOWN_AFTER_MS = 300;
/** A hold restarts if the position drifts further than this from where it began. */
const HOLD_TOLERANCE_DEG = 3;
/** Must move at least this far from the start, so holding still at the start doesn't save 0°. */
const MIN_MOVE_DEG = 10;
/** Rotation gives up as unavailable if no gyroscope reading has arrived by then. */
const GYRO_TIMEOUT_MS = 1000;
/** Low-pass smoothing of the gravity direction, 0–1 (lower is smoother). */
const GRAVITY_SMOOTHING = 0.25;

export type PhoneMeasurementPhase = 'idle' | 'zeroing' | 'measuring' | 'done' | 'unavailable';

type Vec = [number, number, number];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec) => Math.sqrt(dot(a, a));
const toDeg = (rad: number) => (rad * 180) / Math.PI;

function angleBetween(a: Vec, b: Vec) {
  const cos = dot(a, b) / (length(a) * length(b));
  return toDeg(Math.acos(Math.min(1, Math.max(-1, cos))));
}

const isVec = (v: number[]): v is Vec => v.every(Number.isFinite);

/**
 * Gravity in the phone's frame, without the hand's own acceleration when the platform separates
 * it. Samples can arrive with fields missing (often the first few, as each sensor starts up)
 * despite the types, so anything unusable is `null`.
 */
function gravityOf({ accelerationIncludingGravity: g, acceleration: a }: DeviceMotionMeasurement): Vec | null {
  if (!g) return null;
  const withGravity = [g.x, g.y, g.z];
  const withoutHand = a ? [g.x - a.x, g.y - a.y, g.z - a.z] : null;
  // Too short to have a direction, e.g. when the platform hasn't separated gravity out yet.
  const usable = (v: number[] | null): v is Vec => !!v && isVec(v) && length(v) > 1;
  if (usable(withoutHand)) return withoutHand;
  return usable(withGravity) ? withGravity : null;
}

/**
 * Rotation rate in deg/s around the phone's x, y and z axes. The docs say alpha/beta/gamma are
 * z/x/y, but the native modules actually send z/y/x on iOS and x/y/z on Android.
 */
function rotationRateOf({ rotationRate: r }: DeviceMotionMeasurement): Vec | null {
  if (!r) return null;
  const rate = Platform.OS === 'ios' ? [r.gamma, r.beta, r.alpha] : [r.alpha, r.beta, r.gamma];
  return isVec(rate) ? rate : null;
}

type Tracking = {
  gravity: Vec | null;
  /** Gravity direction at the start position (tilt) or `null` before zeroing. */
  zero: Vec | null;
  /** Turning around the vertical axis since zeroing, in degrees, signed (rotation). */
  yaw: number;
  /** When the current hold began, `null` when not holding. */
  stillSince: number | null;
  /** Where the current hold began: gravity (and turning, for rotation) while zeroing, the measured angle after. */
  holdGravity: Vec | null;
  holdYaw: number;
  holdMoved: number;
  startedAt: number;
  /** Whether any gyroscope reading has arrived yet. */
  hasGyro: boolean;
  /** Sensor timestamp of the last gyroscope reading, in seconds. */
  lastGyroAt: number | null;
};

type Callbacks = { onZeroed: () => void; onResult: (angle: number) => void };

/**
 * Measures an angle hands-free. After `start()`, hold the start position still to zero it
 * (`onZeroed`), move into the stretch, then hold still at the end to save the result
 * (`onResult`).
 *
 * Tilt compares the direction of gravity to the start position, so it works whichever way the
 * phone is held along the limb. Rotation integrates the gyroscope around the gravity axis, which
 * the phone can't see by tilt alone.
 */
export function usePhoneMeasurement(method: PhoneMethod, callbacks: Callbacks) {
  const [phase, setPhase] = useState<PhoneMeasurementPhase>('idle');
  /** Live reading while measuring, then the saved result. */
  const [angle, setAngle] = useState(0);
  /** 0–1 towards zeroing (start position) or saving (end position) while holding still. */
  const [holdProgress, setHoldProgress] = useState(0);
  const subscription = useRef<ReturnType<typeof DeviceMotion.addListener>>(null);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  /** Bumped on every start and stop, so a start still awaiting permission knows it's been superseded. */
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current++;
    subscription.current?.remove();
    subscription.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    stop();
    const thisRun = run.current;
    const available = await DeviceMotion.isAvailableAsync();
    const { granted } = await DeviceMotion.requestPermissionsAsync();
    // Cancelled, unmounted or started again while waiting.
    if (thisRun !== run.current) return;
    if (!available || !granted) {
      setPhase('unavailable');
      return;
    }

    const startAngle = method.kind === 'tilt' ? method.startAngle : 0;
    const startedAt = Date.now();
    const t: Tracking = {
      gravity: null,
      zero: null,
      yaw: 0,
      stillSince: null,
      holdGravity: null,
      holdYaw: 0,
      holdMoved: 0,
      startedAt,
      hasGyro: false,
      lastGyroAt: null,
    };
    let phaseNow: 'zeroing' | 'measuring' = 'zeroing';
    setPhase('zeroing');
    setHoldProgress(0);
    setAngle(startAngle);

    DeviceMotion.setUpdateInterval(UPDATE_INTERVAL_MS);
    subscription.current = DeviceMotion.addListener((sample) => {
      const now = Date.now();

      const rate = rotationRateOf(sample);
      if (rate) t.hasGyro = true;
      // Time since the previous gyroscope reading, from the sensor's own clock: JS delivery can
      // lag, and Android can deliver the same reading twice (0 here, so it isn't counted twice).
      let gyroDt = 0;
      const gyroAt = sample.rotationRate?.timestamp;
      if (rate && gyroAt !== undefined && Number.isFinite(gyroAt)) {
        if (t.lastGyroAt !== null) gyroDt = Math.min(Math.max(gyroAt - t.lastGyroAt, 0), 0.2);
        t.lastGyroAt = gyroAt;
      }
      if (method.kind === 'rotation' && !t.hasGyro && now - t.startedAt > GYRO_TIMEOUT_MS) {
        stop();
        setPhase('unavailable');
        return;
      }

      const raw = gravityOf(sample);
      // Rotation needs both readings from the same sample to integrate it.
      if (!raw || (method.kind === 'rotation' && !rate)) return;
      const previous = t.gravity;
      t.gravity = previous
        ? (previous.map((v, i) => v + GRAVITY_SMOOTHING * (raw[i] - v)) as Vec)
        : raw;

      if (method.kind === 'rotation' && rate) {
        // Rate around the vertical axis. Its sign depends on the platform's axis conventions,
        // so only the size of the total is used. Tracked while zeroing too, to tell if the body
        // is still turning; it's reset to 0 at the start position.
        t.yaw += (dot(rate, t.gravity) / length(t.gravity)) * gyroDt;
      }

      /**
       * How long the current hold has lasted, in ms. Stillness is judged by position only: a hold
       * restarts from the current position whenever it drifts more than `HOLD_TOLERANCE_DEG` from
       * where it began, so a slow, steady movement isn't a hold. Turning speed isn't used, since
       * the tremble of a hold at the limit of a stretch reads as fast turning on the gyroscope even
       * though the position barely changes. `counts` is false where holding can't save.
       */
      const holdFor = (counts: boolean, drift: number, markStart: () => void) => {
        if (!counts) {
          t.stillSince = null;
          return 0;
        }
        if (t.stillSince === null || drift > HOLD_TOLERANCE_DEG) {
          markStart();
          t.stillSince = now;
        }
        return now - t.stillSince;
      };
      const showHold = (stillFor: number, holdMs: number) =>
        // Shown only after a moment of stillness, so it doesn't flicker while moving slowly.
        // Stepped so it re-renders a few dozen times per hold, not on every sample.
        setHoldProgress(stillFor < HOLD_SHOWN_AFTER_MS ? 0 : Math.round((stillFor / holdMs) * 40) / 40);

      if (phaseNow === 'zeroing') {
        const gravity = t.gravity;
        const yaw = t.yaw;
        const drift = t.holdGravity
          ? Math.max(angleBetween(t.holdGravity, gravity), Math.abs(yaw - t.holdYaw))
          : Infinity;
        const stillFor = holdFor(true, drift, () => {
          t.holdGravity = gravity;
          t.holdYaw = yaw;
        });
        showHold(stillFor, ZERO_HOLD_MS);
        if (stillFor < ZERO_HOLD_MS) return;
        t.zero = t.gravity;
        t.yaw = 0;
        t.stillSince = null;
        phaseNow = 'measuring';
        setPhase('measuring');
        setHoldProgress(0);
        callbacksRef.current.onZeroed();
        return;
      }

      const moved = method.kind === 'rotation' ? Math.abs(t.yaw) : angleBetween(t.zero!, t.gravity);
      const reading = Math.round(startAngle + moved);
      setAngle(reading);

      // Holding still near the start doesn't count towards saving.
      const stillFor = holdFor(moved >= MIN_MOVE_DEG, Math.abs(moved - t.holdMoved), () => {
        t.holdMoved = moved;
      });
      showHold(stillFor, RESULT_HOLD_MS);

      if (stillFor >= RESULT_HOLD_MS) {
        stop();
        setPhase('done');
        setHoldProgress(0);
        callbacksRef.current.onResult(reading);
      }
    });
  }, [method, stop]);

  const cancel = useCallback(() => {
    stop();
    setPhase('idle');
    setHoldProgress(0);
  }, [stop]);

  return { phase, angle, holdProgress, start, cancel };
}
