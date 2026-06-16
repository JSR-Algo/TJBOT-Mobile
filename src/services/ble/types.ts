export type BlePermissionState =
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'poweredOff'
  | 'unauthorized';

export interface BleDeviceCandidate {
  id: string;
  name: string | null;
  localName: string | null;
  serviceUUIDs: string[];
  rssi: number | null;
}

export interface BleBootstrapResult {
  permission: BlePermissionState;
  available: boolean;
  reason?: string;
}

export interface BleScanResult {
  allowed: BleDeviceCandidate[];
  blocked: BleDeviceCandidate[];
}
