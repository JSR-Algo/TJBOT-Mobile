import client from '@/services/http/client';

import {
  backendContractUnavailable,
  BackendContractUnavailableError,
  isBackendContractUnavailableError,
} from './undocumented-api-routes';

export { BackendContractUnavailableError, isBackendContractUnavailableError };

export interface PairDeviceParams {
  code: string;
  wifiSsid: string;
  wifiPassword: string;
  serialNumber?: string;
}

export interface Device {
  id: string;
  serial_number: string;
  hardware_revision: string;
  state: 'UNPROVISIONED' | 'REGISTERED' | 'CLAIMED' | 'ACTIVE' | 'OFFLINE' | 'FACTORY_RESET';
  status:
    | 'factory_new'
    | 'provisioning'
    | 'active'
    | 'offline'
    | 'safe_mode'
    | 'transferred'
    | 'decommissioned'
    | 'quarantined'
    | null;
  household_id: string | null;
  lifecycle_state: 'unassigned' | 'assigned' | null;
  last_seen_at: string | null;
  firmware_version: string | null;
  battery_level: number | null;
  connectivity_metrics: {
    connectivity_state?: string;
    wifi_ssid?: string;
    wifi_rssi?: number;
  } | null;
  created_at: string;
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

function normalizeDevice(dto: Device): DeviceStatus {
  return {
    id: dto.id,
    name: dto.serial_number,
    online: dto.status === 'active' || dto.connectivity_metrics?.connectivity_state === 'online',
    batteryPercent: dto.battery_level ?? 0,
    charging: false,
    wifiSsid: dto.connectivity_metrics?.wifi_ssid,
    lastSeenAt: dto.last_seen_at ?? undefined,
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
    const response = await client.get<{ data: Device[] }>('/devices/household/me');
    const primary = response.data.data[0];
    if (!primary) {
      throw new Error('No primary device found');
    }
    return normalizeDevice(primary);
  }
  const response = await client.get<Device>(`/devices/${deviceId}`);
  return normalizeDevice(response.data);
}

export async function getFirmwareVersion(_deviceId: string): Promise<FirmwareVersion> {
  backendContractUnavailable(`getFirmwareVersion:${_deviceId}`);
}

export async function runFirmwareUpdate(_deviceId: string): Promise<void> {
  backendContractUnavailable(`runFirmwareUpdate:${_deviceId}`);
}

export async function setDeviceWifi(
  _deviceId: string,
  _ssid: string,
  _password: string,
): Promise<void> {
  backendContractUnavailable(`setDeviceWifi:${_deviceId}:${_ssid}:${_password.length}`);
}

export async function unpairDevice(deviceId: string): Promise<void> {
  await client.delete(`/devices/${deviceId}`);
}

export async function pushCourseToDevice(_deviceId: string, _courseId: string): Promise<void> {
  backendContractUnavailable(`pushCourseToDevice:${_deviceId}:${_courseId}`);
}
