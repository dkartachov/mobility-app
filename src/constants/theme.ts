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
    danger: '#C62828',
  },
  dark: {
    text: '#F2F7F6',
    textSecondary: '#A3B3B1',
    background: '#0E1514',
    backgroundElement: '#18211F',
    backgroundSelected: '#22302D',
    border: '#2B3A37',
    tint: '#2CC5B4',
    tintSoft: '#123A36',
    onTint: '#00201D',
    streak: '#F2A33A',
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
