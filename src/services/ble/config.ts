export const BLE_CONFIG = {
  SERVICE_UUID: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  ALLOWLIST_PREFIXES: ['TBOT', 'TBT'],
  SCAN_TIMEOUT_MS: 10000,
} as const;

export function isAllowlistedDevice(deviceId: string, name?: string | null): boolean {
  const normalizedId = deviceId.trim().toUpperCase();
  const normalizedName = (name ?? '').trim().toUpperCase();

  return BLE_CONFIG.ALLOWLIST_PREFIXES.some((prefix) =>
    normalizedId.startsWith(prefix) || normalizedName.startsWith(prefix),
  );
}
