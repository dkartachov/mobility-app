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

  it('dings when the timeout runs out, then the exercise timer continues', () => {
    const started = reducer(holding, { type: 'startTimeout', seconds: 30 });
    const ended = reducer(started, { type: 'tick', deltaMs: 30_000 });

    expect(ended.timeoutMs).toBeUndefined();
    expect(ended.cue).toEqual({ type: 'done' });
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
