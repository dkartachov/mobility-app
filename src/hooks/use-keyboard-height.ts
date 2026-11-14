import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * How much of the screen the keyboard covers on Android, 0 while it's hidden and always on iOS.
 * Expo apps are edge-to-edge on Android, so the window no longer shrinks for the keyboard and
 * screens have to make room themselves. iOS scroll views do it with
 * `automaticallyAdjustKeyboardInsets` instead.
 */
export function useAndroidKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
