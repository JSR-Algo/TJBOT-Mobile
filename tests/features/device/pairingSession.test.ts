import { deriveDisplayCode, deriveSerialFromBle } from '@/features/device/pairing/pairingSession';

describe('pairingSession helpers', () => {
  it('derives serial from BLE name', () => {
    expect(
      deriveSerialFromBle({
        id: 'aa:bb:cc',
        name: 'TJBot-2A8F',
        localName: null,
        serviceUUIDs: [],
        rssi: -55,
      }),
    ).toBe('TJBot-2A8F');
  });

  it('derives display code digits from name', () => {
    expect(
      deriveDisplayCode({
        id: 'aa:bb:cc',
        name: 'TJBot-4721',
        localName: null,
        serviceUUIDs: [],
        rssi: -55,
      }),
    ).toBe('4721');
  });
});