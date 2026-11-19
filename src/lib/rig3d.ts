/**
 * The second figure engine: a skeleton posed in three dimensions and then drawn from a camera.
 * A pose is the pelvis's place in the room plus joint angles in anatomical terms, so a rotation is
 * a rotation rather than a limb changing length, and moving between poses turns joints, which
 * carries hands and feet along arcs without being told to. A limb can instead be pinned to a spot,
 * and its elbow or knee is solved so it stays there as the body moves.
 *
 * The room has x pointing the way a figure with no turn faces, y up from a floor at 0, and z out to
 * the figure's right. Lengths are in the same units as the first engine's scene; angles in degrees.
 * Everything that runs per frame is a worklet.
 */

export type Vec3 = readonly [x: number, y: number, z: number];
type Vec2 = readonly [x: number, y: number];
/** A rotation, as the rows of a 3x3 matrix. */
type Mat3 = readonly number[];

export const SKELETON = {
  thigh: 100,
  shin: 100,
  foot: 42,
  torso: 125,
  neck: 48,
  upperArm: 75,
  forearm: 75,
  hand: 24,
  /** How far each shoulder and hip joint sits from the spine. */
  shoulder: 30,
  hip: 16,
  head: 30,
};

/** How a run of the spine curves, shared evenly along it. */
export type Bend = {
  /** Rounding forward. Negative arches back. */
  flex?: number;
  /** Turning to the figure's left. */
  twist?: number;
  /** Bending to the figure's right. */
  side?: number;
};

/** An arm hanging at the side with the palm in is all zeros. */
export type ArmPose = {
  /** Raising the arm forward. Negative reaches back. */
  flex?: number;
  /** Raising the arm out to its own side. */
  abduct?: number;
  /** Turning the upper arm outward around its own length, which swings a bent forearm away from the body. */
  rotate?: number;
  /** Bending the elbow. */
  elbow?: number;
  /**
   * Lifting the shoulder toward the ear, as an angle at the collarbone, which carries the whole arm
   * up with it; negative pulls it down. The shoulder rises a little as an arm goes overhead, and
   * drops as a hand reaches for the floor. It moves a pinned arm's shoulder too.
   */
  shrug?: number;
};

/** A leg standing straight with the foot pointing ahead is all zeros. */
export type LegPose = {
  /** Raising the thigh forward. Negative reaches back. */
  flex?: number;
  /** Raising the leg out to its own side. */
  abduct?: number;
  /** Turning the thigh outward around its own length, which turns the toes out. */
  rotate?: number;
  /** Bending the knee. */
  knee?: number;
  /** Pulling the toes up toward the shin. Negative points them. */
  ankle?: number;
};

/** Holds a wrist or ankle at a spot in the room, whatever the body does. Overrides the limb's angles. */
export type Pin = {
  at: Vec3;
  /** The direction the hand or foot points in. A hand carries on from its forearm by default; a foot points the way the pelvis faces. */
  toward?: Vec3;
  /** The direction the elbow or knee sticks out in. Elbows go back and knees forward by default. */
  pole?: Vec3;
};

export type Pose3 = {
  /** Where the middle of the pelvis is. */
  pelvis: Vec3;
  /** Tipping the whole body forward from the pelvis: 90 lays the spine level, facing the floor. */
  lean?: number;
  /** Turning the whole body to its left. */
  turn?: number;
  /** Tipping the whole body to its right. */
  tilt?: number;
  spine?: Bend;
  neck?: Bend;
  rightArm?: ArmPose;
  leftArm?: ArmPose;
  rightLeg?: LegPose;
  leftLeg?: LegPose;
  /** Pin a limb in every pose of a clip or in none: a pin can move between poses, but not come and go. */
  pins?: { rightHand?: Pin; leftHand?: Pin; rightFoot?: Pin; leftFoot?: Pin };
  /**
   * Like the clip's `behind`, for this pose and on the way from it to the next. For limbs that
   * really change sides partway through a clip, like arms that hang outside the thighs and end up
   * inside the knees: put the change on a pose where the two are clear of each other on screen.
   */
  behind?: Clip3D['behind'];
};

export type Keyframe3 = {
  /** Time taken to arrive at this pose from the one before it. */
  ms: number;
  pose: Pose3;
  /** Eases in and out by default, which stops at every keyframe. */
  ease?: 'in' | 'out' | 'none';
};

/** The parts of the body that are drawn, and sorted by depth, as one shape each. */
export type Part = 'torso' | 'head' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg';

export type Camera = {
  /** Where the camera stands around the figure: 0 looks at its right side, 90 at its front, 180 at its left. */
  yaw: number;
  /** How far the camera is raised: 0 is level with the floor, 90 looks straight down. */
  pitch: number;
  /**
   * Frame the whole body, or move in on everything from the pelvis up, on the pelvis and legs, or
   * on the head and shoulders (see `framedJoints`).
   */
  fit?: 'body' | 'upper' | 'lower' | 'head';
};

/**
 * The joints a camera's `fit` keeps in the frame. `'head'` takes the head, the top third of the
 * spine and whatever of the arms is up there with it: for a stretch of the neck, where the rest of
 * the body only stands still, and an arm reaching up to the head is all of it in view but one
 * hanging down the side is cut off.
 */
export function framedJoints(skeleton: Skeleton, fit: Camera['fit']): Vec3[] {
  const body = [...skeleton.spine, skeleton.head, ...skeleton.rightArm, ...skeleton.leftArm];
  const legs = [...skeleton.rightLeg, ...skeleton.leftLeg];
  if (fit === 'upper') return body;
  if (fit === 'lower') return [skeleton.spine[0], ...legs];
  if (fit === 'head') {
    const chest = skeleton.spine.slice((2 * SPINE_SEGMENTS) / 3);
    const cut = chest[0][1];
    return [...chest, skeleton.head, ...[...skeleton.rightArm, ...skeleton.leftArm].filter((joint) => joint[1] >= cut)];
  }
  return [...body, ...legs];
}

/**
 * Something in the room the figure uses, like a wall, a box or a table top: a block with its sides
 * square to the room, from one corner to the opposite one. Blocks are drawn behind the figure, so
 * pick a camera that looks past the figure at them rather than through them.
 */
export type Block = { from: Vec3; to: Vec3 };

export type Clip3D = {
  view: '3d';
  /** The first keyframe's `ms` is ignored; the clip starts on its pose. */
  keyframes: readonly Keyframe3[];
  /** Index of the keyframe to show, unmoving, when reduced motion is on. */
  stillFrame: number;
  camera: Camera;
  /** The parts the exercise is about, drawn in the accent color. */
  highlight?: readonly Part[];
  /** Draws the path this hand or foot takes through the clip, just under its own limb, so the movement shows even in a still. */
  trail?: 'rightHand' | 'leftHand' | 'rightFoot' | 'leftFoot';
  /**
   * Limbs drawn over the torso all the way through, whatever their depth says. For legs that come
   * off the front of the hips toward the camera, like a figure sitting back seen from the front:
   * a thigh lying out to the side there never comes clear of the hips, and would go under them.
   */
  over?: readonly Part[];
  /**
   * Pairs of limbs where the first is drawn behind the second all the way through, whenever both
   * are on the same side of the torso. For limbs that stay against each other, like an arm inside
   * its knee in a squat: which is nearer where they touch is too close to call from their depths,
   * and they'd swap places from one frame to the next. A pair can name the head and a limb too,
   * which holds whatever side of the body the limb is on: `['head', 'rightArm']` keeps a hand
   * resting on the head, its forearm over the crown, drawn over it (neck side stretch).
   */
  behind?: readonly (readonly [Part, Part])[];
  /**
   * Hands that hold on to a limb their own arm goes behind, like fingers hooked over the toes of a
   * foot whose knee is in front of the arm. Limbs are ordered whole, so the arm would take its hand
   * behind the foot with it; the hand is drawn again on its own, over the limb it holds.
   */
  holds?: readonly HeldLimb[];
  /**
   * Hands that rest on the body, reached round from an arm on the far side of it, like the hands on
   * the lower back in Blackburn. The arm goes behind the torso all the way through, as its shoulder
   * end is, and its forearm and hand are drawn again on their own over the torso. Limbs are ordered
   * whole, so otherwise the whole arm would come over the torso with the hand, its shoulder end
   * drawn over the shoulder blade it's behind, and jump back behind it when the hand lifts off.
   */
  handsOnBody?: readonly ('rightHand' | 'leftHand')[];
  scenery?: readonly Block[];
  /**
   * A strap looped around the ball of this foot, with an end held in each hand. With a `hand`, that
   * one hand holds both ends, which is how a foot is pulled out to the side.
   */
  strap?: 'rightFoot' | 'leftFoot' | { foot: 'rightFoot' | 'leftFoot'; hand: 'rightHand' | 'leftHand' };
  /** The phone a test is measured with, held in a hand or strapped to a limb. */
  phone?: PhoneMount;
  /** A tape measure lying flat from one point to another, on the floor or the top of a block. */
  tape?: { from: Vec3; to: Vec3 };
  /** The test needs a second person, who isn't drawn: a badge says so instead. */
  partner?: boolean;
};

export type HeldLimb = { hand: 'rightHand' | 'leftHand'; limb: Part };

/**
 * Where the phone goes. Strapped to a limb, it lies on the bone's surface with its long side along
 * the bone and a strap around both. Held, its back rests against the palm, in line with the forearm,
 * and the `face` it's on is the palm's: on the far side of the hand, the fingers wrap over it.
 */
export type PhoneMount = {
  limb: 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg';
  /** 0 the upper arm or thigh, 1 the forearm or shin, 2 held in the hand. */
  bone: 0 | 1 | 2;
  /** How far along the bone its middle sits, from 0 at the hip or shoulder end. Ignored in the hand. */
  at?: number;
  /**
   * Which side of the limb its back rests on, and so which way the screen faces. The front of a
   * leg is the kneecap's side; of an arm, the side the elbow folds toward. A straight limb takes
   * its front from the body's.
   */
  face: 'front' | 'back' | 'outside' | 'inside';
  /**
   * What the screen reads in the clip's first pose, in degrees. It counts up from there by how far
   * the phone turns, as the test measures it: 90 for overhead reach, which starts with the arm
   * pointing at the ceiling. 0 when not set.
   */
  startReading?: number;
};

/** Where every joint is in the room. Limbs run from the body outward: root, middle joint, wrist or ankle, tip. */
export type Skeleton = {
  /** From the pelvis to the base of the neck. */
  spine: Vec3[];
  /** The body's right and its front at each point of the spine. */
  spineRight: Vec3[];
  spineFront: Vec3[];
  head: Vec3;
  /** The way the face points, and the head's own up and right, which shape the nose. */
  facing: Vec3;
  headUp: Vec3;
  headRight: Vec3;
  rightArm: Vec3[];
  leftArm: Vec3[];
  rightLeg: Vec3[];
  leftLeg: Vec3[];
};

export type FigureSlot = {
  part: Part;
  d: string;
  /** The shape the background is drawn around, to keep the part apart from what's under it. The part's own shape, except for a hand drawn on its own. */
  outline: string;
  /**
   * A hand drawn on its own over a limb it holds (see `Clip3D.holds`), after its arm's own slot, or
   * a forearm and hand over the torso (see `Clip3D.handsOnBody`).
   */
  hand: boolean;
  /** From 0, furthest from the camera, to 1, nearest. */
  shade: number;
  accent: boolean;
};

export type FigureFrame = {
  /** The body's parts, furthest from the camera first, which is the order to draw them in. */
  slots: FigureSlot[];
  shadow: string;
  /** The clip's strap as a line to stroke, drawn over the figure. Empty without one. */
  strap: string;
  /** The clip's phone, drawn with the limb it's on. Empty paths without one. */
  phone: PhoneFrame;
};

export type PhoneFrame = {
  part: Part | '';
  /** The phone's outline, and its screen when the screen faces the camera. */
  body: string;
  screen: string;
  /** The strap around the limb that holds it on, over the limb and behind the phone. Empty for a phone held in the hand. */
  band: string;
  /** The reading on the screen, as lines to stroke. Empty when the screen faces away. */
  reading: string;
  /** Whether the phone is on the near side of its limb, drawn over it, or the far side, under it. */
  over: boolean;
};

/** The spine bends at this many places between the pelvis and the neck. */
const SPINE_SEGMENTS = 6;

// Worklets capture what they call when they're defined, so unlike ordinary functions these aren't
// hoisted: everything here has to be defined above whatever uses it.

function rotX(degrees: number): Mat3 {
  'worklet';
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function rotY(degrees: number): Mat3 {
  'worklet';
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function rotZ(degrees: number): Mat3 {
  'worklet';
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

function mul(a: Mat3, b: Mat3): Mat3 {
  'worklet';
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      out[row * 3 + column] = a[row * 3] * b[column] + a[row * 3 + 1] * b[3 + column] + a[row * 3 + 2] * b[6 + column];
    }
  }
  return out;
}

function turned(m: Mat3, v: Vec3): Vec3 {
  'worklet';
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  'worklet';
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  'worklet';
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaled(v: Vec3, by: number): Vec3 {
  'worklet';
  return [v[0] * by, v[1] * by, v[2] * by];
}

function dot(a: Vec3, b: Vec3): number {
  'worklet';
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  'worklet';
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function distance(a: Vec3, b: Vec3): number {
  'worklet';
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** The same direction at length 1, or `fallback` for a vector too short to have one. */
function unit(v: Vec3, fallback: Vec3): Vec3 {
  'worklet';
  const length = Math.hypot(v[0], v[1], v[2]);
  return length < 1e-6 ? fallback : [v[0] / length, v[1] / length, v[2] / length];
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  'worklet';
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function eased(linear: number, ease: Keyframe3['ease']): number {
  'worklet';
  if (ease === 'none') return linear;
  if (ease === 'in') return linear * linear;
  if (ease === 'out') return 1 - (1 - linear) * (1 - linear);
  return linear * linear * (3 - 2 * linear);
}

function lerpBend(a: Bend | undefined, b: Bend | undefined, t: number): Bend {
  'worklet';
  return {
    flex: lerp(a?.flex ?? 0, b?.flex ?? 0, t),
    twist: lerp(a?.twist ?? 0, b?.twist ?? 0, t),
    side: lerp(a?.side ?? 0, b?.side ?? 0, t),
  };
}

function lerpArm(a: ArmPose | undefined, b: ArmPose | undefined, t: number): ArmPose {
  'worklet';
  return {
    flex: lerp(a?.flex ?? 0, b?.flex ?? 0, t),
    abduct: lerp(a?.abduct ?? 0, b?.abduct ?? 0, t),
    rotate: lerp(a?.rotate ?? 0, b?.rotate ?? 0, t),
    elbow: lerp(a?.elbow ?? 0, b?.elbow ?? 0, t),
    shrug: lerp(a?.shrug ?? 0, b?.shrug ?? 0, t),
  };
}

function lerpLeg(a: LegPose | undefined, b: LegPose | undefined, t: number): LegPose {
  'worklet';
  return {
    flex: lerp(a?.flex ?? 0, b?.flex ?? 0, t),
    abduct: lerp(a?.abduct ?? 0, b?.abduct ?? 0, t),
    rotate: lerp(a?.rotate ?? 0, b?.rotate ?? 0, t),
    knee: lerp(a?.knee ?? 0, b?.knee ?? 0, t),
    ankle: lerp(a?.ankle ?? 0, b?.ankle ?? 0, t),
  };
}

function lerpPin(a: Pin | undefined, b: Pin | undefined, t: number): Pin | undefined {
  'worklet';
  if (!a || !b) return b ?? a;
  return {
    at: lerpVec(a.at, b.at, t),
    toward: a.toward && b.toward ? lerpVec(a.toward, b.toward, t) : b.toward,
    pole: a.pole && b.pole ? lerpVec(a.pole, b.pole, t) : b.pole,
  };
}

/** The clip's pose at a time in `[0, clipDuration]`. */
export function poseAt3(clip: Clip3D, timeMs: number): Pose3 {
  'worklet';
  const frames = clip.keyframes;
  let elapsed = 0;
  for (let i = 1; i < frames.length; i++) {
    const { ms, ease } = frames[i];
    if (timeMs <= elapsed + ms) {
      const t = eased(ms === 0 ? 1 : (timeMs - elapsed) / ms, ease);
      const a = frames[i - 1].pose;
      const b = frames[i].pose;
      return {
        pelvis: lerpVec(a.pelvis, b.pelvis, t),
        lean: lerp(a.lean ?? 0, b.lean ?? 0, t),
        turn: lerp(a.turn ?? 0, b.turn ?? 0, t),
        tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t),
        spine: lerpBend(a.spine, b.spine, t),
        neck: lerpBend(a.neck, b.neck, t),
        rightArm: lerpArm(a.rightArm, b.rightArm, t),
        leftArm: lerpArm(a.leftArm, b.leftArm, t),
        rightLeg: lerpLeg(a.rightLeg, b.rightLeg, t),
        leftLeg: lerpLeg(a.leftLeg, b.leftLeg, t),
        pins: {
          rightHand: lerpPin(a.pins?.rightHand, b.pins?.rightHand, t),
          leftHand: lerpPin(a.pins?.leftHand, b.pins?.leftHand, t),
          rightFoot: lerpPin(a.pins?.rightFoot, b.pins?.rightFoot, t),
          leftFoot: lerpPin(a.pins?.leftFoot, b.pins?.leftFoot, t),
        },
        behind: t >= 1 ? b.behind : a.behind,
      };
    }
    elapsed += ms;
  }
  return frames[frames.length - 1].pose;
}

/**
 * Where the middle joint goes in a two-bone limb reaching from `root` to `tip`, sticking out toward
 * `pole`. A tip out of reach just straightens the limb toward it.
 */
export function solveJoint3(root: Vec3, tip: Vec3, first: number, second: number, pole: Vec3): Vec3 {
  'worklet';
  const along = unit(sub(tip, root), [0, -1, 0]);
  const reach = Math.min(first + second, Math.max(0.001, distance(root, tip)));
  const a = (first * first - second * second + reach * reach) / (2 * reach);
  const h = Math.sqrt(Math.max(0, first * first - a * a));
  // The part of the pole that's square to the limb. A pole along the limb has none, so any side will do.
  const out = unit(sub(pole, scaled(along, dot(pole, along))), Math.abs(along[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  return add(root, add(scaled(along, a), scaled(out, h)));
}

/** A pinned limb: its end goes to the pin, or as far toward it as the bones reach. */
function pinnedLimb(root: Vec3, pin: Pin, first: number, second: number, endLength: number, pole: Vec3, toward: Vec3 | undefined): Vec3[] {
  'worklet';
  const reach = first + second;
  const gap = distance(root, pin.at);
  const end = gap <= reach ? pin.at : add(root, scaled(sub(pin.at, root), reach / gap));
  const joint = solveJoint3(root, end, first, second, pin.pole ?? pole);
  const direction = unit(pin.toward ?? toward ?? sub(end, joint), [1, 0, 0]);
  return [root, joint, end, add(end, scaled(direction, endLength))];
}

/** `side` is 1 for the right limb and -1 for the left, which mirrors what "outward" means. */
function armJoints(root: Vec3, chest: Mat3, arm: ArmPose | undefined, side: number): Vec3[] {
  'worklet';
  const upper = mul(mul(mul(chest, rotZ(arm?.flex ?? 0)), rotX(-side * (arm?.abduct ?? 0))), rotY(-side * (arm?.rotate ?? 0)));
  const elbow = add(root, turned(upper, [0, -SKELETON.upperArm, 0]));
  const lower = mul(upper, rotZ(arm?.elbow ?? 0));
  const wrist = add(elbow, turned(lower, [0, -SKELETON.forearm, 0]));
  return [root, elbow, wrist, add(wrist, turned(lower, [0, -SKELETON.hand, 0]))];
}

function legJoints(root: Vec3, pelvis: Mat3, leg: LegPose | undefined, side: number): Vec3[] {
  'worklet';
  const upper = mul(mul(mul(pelvis, rotZ(leg?.flex ?? 0)), rotX(-side * (leg?.abduct ?? 0))), rotY(-side * (leg?.rotate ?? 0)));
  const knee = add(root, turned(upper, [0, -SKELETON.thigh, 0]));
  const lower = mul(upper, rotZ(-(leg?.knee ?? 0)));
  const ankle = add(knee, turned(lower, [0, -SKELETON.shin, 0]));
  return [root, knee, ankle, add(ankle, turned(mul(lower, rotZ(leg?.ankle ?? 0)), [SKELETON.foot, 0, 0]))];
}

/** Places every joint of the figure in the room. */
export function solvePose(pose: Pose3): Skeleton {
  'worklet';
  const pelvis = mul(mul(rotY(pose.turn ?? 0), rotZ(-(pose.lean ?? 0))), rotX(pose.tilt ?? 0));

  // Each segment turns half its share of the curve before it and half after, so the spine leaves
  // the pelvis the way the pelvis points and bends evenly from there.
  const share = 1 / (2 * SPINE_SEGMENTS);
  const half = mul(
    mul(rotY((pose.spine?.twist ?? 0) * share), rotZ(-(pose.spine?.flex ?? 0) * share)),
    rotX((pose.spine?.side ?? 0) * share)
  );
  const spine: Vec3[] = [pose.pelvis];
  const spineRight: Vec3[] = [turned(pelvis, [0, 0, 1])];
  const spineFront: Vec3[] = [turned(pelvis, [1, 0, 0])];
  let chest = pelvis;
  for (let i = 0; i < SPINE_SEGMENTS; i++) {
    chest = mul(chest, half);
    spine.push(add(spine[i], turned(chest, [0, SKELETON.torso / SPINE_SEGMENTS, 0])));
    chest = mul(chest, half);
    spineRight.push(turned(chest, [0, 0, 1]));
    spineFront.push(turned(chest, [1, 0, 0]));
  }
  const neckBase = spine[SPINE_SEGMENTS];

  const skull = mul(mul(mul(chest, rotY(pose.neck?.twist ?? 0)), rotZ(-(pose.neck?.flex ?? 0))), rotX(pose.neck?.side ?? 0));
  const head = add(neckBase, turned(skull, [0, SKELETON.neck, 0]));

  // The collarbone swings up from the top of the spine as the shoulder shrugs, and down as it drops.
  const collarbone = (arm: ArmPose | undefined, side: number) => turned(mul(chest, rotX(-side * (arm?.shrug ?? 0))), [0, 0, side * SKELETON.shoulder]);
  const rightShoulder = add(neckBase, collarbone(pose.rightArm, 1));
  const leftShoulder = add(neckBase, collarbone(pose.leftArm, -1));
  const rightHip = add(pose.pelvis, turned(pelvis, [0, 0, SKELETON.hip]));
  const leftHip = add(pose.pelvis, turned(pelvis, [0, 0, -SKELETON.hip]));

  // Elbows bend back and toward the hips, which is behind an arm that hangs and toward the feet
  // under one that props the body up. Knees bend forward, and toward the head when the hips fold.
  const elbowPole = turned(chest, [-1, -1, 0]);
  const kneePole = turned(pelvis, [1, 1, 0]);
  const ahead = unit([spineFront[0][0], 0, spineFront[0][2]], [1, 0, 0]);
  const arm = (root: Vec3, angles: ArmPose | undefined, pin: Pin | undefined, side: number) =>
    pin ? pinnedLimb(root, pin, SKELETON.upperArm, SKELETON.forearm, SKELETON.hand, elbowPole, undefined) : armJoints(root, chest, angles, side);
  const leg = (root: Vec3, angles: LegPose | undefined, pin: Pin | undefined, side: number) =>
    pin ? pinnedLimb(root, pin, SKELETON.thigh, SKELETON.shin, SKELETON.foot, kneePole, ahead) : legJoints(root, pelvis, angles, side);

  return {
    spine,
    spineRight,
    spineFront,
    head,
    facing: turned(skull, [1, 0, 0]),
    headUp: turned(skull, [0, 1, 0]),
    headRight: turned(skull, [0, 0, 1]),
    rightArm: arm(rightShoulder, pose.rightArm, pose.pins?.rightHand, 1),
    leftArm: arm(leftShoulder, pose.leftArm, pose.pins?.leftHand, -1),
    rightLeg: leg(rightHip, pose.rightLeg, pose.pins?.rightFoot, 1),
    leftLeg: leg(leftHip, pose.leftLeg, pose.pins?.leftFoot, -1),
  };
}

/** Turns the room so the camera looks down -z: x is then across the screen, y up it, and z toward the viewer. */
export function viewOf(camera: Camera): Mat3 {
  'worklet';
  return mul(rotX(camera.pitch), rotY(-camera.yaw));
}

/** A point in the room as the camera sees it: across the screen, down it, and how near it is. */
export function project(view: Mat3, point: Vec3): Vec3 {
  'worklet';
  const seen = turned(view, point);
  return [seen[0], -seen[1], seen[2]];
}

/** To a tenth of a unit, which is finer than a pixel and keeps the paths sent to the screen every frame short. */
function fixed(value: number): number {
  'worklet';
  return Math.round(value * 10) / 10;
}

function disc(center: Vec2 | Vec3, rx: number, ry: number): string {
  'worklet';
  return `M${fixed(center[0] - rx)} ${fixed(center[1])}a${fixed(rx)} ${fixed(ry)} 0 1 0 ${fixed(2 * rx)} 0a${fixed(rx)} ${fixed(ry)} 0 1 0 ${fixed(-2 * rx)} 0Z`;
}

/** The outline of a bone with a round end of its own radius at each joint. */
function capsule(a: Vec2 | Vec3, ra: number, b: Vec2 | Vec3, rb: number): string {
  'worklet';
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  // A bone pointing straight at the camera is just its thicker end.
  if (length < 0.5) return disc(a, Math.max(ra, rb), Math.max(ra, rb));
  const nx = -dy / length;
  const ny = dx / length;
  return (
    `M${fixed(a[0] + nx * ra)} ${fixed(a[1] + ny * ra)}L${fixed(b[0] + nx * rb)} ${fixed(b[1] + ny * rb)}` +
    `A${rb} ${rb} 0 0 0 ${fixed(b[0] - nx * rb)} ${fixed(b[1] - ny * rb)}L${fixed(a[0] - nx * ra)} ${fixed(a[1] - ny * ra)}` +
    `A${ra} ${ra} 0 0 0 ${fixed(a[0] + nx * ra)} ${fixed(a[1] + ny * ra)}Z`
  );
}

/**
 * Half the thickness of each limb at the [start, end] of its bones, from the body outward. The foot
 * and hand start wider than the shin and forearm end, which leaves a heel and the ball of the hand.
 */
const LEG_RADII = [
  [15, 12.5],
  [12.5, 9.5],
  [12.5, 10.5],
] as const;
const ARM_RADII = [
  [12.5, 10.5],
  [10.5, 8.5],
  [10.5, 8.5],
] as const;

/** The outline of a whole limb, one capsule a bone, all wound the same way so they fill as one shape. */
function limbShape(points: readonly Vec3[], radii: readonly (readonly [number, number])[]): string {
  'worklet';
  let path = '';
  for (let i = 1; i < points.length; i++) path += capsule(points[i - 1], radii[i - 1][0], points[i], radii[i - 1][1]);
  return path;
}

/** The torso's cross-section along the spine from the hips: how far along, then half its width and half its depth there. */
const TORSO_SECTIONS = [
  [0, 27, 20],
  [0.2, 25, 19],
  [0.4, 24, 18],
  [0.6, 27, 20],
  [0.8, 31, 22],
  [1, 30, 17],
] as const;
/** The rounded ends of the torso: a bar through the hip joints and one through the shoulders. */
const HIP_RADIUS = 19;
const SHOULDER_RADIUS = 15;
const NECK_RADIUS = 11;

function sectionAt(t: number, column: 1 | 2): number {
  'worklet';
  for (let i = 1; i < TORSO_SECTIONS.length; i++) {
    const from = TORSO_SECTIONS[i - 1];
    const to = TORSO_SECTIONS[i];
    if (t <= to[0]) return lerp(from[column], to[column], (t - from[0]) / (to[0] - from[0]));
  }
  return TORSO_SECTIONS[TORSO_SECTIONS.length - 1][column];
}

/**
 * The torso's silhouette. Its cross-section is an oval, wider than it is deep, so how far the
 * outline sits from the spine depends on which way the body is turned to the camera.
 */
function torsoShape(view: Mat3, skeleton: Skeleton, spine: readonly Vec3[]): string {
  'worklet';
  const last = spine.length - 1;
  let front = '';
  let back = '';
  for (let i = 0; i <= last; i++) {
    const before = spine[Math.max(0, i - 1)];
    const after = spine[Math.min(last, i + 1)];
    const dx = after[0] - before[0];
    const dy = after[1] - before[1];
    const length = Math.hypot(dx, dy);
    // A spine pointing straight at the camera has no sides to trace; its rounded ends stand in.
    if (length < 0.5) continue;
    const nx = -dy / length;
    const ny = dx / length;
    const right = turned(view, skeleton.spineRight[i]);
    const ahead = turned(view, skeleton.spineFront[i]);
    const t = i / last;
    // On screen y runs down, so the y of a direction in the room flips.
    const across = sectionAt(t, 1) * (right[0] * nx - right[1] * ny);
    const deep = sectionAt(t, 2) * (ahead[0] * nx - ahead[1] * ny);
    const reach = Math.hypot(across, deep);
    front += `${front === '' ? 'M' : 'L'}${fixed(spine[i][0] + nx * reach)} ${fixed(spine[i][1] + ny * reach)}`;
    back = `L${fixed(spine[i][0] - nx * reach)} ${fixed(spine[i][1] - ny * reach)}` + back;
  }
  return front === '' ? '' : `${front}${back}Z`;
}

function meanDepth(points: readonly Vec3[]): number {
  'worklet';
  let total = 0;
  for (let i = 0; i < points.length; i++) total += points[i][2];
  return total / points.length;
}

/** The size of the shadow under each part of the body. */
const SHADOW = { trunk: 36, head: 28, knee: 22, foot: 24 };
/** A shadow seen from floor level is still this thick, so the figure never floats. */
const SHADOW_MIN_DEPTH = 5;

/** How much nearer than the torso a part has to be to get the darkest shade. */
const SHADE_RANGE = 2 * SKELETON.shoulder;
/** The head goes over the torso unless it's clearly behind it. */
const HEAD_BIAS = 8;

/**
 * How directly the neck has to point away from the camera, from the shoulders to the head, for the
 * head to go under the torso: -1 is straight away, 0 square to the camera.
 */
const HEAD_TIPPED_AWAY = -0.5;

/** How far from the head on screen a limb can be and still overlap it, nose included. */
const HEAD_REACH = SKELETON.head + 24;

/**
 * The nose, in the plane through the middle of the face: each point is how far it is along the way
 * the face points from the middle of the head, then how far up. It runs from between the brows,
 * down the bridge, around the tip, and back under it to the face above the lip.
 */
const NOSE_ROOT: Vec2 = [26.9, 10.9];
const NOSE_TIP = { center: [36, -2] as Vec2, radius: 3.5, from: 70, to: -110 };
const NOSE_BASE: Vec2 = [27.8, -9];
/** How many points trace the round of the tip. */
const NOSE_TIP_STEPS = 8;
/** How wide the line drawing the nose on a face turned toward the camera is, and how far it keeps inside the head's outline. */
const NOSE_LINE = 2.4;
const NOSE_LINE_INSET = 1.5;
/** How far past the head's outline the nose can reach and still be drawn. Any further, and the head is near enough to profile to leave plain. */
const NOSE_STICKS_OUT = 2;
/** The wings of the nostrils, either side of the base of the nose: how far along, up, and to the side. */
const NOSE_WING = { f: 30, u: -6.5, side: 6.5 };
/** How far along the bridge, and along the way to the nostril, the line starts and ends its turn around the tip. */
const NOSE_TURN = { bridge: 0.78, nostril: 0.5 };
/** How many points trace the turn. */
const NOSE_TURN_STEPS = 8;
/** How much nearer the middle of the face one nostril has to be to count, about a face turned 2° from head on. */
const NOSE_HEAD_ON = 0.5;

/** A point on the face, as the camera sees it: along the way the face points, up the head, and to its right. */
function onFace(view: Mat3, skeleton: Skeleton, f: number, u: number, side = 0): Vec2 {
  'worklet';
  const point = project(
    view,
    add(add(add(skeleton.head, scaled(skeleton.facing, f)), scaled(skeleton.headUp, u)), scaled(skeleton.headRight, side))
  );
  return [point[0], point[1]];
}

/** Drops points that sit on top of the one before, which would leave a line no way to run. */
function spacedOut(points: readonly Vec2[]): Vec2[] {
  'worklet';
  const spaced: Vec2[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = spaced[spaced.length - 1];
    if (Math.hypot(points[i][0] - last[0], points[i][1] - last[1]) > 0.3) spaced.push(points[i]);
  }
  return spaced;
}

/**
 * The nose drawn on a face turned toward the camera, the way a drawing of a nose from three
 * quarters goes: down the bridge from between the brows, around the tip, and into the wing of
 * the nostril on the side away from the way the nose points, back toward the middle of the face.
 */
function noseLine(view: Mat3, skeleton: Skeleton, head: Vec3): Vec2[] {
  'worklet';
  const root = onFace(view, skeleton, NOSE_ROOT[0], NOSE_ROOT[1]);
  const tip = onFace(view, skeleton, NOSE_TIP.center[0] + NOSE_TIP.radius, NOSE_TIP.center[1]);
  const right = onFace(view, skeleton, NOSE_WING.f, NOSE_WING.u, NOSE_WING.side);
  const left = onFace(view, skeleton, NOSE_WING.f, NOSE_WING.u, -NOSE_WING.side);
  // The nose points out from the middle of the face; the nostril the line ends in is the one
  // nearer the middle of the face.
  const toRight = Math.hypot(right[0] - head[0], right[1] - head[1]);
  const toLeft = Math.hypot(left[0] - head[0], left[1] - head[1]);
  // Head on, the two are as near as each other, and rounding would pick one or the other from
  // frame to frame, so the nose jumps from side to side. Unless the right one is clearly nearer,
  // it's the left.
  const wing = toRight < toLeft - NOSE_HEAD_ON ? right : left;
  const from: Vec2 = [root[0] + (tip[0] - root[0]) * NOSE_TURN.bridge, root[1] + (tip[1] - root[1]) * NOSE_TURN.bridge];
  const to: Vec2 = [tip[0] + (wing[0] - tip[0]) * NOSE_TURN.nostril, tip[1] + (wing[1] - tip[1]) * NOSE_TURN.nostril];
  const points: Vec2[] = [root];
  for (let i = 0; i <= NOSE_TURN_STEPS; i++) {
    const t = i / NOSE_TURN_STEPS;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    points.push([a * from[0] + b * tip[0] + c * to[0], a * from[1] + b * tip[1] + c * to[1]]);
  }
  points.push(wing);
  return spacedOut(points);
}

/** The nose's outline on screen, from between the brows to above the lip, which shows how far it would stick out past the head. */
function noseOutline(view: Mat3, skeleton: Skeleton): Vec2[] {
  'worklet';
  const at = (f: number, u: number): Vec2 => onFace(view, skeleton, f, u);
  const points: Vec2[] = [at(NOSE_ROOT[0], NOSE_ROOT[1])];
  for (let i = 0; i <= NOSE_TIP_STEPS; i++) {
    const angle = ((NOSE_TIP.from + ((NOSE_TIP.to - NOSE_TIP.from) * i) / NOSE_TIP_STEPS) * Math.PI) / 180;
    points.push(at(NOSE_TIP.center[0] + NOSE_TIP.radius * Math.cos(angle), NOSE_TIP.center[1] + NOSE_TIP.radius * Math.sin(angle)));
  }
  points.push(at(NOSE_BASE[0], NOSE_BASE[1]));
  return spacedOut(points);
}

/** Twice the area inside a closed run of points: negative when it runs counterclockwise on screen, as `disc` does. */
function signedArea(points: readonly Vec2[]): number {
  'worklet';
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    area += x0 * y1 - x1 * y0;
  }
  return area;
}

function polygon(points: readonly Vec2[]): string {
  'worklet';
  let path = '';
  for (let i = 0; i < points.length; i++) path += `${i === 0 ? 'M' : 'L'}${fixed(points[i][0])} ${fixed(points[i][1])}`;
  return `${path}Z`;
}

/**
 * A line `halfWidth` either side of a run of points, as a shape of its own, wound clockwise so it
 * cuts through any shape it's drawn inside. Each corner is mitred, so the line keeps its width.
 */
function lineHole(points: readonly Vec2[], halfWidth: number): string {
  'worklet';
  const normal = (a: Vec2, b: Vec2): Vec2 => {
    const length = Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]));
    return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
  };
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i < points.length; i++) {
    const before = normal(points[Math.max(0, i - 1)], points[Math.max(1, i)]);
    const after = normal(points[Math.min(points.length - 2, i)], points[Math.min(points.length - 1, i + 1)]);
    const mx = before[0] + after[0];
    const my = before[1] + after[1];
    const length = Math.max(1e-6, Math.hypot(mx, my));
    // A sharp corner needs a longer mitre to keep the line as wide, but not without limit.
    const reach = halfWidth / Math.max(0.4, (mx * before[0] + my * before[1]) / length);
    left.push([points[i][0] + (mx / length) * reach, points[i][1] + (my / length) * reach]);
    right.push([points[i][0] - (mx / length) * reach, points[i][1] - (my / length) * reach]);
  }
  const outline = [...left, ...right.reverse()];
  if (signedArea(outline) < 0) outline.reverse();
  return polygon(outline);
}

/**
 * The head, and on a face turned toward the camera, the nose. That's where a plain head leaves it
 * hard to tell which way the figure is facing, so the nose is drawn there as a line cut into the
 * face (see `noseLine`), kept inside the head. Toward the profile, where the nose would stick out
 * past the head's outline, the rest of the body already shows which way the figure faces, so the
 * head is left plain. So is the back of the head.
 */
function headShape(view: Mat3, skeleton: Skeleton, head: Vec3): string {
  'worklet';
  const outline = disc(head, SKELETON.head, SKELETON.head);
  if (turned(view, skeleton.facing)[2] <= 0) return outline;
  const nose = noseOutline(view, skeleton);
  let sticksOut = -Infinity;
  for (let i = 0; i < nose.length; i++) sticksOut = Math.max(sticksOut, Math.hypot(nose[i][0] - head[0], nose[i][1] - head[1]) - SKELETON.head);
  if (sticksOut > NOSE_STICKS_OUT) return outline;

  const line = noseLine(view, skeleton, head);
  if (line.length < 2) return outline;
  let reach = 0;
  for (let i = 0; i < line.length; i++) reach = Math.max(reach, Math.hypot(line[i][0] - head[0], line[i][1] - head[1]));
  // Near the profile the line can reach a little past the edge of the head, so it's drawn
  // smaller, toward the middle of the face, to fit.
  const room = SKELETON.head - NOSE_LINE_INSET - NOSE_LINE / 2;
  const scale = Math.min(1, room / Math.max(reach, 1e-6));
  const fitted: Vec2[] = [];
  for (let i = 0; i < line.length; i++) fitted.push([head[0] + (line[i][0] - head[0]) * scale, head[1] + (line[i][1] - head[1]) * scale]);
  return outline + lineHole(fitted, NOSE_LINE / 2);
}

/**
 * How close a limb comes to a point on screen, and how near the camera the limb is right there.
 * The head is ordered against what's actually beside it, not a whole limb's average: a head
 * dropping between the arms is behind the near arm, even when it's further forward than the hand.
 */
function nearestOnScreen(points: readonly Vec3[], to: Vec3): { gap: number; depth: number } {
  'worklet';
  let gap = Infinity;
  let depth = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared < 1e-6 ? 0 : Math.max(0, Math.min(1, ((to[0] - a[0]) * dx + (to[1] - a[1]) * dy) / lengthSquared));
    const distance = Math.hypot(a[0] + dx * t - to[0], a[1] + dy * t - to[1]);
    if (distance < gap) {
      gap = distance;
      depth = lerp(a[2], b[2], t);
    }
  }
  return { gap, depth };
}

/** How close on screen to the line of the spine a limb has to come to be crossing the torso. */
const TORSO_REACH = 30;
/** How many points along each bone are checked against the torso. */
const BONE_STEPS = 4;
/** About how thick a limb is either side of its bones, which lets it clear the torso a little sooner. */
const LIMB_RADIUS = 12;

/**
 * Whether a limb is drawn over the torso. It goes by where the two actually overlap, not by the
 * average depth of each: a leg swinging back is still beside the hips where it meets them, and the
 * torso's high chest seen from above would otherwise count as nearer than a whole leg below it.
 * A limb starts on the side of the body its shoulder or hip is on, compared with the spine at the
 * same height (`anchor`), and a part of it further out that crosses the torso decides instead,
 * like a forearm across the chest.
 *
 * Crossing means coming out clear of the torso's surface, in front or behind, not just passing its
 * middle: `thickness` is how far the torso's surface comes toward the camera from each point of
 * the spine. A far thigh lifting forward stays under the hips until it's out in front of them.
 */
function overTorso(points: readonly Vec3[], spine: readonly Vec3[], thickness: readonly number[], anchor: Vec3, isLeg: boolean): boolean {
  'worklet';
  // Square to the camera, the shoulder or hip is as near as the spine. An arm then hangs beside the
  // chest and goes over it; a thigh starts inside the hips and goes under them, which keeps its
  // rounded top hidden. Averages would tip either one by the camera's tilt, and flip it partway
  // through a movement.
  const root = points[0][2] - anchor[2];
  let over = Math.abs(root) < 1 ? !isLeg : root > 0;
  const last = spine.length - 1;
  for (let i = 1; i < points.length; i++) {
    for (let step = 1; step <= BONE_STEPS; step++) {
      const point = lerpVec(points[i - 1], points[i], step / BONE_STEPS);
      let gap = Infinity;
      let spineDepth = 0;
      let surface = 0;
      for (let k = 1; k <= last; k++) {
        const a = spine[k - 1];
        const b = spine[k];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const lengthSquared = dx * dx + dy * dy;
        // The spine carries on a little past each end, through the rounded hips and shoulders. A
        // point beside the hips is then compared with the body at its own height, rather than with
        // the end of the spine, which seen from above is nearer just for being higher.
        const past = TORSO_REACH / Math.sqrt(Math.max(lengthSquared, 1e-6));
        const t =
          lengthSquared < 1e-6
            ? 0
            : Math.max(k === 1 ? -past : 0, Math.min(k === last ? 1 + past : 1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared));
        const distance = Math.hypot(a[0] + dx * t - point[0], a[1] + dy * t - point[1]);
        if (distance < gap) {
          gap = distance;
          spineDepth = lerp(a[2], b[2], t);
          surface = lerp(thickness[k - 1], thickness[k], Math.max(0, Math.min(1, t)));
        }
      }
      if (gap >= TORSO_REACH) continue;
      const clear = Math.max(0, surface - LIMB_RADIUS);
      if (point[2] - spineDepth > clear) over = true;
      else if (point[2] - spineDepth < -clear) over = false;
    }
  }
  return over;
}

/** How far along the foot from the ankle the ball is, where a strap loops around it. */
const STRAP_ALONG_FOOT = 0.72;
/** How far the strap sits from the middle of the foot: out to each side, and under the sole. */
const STRAP_HALF_WIDTH = 11;
const STRAP_UNDER_SOLE = 9;
/**
 * A strap looped around a foot in one hand keeps this far from the middle of the foot: past the
 * foot's edge by half the strap's own width, so it's drawn around the foot and not over it.
 */
const STRAP_LOOP_RADIUS = 17;
/** How many straight pieces the half circle around the foot is drawn in. */
const STRAP_LOOP_STEPS = 8;

/**
 * Where a strap around a foot runs in the room: from the middle of the right hand, down the right
 * side of the foot, under the ball of it, and back up the left side to the left hand. Held in one
 * hand, it's a loop: from the hand to one side of the foot, in a half circle around the side away
 * from the hand, whichever that is as the foot turns, and back from the other side to the same
 * hand. The half circle stands clear of the foot, so the strap goes around it rather than across
 * it. The points after the first and before the last are where it starts and ends, level with the
 * middle of the foot.
 */
export function strapPoints(skeleton: Skeleton, strap: NonNullable<Clip3D['strap']>): Vec3[] {
  'worklet';
  const foot = typeof strap === 'string' ? strap : strap.foot;
  const hand = typeof strap === 'string' ? undefined : strap.hand;
  const rightEnd = hand === 'leftHand' ? skeleton.leftArm : skeleton.rightArm;
  const leftEnd = hand === 'rightHand' ? skeleton.rightArm : skeleton.leftArm;
  const leg = foot === 'rightFoot' ? skeleton.rightLeg : skeleton.leftLeg;
  const along = unit(sub(leg[3], leg[2]), [1, 0, 0]);
  const shin = unit(sub(leg[2], leg[1]), [0, -1, 0]);
  // The sole faces the way the shin points, as near as a direction square to the foot can.
  const sole = unit(sub(shin, scaled(along, dot(shin, along))), [0, -1, 0]);
  let side = cross(along, sole);
  if (dot(side, skeleton.spineRight[0]) < 0) side = scaled(side, -1);
  if (hand) {
    const held = lerpVec(rightEnd[2], rightEnd[3], 0.5);
    const middle = add(leg[2], scaled(along, SKELETON.foot * STRAP_ALONG_FOOT));
    // The way to the hand, as near as a direction square to the foot can be, and across the foot from there.
    const toHand = sub(held, middle);
    const pull = unit(sub(toHand, scaled(along, dot(toHand, along))), sole);
    const across = cross(along, pull);
    const points: Vec3[] = [held];
    for (let step = 0; step <= STRAP_LOOP_STEPS; step++) {
      const angle = (step / STRAP_LOOP_STEPS - 0.5) * Math.PI;
      points.push(add(middle, add(scaled(across, -STRAP_LOOP_RADIUS * Math.sin(angle)), scaled(pull, -STRAP_LOOP_RADIUS * Math.cos(angle)))));
    }
    points.push(held);
    return points;
  }
  const ball = add(add(leg[2], scaled(along, SKELETON.foot * STRAP_ALONG_FOOT)), scaled(sole, STRAP_UNDER_SOLE));
  return [
    lerpVec(rightEnd[2], rightEnd[3], 0.5),
    add(ball, scaled(side, STRAP_HALF_WIDTH)),
    add(ball, scaled(side, -STRAP_HALF_WIDTH)),
    lerpVec(leftEnd[2], leftEnd[3], 0.5),
  ];
}

/** A phone's size: about 15 by 7 by 1 cm, with a shin of 100 at about 40 cm. */
export const PHONE = { length: 37, width: 18, depth: 3 };
/** How far in from the phone's edge its screen starts. */
const PHONE_BEZEL = 2;
/** How far the strap around a limb reaches past the limb's edge, to show it wraps around. */
const PHONE_BAND_OVERHANG = 2;
/** How far past the wrist the middle of a phone held in the hand sits, gripped across its middle. */
const PHONE_GRIP = SKELETON.hand * 0.6;

/** `v` with the part along unit vector `along` taken out, at length 1, or `undefined` if almost nothing is left. */
function squareTo(v: Vec3, along: Vec3): Vec3 | undefined {
  'worklet';
  const rest = sub(v, scaled(along, dot(v, along)));
  return Math.hypot(rest[0], rest[1], rest[2]) < 0.2 ? undefined : unit(rest, [1, 0, 0]);
}

/**
 * Where the phone is in the room: its middle, its long side, its short side, and the way its
 * screen faces. All three directions are square to each other and of length 1.
 */
export function phonePlacement(skeleton: Skeleton, mount: PhoneMount): { center: Vec3; along: Vec3; across: Vec3; facing: Vec3 } {
  'worklet';
  const points = skeleton[mount.limb];
  const isLeg = mount.limb === 'rightLeg' || mount.limb === 'leftLeg';
  const side = mount.limb === 'rightArm' || mount.limb === 'rightLeg' ? 1 : -1;
  // In the hand, the phone carries on from the forearm.
  const bone = mount.bone === 2 ? 1 : mount.bone;
  const along = unit(sub(points[bone + 1], points[bone]), [0, -1, 0]);
  const other = bone === 0 ? unit(sub(points[2], points[1]), along) : unit(sub(points[1], points[0]), along);
  // The front: away from the shin on a thigh, toward where the thigh points on a shin. An arm
  // folds the other way, so its front is the side the elbow closes toward.
  const bentToward = squareTo(other, along);
  const sign = (isLeg ? (bone === 0 ? -1 : 1) : bone === 0 ? 1 : -1);
  const last = skeleton.spine.length - 1;
  const bodyFront = isLeg ? skeleton.spineFront[0] : skeleton.spineFront[last];
  const bodyUp = unit(sub(skeleton.spine[last], skeleton.spine[0]), [0, 1, 0]);
  const front =
    (bentToward ? scaled(bentToward, sign) : undefined) ?? squareTo(bodyFront, along) ?? squareTo(bodyUp, along) ?? squareTo([1, 0, 0], along) ?? [0, 0, 1];
  let outside = cross(along, front);
  const bodyRight = isLeg ? skeleton.spineRight[0] : skeleton.spineRight[last];
  if (dot(outside, bodyRight) * side < 0) outside = scaled(outside, -1);
  const facing =
    mount.face === 'front' ? front : mount.face === 'back' ? scaled(front, -1) : mount.face === 'outside' ? outside : scaled(outside, -1);
  const across = cross(facing, along);

  if (mount.bone === 2) {
    // Its back rests against the palm, which faces the way the screen does, so it sits that far out
    // from the middle of the hand.
    const palm = (ARM_RADII[2][0] + ARM_RADII[2][1]) / 2;
    return { center: add(add(points[2], scaled(along, PHONE_GRIP)), scaled(facing, palm + PHONE.depth / 2)), along, across, facing };
  }
  const t = mount.at ?? 0.5;
  const radii = (isLeg ? LEG_RADII : ARM_RADII)[bone];
  const radius = lerp(radii[0], radii[1], t);
  const onBone = lerpVec(points[bone], points[bone + 1], t);
  return { center: add(onBone, scaled(facing, radius + PHONE.depth / 2)), along, across, facing };
}

/** The convex outline around points on screen, counterclockwise. */
function hull(points: readonly Vec2[]): Vec2[] {
  'worklet';
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (let i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) lower.pop();
    lower.push(sorted[i]);
  }
  const upper: Vec2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) upper.pop();
    upper.push(sorted[i]);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

const NO_PHONE: PhoneFrame = { part: '', body: '', screen: '', band: '', over: true, reading: '' };

/**
 * The lit segments of each digit on a seven-segment display: a top, b top right, c bottom right,
 * d bottom, e bottom left, f top left, g middle.
 */
const DIGIT_SEGMENTS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
/** Each segment's ends, across the digit and up it, both from 0 to 1. */
const SEGMENT_ENDS: Record<string, readonly [number, number, number, number]> = {
  a: [0, 1, 1, 1],
  b: [1, 1, 1, 0.5],
  c: [1, 0.5, 1, 0],
  d: [0, 0, 1, 0],
  e: [0, 0, 0, 0.5],
  f: [0, 0.5, 0, 1],
  g: [0, 0.5, 1, 0.5],
};
/**
 * A digit's width and the gap after it, and the degree sign's size, as parts of a digit's height.
 * Three digits and the sign then fill the screen's length.
 */
const READOUT = { digit: 0.55, gap: 0.2, degree: 0.28, margin: 1.2 };

/**
 * The reading as seven-segment digits and a degree sign, laid on the screen so they follow its
 * perspective, as large as the screen fits for three digits. They read along the phone's length:
 * left to right when it lies across the screen, and bottom to top when it stands up it.
 */
function readingShape(view: Mat3, center: Vec3, along: Vec3, across: Vec3, facing: Vec3, degrees: number): string {
  'worklet';
  const text = `${Math.round(Math.max(0, degrees))}`;
  const length = PHONE.length - 2 * PHONE_BEZEL - 2 * READOUT.margin;
  const width = PHONE.width - 2 * PHONE_BEZEL - 2 * READOUT.margin;
  const height = Math.min(width, length / (3 * (READOUT.digit + READOUT.gap) + READOUT.degree));
  // Which way along the phone the digits run. Turning them end for end keeps them unmirrored.
  const [ax, ay] = project(view, along);
  const flip = Math.abs(ax) > 0.4 * Math.hypot(ax, ay) ? Math.sign(ax) : ay < 0 ? 1 : -1;
  const right = scaled(along, flip);
  const up = scaled(across, flip);
  const surface = add(center, scaled(facing, PHONE.depth / 2 + 0.1));
  const total = text.length * (READOUT.digit + READOUT.gap) * height + READOUT.degree * height;
  const at = (x: number, y: number): string => {
    const point = project(view, add(add(surface, scaled(right, x - total / 2)), scaled(up, y - height / 2)));
    return `${fixed(point[0])} ${fixed(point[1])}`;
  };
  let path = '';
  for (let i = 0; i < text.length; i++) {
    const left = i * (READOUT.digit + READOUT.gap) * height;
    const lit = DIGIT_SEGMENTS[text.charCodeAt(i) - 48];
    for (let s = 0; s < lit.length; s++) {
      const [x0, y0, x1, y1] = SEGMENT_ENDS[lit[s]];
      const w = READOUT.digit * height;
      path += `M${at(left + x0 * w, y0 * height)}L${at(left + x1 * w, y1 * height)}`;
    }
  }
  // The degree sign: a small square at the top after the digits.
  const left = text.length * (READOUT.digit + READOUT.gap) * height;
  const size = READOUT.degree * height;
  path += `M${at(left, height)}L${at(left + size, height)}L${at(left + size, height - size)}L${at(left, height - size)}Z`;
  return path;
}

/**
 * What the phone reads at a moment in the clip: how far its long side has turned since the clip's
 * first pose, from its `startReading`. That's how the test measures, so a 90° elbow reads 90.
 */
export function phoneReading(clip: Clip3D, skeleton: Skeleton): number {
  'worklet';
  const mount = clip.phone;
  if (!mount) return 0;
  const now = phonePlacement(skeleton, mount).along;
  const start = phonePlacement(solvePose(clip.keyframes[0].pose), mount).along;
  const cos = Math.max(-1, Math.min(1, dot(now, start)));
  return (mount.startReading ?? 0) + (Math.acos(cos) * 180) / Math.PI;
}

/** The phone as the camera sees it: a thin slab, its screen, and the strap holding it to the limb. */
function phoneShape(skeleton: Skeleton, view: Mat3, mount: PhoneMount | undefined, degrees?: number): PhoneFrame {
  'worklet';
  if (!mount) return NO_PHONE;
  const { center, along, across, facing } = phonePlacement(skeleton, mount);
  const corner = (l: number, w: number, d: number): Vec3 =>
    add(add(add(center, scaled(along, l * PHONE.length / 2)), scaled(across, w * PHONE.width / 2)), scaled(facing, d * PHONE.depth / 2));
  const outline: Vec2[] = [];
  for (let i = 0; i < 8; i++) {
    const point = project(view, corner(i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1));
    outline.push([point[0], point[1]]);
  }
  const towardCamera = turned(view, facing)[2];
  let screen = '';
  let reading = '';
  if (towardCamera > 0.05) {
    const inset = (l: number, w: number): Vec2 => {
      const point = project(
        view,
        add(add(add(center, scaled(along, l * (PHONE.length / 2 - PHONE_BEZEL))), scaled(across, w * (PHONE.width / 2 - PHONE_BEZEL))), scaled(facing, PHONE.depth / 2))
      );
      return [point[0], point[1]];
    };
    screen = polygon([inset(-1, -1), inset(1, -1), inset(1, 1), inset(-1, 1)]);
    if (degrees !== undefined) reading = readingShape(view, center, along, across, facing, degrees);
  }

  // The strap runs around the limb across the phone's middle: on screen, a bar across the limb
  // through the bone, a little wider than the limb.
  let band = '';
  if (mount.bone !== 2) {
    const isLeg = mount.limb === 'rightLeg' || mount.limb === 'leftLeg';
    const t = mount.at ?? 0.5;
    const radii = (isLeg ? LEG_RADII : ARM_RADII)[mount.bone];
    const reach = lerp(radii[0], radii[1], t) + PHONE_BAND_OVERHANG;
    const points = skeleton[mount.limb];
    const a = project(view, points[mount.bone]);
    const b = project(view, points[mount.bone + 1]);
    const mid = lerpVec(a, b, t);
    const length = Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]));
    const nx = -(b[1] - a[1]) / length;
    const ny = (b[0] - a[0]) / length;
    band = `M${fixed(mid[0] + nx * reach)} ${fixed(mid[1] + ny * reach)}L${fixed(mid[0] - nx * reach)} ${fixed(mid[1] - ny * reach)}`;
  }
  return {
    part: mount.limb,
    body: polygon(hull(outline)),
    screen,
    band,
    // Held in the hand, the fingers wrap over it from the side away from the screen.
    // Exactly side-on, the phone sits beside the limb on screen, so changing sides there doesn't show.
    over: towardCamera > 0,
    reading,
  };
}

/** How far along a hand drawn on its own its outline starts, which keeps the outline off the wrist it joins. */
const HELD_HAND_OUTLINE_FROM = 0.6;
/** How far along the forearm from the elbow the outline of a forearm drawn on its own over the torso starts. */
const RESTING_FOREARM_OUTLINE_FROM = 0.4;

/** How close on screen two limbs' bones have to come for one to be drawn over the other: about a limb's thickness each. */
const LIMB_OVERLAP = 2 * LIMB_RADIUS;

/**
 * Whether limb `a` is in front of limb `b` where they overlap on screen, or `undefined` when they
 * don't overlap. Average depth is no guide here either: hands holding a raised shin are nearer
 * than the shin right there, though the whole leg, lifted toward a camera above it, is nearer on
 * average than the arm lying along the floor.
 */
function inFrontWhereCrossing(a: readonly Vec3[], b: readonly Vec3[]): boolean | undefined {
  'worklet';
  let gap = LIMB_OVERLAP;
  let front: boolean | undefined;
  for (let i = 1; i < a.length; i++) {
    for (let step = 0; step <= BONE_STEPS; step++) {
      const point = lerpVec(a[i - 1], a[i], step / BONE_STEPS);
      const near = nearestOnScreen(b, point);
      if (near.gap < gap) {
        gap = near.gap;
        front = point[2] > near.depth;
      }
    }
  }
  return front;
}

/** Draws the figure as the camera sees it. `view` comes from `viewOf`. */
export function traceFigure(
  skeleton: Skeleton,
  view: Mat3,
  highlight?: readonly Part[],
  strap?: Clip3D['strap'],
  phone?: PhoneMount,
  /** What the phone's screen reads, see `phoneReading`. Without it the screen is blank. */
  reading?: number,
  /** Limbs to draw over the torso regardless, see `Clip3D.over`. */
  forcedOver?: readonly Part[],
  /** Pairs of limbs to keep the first behind the second, see `Clip3D.behind`. */
  forcedBehind?: Clip3D['behind'],
  /** Hands to draw again over the limb they hold, see `Clip3D.holds`. */
  holds?: Clip3D['holds'],
  /** Arms to put behind the torso with their forearms and hands drawn again over it, see `Clip3D.handsOnBody`. */
  handsOnBody?: Clip3D['handsOnBody']
): FigureFrame {
  'worklet';
  const flat = (points: readonly Vec3[]): Vec3[] => {
    const out: Vec3[] = [];
    for (let i = 0; i < points.length; i++) out.push(project(view, points[i]));
    return out;
  };
  const spine = flat(skeleton.spine);
  const head = project(view, skeleton.head);
  const rightArm = flat(skeleton.rightArm);
  const leftArm = flat(skeleton.leftArm);
  const rightLeg = flat(skeleton.rightLeg);
  const leftLeg = flat(skeleton.leftLeg);
  const neckBase = spine[spine.length - 1];

  // The neck belongs to the torso's shape, so there's no seam where it meets the shoulders.
  const torso =
    torsoShape(view, skeleton, spine) +
    capsule(rightLeg[0], HIP_RADIUS, leftLeg[0], HIP_RADIUS) +
    capsule(rightArm[0], SHOULDER_RADIUS, leftArm[0], SHOULDER_RADIUS) +
    capsule(neckBase, NECK_RADIUS, head, NECK_RADIUS);


  const torsoDepth = meanDepth(spine);
  // How far the torso's surface comes toward the camera from each point of the spine. Its
  // cross-section is an oval, wider than it is deep, so that depends on which way it's turned.
  const thickness: number[] = [];
  for (let i = 0; i < spine.length; i++) {
    const t = i / (spine.length - 1);
    thickness.push(Math.hypot(sectionAt(t, 1) * turned(view, skeleton.spineRight[i])[2], sectionAt(t, 2) * turned(view, skeleton.spineFront[i])[2]));
  }
  const headDepth = head[2] + HEAD_BIAS;
  // Each limb is under the torso (0) or over it (2), by where the two overlap on screen.
  const limb = (part: Part, points: Vec3[], isLeg: boolean) => {
    const depth = meanDepth(points);
    const resting = handsOnBody ? (part === 'rightArm' && handsOnBody.includes('rightHand')) || (part === 'leftArm' && handsOnBody.includes('leftHand')) : false;
    const over = !resting && ((forcedOver ? forcedOver.includes(part) : false) || overTorso(points, spine, thickness, isLeg ? spine[0] : neckBase, isLeg));
    return { part, d: limbShape(points, isLeg ? LEG_RADII : ARM_RADII), depth, points, layer: over ? 2 : 0 };
  };
  const parts: { part: Part; d: string; depth: number; points: Vec3[]; layer: number }[] = [
    limb('leftLeg', leftLeg, true),
    limb('leftArm', leftArm, false),
    { part: 'torso', d: torso, depth: torsoDepth, points: spine, layer: 1 },
    limb('rightLeg', rightLeg, true),
    limb('rightArm', rightArm, false),
  ];
  // Under the torso, the torso, then over it, and furthest first within each. Parts at the same
  // depth keep the order above, so nothing flickers.
  for (let i = 1; i < parts.length; i++) {
    const moving = parts[i];
    let j = i - 1;
    while (j >= 0 && (parts[j].layer > moving.layer || (parts[j].layer === moving.layer && parts[j].depth > moving.depth))) {
      parts[j + 1] = parts[j];
      j--;
    }
    parts[j + 1] = moving;
  }
  // Two limbs on the same side of the torso that overlap go by which is in front where they do.
  for (let i = 1; i < parts.length; i++) {
    const moving = parts[i];
    if (moving.part === 'torso') continue;
    let j = i - 1;
    while (j >= 0 && parts[j].layer === moving.layer && parts[j].part !== 'torso' && inFrontWhereCrossing(parts[j].points, moving.points) === true) {
      parts[j + 1] = parts[j];
      j--;
    }
    parts[j + 1] = moving;
  }
  // A clip's own word on two limbs comes last, and only between limbs on the same side of the torso.
  if (forcedBehind) {
    for (let pair = 0; pair < forcedBehind.length; pair++) {
      let back = -1;
      let front = -1;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].part === forcedBehind[pair][0]) back = i;
        if (parts[i].part === forcedBehind[pair][1]) front = i;
      }
      if (back < 0 || front < 0 || back < front || parts[back].layer !== parts[front].layer) continue;
      const moving = parts[back];
      for (let i = back; i > front; i--) parts[i] = parts[i - 1];
      parts[front] = moving;
    }
  }

  // The head goes over everything it overlaps and is in front of right there, and under
  // everything it overlaps and is behind. Parts it doesn't touch can go either side. If no place
  // satisfies both, it falls back to its place by depth alone.
  let lastBehind = -1;
  let firstInFront = parts.length;
  let byDepth = parts.length;
  for (let i = 0; i < parts.length; i++) {
    const { part, depth, points } = parts[i];
    if (byDepth === parts.length && depth > headDepth) byDepth = i;
    // The torso is the head's own body: the neck joins them, so they always touch, and the head
    // goes over it, or the neck shows through the face. Only a head tipped well away behind the
    // body, like a forward fold seen from behind, goes under. The torso's average depth is no
    // guide: a body lying away from the camera puts it in front of the head. A limb is measured
    // against the head itself.
    if (part === 'torso') {
      if ((head[2] - neckBase[2]) / SKELETON.neck > HEAD_TIPPED_AWAY) lastBehind = i;
      else if (firstInFront === parts.length) firstInFront = i;
      continue;
    }
    // A clip's own word on the head and a limb settles which side it goes, touching or not: for a
    // hand resting on the head, whose forearm lies over the crown about as deep as its middle.
    const forced = forcedBehind?.find(([a, b]) => (a === 'head' && b === part) || (b === 'head' && a === part));
    if (forced) {
      if (forced[0] === 'head') {
        if (firstInFront === parts.length) firstInFront = i;
      } else lastBehind = i;
      continue;
    }
    const near = nearestOnScreen(points, head);
    if (near.gap > HEAD_REACH) continue;
    if (near.depth < head[2]) lastBehind = i;
    else if (firstInFront === parts.length) firstInFront = i;
  }
  const at = lastBehind < firstInFront ? lastBehind + 1 : byDepth;
  parts.splice(at, 0, { part: 'head', d: headShape(view, skeleton, head), depth: headDepth, points: [head], layer: 1 });

  const slots: FigureSlot[] = [];
  for (let i = 0; i < parts.length; i++) {
    const { part, d, depth } = parts[i];
    // The head takes the torso's shade, so the neck doesn't change color halfway up.
    const offset = part === 'head' || part === 'torso' ? 0 : depth - torsoDepth;
    slots.push({
      part,
      d,
      outline: d,
      hand: false,
      shade: Math.max(0, Math.min(1, 0.5 + offset / (2 * SHADE_RANGE))),
      accent: highlight ? highlight.includes(part) : false,
    });
  }

  // A hand resting on the body goes over the torso with its forearm, and over the legs, which lie
  // under the body's surface, but under the other arm, while the arm itself stays behind. The outline starts partway along the forearm, so it
  // doesn't draw a line across the elbow where the forearm joins the rest of the arm.
  if (handsOnBody) {
    for (let i = 0; i < handsOnBody.length; i++) {
      const isRight = handsOnBody[i] === 'rightHand';
      const arm = isRight ? rightArm : leftArm;
      const armPart: Part = isRight ? 'rightArm' : 'leftArm';
      let own = -1;
      let at = -1;
      for (let k = 0; k < slots.length; k++) {
        if (slots[k].hand) continue;
        if (slots[k].part === armPart) own = k;
        if (slots[k].part === 'torso') at = k;
        else if (at >= 0 && (slots[k].part === 'rightLeg' || slots[k].part === 'leftLeg' || slots[k].part === 'head')) at = k;
      }
      if (own < 0 || at < 0) continue;
      const [wide, narrow] = ARM_RADII[1];
      const from = lerpVec(arm[1], arm[2], RESTING_FOREARM_OUTLINE_FROM);
      slots.splice(at + 1, 0, {
        part: armPart,
        d: limbShape(arm.slice(1), ARM_RADII.slice(1)),
        outline: capsule(from, lerp(wide, narrow, RESTING_FOREARM_OUTLINE_FROM), arm[2], narrow) + capsule(arm[2], ARM_RADII[2][0], arm[3], ARM_RADII[2][1]),
        hand: true,
        shade: slots[own].shade,
        accent: slots[own].accent,
      });
    }
  }

  // A hand holding a limb goes over it, wherever its arm is. Its outline starts partway along the
  // hand, so it's kept apart from what it holds without a line across its own wrist.
  if (holds) {
    for (let i = 0; i < holds.length; i++) {
      const isRight = holds[i].hand === 'rightHand';
      const arm = isRight ? rightArm : leftArm;
      const armPart: Part = isRight ? 'rightArm' : 'leftArm';
      let own = -1;
      let at = -1;
      for (let k = 0; k < slots.length; k++) {
        if (slots[k].hand) continue;
        if (slots[k].part === armPart) own = k;
        if (slots[k].part === armPart || slots[k].part === holds[i].limb) at = k;
      }
      if (own < 0) continue;
      const [wide, narrow] = ARM_RADII[2];
      const from = lerpVec(arm[2], arm[3], HELD_HAND_OUTLINE_FROM);
      slots.splice(at + 1, 0, {
        part: armPart,
        d: capsule(arm[2], wide, arm[3], narrow),
        outline: capsule(from, lerp(wide, narrow, HELD_HAND_OUTLINE_FROM), arm[3], narrow),
        hand: true,
        shade: slots[own].shade,
        accent: slots[own].accent,
      });
    }
  }

  // A circle on the floor is an oval to the camera, flatter the lower the camera is.
  const flatness = Math.abs(view[5]);
  const under = (point: Vec3, radius: number): string =>
    disc(project(view, [point[0], 0, point[2]]), radius, Math.max(SHADOW_MIN_DEPTH, radius * flatness));
  const middle = skeleton.spine[Math.floor(skeleton.spine.length / 2)];
  const shadow =
    under(skeleton.spine[0], SHADOW.trunk) +
    under(middle, SHADOW.trunk) +
    under(skeleton.spine[skeleton.spine.length - 1], SHADOW.trunk) +
    under(skeleton.head, SHADOW.head) +
    under(skeleton.rightLeg[1], SHADOW.knee) +
    under(skeleton.leftLeg[1], SHADOW.knee) +
    under(skeleton.rightLeg[2], SHADOW.foot) +
    under(skeleton.leftLeg[2], SHADOW.foot) +
    under(skeleton.rightLeg[3], SHADOW.foot) +
    under(skeleton.leftLeg[3], SHADOW.foot);

  let strapLine = '';
  if (strap) {
    const points = strapPoints(skeleton, strap);
    for (let i = 0; i < points.length; i++) {
      const point = project(view, points[i]);
      strapLine += `${i === 0 ? 'M' : 'L'}${fixed(point[0])} ${fixed(point[1])}`;
    }
  }

  return { slots, shadow, strap: strapLine, phone: phoneShape(skeleton, view, phone, reading) };
}

/**
 * The part of the body whose path a clip's `trail` traces. The trail is drawn just under that part,
 * so it shows over whatever is behind the movement, like the standing leg, and under the limb
 * making it.
 */
export function trailedPart(trail: Clip3D['trail']): Part | undefined {
  'worklet';
  if (trail === 'rightHand') return 'rightArm';
  if (trail === 'leftHand') return 'leftArm';
  if (trail === 'rightFoot') return 'rightLeg';
  if (trail === 'leftFoot') return 'leftLeg';
  return undefined;
}

/** The clip at a moment, drawn. */
export function frameAt(clip: Clip3D, view: Mat3, timeMs: number): FigureFrame {
  'worklet';
  const pose = poseAt3(clip, timeMs);
  const skeleton = solvePose(pose);
  const behind = pose.behind ? (clip.behind ? [...clip.behind, ...pose.behind] : pose.behind) : clip.behind;
  return traceFigure(skeleton, view, clip.highlight, clip.strap, clip.phone, clip.phone ? phoneReading(clip, skeleton) : undefined, clip.over, behind, clip.holds, clip.handsOnBody);
}

function duration(clip: Clip3D): number {
  let total = 0;
  for (let i = 1; i < clip.keyframes.length; i++) total += clip.keyframes[i].ms;
  return total;
}

/** The shape of the frame the figure is shown in. */
const ASPECT = 16 / 9;
/** Room around the outermost joints for the body drawn over them, and a little air. */
const FRAME_MARGIN = 52;
/** How often the clip is looked at to see where it goes. */
const SAMPLE_MS = 50;
/** How far the mat reaches past the figure, and the least it reaches to either side of it. */
const MAT_MARGIN = 55;
const MAT_MIN_HALF_WIDTH = 70;

/** One side of a block, as the camera sees it. Tops are lightest, and of the sides, the one turned more toward the camera. */
export type SceneryFace = { d: string; tone: 'light' | 'mid' | 'dark' };

/**
 * The sides of a block: which four corners, the axis it faces along and which way. Corner `i` takes
 * its x from `to` when bit 0 is set and from `from` otherwise, its y by bit 1 and its z by bit 2.
 */
const BLOCK_FACES = [
  { corners: [2, 3, 7, 6], axis: 1, sign: 1 },
  { corners: [0, 1, 5, 4], axis: 1, sign: -1 },
  { corners: [1, 3, 7, 5], axis: 0, sign: 1 },
  { corners: [0, 2, 6, 4], axis: 0, sign: -1 },
  { corners: [4, 5, 7, 6], axis: 2, sign: 1 },
  { corners: [0, 1, 3, 2], axis: 2, sign: -1 },
] as const;

/**
 * Blocks in the order to draw them. Two blocks that don't overlap have a gap between them along at
 * least one of the room's axes, and the one on the side away from the camera along it goes first.
 * Distance to their middles gets this wrong for a table: seen from above, its front legs' middles
 * are nearer than the top's, but the top covers them.
 */
function paintOrder(blocks: readonly Block[], view: Mat3): Block[] {
  const lo = (block: Block, axis: number) => Math.min(block.from[axis], block.to[axis]);
  const hi = (block: Block, axis: number) => Math.max(block.from[axis], block.to[axis]);
  /** Whether `a` has to be drawn before `b`. */
  const behind = (a: Block, b: Block) => {
    for (let axis = 0; axis < 3; axis++) {
      // How far along this axis points toward the camera.
      const toward = view[6 + axis];
      if (Math.abs(toward) < 1e-6) continue;
      if (hi(a, axis) <= lo(b, axis) + 1e-6 && toward > 0) return true;
      if (lo(a, axis) >= hi(b, axis) - 1e-6 && toward < 0) return true;
    }
    return false;
  };
  const depthOf = (block: Block) => project(view, lerpVec(block.from, block.to, 0.5))[2];
  const left = [...blocks];
  const order: Block[] = [];
  while (left.length > 0) {
    // Whichever block nothing left has to be drawn before; failing that, the furthest by its middle.
    let next = left.findIndex((block) => !left.some((other) => other !== block && behind(other, block)));
    if (next < 0) next = left.reduce((best, block, i) => (depthOf(block) < depthOf(left[best]) ? i : best), 0);
    order.push(left.splice(next, 1)[0]);
  }
  return order;
}

/** The sides of each block that face the camera, the furthest block first. */
function sceneryFaces(blocks: readonly Block[], view: Mat3): SceneryFace[] {
  const faces: SceneryFace[] = [];
  for (const block of paintOrder(blocks, view)) {
    const lo = [0, 1, 2].map((i) => Math.min(block.from[i], block.to[i]));
    const hi = [0, 1, 2].map((i) => Math.max(block.from[i], block.to[i]));
    const corners: Vec3[] = [];
    for (let i = 0; i < 8; i++) corners.push(project(view, [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]]));
    for (const face of BLOCK_FACES) {
      // The bottom row of the view is how far along each of the room's axes points toward the camera.
      if (view[6 + face.axis] * face.sign <= 1e-6) continue;
      const tone = face.axis === 1 ? 'light' : Math.abs(view[6 + face.axis]) >= Math.abs(view[8 - face.axis]) ? 'mid' : 'dark';
      faces.push({ d: polygon(face.corners.map((i) => [corners[i][0], corners[i][1]])), tone });
    }
  }
  return faces;
}

export type Staging = {
  view: Mat3;
  viewBox: string;
  /** The corners of the mat under the figure, as a closed path. */
  mat: string;
  /** The path the clip's `trail` takes, or empty without one. */
  trail: string;
  /** The clip's scenery, in the order to draw it, under the figure. */
  scenery: SceneryFace[];
  /** The clip's tape measure: the strip, and its marks to stroke. Empty without one. */
  tape: { strip: string; marks: string };
};

/** A tape measure's width, about 2.5 cm, drawn a little wider so it reads. */
const TAPE_WIDTH = 9;
/** A mark across the tape every this far, about 10 cm, every other one longer. */
const TAPE_MARK_EVERY = 25;
/** How high the tape sits above the surface it lies on, so it isn't lost in it. */
const TAPE_LIFT = 0.5;

/** A tape measure lying flat, as the camera sees it. */
function tapeShape(tape: Clip3D['tape'], view: Mat3): Staging['tape'] {
  if (!tape) return { strip: '', marks: '' };
  const from: Vec3 = [tape.from[0], tape.from[1] + TAPE_LIFT, tape.from[2]];
  const to: Vec3 = [tape.to[0], tape.to[1] + TAPE_LIFT, tape.to[2]];
  const length = distance(from, to);
  const along = unit(sub(to, from), [1, 0, 0]);
  // Flat on the surface, so its width runs level, square to its length.
  const across = unit(cross([0, 1, 0], along), [0, 0, 1]);
  const at = (l: number, w: number): Vec2 => {
    const point = project(view, add(add(from, scaled(along, l)), scaled(across, w)));
    return [point[0], point[1]];
  };
  const half = TAPE_WIDTH / 2;
  const strip = polygon([at(0, -half), at(length, -half), at(length, half), at(0, half)]);
  let marks = '';
  for (let i = 1; i * TAPE_MARK_EVERY < length; i++) {
    const reach = i % 2 === 0 ? half : half * 0.2;
    const [a, b] = [at(i * TAPE_MARK_EVERY, -half), at(i * TAPE_MARK_EVERY, reach)];
    marks += `M${fixed(a[0])} ${fixed(a[1])}L${fixed(b[0])} ${fixed(b[1])}`;
  }
  return { strip, marks };
}

/**
 * Everything about a clip that doesn't change while it plays: the camera, the part of the room it
 * frames, the mat and the trail. The frame fits the whole movement, so the figure fills it and
 * nothing it does leaves it.
 */
export function stageClip(clip: Clip3D): Staging {
  const view = viewOf(clip.camera);
  // Framed from somewhere up the body, the floor needn't be in the frame.
  const upper = clip.camera.fit === 'upper' || clip.camera.fit === 'head';
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  const floor = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  let trail = '';

  const total = duration(clip);
  const steps = Math.max(1, Math.ceil(total / SAMPLE_MS));
  for (let step = 0; step <= steps; step++) {
    const skeleton = solvePose(poseAt3(clip, (total * step) / steps));
    const body = [...skeleton.spine, skeleton.head, ...skeleton.rightArm, ...skeleton.leftArm];
    const legs = [...skeleton.rightLeg, ...skeleton.leftLeg];
    for (const joint of framedJoints(skeleton, clip.camera.fit)) {
      const [x, y] = project(view, joint);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    for (const joint of [...body, ...legs]) {
      floor.minX = Math.min(floor.minX, joint[0]);
      floor.maxX = Math.max(floor.maxX, joint[0]);
      floor.minZ = Math.min(floor.minZ, joint[2]);
      floor.maxZ = Math.max(floor.maxZ, joint[2]);
    }
    if (clip.trail) {
      const limb = clip.trail === 'rightHand' ? skeleton.rightArm : clip.trail === 'leftHand' ? skeleton.leftArm : clip.trail === 'rightFoot' ? skeleton.rightLeg : skeleton.leftLeg;
      const [x, y] = project(view, limb[3]);
      trail += `${trail === '' ? 'M' : 'L'}${fixed(x)} ${fixed(y)}`;
    }
  }

  // The tape measure lies outside the figure, so it's kept in the frame too.
  if (clip.tape) {
    for (const end of [clip.tape.from, clip.tape.to]) {
      const [x, y] = project(view, end);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  // The smallest 16:9 frame around everything, the floor under a whole body included.
  if (!upper) bottom = Math.max(bottom, project(view, [0, 0, 0])[1]);
  let width = right - left + 2 * FRAME_MARGIN;
  let height = bottom - top + 2 * FRAME_MARGIN;
  if (width / height < ASPECT) width = height * ASPECT;
  else height = width / ASPECT;
  const viewBox = [(left + right - width) / 2, (top + bottom - height) / 2, width, height].map(fixed).join(' ');

  // The mat reaches past the figure, and at least as far as the edges of any scenery standing on it.
  let halfWidth = Math.max(MAT_MIN_HALF_WIDTH, Math.max(Math.abs(floor.minZ), Math.abs(floor.maxZ)) + MAT_MARGIN);
  let minX = floor.minX - MAT_MARGIN;
  let maxX = floor.maxX + MAT_MARGIN;
  for (const block of clip.scenery ?? []) {
    if (Math.min(block.from[1], block.to[1]) > 0) continue;
    minX = Math.min(minX, block.from[0], block.to[0]);
    maxX = Math.max(maxX, block.from[0], block.to[0]);
    halfWidth = Math.max(halfWidth, Math.abs(block.from[2]), Math.abs(block.to[2]));
  }
  const corners: Vec3[] = [
    [minX, 0, -halfWidth],
    [maxX, 0, -halfWidth],
    [maxX, 0, halfWidth],
    [minX, 0, halfWidth],
  ];
  const mat = corners.map((corner, i) => `${i === 0 ? 'M' : 'L'}${fixed(project(view, corner)[0])} ${fixed(project(view, corner)[1])}`).join('') + 'Z';

  return { view, viewBox, mat, trail, scenery: sceneryFaces(clip.scenery ?? [], view), tape: tapeShape(clip.tape, view) };
}
