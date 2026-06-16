import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import type { BlePermissionState } from './types';

export async function requestBlePermissions(): Promise<BlePermissionState> {
  if (Platform.OS === 'ios') {
    const manager = new BleManager();
    const state = await new Promise<string>((resolve) => {
      const subscription = manager.onStateChange((nextState) => {
        resolve(nextState);
        // Remove on next tick in case the listener fires synchronously
        // before the subscription reference is assigned.
        setImmediate(() => subscription.remove());
      }, true);
    });

    if (state === 'PoweredOff') return 'poweredOff';
    if (state === 'Unauthorized') return 'unauthorized';
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
        message: 'TJBot needs Bluetooth access to discover and pair with your device.',
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
