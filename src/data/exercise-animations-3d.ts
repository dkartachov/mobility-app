import { distance, SKELETON, solvePose, strapPoints, type ArmPose, type Block, type Clip3D, type Keyframe3, type LegPose, type Pin, type Pose3, type Vec3 } from '@/lib/rig3d';

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

/** How the body sinks over the walk: steadily, settling just as the last step lands. */
const puppySink = (t: number) => smooth(t);
/** How many steps each hand takes. A planted hand's elbow bends as the chest sinks toward it, until that hand steps on, so fewer, longer steps bend the arms more. */
const PUPPY_STRIDES = 3;
/** The walk: the right hand, then the left, in turn. */
const PUPPY_STEPS = Array.from({ length: 2 * PUPPY_STRIDES }, (_, i) => ({
  hand: i % 2 === 0 ? ('rightHand' as const) : ('leftHand' as const),
  from: i / (2 * PUPPY_STRIDES),
  to: (i + 1) / (2 * PUPPY_STRIDES),
}));
/** Where the hands end up: as far out as the arms reach when the right hand takes its last step. The left one lands beside it. */
const PUPPY_HANDS_END = puppyReach(puppySink(PUPPY_STEPS[PUPPY_STEPS.length - 2].to));
/** The shortest step a hand takes, so none is too small to read as more than a lift and drop. */
const PUPPY_MIN_STEP = 16;
/**
 * Where a step lands: as far out as the arm reaches by then, but leaving the steps still to come
 * room to be at least the shortest step each. The last one lands beside the other hand.
 */
const puppyLanding = (step: number) => {
  const last = PUPPY_STEPS.length - 2;
  const k = Math.min(step, last);
  return Math.min(puppyReach(puppySink(PUPPY_STEPS[k].to)), PUPPY_HANDS_END - (last - k) * PUPPY_MIN_STEP);
};

/** Where a hand is this far through the walk: planted, or lifting a little off the floor on its way to the next spot. */
const puppyHand = (hand: 'rightHand' | 'leftHand', t: number): Vec3 => {
  let x = PUPPY_HANDS_START;
  let lift = 0;
  PUPPY_STEPS.forEach((step, i) => {
    if (step.hand !== hand || t <= step.from) return;
    const s = smooth(Math.min(1, (t - step.from) / (step.to - step.from)));
    const from = x;
    x = mix(from, puppyLanding(i), s);
    // A short step barely leaves the floor, so it reads as a step forward and not a hop.
    lift = t < step.to ? Math.sin(Math.PI * s) * Math.min(10, (puppyLanding(i) - from) / 3) : 0;
  });
  return [x, WRIST_Y + lift, (hand === 'rightHand' ? 1 : -1) * SKELETON.shoulder];
};

/**
 * Puppy pose this far through the walk. The head goes down with the chest, the forehead reaching
 * the floor as the body settles.
 */
const puppyAt = (t: number): Pose3 => {
  const p = puppySink(t);
  const body = puppyBody(p);
  // Whatever bend the arms take goes back and out to the sides, as in a push-up.
  const pole = (side: 1 | -1): Vec3 => [-0.7, 0, side * 0.7];
  const posed: Pose3 = {
    ...body,
    pins: {
      ...ALL_FOURS.pins,
      rightHand: { at: puppyHand('rightHand', t), toward: [1, 0, 0], pole: pole(1) },
      leftHand: { at: puppyHand('leftHand', t), toward: [1, 0, 0], pole: pole(-1) },
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
/** Enough frames for the lifted hands to arc and the planted ones to stay put, a whole number of them to each step so a step never shares one with the next. */
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
    ...puppyWalk(4000, puppyAt),
    { ms: 3500, pose: PUPPY },
    ...puppyWalk(3600, (t) => puppyAt(1 - t)),
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
  const pose = ankleMobilizationAt(mix(0, 22, t), 0, KNIGHT_BACK_KNEE);
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
