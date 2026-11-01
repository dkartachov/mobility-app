/**
 * The stick figure behind exercise animations. A clip lists poses to move between, and each pose
 * places the hips, spine, head and the hands and feet. Elbows and knees are then solved so bones
 * never change length and whatever is planted on the floor stays put as the body moves over it.
 *
 * Everything that runs per frame is a worklet. Coordinates are in a 960x540 scene, with y down;
 * angles are in degrees, counterclockwise from pointing right (the way the figure faces).
 */

export const SCENE = { width: 960, height: 540, floorY: 470 };

export const BONES = {
  thigh: 100,
  shin: 100,
  foot: 42,
  torso: 125,
  neck: 48,
  upperArm: 75,
  forearm: 75,
  hand: 24,
};

export type Point = readonly [x: number, y: number];

/** A wrist or ankle, and the angle its hand or foot points in. */
export type Extremity = readonly [x: number, y: number, angle: number];

export type Pose = {
  hip: Point;
  /** Direction of the spine, from the hips to the shoulders. */
  torso: number;
  /** How far the spine curves off straight: positive rounds toward the figure's back. */
  arch: number;
  /** Direction of the head from the shoulders. */
  neck: number;
  nearHand: Extremity;
  farHand: Extremity;
  nearFoot: Extremity;
  farFoot: Extremity;
};

export type Keyframe = {
  /** Time taken to arrive at this pose from the one before it. */
  ms: number;
  pose: Pose;
  /** Hands and feet that move on the way here lift and step, rather than sliding along the floor. */
  step?: boolean;
};

export type FigureClip = {
  /** The first keyframe's `ms` is ignored; the clip starts on its pose. */
  keyframes: readonly Keyframe[];
  /** Index of the keyframe to show, unmoving, when reduced motion is on. */
  stillFrame: number;
  /** The floor seen from the side, or a mat seen from directly above. */
  view: 'side' | 'above';
  /**
   * Arms stay straight rather than bending at the elbow to reach their target. From above, an arm
   * swinging over the body looks shorter as it points at the camera; it doesn't really bend.
   */
  straightArms?: boolean;
  /** Fade over this long at both ends of the loop, for clips that travel and don't end where they start. */
  fadeMs?: number;
};

export type FigurePaths = {
  nearArm: string;
  farArm: string;
  nearLeg: string;
  farLeg: string;
  torso: string;
  neck: string;
  headX: number;
  headY: number;
};

export function clipDuration(clip: FigureClip): number {
  'worklet';
  let total = 0;
  for (let i = 1; i < clip.keyframes.length; i++) total += clip.keyframes[i].ms;
  return total;
}

/** The time at which a clip arrives at its nth keyframe. */
export function keyframeTime(clip: FigureClip, index: number): number {
  let total = 0;
  for (let i = 1; i <= index; i++) total += clip.keyframes[i].ms;
  return total;
}

/** How high a step lifts, as a fraction of how far it travels. */
const STEP_HEIGHT = 0.2;

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function lerpExtremity(a: Extremity, b: Extremity, t: number, step: boolean): Extremity {
  'worklet';
  const lift = step ? Math.sin(t * Math.PI) * Math.abs(b[0] - a[0]) * STEP_HEIGHT : 0;
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t) - lift, lerp(a[2], b[2], t)];
}

/** The clip's pose at a time in `[0, clipDuration]`, easing in and out of every keyframe. */
export function poseAt(clip: FigureClip, timeMs: number): Pose {
  'worklet';
  const frames = clip.keyframes;
  let elapsed = 0;
  for (let i = 1; i < frames.length; i++) {
    const { ms, step = false } = frames[i];
    if (timeMs <= elapsed + ms) {
      const linear = ms === 0 ? 1 : (timeMs - elapsed) / ms;
      const t = linear * linear * (3 - 2 * linear);
      const a = frames[i - 1].pose;
      const b = frames[i].pose;
      return {
        hip: [lerp(a.hip[0], b.hip[0], t), lerp(a.hip[1], b.hip[1], t)],
        torso: lerp(a.torso, b.torso, t),
        arch: lerp(a.arch, b.arch, t),
        neck: lerp(a.neck, b.neck, t),
        nearHand: lerpExtremity(a.nearHand, b.nearHand, t, step),
        farHand: lerpExtremity(a.farHand, b.farHand, t, step),
        nearFoot: lerpExtremity(a.nearFoot, b.nearFoot, t, step),
        farFoot: lerpExtremity(a.farFoot, b.farFoot, t, step),
      };
    }
    elapsed += ms;
  }
  return frames[frames.length - 1].pose;
}

/** How opaque the figure is at a time, for clips that fade across the loop point. */
export function opacityAt(clip: FigureClip, timeMs: number): number {
  'worklet';
  if (!clip.fadeMs) return 1;
  const fromEnd = Math.min(timeMs, clipDuration(clip) - timeMs);
  return Math.max(0, Math.min(1, fromEnd / clip.fadeMs));
}

function along(from: Point, angle: number, length: number): Point {
  'worklet';
  const radians = (angle * Math.PI) / 180;
  return [from[0] + length * Math.cos(radians), from[1] - length * Math.sin(radians)];
}

/** The target itself, or as far toward it as a limb of this length can get. */
function withinReach(root: Point, target: Extremity, reach: number): Extremity {
  'worklet';
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const distance = Math.hypot(dx, dy);
  if (distance <= reach) return target;
  const scale = reach / distance;
  return [root[0] + dx * scale, root[1] + dy * scale, target[2]];
}

/**
 * Where the middle joint goes in a two-bone limb. `bend` picks the side it sticks out on: 1 is to
 * the limb's left, looking from its root to its tip. A target out of reach just straightens the limb.
 */
export function solveJoint(root: Point, tip: Point, first: number, second: number, bend: 1 | -1): Point {
  'worklet';
  const dx = tip[0] - root[0];
  const dy = tip[1] - root[1];
  const length = Math.max(0.001, Math.hypot(dx, dy));
  const distance = Math.min(first + second, length);
  const a = (first * first - second * second + distance * distance) / (2 * distance);
  const h = Math.sqrt(Math.max(0, first * first - a * a));
  const ux = dx / length;
  const uy = dy / length;
  return [root[0] + a * ux + bend * h * uy, root[1] + a * uy - bend * h * ux];
}

/** A two-bone limb with a hand or foot on the end. Bones never stretch to reach a far target. */
function limbPath(root: Point, target: Extremity, first: number, second: number, bend: 1 | -1, endLength: number): string {
  'worklet';
  const end = withinReach(root, target, first + second);
  const joint = solveJoint(root, [end[0], end[1]], first, second, bend);
  const tip = along([end[0], end[1]], end[2], endLength);
  return `M${root[0]} ${root[1]}L${joint[0]} ${joint[1]}L${end[0]} ${end[1]}L${tip[0]} ${tip[1]}`;
}

export function shoulderOf(pose: Pose): Point {
  'worklet';
  return along(pose.hip, pose.torso, BONES.torso);
}

/** Traces the figure in the given pose. */
export function solveFigure(pose: Pose, straightArms = false): FigurePaths {
  'worklet';
  const { hip, nearHand, farHand, nearFoot, farFoot } = pose;
  const shoulder = shoulderOf(pose);
  const head = along(shoulder, pose.neck, BONES.neck);

  // Knees bend forward and elbows backward, whichever way the limb is pointing.
  const arm = (hand: Extremity): string => {
    if (straightArms) {
      // The hand shortens along with the rest of the arm as it swings toward the camera.
      const scale = 1 + BONES.hand / (BONES.upperArm + BONES.forearm);
      const tipX = shoulder[0] + (hand[0] - shoulder[0]) * scale;
      const tipY = shoulder[1] + (hand[1] - shoulder[1]) * scale;
      return `M${shoulder[0]} ${shoulder[1]}L${tipX} ${tipY}`;
    }
    return limbPath(shoulder, hand, BONES.upperArm, BONES.forearm, -1, BONES.hand);
  };
  const leg = (foot: Extremity): string => limbPath(hip, foot, BONES.thigh, BONES.shin, 1, BONES.foot);

  // The spine bows off the middle of the straight line from hips to shoulders.
  const spine = along(
    [(hip[0] + shoulder[0]) / 2, (hip[1] + shoulder[1]) / 2],
    pose.torso + 90,
    pose.arch * 2
  );

  return {
    nearArm: arm(nearHand),
    farArm: arm(farHand),
    nearLeg: leg(nearFoot),
    farLeg: leg(farFoot),
    torso: `M${hip[0]} ${hip[1]}Q${spine[0]} ${spine[1]} ${shoulder[0]} ${shoulder[1]}`,
    neck: `M${shoulder[0]} ${shoulder[1]}L${head[0]} ${head[1]}`,
    headX: head[0],
    headY: head[1],
  };
}
