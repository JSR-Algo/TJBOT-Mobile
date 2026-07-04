const { AppRegistry, LogBox } = require('react-native');
import { enableScreens } from 'react-native-screens';
import { ENV } from './src/__env__';
import { name as appName } from './app.json';
import { syncMetroBundlerSession } from './src/dev/metroBundlerSession';

const App = require('./src/App').default;

if (__DEV__) {
  void syncMetroBundlerSession({ reloadOnChange: true });
}

if (ENV.EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true') {
  LogBox.ignoreAllLogs(true);
}

enableScreens();
AppRegistry.registerComponent(appName, () => App);
