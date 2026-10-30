/**
 * App variants: the development build installs alongside the production app, with its own
 * package, name and URL scheme (and so its own storage). Everything else comes from `app.json`.
 * Set `APP_VARIANT=development` when building, updating or starting the dev server for it; the
 * `development` profile in `eas.json` sets it for EAS builds.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Mobility (Dev)' : 'Mobility',
  slug: 'mobility-app',
  scheme: IS_DEV ? 'mobilityapp-dev' : 'mobilityapp',
  android: {
    ...config.android,
    package: IS_DEV ? 'com.hogos.mobilityapp.dev' : 'com.hogos.mobilityapp',
  },
});
