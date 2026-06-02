export const BLE_CONFIG = {
  SERVICE_UUID: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  BLUFI_SERVICE_UUID: '0000FFFF-0000-1000-8000-00805F9B34FB',
  BLUFI_WRITE_CHARACTERISTIC_UUID: '0000FF01-0000-1000-8000-00805F9B34FB',
  BLUFI_NOTIFY_CHARACTERISTIC_UUID: '0000FF02-0000-1000-8000-00805F9B34FB',
  ALLOWLIST_PREFIXES: ['TBot', 'TBOT', 'TBT', 'TJBot'],
  SCAN_TIMEOUT_MS: 10000,
} as const;

export const BLE_SCAN_SERVICE_UUIDS = [BLE_CONFIG.BLUFI_SERVICE_UUID, BLE_CONFIG.SERVICE_UUID] as const;

export function isAllowlistedDevice(deviceId: string, name?: string | null): boolean {
  const normalizedId = deviceId.trim().toUpperCase();
  const normalizedName = (name ?? '').trim().toUpperCase();

  return BLE_CONFIG.ALLOWLIST_PREFIXES.some((prefix) => {
    const normalizedPrefix = prefix.trim().toUpperCase();
    return normalizedId.startsWith(normalizedPrefix) || normalizedName.startsWith(normalizedPrefix);
  });
}
