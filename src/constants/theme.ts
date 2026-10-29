/**
 * Colors used in the app, defined for light and dark mode.
 * `tint` is the teal accent used for selected tabs, buttons, progress and highlights.
 * `streak` is a warm amber reserved for the streak flame, so streaks stand apart from the teal UI.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1A19',
    textSecondary: '#5B6B69',
    background: '#F5F8F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3EEEC',
    border: '#DCE6E4',
    tint: '#0F8F82',
    tintSoft: '#D5F0EC',
    onTint: '#FFFFFF',
    streak: '#C97A12',
    streakSoft: '#FCEFD9',
    danger: '#C62828',
  },
  dark: {
    text: '#F2F7F6',
    textSecondary: '#9EB8B4',
    background: '#0A1E1D',
    backgroundElement: '#132E2B',
    backgroundSelected: '#1C3D39',
    border: '#254743',
    tint: '#2CC5B4',
    tintSoft: '#0F423C',
    onTint: '#00201D',
    streak: '#F2A33A',
    streakSoft: '#3A2A12',
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
  xl: 28,
  full: 999,
} as const;

/**
 * Card elevation. Light mode lifts cards off the background with a soft shadow; dark mode
 * shadows barely show, so cards there get a hairline border instead.
 */
export const Elevation = {
  light: {
    boxShadow: '0 1px 2px rgba(11, 26, 25, 0.04), 0 6px 20px rgba(11, 26, 25, 0.06)',
  },
  dark: {
    borderWidth: 1,
    borderColor: '#1E3B38',
  },
} as const;
