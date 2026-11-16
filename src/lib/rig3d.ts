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
  /** Frame the whole body, or move in on everything from the pelvis up, or on the pelvis and legs. */
  fit?: 'body' | 'upper' | 'lower';
};

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
  scenery?: readonly Block[];
  /** A strap looped around the ball of this foot, with an end held in each hand. */
  strap?: 'rightFoot' | 'leftFoot';
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

  const rightShoulder = add(neckBase, turned(chest, [0, 0, SKELETON.shoulder]));
  const leftShoulder = add(neckBase, turned(chest, [0, 0, -SKELETON.shoulder]));
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
  const wing = toRight < toLeft ? right : left;
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
 * Where a strap around a foot runs in the room: from the middle of the right hand, down the right
 * side of the foot, under the ball of it, and back up the left side to the left hand.
 */
export function strapPoints(skeleton: Skeleton, foot: NonNullable<Clip3D['strap']>): Vec3[] {
  'worklet';
  const leg = foot === 'rightFoot' ? skeleton.rightLeg : skeleton.leftLeg;
  const along = unit(sub(leg[3], leg[2]), [1, 0, 0]);
  const shin = unit(sub(leg[2], leg[1]), [0, -1, 0]);
  // The sole faces the way the shin points, as near as a direction square to the foot can.
  const sole = unit(sub(shin, scaled(along, dot(shin, along))), [0, -1, 0]);
  let side = cross(along, sole);
  if (dot(side, skeleton.spineRight[0]) < 0) side = scaled(side, -1);
  const ball = add(add(leg[2], scaled(along, SKELETON.foot * STRAP_ALONG_FOOT)), scaled(sole, STRAP_UNDER_SOLE));
  return [
    lerpVec(skeleton.rightArm[2], skeleton.rightArm[3], 0.5),
    add(ball, scaled(side, STRAP_HALF_WIDTH)),
    add(ball, scaled(side, -STRAP_HALF_WIDTH)),
    lerpVec(skeleton.leftArm[2], skeleton.leftArm[3], 0.5),
  ];
}

/** Draws the figure as the camera sees it. `view` comes from `viewOf`. */
export function traceFigure(skeleton: Skeleton, view: Mat3, highlight?: readonly Part[], strap?: Clip3D['strap']): FigureFrame {
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
    const over = overTorso(points, spine, thickness, isLeg ? spine[0] : neckBase, isLeg);
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
      shade: Math.max(0, Math.min(1, 0.5 + offset / (2 * SHADE_RANGE))),
      accent: highlight ? highlight.includes(part) : false,
    });
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

  return { slots, shadow, strap: strapLine };
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
  return traceFigure(solvePose(poseAt3(clip, timeMs)), view, clip.highlight, clip.strap);
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

/** The sides of each block that face the camera, the furthest block first. */
function sceneryFaces(blocks: readonly Block[], view: Mat3): SceneryFace[] {
  const depthOf = (block: Block) => project(view, lerpVec(block.from, block.to, 0.5))[2];
  const faces: SceneryFace[] = [];
  for (const block of [...blocks].sort((a, b) => depthOf(a) - depthOf(b))) {
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
};

/**
 * Everything about a clip that doesn't change while it plays: the camera, the part of the room it
 * frames, the mat and the trail. The frame fits the whole movement, so the figure fills it and
 * nothing it does leaves it.
 */
export function stageClip(clip: Clip3D): Staging {
  const view = viewOf(clip.camera);
  const upper = clip.camera.fit === 'upper';
  const lower = clip.camera.fit === 'lower';
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
    for (const joint of upper ? body : lower ? [skeleton.spine[0], ...legs] : [...body, ...legs]) {
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

  return { view, viewBox, mat, trail, scenery: sceneryFaces(clip.scenery ?? [], view) };
}
