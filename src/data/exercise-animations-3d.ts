import { SKELETON, solvePose, strapPoints, type ArmPose, type Block, type Clip3D, type Keyframe3, type LegPose, type Pose3, type Vec3 } from '@/lib/rig3d';

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
