import { PermissionsAndroid, Platform } from 'react-native';
import { requestBlePermissions } from '../../src/ble/permissions';

describe('BLE permissions', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: originalVersion, configurable: true });
  });

  test('returns granted on ios', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    const result = await requestBlePermissions();
    expect(result).toBe('granted');
  });

  test('requests Android 12+ bluetooth permissions', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { value: 34, configurable: true });
    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      'android.permission.BLUETOOTH_SCAN': PermissionsAndroid.RESULTS.GRANTED,
      'android.permission.BLUETOOTH_CONNECT': PermissionsAndroid.RESULTS.GRANTED,
    });

    const result = await requestBlePermissions();
    expect(result).toBe('granted');
  });
});
