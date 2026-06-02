describe('device API client', () => {
  it('loads the primary household device from the documented household route', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
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
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { get },
    }));

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

    const { unpairDevice } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(unpairDevice('device-3')).resolves.toBeUndefined();
    expect(deleteRequest).toHaveBeenCalledWith('/devices/device-3');
  });

  it('starts consumer provisioning through the documented provisioning route', async () => {
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: {
        provisioningAttemptId: 'attempt-1',
        deviceId: 'device-4',
        deviceStatus: 'provisioning',
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { post },
    }));

    const { startDeviceProvisioning } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(startDeviceProvisioning({
      serialNumber: 'TJBot-0001',
      appVersion: '1.0.0',
      phonePlatform: 'ios',
    })).resolves.toEqual({
      provisioningAttemptId: 'attempt-1',
      deviceId: 'device-4',
      deviceStatus: 'provisioning',
    });
    expect(post).toHaveBeenCalledWith('/devices/provision/start', {
      serialNumber: 'TJBot-0001',
      appVersion: '1.0.0',
      phonePlatform: 'ios',
    });
  });

  it('connects a provisioning attempt through the backend provision bridge', async () => {
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: {
        deviceId: 'device-4',
        provisioningAttemptId: 'attempt-1',
        status: 'esp_bind_requested',
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { post },
    }));

    const { pairDevice } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(pairDevice({
      serialNumber: 'TJBot-0001',
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
      wifiSsid: 'Casa',
      wifiPassword: 'secret-pass',
    })).resolves.toEqual({
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      status: 'esp_bind_requested',
    });
    expect(post).toHaveBeenCalledWith('/devices/provision/connect', {
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      serialNumber: 'TJBot-0001',
      code: '123456',
      wifiSsid: 'Casa',
      wifiPassword: 'secret-pass',
    });
  });

  it('confirms local BLE handoff without sending Wi-Fi credentials', async () => {
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: {
        deviceId: 'device-4',
        provisioningAttemptId: 'attempt-1',
        status: 'ble_paired',
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { post },
    }));

    const { confirmLocalBlePaired } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(confirmLocalBlePaired({
      serialNumber: 'TJBot-0001',
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
    })).resolves.toEqual({
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      status: 'ble_paired',
    });
    expect(post).toHaveBeenCalledWith('/devices/provision/local-ble-paired', {
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      serialNumber: 'TJBot-0001',
      code: '123456',
    });
    expect(JSON.stringify(post.mock.calls)).not.toContain('wifiPassword');
  });

  it('reads provisioning attempt status without sending secrets', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        provisioningAttemptId: 'attempt-1',
        deviceId: 'device-4',
        status: 'device_authenticated',
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { get },
    }));

    const { getProvisioningAttemptStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getProvisioningAttemptStatus('attempt-1')).resolves.toEqual({
      provisioningAttemptId: 'attempt-1',
      deviceId: 'device-4',
      status: 'device_authenticated',
    });
    expect(get).toHaveBeenCalledWith('/devices/provision/attempt-1/status');
    expect(JSON.stringify(get.mock.calls)).not.toContain('secret');
  });

  it('mints a bootstrap token via the bootstrap-token endpoint', async () => {
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: {
        token: 'abc123def456ghi789jkl012mno345pqr678stu',
        expiresAt: '2026-06-01T00:05:00.000Z',
        ttlSeconds: 300,
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { post },
    }));

    const { mintBootstrapToken } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(mintBootstrapToken({ provisioningAttemptId: 'attempt-1' })).resolves.toEqual({
      token: 'abc123def456ghi789jkl012mno345pqr678stu',
      expiresAt: '2026-06-01T00:05:00.000Z',
      ttlSeconds: 300,
    });
    expect(post).toHaveBeenCalledWith('/devices/provision/attempt-1/bootstrap-token');
  });

  it('completes provisioning only through the backend complete endpoint', async () => {
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: {
        device: {
          id: 'device-4',
          status: 'active',
          lifecycleState: 'assigned',
          displayName: 'Living-room Robot',
          assignedChildProfileId: 'child-1',
        },
      },
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { post },
    }));

    const { completeDeviceProvisioning } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(completeDeviceProvisioning({
      provisioningAttemptId: 'attempt-1',
      deviceId: 'device-4',
      assignChildProfileId: 'child-1',
      displayName: 'Living-room Robot',
    })).resolves.toMatchObject({
      device: { id: 'device-4', status: 'active' },
    });
    expect(post).toHaveBeenCalledWith('/devices/provision/complete', {
      provisioningAttemptId: 'attempt-1',
      deviceId: 'device-4',
      assignChildProfileId: 'child-1',
      displayName: 'Living-room Robot',
    });
  });
});
