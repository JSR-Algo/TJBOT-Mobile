import { clearLocalPairedDevice, getLocalPairedDeviceId, markLocalDevicePaired } from '@/features/device/pairing/localPairedDevice';
import { getItem, removeItem, setItem } from '@/services/storage/asyncStorage';

jest.mock('@/services/storage/asyncStorage', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

const storageMocks = {
  getItem: getItem as jest.MockedFunction<typeof getItem>,
  removeItem: removeItem as jest.MockedFunction<typeof removeItem>,
  setItem: setItem as jest.MockedFunction<typeof setItem>,
};

describe('localPairedDevice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageMocks.removeItem.mockResolvedValue(undefined);
    storageMocks.setItem.mockResolvedValue(undefined);
  });

  it('normalizes blank local ids to no paired device', async () => {
    storageMocks.getItem.mockResolvedValue('   ');

    await expect(getLocalPairedDeviceId()).resolves.toBeNull();
  });

  it('stores only the normalized backend device id', async () => {
    await markLocalDevicePaired(' device-1 ');

    expect(storageMocks.setItem).toHaveBeenCalledWith('tbot.device.localPairedDeviceId', 'device-1');
  });

  it('clears the local paired marker', async () => {
    await clearLocalPairedDevice();

    expect(storageMocks.removeItem).toHaveBeenCalledWith('tbot.device.localPairedDeviceId');
  });
});
