/**
 * Expo config - passes Google Web Client ID to app at runtime.
 * The google-services.json (Android) and GoogleService-Info.plist (iOS) files
 * provide the native OAuth configuration.
 */
const appJson = require('./app.json');

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

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
