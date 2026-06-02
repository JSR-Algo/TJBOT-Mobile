import { PermissionsAndroid, Platform } from 'react-native';
import type { Permission, PermissionStatus } from 'react-native';
import { requestBlePermissions } from '../../src/services/ble/permissions';

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
    const grantedPermissions = {
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.GRANTED,
    } as { [key in Permission]: PermissionStatus };

    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      ...grantedPermissions,
    });

    const result = await requestBlePermissions();
    expect(result).toBe('granted');
    expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
  });
});
