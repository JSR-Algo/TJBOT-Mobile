export interface PairDeviceParams {
  code: string;
  wifiSsid: string;
  wifiPassword: string;
}

export interface DeviceStatus {
  id: string;
  name: string;
  online: boolean;
  batteryPercent: number;
}

export interface FirmwareVersion {
  current: string;
  latest: string;
  updateAvailable: boolean;
}

export async function pairDevice(_params: PairDeviceParams): Promise<{ deviceId: string }> {
  throw new Error('not implemented');
}

export async function getDeviceStatus(_deviceId: string): Promise<DeviceStatus> {
  throw new Error('not implemented');
}

export async function getFirmwareVersion(_deviceId: string): Promise<FirmwareVersion> {
  throw new Error('not implemented');
}

export async function runFirmwareUpdate(_deviceId: string): Promise<void> {
  throw new Error('not implemented');
}

export async function setDeviceWifi(_deviceId: string, _ssid: string, _password: string): Promise<void> {
  throw new Error('not implemented');
}

export async function unpairDevice(_deviceId: string): Promise<void> {
  throw new Error('not implemented');
}

export async function pushCourseToDevice(_deviceId: string, _courseId: string): Promise<void> {
  throw new Error('not implemented');
}
