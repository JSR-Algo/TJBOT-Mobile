export const BLE_CONFIG = {
  SERVICE_UUID: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  BLUFI_SERVICE_UUID: '0000FFFF-0000-1000-8000-00805F9B34FB',
  BLUFI_WRITE_CHARACTERISTIC_UUID: '0000FF01-0000-1000-8000-00805F9B34FB',
  BLUFI_NOTIFY_CHARACTERISTIC_UUID: '0000FF02-0000-1000-8000-00805F9B34FB',
  // TBOT/TBot are current branding, TBT is the field serial prefix, and TJBot
  // remains accepted for legacy devices that may still advertise the old name.
  ALLOWLIST_PREFIXES: ['TBot', 'TBOT', 'TBT', 'TJBot'],
  SCAN_TIMEOUT_MS: 10000,
} as const;

type AllowlistCandidate = {
  id: string;
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: readonly string[] | null;
  manufacturerData?: string | null;
  rawScanRecord?: string | null;
  serviceData?: Record<string, string> | null;
};

export function isAllowlistedDevice(deviceId: string, name?: string | null, _serviceUUIDs?: readonly string[] | null): boolean {
  const normalizedId = deviceId.trim().toUpperCase();
  const normalizedName = (name ?? '').trim().toUpperCase();

  return matchesAllowlistPrefix(normalizedId) || matchesAllowlistPrefix(normalizedName);
}

export function isAllowlistedCandidate(candidate: AllowlistCandidate): boolean {
  if (isAllowlistedDevice(candidate.id, candidate.name, candidate.serviceUUIDs)) return true;
  if (candidate.localName && matchesAllowlistPrefix(candidate.localName.trim().toUpperCase())) return true;

  const serviceDataEntries = Object.entries(candidate.serviceData ?? {});

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

/**
 * Normalize BLE UUIDs so Android short forms match the full BluFi UUID.
 * Examples admitted as BluFi: "FFFF", "0000FFFF", "0000ffff-0000-1000-8000-00805f9b34fb".
 * Does NOT strip trailing junk (e.g. "...FBX") so near-miss values stay blocked.
 */
export function normalizeBleUuid(uuid: string): string {
  const trimmed = uuid.trim().toUpperCase();

  if (/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^[0-9A-F]{4}$/.test(trimmed)) {
    return `0000${trimmed}-0000-1000-8000-00805F9B34FB`;
  }
  if (/^[0-9A-F]{8}$/.test(trimmed)) {
    return `${trimmed}-0000-1000-8000-00805F9B34FB`;
  }
  if (/^[0-9A-F]{32}$/.test(trimmed)) {
    return `${trimmed.slice(0, 8)}-${trimmed.slice(8, 12)}-${trimmed.slice(12, 16)}-${trimmed.slice(16, 20)}-${trimmed.slice(20)}`;
  }

  return trimmed;
}

function rawAdvertMatchesAllowlist(value?: string | null): boolean {
  if (!value) return false;

  const bytes = decodeBase64(value);
  if (bytes && (advertisementBytesMatch(bytes) || rawBytesContainRobotIdentity(bytes))) return true;

  const normalizedText = value.trim().toUpperCase();
  return matchesAllowlistPrefix(normalizedText) || normalizedText.includes('TBOT-');
}

function advertisementBytesMatch(bytes: number[]): boolean {
  for (const field of advertisementFields(bytes)) {
    if (field.length < 1) continue;
    const type = field[0];
    const data = field.slice(1);
    if ((type === 0x08 || type === 0x09) && matchesAllowlistPrefix(ascii(data).trim().toUpperCase())) {
      return true;
    }
  }
  return false;
}

function rawBytesContainRobotIdentity(bytes: number[]): boolean {
  const text = ascii(bytes).trim().toUpperCase();
  return BLE_CONFIG.ALLOWLIST_PREFIXES.some((prefix) => text.includes(prefix.toUpperCase()));
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
