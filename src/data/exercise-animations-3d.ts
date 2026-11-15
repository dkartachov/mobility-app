import { SKELETON, type ArmPose, type Clip3D, type LegPose, type Pose3 } from '@/lib/rig3d';

/** How high an ankle sits with the foot flat or the shin lying on the floor, and a wrist with the palm down. */
const ANKLE_Y = 13;
const WRIST_Y = 11;

// --- Cat cow: hands and knees stay planted while the spine flows between rounded and arched ---

/** Knees on the floor under the hips, shins and the tops of the feet flat behind, hands under the shoulders. */
const ALL_FOURS = {
  pelvis: [0, 113, 0],
  pins: {
    rightHand: { at: [112, WRIST_Y, 30], toward: [1, 0, 0] },
    leftHand: { at: [112, WRIST_Y, -30], toward: [1, 0, 0] },
    rightFoot: { at: [-100, ANKLE_Y, 16], toward: [-1, 0, 0] },
    leftFoot: { at: [-100, ANKLE_Y, -16], toward: [-1, 0, 0] },
  },
} satisfies Partial<Pose3>;

/** How far the shoulders sit above the hips, which leaves the arms just short of straight. */
const SHOULDER_RISE = 45.5;

/**
 * The spine curved this far with the shoulders left at their height over the hands. A curved spine
 * spans less than a straight one, so the pelvis tips to make up for it: it tucks under as the back
 * rounds and tilts up as it arches, as it does on a real body.
 */
const onAllFours = (flex: number, neck: number): Pose3 => {
  const halfCurve = (flex * Math.PI) / 360;
  const span = flex === 0 ? SKELETON.torso : (SKELETON.torso * Math.sin(halfCurve)) / halfCurve;
  return {
    ...ALL_FOURS,
    lean: (Math.acos(SHOULDER_RISE / span) * 180) / Math.PI - flex / 2,
    spine: { flex },
    neck: { flex: neck },
  };
};

const CAT = onAllFours(70, 50);
const COW = onAllFours(-44, -42);

export const CAT_COW_3D: Clip3D = {
  view: '3d',
  camera: { yaw: 24, pitch: 12 },
  highlight: ['torso'],
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: COW },
    { ms: 1600, pose: CAT },
    { ms: 700, pose: CAT },
    { ms: 1600, pose: COW },
    { ms: 700, pose: COW },
  ],
};

// --- Shoulder external rotation: the elbow stays tucked in at the side while the forearm swings outward ---

/** Standing tall, the right elbow bent to 90° and the forearm turned this far out from straight ahead. */
const externalRotationAt = (degrees: number): Pose3 => ({
  pelvis: [0, 213, 0],
  rightArm: { elbow: 90, rotate: degrees },
  leftArm: { abduct: 5, elbow: 8 },
  rightLeg: { abduct: 3 },
  leftLeg: { abduct: 3 },
});
const ER_AHEAD = externalRotationAt(0);
const ER_OUT = externalRotationAt(65);

export const SHOULDER_EXTERNAL_ROTATION_3D: Clip3D = {
  view: '3d',
  // From in front and above, where a turn around the upper arm is a sweep across the screen.
  camera: { yaw: 78, pitch: 40, fit: 'upper' },
  highlight: ['rightArm'],
  trail: 'rightHand',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: ER_AHEAD },
    { ms: 500, pose: ER_AHEAD },
    { ms: 1500, pose: ER_OUT },
    { ms: 900, pose: ER_OUT },
    { ms: 1500, pose: ER_AHEAD },
  ],
};

/** Standing tall with the arms hanging and the feet a little apart. */
const STANDING: Pose3 = {
  pelvis: [0, 213, 0],
  leftArm: { abduct: 5, elbow: 8 },
  rightArm: { abduct: 5, elbow: 8 },
  rightLeg: { abduct: 3 },
  leftLeg: { abduct: 3 },
};

/** Lying on the back, the spine flat on the floor with the head toward -x, and the chin tucked a little so the head rests on the floor. */
const LYING_ON_BACK = {
  pelvis: [0, 22, 0],
  lean: -90,
  neck: { flex: 10 },
} satisfies Partial<Pose3>;

// --- Shoulder abduction: a straight arm rises out to the side and on overhead ---

/** The right arm straight and raised this far out to the side from hanging. */
const abductionAt = (degrees: number): Pose3 => ({ ...STANDING, rightArm: { abduct: degrees } });
const ABDUCTION_DOWN = abductionAt(0);
/** About the average result for adults (Gill 2020). */
const ABDUCTION_UP = abductionAt(160);

export const SHOULDER_ABDUCTION_3D: Clip3D = {
  view: '3d',
  // From the front, where the arm sweeps out across the screen, turned a little toward the moving
  // arm so it's the nearer one: it goes over the torso and the still arm tucks behind its shoulder.
  camera: { yaw: 78, pitch: 10, fit: 'upper' },
  highlight: ['rightArm'],
  trail: 'rightHand',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: ABDUCTION_DOWN },
    { ms: 400, pose: ABDUCTION_DOWN },
    { ms: 2200, pose: ABDUCTION_UP },
    { ms: 700, pose: ABDUCTION_UP },
    { ms: 2200, pose: ABDUCTION_DOWN },
  ],
};

// --- Overhead reach: lying on the back with knees bent, a straight arm lowers from the ceiling to overhead ---

/** Knees bent with the feet flat on the floor, the right arm straight and raised this far from by the side. */
const overheadAt = (degrees: number): Pose3 => ({
  ...LYING_ON_BACK,
  rightArm: { flex: degrees },
  leftArm: { abduct: 10 },
  pins: {
    rightFoot: { at: [125, ANKLE_Y, 18], toward: [1, 0, 0] },
    leftFoot: { at: [125, ANKLE_Y, -18], toward: [1, 0, 0] },
  },
});
const OVERHEAD_UP = overheadAt(90);
/** About the average result for adults (Gill 2020). */
const OVERHEAD_DOWN = overheadAt(165);

export const OVERHEAD_REACH_3D: Clip3D = {
  view: '3d',
  // From the side and a little above, where the arm's arc from the ceiling to overhead is flat on the screen.
  camera: { yaw: 10, pitch: 18 },
  highlight: ['rightArm'],
  trail: 'rightHand',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: OVERHEAD_UP },
    { ms: 400, pose: OVERHEAD_UP },
    { ms: 1800, pose: OVERHEAD_DOWN },
    { ms: 900, pose: OVERHEAD_DOWN },
    { ms: 1800, pose: OVERHEAD_UP },
  ],
};

// --- Hip abduction: lying on the back, one straight leg slides out to the side along the floor ---

/** Both legs straight, the right one slid this far out from the other, and the arms out wide enough to stay clear of it. */
const hipAbductionAt = (degrees: number): Pose3 => ({
  ...LYING_ON_BACK,
  rightArm: { abduct: 45 },
  leftArm: { abduct: 45 },
  rightLeg: { abduct: degrees },
});
const HIP_ABDUCTION_IN = hipAbductionAt(0);
/** About the average result for adults (Hallaçeli 2014). */
const HIP_ABDUCTION_OUT = hipAbductionAt(40);

export const HIP_ABDUCTION_3D: Clip3D = {
  view: '3d',
  // From high above the right side, where the leg sweeps across the floor.
  camera: { yaw: 0, pitch: 65 },
  highlight: ['rightLeg'],
  trail: 'rightFoot',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: HIP_ABDUCTION_IN },
    { ms: 400, pose: HIP_ABDUCTION_IN },
    { ms: 1600, pose: HIP_ABDUCTION_OUT },
    { ms: 900, pose: HIP_ABDUCTION_OUT },
    { ms: 1600, pose: HIP_ABDUCTION_IN },
  ],
};

// --- Marching: standing tall, knees lifting to hip height in turn, arms swinging opposite ---

const MARCH_STAND: Pose3 = STANDING;
/** The thigh lifted level with the shin hanging under the knee, and the opposite arm swung forward. */
const KNEE_UP: LegPose = { flex: 90, knee: 90, ankle: -10 };
const ARM_FORWARD: ArmPose = { flex: 35, elbow: 25 };
const ARM_BACK: ArmPose = { flex: -30, elbow: 15 };
const MARCH_RIGHT_UP: Pose3 = { ...STANDING, rightLeg: KNEE_UP, leftArm: ARM_FORWARD, rightArm: ARM_BACK };
const MARCH_LEFT_UP: Pose3 = { ...STANDING, leftLeg: KNEE_UP, rightArm: ARM_FORWARD, leftArm: ARM_BACK };

export const MARCHING_3D: Clip3D = {
  view: '3d',
  // From in front and to the right, where the knees come up toward the camera without hiding each other.
  camera: { yaw: 50, pitch: 10 },
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 1,
  // Each knee slows to a stop at the top and the body passes through standing without stopping.
  keyframes: [
    { ms: 0, pose: MARCH_STAND },
    { ms: 450, pose: MARCH_RIGHT_UP, ease: 'out' },
    { ms: 450, pose: MARCH_STAND, ease: 'in' },
    { ms: 450, pose: MARCH_LEFT_UP, ease: 'out' },
    { ms: 450, pose: MARCH_STAND, ease: 'in' },
  ],
};

// --- Leg swings: a hand on a wall for balance, the outside leg swings forward and back from the hip ---

/**
 * The left hand flat on a wall at shoulder height, the right leg swung this far forward. The right
 * hand rests on the waist with the elbow out and back, so the arm stays out of the leg's way.
 */
const legSwingAt = (flex: number, knee = 0, ankle = 0): Pose3 => ({
  ...STANDING,
  rightLeg: { flex, knee, ankle, abduct: 3 },
  pins: {
    leftHand: { at: [15, 330, -105], toward: [0, 1, 0], pole: [-0.3, -1, -0.3] },
    rightHand: { at: [0, 262, 30], toward: [1, -0.5, 0], pole: [-1, 0, 1] },
  },
});
/** The knee soft and the toes drawn up a little through the back of the swing and under the hip, so the foot clears the floor. */
const LEG_SWING_BACK = legSwingAt(-30, 15, 10);
const LEG_SWING_PASSING = legSwingAt(10, 30, 10);
const LEG_SWING_FORWARD = legSwingAt(65);

export const LEG_SWINGS_3D: Clip3D = {
  view: '3d',
  // From the right side, a little in front, where the swing is flat on the screen.
  camera: { yaw: 20, pitch: 10 },
  highlight: ['rightLeg'],
  trail: 'rightFoot',
  stillFrame: 2,
  // The leg slows to a stop at each end of the swing and is fastest passing under the hip.
  keyframes: [
    { ms: 0, pose: LEG_SWING_BACK },
    { ms: 700, pose: LEG_SWING_PASSING, ease: 'in' },
    { ms: 700, pose: LEG_SWING_FORWARD, ease: 'out' },
    { ms: 700, pose: LEG_SWING_PASSING, ease: 'in' },
    { ms: 700, pose: LEG_SWING_BACK, ease: 'out' },
  ],
};
