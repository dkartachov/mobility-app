import { EXERCISES } from '@/data/exercises';
import {
  ACTIVE_PANCAKE_3D,
  ACTIVE_STRAIGHT_LEG_RAISE_3D,
  ANKLE_MOBILIZATION_3D,
  BACK_LYING_REVERSE_PIGEON_3D,
  BEHIND_THE_BACK_CHEST_OPENER_3D,
  BELLY_DOWN_FOOT_SPLAY_3D,
  BLACKBURN_3D,
  BOTTOM_SQUAT_3D,
  BOTTOM_SQUAT_ROTATION_3D,
  BUTTERFLY_3D,
  CAT_COW_3D,
  COBRA_TO_PRAYER_3D,
  COSSACK_SQUAT_3D,
  DOWNWARD_FACING_DOG_3D,
  DOWNWARD_FACING_DOG_TO_COBRA_3D,
  FINGER_TENDON_GLIDES_3D,
  HIP_ABDUCTION_3D,
  HIP_EXTERNAL_ROTATION_3D,
  HIP_INTERNAL_ROTATION_3D,
  KNEE_TO_CHEST_3D,
  KNEE_TO_WALL_3D,
  LYING_HAMSTRING_STRETCH_3D,
  LYING_KNEE_HUG_3D,
  LEG_SWINGS_3D,
  MARCHING_3D,
  NINETY_TO_NINETY_3D,
  NINETY_TO_NINETY_ROTATIONS_3D,
  NINETY_TO_NINETY_SIDE_FOOT_LIFTS_3D,
  OVERHEAD_REACH_3D,
  PANCAKE_3D,
  PRAYER_POSE_3D,
  PUPPY_POSE_3D,
  RESTING_COSSACK_SQUAT_3D,
  SEATED_PIKE_STRETCH_3D,
  SHOULDER_ABDUCTION_3D,
  SHOULDER_EXTERNAL_ROTATION_3D,
  SIT_AND_REACH_3D,
  SQUAT_TO_STAND_3D,
  STRAIGHT_LEG_RAISE_3D,
  FLOOR_ANGELS_3D,
  FROG_ROCKS_3D,
  FROG_STRETCH_3D,
  HORSE_STANCE_3D,
  KNIGHT_STRETCH_3D,
  KNIGHT_TO_HAMSTRING_3D,
  COUCH_STRETCH_3D,
  PYRAMID_STRETCH_3D,
  WRIST_ROCKS_3D,
  ELEPHANT_WALK_3D,
  SEATED_STRADDLE_SIDE_BEND_3D,
  SEATED_SHOULDER_EXTENSION_3D,
  HALF_KNEELING_FROG_STRETCH_3D,
  NECK_SIDE_STRETCH_3D,
  CROSS_BODY_SHOULDER_STRETCH_3D,
  OVERHEAD_TRICEPS_STRETCH_3D,
  COW_FACE_ARMS_3D,
  MANUAL_EXTENSOR_FOREARM_STRETCH_3D,
  MANUAL_FLEXOR_FOREARM_STRETCH_3D,
  PIGEON_STRETCH_3D,
  HIP_CIRCLES_3D,
  SCAP_MOBILIZATION_3D,
  LIZARD_POSE_3D,
  FIGURE_FOUR_STRETCH_3D,
  THE_BREAKDANCER_3D,
  LYING_WINDSHIELD_WIPER_HOLD_3D,
  REVERSE_TABLETOP_3D,
  KNEELING_WRIST_STRETCH_3D,
  STANDING_FORWARD_FOLD_3D,
  THREE_LEGGED_DOWNWARD_FACING_DOG_3D,
} from '@/data/exercise-animations-3d';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';
import { MARCHING_EXERCISE } from '@/data/test-warmup';

import {
  distance,
  frameAt,
  framedJoints,
  HAND,
  poseAt3,
  project,
  SKELETON,
  solveJoint3,
  solvePose,
  PHONE,
  phonePlacement,
  phoneReading,
  stageClip,
  strapPoints,
  thumbPoints,
  traceFigure,
  trailedPart,
  viewOf,
  type Clip3D,
  type Pose3,
  type Skeleton,
  type Vec3,
} from './rig3d';

const clips = [...EXERCISES, ...FLEXIBILITY_TESTS, MARCHING_EXERCISE].flatMap((e) =>
  e.animation?.view === '3d' ? [[e.id, e.animation] as const] : []
);

function durationOf(clip: Clip3D): number {
  return clip.keyframes.slice(1).reduce((total, frame) => total + frame.ms, 0);
}

/** The clip's pose as it's drawn every 50ms, so problems between keyframes are caught too. */
function samples(clip: Clip3D): Pose3[] {
  const poses: Pose3[] = [];
  for (let t = 0; t <= durationOf(clip); t += 50) poses.push(poseAt3(clip, t));
  return poses;
}

function joints(skeleton: Skeleton): Vec3[] {
  return [...skeleton.spine, skeleton.head, ...skeleton.rightArm, ...skeleton.leftArm, ...skeleton.rightLeg, ...skeleton.leftLeg];
}

const STANDING: Pose3 = { pelvis: [0, 213, 0] };

/** The direction from one point to another. */
function unitBetween(a: Vec3, b: Vec3): Vec3 {
  const length = distance(a, b);
  return [(b[0] - a[0]) / length, (b[1] - a[1]) / length, (b[2] - a[2]) / length];
}

/** The direction square to both of two others. */
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Halfway between two points. */
function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/** The angle at `b` between the bones to `a` and `c`: 180 for a straight limb. */
function angleAt(a: Vec3, b: Vec3, c: Vec3): number {
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** How far a limb from `root` to `end` is turned from pointing straight down, in degrees. */
function fromHanging(root: Vec3, end: Vec3): number {
  return angleAt([root[0], root[1] - 1, root[2]], root, end);
}

/** How far a shin or a spine from `base` up to `top` is tipped from upright, in degrees. */
function tipped(base: Vec3, top: Vec3): number {
  return angleAt([base[0], base[1] + 1, base[2]], base, top);
}

/** How far apart the middles of two limbs have to be for them not to touch. */
const LIMB_CLEAR = 20;

/** How many steps the squat to stand takes to fold forward from standing, which puts the fold on that keyframe. */
const STS_FOLD_STEPS_IN_TEST = 16;

/** The closest two limbs' bones come on screen, given their joints as the camera sees them. */
function boneGap(a: readonly Vec3[], b: readonly Vec3[]): number {
  let gap = Infinity;
  for (let i = 1; i < a.length; i++) {
    for (let step = 0; step <= 8; step++) {
      const p = a[i - 1].map((v, k) => v + (a[i][k] - v) * (step / 8));
      for (let j = 1; j < b.length; j++) {
        const [s, e] = [b[j - 1], b[j]];
        const dx = e[0] - s[0];
        const dy = e[1] - s[1];
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared < 1e-6 ? 0 : Math.max(0, Math.min(1, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / lengthSquared));
        gap = Math.min(gap, Math.hypot(s[0] + dx * t - p[0], s[1] + dy * t - p[1]));
      }
    }
  }
  return gap;
}

/** How far apart two projected points are on screen. */
function onScreen(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** The longest a clip stays still on one pose. */
function longestHold(clip: Clip3D): number {
  const same = (a: Pose3, b: Pose3) => JSON.stringify(a) === JSON.stringify(b);
  return Math.max(...clip.keyframes.slice(1).map((frame, i) => (same(frame.pose, clip.keyframes[i].pose) ? frame.ms : 0)));
}

/** The order the body's parts are drawn in, at every moment of a clip. A clip whose parts never swap has one. */
function drawOrders(clip: Clip3D): string[] {
  const view = viewOf(clip.camera);
  const orders: string[] = [];
  for (let t = 0; t <= durationOf(clip); t += 10) {
    orders.push(
      frameAt(clip, view, t)
        .slots.map((slot) => (slot.hand ? `${slot.part} hand` : slot.part))
        .join(' ')
    );
  }
  return orders;
}

describe('solveJoint3', () => {
  it('keeps both bones their length', () => {
    const root: Vec3 = [0, 100, 0];
    const tip: Vec3 = [60, 20, 30];
    const joint = solveJoint3(root, tip, 75, 75, [0, 0, 1]);
    expect(distance(root, joint)).toBeCloseTo(75);
    expect(distance(joint, tip)).toBeCloseTo(75);
  });

  it('sticks the joint out toward the pole', () => {
    const forward = solveJoint3([0, 200, 0], [0, 50, 0], 100, 100, [1, 0, 0]);
    const right = solveJoint3([0, 200, 0], [0, 50, 0], 100, 100, [0, 0, 1]);
    expect(forward[0]).toBeGreaterThan(50);
    expect(forward[2]).toBeCloseTo(0);
    expect(right[2]).toBeGreaterThan(50);
    expect(right[0]).toBeCloseTo(0);
  });

  it('straightens toward a tip out of reach', () => {
    const joint = solveJoint3([0, 0, 0], [500, 0, 0], 100, 100, [0, 1, 0]);
    expect(joint[0]).toBeCloseTo(100);
    expect(joint[1]).toBeCloseTo(0);
  });
});

describe('solvePose', () => {
  it('stands a figure with no angles upright, facing along x with its right side toward z', () => {
    const skeleton = solvePose(STANDING);
    const neckBase = skeleton.spine[skeleton.spine.length - 1];
    expect(neckBase[0]).toBeCloseTo(0);
    expect(neckBase[1]).toBeCloseTo(213 + SKELETON.torso);
    expect(skeleton.facing[0]).toBeCloseTo(1);
    expect(skeleton.rightArm[0][2]).toBeCloseTo(SKELETON.shoulder);
    expect(skeleton.leftArm[0][2]).toBeCloseTo(-SKELETON.shoulder);
    // Arms hang, and the feet point ahead from under the hips.
    expect(skeleton.rightArm[3][1]).toBeCloseTo(neckBase[1] - SKELETON.upperArm - SKELETON.forearm - SKELETON.hand);
    expect(skeleton.rightLeg[2][1]).toBeCloseTo(13);
    expect(skeleton.rightLeg[3][0]).toBeCloseTo(SKELETON.foot);
  });

  it('lifts or drops a shoulder with its shrug, swinging on the collarbone and carrying the arm with it, pinned or not', () => {
    const standing = solvePose(STANDING);
    const neckBase = standing.spine[standing.spine.length - 1];
    const shrugged = solvePose({ ...STANDING, rightArm: { shrug: 20 }, leftArm: { shrug: -15 } });
    // The collarbone keeps its length, so the shoulder comes in a little as it rises.
    expect(distance(shrugged.rightArm[0], neckBase)).toBeCloseTo(SKELETON.shoulder);
    expect(shrugged.rightArm[0][1] - neckBase[1]).toBeCloseTo(SKELETON.shoulder * Math.sin((20 * Math.PI) / 180));
    expect(shrugged.leftArm[0][1] - neckBase[1]).toBeCloseTo(-SKELETON.shoulder * Math.sin((15 * Math.PI) / 180));
    expect(shrugged.rightArm[0][2]).toBeLessThan(SKELETON.shoulder);
    // A hanging arm goes up with its shoulder.
    expect(shrugged.rightArm[2][1] - standing.rightArm[2][1]).toBeCloseTo(shrugged.rightArm[0][1] - standing.rightArm[0][1]);
    // A pinned arm's shoulder moves too, its hand staying on the pin.
    const pin = { at: [40, 270, 40] as Vec3 };
    const pinned = solvePose({ ...STANDING, rightArm: { shrug: 20 }, pins: { rightHand: pin } });
    expect(pinned.rightArm[0]).toEqual(shrugged.rightArm[0]);
    expect(distance(pinned.rightArm[2], pin.at)).toBeLessThan(0.01);
  });

  it('slides a shoulder forward round the ribs with its protract, or back toward the spine, swinging on the collarbone, pinned or not', () => {
    const standing = solvePose(STANDING);
    const neckBase = standing.spine[standing.spine.length - 1];
    const slid = solvePose({ ...STANDING, rightArm: { protract: 20 }, leftArm: { protract: -15 } });
    // The collarbone keeps its length and stays level; the shoulder goes the way the chest faces, or back.
    expect(distance(slid.rightArm[0], neckBase)).toBeCloseTo(SKELETON.shoulder);
    expect(slid.rightArm[0][1]).toBeCloseTo(neckBase[1]);
    expect(slid.rightArm[0][0] - neckBase[0]).toBeCloseTo(SKELETON.shoulder * Math.sin((20 * Math.PI) / 180));
    expect(slid.leftArm[0][0] - neckBase[0]).toBeCloseTo(-SKELETON.shoulder * Math.sin((15 * Math.PI) / 180));
    expect(slid.rightArm[0][2]).toBeLessThan(SKELETON.shoulder);
    // A pinned arm's shoulder moves too.
    const pin = { at: [40, 270, 40] as Vec3 };
    const pinned = solvePose({ ...STANDING, rightArm: { protract: 20 }, pins: { rightHand: pin } });
    expect(pinned.rightArm[0]).toEqual(slid.rightArm[0]);
    expect(distance(pinned.rightArm[2], pin.at)).toBeLessThan(0.01);
  });

  it('mirrors the same angles on the left and the right', () => {
    const arm = { flex: 30, abduct: 40, rotate: 25, elbow: 70 };
    const leg = { flex: 50, abduct: 20, rotate: 15, knee: 60, ankle: 10 };
    const skeleton = solvePose({ ...STANDING, rightArm: arm, leftArm: arm, rightLeg: leg, leftLeg: leg });
    for (const [right, left] of [
      [skeleton.rightArm, skeleton.leftArm],
      [skeleton.rightLeg, skeleton.leftLeg],
    ]) {
      right.forEach((joint, i) => {
        expect(left[i][0]).toBeCloseTo(joint[0]);
        expect(left[i][1]).toBeCloseTo(joint[1]);
        expect(left[i][2]).toBeCloseTo(-joint[2]);
      });
    }
  });

  it('moves each limb the way its angles are named', () => {
    const neutral = solvePose(STANDING);
    const raised = solvePose({ ...STANDING, rightArm: { flex: 90 } });
    expect(raised.rightArm[2][0]).toBeGreaterThan(neutral.rightArm[2][0] + 100);
    const out = solvePose({ ...STANDING, rightArm: { abduct: 90 }, rightLeg: { abduct: 30 } });
    expect(out.rightArm[2][2]).toBeGreaterThan(neutral.rightArm[2][2] + 100);
    expect(out.rightLeg[2][2]).toBeGreaterThan(neutral.rightLeg[2][2] + 40);
    // A bent elbow points the forearm ahead, and rotating outward swings it to that arm's own side.
    const bent = solvePose({ ...STANDING, rightArm: { elbow: 90 }, leftArm: { elbow: 90, rotate: 90 } });
    expect(bent.rightArm[2][0] - bent.rightArm[1][0]).toBeCloseTo(SKELETON.forearm);
    expect(bent.leftArm[2][2] - bent.leftArm[1][2]).toBeCloseTo(-SKELETON.forearm);
    const kneeling = solvePose({ ...STANDING, rightLeg: { knee: 90 } });
    expect(kneeling.rightLeg[2][0]).toBeCloseTo(-SKELETON.shin);
  });

  it('rounds the spine forward without changing its length', () => {
    const skeleton = solvePose({ ...STANDING, spine: { flex: 80 } });
    const top = skeleton.spine[skeleton.spine.length - 1];
    expect(top[0]).toBeGreaterThan(30);
    let length = 0;
    for (let i = 1; i < skeleton.spine.length; i++) length += distance(skeleton.spine[i - 1], skeleton.spine[i]);
    expect(length).toBeCloseTo(SKELETON.torso);
  });

  it('holds a pinned hand in place as the body moves, pointing where it is told', () => {
    const pins = { rightHand: { at: [60, 230, 40] as Vec3, toward: [1, 0, 0] as Vec3 } };
    for (const lean of [0, 20, 40]) {
      const { rightArm } = solvePose({ ...STANDING, lean, pins });
      expect(distance(rightArm[2], pins.rightHand.at)).toBeCloseTo(0);
      expect(distance(rightArm[0], rightArm[1])).toBeCloseTo(SKELETON.upperArm);
      expect(distance(rightArm[1], rightArm[2])).toBeCloseTo(SKELETON.forearm);
      expect(rightArm[3][0] - rightArm[2][0]).toBeCloseTo(SKELETON.hand);
    }
  });

  it('gives a hand fingers only when asked, and bends them toward the palm', () => {
    expect(solvePose(STANDING).rightFingers).toBeUndefined();
    // Hanging, the palms face in, so the right fingers curl toward the left and the left ones toward the right.
    const curled = solvePose({ ...STANDING, rightArm: { fingers: { knuckle: 90 } }, leftArm: { fingers: { knuckle: 90 } } });
    const [rightKnuckle, , , rightTip] = curled.rightFingers!.joints;
    expect(rightKnuckle[1]).toBeCloseTo(curled.rightArm[2][1] - HAND.palm);
    expect(rightTip[2] - rightKnuckle[2]).toBeCloseTo(-(HAND.fingers[0] + HAND.fingers[1] + HAND.fingers[2]));
    expect(curled.leftFingers!.joints[3][2] - curled.leftFingers!.joints[0][2]).toBeCloseTo(HAND.fingers[0] + HAND.fingers[1] + HAND.fingers[2]);
    // A pinned hand bends them toward the palm it's pinned with, and without one has no fingers to bend.
    const pin = { at: [60, 300, 60] as Vec3, toward: [0, 1, 0] as Vec3 };
    const pinned = solvePose({ ...STANDING, rightArm: { fingers: { middle: 90 } }, pins: { rightHand: { ...pin, palm: [1, 0, 0] } } });
    const [, middle, , tip] = pinned.rightFingers!.joints;
    expect(tip[0] - middle[0]).toBeCloseTo(HAND.fingers[1] + HAND.fingers[2]);
    expect(solvePose({ ...STANDING, rightArm: { fingers: { middle: 90 } }, pins: { rightHand: pin } }).rightFingers).toBeUndefined();
  });
});

describe('poseAt3', () => {
  it('lands on each keyframe at its time and turns joints in between', () => {
    const clip = SHOULDER_EXTERNAL_ROTATION_3D;
    expect(poseAt3(clip, 0).rightArm?.rotate).toBeCloseTo(0);
    expect(poseAt3(clip, 500 + 750).rightArm?.rotate).toBeCloseTo(32.5);
    expect(poseAt3(clip, 500 + 1500).rightArm?.rotate).toBeCloseTo(65);
  });
});

describe('traceFigure', () => {
  const skeleton = solvePose(STANDING);
  const order = (yaw: number) => traceFigure(skeleton, viewOf({ yaw, pitch: 0 })).slots.map((slot) => slot.part);

  it('draws whatever is nearest the camera last', () => {
    const fromRight = order(0);
    expect(fromRight.indexOf('rightArm')).toBeGreaterThan(fromRight.indexOf('torso'));
    expect(fromRight.indexOf('torso')).toBeGreaterThan(fromRight.indexOf('leftArm'));
    const fromLeft = order(180);
    expect(fromLeft.indexOf('leftArm')).toBeGreaterThan(fromLeft.indexOf('torso'));
    expect(fromLeft.indexOf('torso')).toBeGreaterThan(fromLeft.indexOf('rightArm'));
  });

  it('shades parts darker the nearer they are, and the head the same as the torso', () => {
    const slots = traceFigure(skeleton, viewOf({ yaw: 0, pitch: 0 })).slots;
    const shade = (part: string) => slots.find((slot) => slot.part === part)!.shade;
    expect(shade('rightArm')).toBeGreaterThan(shade('torso'));
    expect(shade('torso')).toBeGreaterThan(shade('leftArm'));
    expect(shade('head')).toBe(shade('torso'));
  });

  it('marks only the highlighted parts', () => {
    const slots = traceFigure(skeleton, viewOf({ yaw: 0, pitch: 0 }), ['rightArm']).slots;
    expect(slots.filter((slot) => slot.accent).map((slot) => slot.part)).toEqual(['rightArm']);
  });

  describe('the nose', () => {
    /** The head's centre on screen, and the nose: the run of straight lines after the head's disc. */
    const nose = (yaw: number, pitch = 10) => {
      const view = viewOf({ yaw, pitch });
      const d = traceFigure(skeleton, view).slots.find((slot) => slot.part === 'head')!.d;
      const shape = d.slice(d.indexOf('Z') + 1);
      const points = [...shape.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      // Positive is clockwise on screen: a hole cut into the head, rather than a shape added to it.
      let area = 0;
      points.forEach(([x0, y0], i) => {
        const [x1, y1] = points[(i + 1) % points.length];
        area += x0 * y1 - x1 * y0;
      });
      const [cx, cy] = project(view, skeleton.head);
      const reach = Math.max(...points.map(([x, y]) => Math.hypot(x - cx, y - cy)));
      return { points, cut: area > 0, reach };
    };

    it('is a line cut into a face turned toward the camera, kept inside the head', () => {
      for (const [yaw, pitch] of [
        [90, 10],
        [78, 40],
      ]) {
        const { points, cut, reach } = nose(yaw, pitch);
        expect(points.length).toBeGreaterThan(4);
        expect(cut).toBe(true);
        expect(reach).toBeLessThan(SKELETON.head);
      }
    });

    it('stays on one side seen head on, rather than jumping from side to side with rounding', () => {
      const view = viewOf({ yaw: 90, pitch: 38 });
      const drawn = new Set<string>();
      for (const twist of [-1e-9, 0, 1e-9, -0.1, 0.1]) {
        const d = traceFigure(solvePose({ ...STANDING, neck: { twist } }), view).slots.find((slot) => slot.part === 'head')!.d;
        const [cx] = project(view, solvePose({ ...STANDING, neck: { twist } }).head);
        const xs = [...d.slice(d.indexOf('Z') + 1).matchAll(/[ML](-?[\d.]+) /g)].map((m) => Number(m[1]));
        drawn.add(Math.sign(xs.reduce((total, x) => total + x, 0) / xs.length - cx).toString());
      }
      expect(drawn.size).toBe(1);
    });

    it('is left off in profile, where the body shows which way the figure faces', () => {
      expect(nose(0).points).toEqual([]);
      expect(nose(180).points).toEqual([]);
    });

    it('is left off the back of the head', () => {
      expect(nose(270).points).toEqual([]);
    });
  });

  it('never writes a broken number into a path', () => {
    for (const camera of [{ yaw: 0, pitch: 0 }, { yaw: 90, pitch: 0 }, { yaw: 30, pitch: 90 }]) {
      const frame = traceFigure(solvePose({ ...STANDING, lean: 90 }), viewOf(camera));
      for (const slot of frame.slots) expect(slot.d).not.toMatch(/NaN|Infinity|undefined/);
      expect(frame.shadow).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});

describe('project', () => {
  it('looks at the right side of the figure from yaw 0, its front from 90, and down on it from pitch 90', () => {
    const ahead: Vec3 = [100, 50, 0];
    const side = project(viewOf({ yaw: 0, pitch: 0 }), ahead);
    expect(side[0]).toBeCloseTo(100);
    expect(side[1]).toBeCloseTo(-50);
    // From the front, what's ahead of the figure is nearer the camera, and its right is on the left.
    const front = viewOf({ yaw: 90, pitch: 0 });
    expect(project(front, ahead)[2]).toBeCloseTo(100);
    expect(project(front, [0, 0, 30])[0]).toBeCloseTo(-30);
    expect(project(viewOf({ yaw: 0, pitch: 90 }), [0, 80, 0])[2]).toBeCloseTo(80);
  });
});

describe('thumbPoints', () => {
  const wrist: Vec3 = [0, 100, 0];
  const thumbOf = (fingers: Vec3, palm: Vec3, side = 1) => {
    const arm = [wrist, wrist, wrist, [wrist[0] + fingers[0] * SKELETON.hand, wrist[1] + fingers[1] * SKELETON.hand, wrist[2] + fingers[2] * SKELETON.hand] as Vec3];
    const [root, tip] = thumbPoints(arm, palm, side);
    return unitBetween(root, tip);
  };

  it('points forward from a hand hanging palm in, and up from one held out ahead palm in', () => {
    expect(thumbOf([0, -1, 0], [0, 0, -1])[0]).toBeGreaterThan(0.6);
    expect(thumbOf([0, -1, 0], [0, 0, 1], -1)[0]).toBeGreaterThan(0.6);
    expect(thumbOf([1, 0, 0], [0, 0, -1])[1]).toBeGreaterThan(0.6);
  });

  it('turns toward the body palm down and away from it palm up, leaning toward the fingers', () => {
    const down = thumbOf([1, 0, 0], [0, -1, 0]);
    const up = thumbOf([1, 0, 0], [0, 1, 0]);
    expect(down[2]).toBeLessThan(-0.6);
    expect(up[2]).toBeGreaterThan(0.6);
    expect(up[0]).toBeGreaterThan(0.3);
  });
});

describe('3D clips', () => {
  it('covers the clips that have moved over', () => {
    expect(clips.map(([id]) => id)).toEqual(expect.arrayContaining([
      'cat-cow',
      'shoulder-external-rotation',
      'shoulder-abduction',
      'overhead-reach',
      'hip-abduction',
      'knee-to-wall',
      'hip-external-rotation',
      'hip-internal-rotation',
      'sit-and-reach',
      'knee-to-chest',
      'straight-leg-raise',
      'leg-swings',
      '90-to-90',
      '90-to-90-rotations',
      '90-to-90-side-foot-lifts',
      'pancake',
      'active-pancake',
      'active-straight-leg-raise',
      'ankle-mobilization',
      'behind-the-back-chest-opener',
      'back-lying-reverse-pigeon',
      'belly-down-foot-splay',
      'bottom-squat',
      'bottom-squat-rotation',
      'squat-to-stand',
      'cossack-squat',
      'resting-cossack-squat',
      'butterfly',
      'cobra-to-prayer',
      'downward-facing-dog',
      'prayer-pose',
      'puppy-pose',
      'lying-knee-hug',
      'lying-hamstring-stretch',
      'seated-pike-stretch',
      'three-legged-downward-facing-dog',
      'standing-forward-fold',
      'kneeling-wrist-stretch',
      'floor-angels',
      'reverse-tabletop',
      'downward-facing-dog-to-cobra',
      'finger-tendon-glides',
      'warmup-marching',
    ]));
  });

  describe.each(clips)('%s', (_, clip) => {
    const skeletons = samples(clip).map(solvePose);

    it('never stretches a bone', () => {
      for (const { rightArm, leftArm, rightLeg, leftLeg, rightFingers, leftFingers } of skeletons) {
        // A hand with fingers that bend: the hand from the wrist to the knuckles, then each finger bone.
        for (const [fingers, arm] of [[rightFingers, rightArm], [leftFingers, leftArm]] as const) {
          if (!fingers) continue;
          expect(distance(arm[2], fingers.joints[0])).toBeCloseTo(HAND.palm);
          HAND.fingers.forEach((length, i) => expect(distance(fingers.joints[i], fingers.joints[i + 1])).toBeCloseTo(length));
        }
        for (const arm of [rightArm, leftArm]) {
          expect(distance(arm[0], arm[1])).toBeCloseTo(SKELETON.upperArm);
          expect(distance(arm[1], arm[2])).toBeCloseTo(SKELETON.forearm);
          expect(distance(arm[2], arm[3])).toBeCloseTo(SKELETON.hand);
        }
        for (const leg of [rightLeg, leftLeg]) {
          expect(distance(leg[0], leg[1])).toBeCloseTo(SKELETON.thigh);
          expect(distance(leg[1], leg[2])).toBeCloseTo(SKELETON.shin);
          expect(distance(leg[2], leg[3])).toBeCloseTo(SKELETON.foot);
        }
      }
    });

    it('keeps pinned hands and feet exactly where they are pinned', () => {
      samples(clip).forEach((pose, i) => {
        const skeleton = skeletons[i];
        if (pose.pins?.rightHand) expect(distance(skeleton.rightArm[2], pose.pins.rightHand.at)).toBeLessThan(0.01);
        if (pose.pins?.leftHand) expect(distance(skeleton.leftArm[2], pose.pins.leftHand.at)).toBeLessThan(0.01);
        if (pose.pins?.rightFoot) expect(distance(skeleton.rightLeg[2], pose.pins.rightFoot.at)).toBeLessThan(0.01);
        if (pose.pins?.leftFoot) expect(distance(skeleton.leftLeg[2], pose.pins.leftFoot.at)).toBeLessThan(0.01);
      });
    });

    it('draws as many parts as the figure component makes room for', () => {
      // `exercise-figure-3d.tsx` sets up one shape for each of the six parts of the body, and one more
      // for each hand a clip draws on its own and each thumb. A part beyond that would never be drawn.
      const view = viewOf(clip.camera);
      const pins = clip.keyframes[0].pose.pins;
      const thumbs = (pins?.rightHand?.palm ? 1 : 0) + (pins?.leftHand?.palm ? 1 : 0);
      const expected = 6 + (clip.holds?.length ?? 0) + (clip.handsOnBody?.length ?? 0) + thumbs;
      for (let t = 0; t <= durationOf(clip); t += 100) {
        const { slots } = frameAt(clip, view, t);
        expect(slots).toHaveLength(expected);
        // Only a hand with a thumb has fingers drawn on it.
        if (!thumbs) for (const slot of slots) expect(slot.fingers).toBe('');
      }
    });

    it('keeps every joint above the floor', () => {
      for (const skeleton of skeletons) {
        for (const joint of joints(skeleton)) expect(joint[1]).toBeGreaterThanOrEqual(8);
      }
    });

    it('ends on the pose it starts on, so it loops', () => {
      const first = joints(skeletons[0]);
      const last = joints(solvePose(poseAt3(clip, durationOf(clip))));
      first.forEach((joint, i) => expect(distance(joint, last[i])).toBeCloseTo(0));
    });

    it('has a still frame to hold', () => {
      expect(clip.keyframes[clip.stillFrame]).toBeDefined();
    });

    it('frames everything it shows, at 16:9', () => {
      const stage = stageClip(clip);
      const [x, y, width, height] = stage.viewBox.split(' ').map(Number);
      expect(width / height).toBeCloseTo(16 / 9, 1);
      for (const skeleton of skeletons) {
        for (const joint of framedJoints(skeleton, clip.camera.fit)) {
          const [sx, sy] = project(stage.view, joint);
          expect(sx).toBeGreaterThan(x + SKELETON.head);
          expect(sx).toBeLessThan(x + width - SKELETON.head);
          expect(sy).toBeGreaterThan(y + SKELETON.head);
          expect(sy).toBeLessThan(y + height - SKELETON.head);
        }
      }
    });
  });

  it('keeps the knees on the floor under the hips through cat cow', () => {
    for (const { rightLeg, leftLeg } of samples(CAT_COW_3D).map(solvePose)) {
      for (const leg of [rightLeg, leftLeg]) {
        expect(leg[1][1]).toBeGreaterThan(10);
        expect(leg[1][1]).toBeLessThan(16);
        expect(Math.abs(leg[1][0] - leg[0][0])).toBeLessThan(3);
      }
    }
  });

  it('keeps the head behind the near arm as it drops between the arms in cat cow', () => {
    const view = viewOf(CAT_COW_3D.camera);
    for (const pose of samples(CAT_COW_3D)) {
      const order = traceFigure(solvePose(pose), view).slots.map((slot) => slot.part);
      expect(order.indexOf('head')).toBeLessThan(order.indexOf('rightArm'));
    }
  });

  it('rounds the back up for the cat and drops it for the cow', () => {
    const middle = (pose: Pose3) => solvePose(pose).spine[3][1];
    const [cow, cat] = [CAT_COW_3D.keyframes[0].pose, CAT_COW_3D.keyframes[1].pose];
    expect(middle(cat)).toBeGreaterThan(middle(cow) + 20);
  });

  it('keeps the elbow at the side and the forearm level through shoulder external rotation', () => {
    const skeletons = samples(SHOULDER_EXTERNAL_ROTATION_3D).map(solvePose);
    for (const { rightArm } of skeletons) {
      expect(distance(rightArm[1], skeletons[0].rightArm[1])).toBeCloseTo(0);
      expect(rightArm[2][1]).toBeCloseTo(rightArm[1][1]);
    }
    // It starts pointing straight ahead and swings out to the figure's right.
    const start = skeletons[0].rightArm;
    expect(start[2][2]).toBeCloseTo(start[1][2]);
    const widest = Math.max(...skeletons.map(({ rightArm }) => rightArm[2][2] - rightArm[1][2]));
    expect(widest).toBeCloseTo(SKELETON.forearm * Math.sin((65 * Math.PI) / 180));
  });

  it('raises a straight arm out to the side and on overhead in shoulder abduction', () => {
    const skeletons = samples(SHOULDER_ABDUCTION_3D).map(solvePose);
    for (const { rightArm } of skeletons) {
      expect(angleAt(rightArm[0], rightArm[1], rightArm[2])).toBeCloseTo(180);
      // Out to the side, never forward or back.
      expect(rightArm[2][0]).toBeCloseTo(rightArm[0][0]);
    }
    const highest = Math.max(...skeletons.map(({ rightArm }) => fromHanging(rightArm[0], rightArm[2])));
    expect(highest).toBeCloseTo(160);
    // The moving arm stays over the torso and the still one behind its shoulder, without flipping
    // partway up.
    const view = viewOf(SHOULDER_ABDUCTION_3D.camera);
    for (const skeleton of skeletons) {
      const order = traceFigure(skeleton, view).slots.map((slot) => slot.part);
      expect(order.indexOf('rightArm')).toBeGreaterThan(order.indexOf('torso'));
      expect(order.indexOf('leftArm')).toBeLessThan(order.indexOf('torso'));
    }
  });

  it('lowers a straight arm from the ceiling to overhead, back flat on the floor, in overhead reach', () => {
    const skeletons = samples(OVERHEAD_REACH_3D).map(solvePose);
    // The arm away from the camera, so the phone's screen, facing in toward the body, faces it.
    expect(OVERHEAD_REACH_3D.highlight).toEqual(['leftArm']);
    expect(OVERHEAD_REACH_3D.phone).toMatchObject({ limb: 'leftArm', face: 'inside' });
    for (const { leftArm, spine } of skeletons) {
      expect(angleAt(leftArm[0], leftArm[1], leftArm[2])).toBeCloseTo(180);
      // Straight overhead, never out to the side.
      expect(leftArm[2][2]).toBeCloseTo(leftArm[0][2]);
      for (const point of spine) expect(point[1]).toBeCloseTo(spine[0][1]);
    }
    // Measured from the arm by the side, which lying down points at the feet.
    const shoulderAngle = ({ leftArm }: Skeleton) => angleAt([leftArm[0][0] + 1, leftArm[0][1], leftArm[0][2]], leftArm[0], leftArm[2]);
    expect(shoulderAngle(skeletons[0])).toBeCloseTo(90);
    expect(Math.max(...skeletons.map(shoulderAngle))).toBeCloseTo(165);
    // The head lies beyond the shoulders, away from the camera, and still goes over the neck.
    const view = viewOf(OVERHEAD_REACH_3D.camera);
    for (const skeleton of skeletons) {
      const order = traceFigure(skeleton, view).slots.map((slot) => slot.part);
      expect(order.indexOf('head')).toBeGreaterThan(order.indexOf('torso'));
    }
  });

  it('slides a straight leg out along the floor in hip abduction', () => {
    const skeletons = samples(HIP_ABDUCTION_3D).map(solvePose);
    for (const { rightLeg } of skeletons) {
      expect(angleAt(rightLeg[0], rightLeg[1], rightLeg[2])).toBeCloseTo(180);
      expect(rightLeg[2][1]).toBeCloseTo(rightLeg[0][1]);
    }
    const widest = Math.max(
      ...skeletons.map(({ rightLeg }) => (Math.atan2(rightLeg[2][2] - rightLeg[0][2], rightLeg[2][0] - rightLeg[0][0]) * 180) / Math.PI)
    );
    expect(widest).toBeCloseTo(40);
  });

  it('brings the front knee to the wall with the heel down in knee to wall', () => {
    const wall = KNEE_TO_WALL_3D.scenery![0].from[0];
    const skeletons = samples(KNEE_TO_WALL_3D).map(solvePose);
    for (const { rightLeg, leftLeg, rightArm, leftArm } of skeletons) {
      // The front foot stays flat, pointing at the wall, with the toes short of it.
      expect(rightLeg[2][1]).toBeCloseTo(13);
      expect(rightLeg[3][1]).toBeCloseTo(13);
      expect(rightLeg[3][0]).toBeLessThan(wall - 20);
      // Nothing goes into the wall: the knee is 12.5 thick in front of its joint.
      expect(rightLeg[1][0]).toBeLessThanOrEqual(wall - 12.5 + 0.01);
      for (const joint of [...rightArm, ...leftArm]) expect(joint[0]).toBeLessThan(wall);
      // The back leg stays within reach of its foot rather than snapping straight.
      expect(angleAt(leftLeg[0], leftLeg[1], leftLeg[2])).toBeLessThan(179);
    }
    const nearest = Math.max(...skeletons.map(({ rightLeg }) => rightLeg[1][0]));
    expect(nearest).toBeCloseTo(wall - 12.5);
    expect(skeletons[0].rightLeg[1][0]).toBeLessThan(wall - 40);
  });

  it.each([
    ['external', HIP_EXTERNAL_ROTATION_3D, -1],
    ['internal', HIP_INTERNAL_ROTATION_3D, 1],
  ] as const)('swings the shin under a still, level thigh in seated hip %s rotation', (_, clip, direction) => {
    const skeletons = samples(clip).map(solvePose);
    const table = clip.scenery![0];
    for (const { rightLeg, spine } of skeletons) {
      expect(distance(rightLeg[1], skeletons[0].rightLeg[1])).toBeCloseTo(0);
      expect(rightLeg[1][1]).toBeCloseTo(rightLeg[0][1]);
      expect(angleAt(rightLeg[0], rightLeg[1], rightLeg[2])).toBeCloseTo(90);
      // Sitting on the table, with the knees past its edge so the shins hang free.
      expect(spine[0][1]).toBeGreaterThan(table.to[1]);
      expect(rightLeg[1][0]).toBeGreaterThan(table.to[0]);
    }
    // It starts hanging straight down. External rotation swings the foot in toward the other leg
    // (the figure's left, -z); internal swings it out.
    expect(fromHanging(skeletons[0].rightLeg[1], skeletons[0].rightLeg[2])).toBeCloseTo(0);
    const furthest = skeletons.reduce((a, b) => (fromHanging(b.rightLeg[1], b.rightLeg[2]) > fromHanging(a.rightLeg[1], a.rightLeg[2]) ? b : a));
    expect(fromHanging(furthest.rightLeg[1], furthest.rightLeg[2])).toBeCloseTo(42);
    expect(Math.sign(furthest.rightLeg[2][2] - furthest.rightLeg[1][2])).toBe(direction);
  });

  it('reaches along the top of the box with straight legs and the soles against it in sit and reach', () => {
    const box = SIT_AND_REACH_3D.scenery![0];
    const skeletons = samples(SIT_AND_REACH_3D).map(solvePose);
    for (const { rightLeg, leftLeg, rightArm, leftArm } of skeletons) {
      for (const leg of [rightLeg, leftLeg]) {
        expect(angleAt(leg[0], leg[1], leg[2])).toBeCloseTo(180);
        expect(leg[2][1]).toBeCloseTo(13);
        // Toes straight up, with the heel (12.5 thick) on the side of the box.
        expect(leg[3][0]).toBeCloseTo(leg[2][0]);
        expect(leg[2][0] + 12.5).toBeCloseTo(box.from[0], 0);
      }
      // The hands never dip into the box.
      for (const arm of [rightArm, leftArm]) if (arm[3][0] > box.from[0]) expect(arm[3][1]).toBeGreaterThan(box.to[1]);
    }
    const furthest = Math.max(...skeletons.map(({ rightArm }) => rightArm[3][0]));
    expect(furthest).toBeGreaterThan(box.from[0]);
    expect(furthest).toBeLessThan(box.from[0] + 30);
    expect(skeletons[0].rightArm[3][0]).toBeLessThan(box.from[0] - 40);
  });

  it('pulls one knee to the chest while the other leg stays flat in knee to chest', () => {
    const skeletons = samples(KNEE_TO_CHEST_3D).map(solvePose);
    for (const { leftLeg, spine } of skeletons) {
      expect(angleAt(leftLeg[0], leftLeg[1], leftLeg[2])).toBeCloseTo(180);
      expect(leftLeg[2][1]).toBeLessThan(14);
      for (const point of spine) expect(point[1]).toBeCloseTo(spine[0][1]);
    }
    // The thigh's angle from the floor, measured from lying flat toward the feet.
    const thigh = ({ rightLeg }: Skeleton) => angleAt([rightLeg[0][0] + 1, rightLeg[0][1], rightLeg[0][2]], rightLeg[0], rightLeg[1]);
    expect(thigh(skeletons[0])).toBeLessThan(3);
    expect(Math.max(...skeletons.map(thigh))).toBeCloseTo(130);
    // The near arm is drawn over the leg it holds all the way through, and never moves through the
    // thigh on the way to the knee.
    const view = viewOf(KNEE_TO_CHEST_3D.camera);
    for (const skeleton of skeletons) {
      const order = traceFigure(skeleton, view).slots.map((slot) => slot.part);
      expect(order.indexOf('rightArm')).toBeGreaterThan(order.indexOf('rightLeg'));
    }
    // At the top both hands are on the shin, just below the knee.
    const held = solvePose(KNEE_TO_CHEST_3D.keyframes[KNEE_TO_CHEST_3D.stillFrame].pose);
    for (const arm of [held.rightArm, held.leftArm]) {
      expect(distance(arm[2], held.rightLeg[1])).toBeLessThan(40);
    }
  });

  it('raises a straight leg on a strap that keeps its length in straight leg raise', () => {
    const skeletons = samples(STRAIGHT_LEG_RAISE_3D).map(solvePose);
    for (const { rightLeg, leftLeg } of skeletons) {
      for (const leg of [rightLeg, leftLeg]) expect(angleAt(leg[0], leg[1], leg[2])).toBeCloseTo(180);
      expect(leftLeg[2][1]).toBeLessThan(14);
      // Straight up, not out to the side.
      expect(rightLeg[2][2]).toBeCloseTo(rightLeg[0][2]);
    }
    const raised = ({ rightLeg }: Skeleton) => (Math.atan2(rightLeg[2][1] - rightLeg[0][1], rightLeg[2][0] - rightLeg[0][0]) * 180) / Math.PI;
    expect(raised(skeletons[0])).toBeLessThan(0);
    expect(Math.max(...skeletons.map(raised))).toBeCloseTo(72 - 2.6);
    // From each hand to its side of the foot, at the bottom and at the top.
    const lengths = [0, STRAIGHT_LEG_RAISE_3D.stillFrame].map((frame) => {
      const [rightHand, rightSide, leftSide, leftHand] = strapPoints(solvePose(STRAIGHT_LEG_RAISE_3D.keyframes[frame].pose), 'rightFoot');
      return [distance(rightHand, rightSide), distance(leftHand, leftSide)];
    });
    expect(Math.abs(lengths[0][0] - lengths[1][0])).toBeLessThan(3);
    expect(Math.abs(lengths[0][1] - lengths[1][1])).toBeLessThan(3);
  });

  it('lifts a straight leg by itself in active straight leg raise, the rest of the body still on the floor', () => {
    const skeletons = samples(ACTIVE_STRAIGHT_LEG_RAISE_3D).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg, rightArm, leftArm, spine } of skeletons) {
      for (const leg of [rightLeg, leftLeg]) expect(angleAt(leg[0], leg[1], leg[2])).toBeCloseTo(180);
      expect(leftLeg[2][1]).toBeLessThan(14);
      // Straight up, not out to the side.
      expect(rightLeg[2][2]).toBeCloseTo(rightLeg[0][2]);
      // No help from the hands: they stay on the floor by the sides, and the back stays flat.
      expect(distance(rightArm[2], start.rightArm[2])).toBeCloseTo(0);
      expect(distance(leftArm[2], start.leftArm[2])).toBeCloseTo(0);
      for (const point of spine) expect(point[1]).toBeCloseTo(spine[0][1]);
    }
    const raised = ({ rightLeg }: Skeleton) => (Math.atan2(rightLeg[2][1] - rightLeg[0][1], rightLeg[2][0] - rightLeg[0][0]) * 180) / Math.PI;
    expect(raised(start)).toBeLessThan(0);
    expect(Math.max(...skeletons.map(raised))).toBeCloseTo(65 - 2.6);
    expect(ACTIVE_STRAIGHT_LEG_RAISE_3D.strap).toBeUndefined();
    // It comes down slower than it goes up.
    const [, , up, , down] = ACTIVE_STRAIGHT_LEG_RAISE_3D.keyframes;
    expect(down.ms).toBeGreaterThan(up.ms);
  });

  it('drives the front knee over the toes with the heel down and the back knee on the floor in ankle mobilization', () => {
    const skeletons = samples(ANKLE_MOBILIZATION_3D).map(solvePose);
    const start = skeletons[0];
    // How far the front shin tips forward of upright.
    const shin = ({ rightLeg }: Skeleton) => (Math.atan2(rightLeg[1][0] - rightLeg[2][0], rightLeg[1][1] - rightLeg[2][1]) * 180) / Math.PI;
    for (const skeleton of skeletons) {
      const { rightLeg, leftLeg } = skeleton;
      // The front foot stays flat where it is, heel down.
      expect(distance(rightLeg[2], start.rightLeg[2])).toBeCloseTo(0);
      expect(rightLeg[3][1]).toBeCloseTo(rightLeg[2][1]);
      // The back knee stays put on the floor, the shin flat behind it.
      expect(distance(leftLeg[1], start.leftLeg[1])).toBeLessThan(1);
      expect(leftLeg[1][1]).toBeLessThan(14);
      expect(leftLeg[2][1]).toBeLessThan(14);
      // The knee tracks over the foot, not in or out.
      expect(rightLeg[1][2]).toBeCloseTo(rightLeg[2][2], 0);
    }
    expect(shin(start)).toBeCloseTo(5, 0);
    expect(Math.max(...skeletons.map(shin))).toBeCloseTo(40, 0);
    // At the bottom the knee is past the toes.
    const forward = solvePose(ANKLE_MOBILIZATION_3D.keyframes[ANKLE_MOBILIZATION_3D.stillFrame].pose);
    expect(forward.rightLeg[1][0]).toBeGreaterThan(forward.rightLeg[3][0]);
  });

  it('lifts straight arms away from the back with the hands linked in behind the back chest opener', () => {
    const skeletons = samples(BEHIND_THE_BACK_CHEST_OPENER_3D).map(solvePose);
    // How far an arm is lifted back from hanging.
    const lifted = ({ rightArm }: Skeleton) => (Math.atan2(rightArm[0][0] - rightArm[2][0], rightArm[0][1] - rightArm[2][1]) * 180) / Math.PI;
    for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
      // Linked: the wrists stay together behind the middle of the back.
      expect(distance(rightArm[2], leftArm[2])).toBeLessThan(10);
      expect(rightArm[2][0]).toBeLessThan(0);
      for (const arm of [rightArm, leftArm]) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(170);
      // Standing tall throughout.
      for (const leg of [rightLeg, leftLeg]) expect(angleAt(leg[0], leg[1], leg[2])).toBeCloseTo(180);
    }
    expect(lifted(skeletons[0])).toBeLessThan(15);
    expect(Math.max(...skeletons.map(lifted))).toBeGreaterThan(45);
    expect(Math.max(...skeletons.map(lifted))).toBeLessThan(55);
  });

  it('swings the foot out on a strap in one hand, the knee held over the hip at 90°, in back lying reverse pigeon', () => {
    const clip = BACK_LYING_REVERSE_PIGEON_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg } of skeletons) {
      // The knee stays over the hip, bent to 90° with the shin level.
      expect(distance(rightLeg[1], start.rightLeg[1])).toBeCloseTo(0);
      expect(rightLeg[1][0]).toBeCloseTo(rightLeg[0][0]);
      expect(rightLeg[1][2]).toBeCloseTo(rightLeg[0][2]);
      expect(angleAt(rightLeg[0], rightLeg[1], rightLeg[2])).toBeCloseTo(90);
      expect(rightLeg[2][1]).toBeCloseTo(rightLeg[1][1]);
      // The other leg stays flat on the floor.
      expect(angleAt(leftLeg[0], leftLeg[1], leftLeg[2])).toBeCloseTo(180);
      expect(leftLeg[2][1]).toBeLessThan(14);
    }
    // How far the shin has swung out to the figure's right from pointing down the body.
    const out = ({ rightLeg }: Skeleton) => (Math.atan2(rightLeg[2][2] - rightLeg[1][2], rightLeg[2][0] - rightLeg[1][0]) * 180) / Math.PI;
    expect(out(start)).toBeCloseTo(0);
    expect(Math.max(...skeletons.map(out))).toBeCloseTo(42);
    // Both ends of the strap are in the right hand, and it keeps its length all the way.
    for (const skeleton of skeletons) {
      const loop = strapPoints(skeleton, clip.strap!);
      const [rightEnd, leftEnd] = [loop[0], loop[loop.length - 1]];
      const around = loop.slice(1, -1);
      expect(distance(rightEnd, leftEnd)).toBeCloseTo(0);
      expect(distance(rightEnd, midpoint(skeleton.rightArm[2], skeleton.rightArm[3]))).toBeCloseTo(0);
      const middle = midpoint(around[0], around[around.length - 1]);
      expect(Math.abs(distance(rightEnd, middle) - 170)).toBeLessThan(3);
      // It goes around the side of the foot away from the hand, so it has something to pull on,
      // in a half circle that stands clear of the foot: further from its middle than the foot is
      // wide, all the way around.
      const footLine = unitBetween(skeleton.rightLeg[2], skeleton.rightLeg[3]);
      for (const point of around) {
        expect(distance(rightEnd, point)).toBeGreaterThanOrEqual(distance(rightEnd, around[0]) - 0.5);
        const off: Vec3 = [point[0] - middle[0], point[1] - middle[1], point[2] - middle[2]];
        expect(off[0] * footLine[0] + off[1] * footLine[1] + off[2] * footLine[2]).toBeCloseTo(0);
        expect(Math.hypot(...off)).toBeGreaterThan(16);
      }
      // The hand is further out to the side than the foot it pulls.
      expect(rightEnd[2]).toBeGreaterThan(skeleton.rightLeg[2][2]);
    }
  });

  it('lets both feet fall out to the sides with the knees down at 90° in belly down foot splay', () => {
    const skeletons = samples(BELLY_DOWN_FOOT_SPLAY_3D).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg, spine } of skeletons) {
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        // The knees stay where they are on the floor, bent to 90°.
        expect(distance(leg[1], first[1])).toBeCloseTo(0);
        expect(leg[1][1]).toBeLessThan(14);
        expect(angleAt(leg[0], leg[1], leg[2])).toBeCloseTo(90);
      }
      // A little apart, with room for a pillow, and the two sides mirror each other.
      expect(rightLeg[1][2] - leftLeg[1][2]).toBeGreaterThan(2 * SKELETON.hip);
      expect(rightLeg[1][2] - leftLeg[1][2]).toBeLessThan(3 * SKELETON.hip);
      expect(leftLeg[2][2]).toBeCloseTo(-rightLeg[2][2]);
      expect(leftLeg[2][1]).toBeCloseTo(rightLeg[2][1]);
      // Lying flat.
      for (const point of spine) expect(point[1]).toBeCloseTo(spine[0][1]);
    }
    // The feet start over the knees and end well apart, lower than they started.
    const apart = ({ rightLeg, leftLeg }: Skeleton) => rightLeg[2][2] - leftLeg[2][2];
    const fallen = solvePose(BELLY_DOWN_FOOT_SPLAY_3D.keyframes[BELLY_DOWN_FOOT_SPLAY_3D.stillFrame].pose);
    expect(apart(start)).toBeCloseTo(start.rightLeg[1][2] - start.leftLeg[1][2]);
    expect(apart(fallen)).toBeGreaterThan(apart(start) + 2 * SKELETON.shin * Math.sin((40 * Math.PI) / 180));
    expect(fallen.rightLeg[2][1]).toBeLessThan(start.rightLeg[2][1] - 20);
  });

  it('sweeps both arms, held off the floor, from the hands on the lower back to straight overhead in blackburn', () => {
    const skeletons = samples(BLACKBURN_3D).map(solvePose);
    /** How far round from pointing down by the side an arm is, seen from above: negative is in over the back. */
    const swept = (arm: Vec3[]) => (Math.atan2((arm[2][2] - arm[0][2]) * Math.sign(arm[0][2]), arm[0][0] - arm[2][0]) * 180) / Math.PI;
    for (const { rightArm, leftArm, spine } of skeletons) {
      for (const arm of [rightArm, leftArm]) {
        // Held up off the floor the whole way, higher at the hand than the shoulder, and straight
        // from out at the sides on.
        expect(arm[2][1]).toBeGreaterThan(arm[0][1] + 20);
        if (swept(arm) >= 75) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(170);
      }
      // Both arms move together, mirroring each other.
      rightArm.forEach((joint, i) => expect(distance(joint, [leftArm[i][0], leftArm[i][1], -leftArm[i][2]])).toBeCloseTo(0));
      // Lying flat.
      for (const point of spine) expect(point[1]).toBeCloseTo(spine[0][1]);
    }
    // It starts and ends with the hands resting on the lower back, elbows bent and out to the sides.
    for (const { rightArm, leftArm, spine } of [skeletons[0], skeletons[skeletons.length - 1]]) {
      for (const arm of [rightArm, leftArm]) {
        expect(arm[2][0]).toBeGreaterThan(spine[0][0]);
        expect(arm[2][0]).toBeLessThan(spine[0][0] + SKELETON.torso / 3);
        expect(Math.abs(arm[2][2])).toBeLessThan(25);
        expect(arm[2][1]).toBeGreaterThan(spine[0][1] + 20);
        expect(angleAt(arm[0], arm[1], arm[2])).toBeLessThan(120);
        expect(Math.abs(arm[1][2])).toBeGreaterThan(Math.abs(arm[0][2]));
      }
    }
    // Out to the sides partway, then on to overhead.
    const sweeps = skeletons.map(({ rightArm }) => swept(rightArm));
    expect(Math.min(...sweeps)).toBeLessThan(0);
    expect(Math.max(...sweeps)).toBeGreaterThan(160);
    expect(swept(solvePose(BLACKBURN_3D.keyframes[BLACKBURN_3D.stillFrame].pose).rightArm)).toBeGreaterThan(75);
    expect(swept(solvePose(BLACKBURN_3D.keyframes[BLACKBURN_3D.stillFrame].pose).rightArm)).toBeLessThan(95);
    // Nothing ever changes places. The far arm stays behind the body, its shoulder end under the
    // shoulder blade, with its forearm and hand drawn again over the back, over the legs and under
    // the near arm; the near arm is over everything.
    expect(new Set(drawOrders(BLACKBURN_3D))).toEqual(new Set(['leftLeg leftArm torso head rightLeg leftArm hand rightArm']));
    // Overhead, the hands are either side of the head, clear of it.
    const up = skeletons[sweeps.indexOf(Math.max(...sweeps))];
    expect(up.rightArm[2][0]).toBeGreaterThan(up.head[0]);
    expect(up.rightArm[2][2] - up.head[2]).toBeGreaterThan(SKELETON.head + 10);
  });

  it('lowers the knees out toward the floor with the soles together, then leans the chest in, in butterfly', () => {
    const clip = BUTTERFLY_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg, rightArm, leftArm, spine, head } of skeletons) {
      for (const [leg, arm, first] of [[rightLeg, rightArm, start.rightLeg], [leftLeg, leftArm, start.leftLeg]] as const) {
        // The feet stay where they are, pulled in in front of the hips with the soles together.
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
        expect(leg[2][0]).toBeGreaterThan(spine[0][0] + 40);
        expect(leg[2][0]).toBeLessThan(spine[0][0] + SKELETON.thigh);
        // The knee is out to its own side, wider than the hips, and the hand holds the ankle.
        expect(Math.abs(leg[1][2])).toBeGreaterThan(SKELETON.thigh * 0.8);
        expect(distance(arm[2], leg[2])).toBeLessThan(25);
      }
      expect(rightLeg[2][2] - leftLeg[2][2]).toBeLessThan(2 * 12.5);
      // Sitting on the floor the whole time, the two sides mirroring each other.
      expect(spine[0][1]).toBeCloseTo(start.spine[0][1]);
      rightLeg.forEach((joint, i) => expect(distance(joint, [leftLeg[i][0], leftLeg[i][1], -leftLeg[i][2]])).toBeCloseTo(0));
      // The face looks ahead rather than down at the floor.
      expect(head[1]).toBeGreaterThan(start.spine[0][1] + SKELETON.torso);
    }
    const tall = solvePose(clip.keyframes[clip.stillFrame].pose);
    const leaning = skeletons.reduce((most, skeleton) => (skeleton.spine[6][0] > most.spine[6][0] ? skeleton : most));
    // The knees start raised and relax toward the floor, without reaching it.
    expect(start.rightLeg[1][1]).toBeGreaterThan(70);
    expect(tall.rightLeg[1][1]).toBeLessThan(45);
    expect(tall.rightLeg[1][1]).toBeGreaterThan(25);
    // Then the chest leans in a little from sitting tall, the back long rather than slumped.
    expect(tipped(tall.spine[0], tall.spine[6])).toBeLessThan(15);
    expect(tipped(leaning.spine[0], leaning.spine[6])).toBeGreaterThan(10);
    expect(tipped(leaning.spine[0], leaning.spine[6])).toBeLessThan(25);
    expect(leaning.rightLeg[1][1]).toBeCloseTo(tall.rightLeg[1][1]);
    // Nothing ever changes places, the arms in front of the legs, and the nose shows all the way.
    expect(new Set(drawOrders(clip))).toEqual(new Set(['torso leftLeg rightLeg leftArm rightArm head']));
    const view = viewOf(clip.camera);
    for (let t = 0; t <= durationOf(clip); t += 10) {
      expect(frameAt(clip, view, t).slots.find((slot) => slot.part === 'head')!.d.split('Z').length).toBeGreaterThan(2);
    }
  });

  it('pushes the hips back from cobra through all fours onto the heels, hands, knees and feet planted, in cobra to prayer', () => {
    const clip = COBRA_TO_PRAYER_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg, rightArm, leftArm, head } of skeletons) {
      // Hands, knees and feet stay where they are: the knees down on the floor, the shins flat behind them.
      for (const [arm, first] of [[rightArm, start.rightArm], [leftArm, start.leftArm]] as const) expect(distance(arm[2], first[2])).toBeCloseTo(0);
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[1], first[1])).toBeLessThan(0.5);
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
        expect(leg[1][1]).toBeCloseTo(leg[2][1], 0);
        expect(leg[1][0] - leg[2][0]).toBeCloseTo(SKELETON.shin, 0);
      }
      // The arms never more than a little bent.
      for (const arm of [rightArm, leftArm]) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(150);
      // The head never goes into the floor.
      expect(head[1]).toBeGreaterThanOrEqual(SKELETON.head);
    }
    // Cobra: the hips low in front of the knees, the chest up and the arms straight.
    expect(start.spine[0][0]).toBeGreaterThan(SKELETON.thigh * 0.9);
    expect(start.spine[0][1]).toBeLessThan(55);
    expect(start.spine[6][1]).toBeGreaterThan(140);
    expect(angleAt(start.rightArm[0], start.rightArm[1], start.rightArm[2])).toBeGreaterThan(165);
    // On the way, all fours: the hips up over the knees.
    const over = skeletons.reduce((best, skeleton) => (Math.abs(skeleton.spine[0][0]) < Math.abs(best.spine[0][0]) ? skeleton : best));
    expect(Math.abs(over.spine[0][0])).toBeLessThan(10);
    expect(over.spine[0][1]).toBeGreaterThan(105);
    // Prayer: sitting back on the heels, the arms reaching long and the forehead down on the floor.
    const prayer = skeletons.reduce((best, skeleton) => (skeleton.spine[0][0] < best.spine[0][0] ? skeleton : best));
    expect(Math.abs(prayer.spine[0][0] - prayer.rightLeg[2][0])).toBeLessThan(15);
    expect(prayer.spine[0][1]).toBeLessThan(65);
    expect(angleAt(prayer.rightArm[0], prayer.rightArm[1], prayer.rightArm[2])).toBeGreaterThan(160);
    expect(prayer.head[1]).toBeLessThan(SKELETON.head + 5);
    // From all fours the head comes down steadily, and only touches the floor once the hips have
    // settled on the heels, so the body never carries on down under a head that has stopped.
    // Prayer is the keyframe the hold starts from, after the hold in cobra.
    const prayerAt = clip.keyframes.findIndex((frame, i) => i > 1 && clip.keyframes[i + 1]?.pose === frame.pose);
    const timeOf = (index: number) => clip.keyframes.slice(1, index + 1).reduce((total, frame) => total + frame.ms, 0);
    const [allFours, settled] = [(timeOf(1) + timeOf(prayerAt)) / 2, timeOf(prayerAt)];
    const heights: number[] = [];
    for (let t = allFours; t <= settled; t += 10) heights.push(solvePose(poseAt3(clip, t)).head[1]);
    heights.slice(1).forEach((height, i) => expect(height).toBeLessThanOrEqual(heights[i] + 1e-6));
    heights.slice(0, -5).forEach((height) => expect(height).toBeGreaterThan(SKELETON.head + 2.01));
    // Nothing ever changes places: the head drops behind the near arm.
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm']));
  });

  it('lifts the hips up and back off the knees into a V, then sinks the heels, in downward facing dog', () => {
    const clip = DOWNWARD_FACING_DOG_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
      // The hands stay planted, and the toes stay tucked under on the floor where they started.
      for (const [arm, first] of [[rightArm, start.rightArm], [leftArm, start.leftArm]] as const) expect(distance(arm[2], first[2])).toBeCloseTo(0);
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[3], first[3])).toBeLessThan(1);
        // The foot points toward the hands, the heel behind the toes.
        expect(leg[3][0]).toBeGreaterThan(leg[2][0]);
      }
    }
    // On hands and knees to start: the knees on the floor under the hips.
    for (const leg of [start.rightLeg, start.leftLeg]) {
      expect(leg[1][1]).toBeCloseTo(13, 0);
      expect(Math.abs(leg[1][0] - start.spine[0][0])).toBeLessThan(1);
    }
    // The V: the hips the highest point, the legs and arms straight, the arms nearly in line with the
    // back, and the legs and body meeting at the hips in an upside-down V.
    const dog = solvePose(clip.keyframes[clip.stillFrame].pose);
    const [pelvis, neckBase] = [dog.spine[0], dog.spine[6]];
    for (const point of [neckBase, dog.head, ...dog.rightArm, ...dog.rightLeg.slice(1)]) expect(point[1]).toBeLessThan(pelvis[1]);
    for (const leg of [dog.rightLeg, dog.leftLeg]) expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(170);
    for (const arm of [dog.rightArm, dog.leftArm]) {
      expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(170);
      expect(angleAt(pelvis, neckBase, [neckBase[0] + arm[2][0] - arm[0][0], neckBase[1] + arm[2][1] - arm[0][1], neckBase[2]])).toBeGreaterThan(165);
    }
    const hips = angleAt(dog.rightLeg[2], dog.rightLeg[0], [neckBase[0], neckBase[1], dog.rightLeg[0][2]]);
    expect(hips).toBeGreaterThan(55);
    expect(hips).toBeLessThan(75);
    // The heels lower all the way up into the V, in one movement with the hips rather than after
    // them, and end just off the floor.
    const timeOf = (index: number) => clip.keyframes.slice(1, index + 1).reduce((total, frame) => total + frame.ms, 0);
    const heels: number[] = [];
    for (let t = timeOf(1); t <= timeOf(clip.stillFrame); t += 10) heels.push(solvePose(poseAt3(clip, t)).rightLeg[2][1]);
    heels.slice(1).forEach((height, i) => expect(height).toBeLessThanOrEqual(heels[i] + 1e-6));
    const halfway = heels[Math.floor(heels.length / 2)];
    expect(heels[0] - halfway).toBeGreaterThan(0.3 * (heels[0] - heels[heels.length - 1]));
    expect(dog.rightLeg[2][1]).toBeLessThan(20);
    // The head eases out of the V and into it with the hips, rather than snapping: in the first and
    // last 50ms of the way down it moves well under its top speed.
    const headSpeeds: number[] = [];
    const down = timeOf(clip.stillFrame + 1);
    for (let t = down; t < durationOf(clip); t += 50) {
      headSpeeds.push(distance(solvePose(poseAt3(clip, t)).head, solvePose(poseAt3(clip, Math.min(t + 50, durationOf(clip)))).head));
    }
    const top = Math.max(...headSpeeds);
    expect(headSpeeds[0]).toBeLessThan(0.45 * top);
    expect(headSpeeds[headSpeeds.length - 1]).toBeLessThan(0.45 * top);
    // Nothing ever changes places: the head hangs between the arms, behind the near one, and the
    // face, seen from the side, never shows a nose.
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm']));
    const view = viewOf(clip.camera);
    const headParts = new Set<number>();
    for (let t = 0; t <= durationOf(clip); t += 10) headParts.add(frameAt(clip, view, t).slots.find((slot) => slot.part === 'head')!.d.split('Z').length);
    expect(headParts.size).toBe(1);
  });

  it('comes down out of the V through a plank into cobra, rolling over the toes, hands and toes planted, in downward facing dog to cobra', () => {
    const clip = DOWNWARD_FACING_DOG_TO_COBRA_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
      // The hands stay planted, and the tips of the feet stay on the floor where they started.
      for (const [arm, first] of [[rightArm, start.rightArm], [leftArm, start.leftArm]] as const) expect(distance(arm[2], first[2])).toBeCloseTo(0);
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[3], first[3])).toBeLessThan(1);
        // The legs stay straight, and the arms never more than a little bent.
        expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(170);
      }
      for (const arm of [rightArm, leftArm]) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(165);
    }
    // The V: the hips the highest point, the heels behind the toes, toward the floor.
    const [pelvis, neckBase] = [start.spine[0], start.spine[6]];
    for (const point of [neckBase, start.head, ...start.rightArm, ...start.rightLeg.slice(1)]) expect(point[1]).toBeLessThan(pelvis[1]);
    expect(start.rightLeg[3][0]).toBeGreaterThan(start.rightLeg[2][0]);
    expect(start.rightLeg[2][1]).toBeLessThan(30);
    // Halfway, the plank: the body in one line from the ankles to the neck, the heels up over the
    // tucked toes and the shoulders over the hands.
    const timeOf = (index: number) => clip.keyframes.slice(1, index + 1).reduce((total, frame) => total + frame.ms, 0);
    const plank = solvePose(poseAt3(clip, (timeOf(1) + timeOf(clip.stillFrame)) / 2));
    expect(angleAt(plank.rightLeg[2], plank.spine[0], plank.spine[6])).toBeGreaterThan(170);
    expect(plank.rightLeg[2][1]).toBeGreaterThan(40);
    expect(Math.abs(plank.rightArm[0][0] - plank.rightArm[2][0])).toBeLessThan(20);
    // Cobra: over onto the tops of the feet, the hips low, the chest up and the arms straight.
    const cobra = solvePose(clip.keyframes[clip.stillFrame].pose);
    for (const leg of [cobra.rightLeg, cobra.leftLeg]) {
      expect(leg[2][0]).toBeGreaterThan(leg[3][0] + 0.9 * SKELETON.foot);
      expect(leg[2][1]).toBeCloseTo(13, 0);
    }
    expect(cobra.spine[0][1]).toBeLessThan(55);
    expect(cobra.spine[6][1]).toBeGreaterThan(140);
    expect(angleAt(cobra.rightArm[0], cobra.rightArm[1], cobra.rightArm[2])).toBeGreaterThan(170);
    // The back arches in cobra, and is long in the V.
    expect(angleAt(cobra.spine[0], cobra.spine[3], cobra.spine[6])).toBeLessThan(160);
    expect(angleAt(start.spine[0], start.spine[3], start.spine[6])).toBeCloseTo(180, 0);
    // Nothing ever changes places, and the head, side on, never shows a nose.
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm']));
    const view = viewOf(clip.camera);
    for (let t = 0; t <= durationOf(clip); t += 10) expect(frameAt(clip, view, t).slots.find((slot) => slot.part === 'head')!.d.split('Z').length).toBe(2);
  });

  it('holds both hands up still while the fingers go straight, hook fist, full fist, flat fist, seen side on, in finger tendon glides', () => {
    const clip = FINGER_TENDON_GLIDES_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const skeleton of skeletons) {
      for (const [arm, first] of [[skeleton.rightArm, start.rightArm], [skeleton.leftArm, start.leftArm]] as const) {
        expect(distance(arm[2], first[2])).toBeCloseTo(0);
        // The forearm upright, the hand carrying on straight up from it.
        expect(tipped(arm[1], arm[2])).toBeLessThan(1);
        expect(tipped(arm[2], arm[3])).toBeLessThan(1);
      }
      expect(skeleton.rightFingers).toBeDefined();
      expect(skeleton.leftFingers).toBeDefined();
    }
    // The angle each finger joint makes, 180 straight: at the knuckles, the middle joint and the one nearest the tip.
    const bends = (pose: Pose3) => {
      const { rightArm, rightFingers } = solvePose(pose);
      const [knuckle, middle, end, tip] = rightFingers!.joints;
      return [angleAt(rightArm[2], knuckle, middle), angleAt(knuckle, middle, end), angleAt(middle, end, tip)].map(Math.round);
    };
    const shapes = clip.keyframes.map((frame) => bends(frame.pose).join(' '));
    // Straight, then the hook fist with the knuckles straight, the full fist, and the flat fist with
    // the knuckles at a right angle and the fingers straight, each held, and back to straight.
    expect([...new Set(shapes)]).toEqual(['180 180 180', '180 85 95', '95 85 110', '90 180 180']);
    // The fingers curl in toward the middle, the palms facing each other.
    const fist = solvePose(clip.keyframes[3].pose);
    expect(fist.rightFingers!.joints[2][2]).toBeLessThan(fist.rightArm[2][2]);
    expect(fist.leftFingers!.joints[2][2]).toBeGreaterThan(fist.leftArm[2][2]);
    // The camera looks along the knuckles, so the four fingers are one behind the other and every
    // bend is side on to it, and the curled fingers stay clear of the head.
    const view = viewOf(clip.camera);
    for (const skeleton of skeletons) {
      for (const [fingers, arm] of [[skeleton.rightFingers!, skeleton.rightArm], [skeleton.leftFingers!, skeleton.leftArm]] as const) {
        const knuckles = cross(unitBetween(arm[2], fingers.joints[0]), fingers.palm);
        expect(Math.abs(project(view, knuckles)[2])).toBeGreaterThan(0.95);
        for (const joint of fingers.joints) expect(onScreen(project(view, joint), project(view, skeleton.head))).toBeGreaterThan(SKELETON.head + 10);
      }
    }
    // Nothing ever changes places, and the face, turned to the camera, keeps its nose.
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg rightLeg torso head leftArm leftArm hand rightArm rightArm hand']));
    for (let t = 0; t <= durationOf(clip); t += 10) expect(frameAt(clip, view, t).slots.find((slot) => slot.part === 'head')!.d.split('Z').length).toBeGreaterThan(2);
  });

  it('sits back from all fours onto the heels, hands, knees and feet planted, forehead to the floor, in prayer pose', () => {
    const clip = PRAYER_POSE_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg, rightArm, leftArm, head } of skeletons) {
      for (const [arm, first] of [[rightArm, start.rightArm], [leftArm, start.leftArm]] as const) expect(distance(arm[2], first[2])).toBeCloseTo(0);
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[1], first[1])).toBeLessThan(0.5);
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
      }
      expect(head[1]).toBeGreaterThanOrEqual(SKELETON.head);
    }
    // All fours to start: the hips up over the knees.
    expect(Math.abs(start.spine[0][0])).toBeLessThan(10);
    expect(start.spine[0][1]).toBeGreaterThan(105);
    // The hold: on the heels, the arms long and the forehead on the floor.
    const prayer = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(Math.abs(prayer.spine[0][0] - prayer.rightLeg[2][0])).toBeLessThan(15);
    expect(prayer.spine[0][1]).toBeLessThan(65);
    for (const arm of [prayer.rightArm, prayer.leftArm]) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(160);
    expect(prayer.head[1]).toBeLessThan(SKELETON.head + 5);
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm']));
  });

  it('steps each hand forward once, the right reaching out as the chest sinks and the left following, the hips staying over the knees, in puppy pose', () => {
    const clip = PUPPY_POSE_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { spine, rightLeg, leftLeg, rightArm, leftArm, head } of skeletons) {
      // The knees and feet stay planted, and the hips stay up over the knees.
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[1], first[1])).toBeLessThan(0.5);
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
      }
      expect(distance(spine[0], start.spine[0])).toBeCloseTo(0);
      // Only one hand is ever off the floor.
      expect(Math.min(rightArm[2][1], leftArm[2][1])).toBeCloseTo(11);
      // Any bend takes the elbows out to the sides, as in a push-up, never in under the body or up
      // over the arm. The left one bends well while it waits under the sinking chest.
      for (const [arm, side] of [[rightArm, 1], [leftArm, -1]] as const) {
        expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(side === 1 ? 105 : 35);
        expect(side * (arm[1][2] - arm[0][2])).toBeGreaterThan(-0.5);
        expect(arm[1][1]).toBeLessThan(arm[0][1]);
      }
      expect(head[1]).toBeGreaterThanOrEqual(SKELETON.head);
    }
    // Each hand takes one step out and one back, never sliding along the floor; the right one goes
    // first and lands before the left one sets off.
    for (const arm of ['rightArm', 'leftArm'] as const) {
      let steps = 0;
      let previous = solvePose(poseAt3(clip, 0))[arm][2];
      for (let t = 10; t <= durationOf(clip); t += 10) {
        const wrist = solvePose(poseAt3(clip, t))[arm][2];
        if (wrist[1] < 11.5 && previous[1] < 11.5) expect(Math.hypot(wrist[0] - previous[0], wrist[2] - previous[2])).toBeLessThan(0.01);
        if (wrist[1] > 13 && previous[1] <= 13) steps++;
        previous = wrist;
      }
      expect(steps).toBe(2);
    }
    const firstUp = skeletons.findIndex((s) => s.rightArm[2][1] > 13 || s.leftArm[2][1] > 13);
    expect(skeletons[firstUp].rightArm[2][1]).toBeGreaterThan(13);
    const leftUp = skeletons.findIndex((s) => s.leftArm[2][1] > 13);
    expect(skeletons[leftUp].rightArm[2][0] - start.rightArm[2][0]).toBeGreaterThan(100);
    // The hold: the hands well out in front, both the same, the arms long, the chest low and the
    // forehead on the floor.
    const puppy = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(puppy.rightArm[2][0] - start.rightArm[2][0]).toBeGreaterThan(100);
    expect(puppy.rightArm[2][0]).toBeCloseTo(puppy.leftArm[2][0]);
    for (const arm of [puppy.rightArm, puppy.leftArm]) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(140);
    expect(puppy.spine[6][1]).toBeLessThan(70);
    expect(puppy.head[1]).toBeLessThan(SKELETON.head + 5);
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm']));
  });

  it('hugs one knee in to the chest with both hands, the other leg flat, in lying knee hug', () => {
    const clip = LYING_KNEE_HUG_3D;
    const skeletons = samples(clip).map(solvePose);
    for (const { leftLeg } of skeletons) for (const joint of leftLeg.slice(0, 3)) expect(joint[1]).toBeLessThan(25);
    const hug = solvePose(clip.keyframes[clip.stillFrame].pose);
    // The knee drawn in over the chest, both hands on the shin just below it.
    expect(hug.rightLeg[1][0]).toBeLessThan(hug.spine[0][0]);
    for (const arm of [hug.rightArm, hug.leftArm]) expect(distance(arm[2], hug.rightLeg[1])).toBeLessThan(40);
    expect(clip.keyframes[clip.stillFrame + 1].pose).toBe(clip.keyframes[clip.stillFrame].pose);
    expect(clip.keyframes[clip.stillFrame + 1].ms).toBeGreaterThanOrEqual(3000);
    expect(new Set(drawOrders(clip)).size).toBe(1);
  });

  it('raises the straight leg on the strap and pulls it in a little further to hold, the other leg flat, in lying hamstring stretch', () => {
    const clip = LYING_HAMSTRING_STRETCH_3D;
    const skeletons = samples(clip).map(solvePose);
    for (const { rightLeg, leftLeg } of skeletons) {
      expect(angleAt(rightLeg[0], rightLeg[1], rightLeg[2])).toBeGreaterThan(175);
      for (const joint of leftLeg.slice(0, 3)) expect(joint[1]).toBeLessThan(25);
    }
    const raised = (pose: Pose3) => {
      const [hip, , ankle] = solvePose(pose).rightLeg;
      return (Math.atan2(ankle[1] - hip[1], ankle[0] - hip[0]) * 180) / Math.PI;
    };
    const hold = clip.keyframes[clip.stillFrame].pose;
    expect(raised(hold)).toBeGreaterThan(raised(clip.keyframes[2].pose) + 5);
    expect(raised(hold)).toBeGreaterThan(75);
    expect(new Set(drawOrders(clip)).size).toBe(1);
  });

  it('folds forward over straight legs with the hands reaching from the thighs to wrap around the feet, the far one from behind, in seated pike stretch', () => {
    const clip = SEATED_PIKE_STRETCH_3D;
    expect(clip.trail).toBeUndefined();
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg, rightArm, leftArm } of skeletons) {
      for (const [leg, arm, first, side] of [[rightLeg, rightArm, start.rightLeg, 1], [leftLeg, leftArm, start.leftLeg, -1]] as const) {
        // The legs stay straight and still, together, toes up.
        for (let i = 0; i < 4; i++) expect(distance(leg[i], first[i])).toBeLessThan(0.5);
        expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(178);
        expect(leg[3][1]).toBeGreaterThan(leg[2][1] + 30);
        // The hand stays over its own leg, never inside it toward the other one, nor further out
        // than the edge of the sole.
        expect(side * (arm[2][2] - leg[2][2])).toBeGreaterThan(0);
        expect(side * (arm[2][2] - leg[2][2])).toBeLessThan(16);
        expect(arm[2][0]).toBeGreaterThan(leg[0][0] + 0.25 * (leg[2][0] - leg[0][0]));
        expect(arm[2][0]).toBeLessThan(leg[2][0] + 7);
      }
    }
    // Sitting tall to start, the hands resting on top of the thighs with the elbows soft; folded,
    // the hands around the feet and the arms long.
    expect(tipped(start.spine[0], start.spine[6])).toBeLessThan(5);
    for (const [arm, leg] of [[start.rightArm, start.rightLeg], [start.leftArm, start.leftLeg]] as const) {
      expect(arm[2][0]).toBeLessThan(leg[1][0]);
      expect(arm[2][1]).toBeGreaterThan(leg[0][1] + 10);
      expect(angleAt(arm[0], arm[1], arm[2])).toBeLessThan(130);
    }
    const folded = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(tipped(folded.spine[0], folded.spine[6])).toBeGreaterThan(35);
    for (const [arm, leg] of [[folded.rightArm, folded.rightLeg], [folded.leftArm, folded.leftLeg]] as const) {
      expect(Math.abs(arm[2][0] - leg[2][0])).toBeLessThan(8);
      expect(arm[2][1]).toBeGreaterThan(leg[2][1] + 15);
      expect(arm[2][1]).toBeLessThan(leg[3][1]);
      expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(150);
    }
    // The near hand turns in around the outside of its foot and across the sole. The far one, behind
    // its foot, curls round the front of it, the fingertips past the sole but still on that foot's
    // outer side, never in between the feet.
    const [near, far] = [folded.rightArm, folded.leftArm];
    expect(near[3][2] - near[2][2]).toBeLessThan(-0.8 * SKELETON.hand);
    expect(near[3][0]).toBeGreaterThan(folded.rightLeg[2][0]);
    expect(far[3][0]).toBeGreaterThan(folded.leftLeg[2][0] + 15);
    expect(far[3][2]).toBeLessThanOrEqual(folded.leftLeg[2][2]);
    // One smooth movement down: the body only ever folds further and the hands only ever move on
    // toward the feet, until the hold.
    const down = clip.keyframes.slice(0, clip.stillFrame + 1).map((frame) => frame.pose);
    down.slice(1).forEach((pose, i) => {
      expect(pose.lean!).toBeGreaterThanOrEqual(down[i].lean!);
      expect(pose.pins!.rightHand!.at[0]).toBeGreaterThanOrEqual(down[i].pins!.rightHand!.at[0]);
    });
    // The near arm is in front of its leg the whole way. The far one is over its leg with the hand on
    // the thigh, and behind it with the hand round the foot, and changes only while it's clear of the
    // leg on screen.
    const orders = drawOrders(clip);
    expect(new Set(orders)).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm', 'leftArm leftLeg torso head rightLeg rightArm']));
    const view = viewOf(clip.camera);
    orders.forEach((order, i) => {
      if (i === 0 || order === orders[i - 1]) return;
      const skeleton = solvePose(poseAt3(clip, i * 10));
      const onScreen = (points: readonly Vec3[]) => points.map((point) => project(view, point));
      expect(boneGap(onScreen(skeleton.leftArm), onScreen(skeleton.leftLeg))).toBeGreaterThan(LIMB_CLEAR);
    });
  });

  it('holds the V while one straight leg at a time swings up behind, in line with the back, in three legged downward facing dog', () => {
    const clip = THREE_LEGGED_DOWNWARD_FACING_DOG_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    const lifted = (leg: readonly Vec3[], first: readonly Vec3[]) => distance(leg[2], first[2]) > 0.5;
    for (const skeleton of skeletons) {
      const { spine, rightArm, leftArm, rightLeg, leftLeg } = skeleton;
      // The hands and the hips stay put, and the legs stay straight.
      expect(distance(rightArm[2], start.rightArm[2])).toBeCloseTo(0);
      expect(distance(leftArm[2], start.leftArm[2])).toBeCloseTo(0);
      expect(distance(spine[0], start.spine[0])).toBeCloseTo(0);
      // Straight as in the V, a hair short of locked, and that hair of bend always toward the
      // kneecap's side, never flipping to the back of the knee as the leg passes level.
      for (const leg of [rightLeg, leftLeg]) {
        expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(174);
        const along = Math.atan2(leg[2][1] - leg[0][1], leg[2][0] - leg[0][0]);
        const mid = midpoint(leg[0], leg[2]);
        expect((leg[1][0] - mid[0]) * -Math.sin(along) + (leg[1][1] - mid[1]) * Math.cos(along)).toBeGreaterThan(0);
      }
      // Never both feet off the floor.
      expect(lifted(rightLeg, start.rightLeg) && lifted(leftLeg, start.leftLeg)).toBe(false);
    }
    // The right leg goes first, and at the top it's past in line with the back, the foot well above the hips.
    const firstLift = skeletons.findIndex((s) => lifted(s.rightLeg, start.rightLeg) || lifted(s.leftLeg, start.leftLeg));
    expect(lifted(skeletons[firstLift].rightLeg, start.rightLeg)).toBe(true);
    const up = solvePose(clip.keyframes[clip.stillFrame].pose);
    const [hip, , ankle] = up.rightLeg;
    expect(ankle[1]).toBeGreaterThan(hip[1] + 60);
    // Nearly in line with the back, and a little above its line carried on past the hips.
    expect(angleAt(ankle, hip, up.spine[6])).toBeGreaterThan(160);
    const neck = up.spine[6];
    const backLineAt = hip[1] + ((hip[1] - neck[1]) / (hip[0] - neck[0])) * (ankle[0] - hip[0]);
    expect(ankle[1]).toBeGreaterThan(backLineAt);
    // Both legs take a turn.
    expect(skeletons.some((s) => s.leftLeg[2][1] > s.spine[0][1])).toBe(true);
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm']));
  });

  it('hinges forward over planted feet with soft knees, the head and arms hanging, in standing forward fold', () => {
    const clip = STANDING_FORWARD_FOLD_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) expect(distance(leg[2], first[2])).toBeCloseTo(0);
      // The arms hang straight down from the shoulders the whole way.
      for (const arm of [rightArm, leftArm]) expect(Math.abs(arm[2][0] - arm[0][0])).toBeLessThan(1);
    }
    const fold = solvePose(clip.keyframes[clip.stillFrame].pose);
    // The knees soft but not squatting, the head hanging well below the hips, the fingertips near the floor.
    for (const leg of [fold.rightLeg, fold.leftLeg]) {
      expect(angleAt(leg[0], leg[1], leg[2])).toBeLessThan(170);
      expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(150);
    }
    expect(fold.head[1]).toBeLessThan(fold.spine[0][1] - 50);
    expect(tipped(fold.spine[0], fold.spine[6])).toBeGreaterThan(90);
    expect(fold.rightArm[3][1]).toBeLessThan(30);
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftArm leftLeg torso head rightLeg rightArm']));
  });

  it('shifts the hips back with straight arms and the fingers pointing back at the knees, hands, knees and feet planted, in kneeling wrist stretch', () => {
    const clip = KNEELING_WRIST_STRETCH_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
      for (const [arm, first] of [[rightArm, start.rightArm], [leftArm, start.leftArm]] as const) {
        expect(distance(arm[2], first[2])).toBeCloseTo(0);
        expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(165);
        // The fingers point back toward the knees.
        expect(arm[3][0]).toBeLessThan(arm[2][0] - 0.8 * SKELETON.hand);
      }
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[1], first[1])).toBeLessThan(0.5);
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
      }
    }
    // Over the hands to start; back behind them, the hips well back over the shins, to hold.
    expect(Math.abs(start.rightArm[0][0] - start.rightArm[2][0])).toBeLessThan(10);
    const back = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(back.rightArm[0][0]).toBeLessThan(back.rightArm[2][0] - 25);
    expect(back.spine[0][0]).toBeLessThan(start.spine[0][0] - 50);
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftLeg leftArm torso head rightLeg rightArm']));
  });

  it('slides the arms along the floor from a goalpost to overhead, the knees bent and the feet flat, in floor angels', () => {
    const clip = FLOOR_ANGELS_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
      // The elbows and the backs of the hands stay down on the floor.
      for (const arm of [rightArm, leftArm]) for (const joint of arm.slice(0, 3)) expect(Math.abs(joint[1] - arm[0][1])).toBeLessThan(1);
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
        expect(leg[1][1]).toBeGreaterThan(90);
      }
    }
    // The goalpost: the upper arms straight out from the shoulders, the elbows at 90°, the hands past the head.
    const goalpost = solvePose(clip.keyframes[clip.stillFrame].pose);
    for (const arm of [goalpost.rightArm, goalpost.leftArm]) {
      expect(Math.abs(arm[1][0] - arm[0][0])).toBeLessThan(1);
      expect(angleAt(arm[0], arm[1], arm[2])).toBeCloseTo(90, 0);
      expect(arm[2][0]).toBeLessThan(arm[1][0] - 60);
    }
    // Overhead: the arms long, reaching past the head and in toward each other.
    const overhead = skeletons.reduce((far, s) => (s.rightArm[2][0] < far.rightArm[2][0] ? s : far));
    for (const arm of [overhead.rightArm, overhead.leftArm]) {
      expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(150);
      expect(arm[2][0]).toBeLessThan(overhead.head[0] - 60);
      expect(Math.abs(arm[2][2])).toBeLessThan(Math.abs(goalpost.rightArm[2][2]));
    }
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftArm leftLeg torso head rightLeg rightArm']));
  });

  it('presses the hips up from sitting until the thighs are level and the shins upright, hands and feet planted and the arms straight, in reverse tabletop', () => {
    const clip = REVERSE_TABLETOP_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
      for (const [arm, first] of [[rightArm, start.rightArm], [leftArm, start.leftArm]] as const) {
        expect(distance(arm[2], first[2])).toBeCloseTo(0);
        expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(170);
        // The hands are behind the shoulders, the fingers pointing forward.
        expect(arm[2][0]).toBeLessThan(arm[0][0]);
        expect(arm[3][0]).toBeGreaterThan(arm[2][0] + 0.8 * SKELETON.hand);
      }
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) expect(distance(leg[2], first[2])).toBeCloseTo(0);
    }
    // Sitting on the floor to start.
    expect(start.spine[0][1]).toBeLessThan(25);
    // The table: the thighs level and the shins upright, the hips up at the knees' height and the
    // shoulders a little higher, the arms being longer than the shins.
    const up = solvePose(clip.keyframes[clip.stillFrame].pose);
    for (const [hip, knee, ankle] of [up.rightLeg, up.leftLeg]) {
      expect(Math.abs(knee[1] - hip[1])).toBeLessThan(3);
      expect(tipped(ankle, knee)).toBeLessThan(3);
    }
    expect(up.spine[6][1]).toBeGreaterThan(up.spine[0][1]);
    expect(tipped(up.spine[0], up.spine[6])).toBeGreaterThan(55);
    expect(new Set(drawOrders(clip))).toEqual(new Set(['leftArm leftLeg torso head rightArm rightLeg']));
  });

  it('sinks from standing into a deep squat with the heels down and the elbows inside the knees in bottom squat', () => {
    const skeletons = samples(BOTTOM_SQUAT_3D).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg } of skeletons) {
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        // The feet stay flat where they are, heels down.
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
        expect(distance(leg[3], first[3])).toBeCloseTo(0);
        expect(leg[3][1]).toBeCloseTo(leg[2][1]);
        // The shin never tips further forward than an ankle bends with the heel down.
        expect(tipped(leg[2], leg[1])).toBeLessThan(39);
      }
      rightLeg.forEach((joint, i) => expect(distance(joint, [leftLeg[i][0], leftLeg[i][1], -leftLeg[i][2]])).toBeCloseTo(0));
    }
    // Standing: legs straight, feet about shoulder-width apart, toes slightly out.
    expect(angleAt(start.rightLeg[0], start.rightLeg[1], start.rightLeg[2])).toBeGreaterThan(175);
    expect(start.rightLeg[2][2] - start.leftLeg[2][2]).toBeGreaterThan(50);
    expect(start.rightLeg[2][2] - start.leftLeg[2][2]).toBeLessThan(75);
    expect(start.rightLeg[3][2] - start.rightLeg[2][2]).toBeGreaterThan(8);
    expect(start.rightLeg[3][2] - start.rightLeg[2][2]).toBeLessThan(20);

    const down = solvePose(BOTTOM_SQUAT_3D.keyframes[BOTTOM_SQUAT_3D.stillFrame].pose);
    // As low as it goes: the hips well below the knees.
    expect(down.spine[0][1]).toBeLessThan(down.rightLeg[1][1] - 20);
    // The knees are pushed out, wider than the toes.
    expect(down.rightLeg[1][2]).toBeGreaterThan(down.rightLeg[3][2] + 10);
    // Chest up.
    expect(tipped(down.spine[0], down.spine[down.spine.length - 1])).toBeLessThan(40);
    // Each elbow against the inside of its knee, and the palms together.
    for (const [arm, leg] of [[down.rightArm, down.rightLeg], [down.leftArm, down.leftLeg]] as const) {
      expect(distance(arm[1], leg[1])).toBeLessThan(30);
      expect(Math.abs(arm[1][2])).toBeLessThan(Math.abs(leg[1][2]));
    }
    expect(distance(down.rightArm[2], down.leftArm[2])).toBeLessThan(12);
    // It holds there.
    expect(BOTTOM_SQUAT_3D.keyframes[BOTTOM_SQUAT_3D.stillFrame + 1].ms).toBeGreaterThanOrEqual(3000);
  });

  it('keeps hold of the toes from the fold down into the squat and back up, twice, in squat to stand', () => {
    const clip = SQUAT_TO_STAND_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    const knee = ({ rightLeg }: Skeleton) => angleAt(rightLeg[0], rightLeg[1], rightLeg[2]);
    for (const { rightLeg, leftLeg } of skeletons) {
      for (const [leg, first] of [[rightLeg, start.rightLeg], [leftLeg, start.leftLeg]] as const) {
        expect(distance(leg[2], first[2])).toBeCloseTo(0);
        expect(leg[3][1]).toBeCloseTo(leg[2][1]);
      }
    }
    // It starts standing tall.
    expect(knee(start)).toBeGreaterThan(175);
    expect(tipped(start.spine[0], start.spine[start.spine.length - 1])).toBeLessThan(2);

    // Once the fingers are on the toes they stay there until the last straightening up.
    const holding = skeletons.map(({ rightArm, leftArm, rightLeg, leftLeg }) => distance(rightArm[3], rightLeg[3]) < 5 && distance(leftArm[3], leftLeg[3]) < 5);
    const first = holding.indexOf(true);
    const last = holding.lastIndexOf(true);
    expect(first).toBeGreaterThan(10);
    expect(last - first).toBeGreaterThan(skeletons.length / 2);
    expect(holding.slice(first, last + 1).every(Boolean)).toBe(true);
    const held = skeletons.slice(first, last + 1);

    // The fold: legs straight, the head hanging below the hips.
    for (const fold of [held[0], held[held.length - 1]]) {
      expect(knee(fold)).toBeGreaterThan(175);
      expect(fold.head[1]).toBeLessThan(fold.spine[0][1]);
    }
    // The squat: hips below the knees, the arms inside the knees, and the torso leaning a little
    // forward over the feet, as a body balances in a deep squat: the chest and head are ahead of the
    // heels, not tipped back behind them.
    const squat = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(squat.spine[0][1]).toBeLessThan(squat.rightLeg[1][1] - 20);
    const lean = tipped(squat.spine[0], squat.spine[squat.spine.length - 1]);
    expect(lean).toBeGreaterThan(20);
    expect(lean).toBeLessThan(35);
    expect(squat.spine[squat.spine.length - 1][0]).toBeGreaterThan(squat.rightLeg[2][0] + 15);
    expect(squat.head[0]).toBeGreaterThan(squat.spine[squat.spine.length - 1][0]);
    for (const [arm, leg] of [[squat.rightArm, squat.rightLeg], [squat.leftArm, squat.leftLeg]] as const) {
      expect(Math.abs(arm[1][2])).toBeLessThan(Math.abs(leg[1][2]) - LIMB_CLEAR);
      // Leaning in over the feet brings the shoulders nearer the toes, so the elbows give a little.
      expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(100);
    }
    // Down into the squat and back up to straight legs twice without letting go.
    const low = held.map((skeleton) => skeleton.spine[0][1] < squat.spine[0][1] + 5);
    expect(low.filter((isLow, i) => isLow && !low[i - 1]).length).toBe(2);
    const between = held.slice(low.indexOf(true), low.lastIndexOf(true));
    expect(Math.max(...between.map(knee))).toBeGreaterThan(175);
  });

  it('keeps one hand on the floor while the other arm reaches for the ceiling and the chest turns to it, each side in turn, in bottom squat rotation', () => {
    const skeletons = samples(BOTTOM_SQUAT_ROTATION_3D).map(solvePose);
    const start = skeletons[0];
    const planted = (skeleton: Skeleton, arm: 'rightArm' | 'leftArm') => distance(skeleton[arm][2], start[arm][2]) < 0.01;
    for (const skeleton of skeletons) {
      // The squat itself doesn't move.
      expect(distance(skeleton.spine[0], start.spine[0])).toBeCloseTo(0);
      [...skeleton.rightLeg, ...skeleton.leftLeg].forEach((joint, i) => expect(distance(joint, [...start.rightLeg, ...start.leftLeg][i])).toBeCloseTo(0));
      expect(planted(skeleton, 'rightArm') || planted(skeleton, 'leftArm')).toBe(true);
    }
    // A deep squat, heels down, with both hands flat on the floor between the feet to begin with.
    expect(start.spine[0][1]).toBeLessThan(start.rightLeg[1][1] - 20);
    expect(start.rightLeg[3][1]).toBeCloseTo(start.rightLeg[2][1]);
    for (const arm of [start.rightArm, start.leftArm]) {
      expect(arm[2][1]).toBeCloseTo(11);
      expect(arm[3][1]).toBeCloseTo(11);
      expect(Math.abs(arm[2][2])).toBeLessThan(Math.abs(start.rightLeg[2][2]));
    }

    const highest = (arm: 'rightArm' | 'leftArm') => skeletons.reduce((best, skeleton, i) => (skeleton[arm][3][1] > skeletons[best][arm][3][1] ? i : best), 0);
    for (const [arm, other, side] of [['rightArm', 'leftArm', 1], ['leftArm', 'rightArm', -1]] as const) {
      const up = skeletons[highest(arm)];
      // A straight arm, pointing at the ceiling.
      expect(angleAt(up[arm][0], up[arm][1], up[arm][2])).toBeGreaterThan(170);
      expect(fromHanging(up[arm][0], up[arm][2])).toBeGreaterThan(165);
      expect(planted(up, other)).toBe(true);
      // The chest has turned toward the raised arm, whose shoulder is now behind and above the other, and the head with it.
      expect(up[arm][0][0]).toBeLessThan(up[other][0][0] - 25);
      expect(up[arm][0][1]).toBeGreaterThan(up[other][0][1] + 15);
      expect(up.facing[2] * side).toBeGreaterThan(0.2);
    }
    expect(highest('rightArm')).toBeLessThan(highest('leftArm'));
  });

  it('never swaps one part of the body over another partway through a squat clip', () => {
    // The Cossack squats keep one order from start to finish.
    for (const clip of [COSSACK_SQUAT_3D, RESTING_COSSACK_SQUAT_3D]) {
      expect(new Set(drawOrders(clip)).size).toBe(1);
    }
    // In the rotation the two arms, side by side on the floor, are the only parts that trade
    // places, and both stay over the legs and the torso, under the head.
    for (const order of drawOrders(BOTTOM_SQUAT_ROTATION_3D)) {
      expect(order.replace('rightArm leftArm', 'leftArm rightArm')).toBe('torso leftLeg rightLeg leftArm rightArm head');
    }
    // In the bottom squat the thighs are over the hips all the way through and the arms over the
    // thighs, so the elbows are in front of the knees. Only the head moves, behind the hands at the
    // bottom.
    for (const order of drawOrders(BOTTOM_SQUAT_3D)) {
      expect(order.replace(' head', '')).toBe('torso leftLeg rightLeg leftArm rightArm');
    }
  });

  it('keeps the arms clear of the legs where they are not meant to touch in the squat clips', () => {
    // The head is never near enough to a hand for the two to be drawn over each other.
    for (const clip of [BOTTOM_SQUAT_3D, COSSACK_SQUAT_3D, RESTING_COSSACK_SQUAT_3D]) {
      const view = viewOf(clip.camera);
      for (const skeleton of samples(clip).map(solvePose)) {
        const head = project(view, skeleton.head);
        for (const arm of [skeleton.rightArm, skeleton.leftArm]) {
          for (const joint of [arm[2], arm[3]]) expect(onScreen(head, project(view, joint))).toBeGreaterThan(SKELETON.head + LIMB_CLEAR);
        }
      }
    }
    // Reaching forward in the Cossack squats, the elbows and hands stay well above the knees.
    for (const clip of [COSSACK_SQUAT_3D, RESTING_COSSACK_SQUAT_3D]) {
      for (const { rightArm, leftArm, rightLeg, leftLeg } of samples(clip).map(solvePose)) {
        for (const arm of [rightArm, leftArm]) {
          for (const leg of [rightLeg, leftLeg]) {
            expect(distance(arm[1], leg[1])).toBeGreaterThan(2 * LIMB_CLEAR);
            expect(distance(arm[2], leg[1])).toBeGreaterThan(2 * LIMB_CLEAR);
          }
        }
      }
    }
  });

  it('pushes the clasped hands out in front as the hips sink in the Cossack squats, and draws them back in on the way up', () => {
    // How far the hands are out in front of the chest.
    const reach = ({ rightArm, spine }: Skeleton) => rightArm[2][0] - spine[spine.length - 1][0];
    for (const clip of [COSSACK_SQUAT_3D, RESTING_COSSACK_SQUAT_3D]) {
      const view = viewOf(clip.camera);
      const skeletons = samples(clip).map(solvePose);
      for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
        // Clasped: the wrists stay together, with the elbows bent.
        expect(distance(rightArm[2], leftArm[2])).toBeLessThan(15);
        for (const arm of [rightArm, leftArm]) {
          expect(angleAt(arm[0], arm[1], arm[2])).toBeLessThan(165);
          // On screen, no part of an arm comes near enough to a leg to be drawn over it.
          const [elbow, wrist, tip] = [project(view, arm[1]), project(view, arm[2]), project(view, arm[3])];
          for (const leg of [rightLeg, leftLeg]) {
            for (const joint of leg.map((point) => project(view, point))) {
              for (const point of [elbow, wrist, tip]) expect(onScreen(point, joint)).toBeGreaterThan(LIMB_CLEAR + 5);
            }
          }
        }
      }
      const reaches = skeletons.map(reach);
      const bottom = reach(solvePose(clip.keyframes[clip.stillFrame].pose));
      expect(bottom).toBeCloseTo(Math.max(...reaches), 0);
      expect(bottom - Math.min(...reaches)).toBeGreaterThan(25);
    }
    // Standing, before the resting squat, they're tucked in closest of all.
    expect(reach(solvePose(RESTING_COSSACK_SQUAT_3D.keyframes[0].pose))).toBeLessThan(Math.min(...samples(COSSACK_SQUAT_3D).map(solvePose).map(reach)) - 10);
  });

  it('starts with straight arms at the sides, which hang straight down through the fold before the hands close on the toes, in squat to stand', () => {
    const clip = SQUAT_TO_STAND_3D;
    const elbow = ({ rightArm }: Skeleton) => angleAt(rightArm[0], rightArm[1], rightArm[2]);
    const start = solvePose(clip.keyframes[0].pose);
    // Standing: both arms straight, hanging by the sides, just outside the hips.
    for (const arm of [start.rightArm, start.leftArm]) {
      expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(165);
      expect(fromHanging(arm[0], arm[2])).toBeLessThan(8);
      expect(Math.abs(arm[2][2])).toBeGreaterThan(Math.abs(arm[0][2]));
    }
    // Halfway into the fold they still hang straight down from the shoulders, so they swing forward
    // with the body rather than staying stuck to it.
    const halfway = solvePose(clip.keyframes[STS_FOLD_STEPS_IN_TEST / 2].pose);
    expect(elbow(halfway)).toBeGreaterThan(160);
    expect(fromHanging(halfway.rightArm[0], halfway.rightArm[2])).toBeLessThan(15);
    expect(halfway.rightArm[2][0]).toBeGreaterThan(start.rightArm[2][0] + 40);
    // The fold is the keyframe the first reach down ends on; the squat is the still frame.
    const fold = solvePose(clip.keyframes[STS_FOLD_STEPS_IN_TEST].pose);
    const squat = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(elbow(fold)).toBeLessThan(140);
    expect(elbow(squat)).toBeGreaterThan(100);
    // The chest lifts from the fold, though it still leans forward over the feet.
    expect(tipped(squat.spine[0], squat.spine[squat.spine.length - 1])).toBeLessThan(tipped(fold.spine[0], fold.spine[fold.spine.length - 1]) - 50);
    // In the fold the elbows are out wider than the shoulders.
    expect(Math.abs(fold.rightArm[1][2])).toBeGreaterThan(Math.abs(fold.rightArm[0][2]) + 15);
  });

  it('shows the nose all the way through the bottom squat rotation', () => {
    const view = viewOf(BOTTOM_SQUAT_ROTATION_3D.camera);
    for (const skeleton of samples(BOTTOM_SQUAT_ROTATION_3D).map(solvePose)) {
      const head = traceFigure(skeleton, view).slots.find((slot) => slot.part === 'head');
      // The head's circle, and the line of the nose cut into it.
      expect(head?.d.split('Z').filter((piece) => piece !== '')).toHaveLength(2);
    }
  });

  it('changes the arms from outside the thighs to inside the knees in squat to stand only while they are clear of the legs', () => {
    const clip = SQUAT_TO_STAND_3D;
    const view = viewOf(clip.camera);
    const orders = drawOrders(clip);
    const changes = orders.flatMap((order, i) => (i > 0 && order !== orders[i - 1] ? [i * 10] : []));
    // Once on the way into the first fold and once on the way out of the last.
    expect(changes).toHaveLength(2);
    for (const t of changes) {
      const skeleton = solvePose(poseAt3(clip, t));
      const flat = (points: Vec3[]) => points.map((point) => project(view, point));
      for (const [arm, leg] of [[skeleton.rightArm, skeleton.rightLeg], [skeleton.leftArm, skeleton.leftLeg]] as const) {
        // Well clear: further apart than both limbs' thickness and the outline between them, about 37.
        expect(boneGap(flat(arm), flat(leg))).toBeGreaterThan(3 * LIMB_CLEAR);
      }
    }
    // Hanging at the sides, the near arm is over the near thigh; in the squat it's behind the knee.
    const order = (t: number) => frameAt(clip, view, t).slots.filter((slot) => !slot.hand).map((slot) => slot.part);
    expect(order(0).indexOf('rightArm')).toBeGreaterThan(order(0).indexOf('rightLeg'));
    const squatAt = clip.keyframes.slice(1, clip.stillFrame + 1).reduce((total, frame) => total + frame.ms, 0);
    expect(order(squatAt).indexOf('rightArm')).toBeLessThan(order(squatAt).indexOf('rightLeg'));
  });

  it('draws the hands over the toes they hold in squat to stand, though the near arm is behind its knee', () => {
    const clip = SQUAT_TO_STAND_3D;
    const view = viewOf(clip.camera);
    for (let t = 0; t <= durationOf(clip); t += 50) {
      const { slots } = frameAt(clip, view, t);
      // The six parts of the body, and each hand again on its own.
      expect(slots).toHaveLength(8);
      const at = (part: string, hand: boolean) => slots.findIndex((slot) => slot.part === part && slot.hand === hand);
      expect(at('rightArm', true)).toBeGreaterThan(at('rightLeg', false));
      expect(at('leftArm', true)).toBeGreaterThan(at('leftLeg', false));
      expect(at('leftArm', true)).toBeGreaterThan(at('leftArm', false));
      for (const slot of slots) {
        // A hand on its own is outlined from partway along, which leaves no line across its wrist.
        if (slot.hand) expect(slot.outline).not.toBe(slot.d);
        else expect(slot.outline).toBe(slot.d);
      }
    }
    // Every other clip draws just the six parts.
    expect(frameAt(BOTTOM_SQUAT_3D, viewOf(BOTTOM_SQUAT_3D.camera), 0).slots).toHaveLength(6);
  });

  it('puts one limb behind another when a clip says so, but only on the same side of the torso', () => {
    const view = viewOf({ yaw: 90, pitch: 0 });
    // Standing, seen from the front: the legs are under the hips and the arms over the torso.
    const standing = solvePose(STANDING);
    const order = (skeleton: Skeleton, behind: Clip3D['behind']) =>
      traceFigure(skeleton, view, undefined, undefined, undefined, undefined, undefined, behind).slots.map((slot) => slot.part);
    expect(order(standing, [['rightArm', 'rightLeg']])).toEqual(order(standing, undefined));
    // Both arms are over the torso, so either can be put behind the other.
    const plain = order(standing, undefined);
    const swapped = order(standing, [[plain.indexOf('rightArm') > plain.indexOf('leftArm') ? 'rightArm' : 'leftArm', plain.indexOf('rightArm') > plain.indexOf('leftArm') ? 'leftArm' : 'rightArm']]);
    expect(swapped.indexOf('rightArm') < swapped.indexOf('leftArm')).toBe(plain.indexOf('rightArm') > plain.indexOf('leftArm'));
    expect(swapped.indexOf('torso')).toBe(plain.indexOf('torso'));
  });

  it('shifts from one bent leg to the other through the bottom, heel down on one side and toes up on the other, in cossack squat', () => {
    const clip = COSSACK_SQUAT_3D;
    const skeletons = samples(clip).map(solvePose);
    const overRight = skeletons[0];
    const overLeft = solvePose(clip.keyframes[clip.stillFrame].pose);
    for (const { rightLeg, leftLeg, spine } of skeletons) {
      // The heels stay where they are, and the hips stay low the whole way across.
      expect(distance(rightLeg[2], overRight.rightLeg[2])).toBeCloseTo(0);
      expect(distance(leftLeg[2], overRight.leftLeg[2])).toBeCloseTo(0);
      expect(spine[0][1]).toBeLessThan(100);
    }
    // Feet wide apart.
    expect(overRight.rightLeg[2][2] - overRight.leftLeg[2][2]).toBeGreaterThan(SKELETON.thigh + SKELETON.shin);
    for (const [skeleton, bent, straight] of [[overRight, 'rightLeg', 'leftLeg'], [overLeft, 'leftLeg', 'rightLeg']] as const) {
      // The hips are down just inside the heel of the bent leg, whose foot is flat with the knee forward of it.
      expect(skeleton.spine[0][1]).toBeLessThan(60);
      expect(Math.abs(skeleton.spine[0][2] - skeleton[bent][2][2])).toBeLessThan(30);
      expect(skeleton[bent][3][1]).toBeCloseTo(skeleton[bent][2][1]);
      expect(angleAt(skeleton[bent][0], skeleton[bent][1], skeleton[bent][2])).toBeLessThan(60);
      expect(skeleton[bent][1][0]).toBeGreaterThan(skeleton[bent][2][0] + 30);
      expect(tipped(skeleton[bent][2], skeleton[bent][1])).toBeLessThan(40);
      // The other leg is straight, on its heel with the toes pointing up.
      expect(angleAt(skeleton[straight][0], skeleton[straight][1], skeleton[straight][2])).toBeGreaterThan(170);
      expect(skeleton[straight][2][1]).toBeCloseTo(13);
      expect(skeleton[straight][3][1] - skeleton[straight][2][1]).toBeGreaterThan(35);
    }
    // The two sides are mirror images.
    overRight.rightLeg.forEach((joint, i) => expect(distance(joint, [overLeft.leftLeg[i][0], overLeft.leftLeg[i][1], -overLeft.leftLeg[i][2]])).toBeCloseTo(0));
    overRight.leftLeg.forEach((joint, i) => expect(distance(joint, [overLeft.rightLeg[i][0], overLeft.rightLeg[i][1], -overLeft.rightLeg[i][2]])).toBeCloseTo(0));
    // Passing the middle, both feet are flat and both knees bent.
    const middle = skeletons.reduce((best, skeleton) => (Math.abs(skeleton.spine[0][2]) < Math.abs(best.spine[0][2]) ? skeleton : best));
    for (const leg of [middle.rightLeg, middle.leftLeg]) {
      expect(leg[3][1] - leg[2][1]).toBeLessThan(6);
      expect(angleAt(leg[0], leg[1], leg[2])).toBeLessThan(120);
    }
  });

  it('sinks from a wide stance over one leg, the other straight the whole way, and rests at the bottom in resting cossack squat', () => {
    const clip = RESTING_COSSACK_SQUAT_3D;
    const skeletons = samples(clip).map(solvePose);
    const start = skeletons[0];
    for (const { rightLeg, leftLeg } of skeletons) {
      expect(distance(rightLeg[2], start.rightLeg[2])).toBeCloseTo(0);
      expect(distance(leftLeg[2], start.leftLeg[2])).toBeCloseTo(0);
      // The heel of the leg it sinks over stays down, and the other leg never bends.
      expect(rightLeg[3][1]).toBeCloseTo(rightLeg[2][1]);
      expect(angleAt(leftLeg[0], leftLeg[1], leftLeg[2])).toBeGreaterThan(170);
    }
    // Standing between the feet with both legs straight and both feet flat.
    expect(start.spine[0][2]).toBeCloseTo(0);
    expect(tipped(start.spine[0], start.spine[start.spine.length - 1])).toBeLessThan(5);
    for (const leg of [start.rightLeg, start.leftLeg]) {
      expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(170);
      expect(leg[3][1]).toBeCloseTo(leg[2][1]);
    }
    // The bottom is the Cossack squat's, and it's held.
    const bottom = joints(solvePose(clip.keyframes[clip.stillFrame].pose));
    joints(solvePose(COSSACK_SQUAT_3D.keyframes[0].pose)).forEach((joint, i) => expect(distance(joint, bottom[i])).toBeCloseTo(0));
    expect(clip.keyframes[clip.stillFrame + 1].ms).toBeGreaterThanOrEqual(3000);
  });

  it('draws a strap only for a clip that has one, from hand to foot and back', () => {
    const frame = (clip: Clip3D) => traceFigure(solvePose(clip.keyframes[0].pose), viewOf(clip.camera), clip.highlight, clip.strap);
    expect(frame(STRAIGHT_LEG_RAISE_3D).strap).toMatch(/^M[-\d. ]+(L[-\d. ]+){3}$/);
    expect(frame(KNEE_TO_CHEST_3D).strap).toBe('');
  });

  it('shows the tool each flexibility test is measured with, and a partner where one is needed', () => {
    for (const test of FLEXIBILITY_TESTS) {
      const clip = test.animation as Clip3D;
      expect(clip.view).toBe('3d');
      // A tape measure for a distance, the phone for an angle.
      expect(clip.tape !== undefined).toBe(test.method.kind === 'distance');
      expect(clip.phone !== undefined).toBe(test.method.kind !== 'distance');
      expect(clip.partner === true).toBe(test.instructions.some((step) => /partner/i.test(step)));
    }
  });

  it('holds the phone in the hand, in line with the forearm, for the shoulder tests', () => {
    for (const clip of [SHOULDER_ABDUCTION_3D, SHOULDER_EXTERNAL_ROTATION_3D, OVERHEAD_REACH_3D]) {
      const arm = clip.phone!.limb as 'rightArm' | 'leftArm';
      for (const skeleton of samples(clip).map(solvePose)) {
        const { center, along } = phonePlacement(skeleton, clip.phone!);
        const [, elbow, wrist] = skeleton[arm];
        const forearm = [(wrist[0] - elbow[0]) / SKELETON.forearm, (wrist[1] - elbow[1]) / SKELETON.forearm, (wrist[2] - elbow[2]) / SKELETON.forearm];
        expect(along[0] * forearm[0] + along[1] * forearm[1] + along[2] * forearm[2]).toBeCloseTo(1);
        // Gripped across its middle, so the hand is on it.
        expect(distance(center, wrist)).toBeLessThan(SKELETON.hand);
        // Resting against the palm, clear of the middle of the hand rather than through it.
        const tip = skeleton[arm][3];
        const t = Math.max(0, Math.min(1, [0, 1, 2].reduce((sum, i) => sum + (center[i] - wrist[i]) * (tip[i] - wrist[i]), 0) / SKELETON.hand ** 2));
        const nearest = [0, 1, 2].map((i) => wrist[i] + (tip[i] - wrist[i]) * t) as unknown as Vec3;
        expect(distance(center, nearest)).toBeGreaterThanOrEqual(9.5 + PHONE.depth / 2 - 0.01);
      }
    }
  });

  it('stands the phone on its edge, thumb to the ceiling, through shoulder external rotation', () => {
    for (const skeleton of samples(SHOULDER_EXTERNAL_ROTATION_3D).map(solvePose)) {
      const { across, facing, center } = phonePlacement(skeleton, SHOULDER_EXTERNAL_ROTATION_3D.phone!);
      // Its short side upright and its screen level, toward the body.
      expect(Math.abs(across[1])).toBeCloseTo(1);
      expect(facing[1]).toBeCloseTo(0);
      const [, elbow] = skeleton.rightArm;
      const toBody = [skeleton.spine[3][0] - elbow[0], 0, skeleton.spine[3][2] - elbow[2]];
      expect(facing[0] * toBody[0] + facing[2] * toBody[2]).toBeGreaterThan(-1e-6);
      expect(center[1]).toBeCloseTo(elbow[1]);
    }
    // Behind the hand while the screen is turned away, and over it only once the screen faces the
    // camera: side-on, where it changes sides, it's beside the hand on screen, so it doesn't jump.
    const view = viewOf(SHOULDER_EXTERNAL_ROTATION_3D.camera);
    const sides = samples(SHOULDER_EXTERNAL_ROTATION_3D).map((pose) => {
      const skeleton = solvePose(pose);
      const toward = project(view, phonePlacement(skeleton, SHOULDER_EXTERNAL_ROTATION_3D.phone!).facing)[2];
      const { over } = traceFigure(skeleton, view, undefined, undefined, SHOULDER_EXTERNAL_ROTATION_3D.phone).phone;
      expect(over).toBe(toward > 0);
      return over;
    });
    expect(sides[0]).toBe(false);
    expect(sides).toContain(true);
  });

  it.each([
    // Hip abduction: the front of the leg below the knee, which faces the ceiling lying down.
    ['hip abduction', HIP_ABDUCTION_3D, 1, [0, 1, 0]],
    // Knee to chest and the straight leg raise: the outside of the thigh above the knee.
    ['knee to chest', KNEE_TO_CHEST_3D, 0, [0, 0, 1]],
    ['straight leg raise', STRAIGHT_LEG_RAISE_3D, 0, [0, 0, 1]],
  ] as const)('straps the phone to the side of the leg the instructions say in %s', (_, clip, bone, facing) => {
    const mount = clip.phone!;
    expect(mount.bone).toBe(bone);
    for (const skeleton of samples(clip).map(solvePose)) {
      const placed = phonePlacement(skeleton, mount);
      expect(placed.facing[0] * facing[0] + placed.facing[1] * facing[1] + placed.facing[2] * facing[2]).toBeGreaterThan(0.95);
      // Lying on the leg, its back just off the bone by the leg's thickness.
      const leg = skeleton.rightLeg;
      const onBone = [0, 1, 2].map((i) => leg[bone][i] + (leg[bone + 1][i] - leg[bone][i]) * mount.at!) as unknown as Vec3;
      expect(distance(placed.center, onBone)).toBeGreaterThan(9 + PHONE.depth / 2);
      expect(distance(placed.center, onBone)).toBeLessThan(16 + PHONE.depth / 2);
    }
    // Near the knee, on the bone the instructions name.
    expect(bone === 0 ? mount.at! : 1 - mount.at!).toBeGreaterThan(0.7);
  });

  it('straps the phone along the front of the shin, turning with it, in the seated hip rotations', () => {
    for (const clip of [HIP_EXTERNAL_ROTATION_3D, HIP_INTERNAL_ROTATION_3D]) {
      const skeletons = samples(clip).map(solvePose);
      // Hanging straight down at the start, the front of the shin faces ahead.
      expect(phonePlacement(skeletons[0], clip.phone!).facing[0]).toBeGreaterThan(0.95);
      for (const skeleton of skeletons) {
        const { along } = phonePlacement(skeleton, clip.phone!);
        const [, knee, ankle] = skeleton.rightLeg;
        const shin = [(ankle[0] - knee[0]) / SKELETON.shin, (ankle[1] - knee[1]) / SKELETON.shin, (ankle[2] - knee[2]) / SKELETON.shin];
        expect(along[0] * shin[0] + along[1] * shin[1] + along[2] * shin[2]).toBeCloseTo(1);
      }
    }
  });

  it('lays the tape from the wall back past the toes in knee to wall, and along the top of the box from its edge in sit and reach', () => {
    const wall = KNEE_TO_WALL_3D.scenery![0].from[0];
    const { from, to } = KNEE_TO_WALL_3D.tape!;
    expect(from[0]).toBe(wall);
    expect(from[1]).toBe(0);
    const toes = solvePose(KNEE_TO_WALL_3D.keyframes[0].pose).rightLeg[3][0];
    expect(to[0]).toBeLessThan(toes);
    const box = SIT_AND_REACH_3D.scenery![0];
    const tape = SIT_AND_REACH_3D.tape!;
    expect(tape.from[0]).toBe(box.from[0]);
    expect(tape.from[1]).toBe(box.to[1]);
    expect(tape.to[0]).toBeGreaterThan(tape.from[0]);
    expect(tape.to[0]).toBeLessThanOrEqual(box.to[0]);
    // Drawn, with marks, and kept in the frame.
    const stage = stageClip(KNEE_TO_WALL_3D);
    expect(stage.tape.strip).toMatch(/^M[-\d. ]+(L[-\d. ]+){3}Z$/);
    expect(stage.tape.marks).toMatch(/^(M[-\d. ]+L[-\d. ]+)+$/);
    const [x, y, width, height] = stage.viewBox.split(' ').map(Number);
    for (const end of [from, to]) {
      const [sx, sy] = project(stage.view, end);
      expect(sx).toBeGreaterThan(x);
      expect(sx).toBeLessThan(x + width);
      expect(sy).toBeGreaterThan(y);
      expect(sy).toBeLessThan(y + height);
    }
    expect(stageClip(CAT_COW_3D).tape).toEqual({ strip: '', marks: '' });
  });

  it.each([
    // Each test's phone reads the angle the test measures, at the clip's held pose.
    ['shoulder abduction', SHOULDER_ABDUCTION_3D, 0, 160],
    ['shoulder external rotation', SHOULDER_EXTERNAL_ROTATION_3D, 0, 65],
    ['overhead reach', OVERHEAD_REACH_3D, 90, 165],
    ['hip abduction', HIP_ABDUCTION_3D, 0, 40],
    ['hip external rotation', HIP_EXTERNAL_ROTATION_3D, 0, 42],
    ['hip internal rotation', HIP_INTERNAL_ROTATION_3D, 0, 42],
    ['straight leg raise', STRAIGHT_LEG_RAISE_3D, 0, 72],
    // The thigh starts lying a little below level, with the heel on the floor.
    ['knee to chest', KNEE_TO_CHEST_3D, 0, 132.6],
  ] as const)('reads the angle the %s test measures on the phone', (_, clip, start, held) => {
    expect(phoneReading(clip, solvePose(clip.keyframes[0].pose))).toBeCloseTo(start);
    expect(phoneReading(clip, solvePose(clip.keyframes[clip.stillFrame].pose))).toBeCloseTo(held, 0);
  });

  it('writes the reading on the screen while it faces the camera, and nothing otherwise', () => {
    const clip = SHOULDER_EXTERNAL_ROTATION_3D;
    const view = viewOf(clip.camera);
    const digits = (t: number) => frameAt(clip, view, t).phone;
    // Turned out, the screen faces the camera: 65 is two digits of segments and the degree sign.
    const out = digits(500 + 1500);
    expect(out.screen).not.toBe('');
    expect(out.reading).toMatch(/^(M[-\d. ]+(L[-\d. ]+)+Z?)+$/);
    expect(out.reading).not.toMatch(/NaN|Infinity|undefined/);
    // 6 has six segments and 5 five, each its own line, then the degree sign's square.
    expect(out.reading.match(/M/g)).toHaveLength(6 + 5 + 1);
    // Pointing ahead at the start, the screen faces away: no screen, no reading.
    expect(digits(0).screen).toBe('');
    expect(digits(0).reading).toBe('');
    // Without a reading, the screen is blank.
    const skeleton = solvePose(clip.keyframes[2].pose);
    expect(traceFigure(skeleton, view, undefined, undefined, clip.phone).phone.reading).toBe('');
  });

  it('draws the phone under its limb on the far side of it, over it on the near side, with the strap over both', () => {
    const view = viewOf(STRAIGHT_LEG_RAISE_3D.camera);
    const pose = STRAIGHT_LEG_RAISE_3D.keyframes[0].pose;
    const near = traceFigure(solvePose(pose), view, undefined, undefined, STRAIGHT_LEG_RAISE_3D.phone).phone;
    expect(near.part).toBe('rightLeg');
    expect(near.over).toBe(true);
    expect(near.screen).not.toBe('');
    expect(near.band).toMatch(/^M[-\d. ]+L[-\d. ]+$/);
    const far = traceFigure(solvePose(pose), view, undefined, undefined, { ...STRAIGHT_LEG_RAISE_3D.phone!, face: 'inside' }).phone;
    expect(far.over).toBe(false);
    expect(far.screen).toBe('');
    // Held in the hand there's no strap, and the phone shows over the hand.
    const held = traceFigure(solvePose(OVERHEAD_REACH_3D.keyframes[0].pose), viewOf(OVERHEAD_REACH_3D.camera), undefined, undefined, OVERHEAD_REACH_3D.phone).phone;
    expect(held.band).toBe('');
    expect(held.over).toBe(true);
    for (const frame of [near, far, held]) expect(frame.body).not.toMatch(/NaN|Infinity|undefined/);
    expect(traceFigure(solvePose(pose), view).phone.part).toBe('');
  });

  it('draws the sides of scenery that face the camera, and puts the mat under it', () => {
    expect(stageClip(CAT_COW_3D).scenery).toEqual([]);
    // A block shows its top and two sides to a camera above and to one side of it.
    const box = stageClip(SIT_AND_REACH_3D);
    expect(box.scenery.map((face) => face.tone).sort()).toEqual(['dark', 'light', 'mid']);
    for (const face of box.scenery) expect(face.d).toMatch(/^M[-\d. ]+(L[-\d. ]+){3}Z$/);
    // The table is a top and four legs, and the top is drawn last, over the tops of the front legs,
    // though their middles are nearer the camera than the top's.
    const table = stageClip(HIP_INTERNAL_ROTATION_3D).scenery;
    expect(table).toHaveLength(15);
    // The last three sides drawn are the top's: as wide on screen as the table, where a leg is narrow.
    const across = table.slice(-3).flatMap((face) => [...face.d.matchAll(/[ML](-?[\d.]+) /g)].map((m) => Number(m[1])));
    expect(Math.max(...across) - Math.min(...across)).toBeGreaterThan(150);
    // The box stands on the mat: its far bottom corner is inside the mat's outline.
    const { from, to } = SIT_AND_REACH_3D.scenery![0];
    const corner = project(box.view, [to[0], 0, from[2]]);
    const mat = [...box.mat.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(corner[0]).toBeLessThanOrEqual(Math.max(...mat.map(([x]) => x)) + 0.1);
    expect(corner[1]).toBeGreaterThanOrEqual(Math.min(...mat.map(([, y]) => y)) - 0.1);
  });

  it('lifts each thigh level in turn with the opposite arm forward when marching', () => {
    for (const [frame, lifted, forwardArm] of [
      [1, 'rightLeg', 'leftArm'],
      [3, 'leftLeg', 'rightArm'],
    ] as const) {
      const skeleton = solvePose(MARCHING_3D.keyframes[frame].pose);
      const leg = skeleton[lifted];
      expect(leg[1][1]).toBeCloseTo(leg[0][1]);
      expect(skeleton[forwardArm][2][0]).toBeGreaterThan(skeleton[forwardArm][0][0] + 50);
    }
    // The far leg rises from behind the hips without flipping over them partway up.
    const view = viewOf(MARCHING_3D.camera);
    for (const pose of samples(MARCHING_3D)) {
      const order = traceFigure(solvePose(pose), view).slots.map((slot) => slot.part);
      expect(order.indexOf('leftLeg')).toBeLessThan(order.indexOf('torso'));
    }
  });

  it('swings the leg forward and back with the torso and the hand on the wall still in leg swings', () => {
    const skeletons = samples(LEG_SWINGS_3D).map(solvePose);
    for (const { spine, rightLeg } of skeletons) {
      spine.forEach((point, i) => expect(distance(point, skeletons[0].spine[i])).toBeCloseTo(0));
      // Straight ahead and back, not out to the side.
      expect(Math.abs(rightLeg[2][2] - rightLeg[0][2])).toBeLessThan(15);
    }
    const swing = skeletons.map(({ rightLeg }) => rightLeg[2][0] - rightLeg[0][0]);
    expect(Math.max(...swing)).toBeGreaterThan(150);
    expect(Math.min(...swing)).toBeLessThan(-80);
    // The swinging leg is drawn over the torso all the way through, never tucked behind the hips.
    const view = viewOf(LEG_SWINGS_3D.camera);
    for (const skeleton of skeletons) {
      const order = traceFigure(skeleton, view).slots.map((slot) => slot.part);
      expect(order.indexOf('rightLeg')).toBeGreaterThan(order.indexOf('torso'));
    }
  });

  it('keeps both knees at 90° with the thighs square to each other, flat on the floor, in the 90 to 90 clips', () => {
    for (const clip of [NINETY_TO_NINETY_3D, NINETY_TO_NINETY_SIDE_FOOT_LIFTS_3D]) {
      for (const { rightLeg, leftLeg } of samples(clip).map(solvePose)) {
        expect(angleAt(rightLeg[0], rightLeg[1], rightLeg[2])).toBeCloseTo(90);
        expect(angleAt(leftLeg[0], leftLeg[1], leftLeg[2])).toBeCloseTo(90);
        // One thigh ahead and one out to the side.
        expect(angleAt([rightLeg[1][0], rightLeg[1][1], leftLeg[0][2]], leftLeg[0], leftLeg[1])).toBeCloseTo(90, 0);
        expect(rightLeg[1][0] - rightLeg[0][0]).toBeGreaterThan(95);
        expect(leftLeg[0][2] - leftLeg[1][2]).toBeGreaterThan(95);
        // Both knees and the front shin rest on the floor.
        for (const joint of [rightLeg[1], rightLeg[2], leftLeg[1]]) expect(joint[1]).toBeCloseTo(13);
      }
    }
  });

  it('folds from the hips over the front shin while the legs stay where they are in 90 to 90', () => {
    const skeletons = samples(NINETY_TO_NINETY_3D).map(solvePose);
    for (const { rightLeg, leftLeg } of skeletons) {
      [...rightLeg, ...leftLeg].forEach((joint, i) => expect(distance(joint, [...skeletons[0].rightLeg, ...skeletons[0].leftLeg][i])).toBeCloseTo(0));
    }
    const tall = solvePose(NINETY_TO_NINETY_3D.keyframes[0].pose);
    const folded = solvePose(NINETY_TO_NINETY_3D.keyframes[NINETY_TO_NINETY_3D.stillFrame].pose);
    const shin = folded.rightLeg[2][0];
    // Sitting tall, the chest is behind the front shin; folded, it's over it, lower, with the hands on the floor past it.
    expect(tall.spine[tall.spine.length - 1][0]).toBeLessThan(shin - 60);
    expect(folded.spine[folded.spine.length - 1][0]).toBeGreaterThan(shin);
    expect(folded.head[1]).toBeLessThan(tall.head[1] - 60);
    for (const arm of [folded.rightArm, folded.leftArm]) {
      expect(arm[2][0]).toBeGreaterThan(shin + 50);
      expect(arm[2][1]).toBeLessThan(15);
    }
  });

  it('lifts the back foot with its knee down and everything else still in 90 to 90 side foot lifts', () => {
    const skeletons = samples(NINETY_TO_NINETY_SIDE_FOOT_LIFTS_3D).map(solvePose);
    const first = skeletons[0];
    for (const { spine, rightLeg, leftLeg } of skeletons) {
      spine.forEach((point, i) => expect(distance(point, first.spine[i])).toBeCloseTo(0));
      rightLeg.forEach((joint, i) => expect(distance(joint, first.rightLeg[i])).toBeCloseTo(0));
      expect(distance(leftLeg[1], first.leftLeg[1])).toBeCloseTo(0);
    }
    const height = skeletons.map(({ leftLeg }) => leftLeg[2][1]);
    expect(Math.min(...height)).toBeCloseTo(13);
    expect(Math.max(...height)).toBeGreaterThan(45);
    expect(trailedPart(NINETY_TO_NINETY_SIDE_FOOT_LIFTS_3D.trail)).toBe('leftLeg');
    // A hand rests on top of each thigh, partway along it.
    for (const [arm, leg] of [[first.rightArm, first.rightLeg], [first.leftArm, first.leftLeg]]) {
      const along = distance(arm[2], leg[0]) / SKELETON.thigh;
      expect(along).toBeGreaterThan(0.3);
      expect(along).toBeLessThan(0.8);
      expect(arm[2][1] - leg[1][1]).toBeGreaterThan(15);
      expect(arm[2][1] - leg[1][1]).toBeLessThan(30);
    }
  });

  it('drops both knees to one side and then the other, feet planted and chest ahead, in 90 to 90 rotations', () => {
    const clip = NINETY_TO_NINETY_ROTATIONS_3D;
    const right = solvePose(clip.keyframes[0].pose);
    // The clip is a sweep to the left, a pause, a sweep back and a pause, so the left is just before halfway.
    const half = durationOf(clip) / 2;
    const left = solvePose(poseAt3(clip, half - 100));
    // The feet are set wider than the hips.
    expect(right.rightLeg[2][2] - right.leftLeg[2][2]).toBeGreaterThan(3 * SKELETON.hip);
    // The knees don't go over together: the leg on the side they're going to, which opens outward,
    // lifts first, and is well up while the other has barely started.
    const toLeft = solvePose(poseAt3(clip, 700));
    expect(toLeft.leftLeg[1][1]).toBeGreaterThan(toLeft.rightLeg[1][1] + 40);
    const toRight = solvePose(poseAt3(clip, half + 700));
    expect(toRight.rightLeg[1][1]).toBeGreaterThan(toRight.leftLeg[1][1] + 40);
    // Both come up and over on the way: each knee passes high.
    const all = samples(clip).map(solvePose);
    expect(Math.max(...all.map(({ rightLeg }) => rightLeg[1][1]))).toBeGreaterThan(80);
    expect(Math.max(...all.map(({ leftLeg }) => leftLeg[1][1]))).toBeGreaterThan(80);
    // To the right: the right leg opens out onto the floor and the left knee turns in after it, past the middle.
    expect(right.rightLeg[1][1]).toBeLessThan(20);
    expect(right.rightLeg[1][2]).toBeGreaterThan(right.rightLeg[2][2]);
    expect(right.leftLeg[1][1]).toBeLessThan(40);
    expect(right.leftLeg[1][2]).toBeGreaterThan(0);
    // The other side is the mirror image.
    right.rightLeg.forEach((joint, i) => expect(distance(joint, [left.leftLeg[i][0], left.leftLeg[i][1], -left.leftLeg[i][2]])).toBeCloseTo(0));
    right.leftLeg.forEach((joint, i) => expect(distance(joint, [left.rightLeg[i][0], left.rightLeg[i][1], -left.rightLeg[i][2]])).toBeCloseTo(0));
    for (const { rightLeg, leftLeg, spineFront, spine } of samples(clip).map(solvePose)) {
      // Knees stay bent near 90°, and the chest keeps facing ahead while the pelvis rolls under it.
      for (const leg of [rightLeg, leftLeg]) {
        expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(80);
        expect(angleAt(leg[0], leg[1], leg[2])).toBeLessThan(100);
      }
      expect(Math.abs(spineFront[spine.length - 1][2])).toBeLessThan(0.05);
    }
    // Both legs are drawn over the hips all the way through, and the arms propping the body up stay close to straight.
    const view = viewOf(clip.camera);
    for (let t = 0; t <= durationOf(clip); t += 50) {
      const order = frameAt(clip, view, t).slots.map((slot) => slot.part);
      expect(order.indexOf('rightLeg')).toBeGreaterThan(order.indexOf('torso'));
      expect(order.indexOf('leftLeg')).toBeGreaterThan(order.indexOf('torso'));
    }
    for (const { rightArm, leftArm } of samples(clip).map(solvePose)) {
      for (const arm of [rightArm, leftArm]) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(145);
    }
  });

  it('folds forward between straight legs spread wide on the floor, hands on the floor, in the pancake clips', () => {
    for (const clip of [PANCAKE_3D, ACTIVE_PANCAKE_3D]) {
      const skeletons = samples(clip).map(solvePose);
      const tall = skeletons[0];
      for (const { rightLeg, leftLeg, rightArm, leftArm } of skeletons) {
        // The legs never move: straight, heels on the floor, the same on both sides.
        [...rightLeg, ...leftLeg].forEach((joint, i) => expect(distance(joint, [...tall.rightLeg, ...tall.leftLeg][i])).toBeCloseTo(0));
        for (const leg of [rightLeg, leftLeg]) {
          expect(angleAt(leg[0], leg[1], leg[2])).toBeCloseTo(180);
          expect(leg[2][1]).toBeCloseTo(13);
          // Toes up.
          expect(leg[3][1] - leg[2][1]).toBeGreaterThan(40);
        }
        rightLeg.forEach((joint, i) => expect(distance(joint, [leftLeg[i][0], leftLeg[i][1], -leftLeg[i][2]])).toBeCloseTo(0));
        // Both hands stay on the floor between the legs, the arms short of locked out.
        for (const arm of [rightArm, leftArm]) {
          expect(arm[2][1]).toBeCloseTo(11);
          expect(Math.abs(arm[2][2])).toBeLessThan(40);
          expect(distance(arm[0], arm[2])).toBeLessThan(SKELETON.upperArm + SKELETON.forearm - 4);
        }
      }
      // Spread wide: about 100° between the legs.
      const between = angleAt(tall.rightLeg[2], tall.spine[0], tall.leftLeg[2]);
      expect(between).toBeGreaterThan(90);
      expect(between).toBeLessThan(110);
      // Sitting tall, the chest is over the hips; folded, it's well forward and down near the floor, hands far ahead.
      const folded = solvePose(clip.keyframes[clip.stillFrame].pose);
      const chest = (skeleton: Skeleton) => skeleton.spine[skeleton.spine.length - 1];
      expect(Math.abs(chest(tall)[0])).toBeLessThan(15);
      expect(chest(tall)[1]).toBeGreaterThan(140);
      expect(chest(folded)[0]).toBeGreaterThan(100);
      expect(chest(folded)[1]).toBeLessThan(70);
      expect(folded.rightArm[2][0] - tall.rightArm[2][0]).toBeGreaterThan(150);
    }
  });

  it('never swaps the near arm and the near leg over each other in the pancake clips', () => {
    // Sitting tall, the right arm comes down beside the right thigh from the camera. Close enough
    // to touch it, the two changed places as the hands set off, and the arm clipped under the leg.
    for (const clip of [PANCAKE_3D, ACTIVE_PANCAKE_3D]) {
      const view = viewOf(clip.camera);
      for (let t = 0; t <= durationOf(clip); t += 50) {
        const order = frameAt(clip, view, t).slots.map((slot) => slot.part);
        expect(order.indexOf('rightArm')).toBeLessThan(order.indexOf('rightLeg'));
      }
    }
  });

  it('walks the hands forward one at a time, the right one first, on the way into the pancake', () => {
    const skeletons = samples(PANCAKE_3D).map(solvePose);
    const lead = skeletons.map(({ rightArm, leftArm }) => rightArm[2][0] - leftArm[2][0]);
    // Each hand gets ahead of the other in turn, and neither ever moves back on the way down.
    expect(Math.max(...lead)).toBeGreaterThan(30);
    expect(Math.min(...lead)).toBeLessThan(-15);
    const start = skeletons[0];
    const firstMoved = (arm: 'rightArm' | 'leftArm') => skeletons.findIndex((skeleton) => skeleton[arm][2][0] - start[arm][2][0] > 1);
    expect(firstMoved('rightArm')).toBeLessThan(firstMoved('leftArm'));
    const hold = PANCAKE_3D.stillFrame;
    const down = PANCAKE_3D.keyframes.slice(0, hold + 1).map(({ pose }) => solvePose(pose));
    for (let i = 1; i < down.length; i++) {
      expect(down[i].rightArm[2][0]).toBeGreaterThanOrEqual(down[i - 1].rightArm[2][0] - 1e-6);
      expect(down[i].leftArm[2][0]).toBeGreaterThanOrEqual(down[i - 1].leftArm[2][0] - 1e-6);
    }
    // They end side by side.
    expect(down[hold].rightArm[2][0]).toBeCloseTo(down[hold].leftArm[2][0]);
  });

  it('goes deeper the second time in the active pancake', () => {
    const heights = samples(ACTIVE_PANCAKE_3D).map((pose) => solvePose(pose).head[1]);
    const half = Math.floor(heights.length / 2);
    const first = Math.min(...heights.slice(0, half));
    const second = Math.min(...heights.slice(half));
    expect(second).toBeLessThan(first - 15);
    // It sits back up tall in between.
    expect(Math.max(...heights.slice(half - 10, half + 10))).toBeCloseTo(heights[0]);
  });

  it('traces the path of the hand a clip trails, and nothing otherwise', () => {
    expect(stageClip(SHOULDER_EXTERNAL_ROTATION_3D).trail).toMatch(/^M[-\d. ]+(L[-\d. ]+)+$/);
    expect(stageClip(CAT_COW_3D).trail).toBe('');
    expect(stageClip(NINETY_TO_NINETY_ROTATIONS_3D).trail).toBe('');
  });

  it('draws a trail just under the limb that makes it, over the standing leg in leg swings', () => {
    expect(trailedPart(LEG_SWINGS_3D.trail)).toBe('rightLeg');
    expect(trailedPart(SHOULDER_ABDUCTION_3D.trail)).toBe('rightArm');
    expect(trailedPart(CAT_COW_3D.trail)).toBeUndefined();
    const view = viewOf(LEG_SWINGS_3D.camera);
    for (const pose of samples(LEG_SWINGS_3D)) {
      const order = traceFigure(solvePose(pose), view).slots.map((slot) => slot.part);
      expect(order.indexOf('leftLeg')).toBeLessThan(order.indexOf('rightLeg'));
    }
  });
  it('keeps the back knee planted while the hips shift forward past it, the chest upright, in knight stretch', () => {
    const poses = samples(KNIGHT_STRETCH_3D).map(solvePose);
    const [first] = poses;
    // Both knees start at 90°.
    expect(angleAt(first.rightLeg[0], first.rightLeg[1], first.rightLeg[2])).toBeCloseTo(90, 0);
    expect(angleAt(first.leftLeg[0], first.leftLeg[1], first.leftLeg[2])).toBeCloseTo(90, 0);
    for (const { leftLeg, rightLeg, spine } of poses) {
      expect(distance(leftLeg[1], first.leftLeg[1])).toBeLessThan(0.5);
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(tipped(spine[0], spine[spine.length - 1])).toBeLessThan(6);
    }
    const held = solvePose(KNIGHT_STRETCH_3D.keyframes[KNIGHT_STRETCH_3D.stillFrame].pose);
    // The back thigh has swung back behind the hip.
    expect(held.leftLeg[0][0] - held.leftLeg[1][0]).toBeGreaterThan(25);
    expect(new Set(drawOrders(KNIGHT_STRETCH_3D)).size).toBe(1);
  });

  it('sinks until the thighs are level with the knees out over the toes, feet planted wide, hands on the thighs, in horse stance', () => {
    const poses = samples(HORSE_STANCE_3D).map(solvePose);
    const [first] = poses;
    for (const { rightLeg, leftLeg } of poses) {
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
    }
    // About twice shoulder-width apart.
    expect(first.rightLeg[2][2] - first.leftLeg[2][2]).toBeGreaterThan(2.5 * SKELETON.shoulder * 2);
    const held = solvePose(HORSE_STANCE_3D.keyframes[HORSE_STANCE_3D.stillFrame].pose);
    for (const leg of [held.rightLeg, held.leftLeg]) {
      expect(leg[1][1]).toBeCloseTo(leg[0][1], 0);
      // The knee is ahead of the ankle and out past it, the way the toes point.
      expect(leg[1][0] - leg[2][0]).toBeGreaterThan(15);
      expect(Math.abs(leg[1][2])).toBeGreaterThan(Math.abs(leg[2][2]));
    }
    expect(tipped(held.spine[0], held.spine[held.spine.length - 1])).toBeLessThan(20);
    // The hands rest on top of the thighs, halfway along.
    for (const [arm, leg] of [[held.rightArm, held.rightLeg], [held.leftArm, held.leftLeg]]) {
      const middle = midpoint(leg[0], leg[1]);
      expect(distance(arm[2], [middle[0], middle[1] + 13, middle[2]])).toBeLessThan(1);
    }
  });

  it('drops both knees to one side and holds them there with the feet planted in the lying windshield wiper hold', () => {
    const poses = samples(LYING_WINDSHIELD_WIPER_HOLD_3D).map(solvePose);
    const [first] = poses;
    let [right, left] = [false, false];
    // Both knees fall the same way, one side only.
    for (const { rightLeg, leftLeg } of poses) {
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
      // Both knees go the same way.
      const shift = [rightLeg[1][2] - first.rightLeg[1][2], leftLeg[1][2] - first.leftLeg[1][2]];
      expect(Math.sign(Math.round(shift[0]))).toBe(Math.sign(Math.round(shift[1])));
      if (shift[0] > 60) right = true;
      if (shift[0] < -60) left = true;
    }
    expect([right, left]).toEqual([false, true]);
    expect(longestHold(LYING_WINDSHIELD_WIPER_HOLD_3D)).toBeGreaterThanOrEqual(3000);
  });

  it('keeps the knees planted wide with the shins parallel, and holds on the forearms with the hips sunk as deep as the rocks go, in the frog clips', () => {
    for (const clip of [FROG_STRETCH_3D, FROG_ROCKS_3D]) {
      const poses = samples(clip).map(solvePose);
      for (const { rightLeg, leftLeg, rightArm } of poses) {
        for (const leg of [rightLeg, leftLeg]) {
          expect(leg[1][1]).toBeCloseTo(13, 0);
          expect(Math.abs(leg[1][2])).toBeGreaterThan(65);
          expect(leg[2][2]).toBeCloseTo(leg[1][2], 0);
        }
        // The elbow never goes through the floor.
        expect(rightArm[1][1]).toBeGreaterThan(10);
      }
      expect(new Set(drawOrders(clip)).size).toBe(1);
    }
    const held = solvePose(FROG_STRETCH_3D.keyframes[FROG_STRETCH_3D.stillFrame].pose);
    expect(held.rightArm[1][1]).toBeCloseTo(11, 0);
    // Sunk back as deep as frog rocks goes.
    const deepestRock = Math.min(...samples(FROG_ROCKS_3D).map((pose) => solvePose(pose).spine[0][0]));
    expect(held.spine[0][0]).toBeCloseTo(deepestRock, 0);
    // The frog stretch is the rock held: the forearms stay planted all the way through.
    const poses = samples(FROG_STRETCH_3D).map(solvePose);
    for (const { rightArm } of poses) expect(distance(rightArm[2], poses[0].rightArm[2])).toBeLessThan(0.5);
    expect(longestHold(FROG_STRETCH_3D)).toBeGreaterThanOrEqual(3000);
  });

  it('rocks the hips from ahead of the knees to behind them with the forearms planted in frog rocks', () => {
    const poses = samples(FROG_ROCKS_3D).map(solvePose);
    const [first] = poses;
    for (const { rightArm } of poses) {
      expect(distance(rightArm[1], first.rightArm[1])).toBeLessThan(0.5);
      expect(distance(rightArm[2], first.rightArm[2])).toBeLessThan(0.5);
    }
    const hips = poses.map(({ spine }) => spine[0][0]);
    expect(Math.max(...hips)).toBeGreaterThan(20);
    expect(Math.min(...hips)).toBeLessThan(-30);
  });

  it('keeps the back knee planted as the hips go from ahead of it to behind it, folding over a straight front leg with the hands on the hips, in knight to hamstring', () => {
    const poses = samples(KNIGHT_TO_HAMSTRING_3D).map(solvePose);
    const [first] = poses;
    const backKnee = first.leftLeg[1];
    for (const { leftLeg, rightLeg } of poses) {
      expect(distance(leftLeg[1], backKnee)).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
      // The front heel stays on the floor.
      expect(rightLeg[2][1]).toBeCloseTo(first.rightLeg[2][1], 1);
    }
    const hips = poses.map(({ spine }) => spine[0][0] - backKnee[0]);
    expect(Math.max(...hips)).toBeGreaterThan(20);
    expect(Math.min(...hips)).toBeLessThan(-50);
    const folded = solvePose(KNIGHT_TO_HAMSTRING_3D.keyframes[KNIGHT_TO_HAMSTRING_3D.stillFrame].pose);
    // The front leg is straight and the body folds over it.
    expect(angleAt(folded.rightLeg[0], folded.rightLeg[1], folded.rightLeg[2])).toBeGreaterThan(165);
    expect(tipped(folded.spine[0], folded.spine[folded.spine.length - 1])).toBeGreaterThan(50);
    // The hands stay on the waist the whole way, folding with the body.
    for (const { spine, rightArm, leftArm } of poses) {
      expect(distance(rightArm[2], spine[0])).toBeCloseTo(distance(first.rightArm[2], first.spine[0]), -0.5);
      expect(distance(leftArm[2], spine[0])).toBeCloseTo(distance(first.leftArm[2], first.spine[0]), -0.5);
    }
    expect(new Set(drawOrders(KNIGHT_TO_HAMSTRING_3D)).size).toBe(1);
  });

  it('keeps the back shin straight up the wall and the front foot planted while the chest lifts from the hands on the floor to upright with them on the front thigh, in the couch stretch', () => {
    const poses = samples(COUCH_STRETCH_3D).map(solvePose);
    const [first] = poses;
    const wall = COUCH_STRETCH_3D.scenery![0].to[0];
    for (const { leftLeg, rightLeg } of poses) {
      expect(distance(leftLeg[1], first.leftLeg[1])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(tipped(leftLeg[1], leftLeg[2])).toBeLessThan(1);
      // Against the wall, not through it.
      expect(leftLeg[1][0] - wall).toBeGreaterThan(10);
      expect(leftLeg[1][0] - wall).toBeLessThan(16);
    }
    const upright = solvePose(COUCH_STRETCH_3D.keyframes[COUCH_STRETCH_3D.stillFrame].pose);
    expect(tipped(upright.spine[0], upright.spine[upright.spine.length - 1])).toBeLessThan(8);
    // The back knee is bent to 145°, and the front shin is upright.
    expect(angleAt(upright.leftLeg[0], upright.leftLeg[1], upright.leftLeg[2])).toBeCloseTo(35, 0);
    expect(tipped(upright.rightLeg[2], upright.rightLeg[1])).toBeLessThan(1);
    // Leaning in, the hands are on the floor either side of the front foot; upright, they rest on top of the front thigh.
    for (const hand of [first.rightArm[2], first.leftArm[2]]) expect(hand[1]).toBeCloseTo(11, 0);
    expect(first.rightArm[2][2]).toBeGreaterThan(first.rightLeg[2][2]);
    expect(first.leftArm[2][2]).toBeLessThan(first.rightLeg[2][2]);
    const [hip, knee] = upright.rightLeg;
    for (const hand of [upright.rightArm[2], upright.leftArm[2]]) {
      expect(hand[1]).toBeGreaterThan(Math.max(hip[1], knee[1]));
      expect(hand[0]).toBeGreaterThan(hip[0]);
      expect(hand[0]).toBeLessThan(knee[0]);
      expect(Math.abs(hand[2] - knee[2])).toBeLessThan(12);
    }
    expect(longestHold(COUCH_STRETCH_3D)).toBeGreaterThanOrEqual(3000);
    expect(new Set(drawOrders(COUCH_STRETCH_3D)).size).toBe(1);
  });

  it('keeps both legs straight and the feet a long step apart while the hanging arms reach down to the front shin, in the pyramid stretch', () => {
    const poses = samples(PYRAMID_STRETCH_3D).map(solvePose);
    const [first] = poses;
    expect(first.rightLeg[2][0] - first.leftLeg[2][0]).toBeGreaterThan(SKELETON.thigh + SKELETON.shin - 20);
    for (const { rightLeg, leftLeg, spine } of poses) {
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      for (const leg of [rightLeg, leftLeg]) expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(165);
    }
    const folded = solvePose(PYRAMID_STRETCH_3D.keyframes[PYRAMID_STRETCH_3D.stillFrame].pose);
    expect(tipped(folded.spine[0], folded.spine[folded.spine.length - 1])).toBeGreaterThan(75);
    // The hands rest either side of the front shin.
    const [, knee, ankle] = folded.rightLeg;
    for (const hand of [folded.rightArm[2], folded.leftArm[2]]) {
      expect(hand[1]).toBeLessThan(knee[1]);
      expect(hand[1]).toBeGreaterThan(ankle[1]);
      expect(Math.abs(hand[2] - knee[2])).toBeGreaterThan(12);
    }
    // Standing, the arms hang straight down by the sides.
    for (const arm of [first.rightArm, first.leftArm]) {
      expect(fromHanging(arm[0], arm[2])).toBeLessThan(5);
      expect(Math.abs(arm[2][2])).toBeGreaterThan(Math.abs(arm[0][2]));
    }
    expect(longestHold(PYRAMID_STRETCH_3D)).toBeGreaterThanOrEqual(3000);
    // The far arm goes from behind the far leg to in front of it, and only where the two are well
    // apart on the screen.
    const view = viewOf(PYRAMID_STRETCH_3D.camera);
    const orders = drawOrders(PYRAMID_STRETCH_3D);
    expect(new Set(orders).size).toBe(2);
    orders.forEach((order, i) => {
      if (i === 0 || order === orders[i - 1]) return;
      const skeleton = solvePose(poseAt3(PYRAMID_STRETCH_3D, i * 10));
      const seen = (points: readonly Vec3[]) => points.map((point) => project(view, point));
      expect(boneGap(seen(skeleton.leftArm), seen(skeleton.leftLeg))).toBeGreaterThan(40);
    });
  });

  it('rocks the shoulders from ahead of the planted hands to behind them with the arms straight, the hands lifting one at a time to turn out partway, in wrist rocks', () => {
    const samplePoses = samples(WRIST_ROCKS_3D);
    const poses = samplePoses.map(solvePose);
    const [first] = poses;
    const floor = first.rightArm[2][1];
    let [ahead, behind, lifted] = [false, false, false];
    poses.forEach(({ rightArm, leftArm, rightLeg, leftLeg, spine }, i) => {
      // The hands only ever go straight up off their spots, never sliding along the floor.
      for (const [arm, start] of [[rightArm, first.rightArm], [leftArm, first.leftArm]]) {
        expect(Math.hypot(arm[2][0] - start[2][0], arm[2][2] - start[2][2])).toBeLessThan(0.5);
      }
      expect(distance(rightLeg[1], first.rightLeg[1])).toBeLessThan(0.5);
      expect(distance(leftLeg[1], first.leftLeg[1])).toBeLessThan(0.5);
      const up = [rightArm[2][1] - floor, leftArm[2][1] - floor];
      // Never both hands off the floor at once.
      expect(Math.min(...up)).toBeLessThan(0.5);
      if (Math.max(...up) > 0.5) {
        lifted = true;
        // The body stays still over the planted hand while the other turns.
        expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      }
      // A hand on the floor keeps its arm straight, and only turns while it's lifted.
      for (const [arm, hand, height] of [[rightArm, samplePoses[i].pins!.rightHand!, up[0]], [leftArm, samplePoses[i].pins!.leftHand!, up[1]]] as const) {
        if (height > 0.5) continue;
        expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(165);
        const [x, , z] = hand.toward!;
        expect(Math.abs(x) > 0.99 || Math.abs(z) > 0.99).toBe(true);
      }
      if (rightArm[0][0] - rightArm[2][0] > 25) ahead = true;
      if (rightArm[0][0] - rightArm[2][0] < -25) behind = true;
    });
    expect([ahead, behind, lifted]).toEqual([true, true, true]);
    // The fingers point forward for one rock and out to the sides for the next.
    const fingers = samplePoses.map((pose) => pose.pins!.rightHand!.toward!);
    expect(fingers.some(([x]) => x > 0.99)).toBe(true);
    expect(fingers.some(([x, , z]) => x < 0.01 && z > 0.99)).toBe(true);
    expect(new Set(drawOrders(WRIST_ROCKS_3D)).size).toBe(1);
  });

  it('bends one knee with its heel lifting while the other leg is straight with its heel down, folded with the hands on the floor, in the elephant walk', () => {
    const poses = samples(ELEPHANT_WALK_3D).map(solvePose);
    const [first] = poses;
    const ankleY = Math.min(first.rightLeg[2][1], first.leftLeg[2][1]);
    for (const { spine, rightArm, leftArm, rightLeg, leftLeg } of poses) {
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      expect(rightArm[2][1]).toBeCloseTo(11, 0);
      expect(leftArm[2][1]).toBeCloseTo(11, 0);
      // The toes stay planted, the foot pivoting on them.
      for (const [leg, start] of [[rightLeg, first.rightLeg], [leftLeg, first.leftLeg]]) expect(distance(leg[3], start[3])).toBeLessThan(0.5);
    }
    for (const [bent, straight] of [[poses[0].rightLeg, poses[0].leftLeg], [solvePose(ELEPHANT_WALK_3D.keyframes[12].pose).leftLeg, solvePose(ELEPHANT_WALK_3D.keyframes[12].pose).rightLeg]]) {
      expect(angleAt(bent[0], bent[1], bent[2])).toBeLessThan(140);
      expect(bent[2][1] - ankleY).toBeGreaterThan(15);
      expect(angleAt(straight[0], straight[1], straight[2])).toBeGreaterThan(165);
      expect(straight[2][1]).toBeCloseTo(ankleY, 1);
    }
    expect(new Set(drawOrders(ELEPHANT_WALK_3D)).size).toBe(1);
  });

  it('leans sideways over the right leg with the left arm overhead and the right hand inside the knee, sitting in the straddle, in the seated straddle side bend', () => {
    const poses = samples(SEATED_STRADDLE_SIDE_BEND_3D).map(solvePose);
    const [first] = poses;
    for (const { spine, rightLeg, leftLeg } of poses) {
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
    }
    const over = solvePose(SEATED_STRADDLE_SIDE_BEND_3D.keyframes[SEATED_STRADDLE_SIDE_BEND_3D.stillFrame].pose);
    const top = over.spine[over.spine.length - 1];
    // The chest has gone over to the right, and the left hand is above the head.
    expect(top[2] - over.spine[0][2]).toBeGreaterThan(30);
    expect(over.leftArm[2][1]).toBeGreaterThan(over.head[1]);
    expect(over.rightArm[2][1]).toBeCloseTo(11, 0);
    expect(over.rightArm[2][2]).toBeLessThan(over.rightLeg[1][2]);
    expect(longestHold(SEATED_STRADDLE_SIDE_BEND_3D)).toBeGreaterThanOrEqual(3000);
    // Parts change places only where they're well clear of each other on the screen.
    const view = viewOf(SEATED_STRADDLE_SIDE_BEND_3D.camera);
    const orders = drawOrders(SEATED_STRADDLE_SIDE_BEND_3D).map((order) => order.split(' '));
    orders.forEach((order, i) => {
      if (i === 0) return;
      const skeleton = solvePose(poseAt3(SEATED_STRADDLE_SIDE_BEND_3D, i * 10));
      const seen = (part: string) => (part === 'head' ? [skeleton.head, skeleton.head] : part === 'torso' ? skeleton.spine : skeleton[part as 'rightArm']).map((point) => project(view, point));
      for (const a of order) {
        for (const b of order) {
          const swapped = order.indexOf(a) < order.indexOf(b) && orders[i - 1].indexOf(a) > orders[i - 1].indexOf(b);
          if (swapped) expect(boneGap(seen(a), seen(b))).toBeGreaterThan(45);
        }
      }
    });
  });

  it('lifts the hips off the floor to move them forward away from the hands, sits down in the stretch, and lifts again to go back, the knees bent and the hands and feet planted, in the seated shoulder extension', () => {
    const poses = samples(SEATED_SHOULDER_EXTENSION_3D).map(solvePose);
    const [first] = poses;
    const floor = first.spine[0][1];
    let lifted = false;
    for (const { spine, rightArm, leftArm, rightLeg, leftLeg } of poses) {
      expect(distance(rightArm[2], first.rightArm[2])).toBeLessThan(0.5);
      expect(distance(leftArm[2], first.leftArm[2])).toBeLessThan(0.5);
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
      expect(angleAt(rightArm[0], rightArm[1], rightArm[2])).toBeGreaterThan(170);
      // The knees stay bent, pointing up.
      expect(angleAt(rightLeg[0], rightLeg[1], rightLeg[2])).toBeLessThan(110);
      expect(rightLeg[1][1]).toBeGreaterThan(rightLeg[0][1]);
      // The hips are either down on the floor where they sit or lifted clear of it: they only move
      // forward or back while they're up, never dragging along the floor.
      const height = spine[0][1] - floor;
      expect(height).toBeGreaterThan(-0.5);
      if (height > 10) lifted = true;
      // Only just off the floor, not pressed up.
      expect(height).toBeLessThan(20);
    }
    expect(lifted).toBe(true);
    for (let i = 1; i < poses.length; i++) {
      const moved = Math.abs(poses[i].spine[0][0] - poses[i - 1].spine[0][0]);
      if (moved > 0.5) expect(Math.min(poses[i].spine[0][1], poses[i - 1].spine[0][1]) - floor).toBeGreaterThan(1);
    }
    const forward = solvePose(SEATED_SHOULDER_EXTENSION_3D.keyframes[SEATED_SHOULDER_EXTENSION_3D.stillFrame].pose);
    expect(forward.spine[0][0] - first.spine[0][0]).toBeGreaterThan(45);
    expect(forward.spine[0][1]).toBeCloseTo(floor, 1);
    // The arms reach further back behind the body: the hands are further behind the shoulders.
    expect(forward.rightArm[0][0] - forward.rightArm[2][0]).toBeGreaterThan(first.rightArm[0][0] - first.rightArm[2][0] + 20);
    expect(SEATED_SHOULDER_EXTENSION_3D.keyframes[0].pose.pins!.rightHand!.toward![0]).toBe(-1);
    expect(longestHold(SEATED_SHOULDER_EXTENSION_3D)).toBeGreaterThanOrEqual(3000);
    expect(new Set(drawOrders(SEATED_SHOULDER_EXTENSION_3D)).size).toBe(1);
  });

  it('keeps the side leg straight with its foot planted and the knee and hands planted while the hips rock back, in the half kneeling frog stretch', () => {
    const poses = samples(HALF_KNEELING_FROG_STRETCH_3D).map(solvePose);
    const [first] = poses;
    for (const { rightLeg, leftLeg, rightArm, leftArm } of poses) {
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(angleAt(rightLeg[0], rightLeg[1], rightLeg[2])).toBeGreaterThan(170);
      expect(distance(leftLeg[1], first.leftLeg[1])).toBeLessThan(0.5);
      expect(distance(rightArm[2], first.rightArm[2])).toBeLessThan(0.5);
      expect(distance(leftArm[2], first.leftArm[2])).toBeLessThan(0.5);
      expect(angleAt(rightArm[0], rightArm[1], rightArm[2])).toBeGreaterThan(165);
    }
    // The leg lies out to the side, and the hips rock back behind the knee.
    expect(first.rightLeg[2][2]).toBeGreaterThan(150);
    const hips = poses.map(({ spine }) => spine[0][0] - first.leftLeg[1][0]);
    expect(Math.max(...hips)).toBeGreaterThan(10);
    expect(Math.min(...hips)).toBeLessThan(-55);
    expect(new Set(drawOrders(HALF_KNEELING_FROG_STRETCH_3D)).size).toBe(1);
  });

  it('rests the right hand on top of the head with the elbow out behind it while the head tilts toward the raised shoulder and the left arm reaches down, in the neck side stretch', () => {
    const poses = samples(NECK_SIDE_STRETCH_3D).map(solvePose);
    const [first] = poses;
    for (const { spine, rightLeg, leftLeg } of poses) {
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
    }
    const held = solvePose(NECK_SIDE_STRETCH_3D.keyframes[NECK_SIDE_STRETCH_3D.stillFrame].pose);
    const neckBase = held.spine[held.spine.length - 1];
    // The head has gone over toward the right shoulder, the body staying upright.
    expect(held.head[2] - neckBase[2]).toBeGreaterThan(25);
    expect(tipped(held.spine[0], neckBase)).toBeLessThan(2);
    // The hand rests on top of the head, just off it.
    expect(distance(held.rightArm[2], held.head)).toBeCloseTo(SKELETON.head + 4, 0);
    expect(held.rightArm[2][1]).toBeGreaterThan(held.head[1]);
    // The elbow is out behind the head, clear of the face.
    expect(held.rightArm[1][0]).toBeLessThan(held.head[0] - 10);
    // The right shoulder lifts with the arm and the left drops as its hand reaches down.
    expect(held.rightArm[0][1]).toBeGreaterThan(first.rightArm[0][1] + 5);
    expect(held.leftArm[0][1]).toBeLessThan(first.leftArm[0][1] - 5);
    expect(held.leftArm[2][1]).toBeLessThan(first.leftArm[2][1]);
    expect(longestHold(NECK_SIDE_STRETCH_3D)).toBeGreaterThanOrEqual(3000);
    // The arm is behind the head and its hand over it the whole way, and the reaching arm over the
    // torso. The arms only change places with each other, on opposite sides of the body.
    const orders = drawOrders(NECK_SIDE_STRETCH_3D).map((order) => order.split(' '));
    for (const order of orders) {
      const at = (part: string) => order.indexOf(part);
      expect(at('rightArm')).toBeLessThan(at('head'));
      // The hand drawn again on its own comes in as 'rightArm hand', the last 'hand'.
      expect(at('head')).toBeLessThan(order.lastIndexOf('hand'));
      expect(at('torso')).toBeLessThan(at('leftArm'));
    }
    expect(new Set(orders.map((order) => order.filter((part) => part !== 'leftArm').join(' '))).size).toBe(1);
  });

  /** Standing still: the pelvis and both feet stay where they are all the way through. */
  function standsStill(clip: Clip3D) {
    const poses = samples(clip).map(solvePose);
    const [first] = poses;
    for (const { spine, rightLeg, leftLeg } of poses) {
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
    }
    return first;
  }

  it('brings a straight arm across the chest at shoulder height to rest in the crook of the other elbow, which pulls it in, the shoulder kept down, in the cross-body shoulder stretch', () => {
    const clip = CROSS_BODY_SHOULDER_STRETCH_3D;
    const first = standsStill(clip);
    const pulled = solvePose(clip.keyframes[clip.stillFrame].pose);
    const held = solvePose(clip.keyframes[0].pose);
    for (const skeleton of [held, pulled]) {
      const [shoulder, , wrist] = skeleton.rightArm;
      const [leftShoulder, leftElbow, leftWrist] = skeleton.leftArm;
      // Straight, level with the shoulder, and reaching past the other shoulder.
      expect(distance(shoulder, wrist)).toBeGreaterThan(SKELETON.upperArm + SKELETON.forearm - 1);
      expect(Math.abs(wrist[1] - shoulder[1])).toBeLessThan(5);
      expect(wrist[2]).toBeLessThan(leftShoulder[2]);
      // It rests in the crook of the left elbow: the elbow just under it, the upper arm going back
      // to its shoulder on the chest side of it, and the forearm standing up in front of it.
      const arm = unitBetween(shoulder, wrist);
      const front: Vec3 = [-arm[2], 0, arm[0]];
      const offset = (point: Vec3) => {
        const from: Vec3 = [point[0] - shoulder[0], point[1] - shoulder[1], point[2] - shoulder[2]];
        const along = from[0] * arm[0] + from[1] * arm[1] + from[2] * arm[2];
        const off: Vec3 = [from[0] - arm[0] * along, from[1] - arm[1] * along, from[2] - arm[2] * along];
        return { out: off[0] * front[0] + off[2] * front[2], up: off[1], gap: Math.hypot(...off) };
      };
      expect(offset(leftElbow).gap).toBeGreaterThan(15);
      expect(offset(leftElbow).gap).toBeLessThan(25);
      expect(offset(leftElbow).up).toBeLessThan(-12);
      expect(Math.abs(offset(leftElbow).out)).toBeLessThan(20);
      expect(offset(leftShoulder).out).toBeLessThan(-20);
      // Where the forearm passes the right arm's height it's in front of it, clear of it.
      const rise = -offset(leftElbow).up / (offset(leftWrist).up - offset(leftElbow).up);
      const passing = offset(leftElbow).out + (offset(leftWrist).out - offset(leftElbow).out) * rise;
      expect(passing).toBeGreaterThan(19);
      expect(offset(leftWrist).up).toBeGreaterThan(SKELETON.forearm / 2);
      // The shoulder stays down, away from the ear.
      expect(shoulder[1]).toBeLessThanOrEqual(first.rightArm[0][1]);
    }
    // The pull brings the arm further across and in toward the chest.
    expect(pulled.rightArm[2][2]).toBeLessThan(held.rightArm[2][2] - 10);
    expect(pulled.rightArm[1][0]).toBeLessThan(held.rightArm[1][0]);
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    // The left arm is behind the right one, as its upper arm is, and its forearm and hand are drawn
    // again over it; the arms never swap.
    for (const order of drawOrders(clip).map((parts) => parts.split(' '))) {
      expect(order.indexOf('leftArm')).toBeLessThan(order.indexOf('rightArm'));
      expect(order.indexOf('rightArm')).toBeLessThan(order.lastIndexOf('hand'));
    }
  });

  it('folds the raised arm so the hand drops behind the neck, the elbow at the ceiling, while the other hand draws that elbow back and in, in the overhead triceps stretch', () => {
    const clip = OVERHEAD_TRICEPS_STRETCH_3D;
    standsStill(clip);
    const pulled = solvePose(clip.keyframes[clip.stillFrame].pose);
    const held = solvePose(clip.keyframes[clip.stillFrame - 1].pose);
    for (const skeleton of [held, pulled]) {
      const [, elbow, wrist] = skeleton.rightArm;
      const neckBase = skeleton.spine[skeleton.spine.length - 1];
      // The elbow points up past the top of the head, and the hand hangs behind the neck.
      expect(elbow[1]).toBeGreaterThan(skeleton.head[1] + SKELETON.head - 5);
      expect(wrist[0]).toBeLessThan(neckBase[0] - 25);
      expect(wrist[1]).toBeLessThan(skeleton.head[1]);
      expect(wrist[1]).toBeGreaterThan(neckBase[1] - 20);
      expect(Math.abs(wrist[2])).toBeLessThan(15);
      // The left hand has hold of the elbow.
      expect(distance(skeleton.leftArm[2], elbow)).toBeLessThan(30);
    }
    // The pull draws the elbow back and in toward the head.
    expect(pulled.rightArm[1][2]).toBeLessThan(held.rightArm[1][2] - 5);
    expect(pulled.rightArm[1][0]).toBeLessThan(held.rightArm[1][0]);
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    // Seen from behind, the raised arm is in front of the head wherever they overlap.
    for (const order of drawOrders(clip).map((parts) => parts.split(' '))) {
      expect(order.indexOf('head')).toBeLessThan(order.indexOf('rightArm'));
    }
  });

  it('links the hands between the shoulder blades, the top elbow at the ceiling and the bottom one at the floor, in cow face arms', () => {
    const clip = COW_FACE_ARMS_3D;
    standsStill(clip);
    const linked = solvePose(clip.keyframes[clip.stillFrame].pose);
    const [, topElbow, topWrist, topFingers] = linked.rightArm;
    const [leftShoulder, bottomElbow, bottomWrist, bottomFingers] = linked.leftArm;
    expect(topElbow[1]).toBeGreaterThan(linked.head[1] + 20);
    expect(bottomElbow[1]).toBeLessThan(leftShoulder[1] - 50);
    // Both hands are on the back, the top one above, their fingers hooked past each other.
    expect(topWrist[0]).toBeLessThan(-25);
    expect(bottomWrist[0]).toBeLessThan(-25);
    expect(topWrist[1]).toBeGreaterThan(bottomWrist[1]);
    expect(topFingers[1]).toBeLessThan(bottomFingers[1]);
    expect(distance(topWrist, bottomWrist)).toBeLessThan(2 * SKELETON.hand + 5);
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    // The top arm is in front of the head the whole way, and once the bottom hand is on the back,
    // over the torso, it's over the top one.
    const orders = drawOrders(clip).map((parts) => parts.split(' '));
    for (const order of orders) {
      expect(order.indexOf('head')).toBeLessThan(order.indexOf('rightArm'));
      if (order.indexOf('leftArm') > order.indexOf('torso')) expect(order.indexOf('rightArm')).toBeLessThan(order.indexOf('leftArm'));
    }
    expect(orders.filter((order) => order.indexOf('leftArm') > order.indexOf('torso')).length).toBeGreaterThan(orders.length / 2);
  });

  it.each([
    ['extensor', MANUAL_EXTENSOR_FOREARM_STRETCH_3D, 80],
    ['flexor', MANUAL_FLEXOR_FOREARM_STRETCH_3D, 70],
  ] as const)('holds the arm straight out in front while the other hand bends the wrist down, in the manual %s forearm stretch', (grip, clip, bend) => {
    standsStill(clip);
    const held = solvePose(clip.keyframes[clip.stillFrame].pose);
    const [shoulder, elbow, wrist, fingertips] = held.rightArm;
    // Straight out in front at shoulder height.
    expect(angleAt(shoulder, elbow, wrist)).toBeGreaterThan(178);
    expect(Math.abs(wrist[1] - shoulder[1])).toBeLessThan(2);
    expect(wrist[0] - shoulder[0]).toBeGreaterThan(140);
    // The wrist bends down this far from the line of the forearm.
    expect(180 - angleAt(elbow, wrist, fingertips)).toBeCloseTo(bend, 0);
    expect(fingertips[1]).toBeLessThan(wrist[1] - 20);
    // The other hand lies against the front of the bent hand, the back of it (extensor) or the
    // palm (flexor), pointing the same way as the stretched hand's fingers.
    const [, , leftWrist, leftFingertips] = held.leftArm;
    const hand = midpoint(wrist, fingertips);
    const otherHand = midpoint(leftWrist, leftFingertips);
    // Only the thumb tells the two apart. The arm comes up level with the thumb at the ceiling, and
    // then the hand turns: palm up, the thumb lies over the front of the hand toward the camera, all
    // through the bend and the hold; palm down, the hand hides it. The other hand has none.
    const thumbUp = samples(clip).map(solvePose).some((skeleton) => {
      const [, , at] = skeleton.rightArm;
      return Math.abs(at[1] - shoulder[1]) < 3 && thumbPoints(skeleton.rightArm, skeleton.rightPalm!, 1)[1][1] > at[1] + 15;
    });
    expect(thumbUp).toBe(true);
    const view = viewOf(clip.camera);
    const bent = clip.keyframes.slice(1, clip.stillFrame + 1).reduce((total, frame) => total + frame.ms, 0);
    for (let t = bent - 900; t <= bent + 3000; t += 10) {
      const thumb = frameAt(clip, view, t).slots.filter((slot) => slot.part === 'rightArm' && slot.hand).pop()!;
      expect(thumb.d !== '').toBe(grip === 'flexor');
    }
    expect(held.leftPalm).toBeUndefined();
    // The hand with the thumb has its fingers drawn too, three lines splitting it into four, which
    // turn with it: spread across it with the back of the hand to the camera and the thumb up, and
    // gone in the hold, where the hand is edge on and the fingers are one behind the other.
    const fingersAt = (t: number) => frameAt(clip, view, t).slots.find((slot) => slot.part === 'rightArm' && !slot.hand)!.fingers;
    const thumbUpAt = samples(clip).findIndex((pose) => {
      const skeleton = solvePose(pose);
      return Math.abs(skeleton.rightArm[2][1] - shoulder[1]) < 3 && thumbPoints(skeleton.rightArm, skeleton.rightPalm!, 1)[1][1] > skeleton.rightArm[2][1] + 15;
    });
    expect(fingersAt(thumbUpAt * 50).match(/M/g)).toHaveLength(3);
    expect(fingersAt(bent)).toBe('');
    // The left arm moves smoothly: no jolts, and never pulled straight reaching for a hand just out
    // of reach. Pinned from hanging, its elbow lurched back as the hand set off; and holding the
    // fingertips mid-bend, the arm hit its full length and let go again.
    let last: Vec3 | undefined;
    let lastStep: number | undefined;
    for (let t = 0; t <= durationOf(clip); t += 10) {
      const [leftShoulder, leftElbow, leftHand] = solvePose(poseAt3(clip, t)).leftArm;
      if (t > 1000 && t < durationOf(clip) - 1000) expect(distance(leftShoulder, leftHand)).toBeLessThan(149.7);
      if (last) {
        const step = distance(last, leftElbow);
        if (lastStep !== undefined) expect(Math.abs(step - lastStep)).toBeLessThan(0.5);
        lastStep = step;
      }
      last = leftElbow;
    }
    expect(distance(hand, otherHand)).toBeLessThan(20);
    expect(otherHand[0]).toBeGreaterThan(hand[0] + 12);
    expect(angleAt(leftFingertips, leftWrist, [leftWrist[0] + fingertips[0] - wrist[0], leftWrist[1] + fingertips[1] - wrist[1], leftWrist[2] + fingertips[2] - wrist[2]])).toBeLessThan(10);
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    // The left arm is on the far side of the right one all the way, its hand rising behind it.
    for (const order of drawOrders(clip).map((parts) => parts.split(' '))) {
      expect(order.indexOf('leftArm')).toBeLessThan(order.indexOf('rightArm'));
    }
  });

  it('stretches the back leg straight behind from all fours, then brings the front knee forward behind the wrist with the shin across, and folds forward onto the forearms, in the pigeon stretch', () => {
    const clip = PIGEON_STRETCH_3D;
    const first = solvePose(clip.keyframes[0].pose);
    // The hands stay planted from all fours until the body folds forward.
    const upAt = clip.keyframes.findIndex((frame, i) => i > 1 && frame.ms === 600);
    const settingUp = samples({ ...clip, keyframes: clip.keyframes.slice(0, upAt + 1) }).map(solvePose);
    for (const { rightArm, leftArm, rightLeg } of settingUp) {
      expect(distance(rightArm[2], first.rightArm[2])).toBeLessThan(0.5);
      expect(distance(leftArm[2], first.leftArm[2])).toBeLessThan(0.5);
      // The right foot comes off the floor on its way forward, rather than dragging through the left leg.
      expect(rightLeg[2][1]).toBeGreaterThanOrEqual(12.5);
    }
    // The back leg is straight before the front knee leaves the floor.
    const kneeLifts = settingUp.find(({ rightLeg }) => rightLeg[1][1] > 16)!;
    expect(angleAt(kneeLifts.leftLeg[0], kneeLifts.leftLeg[1], kneeLifts.leftLeg[2])).toBeGreaterThan(170);
    const folded = solvePose(clip.keyframes[clip.stillFrame].pose);
    const [rightHip, frontKnee, frontAnkle] = folded.rightLeg;
    const [leftHip, backKnee, backAnkle] = folded.leftLeg;
    // The front knee rests on the floor behind the right wrist's starting spot, and the shin lies
    // across in front of the hips, the foot toward the left hip.
    expect(frontKnee[1]).toBeLessThan(15);
    expect(frontAnkle[1]).toBeLessThan(15);
    expect(frontKnee[0]).toBeLessThan(first.rightArm[2][0]);
    expect(frontKnee[2]).toBeGreaterThan(rightHip[2]);
    expect(frontAnkle[2]).toBeLessThan(leftHip[2]);
    expect(frontAnkle[0]).toBeGreaterThan(leftHip[0]);
    // The back leg lies straight behind, the knee down.
    expect(angleAt(leftHip, backKnee, backAnkle)).toBeGreaterThan(170);
    expect(backAnkle[0]).toBeLessThan(leftHip[0] - 180);
    expect(backKnee[1]).toBeLessThan(30);
    // The hips are square and low, and the forearms are flat on the floor in front of the shin.
    expect(rightHip[0]).toBeCloseTo(leftHip[0], 0);
    expect(folded.spine[0][1]).toBeLessThan(50);
    for (const [, elbow, wrist] of [folded.rightArm, folded.leftArm]) {
      expect(elbow[1]).toBeLessThan(15);
      expect(wrist[1]).toBeCloseTo(11, 0);
      expect(elbow[0]).toBeGreaterThan(frontKnee[0]);
    }
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    expect(new Set(drawOrders(clip)).size).toBe(1);
  });

  it('lifts one knee off the floor and circles it forward, out to the side and back, then the other way round, the rest of the body still, in hip circles', () => {
    const clip = HIP_CIRCLES_3D;
    const poses = samples(clip).map(solvePose);
    const [first] = poses;
    const hip = first.rightLeg[0];
    for (const { spine, rightArm, leftArm, leftLeg, rightLeg } of poses) {
      // The torso, the hands and the other knee stay put.
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      expect(distance(spine[spine.length - 1], first.spine[first.spine.length - 1])).toBeLessThan(0.5);
      expect(distance(rightArm[2], first.rightArm[2])).toBeLessThan(0.5);
      expect(distance(leftArm[2], first.leftArm[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[1], first.leftLeg[1])).toBeLessThan(0.5);
      // The foot never goes into the floor.
      expect(rightLeg[2][1]).toBeGreaterThanOrEqual(12.5);
    }
    // Kneeling to start with.
    expect(first.rightLeg[1][1]).toBeLessThan(15);
    // Circling, the knee stays off the floor and reaches well forward of the hip, out to the side
    // and back behind it.
    const circling = samples({ ...clip, keyframes: clip.keyframes.slice(8, 8 + 72) }).map(solvePose);
    const knees = circling.map(({ rightLeg }) => rightLeg[1]);
    for (const knee of knees) expect(knee[1]).toBeGreaterThan(18);
    expect(Math.max(...knees.map((knee) => knee[0] - hip[0]))).toBeGreaterThan(50);
    expect(Math.min(...knees.map((knee) => knee[0] - hip[0]))).toBeLessThan(-40);
    expect(Math.max(...knees.map((knee) => knee[2] - hip[2]))).toBeGreaterThan(80);
    // Out to the side the thigh is nearly level.
    const out = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(out.rightLeg[1][1]).toBeGreaterThan(hip[1] - 45);
    // Going round the other way, the knee slows to a stop at the bottom rather than snapping back:
    // it moves far less in the 100ms either side of the turn than in the middle of a circle.
    let turnAt = 0;
    for (let i = 1; i <= 8 + 36; i++) turnAt += clip.keyframes[i].ms;
    const kneeAt = (t: number) => solvePose(poseAt3(clip, t)).rightLeg[1];
    const atTurn = distance(kneeAt(turnAt - 100), kneeAt(turnAt + 100));
    const midCircle = distance(kneeAt(turnAt - 1700), kneeAt(turnAt - 1500));
    expect(atTurn).toBeLessThan(midCircle / 4);
    // One order all the way through, the head over the neck it hides from behind.
    const orders = new Set(drawOrders(clip));
    expect(orders.size).toBe(1);
    const [order] = [...orders].map((o) => o.split(' '));
    expect(order.indexOf('torso')).toBeLessThan(order.indexOf('head'));
  });

  it('starts leaning back on the hands with both legs straight, draws one foot in against the other inner thigh with the knee out, and folds forward to hold the straight foot from either side, in the Breakdancer', () => {
    const clip = THE_BREAKDANCER_3D;
    const poses = samples(clip).map(solvePose);
    const [first] = poses;
    for (const { spine, rightLeg } of poses) {
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      for (let i = 0; i < 3; i++) expect(distance(rightLeg[i], first.rightLeg[i])).toBeLessThan(0.5);
    }
    // Both legs straight to start with, leaning back on the hands, planted on the floor behind the hips.
    for (const leg of [first.rightLeg, first.leftLeg]) expect(angleAt(leg[0], leg[1], leg[2])).toBeGreaterThan(175);
    const neckBase = first.spine[first.spine.length - 1];
    expect(neckBase[0]).toBeLessThan(first.spine[0][0] - 20);
    for (const [, , wrist] of [first.rightArm, first.leftArm]) {
      expect(wrist[1]).toBeCloseTo(11, 0);
      expect(wrist[0]).toBeLessThan(first.spine[0][0] - 40);
    }
    // The hands stay planted while the leg is still well short of bent in; once bent, the leg stays
    // put through the fold.
    const bent = solvePose(clip.keyframes[clip.stillFrame].pose);
    for (const frame of clip.keyframes.slice(0, clip.stillFrame)) {
      const skeleton = solvePose(frame.pose);
      if (distance(skeleton.leftLeg[2], bent.leftLeg[2]) < 20) continue;
      expect(distance(skeleton.rightArm[2], first.rightArm[2])).toBeLessThan(0.5);
      expect(distance(skeleton.leftArm[2], first.leftArm[2])).toBeLessThan(0.5);
    }
    // The bend runs straight on into the reach, with no pause between: every keyframe from the start
    // of the bend to the fold is a new pose.
    for (let i = 2; i <= clip.stillFrame - 1; i++) expect(JSON.stringify(clip.keyframes[i].pose)).not.toBe(JSON.stringify(clip.keyframes[i - 1].pose));
    for (const frame of clip.keyframes.slice(clip.stillFrame, clip.keyframes.length - 16)) {
      const { leftLeg } = solvePose(frame.pose);
      expect(distance(leftLeg[1], bent.leftLeg[1])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], bent.leftLeg[2])).toBeLessThan(0.5);
    }
    const [rightHip, rightKnee, rightAnkle, rightToes] = first.rightLeg;
    const [leftHip, leftKnee, leftAnkle, leftToes] = bent.leftLeg;
    // The straight leg lies flat, toes up.
    expect(angleAt(rightHip, rightKnee, rightAnkle)).toBeGreaterThan(175);
    expect(rightToes[1]).toBeGreaterThan(rightAnkle[1] + 30);
    // The bent leg's foot lies along the inside of the straight thigh, toes toward its knee, and
    // its knee drops out to the side, low.
    const alongThigh = (point: Vec3) => {
      const t = (point[0] - rightHip[0]) / (rightKnee[0] - rightHip[0]);
      return Math.hypot(point[1] - (rightHip[1] + (rightKnee[1] - rightHip[1]) * t), point[2] - rightHip[2]);
    };
    expect(alongThigh(leftAnkle)).toBeLessThan(25);
    expect(alongThigh(leftToes)).toBeLessThan(25);
    expect(leftToes[0]).toBeGreaterThan(leftAnkle[0] + 30);
    expect(leftAnkle[2]).toBeLessThan(rightHip[2]);
    expect(leftKnee[2]).toBeLessThan(leftHip[2] - 60);
    expect(leftKnee[1]).toBeLessThan(50);
    // Folded, the chest comes down over the straight leg and the hands hold its foot from either side.
    const folded = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(folded.head[0]).toBeGreaterThan(first.head[0] + 80);
    expect(folded.head[1]).toBeLessThan(first.head[1] - 50);
    const [, , rightWrist] = folded.rightArm;
    const [, , leftWrist] = folded.leftArm;
    for (const wrist of [rightWrist, leftWrist]) expect(distance(wrist, rightAnkle)).toBeLessThan(40);
    expect(rightWrist[2]).toBeGreaterThan(rightAnkle[2] + 5);
    expect(leftWrist[2]).toBeLessThan(rightAnkle[2] - 5);
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    // The elbows move smoothly with the hands, never whipping round: no more than a little further
    // than the hands themselves go in any 10ms.
    let previous = solvePose(poseAt3(clip, 0));
    for (let t = 10; t <= durationOf(clip); t += 10) {
      const skeleton = solvePose(poseAt3(clip, t));
      for (const arm of ['rightArm', 'leftArm'] as const) {
        const hand = distance(skeleton[arm][2], previous[arm][2]);
        expect(distance(skeleton[arm][1], previous[arm][1])).toBeLessThan(1.5 * hand + 2);
      }
      previous = skeleton;
    }
    // One order all the way through, the bent leg under the pelvis it comes off the far side of.
    const orders = new Set(drawOrders(clip));
    expect(orders.size).toBe(1);
    const [order] = [...orders].map((o) => o.split(' '));
    expect(order.indexOf('leftLeg')).toBeLessThan(order.indexOf('torso'));
  });

  it('keeps the hands and knees planted and the arms straight while the chest sinks between the shoulders and rises above them, in scap mobilization', () => {
    const clip = SCAP_MOBILIZATION_3D;
    const poses = samples(clip).map(solvePose);
    const [first] = poses;
    const rise: number[] = [];
    for (const skeleton of poses) {
      for (const limb of ['rightArm', 'leftArm', 'rightLeg', 'leftLeg'] as const) {
        expect(distance(skeleton[limb][2], first[limb][2])).toBeLessThan(0.5);
      }
      // The knees stay on the floor under the hips.
      expect(skeleton.rightLeg[1][1]).toBeLessThan(15);
      // The arms stay straight, just short of locked.
      for (const arm of [skeleton.rightArm, skeleton.leftArm]) expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(168);
      const neckBase = skeleton.spine[skeleton.spine.length - 1];
      rise.push(neckBase[1] - (skeleton.rightArm[0][1] + skeleton.leftArm[0][1]) / 2);
    }
    // The chest sinks well below the shoulders and pushes up well above them.
    expect(Math.min(...rise)).toBeLessThan(-8);
    expect(Math.max(...rise)).toBeGreaterThan(8);
    // Still, it's sunk.
    const sunk = solvePose(clip.keyframes[clip.stillFrame].pose);
    expect(sunk.spine[sunk.spine.length - 1][1] - sunk.rightArm[0][1]).toBeLessThan(-8);
    // One rep flows into the next with no pause: no pose is held, nothing eases to a stop between
    // keyframes, and the chest only passes through the top and bottom, never lingering there: it's
    // within a hair of either end for well under the 400ms a held pose would be.
    expect(longestHold(clip)).toBe(0);
    for (const frame of clip.keyframes.slice(1)) expect(frame.ease).toBe('none');
    const heights: number[] = [];
    for (let t = 0; t < durationOf(clip); t += 10) heights.push(solvePose(poseAt3(clip, t)).spine.at(-1)![1]);
    const [top, bottom] = [Math.max(...heights), Math.min(...heights)];
    expect(heights.filter((h) => h > top - 0.1).length * 10).toBeLessThan(200);
    expect(heights.filter((h) => h < bottom + 0.1).length * 10).toBeLessThan(200);
    expect(new Set(drawOrders(clip)).size).toBe(1);
  });

  it('plants the front foot outside the hands with the knee straight over it and the back knee down, and lowers from the hands onto the forearms as the hips sink, in the lizard pose', () => {
    const clip = LIZARD_POSE_3D;
    const poses = samples(clip).map(solvePose);
    const [first] = poses;
    for (const { rightLeg, leftLeg } of poses) {
      // Both feet and the back knee stay put, the back knee on the floor.
      expect(distance(rightLeg[2], first.rightLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[2], first.leftLeg[2])).toBeLessThan(0.5);
      expect(distance(leftLeg[1], first.leftLeg[1])).toBeLessThan(0.5);
      expect(leftLeg[1][1]).toBeLessThan(15);
    }
    const down = solvePose(clip.keyframes[clip.stillFrame].pose);
    // The front knee points straight over the foot all the way through, never out past it.
    for (const { rightLeg } of poses) expect(Math.abs(rightLeg[1][2] - rightLeg[2][2])).toBeLessThan(5);
    for (const skeleton of [first, down]) {
      const [hip, knee, ankle] = skeleton.rightLeg;
      // The front foot is outside the right hand or elbow, and the knee is well bent.
      for (const joint of skeleton.rightArm.slice(1)) expect(ankle[2]).toBeGreaterThan(joint[2] + 25);
      expect(angleAt(hip, knee, ankle)).toBeLessThan(100);
    }
    // Up on nearly straight arms to start with, the hands flat.
    for (const arm of [first.rightArm, first.leftArm]) {
      expect(angleAt(arm[0], arm[1], arm[2])).toBeGreaterThan(160);
      expect(arm[2][1]).toBeCloseTo(11, 0);
    }
    // Down, the elbows and wrists are on the floor, the forearms flat, the hips sunk lower.
    for (const arm of [down.rightArm, down.leftArm]) {
      expect(arm[1][1]).toBeLessThan(12);
      expect(arm[2][1]).toBeLessThan(12);
    }
    expect(down.spine[0][1]).toBeLessThan(first.spine[0][1] - 20);
    // The hands step out, never sliding: a wrist on the floor never moves along it, and each lifts
    // off for one step out, straight to where it ends up, and one back, the right hand first. Coming down onto the forearm the wrist stays put
    // while the elbow drops.
    for (const arm of ['rightArm', 'leftArm'] as const) {
      let steps = 0;
      let previous = solvePose(poseAt3(clip, 0))[arm][2];
      for (let t = 10; t <= durationOf(clip); t += 10) {
        const wrist = solvePose(poseAt3(clip, t))[arm][2];
        if (wrist[1] < 11.5 && previous[1] < 11.5) expect(Math.hypot(wrist[0] - previous[0], wrist[2] - previous[2])).toBeLessThan(0.01);
        if (wrist[1] > 13 && previous[1] <= 13) steps++;
        previous = wrist;
      }
      expect(steps).toBe(2);
    }
    const liftsAt = (arm: 'rightArm' | 'leftArm') => {
      for (let t = 0; t <= durationOf(clip); t += 10) if (solvePose(poseAt3(clip, t))[arm][2][1] > 13) return t;
      return Infinity;
    };
    expect(liftsAt('rightArm')).toBeLessThan(liftsAt('leftArm'));
    // The right hand reaches out while the body goes down; the left one waits, planted, until the
    // right is down and the body is settling the last of the way, then follows straight on.
    const leftGoes = solvePose(poseAt3(clip, liftsAt('leftArm')));
    expect(leftGoes.rightArm[2][1]).toBeLessThan(11.5);
    expect(Math.abs(leftGoes.spine[0][1] - down.spine[0][1])).toBeLessThan(3);
    let rightLands = liftsAt('rightArm');
    while (solvePose(poseAt3(clip, rightLands)).rightArm[2][1] > 11.5) rightLands += 10;
    expect(liftsAt('leftArm') - rightLands).toBeLessThan(600);
    // The elbows move smoothly, never snapping into place on the floor or out of it: no more than a
    // hand does at its quickest in any 10ms.
    let before = solvePose(poseAt3(clip, 0));
    for (let t = 10; t <= durationOf(clip); t += 10) {
      const skeleton = solvePose(poseAt3(clip, t));
      for (const arm of ['rightArm', 'leftArm'] as const) expect(distance(skeleton[arm][1], before[arm][1])).toBeLessThan(2.5);
      before = skeleton;
    }
    const rightGoes = solvePose(poseAt3(clip, liftsAt('rightArm')));
    expect(rightGoes.spine[0][1]).toBeGreaterThan(down.spine[0][1] + 10);
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    expect(new Set(drawOrders(clip)).size).toBe(1);
  });

  it('lies with the right ankle crossed over the left knee and pulls the left thigh in by the back of it, the right knee open, in the figure four stretch', () => {
    const clip = FIGURE_FOUR_STRETCH_3D;
    const poses = samples(clip).map(solvePose);
    const [first] = poses;
    for (const { spine } of poses) {
      // The back stays flat on the floor.
      expect(distance(spine[0], first.spine[0])).toBeLessThan(0.5);
      expect(distance(spine[spine.length - 1], first.spine[first.spine.length - 1])).toBeLessThan(0.5);
    }
    // The left foot planted with the knee up to start with, and the right ankle resting on that knee,
    // where it stays all the way through.
    expect(first.leftLeg[2][1]).toBeCloseTo(13, 0);
    expect(first.leftLeg[1][1]).toBeGreaterThan(90);
    for (const { rightLeg, leftLeg } of poses) expect(distance(rightLeg[2], leftLeg[1])).toBeLessThan(35);
    const pulled = solvePose(clip.keyframes[clip.stillFrame].pose);
    const [leftHip, leftKnee, leftAnkle] = pulled.leftLeg;
    const [, rightKnee, rightAnkle] = pulled.rightLeg;
    // The left thigh is pulled in past upright, the foot off the floor, and the knee bends from 90°
    // as the hands take hold to well past it.
    expect(leftKnee[0]).toBeLessThan(leftHip[0] - 30);
    const bends = poses.map(({ leftLeg }) => angleAt(leftLeg[0], leftLeg[1], leftLeg[2]));
    expect(Math.max(...bends)).toBeGreaterThan(88);
    expect(angleAt(leftHip, leftKnee, leftAnkle)).toBeCloseTo(45, 0);
    // The move into the stretch is one smooth move: the left knee, the hands and the elbows each
    // speed up and slow down once, never stalling partway and setting off again, and the arms are
    // never stretched to their full length, held back by a thigh still out of reach.
    let arrive = 0;
    for (let i = 1; i <= clip.stillFrame; i++) arrive += clip.keyframes[i].ms;
    const start = arrive - clip.keyframes.slice(2, clip.stillFrame + 1).reduce((total, frame) => total + frame.ms, 0);
    const track = (joint: (skeleton: Skeleton) => Vec3) => {
      const speeds: number[] = [];
      for (let t = start; t < arrive; t += 50) speeds.push(distance(joint(solvePose(poseAt3(clip, t))), joint(solvePose(poseAt3(clip, t + 50)))));
      return speeds;
    };
    for (const joint of [
      (k: Skeleton) => k.leftLeg[1],
      (k: Skeleton) => k.rightArm[1],
      (k: Skeleton) => k.rightArm[2],
      (k: Skeleton) => k.leftArm[1],
      (k: Skeleton) => k.leftArm[2],
    ]) {
      const speeds = track(joint);
      const peak = speeds.indexOf(Math.max(...speeds));
      for (let i = 1; i < speeds.length; i++) {
        if (i <= peak) expect(speeds[i]).toBeGreaterThan(speeds[i - 1] - 0.5);
        else expect(speeds[i]).toBeLessThan(speeds[i - 1] + 0.5);
      }
    }
    for (let t = start; t <= arrive; t += 20) {
      const skeleton = solvePose(poseAt3(clip, t));
      for (const arm of [skeleton.rightArm, skeleton.leftArm]) expect(distance(arm[0], arm[2])).toBeLessThan(0.98 * (SKELETON.upperArm + SKELETON.forearm));
    }
    expect(leftAnkle[1]).toBeGreaterThan(60);
    // The right ankle rests across the left thigh by the knee, just past it, and the right knee is out to the side.
    expect(distance(rightAnkle, leftKnee)).toBeLessThan(35);
    expect(rightAnkle[2]).toBeLessThan(leftKnee[2]);
    expect(rightKnee[2]).toBeGreaterThan(leftHip[2] + 60);
    // The hands clasp behind the left thigh right by the knee, either side of it.
    const thigh = unitBetween(leftHip, leftKnee);
    for (const arm of [pulled.rightArm, pulled.leftArm]) {
      const wrist = arm[2];
      const along = (wrist[0] - leftHip[0]) * thigh[0] + (wrist[1] - leftHip[1]) * thigh[1];
      expect(along).toBeGreaterThan(75);
      expect(along).toBeLessThan(95);
      // Behind it: on the side away from the knee's bend, toward the feet.
      expect(wrist[0] - (leftHip[0] + along * thigh[0])).toBeGreaterThan(5);
    }
    expect(pulled.rightArm[2][2]).toBeGreaterThan(leftHip[2]);
    expect(pulled.leftArm[2][2]).toBeLessThan(leftHip[2]);
    expect(longestHold(clip)).toBeGreaterThanOrEqual(3000);
    // The near hand rests on the belly to start with, and the far one on the floor beside the hip.
    expect(first.rightArm[2][1]).toBeGreaterThan(40);
    expect(Math.abs(first.rightArm[2][2])).toBeLessThan(25);
    expect(first.leftArm[2][1]).toBeLessThan(15);
    expect(first.leftArm[2][2]).toBeLessThan(-30);
    // One order all the way through: the head over the neck its chin covers, the right shin over the
    // left thigh it lies across, the far arm behind the body and the left leg it reaches round, and
    // the near forearm drawn again over the right leg it wraps round, its upper arm under it.
    const orders = new Set(drawOrders(clip));
    expect(orders.size).toBe(1);
    // A forearm drawn again comes as "rightArm hand"; joined up, each slot is one word.
    const [order] = [...orders].map((o) => o.replace(/(\w+) hand/g, '$1+hand').split(' '));
    expect(order.indexOf('torso')).toBeLessThan(order.indexOf('head'));
    expect(order.indexOf('leftArm')).toBeLessThan(order.indexOf('torso'));
    expect(order.indexOf('leftLeg')).toBeLessThan(order.indexOf('rightLeg'));
    expect(order.indexOf('rightArm')).toBeLessThan(order.indexOf('leftLeg'));
    expect(order.indexOf('leftArm')).toBeLessThan(order.indexOf('leftLeg'));
    expect(order).not.toContain('leftArm+hand');
    expect(order.indexOf('rightArm+hand')).toBeGreaterThan(order.indexOf('rightLeg'));
  });
});
