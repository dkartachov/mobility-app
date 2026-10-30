/**
 * App variants: development and preview builds install alongside the production app, each with
 * its own name, identifier and URL scheme (and so its own storage). Everything else comes from
 * `app.json`. `APP_VARIANT` picks the variant: the `development` and `preview` profiles in
 * `eas.json` set it for EAS builds, and the `dev` and `update:*` scripts set it for the dev server
 * and EAS updates, which don't read `eas.json`.
 * https://docs.expo.dev/tutorial/eas/multiple-app-variants/
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.hogos.mobilityapp.dev';
  if (IS_PREVIEW) return 'com.hogos.mobilityapp.preview';
  return 'com.hogos.mobilityapp';
};

const getAppName = () => {
  if (IS_DEV) return 'Mobility (Dev)';
  if (IS_PREVIEW) return 'Mobility (Preview)';
  return 'Mobility';
};

const getScheme = () => {
  if (IS_DEV) return 'mobilityapp-dev';
  if (IS_PREVIEW) return 'mobilityapp-preview';
  return 'mobilityapp';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'mobility-app',
  scheme: getScheme(),
  ios: {
    ...config.ios,
    bundleIdentifier: getUniqueIdentifier(),
  },
  android: {
    ...config.android,
    package: getUniqueIdentifier(),
  },
  plugins: [
    ...(config.plugins ?? []),
    // Only the development build registers the scheme Expo CLI and EAS Update QR codes open.
    ['expo-dev-client', { addGeneratedScheme: IS_DEV }],
  ],
});
