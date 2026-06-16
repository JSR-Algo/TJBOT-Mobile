import { readFileSync } from 'fs';
import { join } from 'path';
import { buildPairWifiPasswordParams, getPairWifiPasswordSsid } from '../../src/features/device/pairing/routeParams';

const root = join(__dirname, '..', '..');

function source(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('device pairing Wi-Fi route params', () => {
  it('keeps scanned SSIDs out of the UI until device provisioning exists', () => {
    const src = source('src/features/device/pairing/screens/PairWifiScreen.tsx');

    expect(src).toContain("const openPasswordScreen = (ssid: string): void => {");
    expect(src).toContain('buildPairWifiPasswordParams(ssid');
    expect(src).toContain('deviceId: route.params?.deviceId,');
    expect(src).toContain('code: route.params?.code,');
    expect(src).not.toContain('Casa-Familia');
    expect(src).not.toContain('onPress={() => openPasswordScreen(n.name)}');
  });

  it('uses an explicit manual-network value for other network', () => {
    const src = source('src/features/device/pairing/screens/PairWifiScreen.tsx');

    expect(src).toContain("onPress={() => openPasswordScreen('Other network')}");
  });

  it('renders the password screen title from route params', () => {
    const src = source('src/features/device/pairing/screens/PairWifiPasswordScreen.tsx');

    expect(src).toContain('const ssid = getPairWifiPasswordSsid(route.params);');
    expect(src).toContain('title={ssid}');
    expect(src).not.toContain('title="Casa-Familia"');
  });

  it('builds typed password params and trims selected SSIDs', () => {
    expect(buildPairWifiPasswordParams(' Casa-Familia ')).toEqual({ ssid: 'Casa-Familia' });
  });

  it('validates missing, blank, and control-character SSIDs at runtime', () => {
    expect(getPairWifiPasswordSsid(undefined)).toBe('Selected network');
    expect(getPairWifiPasswordSsid({ ssid: '   ' })).toBe('Selected network');
    expect(getPairWifiPasswordSsid({ ssid: 'Bad\nNetwork' })).toBe('Selected network');
    expect(getPairWifiPasswordSsid({ ssid: 'A'.repeat(40) })).toBe('A'.repeat(32));
  });
});
