import * as path from 'path';

type WorkletsPluginEntry = string | [string, { bundleMode?: boolean }];

const babel = require('@babel/core') as typeof import('@babel/core');
const babelConfig = require('../../babel.config.js') as {
  plugins: WorkletsPluginEntry[];
};

function getWorkletsPluginEntry(): WorkletsPluginEntry | undefined {
  return babelConfig.plugins.find((entry) => {
    if (typeof entry === 'string') {
      return entry === 'react-native-worklets/plugin';
    }
    return entry[0] === 'react-native-worklets/plugin';
  });
}

describe('Worklets Babel configuration', () => {
  it('keeps Worklets bundle mode disabled to match Android native build', () => {
    const entry = getWorkletsPluginEntry();

    expect(entry).toEqual(['react-native-worklets/plugin', { bundleMode: false }]);
  });

  it('transforms Worklets native bootstrap without enabling bundle mode', () => {
    const workletsEntry = path.join(
      __dirname,
      '..',
      '..',
      'node_modules',
      'react-native-worklets',
      'src',
      'initializers',
      'workletRuntimeEntry.native.ts',
    );
    const nativeModule = path.join(
      __dirname,
      '..',
      '..',
      'node_modules',
      'react-native-worklets',
      'src',
      'WorkletsModule',
      'NativeWorklets.native.ts',
    );

    const entryCode = babel.transformFileSync(workletsEntry, {
      configFile: path.join(__dirname, '..', '..', 'babel.config.js'),
      filename: workletsEntry,
    })?.code;
    const moduleCode = babel.transformFileSync(nativeModule, {
      configFile: path.join(__dirname, '..', '..', 'babel.config.js'),
      filename: nativeModule,
    })?.code;

    expect(entryCode).toMatch(/globalThis\._WORKLETS_BUNDLE_MODE\s*=\s*false/);
    expect(entryCode).not.toMatch(/globalThis\._WORKLETS_BUNDLE_MODE\s*=\s*true/);
    expect(moduleCode).toContain('installTurboModule()');
    expect(moduleCode).not.toMatch(/installTurboModule\([^)]*bundleMode[^)]*\)/);
  });
});
