/**
 * Expo config - derives Google iOS URL scheme from web client ID.
 * Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env (e.g. 123456789-abc.apps.googleusercontent.com).
 * The iosUrlScheme is the reversed client ID: com.googleusercontent.apps.123456789-abc
 * Also passes to extra so login/register can read it at runtime (process.env may not work in all builds).
 */
const appJson = require('./app.json');

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const iosUrlScheme = webClientId
  ? `com.googleusercontent.apps.${webClientId.split('.apps.googleusercontent.com')[0]}`
  : 'com.googleusercontent.apps.REPLACE_WITH_YOUR_CLIENT_ID';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo?.extra,
      googleWebClientId: webClientId || undefined,
    },
    plugins: appJson.expo.plugins.map((p) => {
      if (Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin') {
        return ['@react-native-google-signin/google-signin', { iosUrlScheme }];
      }
      return p;
    }),
  },
};
