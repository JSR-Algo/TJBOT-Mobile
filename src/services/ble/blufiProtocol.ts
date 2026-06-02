const BLUFI_TYPE_CTRL = 0x00;
const BLUFI_TYPE_DATA = 0x01;

const BLUFI_CTRL_SET_WIFI_OPMODE = 0x02;
const BLUFI_CTRL_CONNECT_TO_AP = 0x03;
const BLUFI_CTRL_GET_WIFI_LIST = 0x09;

const BLUFI_DATA_STA_SSID = 0x02;
const BLUFI_DATA_STA_PASSWORD = 0x03;
export const BLUFI_DATA_CUSTOM = 0x13;

const BLUFI_FRAME_CONTROL_PLAIN = 0x00;
const BLUFI_FRAME_CONTROL_FRAGMENT = 0x10;
const BLUFI_WIFI_MODE_STA = 0x01;

// ESP-IDF BluFi defaults to BLE MTU 23. Four header bytes plus two fragment
// length bytes leaves 12 content bytes, matching BLUFI_FRAG_DATA_DEFAULT_LEN.
const BLUFI_FRAGMENT_CONTENT_BYTES = 12;

/**
 * Encodes a list of TLV items into a flat byte array.
 * Each item: [tag(1), len(1), value(len bytes)].
 * String values are encoded as ASCII bytes.
 */
export function encodeTLV(items: Array<{ tag: number; value: Uint8Array | string }>): Uint8Array {
  const parts: number[][] = [];
  for (const item of items) {
    const valueBytes: number[] = typeof item.value === 'string'
      ? Array.from(item.value, (ch) => ch.charCodeAt(0) & 0xff)
      : Array.from(item.value);
    parts.push([item.tag, valueBytes.length, ...valueBytes]);
  }
  const flat = parts.flat();
  return new Uint8Array(flat);
}

/**
 * Builds BluFi CUSTOM_DATA frames for the given TLV payload.
 * Returns the encoded frames and the next sequence number so the caller can
 * thread it into subsequent frame groups (e.g. station provisioning frames).
 */
export function buildBluFiCustomDataFrames(
  params: { tlv: Uint8Array },
  startSequence: number,
): { frames: string[]; endSequence: number } {
  const writes: string[] = [];
  const data = Array.from(params.tlv);
  const endSequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_CUSTOM), data, startSequence);
  return { frames: writes, endSequence };
}

export function buildBluFiStationProvisioningFrames(params: {
  ssid: string;
  password: string;
  startSequence?: number;
}): string[] {
  let sequence = params.startSequence ?? 0;
  const writes: string[] = [];

  sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_CTRL, BLUFI_CTRL_SET_WIFI_OPMODE), [BLUFI_WIFI_MODE_STA], sequence);

  const ssidBytes = utf8Bytes(params.ssid);
  try {
    sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_STA_SSID), ssidBytes, sequence);
  } finally {
    ssidBytes.fill(0);
  }

  const passwordBytes = utf8Bytes(params.password);
  try {
    sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_STA_PASSWORD), passwordBytes, sequence);
  } finally {
    passwordBytes.fill(0);
  }

  appendBluFiFrames(writes, buildType(BLUFI_TYPE_CTRL, BLUFI_CTRL_CONNECT_TO_AP), [], sequence);
  return writes;
}

export function buildBluFiWifiScanFrames(): string[] {
  return [bytesToBase64([buildType(BLUFI_TYPE_CTRL, BLUFI_CTRL_GET_WIFI_LIST), BLUFI_FRAME_CONTROL_PLAIN, 0x00, 0x00])];
}

function appendBluFiFrames(writes: string[], type: number, data: number[], startSequence: number): number {
  let sequence = startSequence;

  if (data.length === 0) {
    writes.push(bytesToBase64([type, BLUFI_FRAME_CONTROL_PLAIN, sequence, 0x00]));
    return nextSequence(sequence);
  }

  let offset = 0;
  let remaining = data.length;
  while (remaining > 0) {
    if (remaining > BLUFI_FRAGMENT_CONTENT_BYTES) {
      const chunk = data.slice(offset, offset + BLUFI_FRAGMENT_CONTENT_BYTES);
      const frameData = [remaining & 0xff, (remaining >> 8) & 0xff, ...chunk];
      writes.push(bytesToBase64([type, BLUFI_FRAME_CONTROL_FRAGMENT, sequence, frameData.length, ...frameData]));
      offset += BLUFI_FRAGMENT_CONTENT_BYTES;
      remaining -= BLUFI_FRAGMENT_CONTENT_BYTES;
    } else {
      const frameData = data.slice(offset, offset + remaining);
      writes.push(bytesToBase64([type, BLUFI_FRAME_CONTROL_PLAIN, sequence, frameData.length, ...frameData]));
      offset += remaining;
      remaining = 0;
    }
    sequence = nextSequence(sequence);
  }

  return sequence;
}

function buildType(type: number, subtype: number): number {
  return (type & 0x03) | (subtype << 2);
}

function nextSequence(sequence: number): number {
  return (sequence + 1) & 0xff;
}

function utf8Bytes(value: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    let codePoint = value.charCodeAt(i);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    else if (codePoint <= 0xffff) bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    else bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
  }
  return bytes;
}

function bytesToBase64(bytes: number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 0x3f];
    output += alphabet[(triplet >> 12) & 0x3f];
    output += i + 1 < bytes.length ? alphabet[(triplet >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? alphabet[triplet & 0x3f] : '=';
  }
  return output;
}
