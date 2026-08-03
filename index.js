const { LogBox } = require('react-native');
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import { ENV } from './src/__env__';
import { syncMetroBundlerSession } from './src/dev/metroBundlerSession';

// These warnings fire while the App module tree is being imported (before
// src/App.tsx body runs), so suppress them here. The LogBox pill overlaps the
// bottom tab bar and swallows taps on pushed screens (Maestro + real users).
LogBox.ignoreLogs([
  'The global process.env.EXPO_OS is not defined',
  'Require cycle: src/features/lesson-demo',
  'Require cycle: src/navigation/featureRegistry',
]);

const App = require('./src/App').default;

if (__DEV__) {
  void syncMetroBundlerSession({ reloadOnChange: true });
}

if (ENV.EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true') {
  LogBox.ignoreAllLogs(true);
}

enableScreens();
registerRootComponent(App);
