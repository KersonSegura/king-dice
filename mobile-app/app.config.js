/**
 * Expo config - passes Google Web Client ID to app at runtime.
 * The google-services.json (Android) and GoogleService-Info.plist (iOS) files
 * provide the native OAuth configuration.
 */
const appJson = require('./app.json');

// Keep this in sync with `eas.json` production env (and `mobile-app/.env` for local dev).
// `app.config.js` runs in Node; relying only on `process.env` can be flaky depending on how the project is started.
const DEFAULT_WEB_CLIENT_ID =
  '404642348674-af8b9ihfidarjehmurp3tn14vkq2hr6f.apps.googleusercontent.com';

const webClientId =
  (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim() || DEFAULT_WEB_CLIENT_ID;

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo?.extra,
      googleWebClientId: webClientId || undefined,
    },
  },
};
