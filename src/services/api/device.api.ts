import client from '@/services/http/client';

import { backendContractUnavailable } from './undocumented-api-routes';

export interface PairDeviceParams {
  code: string;
  wifiSsid: string;
  wifiPassword: string;
  serialNumber?: string;
}

export interface DeviceStatus {
  id: string;
  name: string;
  online: boolean;
  batteryPercent: number;
  wifiSsid?: string;
  charging?: boolean;
  lastSeenAt?: string;
}

export interface FirmwareVersion {
  current: string;
  latest: string;
  updateAvailable: boolean;
}

interface DeviceDto {
  id?: string;
  device_id?: string;
  name?: string;
  serial_number?: string;
  status?: string;
  battery_level?: number;
  firmware_version?: string;
  last_seen_at?: string;
  connectivity_metrics?: {
    connectivity_state?: string;
    wifi_ssid?: string;
  };
}

function normalizeDevice(dto: DeviceDto): DeviceStatus {
  return {
    id: dto.id ?? dto.device_id ?? '',
    name: dto.name ?? dto.serial_number ?? dto.id ?? dto.device_id ?? 'TJBot',
    online: dto.status === 'active' || dto.status === 'online' || dto.connectivity_metrics?.connectivity_state === 'online',
    batteryPercent: dto.battery_level ?? 0,
    charging: false,
    wifiSsid: dto.connectivity_metrics?.wifi_ssid,
    lastSeenAt: dto.last_seen_at,
  };
}

export async function pairDevice(params: PairDeviceParams): Promise<{ deviceId: string }> {
  const response = await client.post<{ device_id: string }>('/devices/claim', {
    serial_number: params.serialNumber,
    ble_code: params.code,
  });
  return { deviceId: response.data.device_id };
}

export async function getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
  if (deviceId === 'primary') {
    const response = await client.get<{ data: DeviceDto[] }>('/devices/household/me');
    return normalizeDevice(response.data.data[0] ?? {});
  }
  const response = await client.get<DeviceDto>(`/devices/${deviceId}`);
  return normalizeDevice(response.data);
}

export async function getFirmwareVersion(_deviceId: string): Promise<FirmwareVersion> {
  backendContractUnavailable(`getFirmwareVersion:${_deviceId}`);
}

export async function runFirmwareUpdate(_deviceId: string): Promise<void> {
  backendContractUnavailable(`runFirmwareUpdate:${_deviceId}`);
}

export async function setDeviceWifi(_deviceId: string, _ssid: string, _password: string): Promise<void> {
  backendContractUnavailable(`setDeviceWifi:${_deviceId}:${_ssid}:${_password.length}`);
}

export async function unpairDevice(deviceId: string): Promise<void> {
  await client.delete(`/devices/${deviceId}`);
}

export async function pushCourseToDevice(_deviceId: string, _courseId: string): Promise<void> {
  backendContractUnavailable(`pushCourseToDevice:${_deviceId}:${_courseId}`);
}
