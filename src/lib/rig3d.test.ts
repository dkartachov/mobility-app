import { EXERCISES } from '@/data/exercises';
import {
  ACTIVE_PANCAKE_3D,
  ACTIVE_STRAIGHT_LEG_RAISE_3D,
  CAT_COW_3D,
  HIP_ABDUCTION_3D,
  HIP_EXTERNAL_ROTATION_3D,
  HIP_INTERNAL_ROTATION_3D,
  KNEE_TO_CHEST_3D,
  KNEE_TO_WALL_3D,
  LEG_SWINGS_3D,
  MARCHING_3D,
  NINETY_TO_NINETY_3D,
  NINETY_TO_NINETY_ROTATIONS_3D,
  NINETY_TO_NINETY_SIDE_FOOT_LIFTS_3D,
  OVERHEAD_REACH_3D,
  PANCAKE_3D,
  SHOULDER_ABDUCTION_3D,
  SHOULDER_EXTERNAL_ROTATION_3D,
  SIT_AND_REACH_3D,
  STRAIGHT_LEG_RAISE_3D,
} from '@/data/exercise-animations-3d';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';
import { MARCHING_EXERCISE } from '@/data/test-warmup';

import {
  distance,
  frameAt,
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
      'warmup-marching',
    ]));
  });

  describe.each(clips)('%s', (_, clip) => {
    const skeletons = samples(clip).map(solvePose);

    it('never stretches a bone', () => {
      for (const { rightArm, leftArm, rightLeg, leftLeg } of skeletons) {
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
        const shown =
          clip.camera.fit === 'upper'
            ? [...skeleton.spine, skeleton.head, ...skeleton.rightArm, ...skeleton.leftArm]
            : clip.camera.fit === 'lower'
              ? [skeleton.spine[0], ...skeleton.rightLeg, ...skeleton.leftLeg]
              : joints(skeleton);
        for (const joint of shown) {
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
});
