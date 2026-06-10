import type { BleDeviceCandidate } from '@/services/ble/types';

const SERIAL_PATTERN = /\b(?:TBOT|TBT|TJBOT)-(?!(?:BLUFI|DEVICE)\b)[A-Z0-9][A-Z0-9-]{1,31}\b/i;

export function serialFromCandidate(candidate: BleDeviceCandidate | undefined): string | undefined {
  if (!candidate) return undefined;
  for (const value of candidateSerialSources(candidate)) {
    const serial = value.match(SERIAL_PATTERN)?.[0];
    if (serial) return serial;
  }
  return undefined;
}

function candidateSerialSources(candidate: BleDeviceCandidate): string[] {
  const values = [candidate.localName, candidate.name, candidate.id];
  const serviceDataValues = Object.values(candidate.serviceData ?? {});
  return [...values, candidate.manufacturerData, candidate.rawScanRecord, ...serviceDataValues]
    .flatMap((value) => {
      if (!value) return [];
      return [value, decodeBase64Text(value)];
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function decodeBase64Text(value: string): string | undefined {
  const bytes = decodeBase64(value);
  if (!bytes) return undefined;
  return decodeUtf8(bytes);
}

function decodeBase64(value: string): number[] | undefined {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/\s/g, '');
  if (clean.length === 0 || clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(clean)) return undefined;
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

function decodeUtf8(bytes: number[]): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const first = bytes[i];
    if (first <= 0x7f) {
      output += String.fromCharCode(first);
    } else if (first >= 0xc0 && first <= 0xdf && i + 1 < bytes.length) {
      const second = bytes[++i];
      output += String.fromCharCode(((first & 0x1f) << 6) | (second & 0x3f));
    } else if (first >= 0xe0 && first <= 0xef && i + 2 < bytes.length) {
      const second = bytes[++i];
      const third = bytes[++i];
      output += String.fromCharCode(((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f));
    } else if (first >= 0xf0 && first <= 0xf7 && i + 3 < bytes.length) {
      const second = bytes[++i];
      const third = bytes[++i];
      const fourth = bytes[++i];
      const codePoint = ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f);
      output += String.fromCodePoint(codePoint);
    }
  }
  return output;
}
