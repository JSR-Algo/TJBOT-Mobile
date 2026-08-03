const { LogBox } = require('react-native');
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import { ENV } from './src/__env__';
import { syncMetroBundlerSession } from './src/dev/metroBundlerSession';

const App = require('./src/App').default;

if (__DEV__) {
  void syncMetroBundlerSession({ reloadOnChange: true });
}

if (ENV.EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true') {
  LogBox.ignoreAllLogs(true);
}

enableScreens();
registerRootComponent(App);
