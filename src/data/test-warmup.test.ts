import { EXERCISES } from './exercises';
import { MARCHING_EXERCISE, TEST_WARMUP, WARMUP_MINUTES, WARMUP_MOVING_SECONDS } from './test-warmup';

describe('test warm-up', () => {
  it('starts with light cardio', () => {
    expect(TEST_WARMUP[0].exercise.id).toBe(MARCHING_EXERCISE.id);
  });

  it('moves for 6¼ minutes, about 7 with the get-ready countdowns', () => {
    expect(WARMUP_MOVING_SECONDS).toBe(375);
    expect(WARMUP_MINUTES).toBe(7);
  });

  it('only uses active moves, all standing, each with an animation', () => {
    for (const { exercise } of TEST_WARMUP) {
      expect(exercise).toMatchObject({ active: true, position: 'standing' });
      expect(exercise.animation).toBeDefined();
    }
  });

  it('only needs what the test already does: a wall and a towel or belt', () => {
    const equipment = new Set(TEST_WARMUP.flatMap(({ exercise }) => exercise.equipment ?? []));
    expect([...equipment].sort()).toEqual(['band', 'wall']);
  });

  it('does both sides of two-sided moves, one after the other', () => {
    TEST_WARMUP.forEach((step, i) => {
      if (step.side === 1) expect(TEST_WARMUP[i + 1]).toMatchObject({ exercise: { id: step.exercise.id }, side: 2 });
      if (step.side === 2) expect(TEST_WARMUP[i - 1]).toMatchObject({ exercise: { id: step.exercise.id }, side: 1 });
      expect(Boolean(step.side)).toBe(Boolean(step.exercise.twoSided));
    });
  });

  it('keeps marching out of the library', () => {
    expect(EXERCISES.some((exercise) => exercise.id === MARCHING_EXERCISE.id)).toBe(false);
  });

  it('reminds you to stay short of full range on every move', () => {
    for (const { exercise } of TEST_WARMUP) expect(exercise.instructions.at(-1)).toMatch(/short of your full range/);
  });
});
