import path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../../react-native.config.js');

function loadConfig(): Record<string, unknown> {
  // react-native.config.js is a CommonJS file with no native imports.
   
  return require(CONFIG_PATH) as Record<string, unknown>;
}

describe('T03: Android BLE native linking', () => {
  it('keeps the documented Android manual-link override while ble-plx codegen is incompatible', () => {
    const config = loadConfig();
    const blePlxOverride = (config.dependencies as Record<string, { platforms?: Record<string, unknown> }> | undefined)?.['react-native-ble-plx'];

    const androidOverride = blePlxOverride?.platforms?.android;

    expect(androidOverride).toBeNull();
  });

  it('does not opt react-native-ble-plx out of iOS autolinking', () => {
    const config = loadConfig();
    const blePlxOverride = (config.dependencies as Record<string, { platforms?: Record<string, unknown> }> | undefined)?.['react-native-ble-plx'];

    const iosOverride = blePlxOverride?.platforms?.ios;

    expect(iosOverride).not.toBeNull();
  });
});
