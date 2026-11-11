import { EXERCISES } from '@/data/exercises';

import type { WorkoutStep } from './workout';
import { createPlayerReducer, type PlayerState } from './workout-player';

const BUFFER_MS = 10_000;
const steps: WorkoutStep[] = [
  { exercise: EXERCISES[0], durationSeconds: 60 },
  { exercise: EXERCISES[1], durationSeconds: 60 },
];
const reducer = createPlayerReducer(steps, BUFFER_MS);

const holding: PlayerState = { index: 1, phase: 'active', remainingMs: 25_000, paused: false, countdown: 3 };

describe('timeouts', () => {
  it('resets the current exercise to its get-ready countdown and starts the timeout', () => {
    const state = reducer(holding, { type: 'startTimeout', seconds: 30 });

    expect(state).toMatchObject({ index: 1, phase: 'buffer', remainingMs: BUFFER_MS, timeoutMs: 30_000 });
    expect(state.countdown).toBe(holding.countdown + 1);
  });

  it('counts down the timeout while the exercise timer waits', () => {
    const started = reducer(holding, { type: 'startTimeout', seconds: 30 });
    const state = reducer(started, { type: 'tick', deltaMs: 1000 });

    expect(state.timeoutMs).toBe(29_000);
    expect(state.remainingMs).toBe(BUFFER_MS);
  });

  it('calls you back when the timeout runs out, then the exercise timer continues', () => {
    const started = reducer(holding, { type: 'startTimeout', seconds: 30 });
    const ended = reducer(started, { type: 'tick', deltaMs: 30_000 });

    expect(ended.timeoutMs).toBeUndefined();
    expect(ended.cue).toEqual({ type: 'timeoutOver' });
    expect(ended.remainingMs).toBe(BUFFER_MS);

    expect(reducer(ended, { type: 'tick', deltaMs: 1000 }).remainingMs).toBe(BUFFER_MS - 1000);
  });

  it('adds time to a running timeout, leaving the exercise timer alone', () => {
    const started = reducer(holding, { type: 'startTimeout', seconds: 30 });
    const ticked = reducer(started, { type: 'tick', deltaMs: 10_000 });
    const state = reducer(ticked, { type: 'extendTimeout', seconds: 30 });

    expect(state.timeoutMs).toBe(50_000);
    expect(state.remainingMs).toBe(BUFFER_MS);
    expect(state.countdown).toBe(started.countdown);
  });

  it('ignores adding time once the timeout is over', () => {
    expect(reducer(holding, { type: 'extendTimeout', seconds: 30 })).toBe(holding);
  });

  it('ends early without a sound when resumed by hand', () => {
    const started = reducer(holding, { type: 'startTimeout', seconds: 30 });
    const ended = reducer(started, { type: 'endTimeout' });

    expect(ended.timeoutMs).toBeUndefined();
    expect(ended.cue).toBeUndefined();
    expect(ended).toMatchObject({ index: 1, phase: 'buffer', remainingMs: BUFFER_MS });
  });
});

describe('cues', () => {
  it('dings when a hold ends with more exercises to come', () => {
    const first: PlayerState = { ...holding, index: 0 };
    expect(reducer(first, { type: 'tick', deltaMs: 25_000 })).toMatchObject({ index: 1, cue: { type: 'done' } });
  });

  it('marks the end of the last hold as finishing, not just another ding', () => {
    const ended = reducer(holding, { type: 'tick', deltaMs: 25_000 });
    expect(ended).toMatchObject({ phase: 'finished', cue: { type: 'finished' } });
  });
});

describe('side switch countdown', () => {
  const SWITCH_MS = 3000;
  const twoSided = EXERCISES.find((exercise) => exercise.twoSided)!;
  const oneSided = EXERCISES.find((exercise) => !exercise.twoSided)!;
  const sided: WorkoutStep[] = [
    { exercise: oneSided, durationSeconds: 60 },
    { exercise: twoSided, durationSeconds: 30, side: 1 },
    { exercise: twoSided, durationSeconds: 30, side: 2 },
  ];
  const sidedReducer = createPlayerReducer(sided, BUFFER_MS, SWITCH_MS);
  const at = (index: number): PlayerState => ({ index, phase: 'active', remainingMs: 1000, paused: false, countdown: 0 });

  it('uses the shorter countdown before the second side', () => {
    expect(sidedReducer(at(1), { type: 'tick', deltaMs: 1000 })).toMatchObject({ index: 2, remainingMs: SWITCH_MS });
  });

  it('uses the full countdown before a new exercise', () => {
    expect(sidedReducer(at(0), { type: 'tick', deltaMs: 1000 })).toMatchObject({ index: 1, remainingMs: BUFFER_MS });
  });

  it('applies to skipping and resetting too', () => {
    expect(sidedReducer(at(0), { type: 'goTo', index: 2 }).remainingMs).toBe(SWITCH_MS);
    expect(sidedReducer(at(2), { type: 'reset' }).remainingMs).toBe(SWITCH_MS);
  });

  it('defaults to the full countdown', () => {
    expect(createPlayerReducer(sided, BUFFER_MS)(at(1), { type: 'tick', deltaMs: 1000 }).remainingMs).toBe(BUFFER_MS);
  });
});
