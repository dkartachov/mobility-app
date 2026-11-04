/**
 * Colors used in the app, defined for light and dark mode.
 * `tint` is the teal accent used for selected tabs, buttons, progress and highlights.
 * `trained` is a warm amber reserved for days with a session, so they stand apart from the teal UI.
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
    /** Fainter than `border`, for outlining cards rather than dividing things. */
    borderSubtle: '#E8EFEE',
    tint: '#0F8F82',
    tintSoft: '#D5F0EC',
    onTint: '#FFFFFF',
    trained: '#C97A12',
    danger: '#C62828',
  },
  dark: {
    text: '#F2F7F6',
    textSecondary: '#9EB8B4',
    background: '#0A1E1D',
    // A step lighter than the background, so cards stand out from it as well as by their outline.
    backgroundElement: '#153330',
    backgroundSelected: '#1E413C',
    border: '#254743',
    borderSubtle: '#1E3B38',
    tint: '#2CC5B4',
    tintSoft: '#0F423C',
    onTint: '#00201D',
    trained: '#F2A33A',
    danger: '#EF5350',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Nunito for titles and numbers; body text stays in the system font. Loaded at runtime in the root
 * layout (so it ships by OTA update), with only the 700 and 800 faces, so pair it with those weights.
 */
export const Fonts = {
  display: 'Nunito',
} as const;

export const DISPLAY_FONT_FACES = [
  {
    fontFamily: Fonts.display,
    fontDefinitions: [
      { path: require('@/assets/fonts/Nunito_700Bold.ttf'), weight: 700 },
      { path: require('@/assets/fonts/Nunito_800ExtraBold.ttf'), weight: 800 },
    ],
  },
];

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoAndHalf: 12,
  three: 16,
  threeAndHalf: 20,
  four: 24,
  five: 32,
  six: 64,
  /** Side padding of every screen, so content doesn't shift sideways between them. */
  screen: 20,
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
    borderColor: Colors.dark.borderSubtle,
  },
} as const;
