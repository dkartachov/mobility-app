import { EXERCISES } from '@/data/exercises';
import { CAT_COW_3D, SHOULDER_EXTERNAL_ROTATION_3D } from '@/data/exercise-animations-3d';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';

import {
  distance,
  poseAt3,
  project,
  SKELETON,
  solveJoint3,
  solvePose,
  stageClip,
  traceFigure,
  viewOf,
  type Clip3D,
  type Pose3,
  type Skeleton,
  type Vec3,
} from './rig3d';

const clips = [...EXERCISES, ...FLEXIBILITY_TESTS].flatMap((e) =>
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
    expect(clips.map(([id]) => id)).toEqual(expect.arrayContaining(['cat-cow', 'shoulder-external-rotation']));
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
        const shown = clip.camera.fit === 'upper' ? [...skeleton.spine, skeleton.head, ...skeleton.rightArm, ...skeleton.leftArm] : joints(skeleton);
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

  it('traces the path of the hand a clip trails, and nothing otherwise', () => {
    expect(stageClip(SHOULDER_EXTERNAL_ROTATION_3D).trail).toMatch(/^M[-\d. ]+(L[-\d. ]+)+$/);
    expect(stageClip(CAT_COW_3D).trail).toBe('');
  });
});
