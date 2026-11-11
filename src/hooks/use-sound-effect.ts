import { type AudioSource, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import { getSoundEffectsEnabled } from '@/lib/sound-preference';

/**
 * An iPhone's silent switch is expected to quieten an app's sound effects. On Android, silent and
 * vibrate are about calls and notifications: apps follow the media volume, and most phones sit on
 * vibrate all day, so obeying it there would mean the effects are almost never heard.
 */
const PLAYS_WHEN_SILENCED = Platform.OS === 'android';

/**
 * A sound that's there for delight rather than as a cue, so unlike the workout cues it stays quiet
 * when sound effects are turned off, and plays over music instead of turning it down.
 */
export function useSoundEffect(source: AudioSource) {
  const player = useAudioPlayer(source);
  // Bumped by every play and stop, so a stop that lands while a play is still starting up wins.
  const latest = useRef(0);

  return useMemo(
    () => ({
      play() {
        if (!getSoundEffectsEnabled()) return;
        const request = ++latest.current;
        // The audio mode is app-wide and the workout cues set their own, so it's set before each play.
        setAudioModeAsync({ playsInSilentMode: PLAYS_WHEN_SILENCED, interruptionMode: 'mixWithOthers' })
          .then(() => player.seekTo(0))
          .then(() => {
            if (request === latest.current) player.play();
          })
          // The screen can be gone, and its player released, by the time the sound is due.
          .catch(() => {});
      },
      stop() {
        latest.current++;
        player.pause();
      },
    }),
    [player]
  );
}
