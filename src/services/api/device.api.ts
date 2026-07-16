import client from '@/services/http/client';

import { backendContractUnavailable } from './undocumented-api-routes';

export interface ProvisionStartParams {
  serialNumber: string;
  appVersion?: string;
  phonePlatform?: string;
}

export interface ProvisionStartResult {
  provisioningAttemptId: string;
  deviceId: string;
  deviceStatus: string;
}

export interface ConfirmLocalBlePairedParams {
  deviceId: string;
  provisioningAttemptId: string;
  serialNumber: string;
  code: string;
}

export interface ConfirmLocalBlePairedResult {
  deviceId: string;
  provisioningAttemptId: string;
  status: 'ble_paired';
}

export type ProvisioningAttemptStatus = 'started' | 'ble_paired' | 'device_authenticated' | 'completed' | 'failed' | 'expired';

export interface ProvisioningAttemptStatusResult {
  provisioningAttemptId: string;
  deviceId: string;
  status: ProvisioningAttemptStatus;
  failureCode?: string;
}

export interface CompleteDeviceProvisioningParams {
  provisioningAttemptId: string;
  deviceId: string;
  assignChildProfileId: string;
  displayName: string;
}

export interface CompleteDeviceProvisioningResult {
  device: {
    id: string;
    status: string;
    lifecycleState: string;
    displayName: string;
    assignedChildProfileId: string;
  };
}

export interface DeviceStatus {
  id: string;
  name: string;
  serialNumber?: string;
  online: boolean;
  batteryPercent: number;
  wifiSsid?: string;
  wifiRssi?: number;
  charging?: boolean;
  lastSeenAt?: string;
  // Per-child device binding. Present only when the backend surfaces it on the
  // household list (see getDeviceStatus → resolveHouseholdDevice). Today the
  // column EXISTS in the DB (devices.assigned_child_profile_id, set at
  // provisioning complete) but GET /devices/household/me does NOT SELECT it, so
  // this is usually undefined and the resolver falls back to devices[0].
  assignedChildProfileId?: string;
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
  display_name?: string;
  serial_number?: string;
  status?: string;
  battery_level?: number;
  firmware_version?: string;
  last_seen_at?: string;
  connectivity_metrics?: {
    connectivity_state?: string;
    wifi_ssid?: string;
    wifi_rssi?: number;
  };
  // Per-child device binding, read defensively in both casings. The provisioning
  // DB row carries `assigned_child_profile_id`; the provision-complete response
  // uses the camelCase `assignedChildProfileId`. Either may appear if/when the
  // household list starts surfacing the column (currently it does not).
  assigned_child_profile_id?: string;
  assignedChildProfileId?: string;
}

function normalizeDevice(dto: DeviceDto): DeviceStatus {
  const wifiRssi = dto.connectivity_metrics?.wifi_rssi;
  const serialNumber = dto.serial_number?.trim();
  const assignedChildProfileId = dto.assigned_child_profile_id ?? dto.assignedChildProfileId;
  return {
    id: dto.id ?? dto.device_id ?? '',
    name: dto.name ?? dto.display_name ?? dto.serial_number ?? dto.id ?? dto.device_id ?? 'TJBot',
    ...(serialNumber ? { serialNumber } : {}),
    online: dto.status === 'active' || dto.status === 'online' || dto.connectivity_metrics?.connectivity_state === 'online',
    batteryPercent: dto.battery_level ?? 0,
    charging: false,
    wifiSsid: dto.connectivity_metrics?.wifi_ssid,
    ...(typeof wifiRssi === 'number' && Number.isFinite(wifiRssi) ? { wifiRssi } : {}),
    lastSeenAt: dto.last_seen_at,
    // Only surface the binding when present, so the single-device household
    // response stays byte-identical to the pre-binding shape (exact-match tests).
    ...(assignedChildProfileId ? { assignedChildProfileId } : {}),
  };
}

// Pick the device bound to the active child from a household list. The binding
// (assignedChildProfileId) is only present when the backend surfaces the
// devices.assigned_child_profile_id column — see the residual note. When no
// device matches (single-device household, no childId, or the column is not
// surfaced), fall back to the first-listed device, keeping the long-standing
// single-robot behavior byte-identical.
function resolveHouseholdDevice(devices: DeviceDto[], childId?: string): DeviceDto {
  if (childId) {
    const bound = devices.find(
      (d) => (d.assigned_child_profile_id ?? d.assignedChildProfileId) === childId,
    );
    if (bound) return bound;
  }
  return devices[0] ?? {};
}

export async function startDeviceProvisioning(params: ProvisionStartParams): Promise<ProvisionStartResult> {
  const response = await client.post<ProvisionStartResult>('/devices/provision/start', {
    serialNumber: params.serialNumber,
    appVersion: params.appVersion,
    phonePlatform: params.phonePlatform,
  });
  return response.data;
}

export async function confirmLocalBlePaired(params: ConfirmLocalBlePairedParams): Promise<ConfirmLocalBlePairedResult> {
  const response = await client.post<ConfirmLocalBlePairedResult>('/devices/provision/local-ble-paired', {
    deviceId: params.deviceId,
    provisioningAttemptId: params.provisioningAttemptId,
    serialNumber: params.serialNumber,
    code: params.code,
  });
  return response.data;
}

export async function getProvisioningAttemptStatus(provisioningAttemptId: string): Promise<ProvisioningAttemptStatusResult> {
  const response = await client.get<ProvisioningAttemptStatusResult>(`/devices/provision/${provisioningAttemptId}/status`);
  return response.data;
}

export interface MintBootstrapTokenResult {
  token: string;
  expiresAt: string;
  ttlSeconds: number;
}

export async function mintBootstrapToken(params: { provisioningAttemptId: string }): Promise<MintBootstrapTokenResult> {
  const response = await client.post<MintBootstrapTokenResult>(
    `/devices/provision/${params.provisioningAttemptId}/bootstrap-token`,
  );
  return response.data;
}

export async function completeDeviceProvisioning(params: CompleteDeviceProvisioningParams): Promise<CompleteDeviceProvisioningResult> {
  const response = await client.post<CompleteDeviceProvisioningResult>('/devices/provision/complete', {
    provisioningAttemptId: params.provisioningAttemptId,
    deviceId: params.deviceId,
    assignChildProfileId: params.assignChildProfileId,
    displayName: params.displayName,
  });
  return response.data;
}

// When deviceId === 'primary', resolves the household's device for the given
// active child (childId). In a multi-robot household this prevents a lesson from
// being routed to the wrong robot: the device whose assignedChildProfileId
// matches childId wins, falling back to the first-listed device when none
// matches (single robot, no childId, or backend not yet surfacing the binding —
// see residual). Pass-through deviceIds (a real device id) ignore childId.
export async function getDeviceStatus(deviceId: string, childId?: string): Promise<DeviceStatus> {
  if (deviceId === 'primary') {
    const response = await client.get<DeviceDto[] | { data?: DeviceDto[] }>('/devices/household/me');
    const payload = response.data;
    const devices = Array.isArray(payload) ? payload : payload.data ?? [];
    return normalizeDevice(resolveHouseholdDevice(devices, childId));
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
  backendContractUnavailable(`setDeviceWifi:${_deviceId}`);
}

export async function unpairDevice(deviceId: string): Promise<void> {
  await client.delete(`/devices/${deviceId}`);
}

export async function pushCourseToDevice(_deviceId: string, _courseId: string): Promise<void> {
  backendContractUnavailable(`pushCourseToDevice:${_deviceId}:${_courseId}`);
}
