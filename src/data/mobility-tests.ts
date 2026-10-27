/**
 * Flexibility tests that make up a mobility test. Picked from common physio and climbing
 * screens (knee-to-wall, sit-and-reach, back scratch, Draper's high step…), weighted towards
 * what climbing needs: high steps, turnout, overhead reach and forearm flexibility.
 *
 * Order is the order they're tested in, grouped so you move from standing to sitting to
 * lying down with as few setup changes as possible.
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
    id: 'high-step',
    name: 'High step',
    bodyPart: 'hips',
    twoSided: true,
    instructions:
      'Stand facing a wall with your toes about 25 cm away. Keep the standing leg straight and your hips square and close to the wall, then lift the other foot as high as you can and place it flat on the wall.',
    measurement: 'Height of the foot off the floor',
  },
  {
    id: 'back-scratch',
    name: 'Back scratch',
    bodyPart: 'shoulders',
    twoSided: true,
    instructions:
      'Reach this arm over the shoulder and down your back, and the other arm up behind your back from below. Walk the fingers towards each other without forcing it.',
    measurement: 'Gap or overlap between the middle fingers',
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
    id: 'hip-internal-rotation',
    name: 'Hip internal rotation',
    bodyPart: 'hips',
    twoSided: true,
    instructions:
      'Sit tall on a chair or box with hips and knees at 90°. Keeping the thigh still and the knee in line with the hip, swing the foot out to the side as far as you can.',
    measurement: 'Angle of the shin from vertical',
  },
  {
    id: 'sit-and-reach',
    name: 'Sit and reach',
    bodyPart: 'hamstrings',
    twoSided: false,
    instructions:
      'Sit on the floor with your legs straight and soles flat against a wall or box. Keeping the knees straight, stack your hands and reach forward slowly. Hold the furthest point for 2 seconds.',
    measurement: 'Fingertip reach past the toes',
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
    id: 'shoulder-flexion',
    name: 'Overhead reach',
    bodyPart: 'shoulders',
    twoSided: false,
    instructions:
      'Lie on your back with knees bent and lower back pressed into the floor. With straight arms and thumbs up, raise both arms overhead towards the floor without letting your back arch.',
    measurement: 'Distance from wrists to the floor',
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic rotation',
    bodyPart: 'upperBack',
    twoSided: true,
    instructions:
      'Kneel on all fours and sit back towards your heels. Put this hand behind your head and rotate that elbow up towards the ceiling as far as you can, keeping the other hand planted.',
    measurement: 'Rotation angle of the upper back',
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
