/**
 * Flexibility tests that make up a mobility test. Picked from common physio and climbing
 * screens, weighted towards what climbing needs (high steps, turnout, overhead reach,
 * forearms), and chosen so each one can be measured alone with a tape measure or the phone
 * held against the body.
 *
 * Order is the order they're tested in, grouped so you move from kneeling and standing to
 * sitting to lying down with as few setup changes as possible.
 */

export type BodyPart = 'ankles' | 'hamstrings' | 'hips' | 'shoulders' | 'upperBack' | 'wrists';

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  ankles: 'Ankles',
  hamstrings: 'Hamstrings',
  hips: 'Hips',
  shoulders: 'Shoulders',
  upperBack: 'Upper back',
  wrists: 'Wrists & forearms',
};

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

export type FlexibilityTest = {
  id: string;
  name: string;
  bodyPart: BodyPart;
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
    bodyPart: 'ankles',
    twoSided: true,
    instructions:
      'Half-kneel facing a wall with the front foot pointing straight at it. Keeping the heel down, drive the knee forward to touch the wall. Slide the foot back until the knee can only just touch without the heel lifting.',
    measurement: 'Distance from big toe to wall',
    method: { kind: 'distance', min: 0, max: 20 },
  },
  {
    id: 'forward-fold',
    name: 'Forward fold',
    bodyPart: 'hamstrings',
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
    id: 'wrist-extension',
    name: 'Wrist extension',
    bodyPart: 'wrists',
    twoSided: true,
    instructions:
      'Rest this forearm flat on a table, palm down, with the fingers relaxed or in a loose fist. Hold the phone flat on the back of the hand with your other hand. Keeping the forearm on the table, lift the hand up at the wrist as far as you can.',
    measurement: 'Angle the hand lifts from flat',
    method: { kind: 'tilt', startPosition: 'Hand resting flat on the table', startAngle: 0 },
  },
  {
    id: 'straddle',
    name: 'Straddle',
    bodyPart: 'hips',
    twoSided: false,
    instructions:
      'Sit with your back against a wall and legs straight. Slide your legs apart as wide as you can with the knees pointing up at the ceiling. Lay the phone flat, screen up, against the inside of your left thigh with its top pointing towards your foot. Keeping it flat, sweep it in an arc across to the inside of your right thigh, turning it so its top ends up pointing towards your right foot.',
    measurement: 'Angle between the legs',
    // Turning the phone from along one leg to along the other turns it by the angle between them.
    method: { kind: 'rotation', startPosition: 'Phone flat against the inside of your left thigh' },
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    bodyPart: 'hips',
    twoSided: true,
    instructions:
      'Sit with your back against a wall, soles of the feet together and heels pulled in as close as you can. Relax and let both knees drop towards the floor without pushing them down.',
    measurement: 'Distance from this knee to the floor',
    method: {
      kind: 'distance',
      min: 0,
      max: 40,
      hint: (value, body) => {
        const span = body.handSpan ?? DEFAULT_BODY.handSpan;
        return byThreshold(value, [
          [2, 'Knee on the floor'],
          [12, 'About a fist high'],
          [span + 5, 'About a hand-span high'],
          [Infinity, 'Higher than a hand-span'],
        ]);
      },
    },
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic rotation',
    bodyPart: 'upperBack',
    twoSided: true,
    instructions:
      'Kneel and sit back on your heels with your back straight. Hold the phone level with both hands, screen up and its bottom edge against your chest, and rotate your upper body to this side as far as you can, keeping your hips still.',
    measurement: 'Rotation angle of the upper back',
    method: { kind: 'rotation', startPosition: 'Chest facing straight ahead' },
  },
  {
    id: 'knee-to-chest',
    name: 'Knee to chest',
    bodyPart: 'hips',
    twoSided: true,
    instructions:
      'Lie on your back with both legs straight. Hold the phone flat on top of this thigh, just above the knee. Keep the other leg flat on the floor and pull this knee towards your chest as far as you can without the straight leg lifting.',
    measurement: 'Angle of the thigh from the floor',
    method: { kind: 'tilt', startPosition: 'Both legs straight on the floor', startAngle: 0 },
  },
  {
    id: 'shoulder-flexion',
    name: 'Overhead reach',
    bodyPart: 'shoulders',
    twoSided: false,
    instructions:
      'Lie on your back with knees bent and lower back pressed into the floor. Hold the phone between your palms with straight arms pointing at the ceiling. Keeping the arms straight, lower them overhead towards the floor without letting your back arch.',
    measurement: 'Shoulder angle, with arms by your sides as 0°',
    method: { kind: 'tilt', startPosition: 'Arms straight, pointing at the ceiling', startAngle: 90 },
  },
  {
    id: 'shoulder-rotation',
    name: 'Shoulder rotation',
    bodyPart: 'shoulders',
    twoSided: true,
    instructions:
      'Lie on your back with this upper arm out to the side at shoulder height and the elbow bent to 90°, fingers pointing at the ceiling. Hold the phone flat along this forearm with your other hand. Keeping the upper arm on the floor, let the forearm rotate back towards the floor beside your head.',
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
