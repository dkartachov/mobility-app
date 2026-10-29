/**
 * Flexibility tests that make up a mobility test. Picked from common physio and climbing
 * screens, weighted towards what climbing needs (high steps, turnout, overhead reach), and
 * chosen so each one can be measured alone with a tape measure or the phone held against the
 * body.
 *
 * Order is the order they're tested in, grouped so you move from kneeling and standing to
 * sitting to lying down with as few setup changes as possible.
 */

import type { ScoreArea } from './mobility-score';

export type Side = 'left' | 'right';

/**
 * How a test is measured:
 * - `tilt`: the phone is held along a limb and measures how far it tilts from the start position.
 *   `startAngle` is what the start position counts as, so the result reads in the usual units.
 * - `rotation`: the phone is held against the body and measures turning around the vertical axis.
 * - `distance`: measured with a tape measure and set on a slider, in centimetres. `min` and
 *   `max` cover a realistic range; only forward fold goes negative (reaching past the floor).
 */
export type MeasurementMethod =
  | { kind: 'tilt'; startPosition: string; startAngle: number }
  | { kind: 'rotation'; startPosition: string }
  | {
      kind: 'distance';
      min: number;
      max: number;
      /**
       * A body landmark for the slider's current value, to help place it without a tape measure.
       * Uses the person's own body measurements. Only landmarks, never a rating of how mobile
       * someone is.
       */
      hint?: (value: number, body: BodyMeasurements) => string | undefined;
    };

/** Optional body measurements from the profile, in cm. `null` when not entered. */
export type BodyMeasurements = {
  /** Wrist crease to the tip of the middle finger. */
  handLength: number | null;
  /** Base to tip of the middle finger, on the palm side. */
  fingerLength: number | null;
  /** Tip of the thumb to the tip of the little finger, spread wide. */
  handSpan: number | null;
};

export const BODY_MEASUREMENT_LABELS: Record<keyof BodyMeasurements, string> = {
  handLength: 'Hand length',
  fingerLength: 'Finger length',
  handSpan: 'Hand span',
};

/** Average adult sizes, used for any measurement that hasn't been entered. */
export const DEFAULT_BODY = {
  handLength: 18,
  fingerLength: 8,
  handSpan: 20,
} satisfies Record<keyof BodyMeasurements, number>;

/** The label of the first `[upTo, label]` pair that `value` is at or below. Pairs go in ascending order. */
function byThreshold(value: number, thresholds: [upTo: number, label: string][]) {
  return thresholds.find(([upTo]) => value <= upTo)?.[1];
}

export type PhoneMethod = Extract<MeasurementMethod, { kind: 'tilt' | 'rotation' }>;

/**
 * How a result turns into a 0–100 score: linearly from `zeroAt` (scores 0) to `fullAt` (scores
 * 100), clamped. `fullAt` is below `zeroAt` where smaller is better, like distances to the floor.
 *
 * Placeholder ranges, roughly from restricted to very mobile, until they're set from published
 * norms.
 */
export type TestScoring = { zeroAt: number; fullAt: number };

export type FlexibilityTest = {
  id: string;
  name: string;
  /** The part of the mobility score this test counts towards. */
  area: ScoreArea;
  /** What it tests within its area, for the score breakdown. */
  movement: string;
  scoring: TestScoring;
  /** Tested once per side when true. */
  twoSided: boolean;
  instructions: string;
  /** What the number means. */
  measurement: string;
  method: MeasurementMethod;
};

export const FLEXIBILITY_TESTS: FlexibilityTest[] = [
  {
    id: 'ankle-lunge',
    name: 'Ankle lunge',
    area: 'ankles',
    movement: 'Dorsiflexion',
    scoring: { zeroAt: 25, fullAt: 50 },
    twoSided: true,
    instructions:
      'Half-kneel facing a wall with this foot in front, pointing straight at the wall, and a hand on the wall for balance. Hold the phone flat against the front of this shin, just below the knee. Start with the shin upright, then keeping the heel down, drive the knee forward over the toes as far as you can.',
    measurement: 'Angle of the shin from vertical',
    // An angle rather than a knee-to-wall distance, so it doesn't depend on the length of the foot and shin.
    method: { kind: 'tilt', startPosition: 'Shin upright, knee over the ankle', startAngle: 0 },
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic rotation',
    area: 'thorax',
    movement: 'Rotation',
    scoring: { zeroAt: 20, fullAt: 70 },
    twoSided: true,
    instructions:
      'Kneel and sit back on your heels, leaning slightly forward over your knees to keep your lower back from turning. Cross your arms over your chest and hold the phone flat against your breastbone. Rotate your upper body to this side as far as you can, keeping your hips still.',
    measurement: 'Rotation angle of the upper back',
    method: { kind: 'rotation', startPosition: 'Chest facing straight ahead' },
  },
  {
    id: 'forward-fold',
    name: 'Forward fold',
    area: 'postChain',
    movement: 'Forward fold',
    scoring: { zeroAt: 30, fullAt: -20 },
    twoSided: false,
    instructions:
      'Stand with feet together and knees straight. Let your arms hang and slowly fold forward from the hips, reaching towards the floor. Hold the lowest point for 2 seconds without bouncing.',
    measurement: 'Fingertip distance to the floor, negative if you reach past it',
    method: {
      kind: 'distance',
      min: -30,
      max: 40,
      hint: (value, body) => {
        const hand = body.handLength ?? DEFAULT_BODY.handLength;
        const finger = body.fingerLength ?? DEFAULT_BODY.fingerLength;
        // Fingers curl a little against the floor, so landmarks count from just short of the full length.
        return byThreshold(value, [
          [-(hand - 1), 'Palms flat on the floor'],
          [-(finger - 2), 'Fingers flat on the floor'],
          [0, 'Fingertips touch the floor'],
          [10, 'Fingertips at the ankles'],
          [Infinity, 'Fingertips at the shins'],
        ]);
      },
    },
  },
  {
    id: 'overhead-squat',
    name: 'Overhead squat',
    area: 'overhead',
    movement: 'Overhead squat',
    scoring: { zeroAt: 30, fullAt: 0 },
    twoSided: false,
    instructions:
      'Stand facing a wall with feet shoulder-width apart and arms straight overhead. Squat until your thighs are level with the floor and stand back up, without your hands, head or knees touching the wall. Move your feet closer and try again until you find the closest you can still do it from.',
    measurement: 'Distance from your toes to the wall',
    method: { kind: 'distance', min: 0, max: 50 },
  },
  {
    id: 'straddle',
    name: 'Straddle',
    area: 'hips',
    movement: 'Abduction',
    scoring: { zeroAt: 60, fullAt: 150 },
    twoSided: false,
    instructions:
      'Sit with your back against a wall and legs straight. Slide your legs apart as wide as you can with the knees pointing up at the ceiling. Lay the phone flat, screen up, against the inside of your left thigh with its top pointing towards your foot. Keeping it flat, sweep it in an arc across to the inside of your right thigh, turning it so its top ends up pointing towards your right foot.',
    measurement: 'Angle between the legs',
    // Turning the phone from along one leg to along the other turns it by the angle between them.
    method: { kind: 'rotation', startPosition: 'Phone flat against the inside of your left thigh' },
  },
  {
    id: 'hip-external-rotation',
    name: 'Hip external rotation',
    area: 'hips',
    movement: 'External rotation',
    scoring: { zeroAt: 15, fullAt: 60 },
    twoSided: true,
    instructions:
      'Sit tall on the edge of a table with your thighs supported and feet hanging free, and tuck the other foot back under the table. Hold the phone lightly along the front of this shin. Keeping the thigh still and both sit bones on the table, swing this foot inwards, towards the other leg, as far as it goes.',
    measurement: 'Angle of the shin from vertical',
    method: { kind: 'tilt', startPosition: 'Shin hanging straight down', startAngle: 0 },
  },
  {
    id: 'hip-internal-rotation',
    name: 'Hip internal rotation',
    area: 'hips',
    movement: 'Internal rotation',
    scoring: { zeroAt: 10, fullAt: 50 },
    twoSided: true,
    instructions:
      'Sit tall on the edge of a table with your thighs supported and feet hanging free. Hold the phone lightly along the front of this shin. Keeping the thigh still and both sit bones on the table, swing this foot outwards, away from the other leg, as far as it goes.',
    measurement: 'Angle of the shin from vertical',
    method: { kind: 'tilt', startPosition: 'Shin hanging straight down', startAngle: 0 },
  },
  {
    id: 'knee-to-chest',
    name: 'Knee to chest',
    area: 'hips',
    movement: 'Flexion',
    scoring: { zeroAt: 70, fullAt: 135 },
    twoSided: true,
    instructions:
      'Lie on your back with both legs straight. Hold the phone flat on top of this thigh, just above the knee. Keep the other leg flat on the floor and pull this knee towards your chest as far as you can without the straight leg lifting.',
    measurement: 'Angle of the thigh from the floor',
    method: { kind: 'tilt', startPosition: 'Both legs straight on the floor', startAngle: 0 },
  },
  {
    id: 'overhead-reach',
    name: 'Overhead reach',
    area: 'overhead',
    movement: 'Flexion',
    scoring: { zeroAt: 120, fullAt: 180 },
    twoSided: true,
    instructions:
      'Lie on your back with knees bent and lower back pressed into the floor. Hold the phone in this hand with the arm and wrist straight, pointing at the ceiling. Keeping the arm straight, lower it overhead towards the floor without letting your back arch, your ribs flare or your body bend to the side.',
    measurement: 'Shoulder angle, with the arm by your side as 0°',
    method: { kind: 'tilt', startPosition: 'Arm straight, pointing at the ceiling', startAngle: 90 },
  },
  {
    id: 'shoulder-external-rotation',
    name: 'Shoulder external rotation',
    area: 'shoulders',
    movement: 'External rotation',
    scoring: { zeroAt: 30, fullAt: 100 },
    twoSided: true,
    instructions:
      'Lie on your back with this upper arm out to the side at shoulder height and the elbow bent to 90°, fingers pointing at the ceiling. Hold the phone flat along this forearm with your other hand. Keeping the upper arm on the floor, let the forearm rotate back towards the floor beside your head.',
    measurement: 'Angle of the forearm from vertical',
    method: { kind: 'tilt', startPosition: 'Forearm pointing at the ceiling', startAngle: 0 },
  },
  {
    id: 'shoulder-internal-rotation',
    name: 'Shoulder internal rotation',
    area: 'shoulders',
    movement: 'Internal rotation',
    scoring: { zeroAt: 20, fullAt: 70 },
    twoSided: true,
    instructions:
      'Lie on your back with this upper arm out to the side at shoulder height and the elbow bent to 90°, fingers pointing at the ceiling. Hold the phone flat along this forearm with your other hand. Keeping the upper arm on the floor and the front of the shoulder from lifting, let the forearm rotate forward towards the floor beside your hip.',
    measurement: 'Angle of the forearm from vertical',
    method: { kind: 'tilt', startPosition: 'Forearm pointing at the ceiling', startAngle: 0 },
  },
];

/** Stored with each result, so changing how a test is measured never misreads older results. */
export type Unit = 'deg' | 'cm';

export const METHOD_UNITS: Record<MeasurementMethod['kind'], Unit> = {
  tilt: 'deg',
  rotation: 'deg',
  distance: 'cm',
};

export const UNIT_LABELS: Record<Unit, string> = { deg: '°', cm: 'cm' };

export type TestStep = {
  test: FlexibilityTest;
  /** `null` for one-sided tests. */
  side: Side | null;
};

/** Every measurement in order, with two-sided tests split into a left and a right step. */
export const TEST_STEPS: TestStep[] = FLEXIBILITY_TESTS.flatMap((test): TestStep[] =>
  test.twoSided
    ? [
        { test, side: 'left' },
        { test, side: 'right' },
      ]
    : [{ test, side: null }]
);

export const SIDE_LABELS: Record<Side, string> = { left: 'Left side', right: 'Right side' };
