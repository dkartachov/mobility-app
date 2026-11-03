import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Touch feedback by meaning rather than strength. Android uses the system's own haptic presets,
 * which follow the phone's haptics setting and feel crisper than a plain vibration.
 */
export const haptic = {
  /** Picking an option, e.g. a chip or a time. */
  select() {
    if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick);
    else Haptics.selectionAsync();
  },
  /** Pressing a control, e.g. pause or next exercise. */
  tap() {
    if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  /**
   * Finishing something, e.g. a workout. A two-pulse vibration on both platforms: Android's
   * "confirm" preset can feel no different from a tap, depending on the phone.
   */
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};
