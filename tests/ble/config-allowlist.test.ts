import { BLE_CONFIG, BLE_SCAN_SERVICE_UUIDS, isAllowlistedCandidate, isAllowlistedDevice } from '../../src/services/ble/config';

/**
 * Round-2 gap-fill suite for src/services/ble/config.ts.
 *
 * Asserts the REAL behavior of isAllowlistedDevice() across the three admission
 * paths (id prefix, name prefix, BluFi service-UUID fallback) plus the block
 * path, and locks the BLE_SCAN_SERVICE_UUIDS scan tuple content + order so a
 * regression in either the values or the ordering is caught.
 */
describe('ble/config — BLE_CONFIG constants', () => {
  test('ALLOWLIST_PREFIXES has the expected TBOT-family entries', () => {
    expect(BLE_CONFIG.ALLOWLIST_PREFIXES).toEqual(['TBot', 'TBOT', 'TBT', 'TJBot']);
  });

  test('service UUIDs are the canonical values', () => {
    expect(BLE_CONFIG.SERVICE_UUID).toBe('6E400001-B5A3-F393-E0A9-E50E24DCCA9E');
    expect(BLE_CONFIG.BLUFI_SERVICE_UUID).toBe('0000FFFF-0000-1000-8000-00805F9B34FB');
  });
});

describe('ble/config — BLE_SCAN_SERVICE_UUIDS tuple lock', () => {
  test('contains exactly the BluFi then Nordic-UART service UUIDs in that order', () => {
    // Order is load-bearing: discovery scans BluFi first, then the legacy
    // Nordic-UART service. Lock both content and order.
    expect(BLE_SCAN_SERVICE_UUIDS).toEqual([
      '0000FFFF-0000-1000-8000-00805F9B34FB',
      '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
    ]);
  });

  test('tuple entries are sourced from BLE_CONFIG (no drift)', () => {
    expect(BLE_SCAN_SERVICE_UUIDS[0]).toBe(BLE_CONFIG.BLUFI_SERVICE_UUID);
    expect(BLE_SCAN_SERVICE_UUIDS[1]).toBe(BLE_CONFIG.SERVICE_UUID);
  });

  test('has exactly two entries', () => {
    expect(BLE_SCAN_SERVICE_UUIDS).toHaveLength(2);
  });

  test('BluFi service UUID is first (scanned before legacy UART)', () => {
    expect(BLE_SCAN_SERVICE_UUIDS[0]).toBe(BLE_CONFIG.BLUFI_SERVICE_UUID);
    expect(BLE_SCAN_SERVICE_UUIDS.indexOf(BLE_CONFIG.SERVICE_UUID)).toBe(1);
  });
});

describe('isAllowlistedDevice — name-prefix admission (happy path)', () => {
  test('admits when name starts with each allowlisted prefix (exact case)', () => {
    expect(isAllowlistedDevice('ab:cd:ef', 'TBot-Blufi-001')).toBe(true);
    expect(isAllowlistedDevice('ab:cd:ef', 'TBOT-Blufi-001')).toBe(true);
    expect(isAllowlistedDevice('ab:cd:ef', 'TBT-Blufi-001')).toBe(true);
    expect(isAllowlistedDevice('ab:cd:ef', 'TJBot-Blufi-001')).toBe(true);
  });

  test('admits regardless of name casing (normalized to upper)', () => {
    expect(isAllowlistedDevice('ab:cd:ef', 'tbot-blufi')).toBe(true);
    expect(isAllowlistedDevice('ab:cd:ef', 'TjBoT-x')).toBe(true);
    expect(isAllowlistedDevice('ab:cd:ef', 'tBt-7')).toBe(true);
  });

  test('admits when name has leading/trailing whitespace then a prefix', () => {
    expect(isAllowlistedDevice('ab:cd:ef', '  TBot-Blufi  ')).toBe(true);
    expect(isAllowlistedDevice('ab:cd:ef', '\tTJBot\n')).toBe(true);
  });

  test('does NOT admit when prefix appears mid-name (must be a prefix)', () => {
    expect(isAllowlistedDevice('xy:zz', 'My-TBot')).toBe(false);
    expect(isAllowlistedDevice('xy:zz', 'Speaker-TJBot')).toBe(false);
  });
});

describe('isAllowlistedDevice — deviceId-prefix admission when name does NOT match', () => {
  test('admits via deviceId prefix even though name is non-matching', () => {
    // Real behavior: id prefix alone is sufficient; the name "Speaker" never
    // matches but the TBOT-prefixed id does.
    expect(isAllowlistedDevice('TBot-AA:BB:CC', 'Speaker')).toBe(true);
    expect(isAllowlistedDevice('TJBot-001', 'Random Headset')).toBe(true);
  });

  test('admits via deviceId prefix for every allowlisted prefix', () => {
    expect(isAllowlistedDevice('TBot-1', 'NoMatch')).toBe(true);
    expect(isAllowlistedDevice('TBOT-2', 'NoMatch')).toBe(true);
    expect(isAllowlistedDevice('TBT-3', 'NoMatch')).toBe(true);
    expect(isAllowlistedDevice('TJBot-4', 'NoMatch')).toBe(true);
  });

  test('admits via deviceId prefix with mixed case + whitespace on the id', () => {
    expect(isAllowlistedDevice('  tbot-deadbeef ', 'Speaker')).toBe(true);
    expect(isAllowlistedDevice('\ttJbOt-XX\n', 'Speaker')).toBe(true);
  });

  test('admits via deviceId prefix when name is empty string', () => {
    expect(isAllowlistedDevice('TBOT-empty-name', '')).toBe(true);
  });
});

describe('isAllowlistedDevice — name=null / undefined / nullish handling', () => {
  test('name=null + TBOT-prefixed id → admitted', () => {
    expect(isAllowlistedDevice('TBOT-XYZ', null)).toBe(true);
  });

  test('name=undefined (omitted) + TBOT-prefixed id → admitted', () => {
    expect(isAllowlistedDevice('TJBot-XYZ')).toBe(true);
  });

  test('name=null + non-matching id + no serviceUUIDs → blocked', () => {
    expect(isAllowlistedDevice('UNKNOWN-001', null)).toBe(false);
  });

  test('name=null + non-matching id but BluFi UUID present → admitted', () => {
    expect(isAllowlistedDevice('UNKNOWN-001', null, [BLE_CONFIG.BLUFI_SERVICE_UUID])).toBe(true);
  });

  test('name=undefined + non-matching id + no serviceUUIDs → blocked', () => {
    expect(isAllowlistedDevice('UNKNOWN-002')).toBe(false);
  });
});

describe('isAllowlistedDevice — BluFi service-UUID fallback (name lacks prefix)', () => {
  test('admits a real BluFi robot whose name lacks a TBOT prefix', () => {
    // Exactly the additive fallback documented in config.ts: discovery must not
    // depend solely on the advertised name string.
    expect(isAllowlistedDevice('ES3C35P-001', 'ES3C35P-001', [BLE_CONFIG.BLUFI_SERVICE_UUID])).toBe(true);
  });

  test('trims whitespace on a serviceUUID entry before matching', () => {
    expect(isAllowlistedDevice('ES3C35P-002', 'ES3C35P-002', ['   0000FFFF-0000-1000-8000-00805F9B34FB   '])).toBe(true);
    expect(isAllowlistedDevice('ES3C35P-003', 'ES3C35P-003', ['\t0000FFFF-0000-1000-8000-00805F9B34FB\n'])).toBe(true);
  });

  test('upcases a lowercase serviceUUID entry before matching', () => {
    expect(isAllowlistedDevice('ES3C35P-004', 'ES3C35P-004', [BLE_CONFIG.BLUFI_SERVICE_UUID.toLowerCase()])).toBe(true);
  });

  test('admits when a mixed-case + whitespace serviceUUID entry is trimmed+upcased then matched', () => {
    expect(
      isAllowlistedDevice('ES3C35P-005', 'ES3C35P-005', ['  0000ffff-0000-1000-8000-00805f9b34fb  ']),
    ).toBe(true);
  });

  test('admits when the BluFi UUID is one entry among several non-matching ones', () => {
    expect(
      isAllowlistedDevice('ES3C35P-006', 'ES3C35P-006', [
        '180A',
        'fee0',
        '  0000FFFF-0000-1000-8000-00805F9B34FB  ',
      ]),
    ).toBe(true);
  });
});

describe('isAllowlistedCandidate — Android raw advertisement fallback', () => {
  test('admits a robot when Android exposes the TBOT local name only inside rawScanRecord', () => {
    expect(isAllowlistedCandidate({
      id: 'AA:BB:CC:DD:EE:FF',
      name: null,
      localName: null,
      serviceUUIDs: [],
      rawScanRecord: 'BglUQk9ULQ==',
    })).toBe(true);
  });

  test('admits a robot when Android exposes the BluFi UUID only inside rawScanRecord', () => {
    expect(isAllowlistedCandidate({
      id: 'AA:BB:CC:DD:EE:FF',
      name: null,
      localName: null,
      serviceUUIDs: [],
      rawScanRecord: 'AwP//w==',
    })).toBe(true);
  });

  test('blocks unrelated raw advertisements', () => {
    expect(isAllowlistedCandidate({
      id: 'AA:BB:CC:DD:EE:FF',
      name: null,
      localName: null,
      serviceUUIDs: [],
      rawScanRecord: 'BAlTcGVha2Vy',
    })).toBe(false);
  });
});

describe('isAllowlistedDevice — block path (no prefix, no BluFi UUID)', () => {
  test('blocks when neither name nor id prefix and no service UUIDs', () => {
    expect(isAllowlistedDevice('XYZ-001', 'Speaker')).toBe(false);
  });

  test('blocks when service UUIDs present but none is the BluFi service', () => {
    // The legacy Nordic-UART SERVICE_UUID is NOT a fallback admission trigger.
    expect(isAllowlistedDevice('ES3C35P-101', 'ES3C35P-101', [BLE_CONFIG.SERVICE_UUID])).toBe(false);
    expect(isAllowlistedDevice('ES3C35P-102', 'ES3C35P-102', ['180A', 'fee0', '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'])).toBe(
      false,
    );
  });

  test('blocks when serviceUUIDs is empty array', () => {
    expect(isAllowlistedDevice('ES3C35P-103', 'ES3C35P-103', [])).toBe(false);
  });

  test('blocks when serviceUUIDs is null', () => {
    expect(isAllowlistedDevice('ES3C35P-104', 'ES3C35P-104', null)).toBe(false);
  });

  test('blocks when serviceUUIDs is undefined (omitted)', () => {
    expect(isAllowlistedDevice('ES3C35P-105', 'ES3C35P-105')).toBe(false);
  });

  test('blocks a near-miss UUID (one char off the BluFi service)', () => {
    expect(
      isAllowlistedDevice('ES3C35P-106', 'ES3C35P-106', ['0000FFFE-0000-1000-8000-00805F9B34FB']),
    ).toBe(false);
  });

  test('blocks when BluFi UUID is only a substring of an entry (must be full match after trim)', () => {
    expect(
      isAllowlistedDevice('ES3C35P-107', 'ES3C35P-107', ['0000FFFF-0000-1000-8000-00805F9B34FBX']),
    ).toBe(false);
  });
});

describe('isAllowlistedDevice — boundary & edge cases', () => {
  test('empty deviceId + empty name + no UUIDs → blocked', () => {
    expect(isAllowlistedDevice('', '')).toBe(false);
  });

  test('empty deviceId + null name + no UUIDs → blocked', () => {
    expect(isAllowlistedDevice('', null)).toBe(false);
  });

  test('whitespace-only deviceId + whitespace-only name → blocked', () => {
    expect(isAllowlistedDevice('   ', '   ')).toBe(false);
  });

  test('prefix-equal id (id exactly equals a prefix) → admitted (startsWith is inclusive)', () => {
    expect(isAllowlistedDevice('TBOT', 'Speaker')).toBe(true);
    expect(isAllowlistedDevice('ab:cd', 'TJBot')).toBe(true);
  });

  test('id prefix takes precedence even when serviceUUIDs would also admit', () => {
    expect(isAllowlistedDevice('TBOT-001', null, [BLE_CONFIG.BLUFI_SERVICE_UUID])).toBe(true);
  });

  test('admits via BluFi UUID even when both id and name are empty', () => {
    expect(isAllowlistedDevice('', '', [BLE_CONFIG.BLUFI_SERVICE_UUID])).toBe(true);
  });

  test('does not partial-match a longer would-be prefix (e.g. "TB" is not a prefix)', () => {
    // 'TB' is not in ALLOWLIST_PREFIXES; only TBot/TBOT/TBT/TJBot are.
    expect(isAllowlistedDevice('TB-001', 'TB-Speaker')).toBe(false);
  });

  test('returns a strict boolean (never truthy non-boolean)', () => {
    expect(isAllowlistedDevice('TBOT-1', 'x')).toBe(true);
    expect(isAllowlistedDevice('nope', 'nope')).toBe(false);
    // Guard against accidental return of a string/array from .some / startsWith.
    expect(typeof isAllowlistedDevice('TBOT-1', 'x')).toBe('boolean');
    expect(typeof isAllowlistedDevice('nope', 'nope')).toBe('boolean');
  });
});
