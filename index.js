// Install native CSPRNG before any module can generate BluFi DH keys.
import 'react-native-get-random-values';
import 'expo-crypto';

import { AppRegistry, LogBox } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { ENV } from './src/__env__';
import { name as appName } from './app.json';
import App from './src/App';

if (ENV.EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true') {
  LogBox.ignoreAllLogs(true);
}

enableScreens();
AppRegistry.registerComponent(appName, () => App);
