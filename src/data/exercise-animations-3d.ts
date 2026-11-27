import { distance, shiftedPose, SKELETON, solveJoint3, solvePose, strapPoints, type ArmPose, type Bend, type Block, type Clip3D, type Fingers, type Keyframe3, type LegPose, type Pin, type Pose3, type Skeleton, type Vec3 } from '@/lib/rig3d';

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
  // In the palm, in line with the forearm with the thumb toward the ceiling, so the phone stands on
  // its edge with the screen toward the body.
  phone: { limb: 'rightArm', bone: 2, face: 'inside' },
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
  // In the hand, palm forward, the screen with it.
  phone: { limb: 'rightArm', bone: 2, face: 'front' },
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

/**
 * Knees bent with the feet flat on the floor, the left arm straight and raised this far from by the
 * side. It's the arm away from the camera, so the phone's screen, facing in toward the body, faces
 * the camera.
 */
const overheadAt = (degrees: number): Pose3 => ({
  ...LYING_ON_BACK,
  leftArm: { flex: degrees },
  rightArm: { abduct: 10 },
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
  highlight: ['leftArm'],
  // In the hand, in line with the arm, the screen facing in toward the body.
  phone: { limb: 'leftArm', bone: 2, face: 'inside', startReading: 90 },
  trail: 'leftHand',
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
  // Strapped to the front of the leg, just below the knee.
  phone: { limb: 'rightLeg', bone: 1, at: 0.2, face: 'front' },
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

// --- Knee to wall: lunging at a wall, the front knee drives forward to touch it with the heel down ---

/** The front ankle is at 0, so the toes end about here. */
const KTW_TOES = SKELETON.foot + 10;
/** The toes sit this far from the wall: about 11 cm, the average result for adults (McBride 2026). */
const KTW_WALL = KTW_TOES + 26;
const KTW_FRONT_ANKLE: Vec3 = [0, ANKLE_Y, SKELETON.hip];
/** The back foot is up on its toes, a stride behind. */
const KTW_BACK_ANKLE: Vec3 = [-124, 32, -SKELETON.hip];

/**
 * The front shin tipped this far forward of upright over its planted foot and the thigh this far
 * above level, which places the hips. The hands stay flat on the wall at chest height, elbows out,
 * which keeps the arms above the legs the camera frames.
 */
const kneeToWallAt = (shin: number, thigh: number, lean: number): Pose3 => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const knee = [SKELETON.shin * Math.sin(radians(shin)), ANKLE_Y + SKELETON.shin * Math.cos(radians(shin))];
  return {
    pelvis: [knee[0] - SKELETON.thigh * Math.cos(radians(thigh)), knee[1] + SKELETON.thigh * Math.sin(radians(thigh)), 0],
    lean,
    neck: { flex: -lean },
    pins: {
      rightFoot: { at: KTW_FRONT_ANKLE, toward: [1, 0, 0] },
      leftFoot: { at: KTW_BACK_ANKLE, toward: [0.85, -0.53, 0], pole: [1, 0.3, 0] },
      rightHand: { at: [KTW_WALL - 9, 300, 44], toward: [0, 1, 0], pole: [-0.3, -0.2, 1] },
      leftHand: { at: [KTW_WALL - 9, 300, -44], toward: [0, 1, 0], pole: [-0.3, -0.2, -1] },
    },
  };
};
const KTW_BACK = kneeToWallAt(14, 62, 6);
/** The knee is 12.5 thick in front of the joint, so this is where it meets the wall. */
const KTW_SHIN_AT_WALL = (Math.asin((KTW_WALL - 12.5) / SKELETON.shin) * 180) / Math.PI;
const KTW_TOUCHING = kneeToWallAt(KTW_SHIN_AT_WALL, 58, 9);

export const KNEE_TO_WALL_3D: Clip3D = {
  view: '3d',
  // From the right and a little behind, which looks past the figure at the face of the wall the
  // knee comes to, with the shin's tip forward flat on the screen. Raised enough to see the tape
  // on the floor.
  camera: { yaw: -14, pitch: 24, fit: 'lower' },
  highlight: ['rightLeg'],
  scenery: [{ from: [KTW_WALL, 0, -130], to: [KTW_WALL + 24, 520, 130] }],
  // On the floor from the wall back along the front foot, on the side the camera sees, which
  // measures from the big toe.
  tape: { from: [KTW_WALL, 0, SKELETON.hip + 24], to: [-25, 0, SKELETON.hip + 24] },
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: KTW_BACK },
    { ms: 400, pose: KTW_BACK },
    { ms: 1300, pose: KTW_TOUCHING },
    { ms: 800, pose: KTW_TOUCHING },
    { ms: 1300, pose: KTW_BACK },
  ],
};

// --- Seated hip rotation: on the edge of a table, the thigh stays put while the shin swings like a pendulum ---

const TABLE_TOP = 150;
/** The table stops short of the knees, so the shins hang free and a foot can tuck back under it. */
const TABLE_EDGE = 68;
const TABLE: Block[] = [
  { from: [-120, TABLE_TOP - 14, -112], to: [TABLE_EDGE, TABLE_TOP, 112] },
  ...([
    [-112, -104],
    [-112, 90],
    [TABLE_EDGE - 22, -104],
    [TABLE_EDGE - 22, 90],
  ] as const).map(([x, z]): Block => ({ from: [x, 0, z], to: [x + 14, TABLE_TOP - 14, z + 14] })),
];

/**
 * Sitting tall on the table with the thighs level and the hands on the table beside the hips. The
 * right thigh is turned this far outward, which swings its foot in toward the other leg; negative
 * turns it inward and the foot swings out. The left knee is bent this far.
 */
const seatedRotationAt = (rotate: number, leftKnee: number): Pose3 => ({
  pelvis: [0, TABLE_TOP + 17, 0],
  rightLeg: { flex: 90, abduct: 8, knee: 90, rotate },
  leftLeg: { flex: 90, abduct: 8, knee: leftKnee },
  pins: {
    rightHand: { at: [-8, TABLE_TOP + WRIST_Y, 66], toward: [1, 0, 0.2] },
    leftHand: { at: [-8, TABLE_TOP + WRIST_Y, -66], toward: [1, 0, -0.2] },
  },
});

/** About the average result for adults, in both directions (Hallaçeli 2014). */
const HIP_ROTATION = 42;

const seatedRotation = (rotate: number, leftKnee: number): Clip3D => ({
  view: '3d',
  // From the front, where the shin's swing is flat on the screen, turned toward the moving leg and
  // raised enough to see the table top the thighs rest on.
  camera: { yaw: 70, pitch: 14 },
  highlight: ['rightLeg'],
  // Strapped along the front of the shin.
  phone: { limb: 'rightLeg', bone: 1, at: 0.5, face: 'front' },
  // A partner holds the knee and swings the foot.
  partner: true,
  trail: 'rightFoot',
  scenery: TABLE,
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: seatedRotationAt(0, leftKnee) },
    { ms: 500, pose: seatedRotationAt(0, leftKnee) },
    { ms: 1800, pose: seatedRotationAt(rotate, leftKnee) },
    { ms: 1500, pose: seatedRotationAt(rotate, leftKnee) },
    { ms: 1800, pose: seatedRotationAt(0, leftKnee) },
  ],
});

/** The other foot tucks back under the table, out of the way of the one swinging in. */
export const HIP_EXTERNAL_ROTATION_3D = seatedRotation(HIP_ROTATION, 125);
export const HIP_INTERNAL_ROTATION_3D = seatedRotation(-HIP_ROTATION, 90);

// --- Sit and reach: legs straight with the soles against a box, folding forward to reach along its top ---

const SIT_PELVIS_Y = 21;
/** How far the straight legs slope down from the hips to heels resting on the floor. */
const SIT_LEG_DROP = (Math.asin((SIT_PELVIS_Y - ANKLE_Y) / (SKELETON.thigh + SKELETON.shin)) * 180) / Math.PI;
/** The soles are flat against the near side of the box. */
const BOX_X = 212;
const BOX_TOP = 70;

/**
 * Sitting with the pelvis tipped and the spine rounded this far forward, the legs flat on the floor
 * and the toes up. The hands are one on top of the other with the wrists at `hands`.
 */
const sitAndReachAt = (lean: number, flex: number, neck: number, hands: Vec3): Pose3 => {
  // The ankles make up for the slope, so the soles are upright against the box.
  const leg: LegPose = { flex: 90 - SIT_LEG_DROP + lean, ankle: SIT_LEG_DROP };
  return {
    pelvis: [0, SIT_PELVIS_Y, 0],
    lean,
    spine: { flex },
    neck: { flex: neck },
    rightLeg: leg,
    leftLeg: leg,
    pins: {
      rightHand: { at: [hands[0], hands[1] + 3, 5], toward: [1, 0, -0.1], pole: [-0.3, -1, 1] },
      leftHand: { at: [hands[0], hands[1], -5], toward: [1, 0, 0.1], pole: [-0.3, -1, -1] },
    },
  };
};
const SIT_REACH_UP = sitAndReachAt(-4, 14, 0, [128, 118, 0]);
/** The fingertips end a little past the toes, about the average result for adults (Statistics Canada 2016–17). */
const SIT_REACH_FOLDED = sitAndReachAt(8, 52, 12, [BOX_X - 6, BOX_TOP + 10, 0]);

export const SIT_AND_REACH_3D: Clip3D = {
  view: '3d',
  // From the right and a little behind, which looks past the feet at the side of the box they press on.
  camera: { yaw: -12, pitch: 12 },
  highlight: ['rightLeg', 'leftLeg'],
  trail: 'rightHand',
  scenery: [{ from: [BOX_X, 0, -62], to: [BOX_X + 105, BOX_TOP, 62] }],
  // Along the top of the box, 0 at the edge by the toes and running away.
  tape: { from: [BOX_X, BOX_TOP, 0], to: [BOX_X + 100, BOX_TOP, 0] },
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: SIT_REACH_UP },
    { ms: 400, pose: SIT_REACH_UP },
    { ms: 1800, pose: SIT_REACH_FOLDED },
    { ms: 2000, pose: SIT_REACH_FOLDED },
    { ms: 1600, pose: SIT_REACH_UP },
  ],
};

// --- Knee to chest: lying on the back, both hands pull one knee in while the other leg stays flat ---

/** A straight leg lying on the floor: lowered from the hips to rest on its heel. */
const LEG_FLAT: LegPose = { flex: -2.6 };
const ARM_REST_Y = 14;

/**
 * The right thigh raised this far from the floor with the knee bent this far, and the hands clasped
 * over the front of the shin just below the knee, elbows out to the sides. `open` holds the hands
 * that far out to either side of the shin instead.
 */
const kneeHeldAt = (flex: number, knee: number, open = 0): Pose3 => {
  const pose: Pose3 = { ...LYING_ON_BACK, rightLeg: { flex, knee }, leftLeg: LEG_FLAT };
  const [, kneeAt, ankle] = solvePose(pose).rightLeg;
  const along: Vec3 = [(ankle[0] - kneeAt[0]) / SKELETON.shin, (ankle[1] - kneeAt[1]) / SKELETON.shin, 0];
  // Around the front of the shin: square to it, on the side away from the thigh.
  const hold: Vec3 = [kneeAt[0] + along[0] * 16 - along[1] * 13, kneeAt[1] + along[1] * 16 + along[0] * 13, kneeAt[2]];
  return {
    ...pose,
    pins: {
      rightHand: { at: [hold[0] + 5, hold[1] + 1, hold[2] + 12 + open], toward: [0, 0, -1], pole: [0.2, -0.6, 1] },
      leftHand: { at: [hold[0], hold[1], hold[2] - 14 - open], toward: [0, 0, 1], pole: [0.2, -0.6, -1] },
    },
  };
};
const KNEE_TO_CHEST_FLAT: Pose3 = {
  ...LYING_ON_BACK,
  rightLeg: LEG_FLAT,
  leftLeg: LEG_FLAT,
  pins: {
    rightHand: { at: [20, ARM_REST_Y, 46], toward: [1, 0, 0], pole: [0.2, -0.6, 1] },
    leftHand: { at: [20, ARM_REST_Y, -46], toward: [1, 0, 0], pole: [0.2, -0.6, -1] },
  },
};
/** The knee comes up to meet the hands, which then pull it in. */
const KNEE_TO_CHEST_HELD = kneeHeldAt(118, 128);
/** The knee up where the hands will take it, with the hands open either side of it, ready to close in from the sides. */
const KNEE_TO_CHEST_LIFTED = kneeHeldAt(118, 128, 16);
/** About the average result for adults (Soucie 2011). */
const KNEE_TO_CHEST_IN = kneeHeldAt(130, 135);

export const KNEE_TO_CHEST_3D: Clip3D = {
  view: '3d',
  // From the side, turned toward the feet and raised, so the knee comes in over the body rather
  // than in line with it and the leg left flat on the floor shows behind.
  camera: { yaw: 24, pitch: 22 },
  highlight: ['rightLeg'],
  // Strapped to the outside of the thigh, just above the knee.
  phone: { limb: 'rightLeg', bone: 0, at: 0.78, face: 'outside' },
  stillFrame: 4,
  // The knee comes up with the hands reaching either side of it, then the hands snap shut on the
  // shin and pull. Going straight from the floor to the shin would carry the near hand behind the
  // thigh. Letting go goes the same way back.
  keyframes: [
    { ms: 0, pose: KNEE_TO_CHEST_FLAT },
    { ms: 400, pose: KNEE_TO_CHEST_FLAT },
    { ms: 1000, pose: KNEE_TO_CHEST_LIFTED },
    { ms: 250, pose: KNEE_TO_CHEST_HELD },
    { ms: 1000, pose: KNEE_TO_CHEST_IN },
    { ms: 1500, pose: KNEE_TO_CHEST_IN },
    { ms: 1000, pose: KNEE_TO_CHEST_HELD },
    { ms: 250, pose: KNEE_TO_CHEST_LIFTED },
    { ms: 1000, pose: KNEE_TO_CHEST_FLAT },
  ],
};

// --- Straight leg raise: lying on the back, a strap around the foot pulls the straight leg up ---

/** The right leg straight and raised this far from the floor, toes drawn back by the strap. */
const legRaisedAt = (degrees: number): Pose3 => ({
  ...LYING_ON_BACK,
  rightLeg: { flex: degrees + LEG_FLAT.flex!, ankle: 8 },
  leftLeg: LEG_FLAT,
});

/** The strap doesn't stretch, so the hands are always this far from the ball of the foot. */
const STRAP_LENGTH = 205;

/**
 * Both hands on the strap, pulling from the foot toward `chest`. The strap stays the same length,
 * so the hands come in to the chest as the leg rises.
 */
const strapHeldAt = (degrees: number, chest: Vec3): Pose3 => {
  const pose = legRaisedAt(degrees);
  const [, right, left] = strapPoints(solvePose(pose), 'rightFoot');
  const ball: Vec3 = [(right[0] + left[0]) / 2, (right[1] + left[1]) / 2, (right[2] + left[2]) / 2];
  const gap = Math.hypot(chest[0] - ball[0], chest[1] - ball[1], chest[2] - ball[2]);
  const pull: Vec3 = [(chest[0] - ball[0]) / gap, (chest[1] - ball[1]) / gap, (chest[2] - ball[2]) / gap];
  // The strap runs to the middle of each hand, half a hand past the wrist.
  const reach = STRAP_LENGTH + SKELETON.hand / 2;
  const wrist = (z: number): Vec3 => [ball[0] + pull[0] * reach, ball[1] + pull[1] * reach, ball[2] + pull[2] * reach + z];
  const toward: Vec3 = [-pull[0], -pull[1], -pull[2]];
  return {
    ...pose,
    pins: {
      rightHand: { at: wrist(12), toward, pole: [0.3, -0.5, 1] },
      leftHand: { at: wrist(-12), toward, pole: [0.3, -0.5, -1] },
    },
  };
};
const STRAP_DOWN = strapHeldAt(0, [-40, 70, 16]);
/** About the average result for adults (Youdas 2005). */
const STRAP_UP = strapHeldAt(72, [-110, 62, 16]);

export const STRAIGHT_LEG_RAISE_3D: Clip3D = {
  view: '3d',
  // From the side and a little above, where the leg's swing up is flat on the screen.
  camera: { yaw: 10, pitch: 16 },
  highlight: ['rightLeg'],
  trail: 'rightFoot',
  strap: 'rightFoot',
  // Strapped to the outside of the thigh, just above the knee.
  phone: { limb: 'rightLeg', bone: 0, at: 0.78, face: 'outside' },
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: STRAP_DOWN },
    { ms: 400, pose: STRAP_DOWN },
    { ms: 1700, pose: STRAP_UP },
    { ms: 1500, pose: STRAP_UP },
    { ms: 1700, pose: STRAP_DOWN },
  ],
};

// --- Active straight leg raise: the same lift with no strap, the leg's own muscles raising it, arms by the sides ---

/** The right leg straight and raised this far from the floor, the arms resting on the floor by the sides, palms down. */
const activeLegRaisedAt = (degrees: number): Pose3 => ({
  ...LYING_ON_BACK,
  rightLeg: { flex: degrees + LEG_FLAT.flex! },
  leftLeg: LEG_FLAT,
  pins: KNEE_TO_CHEST_FLAT.pins,
});
const ACTIVE_LEG_DOWN = activeLegRaisedAt(0);
/** A little short of where the strap takes it: a leg lifts less far by itself than it can be pulled. */
const ACTIVE_LEG_UP = activeLegRaisedAt(65);

export const ACTIVE_STRAIGHT_LEG_RAISE_3D: Clip3D = {
  view: '3d',
  // From the side and a little above, where the leg's swing up is flat on the screen.
  camera: { yaw: 10, pitch: 16 },
  highlight: ['rightLeg'],
  trail: 'rightFoot',
  stillFrame: 2,
  // Up, a short hold at the top, and a slower way down, as the instructions ask.
  keyframes: [
    { ms: 0, pose: ACTIVE_LEG_DOWN },
    { ms: 300, pose: ACTIVE_LEG_DOWN },
    { ms: 1500, pose: ACTIVE_LEG_UP },
    { ms: 500, pose: ACTIVE_LEG_UP },
    { ms: 2200, pose: ACTIVE_LEG_DOWN },
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

// --- The 90 to 90: sitting with both knees at 90°, the front shin across the body and the back thigh out to the side ---

/** How high the hips sit off the floor, and how far a thigh slopes down from them to a knee resting on it. */
const NINETY_PELVIS_Y = 21;
const NINETY_THIGH_DROP = (Math.asin((NINETY_PELVIS_Y - ANKLE_Y) / SKELETON.thigh) * 180) / Math.PI;

/**
 * The legs of the 90 to 90, lying on the floor whatever the pelvis's `lean`. The right leg is in
 * front: its thigh points ahead and is turned out so the shin lies across the body. The left thigh
 * points out to the side with its shin back along the floor. `lift` turns the left thigh inward,
 * which raises its foot with the knee as the pivot.
 */
const ninetyLegs = (lean: number, lift = 0): Pick<Pose3, 'rightLeg' | 'leftLeg'> => ({
  rightLeg: { flex: 90 - NINETY_THIGH_DROP + lean, rotate: 90, knee: 90 },
  leftLeg: { flex: lean, abduct: 90 - NINETY_THIGH_DROP, rotate: -lift, knee: 90, ankle: -50 },
});

/** Sitting tall, one hand on the floor outside the front knee and the other resting on the front shin. */
const NINETY_TALL: Pose3 = {
  pelvis: [0, NINETY_PELVIS_Y, 0],
  lean: 6,
  spine: { flex: 8 },
  ...ninetyLegs(6),
  pins: {
    rightHand: { at: [40, WRIST_Y, 72], toward: [1, 0, 0.2], pole: [-1, 0, 0.6] },
    leftHand: { at: [88, 34, -50], toward: [1, -0.3, 0], pole: [-0.3, -0.3, -1] },
  },
};
/** Hinged forward from the hips over the front shin, back long, the hands on the floor past it. */
const NINETY_FOLDED: Pose3 = {
  pelvis: [0, NINETY_PELVIS_Y, 0],
  lean: 48,
  spine: { flex: 24 },
  neck: { flex: -25 },
  ...ninetyLegs(48),
  pins: {
    rightHand: { at: [215, WRIST_Y, 46], toward: [1, 0, 0], pole: [0, 0.1, 1] },
    leftHand: { at: [215, WRIST_Y, -46], toward: [1, 0, 0], pole: [0, 0.1, -1] },
  },
};

export const NINETY_TO_NINETY_3D: Clip3D = {
  view: '3d',
  // From the front on the back leg's side and above, where both legs' right angles lie open on the
  // floor and the fold over the front shin goes across the screen.
  camera: { yaw: 145, pitch: 26 },
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: NINETY_TALL },
    { ms: 500, pose: NINETY_TALL },
    { ms: 1800, pose: NINETY_FOLDED },
    { ms: 3500, pose: NINETY_FOLDED },
    { ms: 1800, pose: NINETY_TALL },
  ],
};

// --- 90 to 90 side foot lifts: in the 90 to 90, the back foot lifts off the floor with its knee down ---

/** Sitting tall and square to the front leg, leaning in just enough to rest a hand on each thigh, the back foot lifted this far. */
const sideFootAt = (lift: number): Pose3 => ({
  pelvis: [0, NINETY_PELVIS_Y, 0],
  lean: 8,
  spine: { flex: 8 },
  ...ninetyLegs(8, lift),
  pins: {
    rightHand: { at: [52, 38, 17], toward: [1, -0.12, 0], pole: [-0.6, 0, 1] },
    leftHand: { at: [6, 38, -54], toward: [0, -0.12, -1], pole: [-0.6, 0, -1] },
  },
});
const SIDE_FOOT_DOWN = sideFootAt(0);
const SIDE_FOOT_LIFTED = sideFootAt(24);

export const NINETY_TO_NINETY_SIDE_FOOT_LIFTS_3D: Clip3D = {
  view: '3d',
  // From the back leg's side, a little in front and above: the back shin is nearest and its lift
  // is up the screen, with the front leg's right angle still showing beyond.
  camera: { yaw: 135, pitch: 25 },
  highlight: ['leftLeg'],
  trail: 'leftFoot',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: SIDE_FOOT_DOWN },
    { ms: 500, pose: SIDE_FOOT_DOWN },
    { ms: 1000, pose: SIDE_FOOT_LIFTED },
    { ms: 600, pose: SIDE_FOOT_LIFTED },
    { ms: 1400, pose: SIDE_FOOT_DOWN },
  ],
};

// --- 90 to 90 rotations: leaning back on the hands with the feet planted wide, both knees drop to one side and then the other, one leading ---

/** The heels stay where they are while the knees go over. */
const ROTATIONS_FOOT_X = 130;
const ROTATIONS_FOOT_Z = 70;

/**
 * Each knee dropped this far to the figure's right, from -1, all the way to the left, to 1, with 0
 * pointing at the ceiling. The pelvis rolls with the knees and the spine turns back, so the chest
 * stays facing ahead.
 */
const rotationsAt = (right: number, left: number): Pose3 => {
  const side = (right + left) / 2;
  // A leg dropping to its own side opens out onto the floor; dropping across, it turns in toward it.
  const knee = (leg: 1 | -1, to: number): Vec3 => (to * leg > 0 ? [-0.2 * Math.abs(to), 1 - Math.abs(to), to] : [0, 1 - 0.8 * Math.abs(to), to]);
  const toes = (leg: 1 | -1, to: number): Vec3 =>
    to * leg > 0 ? [1 - 0.5 * Math.abs(to), 0.2 * Math.abs(to), 0.85 * to] : [1 - 0.15 * Math.abs(to), 0.1 * Math.abs(to), 0.5 * to];
  return {
    pelvis: [0, NINETY_PELVIS_Y, 0],
    lean: -25,
    turn: -5 * side,
    spine: { twist: 5 * side },
    neck: { flex: 20 },
    pins: {
      // Set wide behind the hips, far enough back that the arms are close to straight.
      rightHand: { at: [-110, WRIST_Y, 84], toward: [-1, 0, 0.5], pole: [-1, 0, 0.3] },
      leftHand: { at: [-110, WRIST_Y, -84], toward: [-1, 0, -0.5], pole: [-1, 0, -0.3] },
      rightFoot: { at: [ROTATIONS_FOOT_X, ANKLE_Y, ROTATIONS_FOOT_Z], toward: toes(1, right), pole: knee(1, right) },
      leftFoot: { at: [ROTATIONS_FOOT_X, ANKLE_Y, -ROTATIONS_FOOT_Z], toward: toes(-1, left), pole: knee(-1, left) },
    },
  };
};
const ROTATIONS_RIGHT = rotationsAt(1, 1);
const ROTATIONS_LEFT = rotationsAt(-1, -1);

const ROTATIONS_SWEEP_MS = 2200;
const ROTATIONS_SWEEP_STEPS = 10;
/** The part of a sweep each leg takes: the leading leg is done this far through, and the other starts this far in. */
const ROTATIONS_LEAD_ENDS = 0.78;
const ROTATIONS_FOLLOW_STARTS = 0.22;

/**
 * The knees going over to one side (1 the figure's right, -1 its left) from the other. They don't
 * go together: the leg on the side they're going to, which opens outward, lifts first, and the
 * other follows it over. Each leg eases in and out of its own part of the sweep, so the frames in
 * between are placed along it rather than eased again.
 */
const rotationsSweep = (to: 1 | -1): Keyframe3[] => {
  const eased = (t: number) => t * t * (3 - 2 * t);
  const frames: Keyframe3[] = [];
  for (let step = 1; step <= ROTATIONS_SWEEP_STEPS; step++) {
    const t = step / ROTATIONS_SWEEP_STEPS;
    const lead = -to + 2 * to * eased(Math.min(1, t / ROTATIONS_LEAD_ENDS));
    const follow = -to + 2 * to * eased(Math.max(0, (t - ROTATIONS_FOLLOW_STARTS) / (1 - ROTATIONS_FOLLOW_STARTS)));
    frames.push({ ms: ROTATIONS_SWEEP_MS / ROTATIONS_SWEEP_STEPS, pose: to === 1 ? rotationsAt(lead, follow) : rotationsAt(follow, lead), ease: 'none' });
  }
  return frames;
};

export const NINETY_TO_NINETY_ROTATIONS_3D: Clip3D = {
  view: '3d',
  // From the front and above, where the knees sweep from side to side across the screen.
  camera: { yaw: 80, pitch: 32 },
  highlight: ['rightLeg', 'leftLeg'],
  // The thighs come off the front of the hips toward the camera, so the legs stay over them.
  over: ['rightLeg', 'leftLeg'],
  // No trail: each knee's path from out on the floor, up, and in across the body is lopsided from
  // here, and one knee's doesn't show that both go over.
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: ROTATIONS_RIGHT },
    ...rotationsSweep(-1),
    { ms: 300, pose: ROTATIONS_LEFT },
    ...rotationsSweep(1),
    { ms: 300, pose: ROTATIONS_RIGHT },
  ],
};

// --- Pancake: sitting with straight legs spread wide, folding forward between them from the hips ---

/** How far each leg is out from straight ahead, which puts 100° between them. */
const PANCAKE_SPREAD = 50;
/** How far the spread legs slope down from the hips to heels resting on the floor. */
const PANCAKE_LEG_DROP =
  (Math.asin((SIT_PELVIS_Y - ANKLE_Y) / ((SKELETON.thigh + SKELETON.shin) * Math.cos((PANCAKE_SPREAD * Math.PI) / 180))) * 180) / Math.PI;
/** At the bottom of the fold the pelvis has tipped this far forward and the back has rounded this far, which brings the chest down near the floor. */
const PANCAKE_LEAN = 50;
const PANCAKE_ROUNDING = 45;
/** Sitting tall, the back is this close to straight. */
const PANCAKE_TALL_ROUNDING = 6;
/**
 * The hands are on the floor between the legs, this far either side of the middle: close together
 * in front of the hips sitting tall, and under the shoulders at the bottom of the fold. Sitting
 * tall, an arm any further out runs right alongside its thigh from the camera, and the two clip.
 */
const PANCAKE_HANDS_TALL_Z = 8;
const PANCAKE_HANDS_FOLDED_Z = 32;
/** How far the wrists are from the shoulders, which leaves the elbows a little soft. */
const PANCAKE_ARM_REACH = 0.96 * (SKELETON.upperArm + SKELETON.forearm);

/**
 * Folded this far forward, from 0, sitting tall, to 1. The pelvis tips and the back rounds after
 * it, while the legs stay where they are on the floor, kneecaps and toes up.
 */
const pancakeBody = (fold: number): Pose3 => {
  const lean = PANCAKE_LEAN * fold;
  const leg: LegPose = { flex: 90 - PANCAKE_LEG_DROP + lean, abduct: PANCAKE_SPREAD };
  return {
    pelvis: [0, SIT_PELVIS_Y, 0],
    lean,
    spine: { flex: PANCAKE_TALL_ROUNDING + (PANCAKE_ROUNDING - PANCAKE_TALL_ROUNDING) * fold },
    // The head lifts a little to look along the floor rather than hang.
    neck: { flex: -15 * fold },
    rightLeg: leg,
    leftLeg: leg,
  };
};

/**
 * The right hand on the floor where the arm reaches out ahead of the shoulder with the body folded
 * this far. The elbow points back sitting tall, clear of the thigh beside it, and out to the side
 * at the bottom of the fold. The left hand mirrors it.
 */
const pancakeHand = (fold: number, side: 1 | -1): NonNullable<Pose3['pins']>['rightHand'] => {
  const shoulder = solvePose(pancakeBody(fold)).rightArm[0];
  const z = PANCAKE_HANDS_TALL_Z + (PANCAKE_HANDS_FOLDED_Z - PANCAKE_HANDS_TALL_Z) * fold;
  const x = shoulder[0] + Math.sqrt(PANCAKE_ARM_REACH ** 2 - (shoulder[1] - WRIST_Y) ** 2 - (z - shoulder[2]) ** 2);
  return { at: [x, WRIST_Y, side * z], toward: [1, 0, 0], pole: [-1 + 0.7 * fold, 0.2 * fold, side * (0.2 + 0.8 * fold)] };
};

/**
 * The pancake folded this far, both hands on the floor between the legs. Each hand is where it
 * would reach to at a fold of its own, no further than the body's, so one can stay behind while
 * the other steps forward.
 */
const pancakeAt = (fold: number, rightHand = fold, leftHand = fold): Pose3 => ({
  ...pancakeBody(fold),
  pins: { rightHand: pancakeHand(rightHand, 1), leftHand: pancakeHand(leftHand, -1) },
});
const PANCAKE_TALL = pancakeAt(0);
const PANCAKE_FOLDED = pancakeAt(1);

const PANCAKE_WALK_MS = 3000;
/** Each hand takes this many steps on the way down, the right one first. */
const PANCAKE_STRIDES = 3;
/** How many frames each step of a hand is drawn in. */
const PANCAKE_STEP_FRAMES = 4;

/**
 * Walking the hands forward into the fold: the body sinks steadily while the hands take turns
 * stepping out to where the arms reach. The body and each step ease in and out on their own, so
 * the frames are placed along them rather than eased again.
 */
const pancakeWalk = (): Keyframe3[] => {
  const eased = (t: number) => t * t * (3 - 2 * t);
  const steps = 2 * PANCAKE_STRIDES;
  /** The fold a hand reaches to once step `index` is done: the body's at that moment, and all the way for each hand's last step. */
  const target = (index: number) => (index < 0 ? 0 : index >= steps - 2 ? 1 : eased((index + 1) / steps));
  /** Where a hand is `at` this far through the walk, as the fold it reaches to. The right hand (`first` 0) takes the even steps. */
  const hand = (at: number, first: 0 | 1) => {
    const step = Math.min(steps - 1, Math.floor(at * steps));
    const mine = step % 2 === first ? step : step - 1;
    const reached = mine === step ? target(mine - 2) + (target(mine) - target(mine - 2)) * eased(at * steps - step) : target(mine);
    // Never further than the arm reaches from where the body is now.
    return Math.min(reached, eased(at));
  };
  const frames: Keyframe3[] = [];
  const count = steps * PANCAKE_STEP_FRAMES;
  for (let frame = 1; frame <= count; frame++) {
    const at = frame / count;
    frames.push({ ms: PANCAKE_WALK_MS / count, pose: pancakeAt(eased(at), hand(at, 0), hand(at, 1)), ease: 'none' });
  }
  return frames;
};

/** From the figure's right, a little in front and well above: the fold goes across the screen and both legs lie open on the floor, one toward the camera and one away. */
const PANCAKE_CAMERA = { yaw: 20, pitch: 38 };

export const PANCAKE_3D: Clip3D = {
  view: '3d',
  camera: PANCAKE_CAMERA,
  highlight: ['rightLeg', 'leftLeg'],
  // Folded, where the walk ends.
  stillFrame: 1 + 2 * PANCAKE_STRIDES * PANCAKE_STEP_FRAMES,
  keyframes: [
    { ms: 0, pose: PANCAKE_TALL },
    { ms: 500, pose: PANCAKE_TALL },
    ...pancakeWalk(),
    { ms: 3500, pose: PANCAKE_FOLDED },
    { ms: 1800, pose: PANCAKE_TALL },
  ],
};

// --- Active pancake: the pancake's fold, in and out without holding, deeper the second time ---

const ACTIVE_PANCAKE_FIRST = pancakeAt(0.75);

export const ACTIVE_PANCAKE_3D: Clip3D = {
  view: '3d',
  camera: PANCAKE_CAMERA,
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 5,
  keyframes: [
    { ms: 0, pose: PANCAKE_TALL },
    { ms: 1500, pose: ACTIVE_PANCAKE_FIRST },
    { ms: 300, pose: ACTIVE_PANCAKE_FIRST },
    { ms: 1400, pose: PANCAKE_TALL },
    { ms: 300, pose: PANCAKE_TALL },
    { ms: 1700, pose: PANCAKE_FOLDED },
    { ms: 300, pose: PANCAKE_FOLDED },
    { ms: 1600, pose: PANCAKE_TALL },
    { ms: 300, pose: PANCAKE_TALL },
  ],
};

/**
 * A move drawn in this many frames, each the pose `at` that far through it, from 0 to 1. For moves
 * where pinned hands or the pelvis travel on an arc: going straight between two keyframes cuts
 * across it, which bends a straight arm or slides a planted knee partway. The move eases in and out
 * as a whole, so the frames are placed along it rather than eased again.
 */
const alongArc = (ms: number, steps: number, at: (t: number) => Pose3): Keyframe3[] => {
  const frames: Keyframe3[] = [];
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    frames.push({ ms: ms / steps, pose: at(t * t * (3 - 2 * t)), ease: 'none' });
  }
  return frames;
};

// --- Ankle mobilization: half kneeling, the front knee drives forward over the toes with the heel down ---

/** The back knee rests on the floor here and the body pivots over it; its shin and the top of its foot lie flat behind. */
const ANKLE_MOB_BACK_KNEE: Vec3 = [-95, ANKLE_Y, -SKELETON.hip];
const ANKLE_MOB_FRONT_ANKLE: Vec3 = [0, ANKLE_Y, SKELETON.hip];

/**
 * The front shin tipped this far forward of upright over its planted foot. Both knees stay where
 * that puts them, the back one on the floor, so the hips are a thigh's length from each: they sink
 * and travel forward as the knee drives over the toes. The hands rest on the waist, elbows out and
 * back, clear of the legs.
 */
const ankleMobilizationAt = (shin: number, lean: number, backKnee: Vec3 = ANKLE_MOB_BACK_KNEE): Pose3 => {
  const tip = (shin * Math.PI) / 180;
  const front = [SKELETON.shin * Math.sin(tip), ANKLE_Y + SKELETON.shin * Math.cos(tip)];
  const back = [backKnee[0], backKnee[1]];
  const gap = Math.hypot(front[0] - back[0], front[1] - back[1]);
  const rise = Math.sqrt(SKELETON.thigh ** 2 - (gap / 2) ** 2);
  const pelvis: Vec3 = [
    (front[0] + back[0]) / 2 - (rise * (front[1] - back[1])) / gap,
    (front[1] + back[1]) / 2 + (rise * (front[0] - back[0])) / gap,
    0,
  ];
  return {
    pelvis,
    lean,
    neck: { flex: -lean },
    pins: {
      rightFoot: { at: ANKLE_MOB_FRONT_ANKLE, toward: [1, 0, 0] },
      leftFoot: { at: [backKnee[0] - SKELETON.shin, ANKLE_Y, backKnee[2]], toward: [-1, 0, 0], pole: [1, -1, 0] },
      rightHand: { at: [pelvis[0] + 4, pelvis[1] + 49, 30], toward: [1, -0.5, 0], pole: [-1, 0, 1] },
      leftHand: { at: [pelvis[0] + 4, pelvis[1] + 49, -30], toward: [1, -0.5, 0], pole: [-1, 0, -1] },
    },
  };
};
/** Kneeling tall, the front shin is close to upright; driven forward, the knee is well past the toes, about as far as an ankle bends with the heel still down. */
const ANKLE_MOB_SHIN = [5, 40];
/** This far into the knee's drive forward, from 0 to 1. The body leans in a little with it. */
const ankleMobilization = (t: number): Pose3 => ankleMobilizationAt(ANKLE_MOB_SHIN[0] + (ANKLE_MOB_SHIN[1] - ANKLE_MOB_SHIN[0]) * t, 3 + 5 * t);
const ANKLE_MOB_BACK = ankleMobilization(0);
const ANKLE_MOB_FORWARD = ankleMobilization(1);
const ANKLE_MOB_STEPS = 6;

export const ANKLE_MOBILIZATION_3D: Clip3D = {
  view: '3d',
  // From the front leg's side, a little in front and above, where the shin's tip forward is flat on
  // the screen and the back leg shows behind.
  camera: { yaw: 15, pitch: 12 },
  highlight: ['rightLeg'],
  stillFrame: ANKLE_MOB_STEPS,
  // Rocking in and out without settling at either end.
  keyframes: [
    { ms: 0, pose: ANKLE_MOB_BACK },
    ...alongArc(1200, ANKLE_MOB_STEPS, ankleMobilization),
    { ms: 300, pose: ANKLE_MOB_FORWARD },
    ...alongArc(1200, ANKLE_MOB_STEPS, (t) => ankleMobilization(1 - t)),
    { ms: 300, pose: ANKLE_MOB_BACK },
  ],
};

// --- Behind the back chest opener: standing with the hands linked behind, the straight arms lift away from the back ---

/** The wrists sit this far either side of the middle of the back, so the hands overlap. */
const CHEST_OPENER_HANDS_Z = 4;

/**
 * Standing tall with the hands linked behind the back, the arms straight and lifted this far back
 * from hanging. The back arches this far, which lifts the chest as the arms come up.
 */
const chestOpenerAt = (degrees: number, arch: number): Pose3 => {
  const body: Pose3 = { ...STANDING, spine: { flex: -arch }, neck: { flex: arch / 2 } };
  const shoulder = solvePose(body).rightArm[0];
  // A hair short of full reach, so the arms stay straight without the elbows locking.
  const length = 0.999 * (SKELETON.upperArm + SKELETON.forearm);
  // What's left of the arm's length once it has come in from the shoulder to the middle of the back.
  const inPlane = Math.sqrt(length ** 2 - (shoulder[2] - CHEST_OPENER_HANDS_Z) ** 2);
  const back = (degrees * Math.PI) / 180;
  const wrist = (side: 1 | -1): Vec3 => [shoulder[0] - inPlane * Math.sin(back), shoulder[1] - inPlane * Math.cos(back), side * CHEST_OPENER_HANDS_Z];
  return {
    ...body,
    pins: {
      rightHand: { at: wrist(1), pole: [-0.6, 0, 1] },
      leftHand: { at: wrist(-1), pole: [-0.6, 0, -1] },
    },
  };
};
/** This far into the lift, from 0, the linked hands resting against the back, to 1. */
const chestOpener = (t: number): Pose3 => chestOpenerAt(10 + 40 * t, 8 * t);
const CHEST_OPENER_LINKED = chestOpener(0);
const CHEST_OPENER_LIFTED = chestOpener(1);
const CHEST_OPENER_STEPS = 8;

export const BEHIND_THE_BACK_CHEST_OPENER_3D: Clip3D = {
  view: '3d',
  // From the right and a little behind, where the lift away from the back goes across the screen
  // and both arms show coming in to the linked hands.
  camera: { yaw: -25, pitch: 10 },
  highlight: ['rightArm', 'leftArm'],
  trail: 'rightHand',
  stillFrame: 1 + CHEST_OPENER_STEPS,
  keyframes: [
    { ms: 0, pose: CHEST_OPENER_LINKED },
    { ms: 500, pose: CHEST_OPENER_LINKED },
    ...alongArc(1800, CHEST_OPENER_STEPS, chestOpener),
    { ms: 3500, pose: CHEST_OPENER_LIFTED },
    ...alongArc(1600, CHEST_OPENER_STEPS, (t) => chestOpener(1 - t)),
  ],
};

// --- Back lying reverse pigeon: lying on the back, knee held over the hip at 90°, a strap pulls the foot out to the side ---

const REVERSE_PIGEON_STRAP = { foot: 'rightFoot', hand: 'rightHand' } as const;
/** The strap doesn't stretch, so the hand is always this far from the ball of the foot. */
const REVERSE_PIGEON_STRAP_LENGTH = 170;
/** The most the thigh turns inward: about the average result for adults (Hallaçeli 2014). */
const REVERSE_PIGEON_TURN = HIP_ROTATION;

/**
 * The right thigh straight up over the hip and the knee at 90°, so the shin is level, with the
 * thigh turned this far inward, which swings the foot out to the side. The right hand holds both
 * ends of the strap and pulls from the foot toward `pull`, out beside the ribs.
 */
const reversePigeonAt = (degrees: number, pull: Vec3): Pose3 => {
  const pose: Pose3 = {
    ...LYING_ON_BACK,
    rightLeg: { flex: 90, knee: 90, rotate: -degrees },
    leftLeg: LEG_FLAT,
    leftArm: { abduct: 25 },
  };
  // The middle of the foot where the strap loops around it, which is the same wherever the hand is.
  const loop = strapPoints(solvePose(pose), REVERSE_PIGEON_STRAP);
  const [right, left] = [loop[1], loop[loop.length - 2]];
  const ball: Vec3 = [(right[0] + left[0]) / 2, (right[1] + left[1]) / 2, (right[2] + left[2]) / 2];
  const gap = Math.hypot(pull[0] - ball[0], pull[1] - ball[1], pull[2] - ball[2]);
  const toHand: Vec3 = [(pull[0] - ball[0]) / gap, (pull[1] - ball[1]) / gap, (pull[2] - ball[2]) / gap];
  // The strap runs to the middle of the hand, half a hand past the wrist.
  const reach = REVERSE_PIGEON_STRAP_LENGTH + SKELETON.hand / 2;
  return {
    ...pose,
    pins: {
      rightHand: {
        at: [ball[0] + toHand[0] * reach, ball[1] + toHand[1] * reach, ball[2] + toHand[2] * reach],
        toward: [-toHand[0], -toHand[1], -toHand[2]],
        pole: [0, -0.3, 1],
      },
    },
  };
};
/** This far into the turn, from 0, the shin pointing straight down the body, to 1. The hand draws out and up toward the shoulder as the foot comes around. */
const reversePigeon = (t: number): Pose3 => reversePigeonAt(REVERSE_PIGEON_TURN * t, [-60 - 10 * t, 40 - 5 * t, 120 + 30 * t]);
const REVERSE_PIGEON_IN = reversePigeon(0);
const REVERSE_PIGEON_OUT = reversePigeon(1);
const REVERSE_PIGEON_STEPS = 8;

export const BACK_LYING_REVERSE_PIGEON_3D: Clip3D = {
  view: '3d',
  // From almost straight above, looking down the raised thigh, where the shin swings out over the
  // floor like the hand of a clock.
  camera: { yaw: 0, pitch: 75 },
  highlight: ['rightLeg'],
  trail: 'rightFoot',
  strap: REVERSE_PIGEON_STRAP,
  stillFrame: 1 + REVERSE_PIGEON_STEPS,
  keyframes: [
    { ms: 0, pose: REVERSE_PIGEON_IN },
    { ms: 500, pose: REVERSE_PIGEON_IN },
    ...alongArc(2000, REVERSE_PIGEON_STEPS, reversePigeon),
    { ms: 3500, pose: REVERSE_PIGEON_OUT },
    ...alongArc(2000, REVERSE_PIGEON_STEPS, (t) => reversePigeon(1 - t)),
  ],
};

// --- Belly down foot splay: lying face down with the knees at 90°, the feet fall out to the sides ---

const PRONE_PELVIS_Y = 22;
/** How far the thighs slope down from the hips to knees resting on the floor. */
const PRONE_THIGH_DROP = (Math.asin((PRONE_PELVIS_Y - ANKLE_Y) / SKELETON.thigh) * 180) / Math.PI;

/**
 * Face down with the head toward +x, the hands on the floor either side of the head and the elbows
 * out. The knees are bent to 90°, a little apart as if around a pillow, and both thighs are turned
 * this far inward, which lets the feet fall out to the sides.
 */
const footSplayAt = (degrees: number): Pose3 => {
  const leg: LegPose = { flex: PRONE_THIGH_DROP, abduct: 3, knee: 90, rotate: -degrees };
  return {
    pelvis: [0, PRONE_PELVIS_Y, 0],
    lean: 90,
    neck: { flex: -10 },
    rightLeg: leg,
    leftLeg: leg,
    pins: {
      rightHand: { at: [172, WRIST_Y, 78], toward: [1, 0, -0.3], pole: [-0.3, 0, 1] },
      leftHand: { at: [172, WRIST_Y, -78], toward: [1, 0, 0.3], pole: [-0.3, 0, -1] },
    },
  };
};
const FOOT_SPLAY_UP = footSplayAt(0);
/** About the average result for adults (Hallaçeli 2014). */
const FOOT_SPLAY_OUT = footSplayAt(HIP_ROTATION);

export const BELLY_DOWN_FOOT_SPLAY_3D: Clip3D = {
  view: '3d',
  // From in front of the head and well above, a little to the right: thighs, shins and feet run
  // on up the screen one after the other, none hiding the next, and the shins fall apart across
  // it. From behind the feet, each foot lies over its own shin, the thighs come at the camera as
  // stumps, and the neck shows through the head. No trail: both feet move.
  camera: { yaw: 75, pitch: 50 },
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: FOOT_SPLAY_UP },
    { ms: 500, pose: FOOT_SPLAY_UP },
    { ms: 2000, pose: FOOT_SPLAY_OUT },
    { ms: 3500, pose: FOOT_SPLAY_OUT },
    { ms: 1800, pose: FOOT_SPLAY_UP },
  ],
};

// --- Squats: what the squat clips share ---

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smooth = (t: number) => t * t * (3 - 2 * t);
/** The point this far from `from` on the way to `to`. */
const toward = (from: Vec3, to: Vec3, length: number): Vec3 => {
  const gap = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  return mix3(from, to, length / gap);
};
/** A pin that brings a wrist or ankle to `at` with the elbow or knee out toward `via`. With bones that reach exactly, the joint lands on it. */
const pinVia = (root: Vec3, via: Vec3, at: Vec3, pointing?: Vec3): Pin & { pole: Vec3 } => ({
  at,
  toward: pointing,
  pole: [via[0] - (root[0] + at[0]) / 2, via[1] - (root[1] + at[1]) / 2, via[2] - (root[2] + at[2]) / 2],
});
/** A hair short of an arm's or a leg's full length, so it's straight without locking. */
const ARM_REACH = 0.999 * (SKELETON.upperArm + SKELETON.forearm);
const LEG_REACH = 0.999 * (SKELETON.thigh + SKELETON.shin);

/** The ankles sit this far either side of the middle with the feet shoulder-width apart. */
const SQUAT_ANKLE_Z = 32;

/**
 * How both legs are bent over feet that stay flat where they are: how far each knee is forward of
 * its ankle and out to the side of it, and how far the thigh has swung back from standing straight
 * up on the knee (90 is level, with the hips behind the knees; past that the hips are below them).
 */
type SquatLegs = { forward: number; out: number; thigh: number };

/** Straight legs, with the hips this far behind the heels. */
const squatStraight = (back: number, ankleZ = SQUAT_ANKLE_Z): SquatLegs => {
  const out = (SKELETON.hip - ankleZ) / 2;
  const level = Math.sqrt(1 - (out / SKELETON.thigh) ** 2);
  return { forward: -back / 2, out, thigh: (Math.asin(back / 2 / (SKELETON.thigh * level)) * 180) / Math.PI };
};
/**
 * The bottom of a deep squat: the shins tipped about 38° forward, which is about as far as an ankle
 * bends with the heel down, the knees out past the toes, and the hips below the knees.
 */
const SQUAT_DEEP: SquatLegs = { forward: 50, out: 36, thigh: 118 };
const mixLegs = (a: SquatLegs, b: SquatLegs, t: number): SquatLegs => ({
  forward: mix(a.forward, b.forward, t),
  out: mix(a.out, b.out, t),
  thigh: mix(a.thigh, b.thigh, t),
});

/**
 * Where legs bent like that put the pelvis, and the pins that keep the feet flat, `ankleZ` either
 * side of the middle, with the toes turned out this far. The knees are worked out first and the
 * hips from them, so the bones keep their length and the knees land where they're put. `knee` is
 * the right one.
 */
const squatStance = (toesOut: number, { forward, out, thigh }: SquatLegs, ankleZ = SQUAT_ANKLE_Z): { pelvis: Vec3; knee: Vec3; pins: NonNullable<Pose3['pins']> } => {
  const knee: Vec3 = [forward, ANKLE_Y + Math.sqrt(SKELETON.shin ** 2 - forward ** 2 - out ** 2), ankleZ + out];
  // The thigh comes in from the knee to the hip joint, and what's left of its length swings back.
  const level = SKELETON.thigh * Math.sqrt(1 - ((SKELETON.hip - knee[2]) / SKELETON.thigh) ** 2);
  const hip: Vec3 = [knee[0] - level * Math.sin(radians(thigh)), knee[1] + level * Math.cos(radians(thigh)), SKELETON.hip];
  const foot = (side: 1 | -1): Pin => {
    const pin = pinVia(
      [hip[0], hip[1], side * hip[2]],
      [knee[0], knee[1], side * knee[2]],
      [0, ANKLE_Y, side * ankleZ],
      [Math.cos(radians(toesOut)), 0, side * Math.sin(radians(toesOut))]
    );
    // A straight leg has no bend to aim, so the knee is nudged the way it goes when it gives: forward and out.
    return { ...pin, pole: [pin.pole[0] + 1, pin.pole[1], pin.pole[2] + side * 0.3] };
  };
  return { pelvis: [hip[0], hip[1], 0], knee, pins: { rightFoot: foot(1), leftFoot: foot(-1) } };
};

// --- Bottom squat: from standing, sinking into a deep squat with the heels down, the elbows pushing the knees out ---

const BOTTOM_SQUAT_TOES_OUT = 20;

/**
 * This far down into the squat, from 0, standing, to 1. The chest stays up as the hips sink back
 * and down. The palms are pressed together in front of the chest from the start, the elbows tucked
 * in by the ribs, so the arms never pass the legs on the way down: the elbows open as the knees
 * come up to them, and end against the insides of the knees.
 */
const bottomSquatAt = (t: number): Pose3 => {
  const { pelvis, knee, pins } = squatStance(BOTTOM_SQUAT_TOES_OUT, mixLegs(squatStraight(0), SQUAT_DEEP, t));
  const body: Pose3 = { pelvis, lean: 30 * t, spine: { flex: 6 * t }, neck: { flex: -22 * t }, pins };
  const skeleton = solvePose(body);
  const chest = skeleton.spine[skeleton.spine.length - 1];
  const hand = (side: 1 | -1): Pin => {
    const shoulder = side === 1 ? skeleton.rightArm[0] : skeleton.leftArm[0];
    const tucked: Vec3 = [shoulder[0] + 6, shoulder[1] - 68, shoulder[2] + side * 20];
    const atKnee: Vec3 = [knee[0] - 8, knee[1] + 8, side * (knee[2] - 24)];
    const elbow = toward(shoulder, mix3(tucked, atKnee, t), SKELETON.upperArm);
    // Low enough on the chest that the fingertips stay clear of the chin.
    const pressed = toward(elbow, [chest[0] + 38, chest[1] - 42, side * 11], SKELETON.forearm);
    return pinVia(shoulder, elbow, pressed, [0.8, 0.6, 0]);
  };
  return { ...body, pins: { ...pins, rightHand: hand(1), leftHand: hand(-1) } };
};
const BOTTOM_SQUAT_STANDING = bottomSquatAt(0);
const BOTTOM_SQUAT_DOWN = bottomSquatAt(1);
const BOTTOM_SQUAT_STEPS = 8;

export const BOTTOM_SQUAT_3D: Clip3D = {
  view: '3d',
  // From straight in front and a little above, where the knees open out across the screen. From
  // either side, the far arm has to come across the front of the chest to reach the near hand, and
  // arms are drawn whole: its shoulder came out over the chest with it.
  camera: { yaw: 90, pitch: 15 },
  highlight: ['rightLeg', 'leftLeg'],
  // The thighs are over the hips all the way through, standing as well as coming forward toward
  // the camera in the squat, rather than changing sides partway down.
  over: ['rightLeg', 'leftLeg'],
  // The arms are over the legs, so the elbows pressing on the knees are in front of them. The hands
  // meet in the middle, as near as each other, so one is picked to stay on top.
  behind: [
    ['rightLeg', 'rightArm'],
    ['leftLeg', 'leftArm'],
    ['rightLeg', 'leftArm'],
    ['leftLeg', 'rightArm'],
    ['leftArm', 'rightArm'],
  ],
  stillFrame: 1 + BOTTOM_SQUAT_STEPS,
  keyframes: [
    { ms: 0, pose: BOTTOM_SQUAT_STANDING },
    { ms: 500, pose: BOTTOM_SQUAT_STANDING },
    ...alongArc(2000, BOTTOM_SQUAT_STEPS, bottomSquatAt),
    { ms: 3500, pose: BOTTOM_SQUAT_DOWN },
    ...alongArc(1800, BOTTOM_SQUAT_STEPS, (t) => bottomSquatAt(1 - t)),
  ],
};

// --- Squat to stand: folded forward holding the toes, dropping into a deep squat and straightening back up without letting go ---

const STS_TOES_OUT = 12;
/** Folded, the hips sit this far behind the heels. */
const STS_HIPS_BACK = 30;
/** Where the right wrist is with the fingers hooked over the toes. */
const STS_HOLD: Vec3 = [38, 36, 38];

/** How far the body tips forward folded over straight legs, and at the bottom of the squat with the chest up. */
const STS_LEAN = { folded: 98, squatting: 26 };

/**
 * The body `fold` of the way from standing into the forward fold, and from there `squat` of the way
 * down into the squat, tipped forward by `lean`.
 */
const squatToStandLeaning = (fold: number, squat: number, lean: number): Pose3 => {
  const { pelvis, pins } = squatStance(STS_TOES_OUT, mixLegs(squatStraight(STS_HIPS_BACK * fold), SQUAT_DEEP, squat));
  return { pelvis, lean, spine: { flex: mix(58 * fold, 4, squat) }, neck: { flex: mix(15 * fold, -12, squat) }, pins };
};
/** How far the right shoulder is from where its hand holds the toes. */
const stsReach = (pose: Pose3) => {
  const shoulder = solvePose(pose).rightArm[0];
  return Math.hypot(STS_HOLD[0] - shoulder[0], STS_HOLD[1] - shoulder[1], STS_HOLD[2] - shoulder[2]);
};
const STS_REACH = { folded: stsReach(squatToStandLeaning(1, 0, STS_LEAN.folded)), squatting: stsReach(squatToStandLeaning(1, 1, STS_LEAN.squatting)) };

/**
 * On the way between the fold and the squat the hips swing back behind the heels before they drop
 * under, and the hands don't leave the toes. So the lean there is whatever keeps the shoulders an
 * arm's reach from the toes: the chest stays low over the thighs and only lifts as the hips sink.
 */
const squatToStandBody = (fold: number, squat: number): Pose3 => {
  if (squat === 0) return squatToStandLeaning(fold, 0, STS_LEAN.folded * fold);
  const reach = mix(STS_REACH.folded, STS_REACH.squatting, squat);
  // The further the body tips forward, the nearer the shoulders come to the toes.
  let [upright, tipped] = [0, 140];
  for (let i = 0; i < 40; i++) {
    const lean = (upright + tipped) / 2;
    if (stsReach(squatToStandLeaning(1, squat, lean)) > reach) upright = lean;
    else tipped = lean;
  }
  return squatToStandLeaning(1, squat, (upright + tipped) / 2);
};
/** Each hand's place from its shoulder with the arms hanging, and with the toes held in the fold. */

/**
 * Standing, the arms hang straight at the sides. As the body folds they keep hanging straight down
 * from the shoulders, swinging forward with them, and only in the last part of the fold do the
 * hands close in on the toes and take hold, the elbows giving out to the sides. They stay on the
 * toes through the squat, coming in between the knees and straightening as the chest lifts.
 */
const squatToStandAt = (fold: number, squat = 0): Pose3 => {
  const body = squatToStandBody(fold, squat);
  const skeleton = solvePose(body);
  const reaching = smooth(Math.max(0, (fold - 0.45) / 0.55));
  const hand = (side: 1 | -1): Pin => {
    const shoulder = side === 1 ? skeleton.rightArm[0] : skeleton.leftArm[0];
    const hanging: Vec3 = [shoulder[0] + 3, shoulder[1] - 0.997 * ARM_REACH, shoulder[2] + side * 14];
    const hold: Vec3 = [STS_HOLD[0], STS_HOLD[1], side * STS_HOLD[2]];
    // Partway down the toes are still out of reach, so the hand goes as far toward them as the arm allows.
    const aim = mix3(hanging, hold, reaching);
    const gap = Math.hypot(aim[0] - shoulder[0], aim[1] - shoulder[1], aim[2] - shoulder[2]);
    const limit = 0.997 * ARM_REACH;
    return {
      at: fold === 1 ? hold : gap > limit ? mix3(shoulder, aim, limit / gap) : aim,
      toward: mix3([0, -1, 0], [0.15, -1, side * 0.1], reaching),
      pole: mix3(mix3([-1, 0, side * 0.3], [-0.6, 0.4, side], reaching), [-1, 0.2, side * 0.3], squat),
    };
  };
  return {
    ...body,
    pins: { ...body.pins, rightHand: hand(1), leftHand: hand(-1) },
    // Hanging at the sides, each arm is outside its thigh: in front of the near leg from here, behind
    // the far one. From the toes down into the squat it's inside its knee, the other way round. The
    // change comes halfway into the fold, while the hands are swinging forward and clear of the legs.
    behind: fold >= STS_ARMS_INSIDE ? STS_INSIDE_KNEES : STS_OUTSIDE_THIGHS,
  };
};
const STS_ARMS_INSIDE = 0.5;
const STS_OUTSIDE_THIGHS = [
  ['rightLeg', 'rightArm'],
  ['leftArm', 'leftLeg'],
] as const;
const STS_INSIDE_KNEES = [
  ['rightArm', 'rightLeg'],
  ['leftLeg', 'leftArm'],
] as const;
const STS_STANDING = squatToStandAt(0);
const STS_FOLDED = squatToStandAt(1);
const STS_SQUATTING = squatToStandAt(1, 1);
const STS_STEPS = 8;
/** The fold from standing swings the shoulders through a wide arc, so it takes finer steps to keep the hanging hands in reach between them. */
const STS_FOLD_STEPS = 16;
const stsDown = () => alongArc(1400, STS_STEPS, (t) => squatToStandAt(1, t));
const stsUp = () => alongArc(1400, STS_STEPS, (t) => squatToStandAt(1, 1 - t));

export const SQUAT_TO_STAND_3D: Clip3D = {
  view: '3d',
  // From the right side and a little in front, where the fold and the hips dropping behind the
  // heels are flat on the screen and both hands show on the toes.
  camera: { yaw: 25, pitch: 10 },
  highlight: ['rightLeg', 'leftLeg'],
  // The fingers stay hooked over the toes, though the near arm is behind its knee.
  holds: [
    { hand: 'rightHand', limb: 'rightLeg' },
    { hand: 'leftHand', limb: 'leftLeg' },
  ],
  stillFrame: STS_FOLD_STEPS + STS_STEPS,
  keyframes: [
    { ms: 0, pose: STS_STANDING },
    ...alongArc(1500, STS_FOLD_STEPS, (t) => squatToStandAt(t)),
    ...stsDown(),
    { ms: 500, pose: STS_SQUATTING },
    ...stsUp(),
    { ms: 400, pose: STS_FOLDED },
    ...stsDown(),
    { ms: 500, pose: STS_SQUATTING },
    ...stsUp(),
    ...alongArc(1500, STS_FOLD_STEPS, (t) => squatToStandAt(1 - t)),
    { ms: 500, pose: STS_STANDING },
  ],
};

// --- Bottom squat rotation: in the bottom of the squat, one hand stays on the floor while the other arm sweeps up to the ceiling and the chest turns with it ---

const ROTATION_STANCE = squatStance(BOTTOM_SQUAT_TOES_OUT, SQUAT_DEEP);
/** Where the right wrist is with the hand flat on the floor, between the feet. */
const ROTATION_FLOOR: Vec3 = [58, WRIST_Y, 16];
/** How far the chest turns toward the arm that goes up, and how much of that the neck turns back. */
const ROTATION_TWIST = 55;
const ROTATION_HEAD_BACK = 27;

/**
 * The arm on this side (1 the figure's right, -1 its left) this far up, from 0, its hand on the
 * floor, to 1, straight up at the ceiling. It goes out to the side and over on an arc, staying
 * close to straight, and the chest and head turn to follow it. The other hand stays planted.
 */
const squatRotationAt = (side: 1 | -1, up: number): Pose3 => {
  const body = (turned: number): Pose3 => ({
    pelvis: ROTATION_STANCE.pelvis,
    // The chest lifts a little as it opens, which keeps the arm on the floor long.
    lean: mix(36, 26, turned),
    spine: { flex: 10, twist: -side * ROTATION_TWIST * turned },
    // The head turns with the chest but not as far, so the face stays toward the camera.
    neck: { flex: -28, twist: side * ROTATION_HEAD_BACK * turned },
    pins: ROTATION_STANCE.pins,
  });
  const shoulderOf = (pose: Pose3) => (side === 1 ? solvePose(pose).rightArm[0] : solvePose(pose).leftArm[0]);
  const floor = (which: 1 | -1): Pin => ({
    at: [ROTATION_FLOOR[0], ROTATION_FLOOR[1], which * ROTATION_FLOOR[2]],
    toward: [1, 0, 0],
    pole: [-0.5, 0, which],
  });
  const start = shoulderOf(body(0));
  const down: Vec3 = [ROTATION_FLOOR[0] - start[0], ROTATION_FLOOR[1] - start[1], side * ROTATION_FLOOR[2] - start[2]];
  const reach = Math.hypot(down[0], down[1], down[2]);
  // From pointing down at the floor to straight up, by way of out to the side, and forward on the
  // way so the hand passes in front of the knee, not through it.
  const swing = Math.sin(Math.PI * up);
  const aim: Vec3 = [mix(down[0] / reach, -0.1, up) + 0.45 * swing, mix(down[1] / reach, 1, up), mix(down[2] / reach, side * 0.1, up) + side * 1.1 * swing];
  const shoulder = shoulderOf(body(up));
  const raised: Pin = {
    at: toward(shoulder, [shoulder[0] + aim[0], shoulder[1] + aim[1], shoulder[2] + aim[2]], mix(reach, ARM_REACH, smooth(Math.min(1, 2 * up)))),
    toward: mix3([1, 0, 0], aim, smooth(Math.min(1, 3 * up))),
    pole: [-0.5, 0, side],
  };
  return { ...body(up), pins: { ...ROTATION_STANCE.pins, rightHand: side === 1 ? raised : floor(1), leftHand: side === 1 ? floor(-1) : raised } };
};
const ROTATION_DOWN = squatRotationAt(1, 0);
const ROTATION_STEPS = 10;
const rotationSweep = (side: 1 | -1): Keyframe3[] => [
  ...alongArc(1800, ROTATION_STEPS, (t) => squatRotationAt(side, t)),
  { ms: 500, pose: squatRotationAt(side, 1) },
  ...alongArc(1800, ROTATION_STEPS, (t) => squatRotationAt(side, 1 - t)),
];

export const BOTTOM_SQUAT_ROTATION_3D: Clip3D = {
  view: '3d',
  // From straight in front and a little above, where each arm's sweep from the floor to the ceiling
  // goes out across the screen, the same on both sides, and the face stays toward the camera.
  camera: { yaw: 90, pitch: 15 },
  highlight: ['torso'],
  // Both arms are in front of the legs all the way: the one on the floor between the knees, and the
  // other passing in front of its knee on the way up. Once up, its shoulder has turned back behind
  // the chest, but it stays drawn over it, as at the start, rather than changing sides in mid-sweep.
  over: ['rightArm', 'leftArm'],
  behind: [
    ['rightLeg', 'rightArm'],
    ['rightLeg', 'leftArm'],
    ['leftLeg', 'rightArm'],
    ['leftLeg', 'leftArm'],
  ],
  trail: 'rightHand',
  stillFrame: ROTATION_STEPS,
  keyframes: [{ ms: 0, pose: ROTATION_DOWN }, ...rotationSweep(1), { ms: 300, pose: ROTATION_DOWN }, ...rotationSweep(-1), { ms: 300, pose: ROTATION_DOWN }],
};

// --- Cossack squat: feet wide, sinking over one bent leg with its heel down while the other goes straight, toes up ---

/** At the bottom the hips are this far behind the heels and this high, just clear of the floor. */
const COSSACK_BOTTOM = { x: -38, y: 55 };
/** Passing through the middle the hips stay low, between two bent knees. */
const COSSACK_MIDDLE = { x: -20, y: 92 };
/** At the bottom the middle of the pelvis sits this far inside the bent leg's heel. */
const COSSACK_INSIDE = 22;
/** How far out to the side the straight leg reaches at the bottom, from its hip to its heel. */
const COSSACK_SPAN = Math.sqrt(LEG_REACH ** 2 - COSSACK_BOTTOM.x ** 2 - (COSSACK_BOTTOM.y - ANKLE_Y) ** 2);
/** The stance that makes room for that: how far each ankle is from the middle, and how far the pelvis shifts over to sit at the bottom. */
const COSSACK_ANKLE_Z = (COSSACK_SPAN + SKELETON.hip + COSSACK_INSIDE) / 2;
const COSSACK_SHIFT = COSSACK_ANKLE_Z - COSSACK_INSIDE;
const COSSACK_TOES_OUT = 35;
/**
 * The hands clasped in front of the chest, a counterweight to the hips: tucked in close with the
 * elbows down by the ribs at 0, and pushed out in front with the elbows opening to the sides at 1,
 * which is where they go as the hips sink. Out there the elbows are level with the chest, well
 * above the knee the body sinks over.
 */
const cossackHands = (body: Pose3, reach: number): NonNullable<Pose3['pins']> => {
  const skeleton = solvePose(body);
  const chest = skeleton.spine[skeleton.spine.length - 1];
  const hand = (side: 1 | -1): Pin => ({
    at: [chest[0] + mix(60, 118, reach), chest[1] + mix(-26, 4, reach), chest[2] + side * 6],
    toward: [1, mix(0.7, 0.2, reach), -side * 0.25],
    pole: mix3([0, -0.7, side], [0, 0.1, side], reach),
  });
  return { rightHand: hand(1), leftHand: hand(-1) };
};

/**
 * One leg's pin. `bend` is its part in the squat: 1 the leg the hips sink over, its foot flat and
 * its knee forward over the toes; 0 in the middle of the stance; -1 the straight leg, rolled onto
 * its heel with the toes and kneecap pointing up.
 */
const cossackLeg = (hip: Vec3, side: 1 | -1, bend: number): Pin => {
  const ankle: Vec3 = [0, ANKLE_Y, side * COSSACK_ANKLE_Z];
  const flat: Vec3 = [Math.cos(radians(COSSACK_TOES_OUT)), 0, side * Math.sin(radians(COSSACK_TOES_OUT))];
  const middle: Vec3 = [0.8, 0.5, side * 0.4];
  if (bend < 0) return { at: ankle, toward: mix3(flat, [0.15, 1, 0], -bend), pole: mix3(middle, [0.2, 1, 0], -bend) };
  const knee = toward(ankle, [ankle[0] + 50, ankle[1] + 84, ankle[2] + side * 18], SKELETON.shin);
  const over = pinVia(hip, knee, ankle).pole;
  return { at: ankle, toward: flat, pole: mix3(middle, toward([0, 0, 0], over, 1), bend) };
};

const cossackPose = (pelvis: Vec3, right: number, left: number, lean: number, reach: number): Pose3 => {
  const body: Pose3 = {
    pelvis,
    lean,
    spine: { flex: 6 },
    neck: { flex: -0.6 * lean },
    pins: {
      rightFoot: cossackLeg([pelvis[0], pelvis[1], pelvis[2] + SKELETON.hip], 1, right),
      leftFoot: cossackLeg([pelvis[0], pelvis[1], pelvis[2] - SKELETON.hip], -1, left),
    },
  };
  return { ...body, pins: { ...body.pins, ...cossackHands(body, reach) } };
};

const COSSACK_REACH_MIDDLE = 0.4;

/** Shifted this far across, from -1, at the bottom over the left leg, to 1, over the right. The hips rise a little through the middle. */
const cossackAcross = (side: number): Pose3 => {
  const out = side * side;
  return cossackPose(
    [mix(COSSACK_MIDDLE.x, COSSACK_BOTTOM.x, out), mix(COSSACK_MIDDLE.y, COSSACK_BOTTOM.y, out), COSSACK_SHIFT * side],
    side,
    -side,
    mix(20, 32, Math.abs(side)),
    // The hands come in as the hips rise through the middle, though not all the way: the knees are still up under the elbows there.
    mix(COSSACK_REACH_MIDDLE, 1, out)
  );
};

/**
 * This far down from standing with the feet wide, from 0 to 1, at the bottom over the right leg.
 * The left leg is straight at both ends, so it stays straight the whole way and the hips come down
 * around its heel.
 */
const cossackSink = (t: number): Pose3 => {
  const x = COSSACK_BOTTOM.x * t;
  const z = COSSACK_SHIFT * t;
  const y = ANKLE_Y + Math.sqrt(LEG_REACH ** 2 - (COSSACK_ANKLE_Z - SKELETON.hip + z) ** 2 - x ** 2);
  return cossackPose([x, y, z], t, -t, 32 * t, t);
};

const COSSACK_RIGHT = cossackAcross(1);
const COSSACK_LEFT = cossackAcross(-1);
const COSSACK_STEPS = 10;

export const COSSACK_SQUAT_3D: Clip3D = {
  view: '3d',
  // From in front, above and well round to the right: the shift from one leg to the other still goes
  // across the screen, and each bent knee shows from the side instead of coming straight at the camera.
  camera: { yaw: 56, pitch: 18 },
  highlight: ['rightLeg', 'leftLeg'],
  // Over the far leg, where the bent leg shows whole.
  stillFrame: COSSACK_STEPS,
  keyframes: [
    { ms: 0, pose: COSSACK_RIGHT },
    ...alongArc(2200, COSSACK_STEPS, (t) => cossackAcross(1 - 2 * t)),
    { ms: 400, pose: COSSACK_LEFT },
    ...alongArc(2200, COSSACK_STEPS, (t) => cossackAcross(2 * t - 1)),
    { ms: 400, pose: COSSACK_RIGHT },
  ],
};

// --- Resting Cossack squat: the same bottom position, sunk into from standing and held ---

const COSSACK_STANDING = cossackSink(0);
const RESTING_COSSACK_STEPS = 12;

export const RESTING_COSSACK_SQUAT_3D: Clip3D = {
  view: '3d',
  // The same view from the other side, the straight leg nearest, so the bent leg and its flat heel
  // show whole behind it through the hold.
  camera: { yaw: 124, pitch: 18 },
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 1 + RESTING_COSSACK_STEPS,
  keyframes: [
    { ms: 0, pose: COSSACK_STANDING },
    { ms: 500, pose: COSSACK_STANDING },
    ...alongArc(2000, RESTING_COSSACK_STEPS, cossackSink),
    { ms: 3500, pose: COSSACK_RIGHT },
    ...alongArc(1800, RESTING_COSSACK_STEPS, (t) => cossackSink(1 - t)),
  ],
};

// --- Blackburn: lying face down, both straight arms lifted off the floor sweep from the sides to overhead ---

/** How far the straight arms are lifted off the floor, and how far round they sweep overhead. */
const BLACKBURN_LIFT = 14;
const BLACKBURN_OVERHEAD = 168;
/**
 * Where the right wrist rests at the start and end: on the lower back, a little out from the spine,
 * with the fingers toward the middle and the elbow bent up and out.
 */
const BLACKBURN_LOWER_BACK: Vec3 = [15, 46, 20];
/** The arms are straight by the time they've swept this far, straight out to the sides at 90. */
const BLACKBURN_STRAIGHT_BY = 75;

/**
 * Face down with the head toward +x and the forehead just off the floor, the legs long with the tops
 * of the feet on the floor. From the hands resting on the lower back (0), the arms lift off the back
 * and sweep out to the sides, the elbows straightening on the way, then on round to overhead (1),
 * held up off the floor the whole time.
 */
const blackburn = (t: number): Pose3 => {
  const body: Pose3 = {
    pelvis: [0, PRONE_PELVIS_Y, 0],
    lean: 90,
    neck: { flex: -12 },
    rightLeg: { flex: 2.6, abduct: 2, ankle: -88 },
    leftLeg: { flex: 2.6, abduct: 2, ankle: -88 },
  };
  const shoulder = solvePose(body).rightArm[0];
  // The right hand's way from the shoulder to the lower back, as a sweep round from pointing down
  // the side (negative is in behind the back), a lift off the floor and a reach.
  const [dx, dy, dz] = [BLACKBURN_LOWER_BACK[0] - shoulder[0], BLACKBURN_LOWER_BACK[1] - shoulder[1], BLACKBURN_LOWER_BACK[2] - shoulder[2]];
  const backReach = Math.hypot(dx, dy, dz);
  const backSweep = (Math.atan2(dz, -dx) * 180) / Math.PI;
  const backLift = (Math.asin(dy / backReach) * 180) / Math.PI;

  const degrees = mix(backSweep, BLACKBURN_OVERHEAD, t);
  const straight = smooth(Math.min(1, (degrees - backSweep) / (BLACKBURN_STRAIGHT_BY - backSweep)));
  const sweep = radians(degrees);
  const lift = radians(mix(backLift, BLACKBURN_LIFT, straight));
  const reach = mix(backReach, ARM_REACH, straight);
  const wrist = (side: 1 | -1): Vec3 => [
    shoulder[0] - reach * Math.cos(sweep) * Math.cos(lift),
    shoulder[1] + reach * Math.sin(lift),
    side * (shoulder[2] + reach * Math.sin(sweep) * Math.cos(lift)),
  ];
  // On the back the fingers point in toward the spine and a little down; once the arm is straight
  // the hand carries on from it.
  const fingers = (side: 1 | -1): Vec3 => {
    const along = wrist(side);
    return mix3([-0.3, -0.3, -side], [(along[0] - shoulder[0]) / reach, (along[1] - shoulder[1]) / reach, (along[2] - side * shoulder[2]) / reach], straight);
  };
  return {
    ...body,
    pins: {
      rightHand: { at: wrist(1), toward: fingers(1), pole: [-0.3, 0.4, 1] },
      leftHand: { at: wrist(-1), toward: fingers(-1), pole: [-0.3, 0.4, -1] },
    },
  };
};
const BLACKBURN_DOWN = blackburn(0);
const BLACKBURN_UP = blackburn(1);
/** Pinned hands go straight between keyframes, cutting across the arc, so it takes this many for the elbows to stay all but straight. */
const BLACKBURN_STEPS = 32;

export const BLACKBURN_3D: Clip3D = {
  view: '3d',
  // From above and behind the right foot: the arms sweep across the floor like the hands of a
  // clock, both clear of the body, and the mat and shadows still show the figure lying down.
  // Straight from behind the feet the sweep reads better, but the figure looks like it's standing.
  camera: { yaw: -50, pitch: 65 },
  highlight: ['rightArm', 'leftArm'],
  // The arms are held up off the floor, over the legs lying on it. By the sides a hand is beside
  // the hip, where by depth alone each arm would go under its leg partway into the sweep.
  behind: [
    ['rightLeg', 'rightArm'],
    ['leftLeg', 'leftArm'],
  ],
  // The left arm, on the far side, stays behind the body, its shoulder end under the shoulder
  // blade, while its forearm and hand lie over the back.
  handsOnBody: ['leftHand'],
  trail: 'rightHand',
  // Halfway, with the arms straight out to the sides.
  stillFrame: 1 + BLACKBURN_STEPS / 2,
  keyframes: [
    { ms: 0, pose: BLACKBURN_DOWN },
    { ms: 400, pose: BLACKBURN_DOWN },
    ...alongArc(2400, BLACKBURN_STEPS, blackburn),
    { ms: 400, pose: BLACKBURN_UP },
    ...alongArc(2400, BLACKBURN_STEPS, (t) => blackburn(1 - t)),
  ],
};

// --- Butterfly: sitting with the soles together, the knees lower out toward the floor, then the chest leans in ---

/** The heels are pulled in this far in front of the hips, the soles together. */
const BUTTERFLY_ANKLE: Vec3 = [62, 15, 12];
/** How far the knees are raised from level, out to the sides of the hips: sitting down into it, and relaxed toward the floor. */
const BUTTERFLY_KNEES = { up: 42, down: 12 };

/**
 * Sitting with the soles together and the hands holding the ankles, the toes showing past them.
 * Each knee is raised this far from level, out to its side, and the body leans this far in from
 * sitting tall, from 0 to 1: the pelvis tips forward and the back stays long. The elbows hang down
 * between the knees sitting tall, and bend and open out above the thighs as the chest comes forward.
 */
const butterflyAt = (knees: number, lean: number): Pose3 => {
  const foot = (side: 1 | -1): Pin => ({
    at: [BUTTERFLY_ANKLE[0], BUTTERFLY_ANKLE[1], side * BUTTERFLY_ANKLE[2]],
    // Soles together, the toes forward and a little up, the feet resting on their outer edges.
    toward: [1, 0.15, 0],
    pole: [0, Math.sin(radians(knees)), side * Math.cos(radians(knees))],
  });
  const hand = (side: 1 | -1): Pin => ({
    at: [BUTTERFLY_ANKLE[0] + 4, 34, side * 22],
    toward: [0.5, -0.6, -side * 0.6],
    pole: [-0.4, -1, side * mix(0.15, 0.35, lean)],
  });
  return {
    pelvis: [0, SIT_PELVIS_Y, 0],
    lean: mix(2, 14, lean),
    spine: { flex: mix(4, 8, lean) },
    // The head lifts to look ahead over the feet rather than drop with the chest, which also keeps
    // the face toward the camera, so the nose doesn't come and go.
    neck: { flex: mix(-4, -18, lean) },
    pins: { rightFoot: foot(1), leftFoot: foot(-1), rightHand: hand(1), leftHand: hand(-1) },
  };
};
const BUTTERFLY_UP = butterflyAt(BUTTERFLY_KNEES.up, 0);
const BUTTERFLY_TALL = butterflyAt(BUTTERFLY_KNEES.down, 0);
const BUTTERFLY_LEANING = butterflyAt(BUTTERFLY_KNEES.down, 1);
const BUTTERFLY_STEPS = 8;

export const BUTTERFLY_3D: Clip3D = {
  view: '3d',
  // From straight in front and above, where the knees lower out to the sides across the screen and
  // both legs show the same. From either side, one knee comes at the camera and hides the feet.
  camera: { yaw: 90, pitch: 38 },
  highlight: ['rightLeg', 'leftLeg'],
  // The arms are over the legs, so the hands show on the ankles and the elbows above the thighs.
  // Where the elbows hang between the knees, which is nearer is too close to call.
  behind: [
    ['rightLeg', 'rightArm'],
    ['leftLeg', 'leftArm'],
    ['rightLeg', 'leftArm'],
    ['leftLeg', 'rightArm'],
  ],
  // Sitting tall with the knees relaxed toward the floor, where the shape of the legs shows best.
  stillFrame: 2,
  // Sitting down into it, the knees relax first, then the chest leans in and holds.
  keyframes: [
    { ms: 0, pose: BUTTERFLY_UP },
    { ms: 400, pose: BUTTERFLY_UP },
    { ms: 1600, pose: BUTTERFLY_TALL },
    { ms: 600, pose: BUTTERFLY_TALL },
    ...alongArc(1800, BUTTERFLY_STEPS, (t) => butterflyAt(BUTTERFLY_KNEES.down, t)),
    { ms: 3000, pose: BUTTERFLY_LEANING },
    ...alongArc(1600, BUTTERFLY_STEPS, (t) => butterflyAt(BUTTERFLY_KNEES.down, 1 - t)),
    { ms: 1400, pose: BUTTERFLY_UP },
  ],
};

// --- Cobra to prayer: hands, knees and feet planted, the hips travel back on an arc around the knees, from cobra through all fours to the heels ---

/** The knees rest on the floor here, the shins and the tops of the feet flat behind them. */
const COBRA_KNEE_Z = SKELETON.hip;
/**
 * The hands stay planted this far ahead of the knees: as far as the arms reach with the hips back on
 * the heels, which is also near enough for them to be straight with the chest up in cobra.
 */
const COBRA_HANDS: Vec3 = [178, WRIST_Y, SKELETON.shoulder];
/**
 * How far the thighs are raised from lying along the floor ahead of the knees: a little in cobra,
 * where the hips stay low and the knees down, up over the knees on all fours, and on back to sit on
 * the heels in prayer.
 */
const COBRA_THIGH = { cobra: 20, prayer: 156 };
/** How high the middle of the head is with the forehead resting on the floor. */
const COBRA_HEAD_DOWN = SKELETON.head + 2;

/**
 * The body this far from cobra (0) to prayer (1), the neck straight. The hips swing back around the
 * knees, the back goes from arched to long, sloping down over the thighs in prayer, and the body
 * tips as far forward as keeps the shoulders an arm's reach from the hands, so the arms are
 * straight at both ends and just soft in between.
 */
const cobraBody = (t: number): Pose3 => {
  const thigh = radians(mix(COBRA_THIGH.cobra, COBRA_THIGH.prayer, t));
  const pelvis: Vec3 = [SKELETON.thigh * Math.cos(thigh), ANKLE_Y + SKELETON.thigh * Math.sin(thigh), 0];
  const leg = (side: 1 | -1): Pin =>
    pinVia([pelvis[0], pelvis[1], side * SKELETON.hip], [0, ANKLE_Y, side * COBRA_KNEE_Z], [-SKELETON.shin, ANKLE_Y, side * COBRA_KNEE_Z], [-1, 0, 0]);
  const hand = (side: 1 | -1): Pin => ({
    at: [COBRA_HANDS[0], COBRA_HANDS[1], side * COBRA_HANDS[2]],
    toward: [1, 0, 0],
    // The elbows point back under the body, and lift out to the sides with the arms reaching long.
    pole: mix3([-1, 0, side * 0.3], [-0.2, 1, side * 0.6], smooth(t)),
  });
  const body = (lean: number): Pose3 => ({
    pelvis,
    lean,
    // Arched in cobra, long from all fours on.
    spine: { flex: t < 0.5 ? mix(-45, 0, smooth(2 * t)) : mix(0, 8, smooth(2 * t - 1)) },
    pins: { rightFoot: leg(1), leftFoot: leg(-1), rightHand: hand(1), leftHand: hand(-1) },
  });
  const gap = (lean: number) => {
    const shoulder = solvePose(body(lean)).rightArm[0];
    return Math.hypot(COBRA_HANDS[0] - shoulder[0], COBRA_HANDS[1] - shoulder[1], COBRA_HANDS[2] - shoulder[2]);
  };
  // Through all fours the elbows give a little, as in cat cow.
  const reach = ARM_REACH * mix(0.995, 0.985, Math.sin(Math.PI * t));
  // Tipping forward brings the shoulders toward the hands until they point at them, so the lean
  // that reaches is found on the way there.
  let [upright, tipped] = [-10, 170];
  let nearest = upright;
  for (let tip = upright; tip <= tipped; tip += 2) if (gap(tip) < gap(nearest)) nearest = tip;
  [upright, tipped] = [-10, nearest];
  for (let i = 0; i < 40; i++) {
    const tip = (upright + tipped) / 2;
    if (gap(tip) > reach) upright = tip;
    else tipped = tip;
  }
  return body((upright + tipped) / 2);
};

/** How high the base of the neck is, and the head, with the neck straight. */
const neckBaseHeight = (pose: Pose3) => solvePose(pose).spine[6][1];
const ALL_FOURS_BODY = cobraBody(0.5);
const PRAYER_BODY = cobraBody(1);
const COBRA_DROP = {
  from: neckBaseHeight(ALL_FOURS_BODY),
  to: neckBaseHeight(PRAYER_BODY),
  head: solvePose(ALL_FOURS_BODY).head[1],
};

/**
 * Cobra to prayer, this far along. Looking ahead with the chest up, then the head drops between
 * the arms. From all fours it comes down with the shoulders, its height above the floor shrinking
 * in step with how far they still have to go, so the forehead touches the floor just as the hips
 * settle on the heels. Landing any sooner, the body would carry on down under a head that has
 * stopped, and look like it's pushing up off it.
 */
const cobraToPrayer = (t: number): Pose3 => {
  const body = cobraBody(t);
  if (t <= 0.5) return { ...body, neck: { flex: mix(-8, 0, smooth(2 * t)) } };
  const left = (neckBaseHeight(body) - COBRA_DROP.to) / (COBRA_DROP.from - COBRA_DROP.to);
  const target = mix(COBRA_HEAD_DOWN, COBRA_DROP.head, left);
  const height = (flex: number) => solvePose({ ...body, neck: { flex } }).head[1];
  // Bending the neck further tips the head further down.
  let [lifted, dropped] = [-60, 80];
  for (let i = 0; i < 40; i++) {
    const flex = (lifted + dropped) / 2;
    if (height(flex) < target) dropped = flex;
    else lifted = flex;
  }
  return { ...body, neck: { flex: (lifted + dropped) / 2 } };
};
const COBRA = cobraToPrayer(0);
const PRAYER = cobraToPrayer(1);
const ALL_FOURS_PRAYER = cobraToPrayer(0.5);
/** The hips travel on an arc, so it takes this many keyframes for the knees to stay put between them. */
const COBRA_TO_PRAYER_STEPS = 24;

export const COBRA_TO_PRAYER_3D: Clip3D = {
  view: '3d',
  // From the right side, a little in front and above, as for cat cow: the hips' arc back over the
  // knees is flat on the screen, and the head drops behind the near arm. Further round to the
  // front the nose comes and goes as the head turns down, and the head and the near thigh swap.
  camera: { yaw: 22, pitch: 12 },
  highlight: ['torso'],
  // Cobra. Prayer has its own exercise and tile.
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: COBRA },
    { ms: 600, pose: COBRA },
    ...alongArc(2200, COBRA_TO_PRAYER_STEPS, cobraToPrayer),
    { ms: 900, pose: PRAYER },
    ...alongArc(2200, COBRA_TO_PRAYER_STEPS, (t) => cobraToPrayer(1 - t)),
  ],
};

// --- Downward facing dog: hands and toes planted, the hips lift up and back off the knees into an upside-down V, then the heels sink ---

/** The toes are tucked under, the balls of the feet on the floor here, hip-width apart. */
const DOG_TOES: Vec3 = [-78, 0, SKELETON.hip];
/** How high the tip of a foot sits resting on the floor. */
const DOG_TOE_Y = 10.5;
/**
 * The hands stay planted a little ahead of the shoulders on all fours, which is how far from the
 * feet they are in the V: the legs and the body with the arms in line meet at the hips at about 64°.
 */
const DOG_HANDS: Vec3 = [140, WRIST_Y, SKELETON.shoulder];
/** The knees rest on the floor under the hips to start. */
const DOG_KNEE: Vec3 = [0, ANKLE_Y, SKELETON.hip];
/** How steep the feet are, from the floor: nearly upright with the knees down, and the heels sunk in the V. */
const DOG_FOOT = { kneeling: 70, sunk: 8 };

/** Where the ankle is with the toes on the floor and the foot this steep, and which way the foot points. */
const dogFoot = (steep: number, side: 1 | -1): { at: Vec3; toward: Vec3 } => {
  const angle = radians(steep);
  return {
    at: [DOG_TOES[0] - SKELETON.foot * Math.cos(angle), DOG_TOE_Y + SKELETON.foot * Math.sin(angle), side * DOG_TOES[2]],
    toward: [Math.cos(angle), -Math.sin(angle), 0],
  };
};

/** The pelvis with the knees down on the floor under it, the shin rising from the knee to the tucked-under foot. */
const DOG_KNEELING_PELVIS: Vec3 = [DOG_KNEE[0], DOG_KNEE[1] + SKELETON.thigh, 0];

/**
 * How far the shoulders are from the hands in the V, as a share of the arms' reach, with the body
 * pointed straight at them. A hair short, so the straight arms come out a few degrees off in line
 * with the back: exactly in line, a hair of reach takes a big turn of the body, and the head and
 * shoulders would snap into and out of the V.
 */
const DOG_ARMS_IN_LINE = 0.99;

/**
 * Where the hips are in the V with the feet this steep: the legs straight, and the body nearly in
 * line with the straight arms, so the hips are a leg's reach from the ankles and about a body and
 * arm's from the hands.
 */
const dogHips = (steep: number): Vec3 => {
  const ankle = dogFoot(steep, 1).at;
  const [legs, body] = [LEG_REACH, SKELETON.torso + DOG_ARMS_IN_LINE * ARM_REACH];
  const across = [DOG_HANDS[0] - ankle[0], DOG_HANDS[1] - ankle[1]];
  const gap = Math.hypot(across[0], across[1]);
  const along = (legs * legs - body * body + gap * gap) / (2 * gap);
  const up = Math.sqrt(legs * legs - along * along);
  const [ux, uy] = [across[0] / gap, across[1] / gap];
  return [ankle[0] + ux * along - uy * up, ankle[1] + uy * along + ux * up, 0];
};

/** The body over these hips, tipped forward this far, hands and toes planted. */
const dogBody = (pelvis: Vec3, steep: number, lean: number, kneePole: Vec3): Pose3 => {
  const foot = (side: 1 | -1): Pin => ({ ...dogFoot(steep, side), pole: kneePole });
  const hand = (side: 1 | -1): Pin => ({ at: [DOG_HANDS[0], DOG_HANDS[1], side * DOG_HANDS[2]], toward: [1, 0, 0], pole: [-1, 0, side * 0.3] });
  return {
    pelvis,
    lean,
    pins: { rightFoot: foot(1), leftFoot: foot(-1), rightHand: hand(1), leftHand: hand(-1) },
  };
};

/** How far the shoulders are from the hands. */
const dogArmGap = (pose: Pose3) => {
  const shoulder = solvePose(pose).rightArm[0];
  return Math.hypot(DOG_HANDS[0] - shoulder[0], DOG_HANDS[1] - shoulder[1], DOG_HANDS[2] - shoulder[2]);
};

/** How far to tip the body over these hips, as far forward as keeps the shoulders `reach` from the hands. */
const dogLean = (pelvis: Vec3, steep: number, reach: number): number => {
  const gap = (lean: number) => dogArmGap(dogBody(pelvis, steep, lean, DOG_STRAIGHT_POLE));
  let nearest = 0;
  for (let tip = 0; tip <= 180; tip += 2) if (gap(tip) < gap(nearest)) nearest = tip;
  let [upright, tipped] = [0, nearest];
  for (let i = 0; i < 40; i++) {
    const tip = (upright + tipped) / 2;
    if (gap(tip) > reach) upright = tip;
    else tipped = tip;
  }
  return (upright + tipped) / 2;
};

const DOG_KNEELING_POLE = pinVia(
  [DOG_KNEELING_PELVIS[0], DOG_KNEELING_PELVIS[1], SKELETON.hip],
  DOG_KNEE,
  dogFoot(DOG_FOOT.kneeling, 1).at
).pole;
/** The knees point forward toward the hands on the way up. Once the legs are straight it no longer matters. */
const DOG_STRAIGHT_POLE: Vec3 = [1, 0.2, 0];

/**
 * Where the hips are from the knees (0) up into the V (1). They swing up and back around the ankles
 * as the knees straighten, and the heels lower toward the floor all the way, in one movement with
 * the hips rather than waiting for the V.
 */
const dogPelvis = (t: number): Vec3 => {
  const ankle = dogFoot(mix(DOG_FOOT.kneeling, DOG_FOOT.sunk, t), 1).at;
  // The hips as seen from the ankles, kneeling and in the V.
  const [from, to] = [dogFoot(DOG_FOOT.kneeling, 1).at, dogFoot(DOG_FOOT.sunk, 1).at];
  const hips = dogHips(DOG_FOOT.sunk);
  const start = [DOG_KNEELING_PELVIS[0] - from[0], DOG_KNEELING_PELVIS[1] - from[1]];
  const end = [hips[0] - to[0], hips[1] - to[1]];
  const length = mix(Math.hypot(start[0], start[1]), LEG_REACH, t);
  const angle = mix(Math.atan2(start[1], start[0]), Math.atan2(end[1], end[0]), t);
  return [ankle[0] + length * Math.cos(angle), ankle[1] + length * Math.sin(angle), 0];
};

/**
 * From the knees (0) up into the V with the heels sunk (1), in one movement. The body tips as far
 * forward as keeps the arms just short of straight, the elbows giving a little on the way as in cat
 * cow, and the reach eases into its ends so the head and shoulders do too.
 */
const dogLift = (t: number): Pose3 => {
  const pelvis = dogPelvis(t);
  const steep = mix(DOG_FOOT.kneeling, DOG_FOOT.sunk, t);
  const reach = ARM_REACH * (mix(0.995, 1, smooth(t)) - 0.012 * Math.sin(Math.PI * t) ** 2);
  return dogBody(pelvis, steep, dogLean(pelvis, steep, reach), mix3(DOG_KNEELING_POLE, DOG_STRAIGHT_POLE, t));
};

const DOG_KNEELING = dogLift(0);
const DOWNWARD_DOG = dogLift(1);
/** The hips travel on an arc, so it takes this many keyframes for the toes to stay put between them. */
const DOG_LIFT_STEPS = 24;

export const DOWNWARD_FACING_DOG_3D: Clip3D = {
  view: '3d',
  // From the right side, a little in front and above, as for cat cow: the V is flat on the screen,
  // and the head hangs between the arms behind the near one.
  camera: { yaw: 22, pitch: 12 },
  highlight: ['rightLeg', 'leftLeg'],
  // The V with the heels sunk.
  stillFrame: 1 + DOG_LIFT_STEPS,
  keyframes: [
    { ms: 0, pose: DOG_KNEELING },
    { ms: 500, pose: DOG_KNEELING },
    ...alongArc(1500, DOG_LIFT_STEPS, dogLift),
    { ms: 3500, pose: DOWNWARD_DOG },
    ...alongArc(1800, DOG_LIFT_STEPS, (t) => dogLift(1 - t)),
  ],
};

// --- Prayer pose: from all fours, the hips sink back onto the heels and the arms reach long, forehead to the floor ---

export const PRAYER_POSE_3D: Clip3D = {
  view: '3d',
  // As for cobra to prayer, whose second half this is: the hips' arc back is flat on the screen,
  // and the head drops behind the near arm.
  camera: { yaw: 22, pitch: 12 },
  highlight: ['torso', 'rightArm', 'leftArm'],
  stillFrame: 1 + COBRA_TO_PRAYER_STEPS,
  keyframes: [
    { ms: 0, pose: ALL_FOURS_PRAYER },
    { ms: 500, pose: ALL_FOURS_PRAYER },
    ...alongArc(2000, COBRA_TO_PRAYER_STEPS, (t) => cobraToPrayer(0.5 + t / 2)),
    { ms: 3500, pose: PRAYER },
    ...alongArc(2000, COBRA_TO_PRAYER_STEPS, (t) => cobraToPrayer(1 - t / 2)),
  ],
};

// --- Lying knee hug: the knee to chest test's pull, held ---

export const LYING_KNEE_HUG_3D: Clip3D = {
  view: '3d',
  camera: KNEE_TO_CHEST_3D.camera,
  highlight: ['rightLeg'],
  stillFrame: 4,
  // As in knee to chest: the hands open either side of the knee on the way up and close on the shin.
  keyframes: [
    { ms: 0, pose: KNEE_TO_CHEST_FLAT },
    { ms: 500, pose: KNEE_TO_CHEST_FLAT },
    { ms: 1000, pose: KNEE_TO_CHEST_LIFTED },
    { ms: 250, pose: KNEE_TO_CHEST_HELD },
    { ms: 1000, pose: KNEE_TO_CHEST_IN },
    { ms: 3500, pose: KNEE_TO_CHEST_IN },
    { ms: 1000, pose: KNEE_TO_CHEST_HELD },
    { ms: 250, pose: KNEE_TO_CHEST_LIFTED },
    { ms: 1000, pose: KNEE_TO_CHEST_FLAT },
  ],
};

// --- Lying hamstring stretch: the straight leg raise's strap pull, taken a little further and held ---

/** The leg pulled a little closer than the test's average, for the hold. */
const STRAP_PULLED = strapHeldAt(84, [-110, 62, 16]);

export const LYING_HAMSTRING_STRETCH_3D: Clip3D = {
  view: '3d',
  camera: STRAIGHT_LEG_RAISE_3D.camera,
  highlight: ['rightLeg'],
  trail: 'rightFoot',
  strap: 'rightFoot',
  stillFrame: 3,
  keyframes: [
    { ms: 0, pose: STRAP_DOWN },
    { ms: 500, pose: STRAP_DOWN },
    { ms: 1700, pose: STRAP_UP },
    { ms: 900, pose: STRAP_PULLED },
    { ms: 3500, pose: STRAP_PULLED },
    { ms: 2200, pose: STRAP_DOWN },
  ],
};

// --- Puppy pose: from all fours, the hands walk forward and the chest melts toward the floor, the hips staying over the knees ---

/** The back long on all fours, as cat cow starts from. */
const PUPPY_START_LEAN = onAllFours(0, 0).lean!;
/** How far the body tips and the chest sinks at the end, the upper back arched toward the floor. */
const PUPPY_END = { lean: 128, arch: -26 };
/** How much of an arm's length the hands step out to, so the arms are long but not locked. */
const PUPPY_REACH = 0.995 * ARM_REACH;

/** The body this far into the pose, the hands left out. */
const puppyBody = (p: number): Pose3 => ({
  ...ALL_FOURS,
  lean: mix(PUPPY_START_LEAN, PUPPY_END.lean, p),
  spine: { flex: mix(0, PUPPY_END.arch, p) },
});
/** How far ahead the hands can land with the body this far in: where an arm's reach from the shoulder meets the floor. */
const puppyReach = (p: number): number => {
  const shoulder = solvePose(puppyBody(p)).rightArm[0];
  return shoulder[0] + Math.sqrt(PUPPY_REACH ** 2 - (shoulder[1] - WRIST_Y) ** 2);
};
const PUPPY_HANDS_START = ALL_FOURS.pins.rightHand.at[0];
const PUPPY_HEAD = { start: solvePose(onAllFours(0, 0)).head[1], end: COBRA_HEAD_DOWN };

/**
 * Into the pose as one move, from 0 to 1: the chest sinks over most of it, the right hand reaching
 * out in one step and landing partway, and the left one, which waits where it was, its arm bending
 * as the chest comes forward over it, follows straight on to land beside it as the chest settles.
 * Walked out in short steps, the hands shuffled. They land as far out as the arm reaches when the
 * right one comes down: any further and it couldn't land until the chest was all the way down, the
 * left arm folding right up under it while it waited, or both hands off the floor at once.
 */
const PUPPY_MOVE = { bodyEnds: 0.85, rightLands: 0.52, leftFrom: 0.55 };
/** Where the hands end up. */
const PUPPY_HANDS_END = puppyReach(smooth(PUPPY_MOVE.rightLands / PUPPY_MOVE.bodyEnds));

/**
 * A hand `s` of the way through its one step out: up off the floor, forward through the air and
 * straight down. Moving forward all the way to the floor, a hand slides in as it lands.
 */
const puppyHand = (side: 1 | -1, s: number): Vec3 => {
  const x = mix(PUPPY_HANDS_START, PUPPY_HANDS_END, smooth(Math.min(1, Math.max(0, (s - 0.15) / 0.7))));
  return [x, WRIST_Y + Math.sin(Math.PI * s) * 14, side * SKELETON.shoulder];
};

/**
 * Puppy pose this far through the walk. The head goes down with the chest, the forehead reaching
 * the floor as the body settles.
 */
const puppyAt = (t: number): Pose3 => {
  const p = smooth(Math.min(1, t / PUPPY_MOVE.bodyEnds));
  const body = puppyBody(p);
  const shoulders = solvePose(body);
  const hand = (side: 1 | -1): Vec3 => {
    const s = side === 1 ? Math.min(1, t / PUPPY_MOVE.rightLands) : Math.max(0, (t - PUPPY_MOVE.leftFrom) / (1 - PUPPY_MOVE.leftFrom));
    const at = puppyHand(side, s);
    // Out of the arm's reach while the body is still coming forward, the hand in the air goes as far as it reaches.
    const shoulder = side === 1 ? shoulders.rightArm[0] : shoulders.leftArm[0];
    return distance(shoulder, at) > 0.999 * ARM_REACH ? toward(shoulder, at, 0.999 * ARM_REACH) : at;
  };
  // Whatever bend the arms take goes back and out to the sides, as in a push-up.
  const pole = (side: 1 | -1): Vec3 => [-0.7, 0, side * 0.7];
  const posed: Pose3 = {
    ...body,
    pins: {
      ...ALL_FOURS.pins,
      rightHand: { at: hand(1), toward: [1, 0, 0], pole: pole(1) },
      leftHand: { at: hand(-1), toward: [1, 0, 0], pole: pole(-1) },
    },
  };
  const target = mix(PUPPY_HEAD.start, PUPPY_HEAD.end, p);
  const height = (flex: number) => solvePose({ ...posed, neck: { flex } }).head[1];
  let [lifted, dropped] = [-60, 80];
  for (let i = 0; i < 40; i++) {
    const flex = (lifted + dropped) / 2;
    if (height(flex) < target) dropped = flex;
    else lifted = flex;
  }
  return { ...posed, neck: { flex: (lifted + dropped) / 2 } };
};
const PUPPY_ALL_FOURS = puppyAt(0);
const PUPPY = puppyAt(1);
/** Enough frames for the lifted hands to arc and land, not slide in. */
const PUPPY_WALK_FRAMES = 84;
const puppyWalk = (ms: number, at: (t: number) => Pose3): Keyframe3[] =>
  Array.from({ length: PUPPY_WALK_FRAMES }, (_, i) => ({ ms: ms / PUPPY_WALK_FRAMES, pose: at((i + 1) / PUPPY_WALK_FRAMES), ease: 'none' as const }));

export const PUPPY_POSE_3D: Clip3D = {
  view: '3d',
  // As for cat cow: the chest's sink between the hips and the hands is flat on the screen, and the
  // head goes down behind the near arm.
  camera: { yaw: 22, pitch: 12 },
  highlight: ['torso', 'rightArm', 'leftArm'],
  stillFrame: 1 + PUPPY_WALK_FRAMES,
  keyframes: [
    { ms: 0, pose: PUPPY_ALL_FOURS },
    { ms: 500, pose: PUPPY_ALL_FOURS },
    ...puppyWalk(3200, puppyAt),
    { ms: 3500, pose: PUPPY },
    ...puppyWalk(2900, (t) => puppyAt(1 - t)),
  ],
};

// --- Seated pike stretch: legs straight and together, toes up, folding forward from the hips as the hands reach down to wrap around the feet ---

/** How far the back rounds and the neck bends for each degree the pelvis tips forward. */
const PIKE_ROUNDING = { spine: 1.25, neck: 0.65 };
/** The hands go against the outside of each leg and foot, this far out from its middle and up from it. */
const PIKE_HAND_OUT = 15;
const PIKE_HAND_UP = 3;
/** Where the hands start, resting on top of the thighs, as a fraction of the way from the hip to the ankle. */
const PIKE_HAND_REST = 0.3;
/** How far up off the middle of the thigh, and out from it, a hand rests on top of it. */
const PIKE_HAND_ON_TOP = { up: 14, out: 4 };
/** How far up the foot, from the ankle to the toes, the hands hold it. */
const PIKE_FOOT_HOLD = 0.6;
/** How far the wrist sits ahead of the middle of the foot, at the sole's edge. */
const PIKE_HAND_FORWARD = 6;
/** The hands turn round the feet over the last part of the way: the near one in across its sole, the far one, behind its foot, on round the front of it so the fingertips show past the far side of the sole. */
const PIKE_WRAP = { from: 0.6, near: [0.4, 0, -1] as Vec3, far: [0.85, 0, 0.5] as Vec3 };
/** How high the hands arc over the shins on their way to the feet. */
const PIKE_HAND_ARC = 26;
/** How far the arms reach at the bottom of the fold, as a fraction of their length: long, holding the feet. */
const PIKE_REACH = 0.985;

/** The body with the pelvis tipped this far forward and the back and neck rounding with it, the legs flat and the toes up. */
const pikeBody = (lean: number): Pose3 => {
  // The ankles make up for the slope, so the toes point up.
  const leg: LegPose = { flex: 90 - SIT_LEG_DROP + lean, ankle: SIT_LEG_DROP };
  return {
    pelvis: [0, SIT_PELVIS_Y, 0],
    lean,
    spine: { flex: PIKE_ROUNDING.spine * lean },
    neck: { flex: PIKE_ROUNDING.neck * lean },
    rightLeg: leg,
    leftLeg: leg,
  };
};
/** The legs don't move, so the hands' path is laid along them once. */
const PIKE_LEGS = solvePose(pikeBody(0));

/**
 * Where a hand is this far along its way: from resting on top of the thigh, elbow soft, in one smooth
 * arc a little up off the shin, to holding the side of the foot.
 */
const pikeHand = (side: 1 | -1, u: number): Vec3 => {
  const [hip, , ankle, toes] = side === 1 ? PIKE_LEGS.rightLeg : PIKE_LEGS.leftLeg;
  const outside = ([x, y, z]: Vec3, up = 0): Vec3 => [x, y + PIKE_HAND_UP + up, z + side * PIKE_HAND_OUT];
  // On top of the thigh, a little toward its outside.
  const [restX, restY, restZ] = mix3(hip, ankle, PIKE_HAND_REST);
  const rest: Vec3 = [restX, restY + PIKE_HAND_ON_TOP.up, restZ + side * PIKE_HAND_ON_TOP.out];
  const over = outside(mix3(hip, ankle, 0.9), PIKE_HAND_ARC);
  // On the outside edge of the foot, toward the sole, so the hand can turn in across it.
  const [x, y, z] = outside(mix3(ankle, toes, PIKE_FOOT_HOLD));
  const hold: Vec3 = [x + PIKE_HAND_FORWARD, y, z];
  return mix3(mix3(rest, over, u), mix3(over, hold, u), u);
};
/**
 * Which way a hand points this far along: down the leg on the way, then turning in around the
 * outside of the foot and across the sole as it gets there, the fingers wrapped round the ball.
 */
const pikeFingers = (side: 1 | -1, u: number): Vec3 =>
  mix3([1, -0.1, 0], side === 1 ? PIKE_WRAP.near : PIKE_WRAP.far, smooth(Math.max(0, (u - PIKE_WRAP.from) / (1 - PIKE_WRAP.from))));

/** How far into the reach the far arm goes from over its leg to behind it. */
const PIKE_FAR_ARM_BEHIND_FROM = 0.4;

const PIKE_REST_REACH = distance(solvePose(pikeBody(0)).rightArm[0], pikeHand(1, 0));

/**
 * The pike this far in: the hands this far along their arc, and the body folded just as far as
 * keeps the arms' reach easing from resting to long. The hands lead and the fold follows.
 */
const pikeAt = (p: number): Pose3 => {
  const right = pikeHand(1, p);
  const reach = mix(PIKE_REST_REACH, PIKE_REACH * ARM_REACH, p);
  // Folding further brings the shoulders nearer the hands.
  let [upright, folded] = [-10, 70];
  for (let i = 0; i < 40; i++) {
    const lean = (upright + folded) / 2;
    if (distance(solvePose(pikeBody(lean)).rightArm[0], right) > reach) upright = lean;
    else folded = lean;
  }
  const body = pikeBody((upright + folded) / 2);
  const hand = (side: 1 | -1): Pin => ({ at: pikeHand(side, p), toward: pikeFingers(side, p), pole: [0, -0.4, side] });
  // The far hand rests on top of its thigh to start, so its arm is over the leg; reaching for the
  // foot it goes round the outside and behind it. The change comes high in the reach, where the
  // arm is clear of the leg on screen.
  const far: Clip3D['behind'] = p < PIKE_FAR_ARM_BEHIND_FROM ? [['leftLeg', 'leftArm']] : [['leftArm', 'leftLeg']];
  return { ...body, pins: { rightHand: hand(1), leftHand: hand(-1) }, behind: far };
};
const PIKE_TALL = pikeAt(0);
const PIKE_FOLDED = pikeAt(1);
const PIKE_STEPS = 16;

export const SEATED_PIKE_STRETCH_3D: Clip3D = {
  view: '3d',
  // From the right, turned toward the front and a little above: the fold still goes across the
  // screen, and the near hand shows turning in across the sole of its foot. Any further round and
  // the nose shows sitting tall and goes as the head drops.
  camera: { yaw: 30, pitch: 18 },
  highlight: ['rightLeg', 'leftLeg'],
  // The hands reach from the tops of the thighs round the outsides of the feet. The near arm stays
  // in front of its leg; the far one goes behind its own partway, which each pose says.
  behind: [['rightLeg', 'rightArm']],
  stillFrame: 1 + PIKE_STEPS,
  keyframes: [
    { ms: 0, pose: PIKE_TALL },
    { ms: 600, pose: PIKE_TALL },
    ...alongArc(2400, PIKE_STEPS, pikeAt),
    { ms: 3500, pose: PIKE_FOLDED },
    ...alongArc(2200, PIKE_STEPS, (t) => pikeAt(1 - t)),
  ],
};

// --- Three legged downward facing dog: from the V, one straight leg at a time swings up behind, the hips level ---

/** How far past in line with the back the lifted leg goes: up behind, as high as it will go. */
const THREE_LEG_PAST_BACK = 12;

/** Which way a leg points from the hip, as an angle in the side-on plane (0 ahead, 90 up). */
const sideAngle = (from: Vec3, to: Vec3) => Math.atan2(to[1] - from[1], to[0] - from[0]);

const THREE_LEG_V = solvePose(DOWNWARD_DOG);
/** The planted leg, from the hip down to the ankle. */
const THREE_LEG_DOWN = sideAngle(THREE_LEG_V.rightLeg[0], THREE_LEG_V.rightLeg[2]);
/** In line with the back, the line from the neck to the hips carried on past them, and a little higher. */
const THREE_LEG_UP = sideAngle(THREE_LEG_V.spine[6], THREE_LEG_V.spine[0]) - radians(THREE_LEG_PAST_BACK);
/** How far the planted foot is turned from the line of its leg, toward the front: the toes tucked under. */
const THREE_LEG_TUCKED_ANKLE = (() => {
  const toward = DOWNWARD_DOG.pins!.rightFoot!.toward!;
  return Math.atan2(toward[1], toward[0]) - THREE_LEG_DOWN;
})();

/**
 * The V with the right (1) or left (-1) leg lifted this far, from planted (0) to up behind (1). The
 * leg stays straight and swings back around the hip, and the foot turns with it, flexed square to
 * the shin, so the sole faces the ceiling at the top. Blending the foot's direction from the tucked
 * toes to anything along the leg goes through nearly opposite directions, and the foot spins.
 */
const threeLegged = (side: 1 | -1, lift: number): Pose3 => {
  const hip = side === 1 ? THREE_LEG_V.rightLeg[0] : THREE_LEG_V.leftLeg[0];
  // Swinging back the long way round, behind the body, never forward under it.
  const up = THREE_LEG_UP > THREE_LEG_DOWN ? THREE_LEG_UP - 2 * Math.PI : THREE_LEG_UP;
  const angle = mix(THREE_LEG_DOWN, up, lift);
  const along: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
  const planted = DOWNWARD_DOG.pins![side === 1 ? 'rightFoot' : 'leftFoot']!;
  // The foot keeps its angle to the shin, easing from the tucked toes' angle to square once clear of the floor.
  const ankle = mix(THREE_LEG_TUCKED_ANKLE, Math.PI / 2, smooth(Math.min(1, Math.max(0, (lift - 0.1) / 0.5))));
  const foot: Pin = {
    at: lift === 0 ? planted.at : [hip[0] + LEG_REACH * along[0], hip[1] + LEG_REACH * along[1], hip[2]],
    toward: lift === 0 ? planted.toward : [Math.cos(angle + ankle), Math.sin(angle + ankle), 0],
    // The knee's hair of bend stays on the kneecap's side, square to the leg. A fixed pole ends up
    // in line with the leg as it passes level behind the body, and the bend flips to the back.
    pole: lift === 0 ? planted.pole : [Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2), 0],
  };
  return { ...DOWNWARD_DOG, pins: { ...DOWNWARD_DOG.pins, [side === 1 ? 'rightFoot' : 'leftFoot']: foot } };
};
/** The foot travels on an arc around the hip, so it takes this many keyframes for the leg to stay straight between them. */
const THREE_LEG_STEPS = 72;
const threeLegLift = (side: 1 | -1, ms: number, down = false) => alongArc(ms, THREE_LEG_STEPS, (t) => threeLegged(side, down ? 1 - t : t));

export const THREE_LEGGED_DOWNWARD_FACING_DOG_3D: Clip3D = {
  view: '3d',
  camera: DOWNWARD_FACING_DOG_3D.camera,
  highlight: ['rightLeg', 'leftLeg'],
  // The right leg up behind.
  stillFrame: 1 + THREE_LEG_STEPS,
  keyframes: [
    { ms: 0, pose: DOWNWARD_DOG },
    { ms: 400, pose: DOWNWARD_DOG },
    ...threeLegLift(1, 1300),
    { ms: 600, pose: threeLegged(1, 1) },
    ...threeLegLift(1, 1300, true),
    { ms: 400, pose: DOWNWARD_DOG },
    ...threeLegLift(-1, 1300),
    { ms: 600, pose: threeLegged(-1, 1) },
    ...threeLegLift(-1, 1300, true),
  ],
};

// --- Downward facing dog to cobra: hands and toes planted, the hips come down out of the V through a plank, rolling over the toes, into cobra, and back ---

/**
 * The hands stay planted here, and the tips of the feet this far behind them: near enough that the
 * shoulders come over the hands in the plank and in cobra, where the hips are low and the legs
 * long behind. The V is a long one, the legs and body meeting at the hips at about 83°, as it is
 * flowing in and out of it without stepping the feet in.
 */
const FLOW_HANDS: Vec3 = [140, WRIST_Y, SKELETON.shoulder];
const FLOW_TOES: Vec3 = [FLOW_HANDS[0] - 280, DOG_TOE_Y, SKELETON.hip];
/**
 * How steep each foot stands from the floor, from its tip up to the ankle: the heels toward the
 * floor in the V, the toes tucked under in the plank, and over the toes onto the top of the foot in
 * cobra, the ankle resting on the floor ahead of the tip.
 */
const FLOW_FOOT = { dog: 20, plank: 70, cobra: 180 - (Math.asin((ANKLE_Y - DOG_TOE_Y) / SKELETON.foot) * 180) / Math.PI };
/** How high the hips are in cobra: low, the thighs just off the floor. */
const FLOW_COBRA_HIPS = 48;
/** How far the back arches in cobra. */
const FLOW_COBRA_ARCH = -45;
/** The body lies along a straight line from the ankles in the plank, the neck this far along it. */
const FLOW_PLANK_NECK = LEG_REACH + SKELETON.torso;

/** Where the ankle is with the foot this steep, its tip on the floor, and which way the foot points from it. */
const flowFoot = (steep: number, side: 1 | -1): { at: Vec3; toward: Vec3 } => {
  const angle = radians(steep);
  return {
    at: [FLOW_TOES[0] - SKELETON.foot * Math.cos(angle), DOG_TOE_Y + SKELETON.foot * Math.sin(angle), side * FLOW_TOES[2]],
    toward: [Math.cos(angle), -Math.sin(angle), 0],
  };
};

/** Which way the straight legs point from the ankles up to the hips, in the side-on plane (0 back along the floor, 90 up). */
const flowLegAngle = (ankle: Vec3, pelvis: readonly [number, number]) => Math.atan2(pelvis[1] - ankle[1], pelvis[0] - ankle[0]);
const FLOW_LEGS = (() => {
  // The V: the hips a leg's reach from the ankles and about a body and arm's from the hands.
  const ankle = flowFoot(FLOW_FOOT.dog, 1).at;
  const [legs, body] = [LEG_REACH, SKELETON.torso + DOG_ARMS_IN_LINE * ARM_REACH];
  const across = [FLOW_HANDS[0] - ankle[0], FLOW_HANDS[1] - ankle[1]];
  const gap = Math.hypot(across[0], across[1]);
  const along = (legs * legs - body * body + gap * gap) / (2 * gap);
  const up = Math.sqrt(legs * legs - along * along);
  const [ux, uy] = [across[0] / gap, across[1] / gap];
  const dog = flowLegAngle(ankle, [ankle[0] + ux * along - uy * up, ankle[1] + uy * along + ux * up]);
  // The plank: the body in one line from the ankles, tipped down until the neck is an arm's reach
  // from the hands. Steeper, it's further.
  const plankAnkle = flowFoot(FLOW_FOOT.plank, 1).at;
  const neckGap = (angle: number) =>
    Math.hypot(plankAnkle[0] + FLOW_PLANK_NECK * Math.cos(angle) - FLOW_HANDS[0], plankAnkle[1] + FLOW_PLANK_NECK * Math.sin(angle) - FLOW_HANDS[1]);
  let [low, high] = [0, Math.PI / 4];
  for (let i = 0; i < 40; i++) {
    const angle = (low + high) / 2;
    if (neckGap(angle) > ARM_REACH) high = angle;
    else low = angle;
  }
  const cobraAnkle = flowFoot(FLOW_FOOT.cobra, 1).at;
  const cobra = Math.asin((FLOW_COBRA_HIPS - cobraAnkle[1]) / LEG_REACH);
  return { dog, plank: (low + high) / 2, cobra };
})();

/** A smooth curve through `a` at 0, `b` at a half and `c` at 1. */
const throughThree = (a: number, b: number, c: number, t: number) => a * (1 - t) * (1 - 2 * t) + b * 4 * t * (1 - t) + c * t * (2 * t - 1);

/**
 * The flow this far from the V (0) to cobra (1), through the plank halfway. The legs stay straight
 * as they swing down around the ankles, and the feet roll forward over their tips as they go, the
 * heels rising into the plank and carrying on over into cobra. The body tips as far forward as
 * keeps the arms straight, the back long until the plank and arching on the way down into cobra,
 * where the head comes up to look ahead.
 */
const dogToCobra = (t: number): Pose3 => {
  const steep = throughThree(FLOW_FOOT.dog, FLOW_FOOT.plank, FLOW_FOOT.cobra, t);
  const legs = throughThree(FLOW_LEGS.dog, FLOW_LEGS.plank, FLOW_LEGS.cobra, t);
  const ankle = flowFoot(steep, 1).at;
  const pelvis: Vec3 = [ankle[0] + LEG_REACH * Math.cos(legs), ankle[1] + LEG_REACH * Math.sin(legs), 0];
  // The kneecaps face the hands in the V and the floor in cobra.
  const kneePole = mix3(DOG_STRAIGHT_POLE, [0, -1, 0], smooth(t));
  const foot = (side: 1 | -1): Pin => ({ ...flowFoot(steep, side), pole: kneePole });
  const hand = (side: 1 | -1): Pin => ({ at: [FLOW_HANDS[0], FLOW_HANDS[1], side * FLOW_HANDS[2]], toward: [1, 0, 0], pole: [-1, 0, side * 0.3] });
  const flex = FLOW_COBRA_ARCH * smooth(Math.max(0, (t - 0.4) / 0.6));
  const body = (lean: number): Pose3 => ({
    pelvis,
    lean,
    spine: { flex },
    neck: { flex: mix(0, -8, smooth(t)) },
    pins: { rightFoot: foot(1), leftFoot: foot(-1), rightHand: hand(1), leftHand: hand(-1) },
  });
  const gap = (lean: number) => {
    const shoulder = solvePose(body(lean)).rightArm[0];
    return Math.hypot(FLOW_HANDS[0] - shoulder[0], FLOW_HANDS[1] - shoulder[1], FLOW_HANDS[2] - shoulder[2]);
  };
  // Tipping forward brings the shoulders toward the hands until they point at them, so the lean
  // that reaches is found on the way there.
  let nearest = -20;
  for (let tip = -20; tip <= 180; tip += 2) if (gap(tip) < gap(nearest)) nearest = tip;
  let [upright, tipped] = [-20, nearest];
  for (let i = 0; i < 40; i++) {
    const tip = (upright + tipped) / 2;
    if (gap(tip) > ARM_REACH) upright = tip;
    else tipped = tip;
  }
  return body((upright + tipped) / 2);
};

const FLOW_DOG = dogToCobra(0);
const FLOW_COBRA = dogToCobra(1);
/** The hips and the feet travel on arcs, so it takes this many keyframes for the toes to stay put between them. */
const FLOW_STEPS = 32;

export const DOWNWARD_FACING_DOG_TO_COBRA_3D: Clip3D = {
  view: '3d',
  // As for downward facing dog: from the right side, a little in front and above, so the V, the
  // plank and cobra are all flat on the screen, and the head hangs behind the near arm.
  camera: DOWNWARD_FACING_DOG_3D.camera,
  highlight: ['torso', 'rightLeg', 'leftLeg'],
  // Cobra: the dog has its own exercise and tile.
  stillFrame: 1 + FLOW_STEPS,
  keyframes: [
    { ms: 0, pose: FLOW_DOG },
    { ms: 900, pose: FLOW_DOG },
    ...alongArc(2200, FLOW_STEPS, dogToCobra),
    { ms: 900, pose: FLOW_COBRA },
    ...alongArc(2200, FLOW_STEPS, (t) => dogToCobra(1 - t)),
  ],
};

// --- Standing forward fold: feet planted hip-width apart and the knees soft, hinging from the hips until the head and arms hang ---

const FOLD_STANDING = solvePose(STANDING);
/** The feet stay planted where they stand. */
const FOLD_FEET = {
  rightFoot: { at: FOLD_STANDING.rightLeg[2], toward: [1, 0, 0] as Vec3 },
  leftFoot: { at: FOLD_STANDING.leftLeg[2], toward: [1, 0, 0] as Vec3 },
};
/** All the way down: the hinge at the hips, the back rounding over, the neck letting the head hang, and the knees soft. */
const FOLD = { lean: 78, spine: 46, neck: 30, knees: 14, hipsBack: 16 };

/**
 * The fold this far down, from standing (0). The hips go back over the heels as the body tips, so
 * the weight stays over the feet, and drop as the knees soften. The arms hang straight down from
 * the shoulders, as they would.
 */
const forwardFoldAt = (t: number): Pose3 => {
  const knee = FOLD.knees * t;
  // Bending the knees with the shins upright drops the hips by this much.
  const drop = SKELETON.thigh * (1 - Math.cos(radians(knee)));
  const body: Pose3 = {
    pelvis: [-FOLD.hipsBack * t, STANDING.pelvis[1] - drop, 0],
    lean: FOLD.lean * t,
    spine: { flex: FOLD.spine * t },
    neck: { flex: FOLD.neck * t },
    pins: FOLD_FEET,
  };
  const elbow = mix(8, 4, t);
  const arm = (flex: number): ArmPose => ({ flex, abduct: 5, elbow });
  // Raising the arm forward swings the hand ahead of the shoulder; hanging, it's right below it.
  const ahead = (flex: number) => {
    const [shoulder, , wrist] = solvePose({ ...body, rightArm: arm(flex) }).rightArm;
    return wrist[0] - shoulder[0];
  };
  let [back, forward] = [-40, 160];
  for (let i = 0; i < 40; i++) {
    const flex = (back + forward) / 2;
    if (ahead(flex) > 0) forward = flex;
    else back = flex;
  }
  const hang = arm((back + forward) / 2);
  return { ...body, rightArm: hang, leftArm: hang };
};
const FOLD_UP = forwardFoldAt(0);
const FOLD_DOWN = forwardFoldAt(1);
const FOLD_STEPS = 16;

export const STANDING_FORWARD_FOLD_3D: Clip3D = {
  view: '3d',
  camera: { yaw: 24, pitch: 10 },
  highlight: ['rightLeg', 'leftLeg'],
  // The far arm hangs beside its leg standing, and ahead of the shins folded, never across it, so it
  // stays behind it rather than swapping places as it swings forward.
  behind: [['leftArm', 'leftLeg']],
  stillFrame: 1 + FOLD_STEPS,
  keyframes: [
    { ms: 0, pose: FOLD_UP },
    { ms: 500, pose: FOLD_UP },
    ...alongArc(2200, FOLD_STEPS, forwardFoldAt),
    { ms: 3500, pose: FOLD_DOWN },
    ...alongArc(2200, FOLD_STEPS, (t) => forwardFoldAt(1 - t)),
  ],
};

// --- Kneeling wrist stretch: on all fours with the fingers turned back toward the knees, the hips shift back with the arms straight ---

/** The knees stay planted under where the hips start, as on all fours. */
const WRIST_KNEE_X = ALL_FOURS.pelvis[0];
/** The hands stay planted under the shoulders, the palms flat and the fingers pointing back at the knees. */
const WRIST_HANDS = ALL_FOURS.pins.rightHand.at;
/** How far the thighs tip back from upright over the knees by the end: the hips most of the way back toward the heels. */
const WRIST_THIGH_BACK = 46;

/**
 * The body with the hips this far back (0 over the knees, 1 as far as they go), swinging around the
 * knees, and tipped as far forward as keeps the arms straight, so the shoulders move back behind
 * the hands and the wrists bend further.
 */
const wristStretchAt = (t: number): Pose3 => {
  const thigh = radians(90 + WRIST_THIGH_BACK * t);
  const pelvis: Vec3 = [WRIST_KNEE_X + SKELETON.thigh * Math.cos(thigh), ANKLE_Y + SKELETON.thigh * Math.sin(thigh), 0];
  const leg = (side: 1 | -1): Pin =>
    pinVia([pelvis[0], pelvis[1], side * SKELETON.hip], [WRIST_KNEE_X, ANKLE_Y, side * SKELETON.hip], [WRIST_KNEE_X - SKELETON.shin, ANKLE_Y, side * SKELETON.hip], [-1, 0, 0]);
  const hand = (side: 1 | -1): Pin => ({ at: [WRIST_HANDS[0], WRIST_HANDS[1], side * WRIST_HANDS[2]], toward: [-1, 0, 0], pole: [-1, 0, side * 0.3] });
  const body = (lean: number): Pose3 => ({
    pelvis,
    lean,
    neck: { flex: 12 },
    pins: { rightFoot: leg(1), leftFoot: leg(-1), rightHand: hand(1), leftHand: hand(-1) },
  });
  const gap = (lean: number) => distance(solvePose(body(lean)).rightArm[0], [WRIST_HANDS[0], WRIST_HANDS[1], WRIST_HANDS[2]]);
  // Tipping forward brings the shoulders toward the hands until they're right over them.
  let nearest = 0;
  for (let tip = 0; tip <= 150; tip += 2) if (gap(tip) < gap(nearest)) nearest = tip;
  let [upright, tipped] = [0, nearest];
  const reach = 0.998 * ARM_REACH;
  for (let i = 0; i < 40; i++) {
    const tip = (upright + tipped) / 2;
    if (gap(tip) > reach) upright = tip;
    else tipped = tip;
  }
  return body((upright + tipped) / 2);
};
const WRIST_FORWARD = wristStretchAt(0);
const WRIST_BACK = wristStretchAt(1);
const WRIST_STEPS = 12;

export const KNEELING_WRIST_STRETCH_3D: Clip3D = {
  view: '3d',
  // As for cat cow: the hips' shift back is flat on the screen, and the fingers point back along it.
  camera: { yaw: 22, pitch: 16 },
  highlight: ['rightArm', 'leftArm'],
  stillFrame: 1 + WRIST_STEPS,
  keyframes: [
    { ms: 0, pose: WRIST_FORWARD },
    { ms: 600, pose: WRIST_FORWARD },
    ...alongArc(1800, WRIST_STEPS, wristStretchAt),
    { ms: 3000, pose: WRIST_BACK },
    ...alongArc(1800, WRIST_STEPS, (t) => wristStretchAt(1 - t)),
  ],
};

// --- Floor angels: lying on the back with the knees bent, the arms slide along the floor from a goalpost shape to overhead ---

/** The knees point at the ceiling with the feet flat, hip-width apart. */
const ANGEL_KNEE = { x: 64, y: 99 };
const ANGEL_ANKLE_X = ANGEL_KNEE.x + Math.sqrt(SKELETON.shin ** 2 - (ANGEL_KNEE.y - ANKLE_Y) ** 2);
const ANGEL_LEGS = ((): Pose3['pins'] => {
  const foot = (side: 1 | -1): Pin =>
    pinVia(
      [LYING_ON_BACK.pelvis[0], LYING_ON_BACK.pelvis[1], side * SKELETON.hip],
      [ANGEL_KNEE.x, ANGEL_KNEE.y, side * SKELETON.hip],
      [ANGEL_ANKLE_X, ANKLE_Y, side * SKELETON.hip],
      [1, 0, 0]
    );
  return { rightFoot: foot(1), leftFoot: foot(-1) };
})();
const ANGEL_SHOULDER = solvePose({ ...LYING_ON_BACK, pins: ANGEL_LEGS }).rightArm[0];

/**
 * The arms with the upper arm this far round from the side of the body (90 straight out, 180 along
 * past the head) and the elbow bent this far toward the head, the whole arm flat on the floor at
 * the shoulders' height, the backs of the hands down.
 */
const angelArms = (out: number, elbow: number): NonNullable<Pose3['pins']> => {
  const hand = (side: 1 | -1): Pin => {
    const shoulder: Vec3 = [ANGEL_SHOULDER[0], ANGEL_SHOULDER[1], side * ANGEL_SHOULDER[2]];
    // Toward the feet is +x; the head is -x.
    const upper: Vec3 = [Math.cos(radians(out)), 0, side * Math.sin(radians(out))];
    const fore: Vec3 = [Math.cos(radians(out + elbow)), 0, side * Math.sin(radians(out + elbow))];
    const at = (from: Vec3, along: Vec3, length: number): Vec3 => [from[0] + length * along[0], from[1], from[2] + length * along[2]];
    // A hair short of the bones' length, so the elbow is solved onto the floor and not past it.
    const elbowAt = at(shoulder, upper, 0.999 * SKELETON.upperArm);
    return pinVia(shoulder, elbowAt, at(elbowAt, fore, 0.999 * SKELETON.forearm), fore);
  };
  return { rightHand: hand(1), leftHand: hand(-1) };
};

/** From the goalpost (0) to overhead (1): the upper arms sweep round past the head as the elbows open. */
const angelAt = (t: number): Pose3 => ({ ...LYING_ON_BACK, pins: { ...ANGEL_LEGS, ...angelArms(mix(90, 152, t), mix(90, 22, t)) } });
const ANGEL_GOALPOST = angelAt(0);
const ANGEL_OVERHEAD = angelAt(1);
const ANGEL_STEPS = 12;

export const FLOOR_ANGELS_3D: Clip3D = {
  view: '3d',
  // From above and to the right, so the sweep along the floor shows nearly flat on.
  camera: { yaw: 0, pitch: 62 },
  highlight: ['rightArm', 'leftArm'],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: ANGEL_GOALPOST },
    ...alongArc(2000, ANGEL_STEPS, angelAt),
    { ms: 400, pose: ANGEL_OVERHEAD },
    ...alongArc(2000, ANGEL_STEPS, (t) => angelAt(1 - t)),
    { ms: 400, pose: ANGEL_GOALPOST },
  ],
};

// --- Reverse tabletop: sitting with the knees bent and the hands behind, fingers forward, the hips press up until the body is a table ---

/** The feet stay planted flat, hip-width apart, a shin's length under where the knees are at the top. */
const TABLE_FEET_X = SKELETON.thigh;
/**
 * The hands stay planted behind, shoulder-width apart, fingers pointing forward at the feet: far
 * enough back that the arms lean back a little from upright at the top, as they do.
 */
const TABLE_HANDS: Vec3 = [-150, WRIST_Y, SKELETON.shoulder];
/**
 * Where the pelvis is sitting (0) and at the top (1). At the top the thighs are level and the shins
 * upright under the knees. The arms are longer than the shins, so with them straight the shoulders
 * sit a little higher than the hips.
 */
const TABLE_PELVIS = { sitting: [-30, SIT_PELVIS_Y, 0] as Vec3, up: [0, ANKLE_Y + SKELETON.shin, 0] as Vec3 };
/** The chin tucked a little sitting, and the head in line with the spine at the top: tipped back, it hangs off the shoulders. */
const TABLE_NECK = { sitting: 10, up: 0 };

/**
 * Reverse tabletop this far up. The hips rise along a gentle arc, forward over the feet, and the
 * body tips back as far as keeps the arms straight to the planted hands.
 */
const tabletopAt = (t: number): Pose3 => {
  const [from, to] = [TABLE_PELVIS.sitting, TABLE_PELVIS.up];
  // The hips come up before they come forward, as they press off the floor.
  const pelvis: Vec3 = [mix(from[0], to[0], smooth(t)), mix(from[1], to[1], Math.sin((Math.PI / 2) * t)), 0];
  const foot = (side: 1 | -1): Pin => ({ at: [TABLE_FEET_X, ANKLE_Y, side * SKELETON.hip], toward: [1, 0, 0], pole: [1, 1, 0] });
  const hand = (side: 1 | -1): Pin => ({ at: [TABLE_HANDS[0], TABLE_HANDS[1], side * TABLE_HANDS[2]], toward: [1, 0, 0], pole: [-1, 0, side * 0.2] });
  const body = (lean: number): Pose3 => ({
    pelvis,
    lean,
    neck: { flex: mix(TABLE_NECK.sitting, TABLE_NECK.up, smooth(t)) },
    pins: { rightFoot: foot(1), leftFoot: foot(-1), rightHand: hand(1), leftHand: hand(-1) },
  });
  const gap = (lean: number) => distance(solvePose(body(lean)).rightArm[0], TABLE_HANDS);
  // Tipping back brings the shoulders toward the hands, so the lean that reaches is found on the way there.
  const reach = ARM_REACH;
  let nearest = 0;
  for (let tip = 0; tip >= -120; tip -= 2) if (gap(tip) < gap(nearest)) nearest = tip;
  let [upright, back] = [0, nearest];
  for (let i = 0; i < 40; i++) {
    const tip = (upright + back) / 2;
    if (gap(tip) > reach) upright = tip;
    else back = tip;
  }
  return body((upright + back) / 2);
};
const TABLE_SITTING = tabletopAt(0);
const TABLE_UP = tabletopAt(1);
const TABLE_STEPS = 16;

export const REVERSE_TABLETOP_3D: Clip3D = {
  view: '3d',
  // From the side, a little in front and above: the hips' rise is flat on the screen, and the
  // near arm and leg are in front of the body.
  camera: { yaw: 16, pitch: 10 },
  highlight: ['torso'],
  stillFrame: 1 + TABLE_STEPS,
  keyframes: [
    { ms: 0, pose: TABLE_SITTING },
    { ms: 600, pose: TABLE_SITTING },
    ...alongArc(1800, TABLE_STEPS, tabletopAt),
    { ms: 3000, pose: TABLE_UP },
    ...alongArc(1800, TABLE_STEPS, (t) => tabletopAt(1 - t)),
  ],
};

// --- Knight stretch: half kneeling with both knees at 90°, the pelvis tucks under and the hips shift forward over the planted back knee ---

/**
 * Half kneeling as in ankle mobilization, but with the back knee a thigh's length behind the front
 * foot, so that upright (0) both knees are at 90°, the hips straight over the back knee. As the
 * front shin tips forward, the hips travel forward and a little down and the back thigh swings back
 * behind them, opening the front of that hip. The pelvis tucks under as it goes: the whole body tips
 * back from the pelvis and the spine rounds back up by as much, so the chest stays upright.
 */
const KNIGHT_BACK_KNEE: Vec3 = [-SKELETON.thigh, ANKLE_Y, -SKELETON.hip];
const knightAt = (t: number): Pose3 => {
  const pose = ankleMobilizationAt(mix(0, 30, t), 0, KNIGHT_BACK_KNEE);
  const tuck = 7 * t;
  return { ...pose, lean: -tuck, spine: { flex: tuck }, neck: { flex: 0 } };
};
const KNIGHT_UPRIGHT = knightAt(0);
const KNIGHT_FORWARD = knightAt(1);
const KNIGHT_STEPS = 10;

export const KNIGHT_STRETCH_3D: Clip3D = {
  view: '3d',
  // From the back leg's side, a little in front and above: the stretch is in the front of that hip,
  // so its thigh swinging back is nearest and flat on the screen, and the front leg shows beyond.
  camera: { yaw: 162, pitch: 12 },
  highlight: ['leftLeg'],
  stillFrame: 1 + KNIGHT_STEPS,
  keyframes: [
    { ms: 0, pose: KNIGHT_UPRIGHT },
    { ms: 500, pose: KNIGHT_UPRIGHT },
    ...alongArc(1800, KNIGHT_STEPS, knightAt),
    { ms: 3500, pose: KNIGHT_FORWARD },
    ...alongArc(1600, KNIGHT_STEPS, (t) => knightAt(1 - t)),
  ],
};

// --- Horse stance: from the front, feet wide with the toes a little out, sinking until the thighs are level and holding ---

/** The ankles sit this far either side of the middle: about twice shoulder-width apart. */
const HORSE_ANKLE_Z = 88;
const HORSE_TOES_OUT = 15;
/**
 * At the bottom the knees are over the toes, pushed out along the way the feet point, and the
 * thighs are level (`thigh: 90`).
 */
const HORSE_DOWN_LEGS: SquatLegs = {
  forward: 24 * Math.cos(radians(HORSE_TOES_OUT)),
  out: 24 * Math.sin(radians(HORSE_TOES_OUT)) + 6,
  thigh: 90,
};

/**
 * This far down into the stance, from 0, standing, to 1. The chest stays up, the body leaning
 * forward only as far as keeps it over the feet. The hands rest on top of the upper thighs, elbows
 * out to the sides; standing, the thighs are out of reach, so the straight arms hang toward them
 * and the hands settle on them on the way down.
 */
const HORSE_HAND_ALONG = 0.5;
/** How far above the middle of the thigh the palm rests, on its top. */
const HORSE_HAND_ON_TOP = 13;
const horseStanceAt = (t: number): Pose3 => {
  const { pelvis, pins } = squatStance(HORSE_TOES_OUT, mixLegs(squatStraight(0, HORSE_ANKLE_Z), HORSE_DOWN_LEGS, t), HORSE_ANKLE_Z);
  const lean = 14 * t;
  const body: Pose3 = { pelvis, lean, neck: { flex: -lean }, pins };
  const skeleton = solvePose(body);
  const hand = (side: 1 | -1): Pin => {
    const [hip, knee] = side === 1 ? skeleton.rightLeg : skeleton.leftLeg;
    const shoulder = side === 1 ? skeleton.rightArm[0] : skeleton.leftArm[0];
    const onThigh = mix3(hip, knee, HORSE_HAND_ALONG);
    const target: Vec3 = [onThigh[0], onThigh[1] + HORSE_HAND_ON_TOP, onThigh[2]];
    const at = distance(shoulder, target) > ARM_REACH ? toward(shoulder, target, ARM_REACH) : target;
    // The fingers point down the thigh toward the knee.
    return { at, toward: [knee[0] - hip[0], knee[1] - hip[1] - 20, knee[2] - hip[2]], pole: [-0.3, 0, side] };
  };
  return { ...body, pins: { ...pins, rightHand: hand(1), leftHand: hand(-1) } };
};
const HORSE_UP = horseStanceAt(0);
const HORSE_DOWN = horseStanceAt(1);
const HORSE_STEPS = 10;

export const HORSE_STANCE_3D: Clip3D = {
  view: '3d',
  // From straight in front and a little above, where the knees push out across the screen and the
  // level thighs come toward the camera.
  camera: { yaw: 90, pitch: 12 },
  highlight: ['rightLeg', 'leftLeg'],
  // The thighs come off the front of the hips toward the camera, so they stay over them.
  over: ['rightLeg', 'leftLeg'],
  // The hands rest on top of the thighs, so the arms are over the legs.
  behind: [
    ['rightLeg', 'rightArm'],
    ['leftLeg', 'leftArm'],
  ],
  stillFrame: 1 + HORSE_STEPS,
  keyframes: [
    { ms: 0, pose: HORSE_UP },
    { ms: 500, pose: HORSE_UP },
    ...alongArc(1800, HORSE_STEPS, horseStanceAt),
    { ms: 4000, pose: HORSE_DOWN },
    ...alongArc(1600, HORSE_STEPS, (t) => horseStanceAt(1 - t)),
  ],
};

// --- Lying windshield wiper hold: lying on the back, knees bent and feet planted wide, both knees fall to one side and stay there ---

/** The feet planted flat a little wider than the hips, a shin's reach down from the knees. */
const WIPER_ANKLE: Vec3 = [ANGEL_ANKLE_X, ANKLE_Y, 30];
/** How far round the knees fall from pointing at the ceiling. */
const WIPER_DROP = 62;

/**
 * Both knees turned this far round from upright, toward the figure's right for a positive number.
 * The feet stay planted where they are, so each knee swings on a circle around the line from its
 * hip to its ankle and the thighs and shins keep their length: the right thigh turns out and the
 * left one in. The arms lie straight out to the sides on the floor.
 */
const wiperAt = (drop: number): Pose3 => {
  const body: Pose3 = { ...LYING_ON_BACK, pins: angelArms(80, 0) };
  const skeleton = solvePose({ ...body, pins: { ...body.pins, ...ANGEL_LEGS } });
  const foot = (side: 1 | -1): Pin => {
    const hip = side === 1 ? skeleton.rightLeg[0] : skeleton.leftLeg[0];
    const ankle: Vec3 = [WIPER_ANKLE[0], WIPER_ANKLE[1], side * WIPER_ANKLE[2]];
    const axis = toward([0, 0, 0], [ankle[0] - hip[0], ankle[1] - hip[1], ankle[2] - hip[2]], 1);
    const gap = distance(hip, ankle);
    const middle = mix3(hip, ankle, 0.5);
    const radius = Math.sqrt(SKELETON.thigh ** 2 - (gap / 2) ** 2) * 0.999;
    // Straight up, square to the axis, and the way round toward the figure's right from there.
    const lift = axis[1];
    const up = toward([0, 0, 0], [-lift * axis[0], 1 - lift * axis[1], -lift * axis[2]], 1);
    let across: Vec3 = [axis[1] * up[2] - axis[2] * up[1], axis[2] * up[0] - axis[0] * up[2], axis[0] * up[1] - axis[1] * up[0]];
    if (across[2] < 0) across = [-across[0], -across[1], -across[2]];
    const r = radians(drop);
    const knee: Vec3 = [
      middle[0] + radius * (up[0] * Math.cos(r) + across[0] * Math.sin(r)),
      middle[1] + radius * (up[1] * Math.cos(r) + across[1] * Math.sin(r)),
      middle[2] + radius * (up[2] * Math.cos(r) + across[2] * Math.sin(r)),
    ];
    return pinVia(hip, knee, ankle, [1, 0, 0]);
  };
  return { ...body, pins: { ...body.pins, rightFoot: foot(1), leftFoot: foot(-1) } };
};
const WIPER_UP = wiperAt(0);
const WIPER_LEFT = wiperAt(-WIPER_DROP);
const WIPER_STEPS = 10;

export const LYING_WINDSHIELD_WIPER_HOLD_3D: Clip3D = {
  view: '3d',
  // From the right, toward the feet and above: the bent knees show from the side, and they fall
  // to the left, away from the camera, where the two legs lie one beyond the other rather than
  // over each other. Straight from the feet, the legs are end-on and read as straight. It's a
  // passive stretch, so one side is shown, held; the exercise says to switch.
  camera: { yaw: 40, pitch: 42 },
  highlight: ['rightLeg', 'leftLeg'],
  // The thighs rise off the front of the hips toward the camera above, so they stay over them. The
  // far one's top otherwise went under the hips partway into the fall.
  over: ['rightLeg', 'leftLeg'],
  stillFrame: 1 + WIPER_STEPS,
  keyframes: [
    { ms: 0, pose: WIPER_UP },
    { ms: 600, pose: WIPER_UP },
    ...alongArc(2000, WIPER_STEPS, (t) => wiperAt(-WIPER_DROP * t)),
    { ms: 3500, pose: WIPER_LEFT },
    ...alongArc(1800, WIPER_STEPS, (t) => wiperAt(-WIPER_DROP * (1 - t))),
  ],
};

// --- Frog stretch and frog rocks: knees wide with the shins parallel behind them and the feet turned out, on the forearms, the hips sinking back ---

/** The knees rest on the floor this far either side of the middle, level with the pelvis's start. */
const FROG_KNEE_Z = 72;
/**
 * Where the pelvis is, this far forward of the knees. The knees stay planted, so the hips move on
 * a thigh's length from them: highest straight over the knees' line, lower forward or back of it.
 */
const frogPelvis = (forward: number): Vec3 => [
  forward,
  ANKLE_Y + Math.sqrt(SKELETON.thigh ** 2 - (FROG_KNEE_Z - SKELETON.hip) ** 2 - forward ** 2),
  0,
];
/** The spine is straight here, so the shoulders sit a torso's length from the pelvis. */
const FROG_TORSO = distance(solvePose({ pelvis: [0, 100, 0], lean: 90 }).rightArm[0], [0, 100, SKELETON.shoulder]);
/**
 * The pelvis and the lean of the body that put the right shoulder at `shoulder` (its height and how
 * far forward), with the hips on their way round the knees.
 */
const frogBodyAt = (shoulder: readonly [number, number]): { pelvis: Vec3; lean: number } => {
  const gap = (forward: number) => {
    const pelvis = frogPelvis(forward);
    return Math.hypot(shoulder[0] - pelvis[0], shoulder[1] - pelvis[1]);
  };
  // The nearer the hips come forward, the nearer they are to the shoulders.
  let [back, front] = [-80, Math.min(80, shoulder[0])];
  for (let i = 0; i < 40; i++) {
    const forward = (back + front) / 2;
    if (gap(forward) > FROG_TORSO) back = forward;
    else front = forward;
  }
  const pelvis = frogPelvis((back + front) / 2);
  return { pelvis, lean: (Math.atan2(shoulder[0] - pelvis[0], shoulder[1] - pelvis[1]) * 180) / Math.PI };
};

/**
 * On the forearms with the hips over the knees' line: the elbows on the floor straight under the
 * shoulders and the forearms flat ahead, the hands planted where they'll stay.
 */
const FROG_ELBOW = (() => {
  const shoulderY = WRIST_Y + 0.999 * SKELETON.upperArm;
  const pelvis = frogPelvis(0);
  return [pelvis[0] + Math.sqrt(FROG_TORSO ** 2 - (shoulderY - pelvis[1]) ** 2), WRIST_Y] as const;
})();
const FROG_WRIST = [FROG_ELBOW[0] + 0.999 * SKELETON.forearm, WRIST_Y] as const;

/** Where the knees and feet stay: the shins lying flat and parallel straight back, the feet turned out to the sides. */
const frogLegs = (pelvis: Vec3): NonNullable<Pose3['pins']> => {
  const foot = (side: 1 | -1): Pin =>
    pinVia([pelvis[0], pelvis[1], side * SKELETON.hip], [0, ANKLE_Y, side * FROG_KNEE_Z], [-0.999 * SKELETON.shin, ANKLE_Y, side * FROG_KNEE_Z], [0, 0, side]);
  return { rightFoot: foot(1), leftFoot: foot(-1) };
};

/**
 * The whole frog with the right shoulder at `shoulder`, the hands on the floor at `FROG_WRIST`. The
 * elbow is where the upper arm and forearm meet below the line from shoulder to wrist, bending back
 * toward the knees, so it comes down onto the floor as the body lowers.
 */
const frogAt = (shoulder: readonly [number, number]): Pose3 => {
  const { pelvis, lean } = frogBodyAt(shoulder);
  const [sx, sy] = shoulder;
  const [wx, wy] = FROG_WRIST;
  const reach = Math.hypot(wx - sx, wy - sy);
  const half = Math.sqrt(Math.max(0, SKELETON.upperArm ** 2 - (reach / 2) ** 2));
  // Of the two places the bones meet, the lower one, toward the knees.
  const across = [-(wy - sy) / reach, (wx - sx) / reach];
  const side = across[1] > 0 ? -1 : 1;
  const elbow2 = [(sx + wx) / 2 + side * half * across[0], (sy + wy) / 2 + side * half * across[1]];
  const hand = (side: 1 | -1): Pin =>
    pinVia([sx, sy, side * SKELETON.shoulder], [elbow2[0], elbow2[1], side * SKELETON.shoulder], [wx, wy, side * SKELETON.shoulder], [1, 0, 0]);
  return {
    pelvis,
    lean,
    neck: { flex: 8 },
    pins: { ...frogLegs(pelvis), rightHand: hand(1), leftHand: hand(-1) },
  };
};

/** Resting on the forearms with the upper arms tipped this far forward of upright (negative: the shoulders behind the elbows, the hips back). */
const frogOnForearms = (tip: number): Pose3 =>
  frogAt([FROG_ELBOW[0] + 0.999 * SKELETON.upperArm * Math.sin(radians(tip)), FROG_ELBOW[1] + 0.999 * SKELETON.upperArm * Math.cos(radians(tip))]);

/**
 * From the right, a little in front and above: the hips sinking back is flat on the screen, and the
 * far knee shows out wide beyond the near one. From behind, the head went under the arms, and
 * from higher the legs lying flat hid the bend at the knees.
 */
const FROG_CAMERA = { yaw: 15, pitch: 22 };

/** The upper arms tipped forward with the hips forward of the knees, and back with the hips sunk behind them. */
const FROG_ROCK = { forward: 22, back: -32 };
const frogRock = (t: number): Pose3 => frogOnForearms(mix(FROG_ROCK.forward, FROG_ROCK.back, t));
const FROG_ROCK_STEPS = 12;

export const FROG_ROCKS_3D: Clip3D = {
  view: '3d',
  camera: FROG_CAMERA,
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: FROG_ROCK_STEPS,
  keyframes: [
    { ms: 0, pose: frogRock(0) },
    ...alongArc(1500, FROG_ROCK_STEPS, frogRock),
    { ms: 300, pose: frogRock(1) },
    ...alongArc(1500, FROG_ROCK_STEPS, (t) => frogRock(1 - t)),
    { ms: 300, pose: frogRock(0) },
  ],
};

/**
 * The frog stretch is frog rocks held: from the hips forward of the knees, they sink back as far
 * as the rocks go, behind the knees and low toward the floor, the upper arms reaching forward to the
 * elbows, and stay there.
 */
const FROG_DEPTH = FROG_ROCK.back;
const FROG_SETTLED = frogOnForearms(FROG_DEPTH);
const frogSink = (t: number): Pose3 => frogOnForearms(mix(FROG_ROCK.forward, FROG_DEPTH, t));
const FROG_SINK_STEPS = 10;

export const FROG_STRETCH_3D: Clip3D = {
  view: '3d',
  camera: FROG_CAMERA,
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 1 + FROG_SINK_STEPS,
  keyframes: [
    { ms: 0, pose: frogSink(0) },
    { ms: 500, pose: frogSink(0) },
    ...alongArc(1800, FROG_SINK_STEPS, frogSink),
    { ms: 3000, pose: FROG_SETTLED },
    ...alongArc(1600, FROG_SINK_STEPS, (t) => frogSink(1 - t)),
  ],
};

/**
 * The hands on the waist, as in ankle mobilization and the knight stretch, for a body with its pelvis
 * at `pelvis` leaning this far forward: the hand, its fingers and the elbow all tip with the body.
 * Upright (0) it's where the knight stretch puts them.
 */
const handOnWaist = (pelvis: Vec3, side: 1 | -1, lean = 0): Pin => {
  // The body's own forward and up, tipped forward by the lean.
  const r = radians(lean);
  const forward = [Math.cos(r), -Math.sin(r)];
  const up = [Math.sin(r), Math.cos(r)];
  const inBody = (ahead: number, above: number, out: number): Vec3 => [ahead * forward[0] + above * up[0], ahead * forward[1] + above * up[1], out];
  const at = inBody(4, 49, side * 30);
  return {
    at: [pelvis[0] + at[0], pelvis[1] + at[1], at[2]],
    toward: inBody(1, -0.5, 0),
    pole: inBody(-1, 0, side),
  };
};
/**
 * A direction partway round from `from` to `to`, turning at an even rate through the angle between
 * them. Blending two far-apart directions in a straight line turns slowly at first and then all at
 * once, which spins a hand or an elbow.
 */
const turnToward = (from: Vec3, to: Vec3, t: number): Vec3 => {
  const a = toward([0, 0, 0], from, 1);
  const b = toward([0, 0, 0], to, 1);
  const cos = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const angle = Math.acos(cos);
  if (angle < 1e-4) return b;
  const [wa, wb] = [Math.sin((1 - t) * angle) / Math.sin(angle), Math.sin(t * angle) / Math.sin(angle)];
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
};
/** Partway from one hand pin to another, the direction of the hand and the elbow turning with it. */
const mixPin = (a: Pin, b: Pin, t: number): Pin => ({
  at: mix3(a.at, b.at, t),
  toward: a.toward && b.toward ? mix3(a.toward, b.toward, t) : b.toward,
  pole: a.pole && b.pole ? mix3(a.pole, b.pole, t) : b.pole,
});
/** The right (1) or left (-1) shoulder of a solved pose. */
const shoulderOf = (skeleton: ReturnType<typeof solvePose>, side: 1 | -1): Vec3 => (side === 1 ? skeleton.rightArm[0] : skeleton.leftArm[0]);
/** `at`, or as near it as an arm reaches from `shoulder`: for hands on their way between two places, which can cut the corner past the arm's length. */
const withinReach = (shoulder: Vec3, at: Vec3, reach = ARM_REACH): Vec3 => (distance(shoulder, at) > reach ? toward(shoulder, at, reach) : at);

// --- Knight to hamstring: from the knight stretch, the hips sink back past the back knee and the front leg straightens, folding over it with a flat back ---

/**
 * The knight stretch with the front knee pointed up and forward, which is where it goes anyway: the
 * front leg straightens out ahead in the hamstring half, where a knee left to point forward would
 * have no bend to aim.
 */
const KNEE_UP_FORWARD: Vec3 = [1, 1, 0];
const knightKneeUp = (t: number): Pose3 => {
  const pose = knightAt(t);
  return { ...pose, pins: { ...pose.pins, rightFoot: { ...pose.pins!.rightFoot!, pole: KNEE_UP_FORWARD } } };
};
/**
 * All the way back: the hips this far round behind straight over the back knee, which stays planted,
 * so the back knee bends to about 145°. The front leg is straight with its heel planted and the toes
 * pulled up; from the knight's 90° it's too short to reach the foot, so the heel slides forward a
 * little as the leg straightens, as it does when you do it. The body folds over the front leg from
 * the hips with the back flat.
 */
const HAMSTRING_BACK = 35;
const HAMSTRING_FOLD = { lean: 58, spine: 4, neck: 6 };
/** The front ankle bends up this far, heel down. */
const HAMSTRING_TOES_UP = 35;

/** The hips and the front foot this far back into the hamstring half, from the knight's upright 0. */
const hamstringBody = (t: number): Pose3 => {
  const back = radians(HAMSTRING_BACK * t);
  const pelvis: Vec3 = [KNIGHT_BACK_KNEE[0] - SKELETON.thigh * Math.sin(back), KNIGHT_BACK_KNEE[1] + SKELETON.thigh * Math.cos(back), 0];
  // From the knight's 90° bend the front leg lengthens to straight, its heel sliding forward as far as that takes it.
  const reach = mix(Math.SQRT2 * SKELETON.thigh, 0.995 * LEG_REACH, t);
  const ankle: Vec3 = [pelvis[0] + Math.sqrt(reach ** 2 - (pelvis[1] - ANKLE_Y) ** 2), ANKLE_Y, SKELETON.hip];
  const up = radians(HAMSTRING_TOES_UP * t);
  return {
    pelvis,
    lean: HAMSTRING_FOLD.lean * t,
    spine: { flex: HAMSTRING_FOLD.spine * t },
    neck: { flex: HAMSTRING_FOLD.neck * t },
    pins: {
      rightFoot: { at: ankle, toward: [Math.cos(up), Math.sin(up), 0], pole: KNEE_UP_FORWARD },
      leftFoot: { at: [KNIGHT_BACK_KNEE[0] - SKELETON.shin, ANKLE_Y, KNIGHT_BACK_KNEE[2]], toward: [-1, 0, 0], pole: [1, -1, 0] },
    },
  };
};
/** The hands stay on the waist the whole way, as in the knight stretch, tipping forward with the body as it folds. */
const hamstringAt = (t: number): Pose3 => {
  const body = hamstringBody(t);
  return { ...body, pins: { ...body.pins, rightHand: handOnWaist(body.pelvis, 1, body.lean), leftHand: handOnWaist(body.pelvis, -1, body.lean) } };
};
const KNIGHT_TO_HAMSTRING_FOLDED = hamstringAt(1);
const KNIGHT_TO_HAMSTRING_STEPS = 12;

export const KNIGHT_TO_HAMSTRING_3D: Clip3D = {
  view: '3d',
  // From the front leg's side, a little in front and above: the front leg straightening and the
  // fold over it are flat on the screen, with the back knee planted beyond.
  camera: { yaw: 18, pitch: 12 },
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 1 + 3 * KNIGHT_TO_HAMSTRING_STEPS,
  // The knight stretch, back through kneeling upright into the hamstring fold, and back again, without holding.
  keyframes: [
    { ms: 0, pose: KNIGHT_UPRIGHT },
    ...alongArc(1300, KNIGHT_TO_HAMSTRING_STEPS, knightKneeUp),
    { ms: 400, pose: knightKneeUp(1) },
    ...alongArc(1300, KNIGHT_TO_HAMSTRING_STEPS, (t) => knightKneeUp(1 - t)),
    ...alongArc(1800, KNIGHT_TO_HAMSTRING_STEPS, hamstringAt),
    { ms: 600, pose: KNIGHT_TO_HAMSTRING_FOLDED },
    ...alongArc(1800, KNIGHT_TO_HAMSTRING_STEPS, (t) => hamstringAt(1 - t)),
  ],
};

// --- Couch stretch: back to a wall with the back shin up against it, the chest lifting from the hands on the floor to upright ---

/** The back knee rests on the floor close to the wall, and its shin goes straight up the wall with the top of the foot against it. */
const COUCH_KNEE: Vec3 = [-60, ANKLE_Y, -SKELETON.hip];
const COUCH_WALL_X = COUCH_KNEE[0] - 13;
/**
 * The back thigh leans this far forward of upright from the knee: well forward with the hands down,
 * and back to 35° upright, which bends the back knee to 145°, as far as the stretch goes.
 */
const COUCH_THIGH = { leaning: 55, upright: 35 };
const couchPelvis = (thigh: number): Vec3 => [
  COUCH_KNEE[0] + SKELETON.thigh * Math.sin(radians(thigh)),
  COUCH_KNEE[1] + SKELETON.thigh * Math.cos(radians(thigh)),
  0,
];
/**
 * The front foot is planted where upright puts its shin straight up. The hips sit low, below that
 * knee, so it bends a little past 90°.
 */
const COUCH_FRONT_ANKLE: Vec3 = (() => {
  const pelvis = couchPelvis(COUCH_THIGH.upright);
  const kneeY = ANKLE_Y + SKELETON.shin;
  return [pelvis[0] + Math.sqrt(SKELETON.thigh ** 2 - (kneeY - pelvis[1]) ** 2), ANKLE_Y, SKELETON.hip];
})();
/** Leaning on the hands the chest is well forward; upright the pelvis tucks under, squeezing the glute, and the spine comes back up by as much. */
const COUCH_LEAN = { leaning: 52, upright: -6 };

const couchBody = (t: number): Pose3 => {
  const pelvis = couchPelvis(mix(COUCH_THIGH.leaning, COUCH_THIGH.upright, t));
  const tuck = Math.max(0, -COUCH_LEAN.upright) * t;
  const back: Vec3 = [pelvis[0], pelvis[1], -SKELETON.hip];
  return {
    pelvis,
    lean: mix(COUCH_LEAN.leaning, COUCH_LEAN.upright, t),
    spine: { flex: tuck },
    neck: { flex: mix(10, 0, t) },
    pins: {
      rightFoot: { at: COUCH_FRONT_ANKLE, toward: [1, 0, 0], pole: KNEE_UP_FORWARD },
      leftFoot: pinVia(back, COUCH_KNEE, [COUCH_KNEE[0], COUCH_KNEE[1] + SKELETON.shin, COUCH_KNEE[2]], [0, 1, 0]),
    },
  };
};
const COUCH_LEANING_BODY = solvePose(couchBody(0));
/** Leaning in, the hands are flat on the floor either side of the front foot, fingers forward. */
const COUCH_FLOOR_HANDS: Record<'rightHand' | 'leftHand', Pin> = (() => {
  const floor = (shoulder: Vec3, z: number, side: 1 | -1): Pin => {
    // Reaching forward as far as leaves the arm a little bent.
    const reach = 0.96 * ARM_REACH;
    const x = shoulder[0] + Math.sqrt(Math.max(0, reach ** 2 - (shoulder[1] - WRIST_Y) ** 2 - (z - shoulder[2]) ** 2));
    return { at: [x, WRIST_Y, z], toward: [1, 0, 0], pole: [-1, 0, side * 0.4] };
  };
  return {
    rightHand: floor(COUCH_LEANING_BODY.rightArm[0], SKELETON.hip + 36, 1),
    leftHand: floor(COUCH_LEANING_BODY.leftArm[0], SKELETON.hip - 32, -1),
  };
})();
/**
 * The hands land on top of the front thigh just above the knee, either side of its middle line, the
 * fingers toward the knee, and slide back up it to the upper thigh as the body comes upright.
 */
const COUCH_HAND_ALONG = { lands: 0.8, upright: 0.45 };
const COUCH_HAND_ON_TOP = 12;
const COUCH_HAND_APART = 9;
/** A hand resting on top of the front thigh of `skeleton`, this far along it from the hip. */
const couchOnThigh = (skeleton: ReturnType<typeof solvePose>, along: number, side: 1 | -1): Pin => {
  const [hip, knee] = skeleton.rightLeg;
  const at = mix3(hip, knee, along);
  return {
    at: [at[0], at[1] + COUCH_HAND_ON_TOP, at[2] + side * COUCH_HAND_APART],
    toward: [knee[0] - hip[0], knee[1] - hip[1] - 20, knee[2] - hip[2]],
    // The elbows go out to the sides rather than back, where the near one would cross the shin on the wall.
    pole: [-0.3, 0, side],
  };
};
/**
 * How far up the hands push the body before they leave the floor: as far as the arms reach, a
 * little short of straight.
 */
const COUCH_PUSH_OFF = (() => {
  let t = 0;
  const tooFar = (at: number) => {
    const skeleton = solvePose(couchBody(at));
    return [1, -1].some((side) => {
      const name = side === 1 ? 'rightHand' : 'leftHand';
      return distance(shoulderOf(skeleton, side as 1 | -1), COUCH_FLOOR_HANDS[name].at) > 0.97 * ARM_REACH;
    });
  };
  while (t < 1 && !tooFar(t + 0.01)) t += 0.01;
  return t;
})();
/** How far up the body is when the hands land on the thigh, after which they slide back along it. */
const COUCH_HANDS_LAND = Math.min(0.75, COUCH_PUSH_OFF + 0.35);

/**
 * This far up from leaning in to upright. The hands push the body up off the floor, stay planted
 * until the arms run out of length, then lift and come up onto the front thigh above the knee:
 * rising first and moving in only once above it, so the inside hand comes over the thigh rather
 * than through it. From there they slide back up the thigh as the chest comes upright.
 */
const couchAt = (t: number): Pose3 => {
  const body = couchBody(t);
  const skeleton = solvePose(body);
  const hand = (side: 1 | -1, name: 'rightHand' | 'leftHand'): Pin => {
    const floor = COUCH_FLOOR_HANDS[name];
    if (t <= COUCH_PUSH_OFF) return floor;
    if (t >= COUCH_HANDS_LAND) {
      const slide = smooth((t - COUCH_HANDS_LAND) / (1 - COUCH_HANDS_LAND));
      return couchOnThigh(skeleton, mix(COUCH_HAND_ALONG.lands, COUCH_HAND_ALONG.upright, slide), side);
    }
    const s = (t - COUCH_PUSH_OFF) / (COUCH_HANDS_LAND - COUCH_PUSH_OFF);
    const thigh = couchOnThigh(skeleton, COUCH_HAND_ALONG.lands, side);
    const pin = mixPin(floor, thigh, smooth(s));
    // Straight back and up toward the knee, a little above the thigh's top on the way so it comes
    // down onto it; the inside hand moves in over it only in the second half.
    const over = smooth(Math.max(0, (s - 0.4) / 0.6));
    const at: Vec3 = [pin.at[0], pin.at[1] + 10 * Math.sin(Math.PI * s), mix(floor.at[2], thigh.at[2], over)];
    return { ...pin, at: withinReach(shoulderOf(skeleton, side), at, 0.98 * ARM_REACH) };
  };
  return { ...body, pins: { ...body.pins, rightHand: hand(1, 'rightHand'), leftHand: hand(-1, 'leftHand') } };
};
const COUCH_LEANING = couchAt(0);
const COUCH_UPRIGHT = couchAt(1);
const COUCH_STEPS = 12;

export const COUCH_STRETCH_3D: Clip3D = {
  view: '3d',
  // From the back leg's side, a little in front and above, as for the knight stretch: the stretch
  // is in the front of that thigh, nearest and flat on the screen, and the camera looks past the
  // figure at the face of the wall the shin rests on.
  camera: { yaw: 162, pitch: 12 },
  highlight: ['leftLeg'],
  scenery: [{ from: [COUCH_WALL_X - 24, 0, -110], to: [COUCH_WALL_X, 340, 110] }],
  stillFrame: 1 + COUCH_STEPS,
  keyframes: [
    { ms: 0, pose: COUCH_LEANING },
    { ms: 600, pose: COUCH_LEANING },
    ...alongArc(2000, COUCH_STEPS, couchAt),
    { ms: 3500, pose: COUCH_UPRIGHT },
    ...alongArc(1800, COUCH_STEPS, (t) => couchAt(1 - t)),
  ],
};

// --- Pyramid stretch: one foot a long step ahead of the other, hips square and both legs straight, hinging forward over the front leg ---

/** Each ankle is this far ahead of or behind the hips: a long step, the feet just under a leg's length apart. */
const PYRAMID_STEP = 92;
/** The back foot turns out this far, as it does to keep the hips square. */
const PYRAMID_BACK_TOES_OUT = 40;
/** Both legs straight, a hair short of locked, so the hips sit this high and stay there. */
const PYRAMID_PELVIS: Vec3 = [0, ANKLE_Y + Math.sqrt((0.995 * LEG_REACH) ** 2 - PYRAMID_STEP ** 2), 0];
/** Folded: the hinge at the hips with the back flat, the head in line with it. */
const PYRAMID_FOLD = { lean: 84, spine: 8, neck: 12 };
/** The hands rest either side of the front shin, this far down it from the knee. */
const PYRAMID_HAND_ALONG = 0.3;
const PYRAMID_HAND_OUT = 15;
/** How far into the fold the far arm comes in front of the far leg. */
const PYRAMID_ARM_CROSSES = 0.33;

const pyramidBody = (t: number): Pose3 => {
  const out = radians(PYRAMID_BACK_TOES_OUT);
  return {
    pelvis: PYRAMID_PELVIS,
    lean: PYRAMID_FOLD.lean * t,
    spine: { flex: PYRAMID_FOLD.spine * t },
    neck: { flex: PYRAMID_FOLD.neck * t },
    pins: {
      rightFoot: { at: [PYRAMID_STEP, ANKLE_Y, SKELETON.hip], toward: [1, 0, 0], pole: [1, 0.2, 0] },
      leftFoot: { at: [-PYRAMID_STEP, ANKLE_Y, -SKELETON.hip], toward: [Math.cos(out), 0, -Math.sin(out)], pole: [Math.cos(out), 0.2, -Math.sin(out)] },
    },
  };
};
const PYRAMID_LEGS = solvePose(pyramidBody(0));
/** Where each hand rests on the front shin when folded: either side of it, a little above its middle line. */
const PYRAMID_ON_SHIN = (() => {
  const [, knee, ankle] = PYRAMID_LEGS.rightLeg;
  const at = mix3(knee, ankle, PYRAMID_HAND_ALONG);
  return { right: [at[0], at[1] + 4, at[2] + PYRAMID_HAND_OUT] as Vec3, left: [at[0], at[1] + 4, at[2] - PYRAMID_HAND_OUT] as Vec3 };
})();
const PYRAMID_SHIN_HANDS: Record<'rightHand' | 'leftHand', Pin> = {
  rightHand: { at: PYRAMID_ON_SHIN.right, toward: [0.3, -1, 0], pole: [-1, 0.3, 0.6] },
  leftHand: { at: PYRAMID_ON_SHIN.left, toward: [0.3, -1, 0], pole: [-1, 0.3, -0.6] },
};
/**
 * This far into the fold. The arms start hanging by the sides, straight down from the shoulders
 * with the elbows soft, and reach down to the front shin as the body hinges, landing as it gets
 * there.
 */
const pyramidAt = (t: number): Pose3 => {
  const body = pyramidBody(t);
  const skeleton = solvePose(body);
  const reach = smooth(t);
  const hand = (side: 1 | -1, name: 'rightHand' | 'leftHand'): Pin => {
    const shoulder = shoulderOf(skeleton, side);
    const hanging: Pin = { at: [shoulder[0], shoulder[1] - 0.97 * ARM_REACH, shoulder[2] + side * 6], toward: [0, -1, 0], pole: [-1, 0, 0] };
    const pin = mixPin(hanging, PYRAMID_SHIN_HANDS[name], reach);
    // A little short of full stretch, so going straight from one frame to the next never cuts past it.
    return { ...pin, at: withinReach(shoulder, pin.at, 0.98 * ARM_REACH) };
  };
  // The far arm hangs outside its leg, behind it, and ends on the inside of the front shin, in front
  // of it. It changes over a third of the way down, once the hand has swung forward well clear of
  // that leg on the screen; where they overlap at the hip, depth alone swapped them too early.
  const behind: Pose3['behind'] = [t < PYRAMID_ARM_CROSSES ? ['leftArm', 'leftLeg'] : ['leftLeg', 'leftArm']];
  return { ...body, behind, pins: { ...body.pins, rightHand: hand(1, 'rightHand'), leftHand: hand(-1, 'leftHand') } };
};
const PYRAMID_UP = pyramidAt(0);
const PYRAMID_FOLDED = pyramidAt(1);
const PYRAMID_STEPS = 14;

export const PYRAMID_STRETCH_3D: Clip3D = {
  view: '3d',
  // From the front leg's side and a little in front: the hinge over the straight front leg is flat
  // on the screen, with the back leg reaching away beyond it.
  camera: { yaw: 16, pitch: 10 },
  highlight: ['rightLeg'],
  stillFrame: 1 + PYRAMID_STEPS,
  keyframes: [
    { ms: 0, pose: PYRAMID_UP },
    { ms: 500, pose: PYRAMID_UP },
    ...alongArc(2200, PYRAMID_STEPS, pyramidAt),
    { ms: 3500, pose: PYRAMID_FOLDED },
    ...alongArc(2000, PYRAMID_STEPS, (t) => pyramidAt(1 - t)),
  ],
};

// --- Wrist rocks: on all fours, the shoulders rock forward past the hands and back toward the heels, the hands turning out partway through ---

/**
 * The hips this far round the knees from straight over them, back toward the heels for a positive
 * number and forward for a negative one, the knees and feet planted as on all fours. The body tips
 * as far forward as keeps the arms straight with the hands planted under where the shoulders
 * start, so the shoulders travel past the hands rocking forward and behind them rocking back.
 */
const ROCK_THIGH = { forward: -26, back: 36 };
/** Fingers pointing forward, or turned out to the sides. */
const ROCK_FINGERS = { forward: 0, out: 90 };
/** How far a hand lifts off the floor to turn. */
const ROCK_HAND_LIFT = 6;
/** One hand: how far its fingers are turned out, and how far off the floor it is, from 0 (planted) to 1. */
type RockHand = { out: number; lift?: number };
const wristRockAt = (thighBack: number, right: RockHand, left: RockHand = right): Pose3 => {
  const thigh = radians(90 + thighBack);
  const pelvis: Vec3 = [WRIST_KNEE_X + SKELETON.thigh * Math.cos(thigh), ANKLE_Y + SKELETON.thigh * Math.sin(thigh), 0];
  const leg = (side: 1 | -1): Pin =>
    pinVia([pelvis[0], pelvis[1], side * SKELETON.hip], [WRIST_KNEE_X, ANKLE_Y, side * SKELETON.hip], [WRIST_KNEE_X - SKELETON.shin, ANKLE_Y, side * SKELETON.hip], [-1, 0, 0]);
  const hand = (side: 1 | -1, { out, lift = 0 }: RockHand): Pin => {
    const turn = radians(out);
    // A lifted hand hangs a little from the wrist, the fingers dipping toward the floor.
    const dip = -0.35 * lift;
    return {
      at: [WRIST_HANDS[0], WRIST_HANDS[1] + ROCK_HAND_LIFT * lift, side * WRIST_HANDS[2]],
      toward: [Math.cos(turn), dip, side * Math.sin(turn)],
      pole: [-1, 0, side * 0.3],
    };
  };
  const body = (lean: number): Pose3 => ({
    pelvis,
    lean,
    neck: { flex: 12 },
    pins: { rightFoot: leg(1), leftFoot: leg(-1), rightHand: hand(1, right), leftHand: hand(-1, left) },
  });
  const gap = (lean: number) => distance(solvePose(body(lean)).rightArm[0], [WRIST_HANDS[0], WRIST_HANDS[1], WRIST_HANDS[2]]);
  // As in the kneeling wrist stretch: the most upright lean that brings the shoulders within an arm of the hands.
  let nearest = 0;
  for (let tip = 0; tip <= 150; tip += 2) if (gap(tip) < gap(nearest)) nearest = tip;
  let [upright, tipped] = [0, nearest];
  const reach = 0.998 * ARM_REACH;
  for (let i = 0; i < 40; i++) {
    const tip = (upright + tipped) / 2;
    if (gap(tip) > reach) upright = tip;
    else tipped = tip;
  }
  return body((upright + tipped) / 2);
};
/** This far through one rock, from the middle forward, back past the middle toward the heels, and to the middle again. */
const wristRock = (u: number, turnedOut: number): Pose3 => {
  const swing = Math.sin(2 * Math.PI * u);
  return wristRockAt(swing > 0 ? ROCK_THIGH.forward * swing : ROCK_THIGH.back * -swing, { out: turnedOut });
};
const ROCK_MS = 3600;
const ROCK_FRAMES = 32;
/**
 * One rock forward and back, flowing through each end rather than stopping there, as the
 * instructions keep it going. It sets off from the middle and settles back into it gently, since
 * the hands turn there: arriving at full speed, it stopped with a snap.
 */
const wristRockCycle = (turnedOut: number): Keyframe3[] =>
  Array.from({ length: ROCK_FRAMES }, (_, i) => ({ ms: ROCK_MS / ROCK_FRAMES, pose: wristRock(smooth((i + 1) / ROCK_FRAMES), turnedOut), ease: 'none' as const }));
const ROCK_TURN_STEPS = 10;
/**
 * Turning the hands from pointing one way to the other, in the middle of the rock: one hand at a
 * time lifts a little off the floor, turns at the wrist while it's up, and sets back down, so the
 * palm never slides on the floor. The body stays still over the other hand.
 */
const wristTurn = (from: number, to: number): Keyframe3[] => {
  const turning = (t: number): RockHand => ({
    lift: Math.sin(Math.PI * t),
    // Turned only while it's well off the floor.
    out: mix(from, to, smooth(Math.min(1, Math.max(0, (t - 0.2) / 0.6)))),
  });
  return [
    ...alongArc(650, ROCK_TURN_STEPS, (t) => wristRockAt(0, turning(t), { out: from })),
    ...alongArc(650, ROCK_TURN_STEPS, (t) => wristRockAt(0, { out: to }, turning(t))),
  ];
};

export const WRIST_ROCKS_3D: Clip3D = {
  view: '3d',
  // As for the kneeling wrist stretch: the rock is flat on the screen, and from above the hands
  // turning out to the sides show.
  camera: { yaw: 22, pitch: 22 },
  highlight: ['rightArm', 'leftArm'],
  // Rocked all the way forward, the fingers forward, where the wrists bend most: the frame of the
  // first rock nearest a quarter of the way through it, once eased.
  stillFrame: Array.from({ length: ROCK_FRAMES }, (_, i) => i + 1).reduce((best, frame) =>
    Math.abs(smooth(frame / ROCK_FRAMES) - 0.25) < Math.abs(smooth(best / ROCK_FRAMES) - 0.25) ? frame : best
  ),
  keyframes: [
    { ms: 0, pose: wristRockAt(0, { out: ROCK_FINGERS.forward }) },
    ...wristRockCycle(ROCK_FINGERS.forward),
    ...wristTurn(ROCK_FINGERS.forward, ROCK_FINGERS.out),
    ...wristRockCycle(ROCK_FINGERS.out),
    ...wristTurn(ROCK_FINGERS.out, ROCK_FINGERS.forward),
  ],
};

// --- Elephant walk: folded forward with the hands on the floor, one knee bends with its heel lifting while the other leg straightens and presses its heel down ---

/** The feet stay where they stand, hip-width apart; folded, the hips sit back over the heels as in the standing forward fold. */
const ELEPHANT_HIPS_BACK = FOLD.hipsBack;
/** High enough that a leg with its heel down is straight, a hair short of locked. */
const ELEPHANT_PELVIS: Vec3 = (() => {
  const ankle = FOLD_STANDING.rightLeg[2];
  const dx = ankle[0] + ELEPHANT_HIPS_BACK;
  const dz = ankle[2] - SKELETON.hip;
  return [-ELEPHANT_HIPS_BACK, ankle[1] + Math.sqrt((0.995 * LEG_REACH) ** 2 - dx ** 2 - dz ** 2), 0];
})();
/** The bent leg's heel lifts this far, the foot pivoting on its toes, which lets that knee bend. */
const ELEPHANT_HEEL_UP = 38;
/**
 * Folded as in the standing forward fold, but deeper, since the legs are straight: only as deep as
 * lets the straight arms reach the floor. Any shallower and the hands lift off it.
 */
const ELEPHANT_FOLD = { lean: 88, spine: 54, neck: 30 };
/** The hands rest flat on the floor ahead of the toes, either side of the feet, the arms straight. The body stays still, so they can be, without the hands slipping between frames. */
const ELEPHANT_HAND_Z = 26;

/** A foot planted at its standing place with its heel lifted this far, pivoting on the toes. */
const elephantFoot = (side: 1 | -1, heelUp: number): Pin => {
  const ankle = side === 1 ? FOLD_STANDING.rightLeg[2] : FOLD_STANDING.leftLeg[2];
  const r = radians(heelUp);
  const toes: Vec3 = [ankle[0] + SKELETON.foot, ankle[1], ankle[2]];
  return { at: [toes[0] - SKELETON.foot * Math.cos(r), toes[1] + SKELETON.foot * Math.sin(r), toes[2]], toward: [Math.cos(r), -Math.sin(r), 0], pole: [1, 0, 0] };
};
const elephantBody = (rightHeel: number, leftHeel: number): Pose3 => ({
  pelvis: ELEPHANT_PELVIS,
  lean: ELEPHANT_FOLD.lean,
  spine: { flex: ELEPHANT_FOLD.spine },
  neck: { flex: ELEPHANT_FOLD.neck },
  pins: { rightFoot: elephantFoot(1, rightHeel), leftFoot: elephantFoot(-1, leftHeel) },
});
const ELEPHANT_SHOULDERS = solvePose(elephantBody(0, 0));
const ELEPHANT_HANDS = (() => {
  const hand = (side: 1 | -1): Pin => {
    const shoulder = shoulderOf(ELEPHANT_SHOULDERS, side);
    const reach = 0.995 * ARM_REACH;
    const z = side * ELEPHANT_HAND_Z;
    const ahead = Math.sqrt(Math.max(0, reach ** 2 - (shoulder[1] - WRIST_Y) ** 2 - (z - shoulder[2]) ** 2));
    return { at: [shoulder[0] + ahead, WRIST_Y, z], toward: [1, 0, 0], pole: [-1, 0, side * 0.3] };
  };
  return { rightHand: hand(1), leftHand: hand(-1) };
})();
/** From the right knee bent (0) to the left one bent (1), each heel lifting as its knee bends and pressing down as it straightens. */
const elephantAt = (t: number): Pose3 => {
  const body = elephantBody(ELEPHANT_HEEL_UP * (1 - t), ELEPHANT_HEEL_UP * t);
  return { ...body, pins: { ...body.pins, ...ELEPHANT_HANDS } };
};
const ELEPHANT_RIGHT = elephantAt(0);
const ELEPHANT_LEFT = elephantAt(1);
const ELEPHANT_STEPS = 10;

export const ELEPHANT_WALK_3D: Clip3D = {
  view: '3d',
  // From the right and a little in front, as for the standing forward fold: the knee bending forward
  // and the heel lifting show in profile, with the arms planted clear ahead of the legs. Further
  // round in front the arms stood over the legs and hid the knees, and from behind the folded body
  // and head went out of sight behind the legs.
  camera: { yaw: 15, pitch: 10 },
  highlight: ['rightLeg', 'leftLeg'],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: ELEPHANT_RIGHT },
    { ms: 400, pose: ELEPHANT_RIGHT },
    ...alongArc(1400, ELEPHANT_STEPS, elephantAt),
    { ms: 400, pose: ELEPHANT_LEFT },
    ...alongArc(1400, ELEPHANT_STEPS, (t) => elephantAt(1 - t)),
  ],
};

// --- Seated straddle side bend: sitting tall in the pancake's straddle, leaning sideways over the right leg as the left arm reaches overhead ---

/** All the way over: the spine and neck bent this far to the right, the chest still facing forward. */
const STRADDLE_BEND = { spine: 40, neck: 12 };
/** Sitting tall, the arms reach down to the floor ahead between the legs; the left one sweeps up the side and overhead. */
const STRADDLE_LEFT_ARM = { down: { flex: 38, abduct: 10, elbow: 10 }, up: { flex: 8, abduct: 165, elbow: 14 } };
/** The right hand slides along the floor to rest just inside the right knee. */
const STRADDLE_HAND_INSIDE = 30;

const straddleBody = (t: number): Pose3 => ({
  ...pancakeBody(0),
  spine: { flex: PANCAKE_TALL_ROUNDING, side: STRADDLE_BEND.spine * t },
  neck: { side: STRADDLE_BEND.neck * t },
});
/** Where the right hand rests on the floor sitting tall: where an arm reaching down like the left one would put it. */
const STRADDLE_RIGHT_START: Vec3 = (() => {
  const wrist = solvePose({ ...straddleBody(0), rightArm: STRADDLE_LEFT_ARM.down }).rightArm[2];
  return [wrist[0], WRIST_Y, wrist[2]];
})();
const STRADDLE_RIGHT_END: Vec3 = (() => {
  const knee = solvePose(straddleBody(1)).rightLeg[1];
  return [knee[0], WRIST_Y, knee[2] - STRADDLE_HAND_INSIDE];
})();
const straddleAt = (t: number): Pose3 => {
  const body = straddleBody(t);
  const skeleton = solvePose(body);
  const arm = STRADDLE_LEFT_ARM;
  // The arm swings back out of the way first and rises out to the side, rather than up in front of
  // the face, which it crossed going up the front.
  const back = smooth(Math.min(1, t / 0.5));
  const out = smooth(Math.min(1, t / 0.85));
  return {
    ...body,
    leftArm: { flex: mix(arm.down.flex, arm.up.flex, back), abduct: mix(arm.down.abduct, arm.up.abduct, out), elbow: mix(arm.down.elbow, arm.up.elbow, out) },
    pins: {
      rightHand: {
        at: withinReach(shoulderOf(skeleton, 1), mix3(STRADDLE_RIGHT_START, STRADDLE_RIGHT_END, t), 0.98 * ARM_REACH),
        toward: [1, 0, 0.3],
        pole: [-1, 0.3, 0.4],
      },
    },
  };
};
const STRADDLE_TALL = straddleAt(0);
const STRADDLE_OVER = straddleAt(1);
const STRADDLE_STEPS = 12;

export const SEATED_STRADDLE_SIDE_BEND_3D: Clip3D = {
  view: '3d',
  // From in front and above: the side bend and the arm reaching over go across the screen, and the
  // legs open out toward the camera.
  camera: { yaw: 90, pitch: 24 },
  highlight: ['torso', 'leftArm'],
  // The right arm reaches down in front of the body to the floor inside the knee, so it stays over
  // the torso and over the thigh it rests beside.
  over: ['rightArm'],
  behind: [['rightLeg', 'rightArm']],
  stillFrame: 1 + STRADDLE_STEPS,
  keyframes: [
    { ms: 0, pose: STRADDLE_TALL },
    { ms: 500, pose: STRADDLE_TALL },
    ...alongArc(2000, STRADDLE_STEPS, straddleAt),
    { ms: 3500, pose: STRADDLE_OVER },
    ...alongArc(1800, STRADDLE_STEPS, (t) => straddleAt(1 - t)),
  ],
};

/**
 * The lean, between upright and as far over as brings the shoulders nearest the hand at `hand`,
 * that leaves the arms straight: the most upright one, as in the kneeling wrist stretch. Positive
 * leans tip forward, negative back.
 */
const straightArmLean = (body: (lean: number) => Pose3, hand: Vec3, direction: 1 | -1 = 1): number => {
  const gap = (lean: number) => distance(solvePose(body(lean)).rightArm[0], hand);
  let nearest = 0;
  for (let tip = 0; Math.abs(tip) <= 150; tip += 2 * direction) if (gap(tip) < gap(nearest)) nearest = tip;
  let [upright, over] = [0, nearest];
  const reach = 0.998 * ARM_REACH;
  for (let i = 0; i < 40; i++) {
    const tip = (upright + over) / 2;
    if (gap(tip) > reach) upright = tip;
    else over = tip;
  }
  return (upright + over) / 2;
};

// --- Seated shoulder extension: sitting with the knees bent and the hands planted behind, fingers back, the hips lift, move forward away from the hands and sit back down ---

/** The hands stay planted behind, shoulder-width apart, the fingers pointing back. */
const SHOULDER_EXT_HANDS: Vec3 = [-105, WRIST_Y, SKELETON.shoulder];
/** The feet stay planted flat ahead, hip-width apart, the knees bent and pointing up. */
const SHOULDER_EXT_FEET_X = 150;
/** How far forward the hips sit down again, away from the hands. */
const SHOULDER_EXT_SHIFT = 55;
/** How high the hips lift at the top of their arc: just clear of the floor. */
const SHOULDER_EXT_LIFT = 14;
/** Sitting in the stretch the chest lifts: the upper back arches a little, and the head stays in line. */
const SHOULDER_EXT_ARCH = -14;

/**
 * This far through a move from sitting back by the hands (0) to sitting forward in the stretch (1).
 * The hips travel in one low arc, coming off the floor as they set off, highest halfway, and
 * settling back down as they arrive, so they never drag along it; going back the other way is the
 * same arc in reverse. Lifting, moving and sitting one after the other looked mechanical. The body
 * tips back as far as keeps the arms straight to the planted hands, so the further forward the hips
 * sit, the further the arms reach back behind the body.
 */
const shoulderExtensionAt = (t: number): Pose3 => {
  const up = Math.sin(Math.PI * t);
  // Moving starts just after the hips leave the floor and ends just before they're down.
  const forward = smooth(Math.min(1, Math.max(0, (t - 0.08) / 0.84)));
  const pelvis: Vec3 = [SHOULDER_EXT_SHIFT * forward, SIT_PELVIS_Y + SHOULDER_EXT_LIFT * up, 0];
  const hand = (side: 1 | -1): Pin => ({ at: [SHOULDER_EXT_HANDS[0], SHOULDER_EXT_HANDS[1], side * SHOULDER_EXT_HANDS[2]], toward: [-1, 0, 0], pole: [-1, 0, side * 0.2] });
  const foot = (side: 1 | -1): Pin => ({ at: [SHOULDER_EXT_FEET_X, ANKLE_Y, side * SKELETON.hip], toward: [1, 0, 0], pole: [0.3, 1, 0] });
  const body = (lean: number): Pose3 => ({
    pelvis,
    lean,
    spine: { flex: SHOULDER_EXT_ARCH * forward },
    neck: { flex: -SHOULDER_EXT_ARCH * forward },
    pins: { rightHand: hand(1), leftHand: hand(-1), rightFoot: foot(1), leftFoot: foot(-1) },
  });
  return body(straightArmLean(body, SHOULDER_EXT_HANDS, -1));
};
const SHOULDER_EXT_BACK = shoulderExtensionAt(0);
const SHOULDER_EXT_FORWARD = shoulderExtensionAt(1);
const SHOULDER_EXT_STEPS = 18;

export const SEATED_SHOULDER_EXTENSION_3D: Clip3D = {
  view: '3d',
  // As for reverse tabletop: from the side, a little in front and above, the hips' lift and move
  // and the arms reaching back behind the body are flat on the screen.
  camera: { yaw: 16, pitch: 10 },
  highlight: ['rightArm', 'leftArm'],
  stillFrame: 1 + SHOULDER_EXT_STEPS,
  keyframes: [
    { ms: 0, pose: SHOULDER_EXT_BACK },
    { ms: 600, pose: SHOULDER_EXT_BACK },
    ...alongArc(2200, SHOULDER_EXT_STEPS, shoulderExtensionAt),
    { ms: 3500, pose: SHOULDER_EXT_FORWARD },
    ...alongArc(2200, SHOULDER_EXT_STEPS, (t) => shoulderExtensionAt(1 - t)),
  ],
};

// --- Half kneeling frog stretch: on hands and one knee, the other leg straight out to the side, the hips rock back ---

/**
 * The straight leg's foot sits flat on the floor out to the side, level with the planted knee. The
 * hips swing on a circle around that knee as they rock, and the foot is on that circle's axis, so it
 * stays the same distance from the hip the whole way and the leg stays straight.
 */
const HALF_FROG_FOOT: Vec3 = [WRIST_KNEE_X, ANKLE_Y, SKELETON.hip + Math.sqrt((0.998 * LEG_REACH) ** 2 - SKELETON.thigh ** 2)];
/** The hips start a little forward of the knee and rock back this far round it. */
const HALF_FROG_THIGH = { forward: -8, back: 42 };

const halfFrogAt = (t: number): Pose3 => {
  const thigh = radians(90 + mix(HALF_FROG_THIGH.forward, HALF_FROG_THIGH.back, t));
  const pelvis: Vec3 = [WRIST_KNEE_X + SKELETON.thigh * Math.cos(thigh), ANKLE_Y + SKELETON.thigh * Math.sin(thigh), 0];
  const hand = (side: 1 | -1): Pin => ({ at: [WRIST_HANDS[0], WRIST_HANDS[1], side * WRIST_HANDS[2]], toward: [1, 0, 0], pole: [-1, 0, side * 0.3] });
  const body = (lean: number): Pose3 => ({
    pelvis,
    lean,
    neck: { flex: 12 },
    pins: {
      // The kneecap faces forward and up, the toes forward.
      rightFoot: { at: HALF_FROG_FOOT, toward: [1, 0, 0], pole: [0.3, 1, 0] },
      leftFoot: pinVia([pelvis[0], pelvis[1], -SKELETON.hip], [WRIST_KNEE_X, ANKLE_Y, -SKELETON.hip], [WRIST_KNEE_X - SKELETON.shin, ANKLE_Y, -SKELETON.hip], [-1, 0, 0]),
      rightHand: hand(1),
      leftHand: hand(-1),
    },
  });
  return body(straightArmLean(body, [WRIST_HANDS[0], WRIST_HANDS[1], WRIST_HANDS[2]]));
};
const HALF_FROG_FORWARD = halfFrogAt(0);
const HALF_FROG_BACK = halfFrogAt(1);
const HALF_FROG_STEPS = 14;

export const HALF_KNEELING_FROG_STRETCH_3D: Clip3D = {
  view: '3d',
  // From in front of the straight leg and above: the leg lies out to the side across the screen,
  // and the hips' rock back shows beyond it.
  camera: { yaw: 50, pitch: 28 },
  highlight: ['rightLeg'],
  stillFrame: 1 + HALF_FROG_STEPS,
  keyframes: [
    { ms: 0, pose: HALF_FROG_FORWARD },
    { ms: 400, pose: HALF_FROG_FORWARD },
    ...alongArc(1800, HALF_FROG_STEPS, halfFrogAt),
    { ms: 1200, pose: HALF_FROG_BACK },
    ...alongArc(1600, HALF_FROG_STEPS, (t) => halfFrogAt(1 - t)),
  ],
};

// --- Neck side stretch: standing tall, the right hand comes up over the head to rest on it, and the head tilts toward the right shoulder while the left arm reaches down ---

/** All the way over: the right ear toward the right shoulder. */
const NECK_TILT = 40;
/**
 * The right arm on its way up, out to the side, as angles: the shoulder lifts as the arm rises,
 * the elbow bending until the hand is over the head.
 */
const NECK_ARM_UP: ArmPose = { abduct: 160, flex: 8, elbow: 115, shrug: 18 };
/**
 * Where the hand rests: on top of the head, this far round from the crown toward the left ear, just
 * off the surface, the fingers draped toward the ear. Reaching any further round to the far side, the
 * forearm crossed the face: the head is big next to the arm.
 */
const NECK_HAND = { round: 15, out: SKELETON.head + 4, forward: 0 };
/** The left arm straightens and reaches down, the shoulder dropping, a little out from the side. */
const NECK_LEFT_ARM = { hanging: { abduct: 5, elbow: 8, shrug: 0 }, reaching: { abduct: 9, elbow: 0, shrug: -14 } };
/** How far through the move the hand settles on the head, before the head tilts the rest of the way. */
const NECK_HAND_LANDS = 0.6;
/** How far through the move the hand starts over toward the head. */
const NECK_HAND_SETS_OFF = 0.15;

/** The right hand's pin, resting on the head of `skeleton`. */
const neckHandOnHead = (skeleton: Skeleton): Pin => {
  const head = skeleton.head;
  const up = skeleton.headUp;
  // The head's own left, square to its up.
  const left: Vec3 = [-skeleton.headRight[0], -skeleton.headRight[1], -skeleton.headRight[2]];
  const r = radians(NECK_HAND.round);
  const out: Vec3 = [up[0] * Math.cos(r) + left[0] * Math.sin(r), up[1] * Math.cos(r) + left[1] * Math.sin(r), up[2] * Math.cos(r) + left[2] * Math.sin(r)];
  // The fingers follow the head's curve down toward the left ear.
  const fingers: Vec3 = [
    0.2 - up[0] * Math.sin(r) + left[0] * Math.cos(r),
    -up[1] * Math.sin(r) + left[1] * Math.cos(r),
    -up[2] * Math.sin(r) + left[2] * Math.cos(r),
  ];
  return {
    at: [head[0] + out[0] * NECK_HAND.out + NECK_HAND.forward, head[1] + out[1] * NECK_HAND.out, head[2] + out[2] * NECK_HAND.out],
    toward: fingers,
    // The elbow points out to the side and back, behind the head: with an arm this long next to a
    // head this big, an elbow straight out to the side only reached forehead height, and the
    // forearm crossed the face.
    pole: [-1, 0.3, 0.7],
  };
};

/**
 * This far into the stretch. The right arm rises out to the side and over, and the hand settles on
 * the head as it starts to tilt; from there it rides along with the head as it tilts the rest of
 * the way. The left arm straightens and reaches down all the while.
 */
const neckSideAt = (t: number): Pose3 => {
  const tilt = NECK_TILT * smooth(Math.min(1, Math.max(0, (t - 0.25) / 0.75)));
  const rise = smooth(Math.min(1, t / NECK_HAND_LANDS));
  const reaching = smooth(t);
  const hang = NECK_LEFT_ARM.hanging;
  const reach = NECK_LEFT_ARM.reaching;
  const leftArm: ArmPose = { abduct: mix(hang.abduct, reach.abduct, reaching), elbow: mix(hang.elbow, reach.elbow, reaching), shrug: mix(hang.shrug, reach.shrug, reaching) };
  const rightArm: ArmPose = {
    abduct: mix(STANDING.rightArm!.abduct!, NECK_ARM_UP.abduct!, rise),
    flex: mix(0, NECK_ARM_UP.flex!, rise),
    elbow: mix(STANDING.rightArm!.elbow!, NECK_ARM_UP.elbow!, rise),
    shrug: mix(0, NECK_ARM_UP.shrug!, rise),
  };
  const body: Pose3 = { ...STANDING, neck: { side: tilt }, rightArm, leftArm };
  const skeleton = solvePose(body);
  // Where the arm's angles put the hand and elbow, and the hand on the head.
  const [shoulder, elbow, wrist] = skeleton.rightArm;
  const onHead = neckHandOnHead(skeleton);
  // The hand comes over onto the head through the second half of the rise. The way the fingers point
  // and the elbow sticks out turn steadily from where the arm's angles have them to where they rest,
  // rather than being blended in a straight line: the two are far apart, and blended straight they
  // turned slowly and then all at once, a sudden spin of the wrist.
  const land = smooth(Math.min(1, Math.max(0, (t - NECK_HAND_SETS_OFF) / (NECK_HAND_LANDS - NECK_HAND_SETS_OFF))));
  const forearm: Vec3 = [wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]];
  const bend: Vec3 = [elbow[0] - (shoulder[0] + wrist[0]) / 2, elbow[1] - (shoulder[1] + wrist[1]) / 2, elbow[2] - (shoulder[2] + wrist[2]) / 2];
  const at = withinReach(shoulder, mix3(wrist, onHead.at, land), 0.98 * ARM_REACH);
  return { ...body, pins: { rightHand: { at, toward: turnToward(forearm, onHead.toward!, land), pole: turnToward(bend, onHead.pole!, land) } } };
};
const NECK_UP = neckSideAt(0);
const NECK_TILTED = neckSideAt(1);
const NECK_STEPS = 28;

export const NECK_SIDE_STRETCH_3D: Clip3D = {
  view: '3d',
  // From in front, close on the upper body: the tilt goes across the screen, with the hand resting
  // on the head on one side and the other reaching down on the other.
  camera: { yaw: 90, pitch: 8, fit: 'head' },
  // No highlight: the stretch is in the neck, which has no part of its own to color, and coloring
  // the torso marked the chest.
  // The elbow goes back behind the head, so the arm passes behind it, and the hand resting on top
  // of the head is drawn again over it.
  behind: [['rightArm', 'head']],
  holds: [{ hand: 'rightHand', limb: 'head' }],
  // The left arm hangs down the side of the body facing the camera, so it stays over the torso; as
  // its shoulder dropped, it went under it, the top of the arm vanishing into the shoulder.
  over: ['leftArm', 'leftLeg'],
  stillFrame: 1 + NECK_STEPS,
  keyframes: [
    { ms: 0, pose: NECK_UP },
    { ms: 500, pose: NECK_UP },
    ...alongArc(2600, NECK_STEPS, neckSideAt),
    { ms: 3500, pose: NECK_TILTED },
    ...alongArc(2200, NECK_STEPS, (t) => neckSideAt(1 - t)),
  ],
};

// --- Shoulder stretches standing tall: what the cross-body, overhead triceps and cow face clips share ---

const unit3 = (v: Vec3): Vec3 => toward([0, 0, 0], v, 1);
const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const along3 = (from: Vec3, direction: Vec3, length: number): Vec3 => [from[0] + direction[0] * length, from[1] + direction[1] * length, from[2] + direction[2] * length];
/** `t` mapped from `from`..`to` onto 0..1, eased, and held at the ends outside it. */
const phase = (t: number, from: number, to: number) => smooth(Math.min(1, Math.max(0, (t - from) / (to - from))));
/** The arm of `skeleton` on this side, from the shoulder: shoulder, elbow, wrist, fingertips. */
const armOf = (skeleton: Skeleton, side: 1 | -1) => (side === 1 ? skeleton.rightArm : skeleton.leftArm);
type HandTarget = Pin & { toward: Vec3; pole: Vec3 };

/**
 * A hand pin partway from where the arm's angles in `skeleton` put the hand to `target`. The way
 * the fingers point and the elbow sticks out turn steadily from one to the other (see `turnToward`),
 * and the hand stays within the arm's reach on the way. The arm's angles need the elbow bent a
 * little, so that the hand is where they put it and the elbow has a way to point: a straight arm is
 * past `ARM_REACH`, and was pulled in and bent.
 */
const handToward = (skeleton: Skeleton, side: 1 | -1, target: HandTarget, t: number): Pin => {
  const [shoulder, elbow, wrist] = armOf(skeleton, side);
  const forearm = sub3(wrist, elbow);
  const bend = sub3(elbow, mix3(shoulder, wrist, 0.5));
  return {
    at: withinReach(shoulder, mix3(wrist, target.at, t)),
    toward: turnToward(forearm, target.toward, t),
    pole: turnToward(bend, target.pole, t),
  };
};

// --- Cross-body shoulder stretch: a straight arm comes across the chest and the other hand pulls it closer at the elbow ---

/**
 * How far the straight right arm comes across from pointing straight ahead at shoulder height, when
 * the left hand takes hold of it, and once it's pulled in close to the chest.
 */
const CROSS_BODY = { across: 30, pulled: 42 };

/**
 * How the right arm rests in the crook of the left elbow: the left elbow this far below the middle
 * of the right arm and out in front of it, which leaves the two arms just touching, with the left
 * upper arm going back behind the right arm to its shoulder and the forearm coming up in front of
 * it. With the elbow tucked in toward the chest, the forearm rose through the right arm.
 */
const CROSS_BODY_CROOK = { below: 16, out: 19 };
/**
 * How far the left forearm leans forward, the way the body faces, and out to the body's left, for
 * each unit it rises. Leaning square to the right arm instead, it leant toward the right shoulder
 * too, more the less far across the arm was, and lay along the arm on screen, hiding it.
 */
const CROSS_BODY_FOREARM = { forward: 0.8, left: 0.4 };

/**
 * The left arm hooked round the right one: the right arm lies between the left forearm and upper
 * arm, resting on the inside of the left elbow, and the forearm stands up in front of it and pulls
 * it in toward the chest, the hand beside the face. The left elbow goes as near the right
 * elbow as the left upper arm reaches from its shoulder, which is just past it, on the forearm.
 */
const crossBodyGrip = (skeleton: Skeleton): HandTarget => {
  const [shoulder, elbow] = skeleton.rightArm;
  const leftShoulder = skeleton.leftArm[0];
  const arm = unit3(sub3(elbow, shoulder));
  // Square to the arm and level: the front of the arm lying across the chest, away from it.
  const front = unit3([-arm[2], 0, arm[0]]);
  const crookAt = (along: number): Vec3 => along3(along3(along3(shoulder, arm, along), [0, -1, 0], CROSS_BODY_CROOK.below), front, CROSS_BODY_CROOK.out);
  // How far along the right arm the crook is, found where the left upper arm reaches exactly.
  let [near, far] = [0, SKELETON.upperArm + SKELETON.forearm];
  for (let i = 0; i < 30; i++) {
    const mid = (near + far) / 2;
    if (distance(leftShoulder, crookAt(mid)) < SKELETON.upperArm) near = mid;
    else far = mid;
  }
  const crook = crookAt((near + far) / 2);
  // The forearm stands up in front of the right arm, crossing it, and a little out to the left so
  // the hand comes up beside the face rather than over it.
  const { forward, left } = CROSS_BODY_FOREARM;
  const forearm = unit3([forward, 1, -left]);
  const wrist = along3(crook, forearm, SKELETON.forearm);
  // The hand carries straight on from the forearm. Curled in toward the right shoulder, it came over
  // the chin and covered the nose, which showed again as the pull drew the hand away.
  return { ...pinVia(leftShoulder, crook, wrist), toward: forearm };
};

/**
 * The straight right arm across the chest at shoulder height, resting in the crook of the left
 * elbow, and this far into the pull (0 to 1) as the left forearm draws it in toward the chest, the
 * right shoulder kept down away from the ear. The clip starts with the arms already crossed.
 */
const crossBodyAt = (pull: number): Pose3 => {
  const body: Pose3 = {
    ...STANDING,
    rightArm: { flex: 90, abduct: -mix(CROSS_BODY.across, CROSS_BODY.pulled, pull), elbow: 0, shrug: -4 },
  };
  return { ...body, pins: { leftHand: crossBodyGrip(solvePose(body)) } };
};
const CROSS_BODY_HELD = crossBodyAt(0);
const CROSS_BODY_PULLED = crossBodyAt(1);
/** The crook rides along the arm as it's pulled in, so the pull is drawn in this many frames rather than one straight move of the hand. */
const CROSS_BODY_STEPS = 10;

export const CROSS_BODY_SHOULDER_STRETCH_3D: Clip3D = {
  view: '3d',
  // From in front and a little above: the arm lies across the chest across the screen, and looking
  // down shows it in front of the chest and closing on it with the pull. Square to the camera, both
  // arms go over the torso; turned toward the right, the left arm's far shoulder came over the chest.
  camera: { yaw: 90, pitch: 25, fit: 'head' },
  highlight: ['rightArm'],
  // The right arm rests in the crook of the left elbow: the left upper arm is behind it and the
  // forearm in front. Limbs are ordered whole, so the left arm goes behind the right one, as its
  // upper arm is, and its forearm and hand are drawn again over it. Ordered whole in front, the
  // upper arm came over the arm it's behind.
  behind: [['leftArm', 'rightArm']],
  holds: [{ hand: 'leftHand', limb: 'rightArm', forearm: true }],
  // Square to the camera, the arms are over the torso.
  over: ['leftArm', 'leftLeg'],
  stillFrame: 2 + CROSS_BODY_STEPS,
  keyframes: [
    { ms: 0, pose: CROSS_BODY_HELD },
    { ms: 800, pose: CROSS_BODY_HELD },
    ...alongArc(1400, CROSS_BODY_STEPS, crossBodyAt),
    { ms: 3000, pose: CROSS_BODY_PULLED },
    ...alongArc(1200, CROSS_BODY_STEPS, (t) => crossBodyAt(1 - t)),
  ],
};

// --- Overhead triceps stretch: one arm reaches overhead and the hand drops behind the head; the other hand pulls that elbow back and in ---

/**
 * The right arm, from hanging (0), reaches straight overhead and then folds at the elbow, the hand
 * swinging down behind the head, and settles at `target` (1). The fold swings the hand back round
 * behind the head on the elbow, so it never passes through it; only the last of the way is the hand
 * drawn in to the target. The arm is straight up, the elbow over the shoulder, before the elbow
 * bends much: folding from an arm still a little forward, the forearm went over the crown in front
 * of the middle of the head, and came out from behind the head to in front of it partway over.
 */
const topArmAt = (body: Pose3, t: number, target: (shoulder: Vec3) => HandTarget): { body: Pose3; pin: Pin } => {
  const reach = phase(t, 0, 0.5);
  const fold = phase(t, 0.42, 0.9);
  const hang = STANDING.rightArm!;
  const arms: Pose3 = {
    ...body,
    rightArm: { flex: 180 * reach, abduct: mix(hang.abduct!, 0, reach), elbow: mix(hang.elbow!, 140, fold), shrug: 14 * reach },
  };
  const skeleton = solvePose(arms);
  return { body: arms, pin: handToward(skeleton, 1, target(skeleton.rightArm[0]), phase(t, 0.6, 1)) };
};

/**
 * A hand target with the elbow placed exactly: the upper arm leaves `shoulder` along `upper`, and
 * the forearm runs from the elbow toward `aim`, the hand pointing along `fingers`. A pole alone
 * puts the elbow wherever the line from the shoulder to the hand leaves room for it, which for a
 * hand behind the neck was out behind the head rather than up at the ceiling.
 */
const foldedArm = (shoulder: Vec3, upper: Vec3, aim: Vec3, fingers: Vec3): HandTarget => {
  const elbow = along3(shoulder, unit3(upper), SKELETON.upperArm);
  const wrist = along3(elbow, unit3(sub3(aim, elbow)), SKELETON.forearm);
  return { ...pinVia(shoulder, elbow, wrist), toward: fingers };
};

/**
 * Where the right hand rests behind the neck, the fingers pointing down the spine and the elbow at
 * the ceiling, and where the pull takes it: the elbow drawn back and in, which slides the hand a
 * little further down the back.
 */
const TRICEPS_ARM = {
  held: { upper: [-0.2, 1, -0.05], aim: [-40, 340, 6] },
  pulled: { upper: [-0.3, 1, -0.22], aim: [-36, 330, -8] },
} satisfies Record<string, { upper: Vec3; aim: Vec3 }>;
const TRICEPS_FINGERS: Vec3 = [-0.15, -1, -0.1];

/** Where the left hand holds the right elbow: on its far side, over the top of the head, the fingers wrapped round it. */
const tricepsGrip = (skeleton: Skeleton): HandTarget => {
  const elbow = skeleton.rightArm[1];
  return { at: [elbow[0] + 4, elbow[1] + 4, elbow[2] - 22], toward: [0, 0.35, 1], pole: [0.5, 0.4, -1] };
};

/**
 * From standing with the arms hanging (0), the right arm reaches overhead and folds, the hand
 * dropping behind the head, while the left hand comes up the left side and over the head to take
 * hold of the elbow (1); then it draws the elbow back and in (`pull` 1).
 */
const tricepsAt = (t: number, pull: number): Pose3 => {
  const p = smooth(pull);
  const { held, pulled } = TRICEPS_ARM;
  const top = topArmAt(STANDING, t, (shoulder) => foldedArm(shoulder, mix3(held.upper, pulled.upper, p), mix3(held.aim, pulled.aim, p), TRICEPS_FINGERS));
  const skeleton = solvePose({ ...top.body, pins: { rightHand: top.pin } });
  // The left hand goes up the left side, clear of the face, before coming over the head.
  const hanging = solvePose(STANDING).leftArm[2];
  const grip = tricepsGrip(skeleton);
  const lift = phase(t, 0.25, 1);
  const via: Vec3 = [hanging[0] + 10, skeleton.head[1] + 20, -70];
  const at = mix3(mix3(hanging, via, lift), mix3(via, grip.at, lift), lift);
  return { ...top.body, pins: { rightHand: top.pin, leftHand: handToward(skeleton, -1, { ...grip, at }, lift) } };
};
const TRICEPS_DOWN = tricepsAt(0, 0);
const TRICEPS_HELD = tricepsAt(1, 0);
const TRICEPS_PULLED = tricepsAt(1, 1);
const TRICEPS_STEPS = 24;

export const OVERHEAD_TRICEPS_STRETCH_3D: Clip3D = {
  view: '3d',
  // From behind and a little to the right: the hand dropping behind the head shows rather than
  // being hidden by it, and the elbow drawn in toward the head moves across the screen.
  camera: { yaw: -75, pitch: 12, fit: 'head' },
  highlight: ['rightArm'],
  // From behind and to its side, the right arm is nearer than the head wherever the two overlap:
  // up beside the ear, and folded down behind it. By depth they swapped as the arm went overhead,
  // the upper arm popping from behind the head to in front of it.
  behind: [['head', 'rightArm']],
  stillFrame: 2 + TRICEPS_STEPS,
  keyframes: [
    { ms: 0, pose: TRICEPS_DOWN },
    { ms: 500, pose: TRICEPS_DOWN },
    ...alongArc(2200, TRICEPS_STEPS, (t) => tricepsAt(t, 0)),
    { ms: 1000, pose: TRICEPS_PULLED },
    { ms: 3000, pose: TRICEPS_PULLED },
    { ms: 800, pose: TRICEPS_HELD },
    ...alongArc(2000, TRICEPS_STEPS, (t) => tricepsAt(1 - t, 0)),
  ],
};

// --- Cow face arms: the top hand drops down behind the neck and the bottom hand climbs the back to link fingers with it ---

/**
 * Where the hands link, between the shoulder blades just off the back: the right wrist on top with
 * the fingers down the spine, the left wrist below with its fingers up, the fingers hooked over
 * each other. The top elbow points up at the ceiling, the bottom one down at the floor.
 */
const COW_FACE: { top: { upper: Vec3; aim: Vec3; fingers: Vec3 }; bottom: { upper: Vec3; fingers: Vec3 }; overlap: number } = {
  top: { upper: [-0.25, 1, -0.1], aim: [-30, 335, 0], fingers: [-0.1, -1, -0.05] },
  bottom: { upper: [-0.25, -1, -0.12], fingers: [-0.1, 1, 0.05] },
  /** How far the fingers of the two hands overlap where they hook together. */
  overlap: 16,
};

/** Both hands linked, for a body whose shoulders are at `right` and `left`. */
const cowFaceHands = (right: Vec3, left: Vec3): { right: HandTarget; left: HandTarget } => {
  const { top, bottom, overlap } = COW_FACE;
  const high = foldedArm(right, top.upper, top.aim, top.fingers);
  const low = high.at[1] - (2 * SKELETON.hand - overlap);
  return { right: high, left: foldedArm(left, bottom.upper, [high.at[0], low, high.at[2] - 4], bottom.fingers) };
};

/**
 * Where the left hand first goes behind the back: on the lower back beside the spine, the back of
 * the hand against it, the fingers toward the spine and the elbow bent back and a little out.
 */
const COW_FACE_LOW_BACK: HandTarget = { at: [-32, 262, -18], toward: [-0.1, 0.4, 1], pole: [-1, -0.3, -0.6] };
/**
 * The way there leaves the hanging hand heading straight back, toward this point behind the thigh,
 * before it rises and comes in: straight to the lower back, it went up past the hip still beside
 * the thigh, and crossed in front of it while the two overlapped on screen.
 */
const COW_FACE_PAST_HIP: Vec3 = [-55, 150, -48];

/**
 * From standing with the arms hanging (0), the right arm reaches overhead and folds, the hand coming
 * down behind the neck, while the left hand goes round behind the hip to the lower back and climbs
 * up the spine to meet it (1). Bent by its angles alone, the left forearm swung across the belly or
 * out to the side; a hand gets behind the back by turning the arm in further than angles from
 * hanging reach without passing through the body.
 */
const cowFaceAt = (t: number): Pose3 => {
  const top = topArmAt(STANDING, t, (shoulder) => cowFaceHands(shoulder, solvePose(STANDING).leftArm[0]).right);
  const skeleton = solvePose(top.body);
  const linked = cowFaceHands(skeleton.rightArm[0], skeleton.leftArm[0]).left;
  const climb = phase(t, 0.5, 1);
  const behind: HandTarget = {
    at: mix3(COW_FACE_LOW_BACK.at, linked.at, climb),
    toward: turnToward(COW_FACE_LOW_BACK.toward, linked.toward, climb),
    pole: turnToward(COW_FACE_LOW_BACK.pole, linked.pole, climb),
  };
  // Round behind the hip on a curve from the hanging hand, pulled toward the point past the hip.
  const round = phase(t, 0.1, 0.5);
  const [, , hanging] = skeleton.leftArm;
  const at = mix3(mix3(hanging, COW_FACE_PAST_HIP, round), mix3(COW_FACE_PAST_HIP, behind.at, round), round);
  const pin = handToward(skeleton, -1, behind, round);
  return { ...top.body, pins: { rightHand: top.pin, leftHand: { ...pin, at: withinReach(skeleton.leftArm[0], at) } } };
};
const COW_FACE_DOWN = cowFaceAt(0);
const COW_FACE_LINKED = cowFaceAt(1);
const COW_FACE_STEPS = 28;

export const COW_FACE_ARMS_3D: Clip3D = {
  view: '3d',
  // From behind and a little to the right, where both hands show meeting on the back: from the
  // front they're hidden behind the body. Turned further to the side, the hanging left hand was
  // behind the thigh on screen, and crossed in front of it as it went behind the back.
  camera: { yaw: -75, pitch: 10, fit: 'head' },
  highlight: ['rightArm', 'leftArm'],
  // The top arm is nearer than the head wherever the two overlap, as in the overhead triceps
  // stretch. Where the hands link the fingers lie over each other about as deep, and the arms
  // swapped as they met and as they parted, so the bottom hand stays over the top one.
  behind: [
    ['head', 'rightArm'],
    ['rightArm', 'leftArm'],
  ],
  // The left arm hangs at the back of the body as the camera sees it, over the shoulder blade, and
  // stays over the back as the hand goes behind it. By depth it started under the torso and came
  // over it as the hand went behind the hip, its shoulder end jumping from behind the shoulder
  // blade to in front of it.
  over: ['leftArm', 'leftLeg'],
  stillFrame: 1 + COW_FACE_STEPS,
  keyframes: [
    { ms: 0, pose: COW_FACE_DOWN },
    { ms: 500, pose: COW_FACE_DOWN },
    ...alongArc(2600, COW_FACE_STEPS, cowFaceAt),
    { ms: 3500, pose: COW_FACE_LINKED },
    ...alongArc(2200, COW_FACE_STEPS, (t) => cowFaceAt(1 - t)),
  ],
};

// --- Manual forearm stretches: one arm held out straight in front, the other hand bending its wrist down and back ---

/**
 * The stretched arm is straight out in front at shoulder height, come this far (degrees) in toward
 * the middle, with the chest turned this far toward it and the other shoulder blade slid this far
 * forward round the ribs, as reaching across the body does: square on, the other hand couldn't
 * reach round to the front of the hand.
 */
const FOREARM_ARM = { inward: 10, twist: -20, protract: 26 };

type ForearmGrip = {
  /** How far the wrist bends, down from the line of the forearm. */
  bend: number;
  /** Where the middle of the other hand rests, this far along the stretched hand from its wrist. */
  along: number;
  /**
   * The stretched hand turns palm up (1) or down (-1) once the arm is out, and the palm turns on
   * with the hand as the wrist bends. Palm up, the thumb is toward the camera, over the hand; palm
   * down, the hand hides it. That's what tells the two stretches apart: without a thumb the stick
   * figure's hand looks the same either way up.
   */
  palm: 1 | -1;
};

/**
 * Palm down, the wrist bends down with the fingers toward the body; the other hand lies on the back
 * of the hand and presses it down, its fingers over the knuckles.
 */
const EXTENSOR_GRIP: ForearmGrip = { bend: 80, along: 12, palm: -1 };
/**
 * Palm up, the wrist bends back with the fingers down; the other hand lies across the front of the
 * fingers, on the palm's side, and pulls them down and back. It points the same way as the
 * stretched hand's fingers, as it does in the extensor stretch, so it comes up and settles the same
 * way: pointing back up the hand, it turned right round on the way.
 */
const FLEXOR_GRIP: ForearmGrip = { bend: 70, along: 14, palm: 1 };

/** How the left arm comes up on its way to the right hand: raised forward, across the body, and bent at the elbow. */
const FOREARM_LIFT = { flex: 45, abduct: -10, elbow: 70 };

/** How far the other hand's middle sits off the stretched hand's: the two hands' half thicknesses. */
const HAND_ON_HAND = 17;

const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** `a` turned this far (radians) toward `b`, which is square to it. */
const tipToward = (a: Vec3, b: Vec3, angle: number): Vec3 => unit3(mix3(along3([0, 0, 0], a, Math.cos(angle)), along3([0, 0, 0], b, Math.sin(angle)), 0.5));

/**
 * Standing tall (0), the right arm rises straight out in front with the thumb up, the hand turns
 * palm down or up, and the left hand comes up to lie on the right hand (1); then the wrist bends
 * this far (`bend`, 0 to 1) as the left hand presses it down and back toward the body. The left
 * hand rises behind the right arm, on the far side of it from where the clip looks, and comes down
 * on the hand from above once it has turned.
 */
const forearmStretchAt = (grip: ForearmGrip, t: number, bend: number): Pose3 => {
  const reach = phase(t, 0, 0.45);
  const turn = phase(t, 0.38, 0.75);
  const lift = phase(t, 0.15, 0.75);
  const hang = STANDING.rightArm!;
  const leftHang = STANDING.leftArm!;
  const body: Pose3 = {
    ...STANDING,
    spine: { twist: FOREARM_ARM.twist * reach },
    // Turning the chest swings the arm with it, so the arm comes across by as much again.
    rightArm: { flex: 90 * reach, abduct: mix(hang.abduct!, FOREARM_ARM.twist - FOREARM_ARM.inward, reach), elbow: mix(hang.elbow!, 0, reach) },
    // The left arm comes up by its own angles first, the elbow bending as it rises, so the elbow
    // already sticks out a settled way when the hand heads for the right hand. Pinned from
    // hanging, the arm was nearly straight, and the elbow lurched back as the hand set off.
    leftArm: {
      flex: FOREARM_LIFT.flex * lift,
      abduct: mix(leftHang.abduct!, FOREARM_LIFT.abduct, lift),
      elbow: mix(leftHang.elbow!, FOREARM_LIFT.elbow, lift),
      protract: FOREARM_ARM.protract * reach,
    },
  };
  const skeleton = solvePose(body);
  const [, elbow, wrist] = skeleton.rightArm;
  const forearm = unit3(sub3(wrist, elbow));
  // Square to the forearm, and up once it's held out: the back of a palm-down hand, the palm of a
  // palm-up one. The fingers bend down away from it, and it turns forward with them.
  const up = unit3(cross3([0, 0, 1], forearm));
  const angle = (grip.bend * bend * Math.PI) / 180;
  const fingers = tipToward(forearm, [-up[0], -up[1], -up[2]], angle);
  const face = tipToward(up, forearm, angle);
  const onHand = along3(along3(wrist, fingers, grip.along), face, HAND_ON_HAND);
  const target: HandTarget = { at: along3(onHand, fingers, -SKELETON.hand / 2), toward: fingers, pole: [0, -1, -0.6] };
  // The palm faces in, toward the thigh with the arm hanging and the thumb up with it held out,
  // until the forearm turns it down or up.
  const palm = turnToward([0, 0, -1], along3([0, 0, 0], face, grip.palm), turn);
  return {
    ...body,
    pins: { rightHand: { at: wrist, toward: fingers, pole: [0, -1, 0], palm }, leftHand: handToward(skeleton, -1, target, phase(t, 0.45, 1)) },
  };
};

const FOREARM_STEPS = { reach: 68, bend: 18 };

const forearmStretch = (grip: ForearmGrip): Clip3D => ({
  view: '3d',
  // From the stretched arm's side, where the wrist bends in profile, and close in on the arms.
  camera: { yaw: 10, pitch: 10, fit: 'head' },
  highlight: ['rightArm'],
  // The left arm is on the far side of the right one all the way, its hand rising behind the right
  // arm and coming to rest against the right hand, the two side by side on screen.
  behind: [['leftArm', 'rightArm']],
  stillFrame: 1 + FOREARM_STEPS.reach + FOREARM_STEPS.bend,
  keyframes: [
    { ms: 0, pose: forearmStretchAt(grip, 0, 0) },
    { ms: 500, pose: forearmStretchAt(grip, 0, 0) },
    ...alongArc(3400, FOREARM_STEPS.reach, (t) => forearmStretchAt(grip, t, 0)),
    ...alongArc(900, FOREARM_STEPS.bend, (b) => forearmStretchAt(grip, 1, b)),
    { ms: 3000, pose: forearmStretchAt(grip, 1, 1) },
    ...alongArc(700, FOREARM_STEPS.bend, (b) => forearmStretchAt(grip, 1, 1 - b)),
    ...alongArc(2800, FOREARM_STEPS.reach, (t) => forearmStretchAt(grip, 1 - t, 0)),
  ],
});

export const MANUAL_EXTENSOR_FOREARM_STRETCH_3D = forearmStretch(EXTENSOR_GRIP);
export const MANUAL_FLEXOR_FOREARM_STRETCH_3D = forearmStretch(FLEXOR_GRIP);

// --- From all fours, the left leg stretching straight back, and leaning onto the hands or forearms: for the pigeon stretch ---

/** On all fours the hips are over the knees, the right one here on the floor. */
const ALL_FOURS_RIGHT_KNEE: Vec3 = [0, ANKLE_Y, SKELETON.hip];
/** With the back leg stretched out, the hips have rolled back this far around the planted right knee. */
const LEG_BACK_HIPS_BACK = 25;
/** The hips this far (0 to 1) into rolling back around the right knee as the left leg stretches out. */
const hipsRolledBack = (extend: number): Vec3 => {
  const back = radians(LEG_BACK_HIPS_BACK * extend);
  return [ALL_FOURS_RIGHT_KNEE[0] - SKELETON.thigh * Math.sin(back), ANKLE_Y + SKELETON.thigh * Math.cos(back), 0];
};
/** The direction a straight back leg runs in from a hip at this height down to the top of its foot on the floor. */
const backLineFrom = (hipY: number): Vec3 => {
  const drop = hipY - ANKLE_Y;
  const length = SKELETON.thigh + SKELETON.shin;
  return [-Math.sqrt(length ** 2 - drop ** 2) / length, -drop / length, 0];
};
/**
 * The left foot, from the leg kneeling on all fours (0) to stretched straight back behind `pelvis`
 * (1), the toes on the floor. The knee slides back along the floor a thigh's length behind the hip
 * and the shin swings into line with the thigh, so the knee lifts off the floor only as the leg
 * straightens. Left to its pole, the knee dropped through the floor while the hips were still high.
 */
const leftLegBack = (pelvis: Vec3, extend: number): Pin => {
  const hip: Vec3 = [pelvis[0], pelvis[1], -SKELETON.hip];
  const line = backLineFrom(hip[1]);
  const kneeY = mix(ANKLE_Y, hip[1] + SKELETON.thigh * line[1], extend);
  const knee: Vec3 = [hip[0] - Math.sqrt(Math.max(0, SKELETON.thigh ** 2 - (hip[1] - kneeY) ** 2)), kneeY, -SKELETON.hip];
  const shin = turnToward([-1, 0, 0], line, extend);
  // The knee is always below the line from the hip to the foot, so pointing it at the floor puts it
  // there; aimed at the knee itself, the pole came to nothing once the leg was straight.
  return { at: along3(knee, shin, 0.998 * SKELETON.shin), toward: [-1, 0, 0], pole: [0, -1, 0] };
};
/** A direction as a unit vector, from any list of three numbers. */
const unitOf = (v: readonly number[]): Vec3 => {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
};

/**
 * The lean, between `from` and `to`, at which `gap(lean)` comes to zero, for a body tipping forward
 * until its shoulders are where the arms reach. `gap` has to grow (or shrink) steadily across it.
 */
const leanWhere = (gap: (lean: number) => number, from: number, to: number): number => {
  let [a, b] = [from, to];
  const rising = gap(b) > gap(a);
  for (let i = 0; i < 40; i++) {
    const middle = (a + b) / 2;
    if (gap(middle) > 0 === rising) b = middle;
    else a = middle;
  }
  return (a + b) / 2;
};
/** An elbow resting on the floor sits this high, and a forearm flat on it. */
const ELBOW_Y = 10;
/**
 * The forearm flat on the floor, pointing ahead from an elbow on the floor at `elbow`, the palm down.
 * Its wrist goes where the forearm reaches, with the elbow bending down to the floor.
 */
const forearmDown = (shoulder: Vec3, elbow: Vec3, inward: number): Pin => {
  const along = Math.sqrt(SKELETON.forearm ** 2 - (ELBOW_Y - WRIST_Y) ** 2);
  const turn = radians(inward);
  const wrist: Vec3 = [elbow[0] + along * Math.cos(turn), WRIST_Y, elbow[2] - along * Math.sin(turn)];
  return pinVia(shoulder, elbow, wrist, [Math.cos(turn), 0, -Math.sin(turn)]);
};

// --- Pigeon stretch: from all fours, the right knee comes forward behind the wrist with the shin across, the left leg slides back, and the body folds over the front shin ---

/**
 * In the pigeon the hips sit low and square, resting on the front shin's side. The front knee rests
 * on the floor behind the right wrist, out a little to the side, and the shin lies across in front
 * of the hips, the foot in front of the left hip.
 */
const PIGEON_PELVIS: Vec3 = [-35, 36, 0];
const PIGEON_KNEE: Vec3 = [60, ANKLE_Y, 38];
const PIGEON_ANKLE: Vec3 = toward(PIGEON_KNEE, [-2, ANKLE_Y, -42], SKELETON.shin);
/** Folded, the back rounds and the forehead comes down toward the hands. */
const PIGEON_FOLD = { spine: 18, neck: 24 };
/** The forearms come down angled in a little toward each other, in front of the shin. */
const PIGEON_FOREARMS_IN = 18;

/** The back leg is straight by this far into the setup, before the front knee comes forward. */
const PIGEON_EXTEND_ENDS = 0.45;
/**
 * The legs, from all fours (0) to the pigeon (1). First the left leg stretches straight back, its
 * knee sliding back along the floor and then lifting as the leg straightens onto the toes, while
 * the hips ease back and down around the right knee, which stays planted and bends further. Then
 * the right knee lifts and comes forward, the shin swinging round to lie across, as the hips sink
 * to the floor and the back leg slides on out behind.
 */
const pigeonLegs = (t: number): { pelvis: Vec3; rightFoot: Pin; leftFoot: Pin } => {
  const extend = phase(t, 0, PIGEON_EXTEND_ENDS);
  const knee = phase(t, PIGEON_EXTEND_ENDS, 1);
  const lift = Math.sin(Math.PI * knee);
  // The right knee slides forward just off the floor to behind the wrist, and the hips come down
  // with it, a thigh's length from it the whole way. Swung up through the air under the chest
  // instead, the shin flipped up and back behind the knee.
  const kneeLine = mix3(ALL_FOURS_RIGHT_KNEE, PIGEON_KNEE, knee);
  const kneeAt: Vec3 = [kneeLine[0], kneeLine[1] + 10 * lift, kneeLine[2]];
  const hipX = mix(hipsRolledBack(1)[0], PIGEON_PELVIS[0], knee);
  const reach = SKELETON.thigh ** 2 - (kneeAt[0] - hipX) ** 2 - (kneeAt[2] - SKELETON.hip) ** 2;
  const pelvis: Vec3 = knee > 0 ? [hipX, kneeAt[1] + Math.sqrt(Math.max(0, reach)), 0] : hipsRolledBack(extend);
  const rightHip: Vec3 = [pelvis[0], pelvis[1], SKELETON.hip];
  // The shin sweeps round low under the body, from lying straight back to lying across, the foot
  // just off the floor on the way.
  const shinTo: Vec3 = [(PIGEON_ANKLE[0] - PIGEON_KNEE[0]) / SKELETON.shin, 0, (PIGEON_ANKLE[2] - PIGEON_KNEE[2]) / SKELETON.shin];
  const shin = unitOf(turnToward([-1, 0, 0], shinTo, knee).map((v, i) => v + (i === 1 ? 0.12 * lift : 0)));
  const ankle = along3(kneeAt, shin, 0.999 * SKELETON.shin);
  return {
    pelvis,
    rightFoot: { ...pinVia(rightHip, kneeAt, ankle), toward: turnToward([-1, 0, 0], [0.2, 0, -1], knee) },
    leftFoot: leftLegBack(pelvis, extend),
  };
};

/**
 * From all fours (0) into the pigeon on straight arms, the hands planted where they were (1), then
 * folded forward onto the forearms (2). The body tips forward as far as keeps the shoulders where
 * the arms reach.
 */
const pigeonAt = (t: number): Pose3 => {
  const legs = pigeonLegs(Math.min(1, t));
  const fold = phase(t, 1, 2);
  const spine = PIGEON_FOLD.spine * fold;
  const body = (lean: number): Pose3 => ({
    pelvis: legs.pelvis,
    lean,
    spine: { flex: spine },
    neck: { flex: mix(-lean * 0.35, PIGEON_FOLD.neck, fold) },
    pins: { rightFoot: legs.rightFoot, leftFoot: legs.leftFoot },
  });
  const planted = (side: 1 | -1): Vec3 => [112, WRIST_Y, side * 30];
  // Up on the hands the arms are a little bent; folded, the shoulders are an upper arm above the floor.
  const reach = 0.97 * ARM_REACH;
  const upLean = leanWhere((l) => distance(solvePose(body(l)).rightArm[0], planted(1)) - reach, -20, 95);
  const downLean = fold > 0 ? leanWhere((l) => solvePose(body(l)).rightArm[0][1] - (SKELETON.upperArm + ELBOW_Y), 20, 110) : upLean;
  const pose = body(mix(upLean, downLean, fold));
  const skeleton = solvePose(pose);
  const hand = (side: 1 | -1): Pin => {
    const shoulder = shoulderOf(skeleton, side);
    const onHand: Pin = { at: planted(side), toward: [1, 0, 0], pole: [-1, 0, side * 0.4] };
    const forearm = forearmDown(shoulder, [shoulder[0] + 8, ELBOW_Y, side * 30], side * PIGEON_FOREARMS_IN);
    const pin = mixPin(onHand, forearm, fold);
    return { ...pin, at: withinReach(shoulder, pin.at, 0.999 * ARM_REACH) };
  };
  return { ...pose, pins: { ...pose.pins, rightHand: hand(1), leftHand: hand(-1) } };
};
const PIGEON_ALL_FOURS = pigeonAt(0);
const PIGEON_UP = pigeonAt(1);
const PIGEON_FOLDED = pigeonAt(2);
const PIGEON_SETUP_STEPS = 24;
const PIGEON_FOLD_STEPS = 16;

export const PIGEON_STRETCH_3D: Clip3D = {
  view: '3d',
  // From the front leg's side, a little in front and only just above the floor: the knee coming
  // forward and the back leg sliding out are flat on the screen, and folded, the front knee shows
  // beside the chest rather than under it. From higher up the chest came down over the knee.
  camera: { yaw: 30, pitch: 10 },
  highlight: ['rightLeg', 'leftLeg'],
  // The front leg is on the camera's side of the body the whole way. By depth, the knee lifting
  // forward went under the hips it's in front of, and the leg flipped under the chest partway
  // into the fold.
  over: ['rightLeg'],
  // The right shin crosses in front of the left hip, and the foot swings over the left leg on its
  // way there; the two swapped back and forth as it passed.
  //
  // The right knee comes forward just inside the right arm, about as deep as it, and lands behind
  // the wrist with the arm in front of it; they swapped as the knee went past.
  behind: [
    ['leftLeg', 'rightLeg'],
    ['rightLeg', 'rightArm'],
  ],
  // Folded onto the forearms.
  stillFrame: 3 + PIGEON_SETUP_STEPS + PIGEON_FOLD_STEPS,
  keyframes: [
    { ms: 0, pose: PIGEON_ALL_FOURS },
    { ms: 500, pose: PIGEON_ALL_FOURS },
    ...alongArc(2600, PIGEON_SETUP_STEPS, (t) => pigeonAt(t)),
    { ms: 600, pose: PIGEON_UP },
    ...alongArc(2000, PIGEON_FOLD_STEPS, (t) => pigeonAt(1 + t)),
    { ms: 3500, pose: PIGEON_FOLDED },
    ...alongArc(1800, PIGEON_FOLD_STEPS, (t) => pigeonAt(2 - t)),
    { ms: 300, pose: PIGEON_UP },
    ...alongArc(2400, PIGEON_SETUP_STEPS, (t) => pigeonAt(1 - t)),
  ],
};

// --- Hip circles: on all fours, one knee lifts and draws a big circle, forward, out to the side and back, then the other way round ---

/** All fours with a flat back and the head in line, as cat cow starts from. */
const HIP_CIRCLE_BODY = onAllFours(0, 0);
const HIP_CIRCLE_HIP: Vec3 = [ALL_FOURS.pelvis[0], ALL_FOURS.pelvis[1], SKELETON.hip];
/**
 * The knee's circle, as the angle the thigh swings forward from hanging straight down (back when
 * negative) and out to the side: the middle of it, and how far it goes either way. Forward the knee
 * comes up under the chest, out to the side the thigh is nearly level, back it reaches up behind
 * the hip, and at the bottom it's still just off the floor.
 */
const HIP_CIRCLE = { forward: 8, forwardBy: 42, out: 44, outBy: 22 };
/** The shin points back from the knee, tipped up a little so the foot stays off the floor. */
const HIP_CIRCLE_SHIN = unitOf([-1, 0.15, 0]);

/** The knee a thigh's length from the hip, the thigh swung this far forward and out from hanging. */
const hipCircleKnee = (forward: number, out: number): Vec3 => {
  const [f, o] = [radians(forward), radians(out)];
  return along3(HIP_CIRCLE_HIP, unitOf([Math.sin(f) * Math.cos(o), -Math.cos(f) * Math.cos(o), Math.sin(o)]), SKELETON.thigh);
};
/** The leg with its knee and shin here, the top of the foot flat on the floor kneeling (0) and the toes pointing once the knee is up (1). */
const hipCircleLeg = (knee: Vec3, shin: Vec3, lifted = 1): Pose3 => ({
  ...HIP_CIRCLE_BODY,
  pins: {
    ...HIP_CIRCLE_BODY.pins,
    rightFoot: { ...pinVia(HIP_CIRCLE_HIP, knee, along3(knee, shin, 0.999 * SKELETON.shin)), toward: unitOf([shin[0], shin[1] - 0.5 * lifted, shin[2]]) },
  },
});
/** Round the circle: 0 at the bottom, a quarter forward, a half out to the side, three quarters back. */
const hipCircleAt = (turn: number): Pose3 => {
  const a = 2 * Math.PI * turn;
  return hipCircleLeg(hipCircleKnee(HIP_CIRCLE.forward + HIP_CIRCLE.forwardBy * Math.sin(a), HIP_CIRCLE.out - HIP_CIRCLE.outBy * Math.cos(a)), HIP_CIRCLE_SHIN);
};
/** From kneeling (0) to the bottom of the circle (1), the knee lifting and the shin with it. */
const hipCircleLift = (t: number): Pose3 => {
  const bottom = hipCircleKnee(HIP_CIRCLE.forward, HIP_CIRCLE.out - HIP_CIRCLE.outBy);
  // On the arc the knee sweeps a thigh's length from the hip, from straight down on the floor.
  const knee = along3(HIP_CIRCLE_HIP, turnToward([0, -1, 0], unit3(sub3(bottom, HIP_CIRCLE_HIP)), t), SKELETON.thigh);
  return hipCircleLeg(knee, turnToward([-1, 0, 0], HIP_CIRCLE_SHIN, t), t);
};
const HIP_CIRCLE_KNEELING = hipCircleLift(0);
/**
 * Each circle is drawn in this many steps. It eases in and out, so the knee slows to a stop at the
 * bottom before going round the other way, rather than snapping back.
 */
const HIP_CIRCLE_STEPS = 36;
const HIP_CIRCLE_MS = 3200;

export const HIP_CIRCLES_3D: Clip3D = {
  view: '3d',
  // From behind and to the other side, a little above. The knee's circle is tilted, facing down
  // and out past the circling leg, so from that leg's own side it was seen almost edge on and
  // looked like a swing back and forth; from here it's seen nearly face on, out past the body.
  camera: { yaw: -120, pitch: 30 },
  highlight: ['rightLeg'],
  // The circling leg is on the far side of the kneeling one; they swapped as it passed behind.
  // From behind and above, the back of the head covers the base of the neck, though by the middle
  // of it the head is further away, and the neck showed over it.
  behind: [
    ['rightLeg', 'leftLeg'],
    ['torso', 'head'],
  ],
  // Out to the side.
  stillFrame: 1 + 6 + HIP_CIRCLE_STEPS / 2,
  keyframes: [
    { ms: 0, pose: HIP_CIRCLE_KNEELING },
    { ms: 500, pose: HIP_CIRCLE_KNEELING },
    ...alongArc(700, 6, hipCircleLift),
    ...alongArc(HIP_CIRCLE_MS, HIP_CIRCLE_STEPS, hipCircleAt),
    // Back round the other way.
    ...alongArc(HIP_CIRCLE_MS, HIP_CIRCLE_STEPS, (t) => hipCircleAt(1 - t)),
    ...alongArc(700, 6, (t) => hipCircleLift(1 - t)),
  ],
};

// --- The Breakdancer: from sitting back on the hands with both legs straight, one foot draws in against the other's inner thigh, then folding forward to hold the straight leg's foot ---

/**
 * The bent leg's foot lies along the inside of the straight thigh, sole against it, toes toward the
 * knee, its heel this far ahead of the hips, and the knee drops out to the side toward the floor.
 */
const BREAKDANCER_HEEL_AHEAD = 52;
/** The chest turns this far toward the straight leg as it folds, squaring up over it. */
const BREAKDANCER_TWIST = 14;
/** How far the arms reach at the bottom of the fold: long, holding the foot. */
const BREAKDANCER_REACH = 0.97;

/**
 * The left foot as the leg bends in, from lying straight beside the other with the toes up (0):
 * the heel draws in along the floor toward the hips, the knee rising, and then the knee drops out
 * to the side as the foot rolls onto its outer edge, its sole against the inside of the straight
 * thigh, toes toward its knee (1).
 */
const breakdancerLeftFoot = (bend: number): Pin => {
  const [hip, , ankle, toes] = PIKE_LEGS.leftLeg;
  const straight = PIKE_LEGS.rightLeg;
  const thigh = mix3(straight[0], straight[1], BREAKDANCER_HEEL_AHEAD / SKELETON.thigh);
  const against: Vec3 = [thigh[0], ANKLE_Y + 2, straight[0][2] - 21];
  // Drawn in, the foot is out to the side, so the raised shin stays clear of the straight leg; it
  // only comes in against the thigh as the knee drops, low enough to go behind it.
  const drawnIn: Vec3 = [against[0] + 6, ANKLE_Y, hip[2] - 22];
  const drawIn = phase(bend, 0, 0.6);
  const drop = phase(bend, 0.45, 1);
  return {
    at: mix3(mix3(ankle, drawnIn, drawIn), against, drop),
    toward: turnToward(turnToward(unit3(sub3(toes, ankle)), [1, 0, 0], drawIn), unit3([1, 0.1, 0.12]), drop),
    pole: mix3(mix3([0, 1, 0], [0.2, 1, -0.35], drawIn), [0.25, 0.2, -1], drop),
  };
};
/** Seated with the left leg bent this far in, and folded forward with the pelvis tipped this far, the straight leg flat with its toes up. */
const breakdancerBody = (lean: number, fold: number, bend = 1): Pose3 => ({
  pelvis: [0, SIT_PELVIS_Y, 0],
  lean,
  spine: { flex: PIKE_ROUNDING.spine * lean, twist: -BREAKDANCER_TWIST * fold },
  // Leaning back, the head stays upright, looking down the legs: tipped back with the body, the face
  // turned up to the camera and the nose showed, then went as the head dropped into the fold.
  neck: { flex: lean < 0 ? -lean : PIKE_ROUNDING.neck * lean },
  rightLeg: { flex: 90 - SIT_LEG_DROP + lean, ankle: SIT_LEG_DROP },
  pins: { leftFoot: breakdancerLeftFoot(bend) },
});
/** Where the hands hold the straight leg's foot: either side of it, toward the sole. */
const breakdancerHold = (side: 1 | -1): Vec3 => {
  const [, , ankle, toes] = PIKE_LEGS.rightLeg;
  const [x, y, z] = mix3(ankle, toes, PIKE_FOOT_HOLD);
  return [x + PIKE_HAND_FORWARD, y + PIKE_HAND_UP, z + side * PIKE_HAND_OUT];
};
/** Sitting up, the body leans back a little onto the hands, planted on the floor behind the hips, fingers forward. */
const BREAKDANCER_LEAN_BACK = -8;
/** The arms are nearly straight down to the hands, the elbows bending a little back and out. */
const BREAKDANCER_PLANTED_REACH = 0.96 * ARM_REACH;
const BREAKDANCER_HANDS_OUT = 36;
const BREAKDANCER_PLANTED_X = (() => {
  const shoulder = solvePose(breakdancerBody(BREAKDANCER_LEAN_BACK, 0, 0)).rightArm[0];
  const across = BREAKDANCER_HANDS_OUT - shoulder[2];
  return shoulder[0] - Math.sqrt(BREAKDANCER_PLANTED_REACH ** 2 - (shoulder[1] - WRIST_Y) ** 2 - across ** 2);
})();
const breakdancerPlanted = (side: 1 | -1): Pin => ({
  at: [BREAKDANCER_PLANTED_X, WRIST_Y, side * BREAKDANCER_HANDS_OUT],
  toward: [1, 0, 0],
  pole: [-1, 0, side * 0.5],
});
/** A point this far along the curve that starts at `a`, heads toward `b` and ends at `c`. */
const curve = (a: Vec3, b: Vec3, c: Vec3, u: number): Vec3 => mix3(mix3(a, b, u), mix3(b, c, u), u);
/** Lifting off the floor, a hand comes round beside the hip and up over the thigh before reaching on. */
const BREAKDANCER_HAND_LIFT_ENDS = 0.4;
/**
 * Where a hand is this far along its way to the foot: up off the floor behind, round beside the
 * hip and over its thigh, then in an arc a little up off the straight shin to hold the foot, the
 * right on the outside of it and the left, coming over the bent leg, on the inside.
 */
const breakdancerHand = (side: 1 | -1, p: number): Vec3 => {
  const [hip, , ankle] = PIKE_LEGS.rightLeg;
  const planted = breakdancerPlanted(side).at;
  const beside: Vec3 = [35, 40, side * 46];
  const [overX, overY, overZ] = mix3(hip, ankle, 0.9);
  const over: Vec3 = [overX, overY + PIKE_HAND_UP + PIKE_HAND_ARC, overZ + side * PIKE_HAND_OUT];
  // Low round past the hip: lifted high on the way, the far arm flung up past its shoulder.
  if (p < BREAKDANCER_HAND_LIFT_ENDS) return curve(planted, [planted[0] + 40, 38, side * 48], beside, p / BREAKDANCER_HAND_LIFT_ENDS);
  return curve(beside, over, breakdancerHold(side), (p - BREAKDANCER_HAND_LIFT_ENDS) / (1 - BREAKDANCER_HAND_LIFT_ENDS));
};
/** The fingers point forward on the floor and down the leg on the way, then turn in round the foot, the right across the sole. */
const breakdancerFingers = (side: 1 | -1, p: number): Vec3 =>
  mix3(mix3([1, 0, 0], [1, -0.1, 0], phase(p, 0, BREAKDANCER_HAND_LIFT_ENDS)), side === 1 ? PIKE_WRAP.near : [0.6, 0, 0.8], phase(p, 0.8, 1));
/** Folded, the pelvis tips forward as far as brings the shoulders where both arms reach the foot, long. */
const BREAKDANCER_FOLD_LEAN = leanWhere((lean) => {
  const s = solvePose(breakdancerBody(lean, 1));
  return Math.max(
    distance(s.rightArm[0], breakdancerHold(1)) - BREAKDANCER_REACH * ARM_REACH,
    distance(s.leftArm[0], breakdancerHold(-1)) - BREAKDANCER_REACH * ARM_REACH
  );
}, -10, 80);

/**
 * Leaning back on the hands with the left leg this far bent in (0 to 1), and this far into the
 * reach (0 to 1): the hands come up off the floor and reach for the foot as the body comes up and
 * folds forward over the straight leg, from the start of it.
 */
const breakdancerPose = (bend: number, p: number): Pose3 => {
  const body = breakdancerBody(mix(BREAKDANCER_LEAN_BACK, BREAKDANCER_FOLD_LEAN, p), p, bend);
  const skeleton = solvePose(body);
  const hand = (side: 1 | -1): Pin => {
    if (p === 0) return breakdancerPlanted(side);
    return {
      at: withinReach(shoulderOf(skeleton, side), breakdancerHand(side, p), 0.999 * ARM_REACH),
      toward: breakdancerFingers(side, p),
      // The elbows point back and out, level, while the hands come round low under the shoulders, and
      // turn down and out as the arms reach along the leg. Pointed down while the hands were under the
      // shoulders, the elbow's direction lay along the arm, and the elbows whipped round.
      pole: mix3(mix3(breakdancerPlanted(side).pole!, [-0.8, 0, side * 0.5], phase(p, 0, BREAKDANCER_HAND_LIFT_ENDS)), [0, -0.4, side], phase(p, BREAKDANCER_HAND_LIFT_ENDS, 0.85)),
    };
  };
  return { ...body, pins: { ...body.pins, rightHand: hand(1), leftHand: hand(-1) } };
};
/** The reach starts this far into the leg's bend, so the two run on into each other without a pause between. */
const BREAKDANCER_REACH_FROM = 0.55;
/** Going in, the left leg bends in and runs straight on into the reach, from 0 to 1. */
const breakdancerIn = (u: number): Pose3 => {
  // The bend takes 1.6s and the reach 2.4s, half as long again, starting near the end of the bend.
  const split = 1 / (BREAKDANCER_REACH_FROM + 1.5);
  return breakdancerPose(phase(u, 0, split), phase(u, BREAKDANCER_REACH_FROM * split, 1));
};
const BREAKDANCER_STRAIGHT = breakdancerPose(0, 0);
const BREAKDANCER_FOLDED = breakdancerPose(1, 1);
const BREAKDANCER_STEPS = 16;

export const THE_BREAKDANCER_3D: Clip3D = {
  view: '3d',
  // From the straight leg's side and well above: the bent knee shows dropped out to the far side
  // with its foot against the straight thigh, and the fold goes down along the straight leg. From
  // lower down the bent leg was hidden behind the straight one and the body.
  camera: { yaw: 30, pitch: 60 },
  highlight: ['rightLeg', 'leftLeg'],
  // Reaching for the foot, both arms come over the legs: the right over its own, the left over the
  // bent leg and across. Planted behind, the arms are clear of the legs, but by depth they swapped
  // back and forth with them as the leg bent in.
  behind: [
    ['rightLeg', 'rightArm'],
    ['leftLeg', 'leftArm'],
    ['leftLeg', 'rightArm'],
    // The straight leg is on the camera's side of the bent one throughout. With the feet still
    // together, the bending leg came over it as the knee started to rise.
    ['leftLeg', 'rightLeg'],
    // The bent leg comes off the far hip, under the pelvis; by depth its thigh came over the hips as
    // the knee rose, and went back under as it dropped out.
    ['leftLeg', 'torso'],
  ],
  // Holding the foot.
  stillFrame: 1 + 2 * BREAKDANCER_STEPS,
  keyframes: [
    { ms: 0, pose: BREAKDANCER_STRAIGHT },
    { ms: 600, pose: BREAKDANCER_STRAIGHT },
    // The bend and the reach as one move, about 1.6s bending in and 2.4s reaching, overlapping.
    ...alongArc(3800, 2 * BREAKDANCER_STEPS, breakdancerIn),
    { ms: 3500, pose: BREAKDANCER_FOLDED },
    ...alongArc(2200, BREAKDANCER_STEPS, (t) => breakdancerPose(1, 1 - t)),
    ...alongArc(1400, BREAKDANCER_STEPS, (t) => breakdancerPose(1 - t, 0)),
  ],
};

// --- Scap mobilization: on all fours with the arms straight, the chest sinks between the shoulder blades, then pushes the floor away ---

/**
 * How far the shoulder blades slide round the ribs: back in toward the spine as the chest sinks,
 * and forward as the hands push the floor away. The shoulders move about 11 either way.
 */
const SCAP = { sunk: -22, pushed: 22 };
/** The upper back arches a little as the chest sinks and rounds as it pushes up. */
const SCAP_SPINE = { sunk: -6, pushed: 10 };

/**
 * All fours as in cat cow, the hands and knees planted, the shoulder blades this far round from
 * resting (-1 sunk, 1 pushed away). The arms stay straight, so the body tips over the knees until
 * the shoulders are an arm's length from the hands: as the blades pull in, the chest sinks between
 * them, and as they push out, it rises.
 */
const scapAt = (s: number): Pose3 => {
  const protract = s < 0 ? -s * SCAP.sunk : s * SCAP.pushed;
  const flex = s < 0 ? -s * SCAP_SPINE.sunk : s * SCAP_SPINE.pushed;
  const arms = { rightArm: { protract }, leftArm: { protract } };
  const body = (lean: number): Pose3 => ({ ...ALL_FOURS, ...arms, lean, spine: { flex }, neck: { flex: -flex / 2 } });
  return body(straightArmLean(body, ALL_FOURS.pins.rightHand.at));
};
/**
 * One rep, from pushed up (0) down to sunk (0.5) and back up (1), as a wave: the chest slows into
 * each end and turns straight round, with no pause between one rep and the next.
 */
const scapRep = (u: number): Pose3 => scapAt(Math.cos(2 * Math.PI * u));
const SCAP_REP_MS = 3200;
const SCAP_STEPS = 32;

export const SCAP_MOBILIZATION_3D: Clip3D = {
  view: '3d',
  // From the side, a little toward the head and above: the line of the back dips between the
  // shoulders and rounds up over them. From the front the head hid the shoulders.
  camera: { yaw: 12, pitch: 14 },
  highlight: ['torso'],
  // Sunk between the shoulder blades.
  stillFrame: SCAP_STEPS / 2,
  // Evenly spaced along the wave and not eased, so it flows through every frame and from the end of
  // one rep straight into the next.
  keyframes: [
    { ms: 0, pose: scapRep(0) },
    ...Array.from({ length: SCAP_STEPS }, (_, i): Keyframe3 => ({ ms: SCAP_REP_MS / SCAP_STEPS, pose: scapRep((i + 1) / SCAP_STEPS), ease: 'none' })),
  ],
};

// --- Lizard pose: a low lunge with the front foot outside the hands and the back knee down, lowering onto the forearms as the hips sink ---

/** The back knee rests on the floor here, its shin and the top of its foot flat behind, and the hips swing forward and down around it. */
const LIZARD_BACK_KNEE: Vec3 = [-150, ANKLE_Y, -SKELETON.hip];
/** How far the back thigh tips forward from upright: on the hands to start with, and sunk on the forearms. */
const LIZARD_THIGH = { up: 42, sunk: 62 };
/** The front foot is planted flat out to the side of the right hand, the toes turned out a little. */
const LIZARD_FOOT: Vec3 = [22, ANKLE_Y, 68];
const LIZARD_TOES_OUT = 12;
/** The front knee points up and forward straight over the foot, not out to the side. */
const LIZARD_KNEE: Vec3 = [0.57, 0.48, 0.42];
/** Up on the hands they're planted inside the front foot, shoulder-width apart. */
const LIZARD_HANDS_X = 40;
/** The forearms come down angled in a little toward each other. */
const LIZARD_FOREARMS_IN = 12;

/**
 * The body from up on straight-ish arms (0) to down where the shoulders are an upper arm above the
 * floor (1): the back thigh tips forward around the planted back knee, so the hips sink toward the
 * floor and forward, and the body tips over. The front knee points straight over the toes, opening
 * the groin; the back hip opens at the front. No hands: they're placed on it.
 */
const lizardBody = (t: number): Pose3 => {
  const thigh = radians(mix(LIZARD_THIGH.up, LIZARD_THIGH.sunk, t));
  const pelvis: Vec3 = [LIZARD_BACK_KNEE[0] + SKELETON.thigh * Math.sin(thigh), ANKLE_Y + SKELETON.thigh * Math.cos(thigh), 0];
  const toesOut = radians(LIZARD_TOES_OUT);
  const legs: NonNullable<Pose3['pins']> = {
    rightFoot: { at: LIZARD_FOOT, toward: [Math.cos(toesOut), 0, Math.sin(toesOut)], pole: LIZARD_KNEE },
    leftFoot: { at: [LIZARD_BACK_KNEE[0] - SKELETON.shin, ANKLE_Y, LIZARD_BACK_KNEE[2]], toward: [-1, 0, 0], pole: [1, -1, 0] },
  };
  const body = (lean: number): Pose3 => ({ pelvis, lean, neck: { flex: -0.4 * lean }, pins: legs });
  // Up on the hands the arms are a little bent; down, the shoulders are an upper arm above the floor.
  const upLean = leanWhere((l) => distance(solvePose(body(l)).rightArm[0], lizardPlanted(1)) - 0.99 * ARM_REACH, -20, 100);
  const downLean = leanWhere((l) => solvePose(body(l)).rightArm[0][1] - (SKELETON.upperArm + ELBOW_Y), 20, 110);
  return body(mix(upLean, downLean, t));
};
/** Where the hands are planted up on them, inside the front foot, shoulder-width apart. */
const lizardPlanted = (side: 1 | -1): Vec3 => [LIZARD_HANDS_X, WRIST_Y, side * SKELETON.shoulder];
/** Each forearm flat on the floor in front of its shoulder, as it is once the body is down. */
const lizardForearm = (skeleton: Skeleton, side: 1 | -1): Pin => {
  const shoulder = shoulderOf(skeleton, side);
  return forearmDown(shoulder, [shoulder[0] + 6, ELBOW_Y, side * SKELETON.shoulder], side * LIZARD_FOREARMS_IN);
};
/** Where each wrist ends up, with the forearm flat on the floor. */
const LIZARD_WRISTS = (() => {
  const skeleton = solvePose(lizardBody(1));
  return { right: lizardForearm(skeleton, 1).at, left: lizardForearm(skeleton, -1).at };
})();

/**
 * A hand `s` of the way through its move from where it was planted to where its forearm lies: up
 * off the floor, forward through the air, and straight down, then the elbow coming down behind
 * it. Moving forward all the way to the floor, the hand slid in as it landed.
 */
const lizardHand = (skeleton: Skeleton, side: 1 | -1, s: number, lands: number): Pin => {
  const shoulder = shoulderOf(skeleton, side);
  const end = side === 1 ? LIZARD_WRISTS.right : LIZARD_WRISTS.left;
  const travel = Math.min(1, s / lands);
  const along = mix3(lizardPlanted(side), end, phase(travel, 0.15, 0.85));
  const at: Vec3 = [along[0], along[1] + Math.sin(Math.PI * travel) * 14, along[2]];
  const onHand: Pin = { at, toward: [1, 0, 0], pole: [-1, 0, side * 0.4] };
  const settle = phase(s, lands, 1);
  if (settle === 0) return { ...onHand, at: withinReach(shoulder, at, 0.999 * ARM_REACH) };
  // The elbow travels from where it is, off the hand, to its place on the floor behind it. Turning
  // the way it points instead, the folded arm's elbow swung across in a single frame as it set off.
  const forearm = lizardForearm(skeleton, side);
  const from = solveJoint3(shoulder, at, SKELETON.upperArm, SKELETON.forearm, onHand.pole!);
  const to = solveJoint3(shoulder, at, SKELETON.upperArm, SKELETON.forearm, forearm.pole!);
  return { ...pinVia(shoulder, mix3(from, to, settle), at), toward: mix3(onHand.toward!, forearm.toward!, settle) };
};
/**
 * `t` of the way down, and the left hand `left` of the way to its place. The right hand reaches out
 * the whole time the body is going down, landing as it gets there, and its elbow settles behind it;
 * the left one waits where it was planted, its arm bending as the body comes down over it, and
 * only then follows. As one quick step each with both hands waiting till the body was nearly down,
 * the arms flicked out.
 */
const lizardAt = (t: number, left: number): Pose3 => {
  const pose = lizardBody(t);
  const skeleton = solvePose(pose);
  return { ...pose, pins: { ...pose.pins, rightHand: lizardHand(skeleton, 1, t, LIZARD_LANDS.right), leftHand: lizardHand(skeleton, -1, left, LIZARD_LANDS.left) } };
};
/** How far through its move each hand touches down, before its elbow comes down behind it. */
const LIZARD_LANDS = { right: 0.8, left: 0.8 };
const LIZARD_UP = lizardAt(0, 0);
const LIZARD_DOWN = lizardAt(1, 1);
/**
 * Down onto the forearms as one move, from 0 to 1: the body goes down over the first part of it,
 * the right hand reaching out with it, and the left hand sets off as the body settles the last of
 * the way and the right elbow comes down. Done one after the other, the body stopped and the left
 * hand took too long to follow.
 */
const LIZARD_MOVE = { bodyEnds: 0.62, leftFrom: 0.5 };
const lizardMove = (u: number): Pose3 => lizardAt(phase(u, 0, LIZARD_MOVE.bodyEnds), Math.max(0, (u - LIZARD_MOVE.leftFrom) / (1 - LIZARD_MOVE.leftFrom)));
/** Fine enough that a hand's step is drawn as an arc that lands, not a line that slides in. */
const LIZARD_STEPS = 80;
/** The move's frames evenly along it and not eased again: the body and the hands ease themselves. */
const lizardFrames = (ms: number, at: (u: number) => Pose3): Keyframe3[] =>
  Array.from({ length: LIZARD_STEPS }, (_, i) => ({ ms: ms / LIZARD_STEPS, pose: at((i + 1) / LIZARD_STEPS), ease: 'none' as const }));

export const LIZARD_POSE_3D: Clip3D = {
  view: '3d',
  // From the front leg's side, a little in front and just above: the front knee bends straight over
  // the foot, the hips sink toward the floor and the forearms come down inside the front leg. From in
  // front the knee pointed at the camera and the leg looked straight; turned further toward the
  // front, the front leg and the right arm swapped as the body came down.
  camera: { yaw: 10, pitch: 20 },
  highlight: ['rightLeg', 'leftLeg'],
  // Down on the forearms.
  stillFrame: 1 + LIZARD_STEPS,
  keyframes: [
    { ms: 0, pose: LIZARD_UP },
    { ms: 500, pose: LIZARD_UP },
    ...lizardFrames(4000, lizardMove),
    { ms: 3500, pose: LIZARD_DOWN },
    // Back up the same way: the left hand first, then the right one with the body.
    ...lizardFrames(3600, (u) => lizardMove(1 - u)),
  ],
};

// --- Figure four stretch: lying on the back with the knees bent, one ankle crosses over the other knee, and the hands pull the bottom thigh in ---

const FOUR_HIP = (side: 1 | -1): Vec3 => [LYING_ON_BACK.pelvis[0], LYING_ON_BACK.pelvis[1], side * SKELETON.hip];
/**
 * The bottom (left) thigh's angle up from the floor toward the head, and its knee's bend: planted
 * as in floor angels to start with, lifted off the floor with the knee at 90° for the hands to
 * take hold, and pulled in toward the chest.
 */
const FOUR_PLANTED = (Math.atan2(ANGEL_KNEE.y - LYING_ON_BACK.pelvis[1], ANGEL_KNEE.x) * 180) / Math.PI;
const FOUR_THIGH = { lifted: 85, pulled: 124 };
/** The bottom knee is at 90° when the hands take hold, and bends further as the thigh is pulled in. */
const FOUR_KNEE = { lifted: 90, pulled: 45 };
/**
 * The hands clasp behind the bottom thigh this far along it from the hip, right by the knee, the
 * right hand round the right leg and the left round the outside. They reach it once the thigh is
 * lifted.
 */
const FOUR_GRIP_ALONG = 0.86;
/** The top (right) ankle rests on the front of the bottom thigh this far back from the knee, just past it to the left. */
const FOUR_ANKLE_BACK = 14;
const FOUR_ANKLE_PAST = 10;
/**
 * Resting, the near (right) hand lies on the belly and the far one on the floor beside the hip: the
 * far arm goes round behind the left leg to the clasp, so it stays behind the body and the leg.
 */
const FOUR_REST = (side: 1 | -1): Pin =>
  side === 1 ? { at: [-25, 52, 16], toward: [0.3, 0, -1], pole: [-0.2, -0.6, 1] } : { at: [20, ARM_REST_Y, -46], toward: [1, 0, 0], pole: [0.2, -0.6, -1] };

/** The bottom leg with its thigh this far up from the floor, and `fold` (0 to 1) of the way into the knee's extra bend as it's pulled in. */
const fourBottomLeg = (thighDegrees: number, fold = 0) => {
  const hip = FOUR_HIP(-1);
  const thigh = radians(thighDegrees);
  const along: Vec3 = [Math.cos(thigh), Math.sin(thigh), 0];
  const knee = along3(hip, along, SKELETON.thigh);
  // The knee opens from its planted bend to 90° as the foot comes off the floor, then bends further
  // as the thigh is pulled in.
  const plantedShin = Math.atan2(ANKLE_Y - ANGEL_KNEE.y, ANGEL_ANKLE_X - ANGEL_KNEE.x);
  const lift = Math.min(1, Math.max(0, (thighDegrees - FOUR_PLANTED) / (FOUR_THIGH.lifted - FOUR_PLANTED)));
  const kneeAngle = radians(mix(FOUR_KNEE.lifted, FOUR_KNEE.pulled, smooth(fold)));
  const shinAngle = mix(plantedShin - radians(FOUR_PLANTED), kneeAngle - Math.PI, smooth(lift)) + thigh;
  const ankle = along3(knee, [Math.cos(shinAngle), Math.sin(shinAngle), 0], 0.999 * SKELETON.shin);
  // The front of the thigh, away from the back of it where the hands hold.
  const front: Vec3 = [-Math.sin(thigh), Math.cos(thigh), 0];
  // The foot keeps its angle to the shin: flat on the floor planted, and turning up with the shin as it lifts.
  const foot = shinAngle - plantedShin;
  return { hip, knee, ankle, along, front, pin: { ...pinVia(hip, knee, ankle), toward: [Math.cos(foot), Math.sin(foot), 0] } as Pin };
};

/**
 * The right ankle resting across the left thigh just below the knee all the way through, its knee
 * open to the side. `reach` takes the hands from the floor to clasped behind the left thigh;
 * `pull` the left thigh from planted (0) to lifted (1) to pulled in (2), carrying the right leg with it.
 */
const figureFourAt = (reach: number, pull: number): Pose3 => {
  // The thigh comes in at one steady rate the whole way; the knee opens to 90° until the hands can
  // take hold, then bends on. Split into a lift and a pull, the thigh braked hard between them.
  const thigh = mix(FOUR_PLANTED, FOUR_THIGH.pulled, pull / 2);
  const bottom = fourBottomLeg(thigh, Math.max(0, (thigh - FOUR_THIGH.lifted) / (FOUR_THIGH.pulled - FOUR_THIGH.lifted)));
  // Resting on the front of the left thigh, just below the knee, past it to the left.
  const ankle = along3(along3(along3(bottom.knee, bottom.along, -FOUR_ANKLE_BACK), bottom.front, 13), [0, 0, -1], FOUR_ANKLE_PAST);
  const rightFoot: Pin = { at: ankle, toward: unitOf([0.2, 0.35, -1]), pole: [0.25, 0.55, 1] };
  const pose: Pose3 = { ...LYING_ON_BACK, pins: { rightFoot, leftFoot: bottom.pin } };
  const skeleton = solvePose(pose);
  const grip = (side: 1 | -1): Pin => ({
    at: along3(along3(along3(bottom.hip, bottom.along, FOUR_GRIP_ALONG * SKELETON.thigh), bottom.front, -13), [0, 0, 1], side * 11),
    toward: [0, 0, -side],
    pole: [0, 0.2, side],
  });
  const hand = (side: 1 | -1): Pin => {
    const r = smooth(reach);
    const [from, to] = [FOUR_REST(side), grip(side)];
    // On one smooth curve: the right hand comes up over the belly and round the right leg, rather
    // than through the right thigh; the left one comes up off the floor round the outside of the left
    // thigh.
    const via = FOUR_VIA[side === 1 ? 'right' : 'left'];
    const at = mix3(mix3(from.at, via, r), mix3(via, to.at, r), r);
    const pin = { ...mixPin(from, to, r), at };
    return { ...pin, at: withinReach(shoulderOf(skeleton, side), pin.at, 0.999 * ARM_REACH) };
  };
  return { ...pose, pins: { ...pose.pins, rightHand: hand(1), leftHand: hand(-1) } };
};
/**
 * The hands set off this far into the move and take hold this far into it, once the thigh has come
 * near enough to reach: setting off with the thigh, they ran out of reach partway and stalled.
 */
/** The hands' paths bend toward these points on the way from resting to the clasp. */
const FOUR_VIA: Record<'right' | 'left', Vec3> = { right: [-15, 85, 2], left: [-10, 90, -60] };
const FOUR_REACH = { from: 0.3, to: 0.88 };
/**
 * From crossed (0) to pulled in (1) as one move: the left foot comes off the floor and the thigh
 * comes in all the way without stopping, the hands reaching for it on the way. As two moves, lifting
 * and then pulling, everything stopped dead between them.
 */
const figureFourMove = (u: number): Pose3 => figureFourAt(Math.min(1, Math.max(0, (u - FOUR_REACH.from) / (FOUR_REACH.to - FOUR_REACH.from))), 2 * u);
const FOUR_CROSSED = figureFourMove(0);
const FOUR_PULLED = figureFourMove(1);
const FOUR_STEPS = 24;

export const FIGURE_FOUR_STRETCH_3D: Clip3D = {
  view: '3d',
  // From behind the head on the right side, well above: the right leg makes the four, its shin
  // lying across the left thigh with the knee open toward the camera, and the left thigh pulls in
  // over the belly. From the feet end the hands were hidden behind the thigh and the figure was
  // small; from the right side the open knee pointed at the camera.
  camera: { yaw: -30, pitch: 50 },
  highlight: ['rightLeg'],
  // The left knee is up above the belly from the start, nearer the camera than the body; by depth
  // the thigh went under the torso and over it again as it was pulled in.
  over: ['leftLeg'],
  behind: [
    // The right arm reaches in between the legs, under the right shin lying across, and the hands
    // clasp under the back of the left thigh: by depth the arm came over each leg for a few frames
    // on the way.
    ['rightArm', 'rightLeg'],
    ['rightArm', 'leftLeg'],
    // The face is turned up to the camera and the chin covers the neck; by depth the neck showed
    // through the head.
    ['torso', 'head'],
    // The far arm stays behind the body and behind the left leg it reaches round.
    ['leftArm', 'torso'],
    ['leftArm', 'leftLeg'],
  ],
  // The near forearm wraps round the right leg to the hands clasped behind the left thigh, its upper
  // arm under the shin and the forearm over it, and over the belly the hand rests on to start with.
  // Drawn whole, the arm went under the legs and the hand was lost. The far arm stays behind
  // everything: it goes round behind the left leg.
  holds: [{ hand: 'rightHand', limb: 'rightLeg', forearm: true }],
  // Pulled in.
  stillFrame: 1 + FOUR_STEPS,
  keyframes: [
    { ms: 0, pose: FOUR_CROSSED },
    { ms: 600, pose: FOUR_CROSSED },
    ...alongArc(3000, FOUR_STEPS, figureFourMove),
    { ms: 3500, pose: FOUR_PULLED },
    ...alongArc(2600, FOUR_STEPS, (t) => figureFourMove(1 - t)),
  ],
};

// --- Finger tendon glides: close up on both hands held up, the fingers moving from straight through a hook fist, a full fist and a flat fist ---

/** Where the right shoulder is, standing. */
const GLIDE_SHOULDER = solvePose(STANDING).rightArm[0];
/**
 * The right elbow, out to the side and a little forward, below the wrist. The hands are held up
 * either side of the head, wide enough that the fingers curling in toward the middle stay clear of
 * it, with the forearms upright.
 */
const GLIDE_ELBOW: Vec3 = [GLIDE_SHOULDER[0] + 30, 0, 75];
const GLIDE_ELBOW_AT: Vec3 = [
  GLIDE_ELBOW[0],
  GLIDE_SHOULDER[1] - Math.sqrt(SKELETON.upperArm ** 2 - (GLIDE_ELBOW[0] - GLIDE_SHOULDER[0]) ** 2 - (GLIDE_ELBOW[2] - GLIDE_SHOULDER[2]) ** 2),
  GLIDE_ELBOW[2],
];
const GLIDE_WRIST: Vec3 = [GLIDE_ELBOW_AT[0], GLIDE_ELBOW_AT[1] + SKELETON.forearm, GLIDE_ELBOW_AT[2]];

/**
 * Both hands up, the fingers pointing at the ceiling and the palms facing each other, the fingers
 * bent this far. The hand is pinned, since it's the palm that has to face in: on an arm posed by
 * its angles that takes the elbows in at the shoulders' width.
 */
const glide = (fingers: Fingers): Pose3 => {
  const hand = (side: 1 | -1): Pin => ({
    ...pinVia([GLIDE_SHOULDER[0], GLIDE_SHOULDER[1], side * GLIDE_SHOULDER[2]], [GLIDE_ELBOW_AT[0], GLIDE_ELBOW_AT[1], side * GLIDE_ELBOW_AT[2]], [GLIDE_WRIST[0], GLIDE_WRIST[1], side * GLIDE_WRIST[2]], [0, 1, 0]),
    palm: [0, 0, -side],
  });
  return {
    ...STANDING,
    rightArm: { fingers },
    leftArm: { fingers },
    pins: { rightHand: hand(1), leftHand: hand(-1) },
  };
};

/** The fingers straight; the knuckles straight and the other joints bent; everything bent; and the knuckles bent with the fingers straight. */
const GLIDE_STRAIGHT = glide({ knuckle: 0, middle: 0, tip: 0 });
const GLIDE_HOOK = glide({ knuckle: 0, middle: 95, tip: 85 });
const GLIDE_FULL_FIST = glide({ knuckle: 85, middle: 95, tip: 70 });
const GLIDE_FLAT_FIST = glide({ knuckle: 90, middle: 0, tip: 0 });

export const FINGER_TENDON_GLIDES_3D: Clip3D = {
  view: '3d',
  // Close up from the front: the palms face each other, so the camera looks at the hands from the
  // thumb's side, the fingers one behind the other, and every bend shows in profile as they curl
  // in toward the middle.
  camera: { yaw: 90, pitch: 12, fit: 'hands' },
  highlight: ['rightArm', 'leftArm'],
  // The hook fist.
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: GLIDE_STRAIGHT },
    { ms: 1100, pose: GLIDE_HOOK },
    { ms: 500, pose: GLIDE_HOOK },
    { ms: 1100, pose: GLIDE_FULL_FIST },
    { ms: 500, pose: GLIDE_FULL_FIST },
    { ms: 1100, pose: GLIDE_FLAT_FIST },
    { ms: 500, pose: GLIDE_FLAT_FIST },
    { ms: 1100, pose: GLIDE_STRAIGHT },
    { ms: 500, pose: GLIDE_STRAIGHT },
  ],
};

// --- Cuban rotation: a light dumbbell in each hand, the elbows lift out to shoulder height, then the forearms turn from hanging to pointing up ---

/** The arms hang at the sides, the palms facing back, a little out so the weights clear the thighs. */
const CUBAN_HANGING_ARM: ArmPose = { abduct: 10, elbow: 8, rotate: -90 };
/** The elbows out to the sides at shoulder height, bent to a right angle, the forearms hanging. */
const CUBAN_ROW_ARM: ArmPose = { abduct: 90, elbow: 90, rotate: -90 };

/** Both arms the same. */
const cuban = (arm: ArmPose): Pose3 => ({ ...STANDING, rightArm: arm, leftArm: arm });
const CUBAN_HANGING = cuban(CUBAN_HANGING_ARM);
const CUBAN_ROW = cuban(CUBAN_ROW_ARM);
const CUBAN_UP = cuban({ ...CUBAN_ROW_ARM, rotate: 90 });

export const CUBAN_ROTATION_3D: Clip3D = {
  view: '3d',
  // From the front and to the right, well above: both elbows show out at the sides, the far forearm
  // sweeps up across the screen, and the near one, pointing at the camera halfway round, still
  // shows its length from up here. Side on, the far arm was lost behind the body.
  camera: { yaw: 60, pitch: 28, fit: 'upper' },
  highlight: ['rightArm', 'leftArm'],
  dumbbells: ['rightHand', 'leftHand'],
  // Turned up, the weights over the elbows.
  stillFrame: 3,
  keyframes: [
    { ms: 0, pose: CUBAN_HANGING },
    { ms: 400, pose: CUBAN_HANGING },
    { ms: 1200, pose: CUBAN_ROW },
    { ms: 1400, pose: CUBAN_UP },
    { ms: 600, pose: CUBAN_UP },
    { ms: 1400, pose: CUBAN_ROW },
    { ms: 1200, pose: CUBAN_HANGING },
  ],
};

// --- Half spinal twist: the left leg long, the right foot planted outside the left knee; the left arm hugs the right knee and the chest turns toward it ---

/** The right foot is planted flat on the floor across the left leg, beside the left knee and outside it. */
const TWIST_FOOT: Vec3 = [72, ANKLE_Y, -48];
/** The right knee points up at the ceiling, crossing over toward the left. */
const TWIST_KNEE_POLE: Vec3 = [0.2, 1, -0.2];
/** The right hand rests on the floor behind the right hip, the fingers pointing back, to sit tall against. */
const TWIST_PROP: Vec3 = [-36, WRIST_Y, 34];
/** How far the spine and then the neck turn toward the right knee, looking back over the right shoulder. */
const TWIST = { spine: -42, neck: -38 };
/** How far the body tips forward from the hips, the hugging arm drawing the chest toward the knee. */
const TWIST_LEAN = 12;

const TWIST_SITTING: Pose3 = {
  pelvis: [0, SIT_PELVIS_Y, 0],
  lean: TWIST_LEAN,
  // The straight left leg lies along the floor, the toes up, as in sit and reach.
  leftLeg: { flex: 90 - SIT_LEG_DROP + TWIST_LEAN, ankle: SIT_LEG_DROP },
  pins: { rightFoot: { at: TWIST_FOOT, toward: [1, 0, -0.15], pole: TWIST_KNEE_POLE } },
};
/**
 * The left arm hugs the right knee just below it: the elbow out to the left of the knee, the
 * forearm straight across the front of the shin, snug against it, and the hand past its right side,
 * the fingers pointing back round it. The forearm is longer than the knee is wide, so the elbow and
 * the hand stand well out either side. A hand drawn in round the back of the knee took the straight
 * forearm through it.
 */
const TWIST_HUG_AT = { elbow: [24, 0, -50] as Vec3, hand: [22, -4, 25] as Vec3 };
const TWIST_HUG: Pin = (() => {
  const body = solvePose(TWIST_SITTING);
  const knee = body.rightLeg[1];
  const elbow: Vec3 = [knee[0] + TWIST_HUG_AT.elbow[0], knee[1] + TWIST_HUG_AT.elbow[1], knee[2] + TWIST_HUG_AT.elbow[2]];
  const hand: Vec3 = [knee[0] + TWIST_HUG_AT.hand[0], knee[1] + TWIST_HUG_AT.hand[1], knee[2] + TWIST_HUG_AT.hand[2]];
  return { ...pinVia(body.leftArm[0], elbow, toward(elbow, hand, SKELETON.forearm)), toward: [-1, 0, 0.3] };
})();

/** Sitting tall, turned this far toward the right knee (0 facing ahead, 1 the full twist). */
const halfSpinalTwist = (t: number): Pose3 => ({
  ...TWIST_SITTING,
  spine: { twist: TWIST.spine * t },
  neck: { twist: TWIST.neck * t },
  pins: {
    ...TWIST_SITTING.pins,
    leftHand: TWIST_HUG,
    rightHand: { at: TWIST_PROP, toward: [-1, 0, 0.2], pole: [-1, 0.2, 0.3] },
  },
});
const TWIST_AHEAD = halfSpinalTwist(0);
const TWIST_TURNED = halfSpinalTwist(1);

export const HALF_SPINAL_TWIST_3D: Clip3D = {
  view: '3d',
  // From the front and to the right, well above: the chest turns toward the camera, the shoulders
  // swinging round over the hips, and the hug, the planted foot and the hand behind all show. Lower
  // down, the right foot planted beyond the straight leg overlapped it on screen, and the nose came
  // and went as the face turned; from up here the face is never turned enough to show one.
  camera: { yaw: 65, pitch: 40 },
  highlight: ['torso'],
  // The right hand props the body up on the floor behind the hips, so the arm is behind the body
  // all the way. By depth its shoulder end came over the torso until the chest turned toward the camera.
  behind: [['rightArm', 'torso']],
  // Turned.
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: TWIST_AHEAD },
    { ms: 2000, pose: TWIST_TURNED },
    { ms: 3000, pose: TWIST_TURNED },
    { ms: 2000, pose: TWIST_AHEAD },
    { ms: 800, pose: TWIST_AHEAD },
  ],
};

// --- Half-twisted lizard: from the lizard, the right hand reaches up over the front knee and back as the chest turns open, the back shin comes up into it, and the hand draws the foot on in ---

/**
 * How far the back shin turns up from flat on the floor behind the knee, around the knee: where it
 * comes up into the waiting hand, a little past upright, and where the hand draws it on to, 70° up
 * from the floor in front of the knee, so the knee is bent to an acute angle with the calf still
 * well off the hamstring. The hand can't reach the foot any lower with the left one on the floor.
 */
const TWIST_LIZARD_SHIN = { meet: 95, held: 110 };
/**
 * Turned open: the hips sink as far as in the lizard on the forearms, and the chest turns to the
 * right, toward the front leg, so the right hand reaches back with the arm long and the left hand
 * still on the floor. Drawing the foot in, the body leans on forward a little and bends toward it.
 * The head turns back the other way, so it keeps looking down past the front hand: turned with the
 * chest, the face came round to the camera and the nose came and went.
 */
const TWIST_LIZARD = { sink: 1, twist: -70, neck: 45, lean: { meet: 40, held: 45 }, side: { meet: 0, held: -10 } };
/** How far along the top of the foot, from the ankle to the toes, the hand holds it. */
const TWIST_LIZARD_GRIP = 0.45;
/**
 * The ways from the shoulder the right arm points on its way around: forward and up over the front
 * knee, then up and back over the head, before it comes down behind to the foot. Out to the side,
 * the arm pointed at the camera halfway and looked like a stub.
 */
const TWIST_LIZARD_AROUND: [Vec3, Vec3] = [
  [0.6, 0.8, 0],
  [-0.4, 0.9, 0],
];
/** How long the arm is on the way: all but straight, swinging about the shoulder. */
const TWIST_LIZARD_ARM = 0.995 * ARM_REACH;
/**
 * The way the right elbow points once the hand lifts: out to the right, across the way the arm
 * swings, so the elbow never has to swing round. Pointing down and back, the bent arm folded
 * forward as it went overhead.
 */
const TWIST_LIZARD_ELBOW: Vec3 = [0, 0.2, 1];
/**
 * Where each part of the move starts and ends, from 0 to 1: the hand reaching back and the shin
 * coming up together, meeting, then the hand drawing the foot in.
 */
const TWIST_LIZARD_PHASES = { reach: [0, 0.75], lift: [0, 0.75], pull: [0.75, 1] } as const;

const TWIST_LIZARD_KNEE = solvePose(LIZARD_UP).leftLeg[1];

/** The back foot with its shin turned up this far (degrees) around the knee, which stays on the floor, the foot pointing on from the shin. */
const twistLizardFoot = (shin: number, body: Pose3): Pin => {
  const angle = radians(shin);
  const along: Vec3 = [-Math.cos(angle), Math.sin(angle), 0];
  const ankle: Vec3 = [TWIST_LIZARD_KNEE[0] + SKELETON.shin * along[0], TWIST_LIZARD_KNEE[1] + SKELETON.shin * along[1], TWIST_LIZARD_KNEE[2]];
  return { ...pinVia(solvePose(body).leftLeg[0], TWIST_LIZARD_KNEE, ankle), toward: along };
};

/** Where the right hand holds the back foot: on top of it, partway to the toes. */
const twistLizardGrip = (foot: Pin): Vec3 => along3(foot.at, foot.toward!, TWIST_LIZARD_GRIP * SKELETON.foot);

/** The body `reach` of the way turned open, and `pull` of the way leaned on into drawing the foot in. */
const twistLizardBody = (reach: number, pull: number): Pose3 => {
  const lean = mix(mix(LIZARD_UP.lean!, TWIST_LIZARD.lean.meet, reach), TWIST_LIZARD.lean.held, pull);
  return {
    ...LIZARD_UP,
    pelvis: lizardBody(TWIST_LIZARD.sink * reach).pelvis,
    lean,
    spine: { twist: TWIST_LIZARD.twist * reach, side: mix(TWIST_LIZARD.side.meet * reach, TWIST_LIZARD.side.held, pull) },
    neck: { flex: -0.4 * lean, twist: TWIST_LIZARD.neck * reach },
  };
};
/** The way the back of the right hand faces holding the foot. */
const TWIST_LIZARD_TOES: Vec3 = [-0.3, -0.3, -1];
/**
 * The right hand `reach` of the way from the floor to `grip`, swinging up over the front knee,
 * overhead and back, seen from the shoulder: the way it points turns smoothly, and the arm is long
 * the whole way between the ends, the elbow pointing out to the right.
 */
const twistLizardHand = (shoulder: Vec3, grip: Vec3, reach: number): Pin => {
  const planted = LIZARD_UP.pins!.rightHand!;
  const from = toward([0, 0, 0], [planted.at[0] - shoulder[0], planted.at[1] - shoulder[1], planted.at[2] - shoulder[2]], 1);
  const to = toward([0, 0, 0], [grip[0] - shoulder[0], grip[1] - shoulder[1], grip[2] - shoulder[2]], 1);
  const [w1, w2] = TWIST_LIZARD_AROUND;
  const a1 = turnToward(from, w1, reach), a2 = turnToward(w1, w2, reach), a3 = turnToward(w2, to, reach);
  const way = turnToward(turnToward(a1, a2, reach), turnToward(a2, a3, reach), reach);
  const ends = mix(distance(shoulder, planted.at), Math.min(distance(shoulder, grip), ARM_REACH), reach);
  const long = Math.min(ends, TWIST_LIZARD_ARM) + (ends > TWIST_LIZARD_ARM ? 0 : (TWIST_LIZARD_ARM - ends) * Math.sin(Math.PI * reach));
  return { at: along3(shoulder, way, Math.min(long, ARM_REACH)), pole: turnToward(planted.pole!, TWIST_LIZARD_ELBOW, phase(reach, 0, 0.1)), toward: turnToward(planted.toward!, TWIST_LIZARD_TOES, reach) };
};

/**
 * The half-twisted lizard `s` of the way along. The hips sink, the chest turns open and the right
 * hand lets go of the floor and swings up over the front knee, overhead and back, as the back shin
 * comes up off the floor, the two meeting where the hand takes the foot. Then the hand draws the
 * foot on in toward the glute as the body leans into it. The left hand stays planted.
 */
const halfTwistedLizard = (s: number): Pose3 => {
  const reach = phase(s, ...TWIST_LIZARD_PHASES.reach);
  const lift = phase(s, ...TWIST_LIZARD_PHASES.lift);
  const pull = phase(s, ...TWIST_LIZARD_PHASES.pull);
  const body = twistLizardBody(reach, pull);
  const foot = twistLizardFoot(TWIST_LIZARD_SHIN.meet * lift + (TWIST_LIZARD_SHIN.held - TWIST_LIZARD_SHIN.meet) * pull, body);
  const pins = { ...LIZARD_UP.pins, leftFoot: foot };
  const shoulder = solvePose({ ...body, pins }).rightArm[0];
  // Holding the foot, the hand goes where it goes.
  if (lift === 1) return { ...body, pins: { ...pins, rightHand: { at: withinReach(shoulder, twistLizardGrip(foot)), pole: TWIST_LIZARD_ELBOW, toward: TWIST_LIZARD_TOES } } };
  return { ...body, pins: { ...pins, rightHand: twistLizardHand(shoulder, twistLizardGrip(twistLizardFoot(TWIST_LIZARD_SHIN.meet, body)), reach) } };
};
/**
 * Coming out, `t` of the way, all at once: the hand lets go of the foot and swings back the way it
 * came, overhead and over the front knee to the floor, as the shin goes back down and the chest
 * turns back. The hand leaves upward and the foot goes down, so they part at once.
 */
const releaseTwistedLizard = (t: number): Pose3 => {
  const body = twistLizardBody(1 - t, 1 - t);
  const pins = { ...LIZARD_UP.pins, leftFoot: twistLizardFoot(TWIST_LIZARD_SHIN.held * (1 - t), body) };
  const shoulder = solvePose({ ...body, pins }).rightArm[0];
  return { ...body, pins: { ...pins, rightHand: twistLizardHand(shoulder, twistLizardGrip(twistLizardFoot(TWIST_LIZARD_SHIN.held, body)), 1 - t) } };
};
const TWIST_LIZARD_HELD = halfTwistedLizard(1);
/** The foot and the hand travel on curves, so it takes this many keyframes for them to follow. */
const TWIST_LIZARD_STEPS = 72;

export const HALF_TWISTED_LIZARD_3D: Clip3D = {
  view: '3d',
  // As for the lizard: from the front leg's side, a little in front and just above. The chest turns
  // open toward the camera, and the right arm swings up over the front knee and back as the back shin
  // comes up to meet its hand.
  camera: LIZARD_POSE_3D.camera,
  highlight: ['leftLeg', 'torso'],
  behind: [
    // The right arm is inside the front knee the whole way, behind it from here; by depth the two
    // swapped as the hand lifted off the floor.
    ['rightArm', 'rightLeg'],
    ['torso', 'rightArm'],
    // Overhead the arm is in front of the head; reaching back it's only just behind it, and clear of
    // it on screen, and by depth the two swapped as it went.
    ['head', 'rightArm'],
    // The left arm, planted well in front, and the back leg are far apart on screen; by depth they
    // swapped as the body turned.
    ['leftLeg', 'leftArm'],
  ],
  // Holding the foot, the chest turned open.
  stillFrame: 1 + TWIST_LIZARD_STEPS,
  keyframes: [
    { ms: 0, pose: LIZARD_UP },
    { ms: 600, pose: LIZARD_UP },
    ...alongArc(3000, TWIST_LIZARD_STEPS, halfTwistedLizard),
    { ms: 3500, pose: TWIST_LIZARD_HELD },
    // Out of it with the arm and the leg together.
    ...alongArc(2000, TWIST_LIZARD_STEPS, releaseTwistedLizard),
  ],
};

// --- Open book: lying on the left side with the knees bent to 90°, the top arm sweeps over to the floor behind as the chest turns open ---

/** How high the spine lies off the floor on the side: the bottom shoulder and hip just clear of it. */
const BOOK_SPINE_Y = 46;
/**
 * The top arm comes down across the chest, out in front, to rest on the bottom one, palms together:
 * the shoulders are stacked a shoulder-width apart, and the hands a hand's thickness.
 */
/**
 * Both shoulders are drawn down toward the hips the whole way, the arms reaching long from them,
 * which keeps the top one clear of the head from this camera. Drawn down together, they stay the
 * same distance apart along the body, so the hands still meet.
 */
const BOOK_SHRUG = -30;
const BOOK_PALMS_TOGETHER = -(Math.asin((2 * SKELETON.shoulder * Math.cos(radians(BOOK_SHRUG)) - 14) / ARM_REACH) * 180) / Math.PI;
/** Open: the chest turned toward the ceiling and the arm on past it, reaching for the floor behind. */
const BOOK_OPEN = { twist: -75, arm: 110, neck: -45 };

const bookBody = (t: number): Pose3 => ({
  pelvis: [0, BOOK_SPINE_Y, 0],
  tilt: -90,
  spine: { twist: BOOK_OPEN.twist * t },
  neck: { twist: BOOK_OPEN.neck * t },
  rightArm: { flex: 90, abduct: mix(BOOK_PALMS_TOGETHER, BOOK_OPEN.arm, t), shrug: BOOK_SHRUG },
  leftArm: { flex: 90, shrug: BOOK_SHRUG },
  // The top knee rests on the bottom one.
  rightLeg: { flex: 90, knee: 90, abduct: -8 },
  leftLeg: { flex: 90, knee: 90 },
});
/** Where the bottom hand rests on the floor to start, the arm straight out in front. */
const BOOK_FLOOR_HAND = solvePose(bookBody(0)).leftArm[2];

/**
 * The book this far open, from closed (0). The pelvis and the stacked knees stay where they are,
 * and the twist runs up the spine, so the chest turns the most. The top arm stays straight out from
 * the chest at shoulder height, swinging round it, and the head turns to follow the hand.
 *
 * The bottom arm stays straight along the floor. The chest rolls onto its back over it, which
 * would bring that shoulder forward and up toward the hand; its shoulder blade draws back instead,
 * keeping the shoulder an arm's length from the hand, and what that can't make up the hand slides
 * along the floor.
 */
const openBookAt = (t: number): Pose3 => {
  const body = bookBody(t);
  const shoulder = (protract: number) => solvePose({ ...body, leftArm: { protract, shrug: BOOK_SHRUG } }).leftArm[0];
  // Drawing the blade back takes the shoulder further from the hand.
  let [back, forward] = [-30, 0];
  for (let i = 0; i < 40; i++) {
    const protract = (back + forward) / 2;
    if (distance(shoulder(protract), BOOK_FLOOR_HAND) > ARM_REACH) back = protract;
    else forward = protract;
  }
  const protract = (back + forward) / 2;
  const root = shoulder(protract);
  // Along the floor, ahead, until the arm is straight.
  const [dy, dz] = [BOOK_FLOOR_HAND[1] - root[1], BOOK_FLOOR_HAND[2] - root[2]];
  const ahead = Math.max(BOOK_FLOOR_HAND[0], root[0] + Math.sqrt(Math.max(0, ARM_REACH ** 2 - dy ** 2 - dz ** 2)));
  return {
    ...body,
    leftArm: { protract, shrug: BOOK_SHRUG },
    pins: { leftHand: { at: [ahead, BOOK_FLOOR_HAND[1], BOOK_FLOOR_HAND[2]], toward: [1, 0, 0], pole: [0, 0, -1] } },
  };
};
const BOOK_CLOSED_POSE = openBookAt(0);
const BOOK_OPEN_POSE = openBookAt(1);
const BOOK_STEPS = 16;

export const OPEN_BOOK_3D: Clip3D = {
  view: '3d',
  // From the feet end, a little behind the back and well above: the arm sweeps round over the body
  // in a half circle across the screen, the chest turning up toward the camera with it, and the
  // stacked knees are in front, down on the floor. High enough that the head, further along the
  // body, sits clear above the top shoulder on screen.
  camera: { yaw: 340, pitch: 62 },
  highlight: ['torso', 'rightArm'],
  behind: [
    // The head lies beyond the neck from here, but the neck goes into it, so the head is drawn over
    // the torso rather than the neck showing through it.
    ['torso', 'head'],
    // The top knee is nearer the camera than the top arm. They're well apart on screen, and by
    // depth they swapped as the arm went overhead.
    ['rightArm', 'rightLeg'],
  ],
  // The face turns up toward the camera as the chest opens, and a nose appearing partway through
  // only distracts from the arm.
  nose: false,
  // Open.
  stillFrame: 1 + BOOK_STEPS,
  keyframes: [
    { ms: 0, pose: BOOK_CLOSED_POSE },
    { ms: 500, pose: BOOK_CLOSED_POSE },
    ...alongArc(2200, BOOK_STEPS, openBookAt),
    { ms: 900, pose: BOOK_OPEN_POSE },
    ...alongArc(2200, BOOK_STEPS, (t) => openBookAt(1 - t)),
  ],
};

// --- Inchworm: standing, folding forward to put the hands down, walking them out to a plank, then walking the feet in and standing up, further along the room ---

/** How far the hands are from the shoulders while they bear weight: a hair short of straight. */
const IW_ARMS = 0.985 * ARM_REACH;
/** How steep a foot stands flat on the floor, from its tip up to the ankle. */
const IW_FLAT = (Math.asin((ANKLE_Y - DOG_TOE_Y) / SKELETON.foot) * 180) / Math.PI;
/** How high a hand or foot lifts halfway through a step. */
const IW_LIFT = { hands: 18, toes: 14 };

/**
 * How the body is shaped over the feet: which way the legs point from the ankles up to the pelvis
 * (90 is straight up, more leans the hips back), how far the pelvis is from the ankles as a share of
 * the legs' reach (short of it bends the knees), how steep the feet stand, and how far the back
 * rounds and the neck bends. The body tips forward from there until the hands are in reach.
 */
type IwShape = { legs: number; reach: number; foot: number; spine: number; neck: number };
const IW_STANDING: IwShape = { legs: 90, reach: 1, foot: IW_FLAT, spine: 0, neck: 0 };
/** Folded with the hands just down on the floor ahead of the toes, the knees giving to get them there. */
const IW_FOLD: IwShape = { legs: 96, reach: 0.96, foot: IW_FLAT, spine: 40, neck: 25 };
/** Halfway out: the hips high in a V, the legs straight and the heels coming up. */
const IW_V: IwShape = { legs: 58, reach: 1, foot: 30, spine: 0, neck: 12 };
/** The plank: on the toes, the body in one line from the ankles to the neck, steep enough for the arms to reach straight down to the floor. */
const IW_PLANK_FOOT = 70;
const IW_PLANK: IwShape = {
  legs: (Math.asin((IW_ARMS + WRIST_Y - DOG_TOE_Y - SKELETON.foot * Math.sin(radians(IW_PLANK_FOOT))) / (LEG_REACH + SKELETON.torso)) * 180) / Math.PI,
  reach: 1,
  foot: IW_PLANK_FOOT,
  spine: 0,
  neck: -5,
};

/** The shape this far from the fold (0) to the plank (1), through the V halfway. */
const iwShapeAt = (s: number): IwShape => ({
  legs: throughThree(IW_FOLD.legs, IW_V.legs, IW_PLANK.legs, s),
  // Past the V the legs are straight, and the curve through the three would overshoot that.
  reach: Math.min(1, throughThree(IW_FOLD.reach, IW_V.reach, IW_PLANK.reach, s)),
  foot: throughThree(IW_FOLD.foot, IW_V.foot, IW_PLANK.foot, s),
  spine: throughThree(IW_FOLD.spine, IW_V.spine, IW_PLANK.spine, s),
  neck: throughThree(IW_FOLD.neck, IW_V.neck, IW_PLANK.neck, s),
});

/** The ankle over a foot whose tip is at `toe` along the room, standing this steep, and lifted this far. */
const iwAnkle = (toe: number, steep: number, side: 1 | -1, lift = 0): Vec3 => [
  toe - SKELETON.foot * Math.cos(radians(steep)),
  DOG_TOE_Y + SKELETON.foot * Math.sin(radians(steep)) + lift,
  side * SKELETON.hip,
];
const iwFoot = (toe: number, steep: number, side: 1 | -1, lift = 0): Pin => ({
  at: iwAnkle(toe, steep, side, lift),
  toward: [Math.cos(radians(steep)), -Math.sin(radians(steep)), 0],
  pole: [1, 0.2, 0],
});
const iwHand = (x: number, side: 1 | -1, lift = 0): Pin => ({ at: [x, WRIST_Y + lift, side * SKELETON.shoulder], toward: [1, 0, 0], pole: [-1, 0, side * 0.3] });

/**
 * The body shaped like this, upright, over the feet with their tips at `toes`, right then left, and
 * lifted this far. The hips go out from between the ankles the way the shape's legs point, as far as
 * keeps whichever foot is further from its hip at the shape's reach, so with the feet a step apart
 * the other knee bends. Neither ever has to stretch, whether the hips are ahead of the feet or behind.
 */
const iwBody = (shape: IwShape, toes: readonly [number, number], lifts: readonly [number, number] = [0, 0]): Pose3 => {
  const right = iwAnkle(toes[0], shape.foot, 1, lifts[0]);
  const left = iwAnkle(toes[1], shape.foot, -1, lifts[1]);
  // The middle of the ankles on the floor: a foot lifting doesn't move the hips.
  const [baseX, baseY] = [(toes[0] + toes[1]) / 2 - SKELETON.foot * Math.cos(radians(shape.foot)), right[1] - lifts[0]];
  const legs = radians(shape.legs);
  const pelvisAt = (length: number): Vec3 => [baseX + length * Math.cos(legs), baseY + length * Math.sin(legs), 0];
  // The hips sit level with the ankles either side, so only the distance along the room and up counts.
  const furthest = (pelvis: Vec3) => Math.max(Math.hypot(right[0] - pelvis[0], right[1] - pelvis[1]), Math.hypot(left[0] - pelvis[0], left[1] - pelvis[1]));
  const reach = shape.reach * LEG_REACH;
  let [near, far] = [0, reach];
  for (let i = 0; i < 40; i++) {
    const length = (near + far) / 2;
    if (furthest(pelvisAt(length)) > reach) far = length;
    else near = length;
  }
  return { pelvis: pelvisAt(near), spine: { flex: shape.spine }, neck: { flex: shape.neck } };
};

const midpointOf = (a: Vec3, b: Vec3): Vec3 => mix3(a, b, 0.5);

/** How far to tip the body forward from upright for the middle of the shoulders to be `reach` from `target`. */
const iwLean = (body: Pose3, target: Vec3, reach: number): number => {
  const gap = (lean: number) => {
    const skeleton = solvePose({ ...body, lean });
    return distance(midpointOf(skeleton.rightArm[0], skeleton.leftArm[0]), target);
  };
  let nearest = -20;
  for (let tip = -20; tip <= 180; tip += 2) if (gap(tip) < gap(nearest)) nearest = tip;
  let [upright, tipped] = [-20, nearest];
  for (let i = 0; i < 40; i++) {
    const tip = (upright + tipped) / 2;
    if (gap(tip) > reach) upright = tip;
    else tipped = tip;
  }
  return (upright + tipped) / 2;
};

/** How far to slide a shoulder blade round the ribs for its shoulder to be `reach` from its hand. */
const iwProtract = (body: Pose3, side: 1 | -1, hand: Vec3, reach: number): number => {
  const gap = (protract: number) => {
    const skeleton = solvePose({ ...body, [side === 1 ? 'rightArm' : 'leftArm']: { protract } });
    return distance(side === 1 ? skeleton.rightArm[0] : skeleton.leftArm[0], hand);
  };
  let [back, forward] = [-35, 35];
  if (gap(back) < reach) return back;
  for (let i = 0; i < 40; i++) {
    const protract = (back + forward) / 2;
    if (gap(protract) > reach) back = protract;
    else forward = protract;
  }
  return (back + forward) / 2;
};

/** Where the hands and the tips of the feet are along the room, right then left, and how far each is lifted. */
type IwContacts = { hands: [number, number]; handsLift: [number, number]; toes: [number, number]; toesLift: [number, number] };

/** How far the hands are ahead of the tips of the feet in the fold, and in the plank, where they're under the shoulders. */
const IW_FOLD_REACH = 50;
const IW_PLANK_REACH = (() => {
  const skeleton = solvePose({ ...iwBody(IW_PLANK, [0, 0]), lean: 90 - IW_PLANK.legs });
  return midpointOf(skeleton.rightArm[0], skeleton.leftArm[0])[0];
})();
/** How far along the room the figure goes, and the camera with it. */
const IW_TRAVEL = IW_PLANK_REACH - IW_FOLD_REACH;

/**
 * The whole body over the hands and feet where they are. The legs and back take the shape for how
 * far the hands are ahead of the feet, the body tips forward until the shoulders are an arm's reach
 * from the hands, and each shoulder blade slides to put its own shoulder there, so the arm of a hand
 * a step ahead of the other is straight too.
 */
const iwPose = (c: IwContacts): Pose3 => {
  const ahead = (c.hands[0] + c.hands[1]) / 2 - (c.toes[0] + c.toes[1]) / 2;
  const shape = iwShapeAt(Math.min(1, Math.max(0, (ahead - IW_FOLD_REACH) / IW_TRAVEL)));
  const body = iwBody(shape, c.toes, c.toesLift);
  const right = iwHand(c.hands[0], 1, c.handsLift[0]);
  const left = iwHand(c.hands[1], -1, c.handsLift[1]);
  const leaning = { ...body, lean: iwLean(body, midpointOf(right.at, left.at), IW_ARMS) };
  return {
    ...leaning,
    rightArm: { protract: iwProtract(leaning, 1, right.at, IW_ARMS) },
    leftArm: { protract: iwProtract(leaning, -1, left.at, IW_ARMS) },
    pins: {
      rightFoot: iwFoot(c.toes[0], shape.foot, 1, c.toesLift[0]),
      leftFoot: iwFoot(c.toes[1], shape.foot, -1, c.toesLift[1]),
      rightHand: right,
      leftHand: left,
    },
  };
};

const IW_FOLD_CONTACTS: IwContacts = { hands: [IW_FOLD_REACH, IW_FOLD_REACH], handsLift: [0, 0], toes: [0, 0], toesLift: [0, 0] };
const IW_FOLDED = iwPose(IW_FOLD_CONTACTS);

/** Where a hand hangs straight down from its shoulder, the arm loose, in a body with no pins. */
const iwHangingWrist = (body: Pose3, side: 1 | -1): Vec3 => {
  const key = side === 1 ? 'rightArm' : 'leftArm';
  const arm = (flex: number) => solvePose({ ...body, [key]: { flex, abduct: 5, elbow: 8 } })[key];
  let [back, forward] = [-40, 160];
  for (let i = 0; i < 40; i++) {
    const flex = (back + forward) / 2;
    const [shoulder, , wrist] = arm(flex);
    if (wrist[0] > shoulder[0]) forward = flex;
    else back = flex;
  }
  return arm((back + forward) / 2)[2];
};

/**
 * Folding from standing (0) until the hands are on the floor (1). The hips go back and the knees
 * give as the body tips, and the arms hang until the hands come near the floor, then reach ahead to
 * where they go down.
 */
const iwFoldAt = (u: number): Pose3 => {
  const standing = iwBody(IW_STANDING, [0, 0]);
  const body: Pose3 = {
    pelvis: mix3(standing.pelvis, IW_FOLDED.pelvis, u),
    lean: mix(0, IW_FOLDED.lean ?? 0, u),
    spine: { flex: mix(0, IW_FOLD.spine, u) },
    neck: { flex: mix(0, IW_FOLD.neck, u) },
  };
  const reaching = smooth(Math.min(1, Math.max(0, (u - 0.5) / 0.5)));
  const skeleton = solvePose(body);
  const hand = (side: 1 | -1, down: Pin): Pin => {
    const at = mix3(iwHangingWrist(body, side), down.at, reaching);
    return { ...down, at: withinReach(side === 1 ? skeleton.rightArm[0] : skeleton.leftArm[0], [at[0], Math.max(WRIST_Y, at[1]), at[2]], IW_ARMS) };
  };
  return {
    ...body,
    pins: {
      rightFoot: iwFoot(0, IW_FLAT, 1),
      leftFoot: iwFoot(0, IW_FLAT, -1),
      rightHand: hand(1, IW_FOLDED.pins!.rightHand!),
      leftHand: hand(-1, IW_FOLDED.pins!.leftHand!),
    },
  };
};

/**
 * Keyframes taking a step, the body following it. The hand or foot lifts straight up first, moves
 * ahead, and sets straight down, so it never slides along the floor.
 */
const IW_STEP_FRAMES = 6;
const iwStep = (ms: number, from: IwContacts, limb: 'hands' | 'toes', index: 0 | 1, to: number): { frames: Keyframe3[]; end: IwContacts } => {
  const frames: Keyframe3[] = [];
  let contacts = from;
  for (let j = 1; j <= IW_STEP_FRAMES; j++) {
    const q = j / IW_STEP_FRAMES;
    const place: [number, number] = [...from[limb]];
    place[index] = mix(from[limb][index], to, smooth(Math.min(1, Math.max(0, (q - 1 / IW_STEP_FRAMES) / (1 - 2 / IW_STEP_FRAMES)))));
    const lift: [number, number] = [0, 0];
    lift[index] = IW_LIFT[limb] * Math.sin(Math.PI * q);
    contacts = limb === 'hands' ? { ...from, hands: place, handsLift: lift } : { ...from, toes: place, toesLift: lift };
    frames.push({ ms: ms / IW_STEP_FRAMES, pose: iwPose(contacts), ease: 'none' });
  }
  return { frames, end: contacts };
};

/** How many times each hand steps on the way out, and each foot on the way in. */
const IW_HAND_STEPS = 3;
const IW_FOOT_STEPS = 4;
const IW_FOLD_STEPS = 16;

const INCHWORM_KEYFRAMES = (() => {
  const standing = iwFoldAt(0);
  const keyframes: Keyframe3[] = [
    { ms: 0, pose: standing },
    { ms: 600, pose: standing },
    ...alongArc(1400, IW_FOLD_STEPS, iwFoldAt),
  ];
  let contacts = IW_FOLD_CONTACTS;
  // The hands walk out, the right one leading and the left one coming up beside it.
  for (let step = 1; step <= IW_HAND_STEPS; step++) {
    for (const hand of [0, 1] as const) {
      const { frames, end } = iwStep(520, contacts, 'hands', hand, IW_FOLD_REACH + (IW_TRAVEL * step) / IW_HAND_STEPS);
      keyframes.push(...frames);
      contacts = end;
    }
  }
  const plank = keyframes.length - 1;
  keyframes.push({ ms: 700, pose: keyframes[plank].pose });
  // Then the feet walk in, the right one leading.
  for (let step = 1; step <= IW_FOOT_STEPS; step++) {
    for (const foot of [0, 1] as const) {
      const { frames, end } = iwStep(440, contacts, 'toes', foot, (IW_TRAVEL * step) / IW_FOOT_STEPS);
      keyframes.push(...frames);
      contacts = end;
    }
  }
  // And it stands back up, where the fold started but further along the room.
  keyframes.push(...alongArc(1400, IW_FOLD_STEPS, (t) => shiftedPose(iwFoldAt(1 - t), IW_TRAVEL)));
  return { keyframes, plank };
})();

export const INCHWORM_3D: Clip3D = {
  view: '3d',
  // From the right side, a little in front and above, as for downward facing dog: the fold, the V
  // and the plank are all flat on the screen. The camera goes along with the figure.
  camera: { yaw: 22, pitch: 14 },
  follow: true,
  highlight: ['rightLeg', 'leftLeg'],
  // The far arm hangs beside its leg standing, and reaches ahead of it from the fold on, never
  // across it, so it stays behind it rather than swapping places as it swings forward.
  behind: [['leftArm', 'leftLeg']],
  // The plank.
  stillFrame: INCHWORM_KEYFRAMES.plank,
  keyframes: INCHWORM_KEYFRAMES.keyframes,
};

// --- Pec stretch on the ground: face down with the right arm straight out to the side, the left hand pushes the body over onto its right side, the top foot stepping over behind ---

/** How far the body rolls over toward the outstretched arm. */
const PEC_ROLL = 80;
/** Where the left hand pushes on the floor, beside the chest. */
const PEC_PUSH_HAND: Vec3 = [125, WRIST_Y, -80];
/** Where the top foot is planted behind, the knee up. */
const PEC_STEP_FOOT: Vec3 = [-85, ANKLE_Y, 82];
/** How far the head turns to its left, away from the arm, by the time the body is over. */
const PEC_HEAD_TURN = 45;
/** How high the top foot lifts on its way over the bottom leg. */
const PEC_STEP_LIFT = 70;

/**
 * The body this far over (0 to 1), its spine along x with the head toward +x. It rolls about its
 * own length: rising to lie on the side as it goes, and moving over toward the arm so the right
 * shoulder stays an arm's length from the hand on the floor.
 */
const pecBody = (t: number, z: number): Pose3 => {
  const roll = PEC_ROLL * t;
  return {
    pelvis: [0, mix(PRONE_PELVIS_Y, BOOK_SPINE_Y, Math.sin(radians(roll))), z],
    // Turned to lie along x, then leaning from lying on the right side (0) to face down (90).
    turn: 90,
    lean: 90 - roll,
    tilt: 90,
    // The head turns away from the arm as the body goes over, looking up, which turns the face
    // toward the camera.
    neck: { flex: -10, twist: PEC_HEAD_TURN * t },
  };
};
const PEC_FLAT_SHOULDER = solvePose(pecBody(0, 0)).rightArm[0];
/** The right hand rests on the floor straight out from the shoulder, palm down. */
const PEC_ARM_HAND: Vec3 = [
  PEC_FLAT_SHOULDER[0],
  WRIST_Y,
  PEC_FLAT_SHOULDER[2] + Math.sqrt(ARM_REACH ** 2 - (PEC_FLAT_SHOULDER[1] - WRIST_Y) ** 2),
];
/** Where the pelvis has to be, across the room, to keep the right shoulder an arm's length from its hand. */
const pecPelvisZ = (t: number): number => {
  let [near, far] = [-60, 60];
  for (let i = 0; i < 40; i++) {
    const z = (near + far) / 2;
    if (distance(solvePose(pecBody(t, z)).rightArm[0], PEC_ARM_HAND) > ARM_REACH) near = z;
    else far = z;
  }
  return (near + far) / 2;
};
/** How far out from the hip each foot lies face down, the legs long and a little apart. */
const PEC_FEET_APART = (() => {
  const { rightLeg } = solvePose({ ...pecBody(0, 0), rightLeg: { flex: 2.6, abduct: 2 } });
  return rightLeg[2][2] - rightLeg[0][2];
})();
/** A leg lying long on the floor from its hip, its foot this far out to the side. */
const pecLongLeg = (hip: Vec3, side: number): Vec3 => [hip[0] - Math.sqrt(LEG_REACH ** 2 - (hip[1] - ANKLE_Y) ** 2 - side ** 2), ANKLE_Y, hip[2] + side];

const pecAt = (t: number): Pose3 => {
  const body = pecBody(t, pecPelvisZ(t));
  const skeleton = solvePose(body);
  const front = skeleton.spineFront[0];
  // The legs stay long on the floor, rolling with the hips, the bottom foot coming in under its
  // hip as the body goes over onto that side.
  const rightAnkle = pecLongLeg(skeleton.rightLeg[0], mix(PEC_FEET_APART, 0, t));
  // The top foot lifts off the floor, over the bottom leg and down behind it, the knee up.
  const step = smooth(Math.min(1, Math.max(0, (t - 0.15) / 0.85)));
  const leftLong = pecLongLeg(skeleton.leftLeg[0], -PEC_FEET_APART);
  // It comes up before it goes across, so the shin clears the bottom leg.
  const across = smooth(step);
  const leftAnkle: Vec3 = [
    mix(leftLong[0], PEC_STEP_FOOT[0], across),
    ANKLE_Y + PEC_STEP_LIFT * Math.sin(Math.PI * step),
    mix(leftLong[2], PEC_STEP_FOOT[2], across),
  ];
  return {
    ...body,
    pins: {
      rightHand: { at: PEC_ARM_HAND, toward: [0, -0.1, 1], pole: [0, 1, 0] },
      leftHand: { at: PEC_PUSH_HAND, toward: [1, 0, -0.2], pole: [-0.4, 0.6, -0.7] },
      rightFoot: { at: rightAnkle, toward: [-1, -0.1, 0], pole: front },
      leftFoot: { at: leftAnkle, toward: mix3([-1, -0.1, 0], [-0.4, 0, 0.9], across), pole: [0.3, 1, -0.2] },
    },
  };
};
const PEC_FLAT = pecAt(0);
const PEC_ROLLED = pecAt(1);
const PEC_STEPS = 16;

export const PEC_STRETCH_ON_THE_GROUND_3D: Clip3D = {
  view: '3d',
  // From the left, a little toward the feet and above: the chest turns over toward the camera as
  // the outstretched arm stays down on the floor beyond it, the top foot steps over the bottom leg
  // toward the arm, and the pushing hand is in front. From the head end the roll shows as the
  // shoulders tipping, but the head covers the chest.
  camera: { yaw: 195, pitch: 40 },
  highlight: ['rightArm', 'torso'],
  // The pushing hand is up by the chest and the top leg down by the hips. They never meet on
  // screen, and by depth they swapped as the foot went over.
  behind: [['leftLeg', 'leftArm']],
  // The face turns from facing the floor to up toward the camera as the body goes over, and the
  // nose draws itself in down the bridge rather than appearing all at once.
  nose: 'drawIn',
  stillFrame: 1 + PEC_STEPS,
  keyframes: [
    { ms: 0, pose: PEC_FLAT },
    { ms: 500, pose: PEC_FLAT },
    ...alongArc(2000, PEC_STEPS, pecAt),
    { ms: 3000, pose: PEC_ROLLED },
    ...alongArc(1800, PEC_STEPS, (t) => pecAt(1 - t)),
  ],
};

// --- Reverse clamshells: lying on the left side with the hips and knees bent, the top knee opens up toward the ceiling, then the top foot lifts with the knee kept where it is ---

/** The hips bent this far and the knees to 90°, the feet together in line with the back. */
const CLAM_HIP = 45;
/** The top knee rests on the bottom one to start. */
const CLAM_RESTING = -8;
/** How far the top knee opens, swinging round the line from the hip to the foot, which stays on the other foot. */
const CLAM_OPEN = 60;
/** How far the top thigh then turns in around its own length, lifting the foot with the knee kept where it is. */
const CLAM_TURN_IN = 50;
/** Where the top hand rests on the floor in front of the chest. */
const CLAM_HAND: Vec3 = [60, WRIST_Y, -105];

const CLAM_BODY: Pose3 = {
  pelvis: [0, BOOK_SPINE_Y, 0],
  tilt: -90,
  // The bottom arm reaches long along the floor past the head, which rests on it.
  leftArm: { flex: 170 },
  rightLeg: { flex: CLAM_HIP, knee: 90, abduct: CLAM_RESTING },
  leftLeg: { flex: CLAM_HIP, knee: 90 },
};
/** The top leg closed, its knee resting on the bottom one and its foot on the bottom foot. */
const CLAM_REST_LEG = solvePose(CLAM_BODY).rightLeg;

/** A point turned this many degrees around the line through `origin` along `axis`. */
const turnedAbout = (point: Vec3, origin: Vec3, axis: Vec3, degrees: number): Vec3 => {
  const k = unit3(axis);
  const v = sub3(point, origin);
  const [c, s] = [Math.cos(radians(degrees)), Math.sin(radians(degrees))];
  const kv = cross3(k, v);
  const along = (k[0] * v[0] + k[1] * v[1] + k[2] * v[2]) * (1 - c);
  return [0, 1, 2].map((i) => origin[i] + v[i] * c + kv[i] * s + k[i] * along) as unknown as Vec3;
};
/** Which way round to turn a point about an axis so that it rises. */
const risingWay = (point: Vec3, origin: Vec3, axis: Vec3): 1 | -1 => (turnedAbout(point, origin, axis, 1)[1] > point[1] ? 1 : -1);
const [CLAM_HIP_JOINT, CLAM_REST_KNEE, CLAM_REST_ANKLE, CLAM_REST_TOES] = CLAM_REST_LEG;
const CLAM_OPEN_AXIS = sub3(CLAM_REST_ANKLE, CLAM_HIP_JOINT);
const CLAM_OPEN_WAY = risingWay(CLAM_REST_KNEE, CLAM_HIP_JOINT, CLAM_OPEN_AXIS);

/**
 * The top knee opened (0 to 1), and then the foot lifted (0 to 1). The knee opens by the leg
 * swinging round the line from the hip to the foot, so the foot stays where it is, resting on the
 * other one. The foot then lifts by the thigh turning in around its own length, so the knee stays
 * where it opened to. The foot is pinned to where those put it, the knee out toward where they put
 * it, which it lands on.
 */
const clamAt = (open: number, lift: number): Pose3 => {
  const opening = CLAM_OPEN_WAY * CLAM_OPEN * open;
  const knee = turnedAbout(CLAM_REST_KNEE, CLAM_HIP_JOINT, CLAM_OPEN_AXIS, opening);
  const toes = turnedAbout(CLAM_REST_TOES, CLAM_HIP_JOINT, CLAM_OPEN_AXIS, opening);
  const thigh = sub3(knee, CLAM_HIP_JOINT);
  const turn = risingWay(CLAM_REST_ANKLE, CLAM_HIP_JOINT, thigh) * CLAM_TURN_IN * lift;
  const ankle = turnedAbout(CLAM_REST_ANKLE, CLAM_HIP_JOINT, thigh, turn);
  return {
    ...CLAM_BODY,
    pins: {
      rightHand: { at: CLAM_HAND, toward: [0.5, 0, -1], pole: [-0.4, 1, 0.3] },
      rightFoot: pinVia(CLAM_HIP_JOINT, knee, ankle, sub3(turnedAbout(toes, CLAM_HIP_JOINT, thigh, turn), ankle)),
    },
  };
};
const CLAM_CLOSED = clamAt(0, 0);
const CLAM_FOOT_UP = clamAt(1, 1);
/** Pinned feet go straight between keyframes, cutting across the arc the foot or knee swings on, so each swing takes this many. */
const CLAM_STEPS = 8;
/** Once through: open the knee with the feet touching, lift the foot, lower it back onto the other foot, close the knees. */
const clamRep = (): Keyframe3[] => [
  { ms: 400, pose: CLAM_CLOSED },
  ...alongArc(1000, CLAM_STEPS, (t) => clamAt(t, 0)),
  ...alongArc(900, CLAM_STEPS, (t) => clamAt(1, t)),
  { ms: 400, pose: CLAM_FOOT_UP },
  ...alongArc(900, CLAM_STEPS, (t) => clamAt(1, 1 - t)),
  ...alongArc(1000, CLAM_STEPS, (t) => clamAt(1 - t, 0)),
];

export const REVERSE_CLAMSHELLS_3D: Clip3D = {
  view: '3d',
  // From in front and low: the top knee rises up the screen off the bottom one, the two legs opening
  // apart like a clam, and the foot then swings up above the knee with the bend in the knee still
  // showing. From higher up the knee rises toward the camera and the leg folds into a line; from
  // the feet end the thigh comes straight at it.
  camera: { yaw: 105, pitch: 30 },
  highlight: ['rightLeg'],
  // The top hand is on the floor in front of the chest, the top knee well down the body from it.
  // They never meet on screen, and by depth they swapped as the knee opened.
  behind: [['rightArm', 'rightLeg']],
  // The face looks at the camera side on, and a nose on it, turned sideways, only distracts.
  nose: false,
  // The foot up.
  stillFrame: 1 + 2 * CLAM_STEPS,
  // Twice through the whole movement: the knee opens with the feet touching, the foot lifts with
  // the knee held up, the foot comes back down to rest on the other one, and the knees close.
  keyframes: [{ ms: 0, pose: CLAM_CLOSED }, ...clamRep(), ...clamRep()],
};

// --- Reverse scorpion: face down in a T, one bent leg at a time swings up and over behind the body toward the other hand, the hips turning with it and the chest staying down ---

/** How far the hips turn over, lifting the working side's hip off the floor. */
const SCORPION_ROLL = 60;
/** Where the working foot comes down, beyond the other leg on the far side, reaching toward the other hand: the knee is bent about a right angle there. */
const SCORPION_FOOT = { x: -60, z: 110 };
/** How high the working foot lifts on its way over the other leg. */
const SCORPION_FOOT_LIFT = 60;
/** The legs lying long, a little apart, the tops of the feet on the floor. */
const SCORPION_LONG_LEG: LegPose = { flex: 2.6, abduct: 2, ankle: -88 };

/**
 * The body face down with the head toward +x, the hips turned this far (0 to 1) over onto the side
 * away from the working leg: `side` 1 lifts the left hip and swings the left leg across toward the
 * right hand, -1 the other way round. The spine twists back the other way, so the chest stays flat on
 * the floor.
 */
const scorpionBodyAt = (side: 1 | -1, t: number, [flex, bend, dx, dz]: readonly number[]): Pose3 => {
  const roll = SCORPION_ROLL * t;
  return {
    pelvis: [dx, mix(PRONE_PELVIS_Y, BOOK_SPINE_Y, Math.sin(radians(roll))), dz],
    turn: 90,
    lean: 90 - side * roll,
    tilt: 90,
    spine: { twist: -side * roll, flex, side: side * bend },
    neck: { flex: -10 },
  };
};
/** The shoulders face down, where the hips turned don't move them: the chest's height, the line across it, and where it is in the room. */
const scorpionChest = (pose: Pose3): number[] => {
  const { rightArm, leftArm, spineRight } = solvePose(pose);
  const right = spineRight[spineRight.length - 1];
  return [(rightArm[0][1] + leftArm[0][1]) / 2, right[0], (rightArm[0][0] + leftArm[0][0]) / 2, (rightArm[0][2] + leftArm[0][2]) / 2];
};
const SCORPION_CHEST = scorpionChest(scorpionBodyAt(1, 0, [0, 0, 0, 0]));
/** Solves for x with the sum over j of columns[j][i] * x[j] equal to b[i], by Gaussian elimination. */
const solveLinear = (columns: readonly (readonly number[])[], b: readonly number[]): number[] => {
  const n = b.length;
  const rows = b.map((v, i) => [...columns.map((column) => column[i]), v]);
  for (let col = 0; col < n; col++) {
    const pivot = rows.slice(col).reduce((best, row, i) => (Math.abs(row[col]) > Math.abs(rows[best][col]) ? col + i : best), col);
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const k = rows[r][col] / rows[col][col];
      for (let c = col; c <= n; c++) rows[r][c] -= k * rows[col][c];
    }
  }
  return rows.map((row, i) => row[n] / row[i]);
};
const scorpionBody = (side: 1 | -1, t: number): Pose3 => {
  // The spine bends down to the floor, and the pelvis moves, to keep the shoulders where they were
  // with the hips flat: found by Newton's method on the four.
  let guess = [0, 0, 0, 0];
  for (let step = 0; step < 12; step++) {
    const miss = scorpionChest(scorpionBodyAt(side, t, guess)).map((v, i) => v - SCORPION_CHEST[i]);
    const jacobian = guess.map((_, j) => {
      const nudged = guess.map((g, k) => (k === j ? g + 0.01 : g));
      return scorpionChest(scorpionBodyAt(side, t, nudged)).map((v, i) => (v - SCORPION_CHEST[i] - miss[i]) / 0.01);
    });
    guess = guess.map((g, j) => g - solveLinear(jacobian, miss)[j]);
  }
  return scorpionBodyAt(side, t, guess);
};
const SCORPION_FLAT_SKELETON = solvePose(scorpionBody(1, 0));
/** The hands rest on the floor straight out from the shoulders. */
const scorpionHand = (shoulder: Vec3, out: 1 | -1): Vec3 => [shoulder[0], WRIST_Y, shoulder[2] + out * Math.sqrt(ARM_REACH ** 2 - (shoulder[1] - WRIST_Y) ** 2)];
const SCORPION_RIGHT_HAND = scorpionHand(SCORPION_FLAT_SKELETON.rightArm[0], 1);
const SCORPION_LEFT_HAND = scorpionHand(SCORPION_FLAT_SKELETON.leftArm[0], -1);

/** How far out from the hip each foot lies face down. */
const SCORPION_FEET_APART = (() => {
  const { rightLeg } = solvePose({ ...scorpionBody(1, 0), rightLeg: SCORPION_LONG_LEG });
  return rightLeg[2][2] - rightLeg[0][2];
})();
/** A leg lying long on the floor from its hip, its foot this far out to the side. */
const scorpionLongLeg = (hip: Vec3, out: number): Vec3 => [hip[0] - Math.sqrt(LEG_REACH ** 2 - (hip[1] - ANKLE_Y) ** 2 - out ** 2), ANKLE_Y, hip[2] + out];

/** The move this far through (0 to 1), to the foot down across the other leg. */
const scorpionAt = (side: 1 | -1, t: number): Pose3 => {
  const body = scorpionBody(side, t);
  const skeleton = solvePose(body);
  const [bottom, top] = side === 1 ? [skeleton.rightLeg, skeleton.leftLeg] : [skeleton.leftLeg, skeleton.rightLeg];
  // The bottom leg stays long on the floor, rolling with the hips.
  const bottomAnkle = scorpionLongLeg(bottom[0], side * SCORPION_FEET_APART);
  // The top foot lifts off the floor as the knee bends, then swings over the bottom leg and down
  // beyond it, the knee up.
  const long = scorpionLongLeg(top[0], -side * SCORPION_FEET_APART);
  const across = smooth(t);
  const topAnkle: Vec3 = [
    mix(long[0], SCORPION_FOOT.x, across),
    ANKLE_Y + SCORPION_FOOT_LIFT * Math.sin(Math.PI * t),
    mix(long[2], side * SCORPION_FOOT.z, across),
  ];
  const lying: Vec3 = [-1, -0.1, 0];
  // Both knees point up toward the ceiling and back, so the one that bends comes up off the floor,
  // and lying long the legs are the same either way round.
  const knees: Vec3 = [-1, 1, 0];
  const bottomPin: Pin = { at: bottomAnkle, toward: lying, pole: knees };
  const topPin: Pin = { at: topAnkle, toward: mix3(lying, [-0.6, -0.08, side * 0.8], across), pole: knees };
  return {
    ...body,
    pins: {
      rightHand: { at: SCORPION_RIGHT_HAND, toward: [0, -0.1, 1], pole: [-0.2, 1, 0] },
      leftHand: { at: SCORPION_LEFT_HAND, toward: [0, -0.1, -1], pole: [-0.2, 1, 0] },
      rightFoot: side === 1 ? bottomPin : topPin,
      leftFoot: side === 1 ? topPin : bottomPin,
    },
    // The top leg crosses over the bottom one, so it stays in front of it. The legs swap with the
    // body flat, where they lie apart.
    behind: [side === 1 ? ['rightLeg', 'leftLeg'] : ['leftLeg', 'rightLeg']],
  };
};
/** The foot swings on an arc, which straight lines between keyframes would cut across, so each swing takes this many. */
const SCORPION_STEPS = 16;
/** One leg over and back, starting from the body flat, ordered for that leg. */
const scorpionRep = (side: 1 | -1): Keyframe3[] => [
  { ms: 300, pose: scorpionAt(side, 0) },
  ...alongArc(1500, SCORPION_STEPS, (t) => scorpionAt(side, t)),
  { ms: 600, pose: scorpionAt(side, 1) },
  ...alongArc(1500, SCORPION_STEPS, (t) => scorpionAt(side, 1 - t)),
];

export const REVERSE_SCORPION_3D: Clip3D = {
  view: '3d',
  // From beyond the head and above: the bent leg rises off the floor behind the body, the knee up,
  // and the foot swings across the screen over the other leg, the same for either leg. From the
  // feet end the thigh comes straight at the camera and the bent knee hides behind it; from the
  // side one leg goes over toward the camera and the other away behind the body. The camera tips
  // on over the top from the feet end (a pitch past 90) rather than standing beyond the head, which
  // is the same view turned round on the screen, so the head is at the top rather than the bottom.
  camera: { yaw: -90, pitch: 130 },
  highlight: ['rightLeg', 'leftLeg'],
  // Seen from beyond the head the hips are in front of the thighs, even the one lifting off the floor.
  behind: [
    ['rightLeg', 'torso'],
    ['leftLeg', 'torso'],
  ],
  // The left foot down across the right leg.
  stillFrame: 1 + SCORPION_STEPS,
  keyframes: [{ ms: 0, pose: scorpionAt(1, 0) }, ...scorpionRep(1), ...scorpionRep(-1)],
};

// --- Seated hip internal rotation: on the edge of a table with a mini band around the ankles, one foot swings out to the side against it, the thigh turning in and the knee staying put ---

/** The right foot out, the thigh turned in about as far as adults can (Hallaçeli 2014). */
const SEATED_IR_OUT = seatedRotationAt(-HIP_ROTATION, 90);
const SEATED_IR_IN = seatedRotationAt(0, 90);

export const SEATED_HIP_INTERNAL_ROTATION_3D: Clip3D = {
  view: '3d',
  // From the front, where the shin's swing out to the side is flat on the screen and the band
  // stretches across it, turned a little toward the moving leg and raised enough to see the table
  // top the thighs rest on (as the hip rotation test).
  camera: { yaw: 70, pitch: 14 },
  highlight: ['rightLeg'],
  scenery: TABLE,
  miniBand: 'ankles',
  // The foot out, the band stretched.
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: SEATED_IR_IN },
    { ms: 300, pose: SEATED_IR_IN },
    { ms: 1200, pose: SEATED_IR_OUT },
    { ms: 400, pose: SEATED_IR_OUT },
    { ms: 1200, pose: SEATED_IR_IN },
  ],
};

// --- Shoulder pass-throughs: standing tall with a wide grip, both straight arms sweep from in front of the hips up overhead and down behind the back, and back ---

/** How far out to each side the hands are, holding the towel or band with a wide grip. */
const PASS_HAND_OUT = 115;
/** How far past straight down the hands are in front of the hips, and behind the back. */
const PASS_PAST_DOWN = 20;
/** How far the shoulders rise toward the ears with the arms overhead. */
const PASS_SHRUG = 18;

/**
 * The arms this far round from straight down (0), forward and up: 180 is overhead and 360 straight
 * down behind. With the grip wide and the arms straight, each hand stays the same distance out to
 * its side, so it goes round its shoulder on a circle, and the shoulders rise as the arms go up.
 */
const passAt = (degrees: number): Pose3 => {
  const shrug = PASS_SHRUG * Math.sin(radians(degrees / 2)) ** 2;
  const body: Pose3 = { ...STANDING, rightArm: { shrug }, leftArm: { shrug } };
  const skeleton = solvePose(body);
  const hand = (shoulder: Vec3, side: 1 | -1): Vec3 => {
    const reach = Math.sqrt(ARM_REACH ** 2 - (side * PASS_HAND_OUT - shoulder[2]) ** 2);
    return [shoulder[0] + reach * Math.sin(radians(degrees)), shoulder[1] - reach * Math.cos(radians(degrees)), side * PASS_HAND_OUT];
  };
  return {
    ...body,
    pins: {
      rightHand: { at: hand(skeleton.rightArm[0], 1), pole: [-Math.cos(radians(degrees)), -Math.sin(radians(degrees)), 0.3] },
      leftHand: { at: hand(skeleton.leftArm[0], -1), pole: [-Math.cos(radians(degrees)), -Math.sin(radians(degrees)), -0.3] },
    },
  };
};
const PASS_FRONT = passAt(PASS_PAST_DOWN);
const PASS_BEHIND = passAt(360 - PASS_PAST_DOWN);
/** Pinned hands go straight between keyframes, cutting across their circles, so each half of the sweep takes this many. */
const PASS_STEPS = 24;

export const SHOULDER_PASS_THROUGHS_3D: Clip3D = {
  view: '3d',
  // From the front and a little to the right, close on the upper body: the arms rise wide apart in
  // a Y overhead and go down behind the back on either side of it, and the arm going over the far
  // shoulder shows its sweep forward and back. From the side the two arms lie one over the other;
  // straight from the front the sweep forward and back comes at the camera.
  camera: { yaw: 55, pitch: 12, fit: 'upper' },
  highlight: ['rightArm', 'leftArm'],
  handBand: true,
  // Overhead.
  stillFrame: 1 + PASS_STEPS,
  keyframes: [
    { ms: 0, pose: PASS_FRONT },
    { ms: 300, pose: PASS_FRONT },
    ...alongArc(1500, PASS_STEPS, (t) => passAt(mix(PASS_PAST_DOWN, 180, t))),
    ...alongArc(1500, PASS_STEPS, (t) => passAt(mix(180, 360 - PASS_PAST_DOWN, t))),
    { ms: 300, pose: PASS_BEHIND },
    ...alongArc(1500, PASS_STEPS, (t) => passAt(mix(360 - PASS_PAST_DOWN, 180, t))),
    ...alongArc(1500, PASS_STEPS, (t) => passAt(mix(180, PASS_PAST_DOWN, t))),
  ],
};

// --- Side-lying external rotation: lying on the left side, the top elbow tucked against the side at 90°, the forearm turns up from the belly toward the ceiling with a light dumbbell ---

/** The top leg lies straight on the bottom one, turned in this far at the hip to rest on it. */
const SIDE_ER_LEG_REST = -6;
/** The forearm resting across the belly to start, turned in this far from straight out in front. */
const SIDE_ER_DOWN = -35;
/** As far as it turns up: a little short of pointing straight at the ceiling. */
const SIDE_ER_UP = 80;

const sideLyingRotationAt = (degrees: number): Pose3 => ({
  pelvis: [0, BOOK_SPINE_Y, 0],
  tilt: -90,
  // The bottom arm reaches long along the floor past the head, which rests on it.
  leftArm: { flex: 170 },
  rightArm: { elbow: 90, rotate: degrees },
  rightLeg: { abduct: SIDE_ER_LEG_REST },
  leftLeg: {},
});
const SIDE_ER_IN = sideLyingRotationAt(SIDE_ER_DOWN);
const SIDE_ER_OUT = sideLyingRotationAt(SIDE_ER_UP);

export const SIDE_LYING_EXTERNAL_ROTATION_3D: Clip3D = {
  view: '3d',
  // From in front, toward the feet and above: the forearm swings round the upper arm, which lies
  // along the body, so from toward the feet its arc from the belly up to the ceiling shows across the
  // screen, and from in front the elbow shows tucked against the side. Straight from the front the
  // forearm swung at the camera, and from the feet end the legs hid the body.
  camera: { yaw: 55, pitch: 30 },
  highlight: ['rightArm'],
  dumbbells: ['rightHand'],
  // Turned up.
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: SIDE_ER_IN },
    { ms: 400, pose: SIDE_ER_IN },
    { ms: 1600, pose: SIDE_ER_OUT },
    { ms: 600, pose: SIDE_ER_OUT },
    { ms: 1800, pose: SIDE_ER_IN },
  ],
};

// --- Sleeper stretch: lying on the left side, the bottom arm out in front at shoulder height with the elbow at 90° and the forearm up, the top hand presses the forearm down toward the floor ---

/** How far the top hand presses the bottom forearm down from pointing at the ceiling, toward the feet. */
const SLEEPER_PRESS = 55;
/** How far along the bottom forearm from the elbow the top hand presses: at the wrist. */
const SLEEPER_ALONG = 1;
/** How far the middle of the top hand is from the middle of the bottom forearm: the forearm's half thickness and the hand's. */
const SLEEPER_HAND_OFF = 15;
/** How far from the wrist the middle of the hand is. */
const SLEEPER_HAND_MIDDLE = 13;

const sleeperBody = (press: number): Pose3 => ({
  pelvis: [0, BOOK_SPINE_Y, 0],
  tilt: -90,
  // The bottom arm lies on the floor straight out in front at shoulder height, the forearm up at
  // the ceiling to start and pressed down toward the feet, turning around the upper arm.
  leftArm: { flex: 90, elbow: 90, rotate: -90 - press },
  // Knees bent a little and stacked, the top one resting on the bottom one.
  rightLeg: { flex: 40, knee: 50, abduct: -8 },
  leftLeg: { flex: 40, knee: 50 },
});

/**
 * The bottom forearm pressed this far (0 to 1) down toward the feet by the top hand. The hand lies
 * across the forearm near the wrist, on the side toward the head, palm against it and fingers
 * pointing away from the body, and goes round with it.
 */
const sleeperAt = (t: number): Pose3 => {
  const body = sleeperBody(SLEEPER_PRESS * t);
  const [, elbow, wrist] = solvePose(body).leftArm;
  const forearm = unit3(sub3(wrist, elbow));
  // Square to the forearm, in the way it turns: toward the feet as it's pressed down.
  const pushing = unit3(cross3([1, 0, 0], forearm));
  const contact = along3(along3(elbow, forearm, SLEEPER_ALONG * SKELETON.forearm), pushing, -SLEEPER_HAND_OFF);
  return {
    ...body,
    pins: { rightHand: { at: along3(contact, [-1, 0, 0], SLEEPER_HAND_MIDDLE), toward: [1, 0, 0], pole: [-0.3, 1, 0.5] } },
  };
};
const SLEEPER_UP = sleeperAt(0);
const SLEEPER_PRESSED = sleeperAt(1);
/**
 * The pressing hand goes round with the forearm, so the press takes this many steps rather than one
 * straight move. Each step goes at an even speed, so it takes this many for the press to ease in and
 * out smoothly: with 8, the top arm jerked from one speed to the next at each step.
 */
const SLEEPER_STEPS = 24;

export const SLEEPER_STRETCH_3D: Clip3D = {
  view: '3d',
  // From in front and a little toward the head, above: the forearm turns around the upper arm, which
  // points out in front of the body, so from in front its swing from the ceiling down toward the feet
  // is across the screen, and from a little toward the head the upper arm shows its length too,
  // coming out from the shoulder. Straight from the front it pointed at the camera and was lost, and
  // the arm looked like a stick standing on the floor.
  camera: { yaw: 115, pitch: 30 },
  highlight: ['leftArm'],
  // The top hand stays on the bottom wrist.
  holds: [{ hand: 'rightHand', limb: 'leftArm' }],
  // The bottom forearm stands out in front, nearer the camera than the top arm reaching to it, but
  // the two are near the same depth and swapped partway through the press.
  behind: [['rightArm', 'leftArm']],
  // Pressed down.
  stillFrame: 1 + SLEEPER_STEPS,
  keyframes: [
    { ms: 0, pose: SLEEPER_UP },
    { ms: 600, pose: SLEEPER_UP },
    ...alongArc(1800, SLEEPER_STEPS, sleeperAt),
    { ms: 3500, pose: SLEEPER_PRESSED },
    ...alongArc(1800, SLEEPER_STEPS, (t) => sleeperAt(1 - t)),
  ],
};

// --- The Sagittarius: lying on the left side with the top hip and knee at 90°, the bottom hand holding the knee down, the chest turns open and the top arm lies back on the floor behind ---

/**
 * The top hip and knee at 90°, the thigh turned in this far at the hip to bring the knee down
 * toward the floor in front, and the toes pointed a little, as a relaxed foot lies. Further down,
 * the foot, square to the shin, tipped its toes into the floor.
 */
const SAG_KNEE_DOWN = -20;
const SAG_TOES = -25;
/** How far the bottom hand's middle rests above the middle of the top knee: on top of it, holding it down. */
const SAG_HAND_ON_KNEE = 17;
/** How far from the wrist the middle of the hand is. */
const SAG_HAND_MIDDLE = 13;
/**
 * How much the bottom hand tips down over the knee from the line of the arm: the palm over the top of
 * the knee and the fingers curling down its far side.
 */
const SAG_HAND_TIP = 0.25;
/** How high the fingertips of a hand lying on the floor are: half the fingers' thickness. */
const SAG_FINGERTIPS_Y = 9;

/**
 * The chest this far turned open, the top arm swinging round with it from `closed`, resting on the
 * floor in front of the chest, to `arm`, on the floor behind.
 */
const sagittariusBody = (open: number, arm = SAG_OPEN_ARM, closed = SAG_CLOSED_ARM): Pose3 => ({
  pelvis: [0, BOOK_SPINE_Y, 0],
  tilt: -90,
  spine: { twist: BOOK_OPEN.twist * open },
  neck: { twist: BOOK_OPEN.neck * open },
  rightArm: { flex: 90, abduct: mix(closed, arm, open), shrug: BOOK_SHRUG },
  leftArm: { shrug: BOOK_SHRUG },
  rightLeg: { flex: 90, knee: 90, abduct: SAG_KNEE_DOWN, ankle: SAG_TOES },
  leftLeg: {},
});
/** How far the top arm comes down across the chest, closed, for the fingertips to rest on the floor in front of it. */
const SAG_CLOSED_ARM = (() => {
  let [short, past] = [0, -90];
  for (let i = 0; i < 40; i++) {
    const arm = (short + past) / 2;
    if (solvePose(sagittariusBody(0, BOOK_OPEN.arm, arm)).rightArm[3][1] > SAG_FINGERTIPS_Y) short = arm;
    else past = arm;
  }
  return (short + past) / 2;
})();
/**
 * How far out the top arm opens: as the chest turns open it swings round behind, and it goes as far
 * as it takes for the hand to lie on the floor behind, relaxed, the back of it down, the fingertips touching.
 */
const SAG_OPEN_ARM = (() => {
  let [short, past] = [BOOK_OPEN.arm, 180];
  for (let i = 0; i < 40; i++) {
    const arm = (short + past) / 2;
    if (solvePose(sagittariusBody(1, arm, 0)).rightArm[3][1] > SAG_FINGERTIPS_Y) short = arm;
    else past = arm;
  }
  return (short + past) / 2;
})();
/** The top knee, down on the floor in front, which stays there. */
const SAG_KNEE = solvePose(sagittariusBody(0)).rightLeg[1];
/** Where the middle of the bottom hand is, holding the knee: on top of it. */
const SAG_ON_KNEE: Vec3 = [SAG_KNEE[0], SAG_KNEE[1] + SAG_HAND_ON_KNEE, SAG_KNEE[2]];

/**
 * The chest this far open, the bottom hand on top of the knee holding it down. The hand points on
 * from the arm, from the bottom shoulder to the knee, tipped down over the knee, so the wrist stays
 * near straight as the shoulder lifts with the chest turning.
 */
const sagittariusAt = (open: number): Pose3 => {
  const body = sagittariusBody(open);
  const along = unit3(sub3(SAG_ON_KNEE, solvePose(body).leftArm[0]));
  const onKnee = unit3([along[0], along[1] - SAG_HAND_TIP, along[2]]);
  return {
    ...body,
    pins: { leftHand: { at: along3(SAG_ON_KNEE, onKnee, -SAG_HAND_MIDDLE), toward: onKnee, pole: [1, 0.3, 0] } },
  };
};
const SAG_CLOSED = sagittariusAt(0);
const SAG_OPEN = sagittariusAt(1);
const SAG_STEPS = 16;

export const THE_SAGITTARIUS_3D: Clip3D = {
  view: '3d',
  // As in open book, from the feet end, a little behind the back and well above: the arm sweeps round
  // over the body in a half circle across the screen as the chest turns up toward the camera, the top
  // knee is in front, down on the floor, and the bottom leg reaches long down the screen.
  camera: OPEN_BOOK_3D.camera,
  highlight: ['torso', 'rightArm'],
  // The bottom hand holds the top knee down, on top of it.
  holds: [{ hand: 'leftHand', limb: 'rightLeg' }],
  // As in open book: the top knee is nearer the camera than the top arm, well apart from it on
  // screen, and by depth they swapped as the arm went overhead.
  behind: [['rightArm', 'rightLeg']],
  // The face turns up toward the camera as the chest opens, and a nose appearing partway through
  // only distracts from the arm.
  nose: false,
  // Open.
  stillFrame: 1 + SAG_STEPS,
  keyframes: [
    { ms: 0, pose: SAG_CLOSED },
    { ms: 600, pose: SAG_CLOSED },
    ...alongArc(2200, SAG_STEPS, sagittariusAt),
    { ms: 3500, pose: SAG_OPEN },
    ...alongArc(2200, SAG_STEPS, (t) => sagittariusAt(1 - t)),
  ],
};

// --- Thread the needle: on all fours, one arm reaches up to the ceiling as the chest turns open, then sweeps down and threads under the other arm, the shoulder and the side of the head coming down to the mat ---

/** How far the chest turns open, reaching up, and closed, threaded under. */
const NEEDLE_TWIST = { reach: -55, thread: 50 };
/**
 * Threaded, the hips sit back a little toward the heels, swinging round the knees on the thighs, and
 * the chest drops, the planted elbow bending.
 */
const NEEDLE_HIPS_BACK = 22;
const NEEDLE_PELVIS = { reach: ALL_FOURS.pelvis, thread: [-NEEDLE_HIPS_BACK, ANKLE_Y + Math.sqrt((0.999 * SKELETON.thigh) ** 2 - NEEDLE_HIPS_BACK ** 2), 0] as Vec3 };
/** Threaded, the chest bends over toward the planted hand, bringing the shoulder in under the middle of the body. */
const NEEDLE_SIDE = 30;
/** How high the threaded shoulder rests on the mat. */
const NEEDLE_SHOULDER_Y = 24;
/** The planted hand, a little wider than on all fours so the head comes down inside it. */
const NEEDLE_LEFT_HAND: Pin = { at: [124, WRIST_Y, -45], toward: [1, 0, 0], pole: [-0.3, 0.8, -1] };
/** Reaching up, the head turns to follow the hand. */
const NEEDLE_NECK_UP = { twist: -30, flex: -15, side: 0 };
/** Threaded, the side of the head rests on the mat ahead of the neck, turned this far in toward the threaded shoulder. */
const NEEDLE_HEAD_IN = 25;
const NEEDLE_NECK_TWIST_DOWN = 15;

/** Down this far, from reaching up (0) to threaded (1), with the body leaning this far and the neck bent so. */
const needleBody = (t: number, down: number, lean: number, neck: Bend): Pose3 => ({
  ...ALL_FOURS,
  pelvis: mix3(NEEDLE_PELVIS.reach, NEEDLE_PELVIS.thread, down),
  lean,
  spine: { twist: mix(NEEDLE_TWIST.reach, NEEDLE_TWIST.thread, t), side: -NEEDLE_SIDE * down },
  neck,
});
const NEEDLE_LEAN_UP = onAllFours(0, 0).lean!;
/** Threaded, the body leans until the threaded shoulder is down on the mat. */
const NEEDLE_LEAN_DOWN = (() => {
  let [high, low] = [NEEDLE_LEAN_UP, 170];
  for (let i = 0; i < 40; i++) {
    const lean = (high + low) / 2;
    if (solvePose(needleBody(1, 1, lean, {})).rightArm[0][1] > NEEDLE_SHOULDER_Y) high = lean;
    else low = lean;
  }
  return (high + low) / 2;
})();
/** Threaded, the neck bent to rest the middle of the head a head's height up off the mat, ahead of the neck. */
const NEEDLE_NECK_DOWN = ((): Bend => {
  const pose = (flex: number, side: number) => needleBody(1, 1, NEEDLE_LEAN_DOWN, { twist: NEEDLE_NECK_TWIST_DOWN, flex, side });
  const base = solvePose(pose(0, 0)).spine[6];
  const y = SKELETON.head + 1;
  const flat = Math.sqrt(SKELETON.neck ** 2 - (base[1] - y) ** 2);
  const target: Vec3 = [base[0] + flat * Math.cos(radians(NEEDLE_HEAD_IN)), y, base[2] + flat * Math.sin(radians(NEEDLE_HEAD_IN))];
  let best = { flex: 0, side: 0, gap: Infinity };
  for (const step of [10, 2, 0.4, 0.08]) {
    const around = best;
    for (let i = -6; i <= 6; i++) {
      for (let j = -6; j <= 6; j++) {
        const [flex, side] = [around.flex + i * step, around.side + j * step];
        const gap = distance(solvePose(pose(flex, side)).head, target);
        if (gap < best.gap) best = { flex, side, gap };
      }
    }
  }
  return { twist: NEEDLE_NECK_TWIST_DOWN, flex: best.flex, side: best.side };
})();

/** The right arm's direction from its shoulder: up at the ceiling, then down at the floor, then along it out under the left arm. */
const NEEDLE_AIM = { up: unitOf([0, 1, 0.35]), down: unitOf([-0.35, -1, 0]), across: unitOf([-0.12, 0, -1]) };

/**
 * Bent on its way down to the floor, the right elbow points out to the right side, clear of the chest
 * above it and the knees behind.
 */
const NEEDLE_ELBOW: Vec3 = [-0.3, 0.3, 1];
/** How far down the arm is straight along the floor, out under the planted arm, and how far either side of that it eases in. */
const NEEDLE_ACROSS_BY = 0.8;
const NEEDLE_ACROSS_EASE = 0.15;
/**
 * From here on the right arm is under the chest, behind the torso, with the top of it drawn over the
 * shoulder it hangs from (`upperArmsOver`). It changes sides as it hangs down below the shoulder with
 * the hand near the floor.
 */
const NEEDLE_UNDER = 0.5;

/** The pose this far along the move's own way, from reaching up (0) to threaded under (1), before it's timed. */
const needleAlong = (t: number): Pose3 => {
  const down = phase(t, 0.3, 1);
  const neck = { twist: mix(NEEDLE_NECK_UP.twist, NEEDLE_NECK_DOWN.twist!, t), flex: mix(NEEDLE_NECK_UP.flex, NEEDLE_NECK_DOWN.flex!, down), side: mix(NEEDLE_NECK_UP.side, NEEDLE_NECK_DOWN.side!, down) };
  const body = needleBody(t, down, mix(NEEDLE_LEAN_UP, NEEDLE_LEAN_DOWN, down), neck);
  const shoulder = solvePose(body).rightArm[0];
  // Across, the hand lies on the floor an arm's length out.
  const flat = Math.sqrt(Math.max(0, ARM_REACH ** 2 - (shoulder[1] - WRIST_Y) ** 2));
  const across = unit3([NEEDLE_AIM.across[0] * flat, WRIST_Y - shoulder[1], NEEDLE_AIM.across[2] * flat]);
  // The arm gets there, straight along the floor, before the shoulder comes down, which then slides
  // the hand on out. It eases into it over a short way rather than stopping turning all at once,
  // which snapped the bent elbow straight.
  const toward = t / NEEDLE_ACROSS_BY;
  const along = toward < 1 - NEEDLE_ACROSS_EASE ? toward : toward > 1 + NEEDLE_ACROSS_EASE ? 1 : toward - (toward - 1 + NEEDLE_ACROSS_EASE) ** 2 / (4 * NEEDLE_ACROSS_EASE);
  const aim = unit3(curve(NEEDLE_AIM.up, NEEDLE_AIM.down, across, along));
  const toFloor = aim[1] < -1e-3 ? (shoulder[1] - WRIST_Y) / -aim[1] : Infinity;
  const at = along3(shoulder, aim, Math.min(ARM_REACH, toFloor));
  // The hand carries on from the arm, but never tips its fingers into the floor: once down there it
  // lies flat along it, pointing the way the arm goes.
  const lowest = -(at[1] - 10) / SKELETON.hand;
  const pointingY = Math.max(aim[1], lowest);
  const level = unit3([aim[0] + 0.3 * NEEDLE_AIM.across[0], 0, aim[2] + 0.3 * NEEDLE_AIM.across[2]]);
  const sideways = Math.sqrt(1 - pointingY ** 2);
  return {
    ...body,
    pins: {
      ...ALL_FOURS.pins,
      leftHand: NEEDLE_LEFT_HAND,
      rightHand: { at, toward: [level[0] * sideways, pointingY, level[2] * sideways], pole: NEEDLE_ELBOW },
    },
    ...(t >= NEEDLE_UNDER ? { behind: [['rightArm', 'torso']] as const } : {}),
  };
};
/**
 * How far the hand and the shoulder have gone together by each of these many even steps along the
 * move's way. The hand swings a long way from the ceiling to the floor in the middle of it, and taken
 * at an even rate along its way it whipped through there and crawled at either end. Timed by how far
 * they go, nothing hurries or lags, and the move as a whole eases in and out.
 */
const NEEDLE_TIMING_STEPS = 120;
const NEEDLE_TRAVELLED = (() => {
  const points = (t: number): [Vec3, Vec3] => {
    const pose = needleAlong(t);
    return [pose.pins!.rightHand!.at, solvePose(pose).rightArm[0]];
  };
  const travelled = [0];
  let [hand, shoulder] = points(0);
  for (let i = 1; i <= NEEDLE_TIMING_STEPS; i++) {
    const [nextHand, nextShoulder] = points(i / NEEDLE_TIMING_STEPS);
    travelled.push(travelled[i - 1] + distance(hand, nextHand) + distance(shoulder, nextShoulder));
    [hand, shoulder] = [nextHand, nextShoulder];
  }
  return travelled;
})();

/** From reaching up (0) to threaded under (1), this share of the way the hand and the shoulder go. */
const needleAt = (share: number): Pose3 => {
  const goal = share * NEEDLE_TRAVELLED[NEEDLE_TIMING_STEPS];
  let i = 1;
  while (i < NEEDLE_TIMING_STEPS && NEEDLE_TRAVELLED[i] < goal) i++;
  const [before, after] = [NEEDLE_TRAVELLED[i - 1], NEEDLE_TRAVELLED[i]];
  return needleAlong((i - 1 + (after > before ? (goal - before) / (after - before) : 0)) / NEEDLE_TIMING_STEPS);
};
const NEEDLE_REACH = needleAt(0);
const NEEDLE_THREAD = needleAt(1);
const NEEDLE_STEPS = 48;

export const THREAD_THE_NEEDLE_3D: Clip3D = {
  view: '3d',
  // From in front and to the reaching arm's side, a little above, where the whole body shows, the
  // back and hips as well as the arms. The arm reaching up opens the chest toward the camera, and
  // threaded it comes out along the floor past the planted arm. Further round to the side the chest
  // and the planted arm covered it; from the planted arm's side that arm covered the head.
  camera: { yaw: 60, pitch: 25 },
  highlight: ['torso', 'rightArm'],
  // The face turns from the floor up toward the hand and back, and a nose coming and going only
  // distracts from the arm.
  nose: false,
  // The planted arm is in front of the chest the whole way: by where they overlap it changed sides
  // as the chest came down beside it.
  over: ['leftArm'],
  // The thighs are behind the chest, which slopes down toward the camera; the near one came over
  // it as the chest came down. The head is in front of the reaching arm's shoulder from here, and
  // the top of the arm swapped places with it where they touch as the arm came down.
  behind: [
    ['rightLeg', 'torso'],
    ['rightArm', 'head'],
  ],
  // The arm threading under the chest goes behind the torso as it hangs down from the shoulder, but
  // the top of it stays in front of the shoulder it hangs from.
  upperArmsOver: ['rightArm'],
  // Threaded.
  stillFrame: 1 + NEEDLE_STEPS,
  keyframes: [
    { ms: 0, pose: NEEDLE_REACH },
    { ms: 250, pose: NEEDLE_REACH },
    ...alongArc(1900, NEEDLE_STEPS, needleAt),
    { ms: 250, pose: NEEDLE_THREAD },
    ...alongArc(1900, NEEDLE_STEPS, (t) => needleAt(1 - t)),
  ],
};

// --- Windshield wipers with knee lift: leaning back on the hands with a mini band round the knees, both knees tip to one side, hovering, and the top knee lifts against the band, its foot coming up too ---

/** The feet planted about hip-width apart, a little less than a right angle at the knees. */
const WIPERS_ANKLE: Vec3 = [128, ANKLE_Y, 34];
/** How far round the knees tip from pointing at the ceiling, stopping short of the floor. */
const WIPERS_TIP = 50;
/** How far the top leg turns up off the bottom one, the knee and the foot together. */
const WIPERS_LIFT = 26;

/** `point` turned `degrees` around the line through `origin` along `axis` (a unit vector). */
const turnAround = (point: Vec3, origin: Vec3, axis: Vec3, degrees: number): Vec3 => {
  const v = sub3(point, origin);
  const [c, s] = [Math.cos(radians(degrees)), Math.sin(radians(degrees))];
  const across = cross3(axis, v);
  const along = axis[0] * v[0] + axis[1] * v[1] + axis[2] * v[2];
  const at = (i: number) => origin[i] + v[i] * c + across[i] * s + axis[i] * along * (1 - c);
  return [at(0), at(1), at(2)];
};

/**
 * Both knees tipped `tip` degrees round from upright, toward the figure's right for a positive
 * number, and the top leg (the one tipping across, toward the other) lifted `lift` degrees off it.
 * With the feet planted each knee swings on a circle around the line from its hip to its ankle, as
 * in the lying windshield wiper hold: the leg on the side they tip to turns out, the other turns
 * in. The lift turns the top leg out of its own plane about its hip, the knee rising up and back
 * toward its own side against the band and the foot coming up off the floor with it. Leaning back
 * on the hands, as in the 90 to 90 rotations, the pelvis rolling a little with the knees.
 */
const wipersAt = (tip: number, lift = 0): Pose3 => {
  const side = Math.sign(tip) || 1;
  const body: Pose3 = {
    pelvis: [0, NINETY_PELVIS_Y, 0],
    lean: -25,
    turn: (-5 * tip) / WIPERS_TIP,
    spine: { twist: (5 * tip) / WIPERS_TIP },
    neck: { flex: 20 },
    pins: {
      rightHand: { at: [-110, WRIST_Y, 84], toward: [-1, 0, 0.5], pole: [-1, 0, 0.3] },
      leftHand: { at: [-110, WRIST_Y, -84], toward: [-1, 0, -0.5], pole: [-1, 0, -0.3] },
    },
  };
  const skeleton = solvePose(body);
  const foot = (leg: 1 | -1): Pin => {
    const hip = leg === 1 ? skeleton.rightLeg[0] : skeleton.leftLeg[0];
    const ankle: Vec3 = [WIPERS_ANKLE[0], WIPERS_ANKLE[1], leg * WIPERS_ANKLE[2]];
    const axis = unit3(sub3(ankle, hip));
    const middle = mix3(hip, ankle, 0.5);
    const radius = Math.sqrt(SKELETON.thigh ** 2 - (distance(hip, ankle) / 2) ** 2) * 0.999;
    const level = axis[1];
    const up = unit3([-level * axis[0], 1 - level * axis[1], -level * axis[2]]);
    let across = cross3(axis, up);
    if (across[2] < 0) across = [-across[0], -across[1], -across[2]];
    const r = radians(tip);
    const circle = (i: number) => middle[i] + radius * (up[i] * Math.cos(r) + across[i] * Math.sin(r));
    const knee: Vec3 = [circle(0), circle(1), circle(2)];
    if (leg !== -side || lift === 0) return pinVia(hip, knee, ankle, [1, 0, 0]);
    // Out of the leg's plane, about an axis through the hip in that plane and square to the thigh.
    const thigh = unit3(sub3(knee, hip));
    const shin = unit3(sub3(ankle, knee));
    const dot = thigh[0] * shin[0] + thigh[1] * shin[1] + thigh[2] * shin[2];
    const turnAxis = unit3([shin[0] - dot * thigh[0], shin[1] - dot * thigh[1], shin[2] - dot * thigh[2]]);
    // Whichever way round lifts the knee.
    const turn = turnAround(knee, hip, turnAxis, lift)[1] > knee[1] ? lift : -lift;
    const raisedKnee = turnAround(knee, hip, turnAxis, turn);
    const raisedAnkle = turnAround(ankle, hip, turnAxis, turn);
    const toes = sub3(turnAround(along3(ankle, [1, 0, 0], 1), hip, turnAxis, turn), raisedAnkle);
    return pinVia(hip, raisedKnee, raisedAnkle, toes);
  };
  return { ...body, pins: { ...body.pins, rightFoot: foot(1), leftFoot: foot(-1) } };
};
const WIPERS_RIGHT = wipersAt(WIPERS_TIP);
const WIPERS_STEPS = 12;

/** Over from one side to the other, the knees passing upright, then the top knee lifting and lowering. */
const wipersSide = (to: 1 | -1): Keyframe3[] => [
  ...alongArc(1800, WIPERS_STEPS, (t) => wipersAt(to * WIPERS_TIP * (2 * t - 1))),
  { ms: 150, pose: wipersAt(to * WIPERS_TIP) },
  ...alongArc(800, WIPERS_STEPS, (t) => wipersAt(to * WIPERS_TIP, WIPERS_LIFT * t)),
  { ms: 300, pose: wipersAt(to * WIPERS_TIP, WIPERS_LIFT) },
  ...alongArc(800, WIPERS_STEPS, (t) => wipersAt(to * WIPERS_TIP, WIPERS_LIFT * (1 - t))),
];

export const WINDSHIELD_WIPERS_WITH_KNEE_LIFT_3D: Clip3D = {
  view: '3d',
  // From straight in front and a little above: the knees sweep from side to side across the screen,
  // and the top knee lifts up it with its foot coming out to the side, the band stretching between
  // the knees. Higher up and turned to one side (as the 90 to 90 rotations), the lift came toward
  // the camera and barely showed.
  camera: { yaw: 90, pitch: 18 },
  highlight: ['rightLeg', 'leftLeg'],
  // The thighs come off the front of the hips toward the camera, so the legs stay over them. The
  // feet are far enough apart that the knees are clear of each other passing upright, which is
  // where the legs change over: the top leg is in front of the bottom one on each side.
  over: ['rightLeg', 'leftLeg'],
  miniBand: 'knees',
  // Tipped to the left, the top knee lifted.
  stillFrame: 2 * WIPERS_STEPS + 2,
  keyframes: [{ ms: 0, pose: WIPERS_RIGHT }, ...wipersSide(-1), ...wipersSide(1)],
};

// --- World's greatest stretch: a long lunge with both hands on the floor inside the front foot, the inside arm reaches up to the ceiling as the chest turns open, comes back down, and the front leg straightens for a moment ---

/** The front foot is planted flat a little out from the hip, so both hands fit on the floor inside it. */
const WGS_FRONT_ANKLE: Vec3 = [100, ANKLE_Y, 60];
/** The front shin tips forward of upright this far, and the thigh is this far above level. */
const WGS_SHIN = 10;
const WGS_THIGH = 8;
/** The back foot is up on the ball of the foot, the leg straight. */
const WGS_BACK_ANKLE_Y = 32;
const WGS_BACK_TOES: Vec3 = [0.85, -0.53, 0];
/** Both hands flat on the floor inside the front foot, shoulder-width apart, level with the toes. */
const WGS_HANDS = { x: 128, right: 18, left: -42 };
/** How far the chest turns open toward the front leg, and how much of that the neck turns back. */
const WGS_TWIST = 75;
const WGS_NECK_BACK = 20;

const WGS_LUNGE_PELVIS: Vec3 = (() => {
  const knee: Vec3 = [WGS_FRONT_ANKLE[0] + SKELETON.shin * Math.sin(radians(WGS_SHIN)), ANKLE_Y + SKELETON.shin * Math.cos(radians(WGS_SHIN)), 0];
  return [knee[0] - SKELETON.thigh * Math.cos(radians(WGS_THIGH)), knee[1] + SKELETON.thigh * Math.sin(radians(WGS_THIGH)), 0];
})();
/** The back ankle sits a straight leg's length behind and below the hip in the lunge. */
const WGS_BACK_ANKLE: Vec3 = [
  WGS_LUNGE_PELVIS[0] - Math.sqrt(LEG_REACH ** 2 - (WGS_LUNGE_PELVIS[1] - WGS_BACK_ANKLE_Y) ** 2),
  WGS_BACK_ANKLE_Y,
  -SKELETON.hip,
];
/** How far round the back ankle the hips swing from the lunge, the back leg staying straight. */
const wgsPelvisAt = (degrees: number): Vec3 => {
  const [dx, dy] = [WGS_LUNGE_PELVIS[0] - WGS_BACK_ANKLE[0], WGS_LUNGE_PELVIS[1] - WGS_BACK_ANKLE[1]];
  const [c, s] = [Math.cos(radians(degrees)), Math.sin(radians(degrees))];
  return [WGS_BACK_ANKLE[0] + dx * c - dy * s, WGS_BACK_ANKLE[1] + dx * s + dy * c, 0];
};
/** Swung back and up until the front leg is straight as well: both legs straight, the hips high. */
const WGS_STRAIGHT_SWING = leanWhere((d) => {
  const [x, y] = wgsPelvisAt(d);
  return distance([x, y, SKELETON.hip], WGS_FRONT_ANKLE) - LEG_REACH;
}, 0, 60);

const WGS_LEGS: NonNullable<Pose3['pins']> = {
  rightFoot: { at: WGS_FRONT_ANKLE, toward: [1, 0, 0.15], pole: [1, 0.6, 0.5] },
  leftFoot: { at: WGS_BACK_ANKLE, toward: WGS_BACK_TOES, pole: [1, 0.3, 0] },
};
const wgsPlanted = (side: 1 | -1): Pin => ({
  at: [WGS_HANDS.x, WRIST_Y, side === 1 ? WGS_HANDS.right : WGS_HANDS.left],
  toward: [1, 0, 0],
  pole: [-1, 0, side * 0.5],
});

/**
 * The body with the hips swung `swing` degrees back and up from the lunge and the chest turned
 * `open` of the way toward the front leg, leaning over just far enough that the left hand stays
 * planted with its arm all but straight.
 */
const wgsBody = (swing: number, open: number): Pose3 => {
  const body = (lean: number): Pose3 => ({
    pelvis: wgsPelvisAt(swing),
    lean,
    spine: { flex: 8, twist: -WGS_TWIST * open },
    neck: { flex: mix(-30, -10, open), twist: WGS_NECK_BACK * open },
    pins: WGS_LEGS,
  });
  const left = wgsPlanted(-1).at;
  const lean = leanWhere((l) => distance(solvePose(body(l)).leftArm[0], left) - 0.97 * ARM_REACH, 20, 120);
  return body(lean);
};

/** A point no lower than `floor`. */
const atLeast = ([x, y, z]: Vec3, floor: number): Vec3 => [x, Math.max(y, floor), z];
/** The elbow's angle (radians) for a hand this far from the shoulder. */
const elbowFor = (reach: number) => 2 * Math.asin(Math.min(1, reach / (SKELETON.upperArm + SKELETON.forearm)));
/** How bent the right elbow is with the hand planted in the lunge. */
const WGS_PLANTED_ELBOW = elbowFor(distance(solvePose(wgsBody(0, 0)).rightArm[0], wgsPlanted(1).at));
/** How far into the move the arm starts swinging out: before that, the hand only lifts off the floor. */
const WGS_SWING_FROM = 0.12;
/**
 * The right arm `up` of the way from flat on the floor to straight up at the ceiling, as the chest
 * turns open with it: it lifts off the floor up and out to the right, the side the chest turns
 * toward, passing in front of the face, and on up, straightening as it goes. The left hand stays
 * planted.
 */
const wgsReachAt = (up: number): Pose3 => {
  const body = wgsBody(0, up);
  const shoulder = solvePose(body).rightArm[0];
  const planted = wgsPlanted(1);
  const from = unit3(sub3(planted.at, shoulder));
  // Mostly up on the way, so the hand rises clear of the front knee before it swings out.
  const side = unit3([0.25, 0.9, 0.35]);
  const ceiling: Vec3 = [0, 1, 0];
  // The swing waits for the hand to come up off the floor. Swung from hanging straight down, the
  // hand slid out along the floor before it rose.
  const swing = phase(up, WGS_SWING_FROM, 1);
  const way = turnToward(turnToward(from, side, swing), turnToward(side, ceiling, swing), swing);
  // The elbow keeps the bend it had on the floor, so the hand lifts off with the shoulder as the chest
  // starts to turn, and straightens with the swing. Its angle moves evenly, not the arm's length: near
  // straight, a little more length opens the elbow a lot. Measured to the planted hand, the arm was
  // pulled straight by the rising shoulder before the hand left the floor, and the elbow snapped.
  const elbow = mix(WGS_PLANTED_ELBOW, elbowFor(ARM_REACH), swing);
  const length = (SKELETON.upperArm + SKELETON.forearm) * Math.sin(elbow / 2);
  return {
    ...body,
    pins: {
      ...body.pins,
      leftHand: wgsPlanted(-1),
      // Never below where it was flat on the floor, as it sets off.
      rightHand: { at: atLeast(along3(shoulder, way, length), WRIST_Y), toward: turnToward(planted.toward!, ceiling, up), pole: planted.pole },
    },
  };
};
/** The hips `t` of the way swung back and up, the front leg straightening, both hands planted. */
const wgsStraightAt = (t: number): Pose3 => {
  const body = wgsBody(WGS_STRAIGHT_SWING * t, 0);
  return { ...body, pins: { ...body.pins, rightHand: wgsPlanted(1), leftHand: wgsPlanted(-1) } };
};
const WGS_LUNGE = wgsReachAt(0);
const WGS_REACH = wgsReachAt(1);
const WGS_STRAIGHT = wgsStraightAt(1);
/**
 * The arm all but straight sweeps through half a turn, so it takes this many keyframes to follow
 * the arc: going straight from one to the next cuts across it, the arm comes up short and the elbow
 * pops out between keyframes. With 14 the elbow bobbed on every one, and with 72 it still wobbled
 * a degree either way at the fastest part of the swing.
 */
const WGS_STEPS = 180;

export const WORLDS_GREATEST_STRETCH_3D: Clip3D = {
  view: '3d',
  // From the front leg's side, a little in front and just above, as the pyramid stretch: the long
  // lunge and the front leg straightening are flat on the screen, and the chest turns open toward
  // the camera with the arm going straight up the screen. From further in front the legs were end
  // on and the lunge didn't read.
  camera: { yaw: 20, pitch: 15 },
  // The face turns from the floor toward the camera as the chest opens, and a nose appearing partway
  // only distracts from the arm.
  nose: false,
  // The hips, the back leg's hip flexor, the front leg's groin and hamstring, and the chest turning.
  highlight: ['torso', 'rightLeg', 'leftLeg'],
  // The right hand is planted inside the front foot, behind the leg from here; by depth the two
  // swapped as the hand lifted off. Once up the arm is clear of the leg on the screen.
  behind: [['rightArm', 'rightLeg']],
  // Reaching up, the chest turned open.
  stillFrame: 1 + WGS_STEPS,
  keyframes: [
    { ms: 0, pose: WGS_LUNGE },
    ...alongArc(1600, WGS_STEPS, wgsReachAt),
    { ms: 600, pose: WGS_REACH },
    ...alongArc(1400, WGS_STEPS, (t) => wgsReachAt(1 - t)),
    { ms: 200, pose: WGS_LUNGE },
    ...alongArc(1200, WGS_STEPS, wgsStraightAt),
    { ms: 500, pose: WGS_STRAIGHT },
    ...alongArc(1200, WGS_STEPS, (t) => wgsStraightAt(1 - t)),
    { ms: 200, pose: WGS_LUNGE },
  ],
};
