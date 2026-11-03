/**
 * What counts toward the runtime version (`runtimeVersion.policy: "fingerprint"` in app.json): builds
 * only get over-the-air updates published from code with the same fingerprint.
 * https://docs.expo.dev/versions/latest/sdk/fingerprint/
 *
 * The `package.json` scripts only run on our machines, never in the app, so editing them shouldn't
 * cut existing builds off from updates. If a script ever starts changing native code (a
 * `postinstall` that patches it, say), remove this skip.
 */
/** @type {import('expo/fingerprint').Config} */
const config = {
  sourceSkips: ['PackageJsonScriptsAll'],
};

module.exports = config;
