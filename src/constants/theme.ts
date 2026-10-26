/**
 * Colors used in the app, defined for light and dark mode.
 * `tint` is the teal accent used for selected tabs, buttons, progress and highlights.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1A19',
    textSecondary: '#5B6B69',
    background: '#FFFFFF',
    backgroundElement: '#F1F5F4',
    backgroundSelected: '#E0EBE9',
    border: '#D9E3E1',
    tint: '#0F8F82',
    tintSoft: '#D5F0EC',
    onTint: '#FFFFFF',
    danger: '#C62828',
  },
  dark: {
    text: '#F2F7F6',
    textSecondary: '#A3B3B1',
    background: '#000000',
    backgroundElement: '#161C1B',
    backgroundSelected: '#232C2B',
    border: '#2C3735',
    tint: '#2CC5B4',
    tintSoft: '#123A36',
    onTint: '#00201D',
    danger: '#EF5350',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Native tabs draw over screen content, so scrollable screens pad their bottom by this much. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

export const Radius = {
  small: 8,
  medium: 12,
  large: 20,
} as const;
