import path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../../react-native.config.js');

function loadConfig(): Record<string, unknown> {
  // react-native.config.js is a CommonJS file with no native imports.
  return require(CONFIG_PATH) as Record<string, unknown>;
}

describe('T03: Restore Android BLE autolinking', () => {
  it('does not opt react-native-ble-plx out of Android autolinking', () => {
    const config = loadConfig();
    const blePlxOverride = (config.dependencies as Record<string, { platforms?: Record<string, unknown> }> | undefined)?.['react-native-ble-plx'];

    // If the override block is absent entirely, autolinking is enabled by default.
    // If it is present, Android must not be explicitly null.
    const androidOverride = blePlxOverride?.platforms?.android;

    expect(androidOverride).not.toBeNull();
  });

  it('does not opt react-native-ble-plx out of iOS autolinking', () => {
    const config = loadConfig();
    const blePlxOverride = (config.dependencies as Record<string, { platforms?: Record<string, unknown> }> | undefined)?.['react-native-ble-plx'];

    const iosOverride = blePlxOverride?.platforms?.ios;

    expect(iosOverride).not.toBeNull();
  });
});
