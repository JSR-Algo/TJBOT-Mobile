export const BLE_CONFIG = {
  SERVICE_UUID: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  BLUFI_SERVICE_UUID: '0000FFFF-0000-1000-8000-00805F9B34FB',
  BLUFI_WRITE_CHARACTERISTIC_UUID: '0000FF01-0000-1000-8000-00805F9B34FB',
  BLUFI_NOTIFY_CHARACTERISTIC_UUID: '0000FF02-0000-1000-8000-00805F9B34FB',
  ALLOWLIST_PREFIXES: ['TBot', 'TBOT', 'TBT', 'TJBot'],
  SCAN_TIMEOUT_MS: 30000,
  MIN_RSSI_THRESHOLD: -85,
  MANUFACTURER_ID: null as string | null,
} as const;

export const BLE_SCAN_SERVICE_UUIDS = [BLE_CONFIG.BLUFI_SERVICE_UUID, BLE_CONFIG.SERVICE_UUID] as const;

type AllowlistCandidate = {
  id: string;
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: readonly string[] | null;
  manufacturerData?: string | null;
  rawScanRecord?: string | null;
  serviceData?: Record<string, string> | null;
};

interface AllowlistDeviceInput {
  deviceId: string;
  name?: string | null;
  serviceUUIDs?: readonly string[] | string[];
  manufacturerData?: string | null;
}

export function isAllowlistedDevice(deviceId: string, name?: string | null, serviceUUIDs?: readonly string[] | null): boolean;
export function isAllowlistedDevice(device: AllowlistDeviceInput): boolean;
export function isAllowlistedDevice(
  deviceOrId: string | AllowlistDeviceInput,
  maybeName?: string | null,
  maybeServiceUUIDs?: readonly string[] | null,
): boolean {
  if (typeof deviceOrId === 'object') {
    const { deviceId, name, serviceUUIDs, manufacturerData } = deviceOrId;
    const normalizedId = deviceId.trim().toUpperCase();
    const normalizedName = (name ?? '').trim().toUpperCase();
    const prefixMatch = BLE_CONFIG.ALLOWLIST_PREFIXES.some((prefix) => {
      const normalizedPrefix = prefix.trim().toUpperCase();
      return normalizedId.startsWith(normalizedPrefix) || normalizedName.startsWith(normalizedPrefix);
    });
    if (!prefixMatch) return false;
    if (serviceUUIDs !== undefined && !serviceUUIDs.includes(BLE_CONFIG.SERVICE_UUID)) {
      return false;
    }
    if (BLE_CONFIG.MANUFACTURER_ID != null && manufacturerData !== undefined) {
      if (manufacturerData !== BLE_CONFIG.MANUFACTURER_ID) {
        return false;
      }
    }
    return true;
  }

  const normalizedId = deviceOrId.trim().toUpperCase();
  const normalizedName = (maybeName ?? '').trim().toUpperCase();

  if (matchesAllowlistPrefix(normalizedId) || matchesAllowlistPrefix(normalizedName)) return true;

  // Additive fallback: admit a real BluFi robot whose advertised name lacks a
  // TBOT-family prefix but whose advertised service UUIDs include the BluFi
  // service. Discovery must never depend solely on the advertised name string.
  return hasBluFiServiceUuid(maybeServiceUUIDs);
}

export function isAllowlistedCandidate(candidate: AllowlistCandidate): boolean {
  if (isAllowlistedDevice(candidate.id, candidate.name, candidate.serviceUUIDs)) return true;
  if (candidate.localName && matchesAllowlistPrefix(candidate.localName.trim().toUpperCase())) return true;

  const serviceDataEntries = Object.entries(candidate.serviceData ?? {});
  if (hasBluFiServiceUuid(serviceDataEntries.map(([uuid]) => uuid))) return true;

  const rawPayloads = [
    candidate.rawScanRecord,
    candidate.manufacturerData,
    ...serviceDataEntries.map(([, value]) => value),
  ];
  return rawPayloads.some((value) => rawAdvertMatchesAllowlist(value));
}

function matchesAllowlistPrefix(value: string): boolean {
  return BLE_CONFIG.ALLOWLIST_PREFIXES.some((prefix) => {
    const normalizedPrefix = prefix.trim().toUpperCase();
    return value.startsWith(normalizedPrefix);
  });
}

function hasBluFiServiceUuid(serviceUUIDs?: readonly string[] | null): boolean {
  const normalizedBlufi = BLE_CONFIG.BLUFI_SERVICE_UUID.trim().toUpperCase();
  return (serviceUUIDs ?? []).some((uuid) => uuid.trim().toUpperCase() === normalizedBlufi);
}

function rawAdvertMatchesAllowlist(value?: string | null): boolean {
  if (!value) return false;

  const bytes = decodeBase64(value);
  if (bytes && advertisementBytesMatch(bytes)) return true;

  const normalizedText = value.trim().toUpperCase();
  return matchesAllowlistPrefix(normalizedText) || normalizedText.includes('TBOT-') || normalizedText.includes('0000FFFF');
}

function advertisementBytesMatch(bytes: number[]): boolean {
  for (const field of advertisementFields(bytes)) {
    if (field.length < 1) continue;
    const type = field[0];
    const data = field.slice(1);
    if ((type === 0x08 || type === 0x09) && matchesAllowlistPrefix(ascii(data).trim().toUpperCase())) {
      return true;
    }
    if ((type === 0x02 || type === 0x03) && contains16BitUuid(data, 0xffff)) {
      return true;
    }
    if ((type === 0x06 || type === 0x07) && containsBluFi128BitUuid(data)) {
      return true;
    }
  }
  return false;
}

function advertisementFields(bytes: number[]): number[][] {
  const fields: number[][] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const length = bytes[offset];
    if (!length) break;
    const end = offset + 1 + length;
    if (end > bytes.length) break;
    fields.push(bytes.slice(offset + 1, end));
    offset = end;
  }
  return fields;
}

function contains16BitUuid(bytes: number[], uuid: number): boolean {
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    if ((bytes[index] | (bytes[index + 1] << 8)) === uuid) return true;
  }
  return false;
}

function containsBluFi128BitUuid(bytes: number[]): boolean {
  const blufiLittleEndian = [
    0xfb, 0x34, 0x9b, 0x5f, 0x80, 0x00, 0x00, 0x80,
    0x00, 0x10, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
  ];
  return containsSubarray(bytes, blufiLittleEndian);
}

function containsSubarray(haystack: number[], needle: number[]): boolean {
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((byte, index) => haystack[start + index] === byte)) return true;
  }
  return false;
}

function ascii(bytes: number[]): string {
  return String.fromCharCode(...bytes.filter((byte) => byte >= 0x20 && byte <= 0x7e));
}

function decodeBase64(value: string): number[] | undefined {
  const clean = value.replace(/\s/g, '');
  if (clean.length === 0 || clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(clean)) return undefined;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i]);
    const b = alphabet.indexOf(clean[i + 1]);
    const c = clean[i + 2] === '=' ? 0 : alphabet.indexOf(clean[i + 2]);
    const d = clean[i + 3] === '=' ? 0 : alphabet.indexOf(clean[i + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) return undefined;
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    bytes.push((triplet >> 16) & 0xff);
    if (clean[i + 2] !== '=') bytes.push((triplet >> 8) & 0xff);
    if (clean[i + 3] !== '=') bytes.push(triplet & 0xff);
  }
  return bytes;
}