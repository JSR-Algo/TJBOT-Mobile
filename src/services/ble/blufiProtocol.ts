import * as ExpoCrypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import 'crypto-js/mode-cfb';
import 'crypto-js/pad-nopadding';

const BLUFI_TYPE_CTRL = 0x00;
const BLUFI_TYPE_DATA = 0x01;

const BLUFI_DATA_NEGOTIATE = 0x00;
const BLUFI_CTRL_SET_SECURITY_MODE = 0x01;
const BLUFI_CTRL_SET_WIFI_OPMODE = 0x02;
const BLUFI_CTRL_CONNECT_TO_AP = 0x03;
const BLUFI_CTRL_GET_WIFI_LIST = 0x09;

const BLUFI_DATA_STA_SSID = 0x02;
const BLUFI_DATA_STA_PASSWORD = 0x03;
export const BLUFI_DATA_CUSTOM = 0x13;

const BLUFI_FRAME_CONTROL_PLAIN = 0x00;
const BLUFI_FRAME_CONTROL_ENCRYPTED = 0x01;
const BLUFI_FRAME_CONTROL_CHECKSUM = 0x02;
const BLUFI_FRAME_CONTROL_FRAGMENT = 0x10;
const BLUFI_WIFI_MODE_STA = 0x01;
const BLUFI_DH_P_HEX = 'cf5cf5c38419a724957ff5dd323b9c45c3cdd261eb740f69aa94b8bb1a5c9640' +
  '9153bd76b24222d03274e4725a5406092e9e82e9135c643cae98132b0d95f7d6' +
  '5347c68afc1e677da90e51bbab5f5cf429c291b4ba39c6b2dc5e8c7231e46aa7' +
  '728e87664532cdf547be20c9a3fa8342be6e34371a27c06f7dc0edddd2f86373';
const BLUFI_DH_P_BYTES = 128;
const BLUFI_SET_SECURITY_DATA_CHECKSUM_ENCRYPTED = 0x03;

// ESP-IDF BluFi defaults to BLE MTU 23. Four header bytes plus two fragment
// length bytes leaves 12 content bytes, matching BLUFI_FRAG_DATA_DEFAULT_LEN.
const BLUFI_FRAGMENT_CONTENT_BYTES = 12;

export type BluFiSession = {
  readonly key: Uint8Array;
};

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
  params: { tlv: Uint8Array; session?: BluFiSession },
  startSequence: number,
): { frames: string[]; endSequence: number } {
  const writes: string[] = [];
  const data = Array.from(params.tlv);
  const endSequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_CUSTOM), data, startSequence, params.session);
  return { frames: writes, endSequence };
}

export function buildBluFiSecurityNegotiationFrames(
  options: { privateKey?: Uint8Array } = {},
  startSequence: number,
): { frames: string[]; endSequence: number; privateKey: Uint8Array } {
  let sequence = startSequence;
  const writes: string[] = [];
  const p = hexToBytes(BLUFI_DH_P_HEX);
  const g = [0x02];
  const privateKey = options.privateKey ?? randomBytes(BLUFI_DH_P_BYTES);
  const publicKey = leftPadBytes(bigIntToBytes(modPow(2n, resolveDhPrivateKey(privateKey), hexToBigInt(BLUFI_DH_P_HEX))), BLUFI_DH_P_BYTES);
  const pgkLength = p.length + g.length + publicKey.length + 6;

  sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_NEGOTIATE), [0x00, (pgkLength >> 8) & 0xff, pgkLength & 0xff], sequence);
  sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_NEGOTIATE), [
    0x01,
    (p.length >> 8) & 0xff,
    p.length & 0xff,
    ...p,
    (g.length >> 8) & 0xff,
    g.length & 0xff,
    ...g,
    (publicKey.length >> 8) & 0xff,
    publicKey.length & 0xff,
    ...publicKey,
  ], sequence);
  sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_CTRL, BLUFI_CTRL_SET_SECURITY_MODE), [BLUFI_SET_SECURITY_DATA_CHECKSUM_ENCRYPTED], sequence);

  return { frames: writes, endSequence: sequence, privateKey };
}

export function deriveBluFiSession(params: { privateKey: Uint8Array; peerPublicKey: Uint8Array }): BluFiSession {
  if (params.peerPublicKey.length !== BLUFI_DH_P_BYTES) {
    throw new Error('BluFi peer public key is invalid.');
  }
  const p = hexToBigInt(BLUFI_DH_P_HEX);
  const peerPublicKey = bytesToBigInt(Array.from(params.peerPublicKey));
  if (peerPublicKey <= 1n || peerPublicKey >= p - 1n) {
    throw new Error('BluFi peer public key is invalid.');
  }
  const secret = leftPadBytes(
    bigIntToBytes(modPow(peerPublicKey, resolveDhPrivateKey(params.privateKey), p)),
    BLUFI_DH_P_BYTES,
  );
  return { key: wordArrayToBytes(CryptoJS.MD5(bytesToWordArray(secret))) };
}

export function buildBluFiStationProvisioningFrames(params: {
  ssid: string;
  password: string;
  startSequence?: number;
  session?: BluFiSession;
}): string[] {
  let sequence = params.startSequence ?? 0;
  const writes: string[] = [];

  // After SET_SEC_MODE, Espressif Android encrypts+checksums opmode/SSID/password.
  // CONNECT_TO_AP stays plain (matches official BlufiClientImpl.postStaWifiInfo).
  sequence = appendBluFiFrames(
    writes,
    buildType(BLUFI_TYPE_CTRL, BLUFI_CTRL_SET_WIFI_OPMODE),
    [BLUFI_WIFI_MODE_STA],
    sequence,
    params.session,
  );

  const ssidBytes = utf8Bytes(params.ssid);
  try {
    sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_STA_SSID), ssidBytes, sequence, params.session);
  } finally {
    ssidBytes.fill(0);
  }

  const passwordBytes = utf8Bytes(params.password);
  try {
    sequence = appendBluFiFrames(writes, buildType(BLUFI_TYPE_DATA, BLUFI_DATA_STA_PASSWORD), passwordBytes, sequence, params.session);
  } finally {
    passwordBytes.fill(0);
  }

  appendBluFiFrames(writes, buildType(BLUFI_TYPE_CTRL, BLUFI_CTRL_CONNECT_TO_AP), [], sequence);
  return writes;
}

export function buildBluFiWifiScanFrames(): string[] {
  return [bytesToBase64([buildType(BLUFI_TYPE_CTRL, BLUFI_CTRL_GET_WIFI_LIST), BLUFI_FRAME_CONTROL_PLAIN, 0x00, 0x00])];
}

// Firmware Wi-Fi connection report (BLUFI_TYPE_DATA | WIFI_REP subtype 0x0f).
// On-wire type byte: (0x01 & 0x03) | (0x0f << 2) = 0x3d.
const BLUFI_CONN_REPORT_TYPE = (BLUFI_TYPE_DATA & 0x03) | (0x0f << 2);

/** Accumulator for fragmented WIFI_REP frames (SSID in extra_info often >1 MTU). */
export type BluFiConnReportAccumulator = {
  expectedLength?: number;
  chunks: number[];
};

/**
 * Parses a single-frame (non-streaming) BluFi conn-report. Prefer
 * `ingestBluFiConnReportFrame` when notifies may be fragmented.
 */
export function parseBluFiConnReport(
  frameBytes: number[],
  session?: BluFiSession,
): { connState: number } | null {
  return ingestBluFiConnReportFrame(frameBytes, { chunks: [] }, session);
}

/**
 * Ingest one GATT notify that may be a WIFI_REP fragment or complete frame.
 * After SET_SEC_MODE each frame's data body is AES-CFB encrypted with seq as IV;
 * decrypt per-frame, then reassemble, then read conn_state from payload[1].
 *
 * Returns a result only when a complete report is available with
 * conn_state ∈ {0,1,2}. Incomplete fragments / non-reports return null.
 */
export function ingestBluFiConnReportFrame(
  frameBytes: number[],
  accumulator: BluFiConnReportAccumulator,
  session?: BluFiSession,
): { connState: number } | null {
  if (frameBytes.length < 4) return null;
  const [type, frameControl, sequence, dataLength] = frameBytes;
  if (type !== BLUFI_CONN_REPORT_TYPE) return null;
  if (dataLength === 0) return null;

  const encrypted = (frameControl & BLUFI_FRAME_CONTROL_ENCRYPTED) !== 0;
  const hasChecksum = (frameControl & BLUFI_FRAME_CONTROL_CHECKSUM) !== 0;
  const isFragment = (frameControl & BLUFI_FRAME_CONTROL_FRAGMENT) !== 0;
  const trailer = hasChecksum ? 2 : 0;
  if (frameBytes.length < 4 + dataLength + trailer) return null;

  let data = frameBytes.slice(4, 4 + dataLength);
  if (encrypted) {
    if (!session) return null;
    data = aesCfb128Decrypt(session.key, sequence, data);
  }

  if (isFragment) {
    if (data.length < 2) return null;
    if (accumulator.expectedLength === undefined) {
      accumulator.expectedLength = data[0] | (data[1] << 8);
    }
    accumulator.chunks.push(...data.slice(2));
    if (accumulator.chunks.length < (accumulator.expectedLength ?? Number.POSITIVE_INFINITY)) {
      return null;
    }
    const complete = connStateFromWifiRepPayload(accumulator.chunks);
    accumulator.expectedLength = undefined;
    accumulator.chunks = [];
    return complete;
  }

  // Non-fragment complete frame, or trailing piece after a fragment sequence
  // that omitted the fragment bit on the last packet (defensive).
  if (accumulator.expectedLength !== undefined) {
    accumulator.chunks.push(...data);
    if (accumulator.chunks.length < accumulator.expectedLength) return null;
    const complete = connStateFromWifiRepPayload(accumulator.chunks);
    accumulator.expectedLength = undefined;
    accumulator.chunks = [];
    return complete;
  }

  return connStateFromWifiRepPayload(data);
}

function connStateFromWifiRepPayload(payload: number[]): { connState: number } | null {
  // [opmode, conn_state, ...optional sta info]
  if (payload.length < 2) return null;
  const connState = payload[1];
  if (connState !== 0 && connState !== 1 && connState !== 2) return null;
  return { connState };
}

function appendBluFiFrames(writes: string[], type: number, data: number[], startSequence: number, session?: BluFiSession): number {
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
      writes.push(bytesToBase64(buildBluFiFrame(type, BLUFI_FRAME_CONTROL_FRAGMENT, sequence, frameData, session)));
      offset += BLUFI_FRAGMENT_CONTENT_BYTES;
      remaining -= BLUFI_FRAGMENT_CONTENT_BYTES;
    } else {
      const frameData = data.slice(offset, offset + remaining);
      writes.push(bytesToBase64(buildBluFiFrame(type, BLUFI_FRAME_CONTROL_PLAIN, sequence, frameData, session)));
      offset += remaining;
      remaining = 0;
    }
    sequence = nextSequence(sequence);
  }

  return sequence;
}

function buildBluFiFrame(type: number, frameControl: number, sequence: number, data: number[], session?: BluFiSession): number[] {
  if (!session || data.length === 0) {
    return [type, frameControl, sequence, data.length, ...data];
  }

  const checksum = crc16Be([sequence, data.length, ...data]);
  const encrypted = aesCfb128Encrypt(session.key, sequence, data);
  return [
    type,
    frameControl | BLUFI_FRAME_CONTROL_ENCRYPTED | BLUFI_FRAME_CONTROL_CHECKSUM,
    sequence,
    data.length,
    ...encrypted,
    checksum & 0xff,
    (checksum >> 8) & 0xff,
  ];
}

function buildType(type: number, subtype: number): number {
  return (type & 0x03) | (subtype << 2);
}

function nextSequence(sequence: number): number {
  return (sequence + 1) & 0xff;
}

function resolveDhPrivateKey(provided?: Uint8Array): bigint {
  const p = hexToBigInt(BLUFI_DH_P_HEX);
  const raw = provided ?? randomBytes(BLUFI_DH_P_BYTES);
  const key = bytesToBigInt(Array.from(raw));
  return (key % (p - 3n)) + 2n;
}

function randomBytes(length: number): Uint8Array {
  // Prefer Web Crypto when present (Jest / modern Hermes).
  const cryptoSource = readCryptoSource();
  if (cryptoSource) {
    const bytes = new Uint8Array(length);
    cryptoSource.getRandomValues(bytes);
    return bytes;
  }

  // Expo native CSPRNG (no TurboModule getEnforcing crash on missing polyfill).
  if (typeof ExpoCrypto.getRandomBytes === 'function') {
    const expoBytes = ExpoCrypto.getRandomBytes(length);
    return expoBytes instanceof Uint8Array ? expoBytes : new Uint8Array(expoBytes);
  }

  throw new Error('BluFi secure negotiation requires crypto.getRandomValues');
}

function readCryptoSource(): { getRandomValues: (array: Uint8Array) => Uint8Array } | undefined {
  const candidate: unknown = globalThis.crypto;
  if (typeof candidate !== 'object' || candidate === null) return undefined;
  const record = candidate as { getRandomValues?: unknown };
  if (typeof record.getRandomValues !== 'function') return undefined;
  const getRandomValues = record.getRandomValues;
  return {
    getRandomValues: (array: Uint8Array) => {
      const result = getRandomValues.call(candidate, array);
      return result instanceof Uint8Array ? result : array;
    },
  };
}

function hexToBigInt(hex: string): bigint {
  return BigInt(`0x${hex}`);
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return bytes;
}

function bytesToBigInt(bytes: number[]): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte & 0xff);
  }
  return value;
}

function bytesToWordArray(bytes: number[]): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let index = 0; index < bytes.length; index += 4) {
    words.push(
      ((bytes[index] ?? 0) << 24)
      | ((bytes[index + 1] ?? 0) << 16)
      | ((bytes[index + 2] ?? 0) << 8)
      | (bytes[index + 3] ?? 0),
    );
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function wordArrayToBytes(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const bytes: number[] = [];
  for (let index = 0; index < wordArray.sigBytes; index += 1) {
    const word = wordArray.words[index >>> 2] ?? 0;
    bytes.push((word >>> (24 - (index % 4) * 8)) & 0xff);
  }
  return new Uint8Array(bytes);
}

function aesCfb128Encrypt(key: Uint8Array, sequence: number, data: number[]): number[] {
  const iv = new Array<number>(16).fill(0);
  iv[0] = sequence & 0xff;
  const result = CryptoJS.AES.encrypt(bytesToWordArray(data), bytesToWordArray(Array.from(key)), {
    iv: bytesToWordArray(iv),
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding,
  });
  return Array.from(wordArrayToBytes(result.ciphertext));
}

function aesCfb128Decrypt(key: Uint8Array, sequence: number, data: number[]): number[] {
  const iv = new Array<number>(16).fill(0);
  iv[0] = sequence & 0xff;
  const result = CryptoJS.AES.decrypt(
    { ciphertext: bytesToWordArray(data) } as CryptoJS.lib.CipherParams,
    bytesToWordArray(Array.from(key)),
    {
      iv: bytesToWordArray(iv),
      mode: CryptoJS.mode.CFB,
      padding: CryptoJS.pad.NoPadding,
    },
  );
  return Array.from(wordArrayToBytes(result));
}

/**
 * BluFi CRC used by ESP-IDF `esp_crc16_be` trampoline + Espressif Android
 * `BlufiCRC.calcCRC`. Equivalent to CRC-16 with poly 0x1021, init 0xFFFF,
 * xorout 0xFFFF (not plain XMODEM/init-0).
 */
function crc16Be(bytes: number[]): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= (byte & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return (~crc) & 0xffff;
}

function bigIntToBytes(value: bigint): number[] {
  if (value === 0n) return [0];
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) hex = `0${hex}`;
  return hexToBytes(hex);
}

function leftPadBytes(bytes: number[], length: number): number[] {
  if (bytes.length >= length) return bytes.slice(bytes.length - length);
  return [...new Array<number>(length - bytes.length).fill(0), ...bytes];
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let currentBase = base % modulus;
  let currentExponent = exponent;
  while (currentExponent > 0n) {
    if ((currentExponent & 1n) === 1n) {
      result = (result * currentBase) % modulus;
    }
    currentBase = (currentBase * currentBase) % modulus;
    currentExponent >>= 1n;
  }
  return result;
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
