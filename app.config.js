const appJson = require('./app.json');

function getGoogleIosUrlScheme(clientId) {
  const suffix = '.apps.googleusercontent.com';

  if (!clientId || !clientId.endsWith(suffix)) {
    return null;
  }

  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

const googleIosUrlScheme = getGoogleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
const plugins = [...(appJson.expo.plugins ?? [])];

function hasPlugin(pluginName) {
  return plugins.some((plugin) => plugin === pluginName || (Array.isArray(plugin) && plugin[0] === pluginName));
}

if (googleIosUrlScheme) {
  plugins.push([
    '@react-native-google-signin/google-signin',
    {
      iosUrlScheme: googleIosUrlScheme
    }
  ]);
}

if (!hasPlugin('expo-apple-authentication')) {
  plugins.push('expo-apple-authentication');
}

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...(appJson.expo.ios ?? {}),
      usesAppleSignIn: true
    },
    plugins,
    extra: {
      ...(appJson.expo.extra ?? {}),
      googleSignIn: {
        webClientIdConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
        androidClientIdConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
        iosClientIdConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
      }
    }
  }
};
