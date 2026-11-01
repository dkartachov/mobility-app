import type { WorkoutCue } from '@/hooks/use-workout-cues';

import type { WorkoutStep } from './workout';

/** `buffer` is the get-ready countdown; `finished` only happens after the last exercise. */
export type Phase = 'buffer' | 'active' | 'finished';

export type PlayerState = {
  index: number;
  phase: Phase;
  remainingMs: number;
  paused: boolean;
  /** Bumped whenever a countdown (re)starts, so the timer bar knows to restart its fill. */
  countdown: number;
  /** Time left in a timeout, if one is running. The exercise timer waits at its start until it ends. */
  timeoutMs?: number;
  /** The latest sound cue. Only set by the timer itself, so skipping around stays quiet. */
  cue?: { type: WorkoutCue };
};

export type PlayerAction =
  | { type: 'tick'; deltaMs: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'goTo'; index: number }
  | { type: 'startTimeout'; seconds: number }
  | { type: 'extendTimeout'; seconds: number }
  | { type: 'endTimeout' };

/** When the "10 seconds" cue is spoken. */
const WARNING_MS = 10_000;

export function createPlayerReducer(steps: WorkoutStep[], bufferMs: number) {
  function startStep(state: PlayerState, index: number): PlayerState {
    return { ...state, index, phase: 'buffer', remainingMs: bufferMs, countdown: state.countdown + 1 };
  }

  return function reducer(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
      case 'tick': {
        if (state.paused || state.phase === 'finished') return state;
        if (state.timeoutMs !== undefined) {
          const timeoutMs = state.timeoutMs - action.deltaMs;
          // Only a timeout that runs out dings: you may have walked away, but you know if you ended it yourself.
          return timeoutMs > 0 ? { ...state, timeoutMs } : { ...state, timeoutMs: undefined, cue: { type: 'done' } };
        }
        const remainingMs = state.remainingMs - action.deltaMs;
        if (remainingMs > 0) {
          // Holds too short for a real 10 s warning (dev fast mode) get it halfway, so the cue can still be heard.
          const warningMs = Math.min(WARNING_MS, (steps[state.index].durationSeconds * 1000) / 2);
          const crossedWarning =
            state.phase === 'active' && state.remainingMs > warningMs && remainingMs <= warningMs;
          return { ...state, remainingMs, cue: crossedWarning ? { type: 'tenSeconds' } : state.cue };
        }

        if (state.phase === 'buffer') {
          return {
            ...state,
            phase: 'active',
            remainingMs: steps[state.index].durationSeconds * 1000,
            countdown: state.countdown + 1,
          };
        }
        const next = steps[state.index + 1];
        if (next) {
          // Finishing the first side isn't the end of the exercise, so it gets the voice cue instead of the ding.
          return { ...startStep(state, state.index + 1), cue: { type: next.side === 2 ? 'switchSides' : 'done' } };
        }
        return { ...state, phase: 'finished', remainingMs: 0, cue: { type: 'done' } };
      }
      case 'pause':
        return { ...state, paused: true };
      case 'resume':
        return { ...state, paused: false };
      case 'reset':
        return startStep(state, state.index);
      case 'goTo':
        return startStep(state, Math.min(Math.max(action.index, 0), steps.length - 1));
      case 'startTimeout':
        return { ...startStep(state, state.index), timeoutMs: action.seconds * 1000 };
      case 'extendTimeout':
        // A tap can land just after the timeout ran out, which mustn't start a new one.
        if (state.timeoutMs === undefined) return state;
        return { ...state, timeoutMs: state.timeoutMs + action.seconds * 1000 };
      case 'endTimeout':
        return { ...state, timeoutMs: undefined };
    }
  };
}
