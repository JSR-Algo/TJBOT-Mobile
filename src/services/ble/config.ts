export const BLE_CONFIG = {
  SERVICE_UUID: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  ALLOWLIST_PREFIXES: ['TJBot', 'TBT'],
  SCAN_TIMEOUT_MS: 30000,
  MIN_RSSI_THRESHOLD: -85,
  MANUFACTURER_ID: null as string | null,
} as const;

interface AllowlistDeviceInput {
  deviceId: string;
  name?: string | null;
  serviceUUIDs?: readonly string[] | string[];
  manufacturerData?: string | null;
}

export function isAllowlistedDevice(deviceId: string, name?: string | null): boolean;
export function isAllowlistedDevice(device: AllowlistDeviceInput): boolean;
export function isAllowlistedDevice(
  deviceOrId: string | AllowlistDeviceInput,
  maybeName?: string | null,
): boolean {
  let deviceId: string;
  let name: string;
  let serviceUUIDs: readonly string[] | string[] | undefined;
  let manufacturerData: string | null | undefined;

  if (typeof deviceOrId === 'string') {
    deviceId = deviceOrId;
    name = maybeName ?? '';
  } else {
    deviceId = deviceOrId.deviceId;
    name = deviceOrId.name ?? '';
    serviceUUIDs = deviceOrId.serviceUUIDs;
    manufacturerData = deviceOrId.manufacturerData;
  }

  const normalizedId = deviceId.trim().toUpperCase();
  const normalizedName = (name ?? '').trim().toUpperCase();

  const prefixMatch = BLE_CONFIG.ALLOWLIST_PREFIXES.some((prefix) => {
    const normalizedPrefix = prefix.trim().toUpperCase();
    return normalizedId.startsWith(normalizedPrefix) || normalizedName.startsWith(normalizedPrefix);
  });

  if (!prefixMatch) return false;

  // Hardening: when service UUIDs are provided, require the provisioning service UUID.
  if (serviceUUIDs !== undefined) {
    if (!serviceUUIDs.includes(BLE_CONFIG.SERVICE_UUID)) {
      return false;
    }
  }

  // Hardening: when a manufacturer ID is configured, require an exact match.
  if (BLE_CONFIG.MANUFACTURER_ID != null && manufacturerData !== undefined) {
    if (manufacturerData !== BLE_CONFIG.MANUFACTURER_ID) {
      return false;
    }
  }

  return true;
}
