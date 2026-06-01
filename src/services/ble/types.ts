export type BlePermissionState = 'granted' | 'denied' | 'unavailable';

export interface BleDeviceCandidate {
  id: string;
  name: string | null;
  localName: string | null;
  serviceUUIDs: string[];
  manufacturerData?: string | null;
  rawScanRecord?: string | null;
  serviceData?: Record<string, string> | null;
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

export interface RobotWifiNetwork {
  ssid: string;
  rssi?: number;
  security?: string;
}

export interface LocalBleProvisioningResult {
  deviceId: string;
  status: 'wifi_credentials_sent';
  transport: 'ble-blufi';
}
