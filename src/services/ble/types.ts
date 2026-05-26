export type BlePermissionState = 'granted' | 'denied' | 'unavailable';

export interface BleDeviceCandidate {
  id: string;
  name: string | null;
  localName: string | null;
  serviceUUIDs: string[];
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
