describe('device API client', () => {
  it('loads the primary household device from the documented household route', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'device-1',
            serial_number: 'TJBot-0001',
            status: 'active',
            battery_level: 87,
            firmware_version: '1.0.0',
            last_seen_at: '2026-05-16T00:00:00.000Z',
            connectivity_metrics: {
              connectivity_state: 'online',
              wifi_ssid: 'Casa',
            },
          },
        ],
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { get },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('primary')).resolves.toEqual({
      id: 'device-1',
      name: 'TJBot-0001',
      online: true,
      batteryPercent: 87,
      charging: false,
      wifiSsid: 'Casa',
      lastSeenAt: '2026-05-16T00:00:00.000Z',
    });
    expect(get).toHaveBeenCalledWith('/devices/household/me');
  });

  it('loads a specific device from the documented device detail route', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        id: 'device-2',
        name: 'Kitchen Robot',
        status: 'offline',
        battery_level: 10,
        firmware_version: '1.0.1',
        last_seen_at: '2026-05-15T00:00:00.000Z',
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { get },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('device-2')).resolves.toEqual({
      id: 'device-2',
      name: 'Kitchen Robot',
      online: false,
      batteryPercent: 10,
      charging: false,
      wifiSsid: undefined,
      lastSeenAt: '2026-05-15T00:00:00.000Z',
    });
    expect(get).toHaveBeenCalledWith('/devices/device-2');
  });

  it('unpairs through the documented device deregistration route', async () => {
    jest.resetModules();
    const deleteRequest = jest.fn().mockResolvedValueOnce({ data: { device_id: 'device-3' } });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { delete: deleteRequest },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { unpairDevice } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(unpairDevice('device-3')).resolves.toBeUndefined();
    expect(deleteRequest).toHaveBeenCalledWith('/devices/device-3');
  });

  it('claims a BLE-discovered device through the documented claim route', async () => {
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: {
        device_id: 'device-4',
        household_id: 'household-1',
        state: 'CLAIMED',
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { post },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pairDevice } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(pairDevice({
      serialNumber: 'TJBot-0001',
      code: '4721',
      wifiSsid: 'Casa',
      wifiPassword: 'secret-pass',
    })).resolves.toEqual({ deviceId: 'device-4' });
    expect(post).toHaveBeenCalledWith('/devices/claim', {
      serial_number: 'TJBot-0001',
      ble_code: '4721',
    });
  });
});
