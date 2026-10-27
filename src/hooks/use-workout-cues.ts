import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect } from 'react';

/** `done` plays a ding; the others are spoken. */
export type WorkoutCue = 'tenSeconds' | 'switchSides' | 'done';

const SPOKEN: Record<Exclude<WorkoutCue, 'done'>, string> = {
  tenSeconds: '10 seconds',
  switchSides: 'Switch sides',
};

/**
 * Plays `cue` whenever a new cue object arrives. Pass a fresh object for every cue, so the same
 * kind of cue twice in a row still plays twice.
 */
export function useWorkoutCues(cue: { type: WorkoutCue } | undefined) {
  const ding = useAudioPlayer(require('@/assets/sounds/ding.wav'));

  useEffect(() => {
    // Lower music/podcasts while a cue plays rather than mixing over them at full volume.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (!cue) return;
    if (cue.type === 'done') {
      ding.seekTo(0).then(() => ding.play());
    } else {
      Speech.speak(SPOKEN[cue.type]);
    }
  }, [cue, ding]);
}
