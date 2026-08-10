import axios from 'axios';
import client, { BASE_URL } from '@/services/http/client';

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
  attemptStatus?: ProvisioningAttemptStatus;
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

export type ProvisioningAttemptStatus = 'started' | 'ble_paired' | 'awaiting_physical_confirm' | 'device_authenticated' | 'completed' | 'failed' | 'expired';

export interface ProvisioningAttemptStatusResult {
  provisioningAttemptId: string;
  deviceId: string;
  status: ProvisioningAttemptStatus;
  failureCode?: string;
}

export interface CompleteDeviceProvisioningParams {
  provisioningAttemptId: string;
  deviceId: string;
  assignChildProfileId?: string;
  displayName: string;
}

export interface CompleteDeviceProvisioningResult {
  device: {
    id: string;
    status: string;
    lifecycleState: string;
    displayName: string;
    assignedChildProfileId: string | null;
  };
}

export interface DeviceStatus {
  id: string;
  name: string;
  serialNumber?: string;
  online: boolean | null;
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
  assignedChildProfileId?: string | null;
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
  assigned_child_profile_id?: string | null;
  assignedChildProfileId?: string | null;
}

function hasOwn(value: object, key: keyof DeviceDto): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function readAssignedChildProfileId(dto: DeviceDto): { present: boolean; value: string | null } {
  if (hasOwn(dto, 'assigned_child_profile_id')) {
    return { present: true, value: dto.assigned_child_profile_id ?? null };
  }
  if (hasOwn(dto, 'assignedChildProfileId')) {
    return { present: true, value: dto.assignedChildProfileId ?? null };
  }
  return { present: false, value: null };
}

function normalizeDevice(dto: DeviceDto): DeviceStatus {
  const wifiRssi = dto.connectivity_metrics?.wifi_rssi;
  const serialNumber = dto.serial_number?.trim();
  const assignedChildProfileId = readAssignedChildProfileId(dto);
  const connectivityState = dto.connectivity_metrics?.connectivity_state;
  const operationalState = dto.status === 'active' || dto.status === 'online' || connectivityState === 'online'
    ? 'online'
    : dto.status === 'offline' || connectivityState === 'offline'
      ? 'offline'
      : null;
  return {
    id: dto.id ?? dto.device_id ?? '',
    name: dto.name ?? dto.display_name ?? dto.serial_number ?? dto.id ?? dto.device_id ?? 'TJBot',
    ...(serialNumber ? { serialNumber } : {}),
    online: operationalState === null ? null : operationalState === 'online',
    batteryPercent: dto.battery_level ?? 0,
    charging: false,
    wifiSsid: dto.connectivity_metrics?.wifi_ssid,
    ...(typeof wifiRssi === 'number' && Number.isFinite(wifiRssi) ? { wifiRssi } : {}),
    lastSeenAt: dto.last_seen_at,
    // Only surface the binding metadata when the backend includes it, preserving
    // explicit null while keeping omitted metadata byte-identical.
    ...(assignedChildProfileId.present ? { assignedChildProfileId: assignedChildProfileId.value } : {}),
  };
}

// Pick the device bound to the active child from a household list. The binding
// (assignedChildProfileId) is only present when the backend surfaces the
// devices.assigned_child_profile_id column — see the residual note. When no
// device matches for an explicit child, return no device. Selecting another
// household robot would cross the child/robot ownership boundary.
function resolveHouseholdDevice(devices: DeviceDto[], childId?: string): DeviceDto {
  if (childId) {
    const bound = devices.find(
      (d) => {
        const binding = readAssignedChildProfileId(d);
        return binding.present && binding.value === childId;
      },
    );
    if (bound) return bound;
    const unbound = devices.find(
      (d) => {
        const binding = readAssignedChildProfileId(d);
        return binding.present && binding.value === null;
      },
    );
    if (unbound) return unbound;
    return {};
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

export interface ReportProvisioningDeviceAuthenticatedParams {
  deviceId: string;
  code: string;
  bootstrapToken: string;
}

export async function mintBootstrapToken(params: { provisioningAttemptId: string }): Promise<MintBootstrapTokenResult> {
  const response = await client.post<MintBootstrapTokenResult>(
    `/devices/provision/${params.provisioningAttemptId}/bootstrap-token`,
  );
  return response.data;
}

export async function reportProvisioningDeviceAuthenticated(
  params: ReportProvisioningDeviceAuthenticatedParams,
): Promise<void> {
  await axios.post(
    `${BASE_URL}/device/provisioning/status`,
    {
      device_id: params.deviceId,
      status: 'device_authenticated',
      code: params.code,
    },
    {
      headers: {
        Authorization: `Bearer ${params.bootstrapToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
  );
}

export async function completeDeviceProvisioning(params: CompleteDeviceProvisioningParams): Promise<CompleteDeviceProvisioningResult> {
  const response = await client.post<CompleteDeviceProvisioningResult>('/devices/provision/complete', {
    provisioningAttemptId: params.provisioningAttemptId,
    deviceId: params.deviceId,
    displayName: params.displayName,
    ...(params.assignChildProfileId !== undefined ? { assignChildProfileId: params.assignChildProfileId } : {}),
  });
  return response.data;
}

// When deviceId === 'primary', resolves the household's device for the given
// active child (childId). In a multi-robot household this prevents a lesson from
// being routed to the wrong robot: the device whose assignedChildProfileId
// matches childId wins. An explicit child never falls back to another device.
// Pass-through deviceIds (a real device id) ignore childId.
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
