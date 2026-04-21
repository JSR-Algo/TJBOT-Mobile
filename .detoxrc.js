/**
 * Detox configuration for TBOT mobile E2E tests.
 *
 * Runs Jest with the Detox runner against iOS simulator and Android emulator.
 * Local run:
 *   npm run detox:build:ios  && npm run detox:test:ios
 *   npm run detox:build:android && npm run detox:test:android
 *
 * CI integration (task-s5-mobile-detox-ci) is a separate follow-up — CI
 * simulator/emulator provisioning is non-trivial and out of scope for the
 * scaffolding pass.
 */
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
        'ios/build/Build/Products/Debug-iphonesimulator/TbotMobile.app',
      build:
        "xcodebuild -workspace ios/TbotMobile.xcworkspace -scheme TbotMobile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO",
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
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
