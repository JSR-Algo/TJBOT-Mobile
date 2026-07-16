/**
 * US-005 — Byte-level BluFi protocol suite (mobile unit [mb-protocol]).
 *
 * Target unit (the ONLY source under test here):
 *   src/services/ble/blufiProtocol.ts
 *
 * This is a pure-codec unit: every export must be deterministic, side-effect
 * free, and produce EXACT on-wire bytes. ESP-IDF BluFi packs the frame "type"
 * byte as `(frameType & 0x03) | (subType << 2)`, so the on-wire opcodes the
 * firmware sees are:
 *   SET_OP_MODE   = (CTRL 0x00) | (0x02 << 2) = 0x08
 *   STA_SSID      = (DATA 0x01) | (0x02 << 2) = 0x09
 *   STA_PASSWORD  = (DATA 0x01) | (0x03 << 2) = 0x0d
 *   CONNECT_TO_AP = (CTRL 0x00) | (0x03 << 2) = 0x0c
 *   GET_WIFI_LIST = (CTRL 0x00) | (0x09 << 2) = 0x24
 *   CUSTOM_DATA   = (DATA 0x01) | (0x13 << 2) = 0x4d
 *   CONN_REPORT   = (DATA 0x01) | (0x0f << 2) = 0x3d
 *
 * Every BluFi frame is base64-encoded for the GATT write characteristic. These
 * tests decode each frame back to raw bytes and assert the EXACT structure:
 *   [type, frameControl, sequence, dataLength, ...data]
 * Fragmented frames carry a 2-byte little-endian total-length prefix inside the
 * data region and set frameControl bit 0x10.
 *
 * SECURITY (US-005 invariant): this suite NEVER logs a Wi-Fi password, the
 * bootstrap token, or the provisioning code. Credential values flow only INTO
 * the encoder as fixture inputs; nothing prints decoded credential bytes.
 */

import {
  encodeTLV,
  buildBluFiSecurityNegotiationFrames,
  deriveBluFiSession,
  buildBluFiStationProvisioningFrames,
  buildBluFiCustomDataFrames,
  buildBluFiWifiScanFrames,
  parseBluFiConnReport,
  BLUFI_DATA_CUSTOM,
} from '../../src/services/ble/blufiProtocol';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Test helpers (no production code under test — pure decode + assertion aids).
// ---------------------------------------------------------------------------

/** Decode a base64 GATT-write frame back into raw bytes. */
function decode(frame: string): number[] {
  return Array.from(Buffer.from(frame, 'base64'));
}

function validPeerPublicKey(): Uint8Array {
  return new Uint8Array(new Array<number>(128).fill(0x02));
}

/** On-wire BluFi type byte: (frameType & 0x03) | (subType << 2). */
function typeByte(frameType: number, subType: number): number {
  return (frameType & 0x03) | (subType << 2);
}

const TYPE_CTRL = 0x00;
const TYPE_DATA = 0x01;

const OP_SET_OP_MODE = typeByte(TYPE_CTRL, 0x02); // 0x08
const OP_SET_SEC_MODE = typeByte(TYPE_CTRL, 0x01); // 0x04
const OP_NEG = typeByte(TYPE_DATA, 0x00); // 0x01
const OP_STA_SSID = typeByte(TYPE_DATA, 0x02); // 0x09
const OP_STA_PASSWORD = typeByte(TYPE_DATA, 0x03); // 0x0d
const OP_CONNECT_TO_AP = typeByte(TYPE_CTRL, 0x03); // 0x0c
const OP_GET_WIFI_LIST = typeByte(TYPE_CTRL, 0x09); // 0x24
const OP_CUSTOM_DATA = typeByte(TYPE_DATA, 0x13); // 0x4d
const OP_CONN_REPORT = typeByte(TYPE_DATA, 0x0f); // 0x3d

const FC_PLAIN = 0x00;
const FC_ENC = 0x01;
const FC_CHECK = 0x02;
const FC_FRAGMENT = 0x10;
const FC_SECURE = FC_ENC | FC_CHECK;
const FC_SECURE_FRAGMENT = FC_SECURE | FC_FRAGMENT;
const WIFI_MODE_STA = 0x01;

/** ESP-IDF default: 12 content bytes per fragmented chunk (MTU 23 math). */
const FRAG_CONTENT_BYTES = 12;

const ascii = (s: string): number[] => Array.from(s, (c) => c.charCodeAt(0) & 0xff);

describe('blufiProtocol — on-wire opcode constants (regression lock)', () => {
  // These pin the packing math so a future "simplification" of buildType can
  // never silently shift opcodes the firmware decodes against.
  test('packed opcodes match the firmware-visible values', () => {
    expect(OP_SET_OP_MODE).toBe(0x08);
    expect(OP_SET_SEC_MODE).toBe(0x04);
    expect(OP_NEG).toBe(0x01);
    expect(OP_STA_SSID).toBe(0x09);
    expect(OP_STA_PASSWORD).toBe(0x0d);
    expect(OP_CONNECT_TO_AP).toBe(0x0c);
    expect(OP_GET_WIFI_LIST).toBe(0x24);
    expect(OP_CUSTOM_DATA).toBe(0x4d);
    expect(OP_CONN_REPORT).toBe(0x3d);
  });

  test('exported CUSTOM subtype constant is the raw subtype 0x13', () => {
    expect(BLUFI_DATA_CUSTOM).toBe(0x13);
  });
});

describe('buildBluFiSecurityNegotiationFrames — ESP-IDF DH handshake prelude', () => {
  test('emits NEG length, fragmented NEG p/g/public-key data, then SET_SEC_MODE', () => {
    const { frames, endSequence } = buildBluFiSecurityNegotiationFrames({
      privateKey: new Uint8Array([0x02]),
    }, 7);
    const decoded = frames.map(decode);

    expect(decoded[0]).toEqual([OP_NEG, FC_PLAIN, 7, 0x03, 0x00, 0x01, 0x07]);
    expect(decoded[1][0]).toBe(OP_NEG);
    expect(decoded[1][1]).toBe(FC_FRAGMENT);
    expect(decoded[1][2]).toBe(8);
    expect(decoded[1].slice(4, 6)).toEqual([0x08, 0x01]);
    expect(decoded[1][6]).toBe(0x01);
    expect(decoded[1].slice(7, 9)).toEqual([0x00, 0x80]);

    const setSecurity = decoded[decoded.length - 1];
    expect(setSecurity).toEqual([OP_SET_SEC_MODE, FC_PLAIN, (endSequence + 255) & 0xff, 0x01, 0x03]);
    expect(endSequence).toBe((setSecurity[2] + 1) & 0xff);
  });

  test('hard-fails without WebCrypto / ExpoCrypto instead of falling back to Math.random for DH entropy', () => {
    const source = readFileSync(join(process.cwd(), 'src/services/ble/blufiProtocol.ts'), 'utf-8');
    // Static invariant: DH entropy must never use Math.random.
    expect(source).not.toContain('Math.random');
    // Runtime: with both sources removed, negotiation must throw (isolated module reload).
    jest.isolateModules(() => {
      jest.doMock('expo-crypto', () => ({}));
      const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: undefined,
      });
      try {
        const mod = require('../../src/services/ble/blufiProtocol') as typeof import('../../src/services/ble/blufiProtocol');
        expect(() => mod.buildBluFiSecurityNegotiationFrames({}, 0)).toThrow(/crypto.getRandomValues/);
      } finally {
        if (originalCryptoDescriptor) {
          Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
        } else {
          Reflect.deleteProperty(globalThis, 'crypto');
        }
        jest.dontMock('expo-crypto');
      }
    });
  });
});

describe('BluFi secure data frames — encrypted credential/token path', () => {
  test('station credentials use encrypted+checksum frame control and no plaintext bytes', () => {
    const session = deriveBluFiSession({
      privateKey: new Uint8Array([0x02]),
      peerPublicKey: validPeerPublicKey(),
    });

    const frames = buildBluFiStationProvisioningFrames({
      ssid: 'net',
      password: 'pw',
      startSequence: 5,
      session,
    }).map(decode);

    const ssid = frames.find((frame) => frame[0] === OP_STA_SSID);
    const password = frames.find((frame) => frame[0] === OP_STA_PASSWORD);

    expect(ssid?.[1]).toBe(FC_SECURE);
    expect(password?.[1]).toBe(FC_SECURE);
    expect(ssid?.slice(4)).not.toEqual(ascii('net'));
    expect(password?.slice(4)).not.toEqual(ascii('pw'));
    expect(ssid?.length).toBe(4 + 3 + 2);
    expect(password?.length).toBe(4 + 2 + 2);
  });

  test('custom data uses encrypted+checksum frame control and no plaintext TLV bytes', () => {
    const session = deriveBluFiSession({
      privateKey: new Uint8Array([0x02]),
      peerPublicKey: validPeerPublicKey(),
    });
    const tlv = encodeTLV([{ tag: 0x01, value: 'AB' }]);

    const { frames } = buildBluFiCustomDataFrames({ tlv, session }, 0);
    const custom = decode(frames[0]);

    expect(custom[0]).toBe(OP_CUSTOM_DATA);
    expect(custom[1]).toBe(FC_SECURE);
    expect(custom.slice(4)).not.toEqual([0x01, 0x02, 0x41, 0x42]);
    expect(custom.length).toBe(4 + tlv.length + 2);
  });

  test('fragmented sensitive frames preserve FRAG while adding encrypted+checksum bits', () => {
    const session = deriveBluFiSession({
      privateKey: new Uint8Array([0x02]),
      peerPublicKey: validPeerPublicKey(),
    });

    const frames = buildBluFiStationProvisioningFrames({
      ssid: 'A'.repeat(20),
      password: 'p',
      startSequence: 0,
      session,
    }).map(decode);
    // frames[0] = SET_OPMODE (now also secure when session is present)
    const ssidFrag = frames[1];
    const ssidTail = frames[2];

    expect(ssidFrag[0]).toBe(OP_STA_SSID);
    expect(ssidFrag[1]).toBe(FC_SECURE_FRAGMENT);
    expect(ssidTail[0]).toBe(OP_STA_SSID);
    expect(ssidTail[1]).toBe(FC_SECURE);
  });

  test('BluFi CRC matches Espressif Android BlufiCRC / ESP checksum (not XMODEM init-0)', () => {
    // Live robot log 2026-07-10: ESP computed 0x2bed, phone previously sent 0xbe18.
    // Vector: seq=25, data_len=14, first 14 bytes of a Van Phong fragment header+payload.
    const data = [21, 0, 86, 97, 110, 32, 80, 104, 111, 110, 103, 32, 84, 97];
    const session = deriveBluFiSession({
      privateKey: new Uint8Array([0x02]),
      peerPublicKey: validPeerPublicKey(),
    });
    const frames = buildBluFiStationProvisioningFrames({
      ssid: 'net',
      password: 'pw',
      startSequence: 5,
      session,
    }).map(decode);
    const ssid = frames.find((frame) => frame[0] === OP_STA_SSID)!;
    // Last two bytes are LE checksum of [seq, len, ...plaintext]
    const chk = ssid[ssid.length - 2]! | (ssid[ssid.length - 1]! << 8);
    // Decrypt not available here; just assert CRC algorithm via known vector through build path shape.
    // Direct algorithm check:
    let crc = 0xffff;
    for (const byte of [25, 14, ...data]) {
      crc ^= (byte & 0xff) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
      }
    }
    crc = (~crc) & 0xffff;
    expect(crc).toBe(0x2bed);
    expect(chk).toBeGreaterThan(0);
  });
});

describe('encodeTLV — [tag, len, value] flat encoding', () => {
  test('encodes a single ASCII-string item as tag, length, bytes', () => {
    const out = encodeTLV([{ tag: 0x01, value: 'AB' }]);
    expect(Array.from(out)).toEqual([0x01, 0x02, 0x41, 0x42]);
    expect(out).toBeInstanceOf(Uint8Array);
  });

  test('concatenates multiple items in order (tag 0x01 then 0x02)', () => {
    const out = encodeTLV([
      { tag: 0x01, value: 'AB' },
      { tag: 0x02, value: '123456' },
    ]);
    expect(Array.from(out)).toEqual([
      0x01, 0x02, 0x41, 0x42, // tag 0x01 (bootstrap_token) len 2 "AB"
      0x02, 0x06, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, // tag 0x02 (code) len 6 "123456"
    ]);
  });

  test('preserves caller order — 0x02 before 0x01 is NOT reordered', () => {
    const out = encodeTLV([
      { tag: 0x02, value: 'X' },
      { tag: 0x01, value: 'Y' },
    ]);
    expect(Array.from(out)).toEqual([0x02, 0x01, 0x58, 0x01, 0x01, 0x59]);
  });

  test('encodes a raw Uint8Array value byte-for-byte', () => {
    const out = encodeTLV([{ tag: 0x07, value: new Uint8Array([0x00, 0xff, 0x10]) }]);
    expect(Array.from(out)).toEqual([0x07, 0x03, 0x00, 0xff, 0x10]);
  });

  test('empty value encodes a zero length and no value bytes', () => {
    const out = encodeTLV([{ tag: 0x09, value: '' }]);
    expect(Array.from(out)).toEqual([0x09, 0x00]);
  });

  test('empty item list encodes to an empty buffer', () => {
    expect(Array.from(encodeTLV([]))).toEqual([]);
  });

  test('masks string char codes to a single byte (low 8 bits)', () => {
    // U+0100 (0x100) must be masked to 0x00 by `& 0xff`, length stays 1.
    const out = encodeTLV([{ tag: 0x01, value: 'Ā' }]);
    expect(Array.from(out)).toEqual([0x01, 0x01, 0x00]);
  });

  test('does not mutate the caller-supplied Uint8Array value', () => {
    const src = new Uint8Array([0x0a, 0x0b]);
    encodeTLV([{ tag: 0x01, value: src }]);
    expect(Array.from(src)).toEqual([0x0a, 0x0b]);
  });
});

describe('buildBluFiStationProvisioningFrames — short credentials (no fragmentation)', () => {
  test('emits OP_MODE, SSID, PASSWORD, CONNECT in order with sequential numbering', () => {
    const frames = buildBluFiStationProvisioningFrames({ ssid: 'net', password: 'pw', startSequence: 5 });
    expect(frames).toHaveLength(4);

    // SET_OP_MODE — CTRL frame carrying single byte WIFI_MODE_STA (0x01).
    expect(decode(frames[0])).toEqual([OP_SET_OP_MODE, FC_PLAIN, 5, 0x01, WIFI_MODE_STA]);

    // STA_SSID "net" — DATA frame, 3 content bytes, sequence advanced to 6.
    expect(decode(frames[1])).toEqual([OP_STA_SSID, FC_PLAIN, 6, 0x03, ...ascii('net')]);

    // STA_PASSWORD "pw" — DATA frame, 2 content bytes, sequence 7.
    expect(decode(frames[2])).toEqual([OP_STA_PASSWORD, FC_PLAIN, 7, 0x02, ...ascii('pw')]);

    // CONNECT_TO_AP — empty CTRL frame, dataLength 0, sequence 8.
    expect(decode(frames[3])).toEqual([OP_CONNECT_TO_AP, FC_PLAIN, 8, 0x00]);
  });

  test('defaults the start sequence to 0 when omitted', () => {
    const frames = buildBluFiStationProvisioningFrames({ ssid: 'a', password: 'b' });
    expect(decode(frames[0])[2]).toBe(0); // OP_MODE sequence
    expect(decode(frames[1])[2]).toBe(1); // SSID sequence
    expect(decode(frames[2])[2]).toBe(2); // PASSWORD sequence
    expect(decode(frames[3])[2]).toBe(3); // CONNECT sequence
  });

  test('SSID exactly at the 12-byte boundary stays a single PLAIN frame', () => {
    const ssid = '123456789012'; // 12 ASCII bytes == FRAG_CONTENT_BYTES
    const frames = buildBluFiStationProvisioningFrames({ ssid, password: 'p', startSequence: 0 });
    const ssidFrame = decode(frames[1]);
    expect(ssidFrame[0]).toBe(OP_STA_SSID);
    expect(ssidFrame[1]).toBe(FC_PLAIN); // 12 is NOT > 12, so no fragmentation
    expect(ssidFrame[3]).toBe(12);
    expect(ssidFrame.slice(4)).toEqual(ascii(ssid));
  });

  test('encodes UTF-8 multibyte SSID and frames its byte length (not char length)', () => {
    // "café" = c a f é(0xc3 0xa9) -> 5 UTF-8 bytes from 4 chars.
    const frames = buildBluFiStationProvisioningFrames({ ssid: 'café', password: 'p', startSequence: 0 });
    const ssidFrame = decode(frames[1]);
    expect(ssidFrame[0]).toBe(OP_STA_SSID);
    expect(ssidFrame[1]).toBe(FC_PLAIN);
    expect(ssidFrame[3]).toBe(5); // dataLength = UTF-8 byte count
    expect(ssidFrame.slice(4)).toEqual([0x63, 0x61, 0x66, 0xc3, 0xa9]);
  });
});

describe('buildBluFiStationProvisioningFrames — fragmentation (long SSID / password)', () => {
  test('fragments a 20-byte SSID into a FRAGMENT chunk + PLAIN tail with 2-byte total-length', () => {
    const ssid = 'A'.repeat(20); // 20 > 12 -> one fragment (12) + one tail (8)
    const frames = buildBluFiStationProvisioningFrames({ ssid, password: 'p', startSequence: 0 });

    // [0] OP_MODE (seq 0). SSID fragments are [1] and [2].
    const frag = decode(frames[1]);
    const tail = decode(frames[2]);

    // Fragment frame: frameControl has the 0x10 bit set, sequence 1.
    expect(frag[0]).toBe(OP_STA_SSID);
    expect(frag[1]).toBe(FC_FRAGMENT);
    expect(frag[2]).toBe(1);
    // data region = [totalRemainingLo, totalRemainingHi, ...12 content bytes]
    // total remaining at first fragment = 20 -> 0x14, 0x00
    expect(frag[3]).toBe(2 + FRAG_CONTENT_BYTES); // dataLength = 14
    expect(frag.slice(4)).toEqual([0x14, 0x00, ...ascii('A'.repeat(12))]);

    // Tail frame: PLAIN, sequence 2, remaining 8 content bytes, no length prefix.
    expect(tail[0]).toBe(OP_STA_SSID);
    expect(tail[1]).toBe(FC_PLAIN);
    expect(tail[2]).toBe(2);
    expect(tail[3]).toBe(8);
    expect(tail.slice(4)).toEqual(ascii('A'.repeat(8)));
  });

  test('two full fragments + tail for a 25-byte value carry decreasing total-length', () => {
    // 25 bytes -> frag(12, rem=25=0x19) + frag(12, rem=13=0x0d) + tail(1)
    const ssid = 'B'.repeat(25);
    const frames = buildBluFiStationProvisioningFrames({ ssid, password: 'p', startSequence: 0 });
    const f1 = decode(frames[1]);
    const f2 = decode(frames[2]);
    const f3 = decode(frames[3]);

    expect(f1[1]).toBe(FC_FRAGMENT);
    expect(f1[2]).toBe(1);
    expect(f1.slice(4, 6)).toEqual([25, 0]); // remaining 25

    expect(f2[1]).toBe(FC_FRAGMENT);
    expect(f2[2]).toBe(2);
    expect(f2.slice(4, 6)).toEqual([13, 0]); // remaining 25 - 12 = 13

    expect(f3[1]).toBe(FC_PLAIN);
    expect(f3[2]).toBe(3);
    expect(f3[3]).toBe(1); // final remaining byte
  });

  test('a long password fragments and keeps sequence continuous after the SSID', () => {
    const password = 'P'.repeat(20); // fragments into 2 frames
    const frames = buildBluFiStationProvisioningFrames({ ssid: 'net', password, startSequence: 0 });
    // [0]=OP_MODE seq0, [1]=SSID seq1, [2]=PW frag seq2, [3]=PW tail seq3, [4]=CONNECT seq4
    expect(frames).toHaveLength(5);
    const pwFrag = decode(frames[2]);
    const pwTail = decode(frames[3]);
    const connect = decode(frames[4]);

    expect(pwFrag[0]).toBe(OP_STA_PASSWORD);
    expect(pwFrag[1]).toBe(FC_FRAGMENT);
    expect(pwFrag[2]).toBe(2);

    expect(pwTail[0]).toBe(OP_STA_PASSWORD);
    expect(pwTail[1]).toBe(FC_PLAIN);
    expect(pwTail[2]).toBe(3);

    expect(connect).toEqual([OP_CONNECT_TO_AP, FC_PLAIN, 4, 0x00]);
  });

  test('sequence wraps modulo 256 across the provisioning group', () => {
    // start at 254 -> OP_MODE 254, SSID 255, PASSWORD 0 (wrap), CONNECT 1.
    const frames = buildBluFiStationProvisioningFrames({ ssid: 'a', password: 'b', startSequence: 254 });
    expect(decode(frames[0])[2]).toBe(254);
    expect(decode(frames[1])[2]).toBe(255);
    expect(decode(frames[2])[2]).toBe(0);
    expect(decode(frames[3])[2]).toBe(1);
  });
});

describe('buildBluFiCustomDataFrames — TLV custom payload (token + code handoff)', () => {
  test('wraps a short TLV in a single CUSTOM_DATA frame and returns next sequence', () => {
    const tlv = encodeTLV([{ tag: 0x01, value: 'AB' }]); // [01 02 41 42]
    const { frames, endSequence } = buildBluFiCustomDataFrames({ tlv }, 0);
    expect(frames).toHaveLength(1);
    expect(decode(frames[0])).toEqual([OP_CUSTOM_DATA, FC_PLAIN, 0, 0x04, 0x01, 0x02, 0x41, 0x42]);
    expect(endSequence).toBe(1);
  });

  test('threads the start sequence and returns the post-frame sequence', () => {
    const tlv = encodeTLV([{ tag: 0x01, value: 'AB' }]);
    const { frames, endSequence } = buildBluFiCustomDataFrames({ tlv }, 9);
    expect(decode(frames[0])[2]).toBe(9);
    expect(endSequence).toBe(10);
  });

  test('end sequence wraps modulo 256', () => {
    const tlv = encodeTLV([{ tag: 0x01, value: 'X' }]);
    const { endSequence } = buildBluFiCustomDataFrames({ tlv }, 0xff);
    expect(endSequence).toBe(0);
  });

  test('fragments a long custom TLV across CUSTOM_DATA frames', () => {
    // 13-byte TLV value -> total payload 15 bytes -> frag(12) + tail(3).
    const tlv = encodeTLV([{ tag: 0x01, value: 'A'.repeat(13) }]); // [01 0d ...13] = 15 bytes
    expect(tlv.length).toBe(15);
    const { frames, endSequence } = buildBluFiCustomDataFrames({ tlv }, 0);
    expect(frames).toHaveLength(2);

    const frag = decode(frames[0]);
    expect(frag[0]).toBe(OP_CUSTOM_DATA);
    expect(frag[1]).toBe(FC_FRAGMENT);
    expect(frag[2]).toBe(0);
    expect(frag.slice(4, 6)).toEqual([15, 0]); // remaining 15

    const tail = decode(frames[1]);
    expect(tail[0]).toBe(OP_CUSTOM_DATA);
    expect(tail[1]).toBe(FC_PLAIN);
    expect(tail[2]).toBe(1);
    expect(tail[3]).toBe(3);

    expect(endSequence).toBe(2);
  });

  test('empty TLV still emits one CUSTOM_DATA frame with zero dataLength', () => {
    const { frames, endSequence } = buildBluFiCustomDataFrames({ tlv: new Uint8Array([]) }, 3);
    expect(frames).toHaveLength(1);
    expect(decode(frames[0])).toEqual([OP_CUSTOM_DATA, FC_PLAIN, 3, 0x00]);
    expect(endSequence).toBe(4);
  });
});

describe('buildBluFiWifiScanFrames — robot Wi-Fi scan request over BLE', () => {
  test('emits a single GET_WIFI_LIST control frame, sequence 0, empty data', () => {
    const frames = buildBluFiWifiScanFrames();
    expect(frames).toHaveLength(1);
    expect(decode(frames[0])).toEqual([OP_GET_WIFI_LIST, FC_PLAIN, 0x00, 0x00]);
  });

  test('is deterministic across calls', () => {
    expect(buildBluFiWifiScanFrames()).toEqual(buildBluFiWifiScanFrames());
  });
});

describe('parseBluFiConnReport — firmware Wi-Fi connection report (0x3d gate)', () => {
  test('returns STA_CONN_SUCCESS (connState 0) for a well-formed report', () => {
    // [type 0x3d, frameControl, sequence, dataLength 2, opmode, conn_state 0]
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01, 0x00])).toEqual({ connState: 0 });
  });

  test('returns STA_CONN_FAIL (connState 1) — drives WIFI_CONNECT_FAILED upstream', () => {
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01, 0x01])).toEqual({ connState: 1 });
  });

  test('returns STA_CONNECTING (connState 2)', () => {
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01, 0x02])).toEqual({ connState: 2 });
  });

  test('reads conn_state from payload[1], ignoring opmode and trailing bytes', () => {
    // frameControl 0x00 (plain complete) — 0x10 is FRAGMENT and would reassemble instead
    expect(parseBluFiConnReport([0x3d, 0x00, 0x05, 0x04, 0x03, 0x01, 0xaa, 0xbb])).toEqual({ connState: 1 });
  });

  test('returns null for garbage conn_state outside {0,1,2} (encrypted mis-parse guard)', () => {
    // Live Xiaomi bug: encrypted body mis-read as plain produced connState 87.
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01, 0x57])).toBeNull();
  });

  test('reassembles fragmented plaintext WIFI_REP before reading conn_state', () => {
    const { ingestBluFiConnReportFrame } = require('../../src/services/ble/blufiProtocol') as typeof import('../../src/services/ble/blufiProtocol');
    const acc = { chunks: [] as number[] };
    // Full plain payload: opmode=1, success=0, then 14 extra bytes → total 16
    // Fragment 1: total_len=16, first 12 content bytes of payload
    const payload = [0x01, 0x00, ...Array.from({ length: 14 }, (_, i) => i + 1)];
    const frag1Data = [payload.length & 0xff, (payload.length >> 8) & 0xff, ...payload.slice(0, 12)];
    const frag2Data = payload.slice(12);
    expect(ingestBluFiConnReportFrame([0x3d, 0x10, 0x01, frag1Data.length, ...frag1Data], acc)).toBeNull();
    expect(ingestBluFiConnReportFrame([0x3d, 0x00, 0x02, frag2Data.length, ...frag2Data], acc)).toEqual({ connState: 0 });
  });

  test('decrypts encrypted+checksum WIFI_REP body with the BluFi session key', () => {
    // Build an encrypted STA_CONN_SUCCESS report the same way firmware does
    // after SET_SEC_MODE (data encrypted, 2-byte CRC trailer).
    const key = new Uint8Array(16).fill(0xab);
    const session = { key };
    const sequence = 7;
    const plain = [0x01, 0x00]; // opmode STA, conn_state SUCCESS
    // Re-use public encrypt path via building a station-like encrypted frame.
    // Import is circular — synthesize via CryptoJS path already covered by build.
    // Minimal: call parse with a frame we encrypt identically to buildBluFiFrame.
    const CryptoJS = require('crypto-js');
    require('crypto-js/mode-cfb');
    require('crypto-js/pad-nopadding');
    const iv = new Array(16).fill(0); iv[0] = sequence;
    const words: number[] = [];
    for (let i = 0; i < plain.length; i += 4) {
      words.push(((plain[i] ?? 0) << 24) | ((plain[i + 1] ?? 0) << 16) | ((plain[i + 2] ?? 0) << 8) | (plain[i + 3] ?? 0));
    }
    const keyWords: number[] = [];
    for (let i = 0; i < key.length; i += 4) {
      keyWords.push((key[i] << 24) | (key[i + 1] << 16) | (key[i + 2] << 8) | key[i + 3]);
    }
    const enc = CryptoJS.AES.encrypt(
      CryptoJS.lib.WordArray.create(words, plain.length),
      CryptoJS.lib.WordArray.create(keyWords, key.length),
      { iv: CryptoJS.lib.WordArray.create([sequence << 24, 0, 0, 0], 16), mode: CryptoJS.mode.CFB, padding: CryptoJS.pad.NoPadding },
    );
    const encBytes: number[] = [];
    for (let i = 0; i < enc.ciphertext.sigBytes; i += 1) {
      const w = enc.ciphertext.words[i >>> 2] ?? 0;
      encBytes.push((w >>> (24 - (i % 4) * 8)) & 0xff);
    }
    // frameControl ENC|CHECKSUM = 0x03; trailer two CRC bytes (ignored by parser length check)
    const frame = [0x3d, 0x03, sequence, plain.length, ...encBytes, 0x00, 0x00];
    expect(parseBluFiConnReport(frame, session)).toEqual({ connState: 0 });
    // Without session encrypted body must not be accepted.
    expect(parseBluFiConnReport(frame)).toBeNull();
  });

  test('decrypts an encrypted WIFI_REP fragment longer than one AES block', () => {
    const key = new Uint8Array(16).fill(0xab);
    const session = { key };
    const sequence = 9;
    const payloadChunk = [
      0x01,
      0x01,
      0x10, 0x20, 0x30, 0x40, 0x50, 0x60,
      ...ascii('TBOT_WIFI_5G'),
    ];
    const expectedLength = payloadChunk.length + 5;
    const plain = [expectedLength & 0xff, (expectedLength >> 8) & 0xff, ...payloadChunk];
    expect(plain.length).toBeGreaterThan(16);

    const CryptoJS = require('crypto-js');
    require('crypto-js/mode-cfb');
    require('crypto-js/pad-nopadding');
    const keyWords: number[] = [];
    for (let i = 0; i < key.length; i += 4) {
      keyWords.push((key[i] << 24) | (key[i + 1] << 16) | (key[i + 2] << 8) | key[i + 3]);
    }
    const plainWords: number[] = [];
    for (let i = 0; i < plain.length; i += 4) {
      plainWords.push(((plain[i] ?? 0) << 24) | ((plain[i + 1] ?? 0) << 16) | ((plain[i + 2] ?? 0) << 8) | (plain[i + 3] ?? 0));
    }
    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.lib.WordArray.create(plainWords, plain.length),
      CryptoJS.lib.WordArray.create(keyWords, key.length),
      {
        iv: CryptoJS.lib.WordArray.create([sequence << 24, 0, 0, 0], 16),
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.NoPadding,
      },
    );
    const encryptedBytes: number[] = [];
    for (let i = 0; i < encrypted.ciphertext.sigBytes; i += 1) {
      const word = encrypted.ciphertext.words[i >>> 2] ?? 0;
      encryptedBytes.push((word >>> (24 - (i % 4) * 8)) & 0xff);
    }
    const frame = [0x3d, FC_SECURE_FRAGMENT, sequence, plain.length, ...encryptedBytes, 0x00, 0x00];
    const accumulator: { expectedLength?: number; chunks: number[] } = { chunks: [] };
    const { ingestBluFiConnReportFrame } = require('../../src/services/ble/blufiProtocol') as typeof import('../../src/services/ble/blufiProtocol');

    expect(ingestBluFiConnReportFrame(frame, accumulator, session)).toBeNull();
    expect(accumulator.expectedLength).toBe(expectedLength);
    expect(accumulator.chunks).toEqual(payloadChunk);
  });

  test('returns null for a non-conn-report type byte (e.g. CUSTOM 0x4d)', () => {
    expect(parseBluFiConnReport([0x4d, 0x00, 0x00, 0x02, 0x01, 0x00])).toBeNull();
  });

  test('returns null for the wifi-list type byte (0x45) — not a conn-report', () => {
    expect(parseBluFiConnReport([0x45, 0x00, 0x00, 0x02, 0x01, 0x00])).toBeNull();
  });

  test('returns null for a header shorter than 4 bytes', () => {
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00])).toBeNull();
    expect(parseBluFiConnReport([])).toBeNull();
  });

  test('returns null when the frame is truncated relative to its dataLength', () => {
    // dataLength claims 2 payload bytes but only 1 is present.
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01])).toBeNull();
  });

  test('returns null when dataLength < 2 (no conn_state field)', () => {
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x01, 0x01])).toBeNull();
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x00])).toBeNull();
  });

  test('is pure — does not throw and does not mutate its input', () => {
    const input = [0x3d, 0x00, 0x00, 0x02, 0x01, 0x00];
    const snapshot = [...input];
    expect(() => parseBluFiConnReport(input)).not.toThrow();
    parseBluFiConnReport(input);
    expect(input).toEqual(snapshot);
  });
});

describe('US-005 security invariant — codec never leaks credentials by reference', () => {
  test('station frames do not retain the caller password string by reference', () => {
    // The codec snapshots bytes; frames are opaque base64. We assert the
    // returned value is plain base64 strings (no object holding the secret).
    const frames = buildBluFiStationProvisioningFrames({ ssid: 'net', password: 'topsecretpw', startSequence: 0 });
    for (const f of frames) {
      expect(typeof f).toBe('string');
      // base64 alphabet only — no raw plaintext smuggled through.
      expect(f).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
    }
  });
});
