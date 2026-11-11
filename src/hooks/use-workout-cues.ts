import { type AudioPlayer, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

/** `done` ends a hold; `finished` ends the last hold, and so the whole session. */
export type WorkoutCue = 'tenSeconds' | 'switchSides' | 'done' | 'finished' | 'timeoutOver';

/**
 * Plays `cue` whenever a new cue object arrives. Pass a fresh object for every cue, so the same
 * kind of cue twice in a row still plays twice.
 *
 * With `celebrate`, finishing plays a flourish rather than the ding that ends every other hold.
 */
export function useWorkoutCues(cue: { type: WorkoutCue } | undefined, { celebrate = false } = {}) {
  const players = {
    tenSeconds: useAudioPlayer(require('@/assets/sounds/ten-seconds-1.m4a')),
    switchSides: useAudioPlayer(require('@/assets/sounds/switch-sides-1.m4a')),
    done: useAudioPlayer(require('@/assets/sounds/ding.wav')),
    complete: useAudioPlayer(require('@/assets/sounds/workout-complete.wav')),
    timeoutOver: useAudioPlayer(require('@/assets/sounds/timeout-over.wav')),
  };

  useEffect(() => {
    // Lower music/podcasts while a cue plays rather than mixing over them at full volume.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  }, []);

  useEffect(() => {
    if (!cue) return;
    if (cue.type === 'finished') {
      replay(celebrate ? players.complete : players.done);
      return;
    }
    if (cue.type !== 'switchSides') {
      replay(players[cue.type]);
      return;
    }
    // The ding first marks the end of the side, then the voice says what to do next.
    replay(players.done);
    const timer = setTimeout(() => replay(players.switchSides), SWITCH_SIDES_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new cue should trigger playback
  }, [cue]);
}

/** How long after the ding starts the "switch sides" voice comes in, once the ding has rung out. */
const SWITCH_SIDES_DELAY_MS = 900;

function replay(player: AudioPlayer) {
  player.seekTo(0).then(() => player.play());
}
