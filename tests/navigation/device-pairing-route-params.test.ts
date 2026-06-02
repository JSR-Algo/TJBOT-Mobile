import { readFileSync } from 'fs';
import { join } from 'path';
import { buildPairWifiPasswordParams, getPairWifiPasswordSsid } from '../../src/features/device/pairing/routeParams';
import { serialFromCandidate } from '../../src/features/device/pairing/serialFromCandidate';

const root = join(__dirname, '..', '..');

function source(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('device pairing Wi-Fi route params', () => {
  it('renders local BLE Wi-Fi scan states instead of the old placeholder', () => {
    const src = source('src/features/device/pairing/screens/PairWifiScreen.tsx');

    expect(src).toContain("const openPasswordScreen = (ssid: string): void => {");
    expect(src).toContain('...(route.params ?? {}),');
    expect(src).toContain('...buildPairWifiPasswordParams(ssid),');
    expect(src).toContain('scanRobotWifiNetworks');
    expect(src).toContain('No Robot-scanned networks found. Enter the network name manually.');
    expect(src).not.toContain('Network scan needs device provisioning support.');
    expect(src).not.toContain('Casa-Familia');
    expect(src).not.toContain('No saved networks found');
  });

  it('uses an explicit manual-network value for other network', () => {
    const src = source('src/features/device/pairing/screens/PairWifiScreen.tsx');

    expect(src).toContain("onPress={() => openPasswordScreen('Other network')}");
  });

  it('renders the password screen title from route params', () => {
    const src = source('src/features/device/pairing/screens/PairWifiPasswordScreen.tsx');

    expect(src).toContain('const routeSsid = getPairWifiPasswordSsid(route.params);');
    expect(src).toContain("title={manualSsid ? 'Network name' : ssid}");
    expect(src).not.toContain('title="Casa-Familia"');
  });

  it('keeps Wi-Fi passwords out of React Navigation route params', () => {
    expect(source('src/navigation/routes.ts')).not.toContain('PairConnectingScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; code?: string; ssid?: string; password?: string };');

    const connectingScreen = source('src/features/device/pairing/screens/PairConnectingScreen.tsx');
    expect(connectingScreen).not.toContain("getParamString(params, 'password')");
    expect(connectingScreen).toContain('provisionWifiViaLocalBle');
    expect(connectingScreen).toContain('confirmLocalBlePaired');
    expect(connectingScreen).not.toContain('/devices/provision/local-ble-paired');
  });

  it('uses local BLE for BLE transport and keeps backend connect as fallback', () => {
    const connectingScreen = source('src/features/device/pairing/screens/PairConnectingScreen.tsx');

    expect(connectingScreen).toContain('runLocalBleProvisioning');
    expect(connectingScreen).toContain('runBackendProvisioning');
    expect(connectingScreen).toContain('pairDevice({');
  });

  it('builds typed password params and trims selected SSIDs', () => {
    expect(buildPairWifiPasswordParams(' Casa-Familia ')).toEqual({ ssid: 'Casa-Familia' });
  });

  it('extracts only real serial-bearing BLE advertisement values', () => {
    expect(serialFromCandidate({
      id: 'F7355775-9465-4E0E-9FE1-9624B4517D8A',
      name: 'TBot-Blufi',
      localName: 'BLUFI_DEVICE',
      serviceUUIDs: [],
    })).toBeUndefined();

    expect(serialFromCandidate({
      id: 'ble-device-1',
      name: 'Setup TBOT-2026-00001234',
      localName: 'TBot-Blufi',
      serviceUUIDs: [],
    })).toBe('TBOT-2026-00001234');

    expect(serialFromCandidate({
      id: 'ble-device-2',
      name: 'TBot-Blufi',
      localName: 'TBot-Blufi',
      serviceUUIDs: [],
      manufacturerData: encodeBase64(asciiBytes('serial=TJBot-001')),
    })).toBe('TJBot-001');
  });

  it('validates missing, blank, and control-character SSIDs at runtime', () => {
    expect(getPairWifiPasswordSsid(undefined)).toBe('Selected network');
    expect(getPairWifiPasswordSsid({ ssid: '   ' })).toBe('Selected network');
    expect(getPairWifiPasswordSsid({ ssid: 'Bad\nNetwork' })).toBe('Selected network');
    expect(getPairWifiPasswordSsid({ ssid: 'A'.repeat(40) })).toBe('A'.repeat(32));
  });
});

function asciiBytes(value: string): number[] {
  return Array.from(value).map((char) => char.charCodeAt(0));
}

function encodeBase64(bytes: number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 0x3f];
    output += alphabet[(triplet >> 12) & 0x3f];
    output += i + 1 < bytes.length ? alphabet[(triplet >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? alphabet[triplet & 0x3f] : '=';
  }
  return output;
}
