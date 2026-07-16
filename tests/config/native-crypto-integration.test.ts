import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

describe('native crypto integration', () => {
  it('loads the secure random-values polyfill before Expo crypto and app code', () => {
    const entrypoint = readFileSync(join(root, 'index.js'), 'utf8');
    const polyfillIndex = entrypoint.indexOf("import 'react-native-get-random-values'");
    const expoCryptoIndex = entrypoint.indexOf("import 'expo-crypto'");
    const appIndex = entrypoint.indexOf("import App from './src/App'");

    expect(polyfillIndex).toBeGreaterThanOrEqual(0);
    expect(polyfillIndex).toBeLessThan(expoCryptoIndex);
    expect(polyfillIndex).toBeLessThan(appIndex);
    expect(entrypoint).not.toContain('require(');
  });

  it('locks both native crypto modules into the iOS Pods snapshot', () => {
    const lockfile = readFileSync(join(root, 'ios/Podfile.lock'), 'utf8');

    expect(lockfile).toMatch(/ExpoCrypto/);
    expect(lockfile).toMatch(/react-native-get-random-values/);
  });

  it('never falls back to Math.random for BluFi DH entropy', () => {
    const protocol = readFileSync(join(root, 'src/services/ble/blufiProtocol.ts'), 'utf8');
    const randomBytes = protocol.slice(
      protocol.indexOf('function randomBytes'),
      protocol.indexOf('\n}', protocol.indexOf('function randomBytes')) + 2,
    );

    expect(randomBytes).not.toContain('Math.random');
  });
});
