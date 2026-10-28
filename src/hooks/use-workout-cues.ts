import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

export type WorkoutCue = 'tenSeconds' | 'switchSides' | 'done';

/**
 * Plays `cue` whenever a new cue object arrives. Pass a fresh object for every cue, so the same
 * kind of cue twice in a row still plays twice.
 */
export function useWorkoutCues(cue: { type: WorkoutCue } | undefined) {
  const players = {
    tenSeconds: useAudioPlayer(require('@/assets/sounds/ten-seconds-1.m4a')),
    switchSides: useAudioPlayer(require('@/assets/sounds/switch-sides-1.m4a')),
    done: useAudioPlayer(require('@/assets/sounds/ding.wav')),
  };

  useEffect(() => {
    // Lower music/podcasts while a cue plays rather than mixing over them at full volume.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  }, []);

  const player = cue && players[cue.type];
  useEffect(() => {
    if (!player) return;
    player.seekTo(0).then(() => player.play());
  }, [cue, player]);
}
