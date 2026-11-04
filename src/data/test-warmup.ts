/**
 * The warm-up before a flexibility test. Range of motion goes up after a few minutes of light
 * movement, and by how much depends on what you did, so the same warm-up every time keeps results
 * comparable from one test to the next. That's why it's fixed rather than generated like the daily
 * workouts.
 *
 * Light cardio first to warm up, then dynamic moves through each area the test measures, staying
 * short of full range. No static holds: they raise range the most, but by however long and hard
 * you held them, which would add noise between tests. It ends standing, like the first tests.
 */

import { getExercise, type Exercise } from '@/data/exercises';
import { MARCHING } from '@/data/exercise-animations';
import type { WorkoutStep } from '@/lib/workout';

/** Get-ready countdown before each move. There's no setup between them, so it's short. */
export const WARMUP_BUFFER_SECONDS = 5;

/** Get-ready countdown before a two-sided move's second side, when you're already in position. */
export const WARMUP_SIDE_SWITCH_SECONDS = 3;

/** Added to every move's instructions: this is a warm-up, not the test. */
const EASY_CUE = 'Keep it smooth and easy, short of your full range';

/** Only in the warm-up, not the library, since daily workouts are mobility rather than cardio. */
export const MARCHING_EXERCISE: Exercise = {
  id: 'warmup-marching',
  name: 'Marching',
  stimulus: 'Light cardio to warm up the whole body',
  position: 'standing',
  instructions: [
    'March on the spot, lifting each knee towards hip height',
    'Swing your arms in time, opposite arm to leg',
    'Pick up the pace until you feel warm, or switch to easy jumping jacks',
  ],
  animation: MARCHING,
  active: true,
};

/** Every move in order, with how long it lasts on each side. */
const MOVES: { exercise: Exercise | string; seconds: number; instructions?: string[] }[] = [
  { exercise: MARCHING_EXERCISE, seconds: 60 },
  { exercise: 'ankle-mobilization', seconds: 30 },
  { exercise: 'leg-swings', seconds: 30 },
  { exercise: 'cossack-squat', seconds: 45 },
  { exercise: 'inchworm', seconds: 45 },
  { exercise: 'worlds-greatest-stretch', seconds: 30 },
  {
    exercise: 'shoulder-pass-throughs',
    seconds: 45,
    // The library's version narrows the grip as you loosen up, which would change the warm-up.
    instructions: [
      'Hold a towel or belt in front of your hips with a wide grip, arms straight',
      'Lift it up overhead and down behind your back without bending your elbows',
      'Bring it back to the front and keep repeating, with the same grip every time',
    ],
  },
];

function resolve(exercise: Exercise | string): Exercise {
  if (typeof exercise !== 'string') return exercise;
  const found = getExercise(exercise);
  if (!found) throw new Error(`Warm-up exercise "${exercise}" isn't in the library`);
  return found;
}

/** The warm-up's steps, with two-sided moves split into one step per side. */
export const TEST_WARMUP: WorkoutStep[] = MOVES.flatMap(({ exercise, seconds, instructions }): WorkoutStep[] => {
  const resolved = resolve(exercise);
  const withCue: Exercise = { ...resolved, instructions: [...(instructions ?? resolved.instructions), EASY_CUE] };
  return resolved.twoSided
    ? [
        { exercise: withCue, durationSeconds: seconds, side: 1 },
        { exercise: withCue, durationSeconds: seconds, side: 2 },
      ]
    : [{ exercise: withCue, durationSeconds: seconds }];
});

/** Total moving time, without the get-ready countdowns. */
export const WARMUP_MOVING_SECONDS = TEST_WARMUP.reduce((total, step) => total + step.durationSeconds, 0);

/** Total time including the get-ready countdowns, rounded to the minute, for the intro screen. */
export const WARMUP_MINUTES = Math.round(
  TEST_WARMUP.reduce(
    (total, step) =>
      total + step.durationSeconds + (step.side === 2 ? WARMUP_SIDE_SWITCH_SECONDS : WARMUP_BUFFER_SECONDS),
    0
  ) / 60
);
