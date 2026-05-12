import { PermissionsAndroid, Platform } from 'react-native';
import type { BlePermissionState } from './types';

export async function requestBlePermissions(): Promise<BlePermissionState> {
  if (Platform.OS === 'ios') {
    return 'granted';
  }

  if (Platform.OS !== 'android') {
    return 'unavailable';
  }

  if (Platform.Version < 31) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Bluetooth permission required',
        message: 'TBOT needs Bluetooth access to discover and pair with your device.',
        buttonPositive: 'Allow',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);

  return Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED)
    ? 'granted'
    : 'denied';
}
