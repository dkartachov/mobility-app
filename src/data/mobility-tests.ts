/**
 * Flexibility tests that make up a mobility test. Picked from common physio and climbing
 * screens, weighted towards what climbing needs (high steps, turnout, overhead reach), and
 * chosen so each one can be measured alone with a tape measure or the phone held against the
 * body, and has published norms to score it against (see the README).
 *
 * Order is the order they're tested in, grouped so you move from standing to sitting to lying
 * down with as few setup changes as possible.
 */

import type { ScoreArea } from './mobility-score';

export type Side = 'left' | 'right';

/**
 * How a test is measured:
 * - `tilt`: the phone is held along a limb and measures how far it tilts from the start position.
 *   `startAngle` is what the start position counts as, so the result reads in the usual units.
 * - `rotation`: the phone is held against the body and measures turning around the vertical axis.
 * - `distance`: measured with a tape measure and set on a slider, in centimetres. `min` and
 *   `max` cover a realistic range; only sit and reach goes negative (falling short of the toes).
 */
export type MeasurementMethod =
  | { kind: 'tilt'; startPosition: string; startAngle: number }
  | { kind: 'rotation'; startPosition: string }
  | {
      kind: 'distance';
      min: number;
      max: number;
      /** Slider step, 1 cm when not set. */
      step?: number;
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

export type Sex = 'male' | 'female';

/**
 * How results are spread among healthy adults, from published norms where there are any. A
 * result scores the percentile it falls at, assuming a normal distribution, see `scoreResult`.
 *
 * Most norms come from a physio measuring with a goniometer, often moving the joint for the
 * person (passive), so a self-measured active result can read a few degrees lower.
 */
export type TestNorm = {
  /** Average result by sex, for adults up to `NORM_PEAK_AGE`. */
  mean: Record<Sex, number>;
  /** Standard deviation of results around the mean. */
  sd: number;
  /** Change in the average per decade past `NORM_PEAK_AGE` by sex, in the test's units. */
  perDecade: Record<Sex, number>;
  /**
   * - `strong`: from a normative study of the same movement.
   * - `moderate`: converted from norms for a closely related measure.
   * - `limited`: estimated from small studies, clinical cut-offs or coaching use.
   */
  evidence: 'strong' | 'moderate' | 'limited';
};

/** Most norms hold steady until about this age and decline after. */
export const NORM_PEAK_AGE = 30;

export type FlexibilityTest = {
  id: string;
  name: string;
  /** The part of the mobility score this test counts towards. */
  area: ScoreArea;
  /** What it tests within its area, for the score breakdown. */
  movement: string;
  norm: TestNorm;
  /** Tested once per side when true. */
  twoSided: boolean;
  instructions: string;
  /** What the number means. */
  measurement: string;
  method: MeasurementMethod;
};

export const FLEXIBILITY_TESTS: FlexibilityTest[] = [
  {
    id: 'knee-to-wall',
    name: 'Knee to wall',
    area: 'ankles',
    movement: 'Dorsiflexion',
    norm: {
      // Weight-bearing lunge, big toe to wall: 10–12 cm (SD 2.7–3) in healthy young adults, men
      // slightly further, declining with age and most from 60 (McBride 2026, 899 adults).
      mean: { male: 11, female: 10.5 },
      sd: 3,
      perDecade: { male: -0.5, female: -0.5 },
      evidence: 'moderate',
    },
    twoSided: true,
    instructions:
      'Face a wall with this foot in front, pointing straight at the wall, the other foot behind and a hand on the wall for balance. Keeping the front heel on the floor, bend the knee forward until it touches the wall. Move the foot back a little at a time until it is as far as it can be with the knee still touching and the heel still down.',
    measurement: 'Distance from your big toe to the wall',
    // Half centimetres, since a centimetre is a third of the spread between people.
    method: { kind: 'distance', min: 0, max: 20, step: 0.5 },
  },
  {
    id: 'shoulder-abduction',
    name: 'Shoulder abduction',
    area: 'shoulders',
    movement: 'Abduction',
    norm: {
      // Active abduction standing, with an inclinometer, 2404 adults without shoulder pain (Gill
      // 2020): about 156° from 20 to 44, falling 4–5° a decade after.
      mean: { male: 156, female: 157 },
      sd: 15,
      perDecade: { male: -5, female: -4 },
      evidence: 'strong',
    },
    twoSided: true,
    instructions:
      'Stand tall with this arm hanging straight by your side, holding the phone in this hand with the palm facing forward. Keeping the arm and wrist straight, raise it out to the side and up overhead as far as you can, without leaning to the other side or shrugging.',
    measurement: 'Shoulder angle, with the arm by your side as 0°',
    method: { kind: 'tilt', startPosition: 'Arm hanging straight by your side', startAngle: 0 },
  },
  {
    id: 'shoulder-external-rotation',
    name: 'Shoulder external rotation',
    area: 'shoulders',
    movement: 'External rotation',
    norm: {
      // Active, standing with the elbow at the side, 2404 adults without shoulder pain (Gill 2020),
      // judged by eye to the nearest 5°: about 62° in men and 72° in women aged 20–29, declining
      // more in women.
      mean: { male: 62, female: 72 },
      sd: 16,
      perDecade: { male: -3, female: -4 },
      evidence: 'strong',
    },
    twoSided: true,
    instructions:
      'Stand tall with this elbow tucked against your side and bent to 90°, forearm pointing straight ahead. Hold the phone in this hand, in line with the forearm, and keep the wrist straight. Keeping the elbow against your side, rotate the forearm outwards as far as you can.',
    measurement: 'Rotation angle of the forearm',
    // The forearm stays level, so its turn outwards is turning around the vertical axis. Only that
    // turning counts, so how the phone is gripped doesn't matter, but a wrist bending sideways does.
    method: { kind: 'rotation', startPosition: 'Forearm pointing straight ahead' },
  },
  {
    id: 'hip-external-rotation',
    name: 'Hip external rotation',
    area: 'hips',
    movement: 'External rotation',
    norm: {
      // Seated, with an examiner rotating the leg (passive), 151 adults aged about 22 (Han 2015),
      // which is how this test is done. Rotation declines only a little with age (Roach & Miles
      // 1991).
      mean: { male: 43, female: 40 },
      sd: 8,
      perDecade: { male: -1.5, female: -1.5 },
      evidence: 'strong',
    },
    twoSided: true,
    instructions:
      'Sit tall on the edge of a table with your thighs supported and feet hanging free, and tuck the other foot back under the table. Strap the phone along the front of this shin. Relax the leg while a partner holds the knee still and slowly swings the foot inwards, towards the other leg, until it stops or you feel a firm stretch. Keep both sit bones on the table.',
    measurement: 'Angle of the shin from vertical',
    method: { kind: 'tilt', startPosition: 'Shin hanging straight down', startAngle: 0 },
  },
  {
    id: 'hip-internal-rotation',
    name: 'Hip internal rotation',
    area: 'hips',
    movement: 'Internal rotation',
    norm: {
      // Seated, with an examiner rotating the leg (passive), 151 adults aged about 22 (Han 2015).
      mean: { male: 41, female: 47 },
      sd: 8.5,
      perDecade: { male: -1.5, female: -1.5 },
      evidence: 'strong',
    },
    twoSided: true,
    instructions:
      'Sit tall on the edge of a table with your thighs supported and feet hanging free. Strap the phone along the front of this shin. Relax the leg while a partner holds the knee still and slowly swings the foot outwards, away from the other leg, until it stops or you feel a firm stretch. Keep both sit bones on the table.',
    measurement: 'Angle of the shin from vertical',
    method: { kind: 'tilt', startPosition: 'Shin hanging straight down', startAngle: 0 },
  },
  {
    id: 'sit-and-reach',
    name: 'Sit and reach',
    area: 'hamstrings',
    movement: 'Forward fold',
    norm: {
      // Canadian Health Measures Survey 2016–17 (Statistics Canada), a national sample: medians of
      // 24.5 cm (men) and 31.1 cm (women) aged 20–29 on a flexometer with the feet at 26 cm, so
      // 1.5 cm short of and 5 cm past the toes. SD from the 10th–90th percentile spread.
      mean: { male: -1.5, female: 5 },
      sd: 10,
      perDecade: { male: -1.1, female: -0.6 },
      evidence: 'strong',
    },
    twoSided: false,
    instructions:
      'Sit on the floor with your legs straight and together, and the soles of your feet flat against the bottom stair or a sturdy box. Lay a tape measure along the top with 0 at the edge by your toes, running away from you. With one hand on top of the other, slowly reach forward along the tape as far as you can, keeping the knees straight. Hold the furthest point for 2 seconds without bouncing, and take the best of three.',
    measurement: 'Fingertip distance past your toes, negative if you fall short',
    method: {
      kind: 'distance',
      min: -30,
      max: 30,
      hint: (value, body) => {
        const hand = body.handLength ?? DEFAULT_BODY.handLength;
        const finger = body.fingerLength ?? DEFAULT_BODY.fingerLength;
        // The ankles sit about 8 cm back from the soles with the feet upright against the step.
        return byThreshold(value, [
          [-9, 'Fingertips at the shins'],
          [-1, 'Fingertips at the tops of your feet'],
          [1, 'Fingertips at your toes'],
          [finger, 'Fingers past your toes'],
          [hand, 'Palms past your toes'],
          [Infinity, 'Wrists past your toes'],
        ]);
      },
    },
  },
  {
    id: 'knee-to-chest',
    name: 'Knee to chest',
    area: 'hips',
    movement: 'Flexion',
    norm: {
      // Supine, passive goniometer, 674 healthy people (CDC, Soucie 2011): 130° in men and 134° in
      // women aged 20–44, about 3° less at 45–69. SD estimated from the published intervals.
      mean: { male: 130, female: 134 },
      sd: 10,
      perDecade: { male: -1.3, female: -1.2 },
      evidence: 'strong',
    },
    twoSided: true,
    instructions:
      'Lie on your back with both legs straight. Strap the phone to the outside of this thigh, just above the knee, so your hands are free. Keep the other leg flat on the floor and, holding this knee with both hands, pull it towards your chest as far as you can without the straight leg lifting.',
    measurement: 'Angle of the thigh from the floor',
    // Tilt follows the phone's angle to gravity, so it reads the thigh's angle on the side of the
    // thigh as well as on top. Above the knee, not across it, so bending the knee doesn't move it.
    method: { kind: 'tilt', startPosition: 'Both legs straight on the floor', startAngle: 0 },
  },
  {
    id: 'straight-leg-raise',
    name: 'Straight leg raise',
    area: 'hamstrings',
    movement: 'Leg raise',
    norm: {
      // Passive, lying on the back: 79° ± 18 in men and 89° ± 12 in women aged about 25 (Marshall &
      // Siegler 2014, 90 adults). Women about 8° further and no change with age from 20 to 79
      // (Youdas 2005, 214 adults), whose full tables are paywalled.
      mean: { male: 79, female: 89 },
      sd: 15,
      perDecade: { male: 0, female: 0 },
      evidence: 'moderate',
    },
    twoSided: true,
    instructions:
      "Lie on your back with both legs straight. Strap the phone to the outside of this thigh, just above the knee, and loop a towel, belt or strap around the ball of this foot. Use something that doesn't stretch, so the leg stays still at the top. Keeping both knees straight and the other leg flat on the floor, pull the leg up with it as far as you can, stopping at a firm stretch behind the thigh.",
    measurement: 'Angle of the leg from the floor',
    // Same phone position as knee to chest. With the knee straight, the thigh's angle is the leg's.
    method: { kind: 'tilt', startPosition: 'Both legs straight on the floor', startAngle: 0 },
  },
  {
    id: 'hip-abduction',
    name: 'Hip abduction',
    area: 'hips',
    movement: 'Abduction',
    norm: {
      // Active, lying on the back: about 45° is the standard clinical value (AAOS), and the US
      // national health survey found only 3–5° less from young to old adults, with little
      // difference between the sexes (Roach & Miles 1991, 1892 people).
      mean: { male: 42, female: 42 },
      sd: 10,
      perDecade: { male: -1, female: -1 },
      evidence: 'moderate',
    },
    twoSided: true,
    instructions:
      'Lie on your back with both legs straight. Strap the phone to the front of this leg, just below the knee. Keeping the knee straight and pointing at the ceiling and your hips level, slide this leg out to the side along the floor as far as you can.',
    measurement: 'Angle of the leg out from straight',
    // The leg stays on the floor, so sliding it out is turning around the vertical axis. Only that
    // turning counts, so it doesn't matter where on the leg the phone sits or which way it faces,
    // as long as the knee stays straight so the shin moves with the thigh.
    method: { kind: 'rotation', startPosition: 'Both legs straight and together' },
  },
  {
    id: 'overhead-reach',
    name: 'Overhead reach',
    area: 'shoulders',
    movement: 'Flexion',
    norm: {
      // Active flexion with an inclinometer, 2404 adults without shoulder pain (Gill 2020): about
      // 166° from 20 to 44, falling about 4° a decade after.
      mean: { male: 166, female: 165 },
      sd: 13,
      perDecade: { male: -4, female: -4 },
      evidence: 'strong',
    },
    twoSided: true,
    instructions:
      'Lie on your back with knees bent and lower back pressed into the floor. Hold the phone in this hand with the arm and wrist straight, pointing at the ceiling. Keeping the arm straight, lower it overhead towards the floor without letting your back arch, your ribs flare or your body bend to the side.',
    measurement: 'Shoulder angle, with the arm by your side as 0°',
    method: { kind: 'tilt', startPosition: 'Arm straight, pointing at the ceiling', startAngle: 90 },
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
