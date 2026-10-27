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

export type FlexibilityTest = {
  id: string;
  name: string;
  bodyPart: BodyPart;
  /** Tested once per side when true. */
  twoSided: boolean;
  instructions: string;
  /** What the slider will turn into once real measurements exist. */
  measurement: string;
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
  },
  {
    id: 'forward-fold',
    name: 'Forward fold',
    bodyPart: 'hamstrings',
    twoSided: false,
    instructions:
      'Stand with feet together and knees straight. Let your arms hang and slowly fold forward from the hips, reaching towards the floor. Hold the lowest point for 2 seconds without bouncing.',
    measurement: 'Fingertip distance to the floor',
  },
  {
    id: 'wrist-extension',
    name: 'Wrist extension',
    bodyPart: 'wrists',
    twoSided: true,
    instructions:
      'Place your palm flat on a table with the fingers pointing towards you and the elbow straight. Lean the forearm back as far as you can while keeping the whole palm on the table.',
    measurement: 'Angle between forearm and table',
  },
  {
    id: 'straddle',
    name: 'Straddle',
    bodyPart: 'hips',
    twoSided: false,
    instructions:
      'Sit with your back against a wall and legs straight. Slide your legs apart as wide as you can with the knees pointing up at the ceiling.',
    measurement: 'Distance between the heels',
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    bodyPart: 'hips',
    twoSided: true,
    instructions:
      'Sit with your back against a wall, soles of the feet together and heels pulled in as close as you can. Relax and let both knees drop towards the floor without pushing them down.',
    measurement: 'Distance from this knee to the floor',
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic rotation',
    bodyPart: 'upperBack',
    twoSided: true,
    instructions:
      'Kneel and sit back on your heels with your back straight. Hold the phone flat against your chest with both hands and rotate your upper body to this side as far as you can, keeping your hips still.',
    measurement: 'Rotation angle of the upper back',
  },
  {
    id: 'knee-to-chest',
    name: 'Knee to chest',
    bodyPart: 'hips',
    twoSided: true,
    instructions:
      'Lie on your back with both legs straight. Keep the other leg flat on the floor and pull this knee towards your chest as far as you can without the straight leg lifting.',
    measurement: 'Angle of the thigh from the floor',
  },
  {
    id: 'shoulder-flexion',
    name: 'Overhead reach',
    bodyPart: 'shoulders',
    twoSided: false,
    instructions:
      'Lie on your back with knees bent and lower back pressed into the floor. With straight arms and thumbs up, raise both arms overhead towards the floor without letting your back arch.',
    measurement: 'Distance from wrists to the floor',
  },
  {
    id: 'shoulder-rotation',
    name: 'Shoulder rotation',
    bodyPart: 'shoulders',
    twoSided: true,
    instructions:
      'Lie on your back with this upper arm out to the side at shoulder height and the elbow bent to 90°, fingers pointing at the ceiling. Keeping the upper arm on the floor, let the forearm rotate back towards the floor beside your head.',
    measurement: 'Angle of the forearm from vertical',
  },
];

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
