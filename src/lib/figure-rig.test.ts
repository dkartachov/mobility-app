import { EXERCISES } from '@/data/exercises';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';
import { MARCHING_EXERCISE } from '@/data/test-warmup';

import {
  BONES,
  clipDuration,
  DUMBBELL,
  figureViewBox,
  FINGER,
  floorMarks,
  keyframeTime,
  livePoseAt,
  poseAt,
  travelAt,
  limbRoots,
  SCENE,
  solveFigure,
  solveFinger,
  solveJoint,
  type FigureClip,
  type HandClip,
  type Pose,
} from './figure-rig';

// The warm-up's marching and the flexibility tests aren't in the library, but are held to the same standard.
const animated = [...EXERCISES, MARCHING_EXERCISE, ...FLEXIBILITY_TESTS].flatMap((e) =>
  e.animation && e.animation.view !== 'hand' ? [{ id: e.id, animation: e.animation }] : []
);
const hands = EXERCISES.flatMap((e) => (e.animation?.view === 'hand' ? [{ id: e.id, animation: e.animation }] : []));
const ARM_REACH = BONES.upperArm + BONES.forearm;
const LEG_REACH = BONES.thigh + BONES.shin;

/** The clip's pose as it's drawn every 50ms, so problems between keyframes are caught too. */
function samples(clip: FigureClip): Pose[] {
  const poses: Pose[] = [];
  for (let t = 0; t <= clipDuration(clip); t += 50) poses.push(livePoseAt(clip, t));
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

describe('dumbbells', () => {
  const stand = animated[0].animation.keyframes[0].pose;
  const clip: FigureClip = { view: 'side', stillFrame: 0, keyframes: [{ ms: 0, pose: stand }] };

  it('draws nothing for a clip without them', () => {
    expect(solveFigure(stand, clip).dumbbellHandles).toBe('');
  });

  it('keeps the handle at the clip angle, centered on the grip', () => {
    const paths = solveFigure(stand, { ...clip, dumbbells: { hands: ['nearHand'], angle: 0 } });
    const [start, end] = pathPoints(paths.dumbbellHandles);
    expect(end[1]).toBeCloseTo(start[1]);
    expect(end[0] - start[0]).toBeCloseTo(DUMBBELL.handle);
    expect(pathPoints(paths.dumbbellPlates)).toHaveLength(4);
  });
});

describe('body shapes', () => {
  const stand = animated[0].animation.keyframes[0].pose;
  const clip: FigureClip = { view: 'side', stillFrame: 0, keyframes: [{ ms: 0, pose: stand }] };

  it('never draws a broken path', () => {
    for (const { animation } of animated) {
      for (const pose of samples(animation)) {
        const { shapes } = solveFigure(pose, animation);
        expect(Object.values(shapes).join('')).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });

  it('shows the nose only from the side', () => {
    expect(solveFigure(stand, clip).shapes.nose).not.toBe('');
    expect(solveFigure(stand, { ...clip, widths: { shoulder: 28, hip: 16 } }).shapes.nose).toBe('');
    expect(solveFigure(stand, { ...clip, view: 'above' }).shapes.nose).toBe('');
  });

  it('casts a wider shadow lying down than standing up', () => {
    const upright: Pose = { ...stand, hip: [480, 260], torso: 90, neck: 90, nearFoot: [480, 456, 0], farFoot: [480, 456, 0] };
    const lying: Pose = { ...upright, hip: [480, 450], torso: 180, neck: 180, nearFoot: [680, 456, 90], farFoot: [680, 456, 90] };
    expect(solveFigure(lying, clip).shadowRadius).toBeGreaterThan(solveFigure(upright, clip).shadowRadius * 2);
  });
});

describe('a clip the camera follows', () => {
  const stand = animated[0].animation.keyframes[0].pose;
  const ahead: Pose = {
    ...stand,
    hip: [stand.hip[0] + 100, stand.hip[1]],
    nearFoot: [stand.nearFoot[0] + 100, stand.nearFoot[1], stand.nearFoot[2]],
  };
  const clip: FigureClip = {
    view: 'side',
    stillFrame: 0,
    follow: true,
    keyframes: [
      { ms: 0, pose: stand },
      { ms: 1000, pose: ahead },
    ],
  };

  it('keeps the hips in place and moves the floor instead', () => {
    expect(poseAt(clip, 1000).hip).toEqual(stand.hip);
    expect(poseAt(clip, 1000).nearFoot).toEqual(stand.nearFoot);
    expect(poseAt(clip, 1000).farFoot[0]).toBeCloseTo(stand.farFoot[0] - 100);
    expect(travelAt(clip, 1000)).toBeCloseTo(100);
    expect(travelAt({ ...clip, follow: false }, 1000)).toBe(0);
  });

  it('slides the floor marks back by how far it has gone, repeating', () => {
    const xs = (path: string) => [...path.matchAll(/M(-?[\d.]+) /g)].map((m) => Number(m[1]));
    expect(xs(floorMarks(30))[0]).toBeCloseTo(xs(floorMarks(0))[0] - 30);
    expect(floorMarks(220)).toBe(floorMarks(0));
  });
});

describe('livePoseAt', () => {
  const stand = animated[0].animation.keyframes[0].pose;
  const freeHands: Pose = { ...stand, nearHand: [stand.hip[0] + 20, stand.hip[1], -90], farHand: [stand.hip[0] + 20, stand.hip[1], -90] };
  const nod: Pose = { ...freeHands, neck: freeHands.neck - 40 };
  const clip: FigureClip = {
    view: 'side',
    stillFrame: 0,
    keyframes: [
      { ms: 0, pose: freeHands },
      { ms: 2000, pose: nod },
      { ms: 2000, pose: freeHands },
    ],
  };

  it('breathes in and out once over a short clip, lifting the shoulders', () => {
    expect(livePoseAt(clip, 0).breath ?? 0).toBe(0);
    expect(livePoseAt(clip, 2000).breath).toBeCloseTo(1);
    expect(livePoseAt(clip, 2000).torsoLength).toBeGreaterThan(BONES.torso + 1);
    expect(solveFigure(livePoseAt(clip, 2000), clip).shapes.torso).not.toBe(solveFigure(poseAt(clip, 2000), clip).shapes.torso);
  });

  it('keeps the shoulders down under a hand at full stretch', () => {
    const shoulderY = stand.hip[1] - BONES.torso;
    const reaching: Pose = { ...freeHands, torso: 90, nearHand: [stand.hip[0], shoulderY + ARM_REACH, -90] };
    const held: FigureClip = { ...clip, keyframes: clip.keyframes.map((k) => ({ ...k, pose: reaching })) };
    expect(livePoseAt(held, 2000).torsoLength).toBeCloseTo(BONES.torso);
  });

  it('leaves clips too short to breathe in alone', () => {
    const short: FigureClip = { ...clip, keyframes: clip.keyframes.map((k) => ({ ...k, ms: k.ms / 4 })) };
    expect(livePoseAt(short, 500).breath).toBeUndefined();
  });

  it('turns the head a moment after the clip does', () => {
    expect(livePoseAt(clip, 1000).neck).toBeGreaterThan(poseAt(clip, 1000).neck);
    expect(livePoseAt(clip, 1000).neck).toBeCloseTo(poseAt(clip, 910).neck);
  });
});

describe('exercise animations', () => {
  it('covers every exercise', () => {
    expect(EXERCISES.filter((e) => !e.animation).map((e) => e.id)).toEqual([]);
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
        // As with knees, placed elbows are for forearms seen foreshortened.
        if (clip.straightArms || pose.elbows) continue;
        // Arms pointing into the screen look shorter, but in proportion.
        [paths.nearArm, paths.farArm].forEach((arm, side) => {
          const scale = pose.armLengths?.[side] ?? 1;
          const lengths = segmentLengths(arm);
          [BONES.upperArm, BONES.forearm, BONES.hand].forEach((bone, i) => expect(lengths[i]).toBeCloseTo(bone * scale, 1));
        });
      }
    });

    it('can reach every hand and foot it holds in place', () => {
      const limbs = ['nearHand', 'farHand', 'nearFoot', 'farFoot'] as const;
      clip.keyframes.forEach((frame, i) => {
        for (const limb of limbs) {
          const isHand = limb.endsWith('Hand');
          if (isHand ? clip.straightArms || frame.pose.elbows : frame.pose.knees) continue;
          const held = clip.keyframes[i - 1]?.pose[limb].join() === frame.pose[limb].join();
          // Between keyframes as well when it isn't going anywhere; a hand on its way somewhere can trail.
          const start = i === 0 ? 0 : keyframeTime(clip, i - 1);
          const end = keyframeTime(clip, i);
          for (let t = held ? start : end; t <= end; t += 50) {
            const pose = livePoseAt(clip, t);
            const roots = limbRoots(pose, clip);
            const root = { nearHand: roots.nearShoulder, farHand: roots.farShoulder, nearFoot: roots.nearHip, farFoot: roots.farHip }[limb];
            const target = pose[limb];
            const armLength = pose.armLengths?.[limb === 'nearHand' ? 0 : 1] ?? 1;
            // A hair of slack for the rounding where a shortened arm is exactly straight.
            const reach = isHand ? ARM_REACH * armLength + 0.01 : LEG_REACH;
            expect(Math.hypot(target[0] - root[0], target[1] - root[1])).toBeLessThanOrEqual(reach);
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
      const parts = ['nearArm', 'farArm', 'nearLeg', 'farLeg', 'neck'] as const;
      const solved = samples(clip).map((pose) => solveFigure(pose, clip));
      // Zoomed in on a limb, the parts that never move can be cropped, but whatever moves stays in view.
      const shown = clip.focus ? parts.filter((part) => solved.some((paths) => paths[part] !== solved[0][part])) : parts;
      for (const paths of solved) {
        const points = shown.flatMap((part) => pathPoints(paths[part]));
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
      // A clip the camera follows ends in its first pose further along the floor, which looks the same.
      if (clip.follow) expect(poseAt(clip, clipDuration(clip))).toEqual(poseAt(clip, 0));
      else expect(frames[frames.length - 1].pose).toEqual(frames[0].pose);
      // The breath and the head's lag come round to where they began too.
      const [start, end] = [livePoseAt(clip, 0), livePoseAt(clip, clipDuration(clip))];
      expect(end.neck).toBeCloseTo(start.neck);
      expect(end.breath ?? 0).toBeCloseTo(start.breath ?? 0);
      expect(end.torsoLength ?? BONES.torso).toBeCloseTo(start.torsoLength ?? BONES.torso);
    });

    it('has a still frame for reduced motion', () => {
      expect(clip.keyframes[clip.stillFrame]).toBeDefined();
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
