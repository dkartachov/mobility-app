/**
 * App variants: the development build installs alongside the production app, with its own name,
 * identifier and URL scheme (and so its own storage). Everything else comes from `app.json`.
 * `APP_VARIANT=development` picks the development variant: the `development` profile in
 * `eas.json` sets it for EAS builds, and the `dev` and `update:dev` scripts set it for the dev
 * server and EAS updates, which don't read `eas.json`.
 * https://docs.expo.dev/tutorial/eas/multiple-app-variants/
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

const IDENTIFIER = IS_DEV ? 'com.hogos.mobilityapp.dev' : 'com.hogos.mobilityapp';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Mobility (Dev)' : 'Mobility',
  slug: 'mobility-app',
  scheme: IS_DEV ? 'mobilityapp-dev' : 'mobilityapp',
  ios: {
    ...config.ios,
    bundleIdentifier: IDENTIFIER,
  },
  android: {
    ...config.android,
    package: IDENTIFIER,
  },
  plugins: [
    ...(config.plugins ?? []),
    // Only the development build registers the scheme Expo CLI and EAS Update QR codes open.
    ['expo-dev-client', { addGeneratedScheme: IS_DEV }],
  ],
});
