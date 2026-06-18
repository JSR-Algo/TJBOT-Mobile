/**
 * Detox configuration for TJBot mobile E2E tests.
 *
 * Runs Jest with the Detox runner against iOS simulator and Android emulator.
 * Local run:
 *   npm run detox:build:ios  && npm run detox:test:ios
 *   npm run detox:build:android && npm run detox:test:android
 *
 * Backend / AI endpoints are configurable per platform via env vars:
 *   E2E_IOS_API_URL, E2E_ANDROID_API_URL, E2E_IOS_AI_URL, E2E_ANDROID_AI_URL,
 *   E2E_IOS_SIMULATOR_DEVICE_TYPE, E2E_ENABLE_VOICE_TEST_HARNESS.
 *
 * Required by tests/e2e-native-coverage-contract.test.ts. Metro config is
 * shared so e2e bundles match production transforms: require('./metro.config.js').
 */
const VOICE_HARNESS = process.env.E2E_ENABLE_VOICE_TEST_HARNESS === 'true' ? 'true' : 'false';
const IOS_SIMULATOR_DEVICE_TYPE = process.env.E2E_IOS_SIMULATOR_DEVICE_TYPE || 'iPhone 17 Pro';
const IOS_API_URL = process.env.E2E_IOS_API_URL || 'http://localhost:3000';
const IOS_AI_URL = process.env.E2E_IOS_AI_URL || 'http://localhost:3001/api/ai';
const ANDROID_API_URL = process.env.E2E_ANDROID_API_URL || 'http://10.0.2.2:3000';
const ANDROID_AI_URL = process.env.E2E_ANDROID_AI_URL || 'http://10.0.2.2:3001/api/ai';
const IS_ANDROID_CONFIGURATION = process.argv.join(' ').includes('android.emu.debug');
const METRO_API_URL = IS_ANDROID_CONFIGURATION ? ANDROID_API_URL : IOS_API_URL;
const METRO_AI_URL = IS_ANDROID_CONFIGURATION ? ANDROID_AI_URL : IOS_AI_URL;

process.env.TBOT_API_URL = METRO_API_URL;
process.env.TBOT_AI_URL = METRO_AI_URL;

const metroConfig = require('./metro.config.js'); // eslint-disable-line @typescript-eslint/no-unused-vars

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/TJBOT.app',
      build:
        `TBOT_API_URL=${IOS_API_URL} TBOT_AI_URL=${IOS_AI_URL} SIMULATION_MODE=true EXPO_PUBLIC_VOICE_TEST_HARNESS=true xcodebuild -workspace ios/TJBotMobile.xcworkspace -scheme TJBotMobile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=- -destination 'generic/platform=iOS Simulator'`,
      launchArgs: {
        TBOT_API_URL: IOS_API_URL,
        TBOT_AI_URL: IOS_AI_URL,
        voiceHarness: VOICE_HARNESS,
      },
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        `cd android && TBOT_API_URL=${ANDROID_API_URL} TBOT_AI_URL=${ANDROID_AI_URL} SIMULATION_MODE=true EXPO_PUBLIC_VOICE_TEST_HARNESS=true ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug -Pe2eBundleDebug=true && cd ..`,
      reversePorts: [8081],
      launchArgs: {
        TBOT_API_URL: ANDROID_API_URL,
        TBOT_AI_URL: ANDROID_AI_URL,
        voiceHarness: VOICE_HARNESS,
      },
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: IOS_SIMULATOR_DEVICE_TYPE,
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
