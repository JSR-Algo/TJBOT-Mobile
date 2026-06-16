import { BLE_CONFIG, isAllowlistedDevice } from '@/services/ble/config';
import { splitDevicesByAllowlist } from '@/services/ble/service';

describe('T07: BLE allowlist hardening with service UUID and manufacturer data', () => {
  test('rejects a renamed peripheral that does not advertise the provisioning service UUID', () => {
    expect(
      isAllowlistedDevice({
        deviceId: 'TJBot-EVIL',
        name: 'TJBot Living Room',
        serviceUUIDs: [],
      }),
    ).toBe(false);
  });

  test('rejects a renamed peripheral advertising an unrelated service UUID', () => {
    expect(
      isAllowlistedDevice({
        deviceId: 'TJBot-002',
        name: 'TJBot Kitchen',
        serviceUUIDs: ['00000000-0000-0000-0000-000000000000'],
      }),
    ).toBe(false);
  });

  test('allows a legitimate device with a matching prefix and the provisioning service UUID', () => {
    expect(
      isAllowlistedDevice({
        deviceId: 'TJBot-001',
        name: 'TJBot Bedroom',
        serviceUUIDs: [BLE_CONFIG.SERVICE_UUID],
      }),
    ).toBe(true);
  });

  test('preserves backwards-compatible prefix-only matching when service UUIDs are unavailable', () => {
    expect(
      isAllowlistedDevice({
        deviceId: 'TBT-003',
        name: 'TBT Office',
      }),
    ).toBe(true);

    // Also verify the legacy (deviceId, name) signature still works.
    expect(isAllowlistedDevice('TJBot-004', 'TJBot Garage')).toBe(true);
  });

   
  (BLE_CONFIG.MANUFACTURER_ID ? test : test.skip)(
    'validates manufacturer data when a TJBot manufacturer ID is configured',
    () => {
      expect(
        isAllowlistedDevice({
          deviceId: 'TJBot-005',
          name: 'TJBot Playroom',
          serviceUUIDs: [BLE_CONFIG.SERVICE_UUID],
          manufacturerData: 'wrong-manufacturer',
        }),
      ).toBe(false);

      expect(
        isAllowlistedDevice({
          deviceId: 'TJBot-005',
          name: 'TJBot Playroom',
          serviceUUIDs: [BLE_CONFIG.SERVICE_UUID],
          manufacturerData: BLE_CONFIG.MANUFACTURER_ID,
        }),
      ).toBe(true);
    },
  );

  test('splitDevicesByAllowlist rejects renamed peripherals missing the provisioning service UUID', () => {
    const result = splitDevicesByAllowlist([
      {
        id: 'TJBot-REAL',
        name: 'TJBot Real',
        localName: 'TJBot Real',
        serviceUUIDs: [BLE_CONFIG.SERVICE_UUID],
      },
      {
        id: 'TJBot-FAKE',
        name: 'TJBot Real',
        localName: 'TJBot Real',
        serviceUUIDs: [],
      },
    ]);

    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].id).toBe('TJBot-REAL');
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].id).toBe('TJBot-FAKE');
  });
});
