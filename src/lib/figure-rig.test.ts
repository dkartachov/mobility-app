import { EXERCISES } from '@/data/exercises';

import {
  BONES,
  clipDuration,
  figureViewBox,
  FINGER,
  keyframeTime,
  opacityAt,
  poseAt,
  limbRoots,
  SCENE,
  solveFigure,
  solveFinger,
  solveJoint,
  type FigureClip,
  type HandClip,
  type Pose,
} from './figure-rig';

const animated = EXERCISES.flatMap((e) =>
  e.animation && e.animation.view !== 'hand' ? [{ id: e.id, animation: e.animation }] : []
);
const hands = EXERCISES.flatMap((e) => (e.animation?.view === 'hand' ? [{ id: e.id, animation: e.animation }] : []));
const ARM_REACH = BONES.upperArm + BONES.forearm;
const LEG_REACH = BONES.thigh + BONES.shin;

/** The clip's pose every 50ms, so problems between keyframes are caught too. */
function samples(clip: FigureClip): Pose[] {
  const poses: Pose[] = [];
  for (let t = 0; t <= clipDuration(clip); t += 50) poses.push(poseAt(clip, t));
  return poses;
}

describe('solveJoint', () => {
  it('keeps both bones at their length', () => {
    const [x, y] = solveJoint([0, 0], [60, 80], 75, 75, 1);
    expect(Math.hypot(x, y)).toBeCloseTo(75);
    expect(Math.hypot(60 - x, 80 - y)).toBeCloseTo(75);
  });

  it('bends to opposite sides for opposite directions', () => {
    const left = solveJoint([0, 0], [0, 100], 75, 75, 1);
    const right = solveJoint([0, 0], [0, 100], 75, 75, -1);
    expect(left[0]).toBeCloseTo(-right[0]);
    expect(left[1]).toBeCloseTo(right[1]);
  });

  it('straightens toward a target out of reach', () => {
    const [x, y] = solveJoint([0, 0], [300, 0], 75, 75, 1);
    expect(x).toBeCloseTo(75);
    expect(y).toBeCloseTo(0);
  });
});

describe('poseAt', () => {
  const stand = animated[0].animation.keyframes[0].pose;
  const moved: Pose = { ...stand, hip: [stand.hip[0] + 100, stand.hip[1]] };
  const clip: FigureClip = {
    view: 'side',
    stillFrame: 0,
    keyframes: [
      { ms: 0, pose: stand },
      { ms: 1000, pose: moved },
    ],
  };

  it('hits keyframes exactly and eases between them', () => {
    expect(poseAt(clip, 0).hip[0]).toBeCloseTo(stand.hip[0]);
    expect(poseAt(clip, 1000).hip[0]).toBeCloseTo(moved.hip[0]);
    expect(poseAt(clip, 500).hip[0]).toBeCloseTo(stand.hip[0] + 50);
    expect(poseAt(clip, 100).hip[0]).toBeLessThan(stand.hip[0] + 10);
  });

  it('lifts a moving hand or foot off its line only on a step', () => {
    const start = { ...stand, nearFoot: [0, 400, 0] as const };
    const end = { ...stand, nearFoot: [100, 400, 0] as const };
    const keyframes = [
      { ms: 0, pose: start },
      { ms: 1000, pose: end },
    ];
    expect(poseAt({ ...clip, keyframes }, 500).nearFoot[1]).toBeCloseTo(400);
    const stepped = keyframes.map((k) => ({ ...k, step: true }));
    expect(poseAt({ ...clip, keyframes: stepped }, 500).nearFoot[1]).toBeLessThan(400);
  });
});

describe('exercise animations', () => {
  it('covers every active exercise, apart from the ones left as photos', () => {
    expect(EXERCISES.filter((e) => e.active && !e.animation).map((e) => e.id)).toEqual([
      '90-to-90-rotation',
      'reverse-scorpion',
      'thread-the-needle',
    ]);
  });

  describe.each(animated.map((e) => [e.id, e.animation] as const))('%s', (_, clip) => {
    it('never stretches a bone', () => {
      for (const pose of samples(clip)) {
        const paths = solveFigure(pose, clip);
        // Placed knees are for legs seen foreshortened, so only solved ones keep their full length.
        if (!pose.knees) {
          for (const leg of [paths.nearLeg, paths.farLeg]) {
            expect(segmentLengths(leg).map((l) => Math.round(l))).toEqual([BONES.thigh, BONES.shin, BONES.foot]);
          }
        }
        if (clip.straightArms) continue;
        for (const arm of [paths.nearArm, paths.farArm]) {
          expect(segmentLengths(arm).map((l) => Math.round(l))).toEqual([BONES.upperArm, BONES.forearm, BONES.hand]);
        }
      }
    });

    it('can reach every hand and foot it holds in place', () => {
      const limbs = ['nearHand', 'farHand', 'nearFoot', 'farFoot'] as const;
      clip.keyframes.forEach((frame, i) => {
        for (const limb of limbs) {
          const isHand = limb.endsWith('Hand');
          if (isHand ? clip.straightArms : frame.pose.knees) continue;
          const held = clip.keyframes[i - 1]?.pose[limb].join() === frame.pose[limb].join();
          // Between keyframes as well when it isn't going anywhere; a hand on its way somewhere can trail.
          const start = i === 0 ? 0 : keyframeTime(clip, i - 1);
          const end = keyframeTime(clip, i);
          for (let t = held ? start : end; t <= end; t += 50) {
            const pose = poseAt(clip, t);
            const roots = limbRoots(pose, clip);
            const root = { nearHand: roots.nearShoulder, farHand: roots.farShoulder, nearFoot: roots.nearHip, farFoot: roots.farHip }[limb];
            const target = pose[limb];
            expect(Math.hypot(target[0] - root[0], target[1] - root[1])).toBeLessThanOrEqual(isHand ? ARM_REACH : LEG_REACH);
          }
        }
      });
    });

    it('keeps every joint above the floor', () => {
      if (clip.view !== 'side') return;
      for (const pose of samples(clip)) {
        const paths = solveFigure(pose, clip);
        for (const path of [paths.nearArm, paths.farArm, paths.nearLeg, paths.farLeg]) {
          for (const [, y] of pathPoints(path)) expect(y).toBeLessThanOrEqual(SCENE.floorY);
        }
        // The head and spine are thick, so their centers stay further off the floor than joints do.
        expect(paths.headY).toBeLessThanOrEqual(SCENE.floorY - 28);
      }
    });

    it('stays inside the frame', () => {
      const [left, top, width, height] = figureViewBox(clip).split(' ').map(Number);
      for (const pose of samples(clip)) {
        const paths = solveFigure(pose, clip);
        const points = [paths.nearArm, paths.farArm, paths.nearLeg, paths.farLeg, paths.neck].flatMap(pathPoints);
        for (const [x, y] of points) {
          expect(x).toBeGreaterThan(left);
          expect(x).toBeLessThan(left + width);
          expect(y).toBeGreaterThan(top);
          expect(y).toBeLessThan(top + height);
        }
      }
    });

    it('loops without a jump', () => {
      const frames = clip.keyframes;
      if (clip.fadeMs) {
        expect(opacityAt(clip, 0)).toBe(0);
        expect(opacityAt(clip, clipDuration(clip))).toBe(0);
      } else {
        expect(frames[frames.length - 1].pose).toEqual(frames[0].pose);
      }
    });

    it('has a still frame for reduced motion that is fully visible', () => {
      expect(clip.keyframes[clip.stillFrame]).toBeDefined();
      expect(opacityAt(clip, keyframeTime(clip, clip.stillFrame))).toBe(1);
    });
  });
});

describe.each(hands.map((e) => [e.id, e.animation] as const))('hand animation %s', (_, clip: HandClip) => {
  it('never stretches a finger bone', () => {
    for (let t = 0; t <= clipDuration(clip); t += 50) {
      expect(segmentLengths(solveFinger(clip, t)).map((l) => Math.round(l))).toEqual(FINGER.bones);
    }
  });

  it('loops without a jump', () => {
    const frames = clip.keyframes;
    expect(frames[frames.length - 1].joints).toEqual(frames[0].joints);
  });

  it('stays inside the frame', () => {
    for (let t = 0; t <= clipDuration(clip); t += 50) {
      for (const [x, y] of pathPoints(solveFinger(clip, t))) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(SCENE.width);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(SCENE.height);
      }
    }
  });
});

function pathPoints(path: string): number[][] {
  return [...path.matchAll(/[ML](-?[\d.e-]+) (-?[\d.e-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

function segmentLengths(path: string): number[] {
  const points = pathPoints(path);
  return points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
}
