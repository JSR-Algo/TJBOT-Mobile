import { BLE_CONFIG, isAllowlistedDevice } from '../../src/services/ble/config';
import { initializeBle, splitDevicesByAllowlist } from '../../src/services/ble/service';

jest.mock('../../src/services/ble/permissions', () => ({
  requestBlePermissions: jest.fn(),
}));

const { requestBlePermissions } = jest.requireMock('../../src/services/ble/permissions') as {
  requestBlePermissions: jest.Mock;
};

describe('BLE service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes BLE when permission is granted', async () => {
    requestBlePermissions.mockResolvedValue('granted');
    const result = await initializeBle();
    expect(result).toEqual({ permission: 'granted', available: true });
  });

  test('returns unavailable state when permission is denied', async () => {
    requestBlePermissions.mockResolvedValue('denied');
    const result = await initializeBle();
    expect(result.available).toBe(false);
    expect(result.permission).toBe('denied');
  });

  test('enforces allowlist filtering before pairing', () => {
    const result = splitDevicesByAllowlist([
      { id: 'tjbot-001', name: 'tjbot Bedroom', localName: 'tjbot Bedroom', serviceUUIDs: [BLE_CONFIG.SERVICE_UUID] },
      { id: 'XYZ-001', name: 'Speaker', localName: 'Speaker', serviceUUIDs: [BLE_CONFIG.SERVICE_UUID] },
    ]);

    expect(result.allowed).toHaveLength(1);
    expect(result.blocked).toHaveLength(1);
    expect(isAllowlistedDevice('tjbot-001', 'tjbot Bedroom')).toBe(true);
    expect(isAllowlistedDevice('XYZ-001', 'Speaker')).toBe(false);
  });
});
