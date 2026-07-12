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
      serialNumber: 'TJBot-0001',
      online: true,
      batteryPercent: 87,
      charging: false,
      wifiSsid: 'Casa',
      lastSeenAt: '2026-05-16T00:00:00.000Z',
    });
    expect(get).toHaveBeenCalledWith('/devices/household/me');
  });

  it('does not fall back to another child robot when the active child has no binding', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: [
        { id: 'robot-1', name: 'Robot One', assigned_child_profile_id: 'child-1' },
        { id: 'robot-2', name: 'Robot Two', assigned_child_profile_id: 'child-2' },
      ],
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));
    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('primary', 'child-3')).resolves.toMatchObject({ id: '' });
  });

  it('keeps Wi-Fi RSSI from household device connectivity metrics when SSID is absent', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'device-rssi',
          serial_number: 'TJBot-RSSI',
          status: 'active',
          battery_level: 0,
          connectivity_metrics: {
            connectivity_state: 'online',
            wifi_rssi: -55,
          },
        },
      ],
    });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { get },
    }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('primary')).resolves.toMatchObject({
      id: 'device-rssi',
      name: 'TJBot-RSSI',
      online: true,
      batteryPercent: 0,
      wifiRssi: -55,
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

  // ---------------------------------------------------------------------------
  // US-005 mb-device-api extensions: request-shape, status normalization,
  // failureCode passthrough, and the BLE-path "no Wi-Fi credentials" invariant.
  // These assert the real behavior of src/services/api/device.api.ts only; the
  // BLE GATT transport (UUIDs / TLV / station frames) is exercised by the
  // ble-service suite, not this client unit.
  // ---------------------------------------------------------------------------

  // -- startDeviceProvisioning -------------------------------------------------

  it('starts provisioning over the local-BLE/serial path WITHOUT any Wi-Fi credentials in the start payload', async () => {
    // US-005 local-BLE handoff: the START call identifies the device by serial
    // only. No SSID/password is ever attached at this stage — Wi-Fi credentials
    // travel over BLE later, never through the backend start request.
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: { provisioningAttemptId: 'attempt-9', deviceId: 'device-9', deviceStatus: 'started' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { startDeviceProvisioning } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await startDeviceProvisioning({ serialNumber: 'TBOT-0009' });

    const [, body] = post.mock.calls[0];
    expect(body).toMatchObject({ serialNumber: 'TBOT-0009' });
    // No Wi-Fi credentials, code, token, or device secret on the start request.
    const serialized = JSON.stringify(post.mock.calls);
    expect(serialized).not.toContain('wifiPassword');
    expect(serialized).not.toContain('wifiSsid');
    expect(serialized).not.toContain('password');
    expect(body).not.toHaveProperty('wifiSsid');
    expect(body).not.toHaveProperty('wifiPassword');
    expect(body).not.toHaveProperty('code');
    expect(body).not.toHaveProperty('token');
  });

  it('always targets the documented start route and never drops the serial number', async () => {
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: { provisioningAttemptId: 'attempt-min', deviceId: 'device-min', deviceStatus: 'started' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { startDeviceProvisioning } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await startDeviceProvisioning({ serialNumber: 'TBOT-MIN' });

    expect(post).toHaveBeenCalledTimes(1);
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/devices/provision/start');
    // The serial is load-bearing — the backend keys the attempt off it.
    expect(body.serialNumber).toBe('TBOT-MIN');
  });

  it('propagates a backend start failure instead of swallowing it', async () => {
    jest.resetModules();
    const post = jest.fn().mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'DEVICE_ALREADY_CLAIMED' }));
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { startDeviceProvisioning } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(startDeviceProvisioning({ serialNumber: 'TBOT-DUP' }))
      .rejects.toMatchObject({ code: 'DEVICE_ALREADY_CLAIMED' });
  });

  // -- confirmLocalBlePaired (BLE handoff, no Wi-Fi credentials) ---------------

  it('reports BLE handoff as ble_paired only and never a final/completed status', async () => {
    // The local-BLE-paired confirmation is a non-authoritative handoff signal.
    // It must surface exactly 'ble_paired' — it can never stand in for the
    // backend's device_authenticated / completed claim-confirmation.
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: { deviceId: 'device-4', provisioningAttemptId: 'attempt-1', status: 'ble_paired' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { confirmLocalBlePaired } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await confirmLocalBlePaired({
      serialNumber: 'TBOT-0001',
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
    });

    expect(result.status).toBe('ble_paired');
    expect(result.status).not.toBe('completed');
    expect(result.status).not.toBe('device_authenticated');
  });

  it('never includes ANY Wi-Fi credential key (ssid OR password) on the BLE-paired payload', async () => {
    // Strongest form of the invariant: the BLE-paired bridge carries device
    // identity + the 6-digit code only. Both wifiSsid AND wifiPassword must be
    // absent, and no raw password value may appear anywhere in the call.
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: { deviceId: 'device-4', provisioningAttemptId: 'attempt-1', status: 'ble_paired' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { confirmLocalBlePaired } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await confirmLocalBlePaired({
      serialNumber: 'TBOT-0001',
      deviceId: 'device-4',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
    });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/devices/provision/local-ble-paired');
    expect(Object.keys(body).sort()).toEqual(['code', 'deviceId', 'provisioningAttemptId', 'serialNumber']);
    expect(body).not.toHaveProperty('wifiSsid');
    expect(body).not.toHaveProperty('wifiPassword');
    expect(JSON.stringify(post.mock.calls)).not.toContain('wifiSsid');
    expect(JSON.stringify(post.mock.calls)).not.toContain('wifiPassword');
  });

  // -- getProvisioningAttemptStatus (status normalization + failureCode) -------

  it.each([
    'started',
    'ble_paired',
    'device_authenticated',
    'completed',
    'failed',
    'expired',
  ] as const)('passes the %s provisioning status through verbatim without rewriting it', async (status) => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { provisioningAttemptId: 'attempt-1', deviceId: 'device-4', status },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getProvisioningAttemptStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getProvisioningAttemptStatus('attempt-1');
    expect(result.status).toBe(status);
    expect(get).toHaveBeenCalledWith('/devices/provision/attempt-1/status');
  });

  it('does NOT fabricate device_authenticated when the backend has not advanced past ble_paired', async () => {
    // Guards against an over-eager client mapping ble_paired -> authenticated.
    // The waiting screen must keep waiting until the BACKEND reports the
    // authenticated/completed terminal — the client cannot shortcut it.
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { provisioningAttemptId: 'attempt-1', deviceId: 'device-4', status: 'ble_paired' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getProvisioningAttemptStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getProvisioningAttemptStatus('attempt-1');
    expect(result.status).toBe('ble_paired');
    expect(result.status).not.toBe('device_authenticated');
    expect(result.status).not.toBe('completed');
  });

  it.each([
    'WIFI_CONNECT_FAILED',
    'BOOTSTRAP_TOKEN_ATTEMPT_MISMATCH',
    'BOOTSTRAP_TOKEN_CONSUMED',
    'INVALID_BLE_CODE',
  ])('surfaces the %s failureCode on a failed attempt so the status poll can expose the reason', async (failureCode) => {
    // wifi_connect_failed -> attempt failed + reason exposed to the poll, plus
    // the token/code/mismatch failure codes the backend can emit. The client
    // must not strip failureCode — the waiting screen routes copy off it.
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { provisioningAttemptId: 'attempt-1', deviceId: 'device-4', status: 'failed', failureCode },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getProvisioningAttemptStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getProvisioningAttemptStatus('attempt-1');
    expect(result.status).toBe('failed');
    expect(result.failureCode).toBe(failureCode);
  });

  it('omits failureCode entirely when the backend reports a non-failure status', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { provisioningAttemptId: 'attempt-1', deviceId: 'device-4', status: 'device_authenticated' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getProvisioningAttemptStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getProvisioningAttemptStatus('attempt-1');
    expect(result.status).toBe('device_authenticated');
    expect(result.failureCode).toBeUndefined();
  });

  it('encodes the attempt id into the status route and sends no request body', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { provisioningAttemptId: 'attempt with space', deviceId: 'device-4', status: 'started' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getProvisioningAttemptStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await getProvisioningAttemptStatus('attempt with space');
    // GET status carries no payload (no token/code/secret could leak into it).
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]).toHaveLength(1);
    expect(get.mock.calls[0][0]).toContain('attempt with space');
  });

  // -- mintBootstrapToken (no secrets in the mint request; token not logged) ---

  it('mints the bootstrap token with an EMPTY request body (no code/token/wifi leaked into the mint call)', async () => {
    // The mint request authorizes off the bearer + attempt id in the URL only.
    // It must not carry a provisioning code, an existing token, or Wi-Fi creds.
    jest.resetModules();
    const post = jest.fn().mockResolvedValueOnce({
      data: { token: 'tok_abcdefghijklmnop1234567890', expiresAt: '2026-06-01T00:05:00.000Z', ttlSeconds: 300 },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { mintBootstrapToken } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await mintBootstrapToken({ provisioningAttemptId: 'attempt-7' });

    expect(post).toHaveBeenCalledTimes(1);
    // post is invoked with the URL only — no second (body) argument.
    expect(post.mock.calls[0]).toHaveLength(1);
    expect(post.mock.calls[0][0]).toBe('/devices/provision/attempt-7/bootstrap-token');
    const serialized = JSON.stringify(post.mock.calls);
    expect(serialized).not.toContain('code');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('wifi');
  });

  it('returns the minted token without the api layer logging the secret', async () => {
    // The client returns the token to its caller but must never console-log it.
    jest.resetModules();
    const secretToken = 'tok_DO_NOT_LOG_0123456789abcdef';
    const post = jest.fn().mockResolvedValueOnce({
      data: { token: secretToken, expiresAt: '2026-06-01T00:05:00.000Z', ttlSeconds: 300 },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const logSpies = [
      jest.spyOn(console, 'log').mockImplementation(() => undefined),
      jest.spyOn(console, 'info').mockImplementation(() => undefined),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
      jest.spyOn(console, 'error').mockImplementation(() => undefined),
      jest.spyOn(console, 'debug').mockImplementation(() => undefined),
    ];

    try {
      const { mintBootstrapToken } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');
      const result = await mintBootstrapToken({ provisioningAttemptId: 'attempt-7' });
      expect(result.token).toBe(secretToken);
      for (const spy of logSpies) {
        const logged = spy.mock.calls.map((args) => args.join(' ')).join(' ');
        expect(logged).not.toContain(secretToken);
      }
    } finally {
      logSpies.forEach((spy) => spy.mockRestore());
    }
  });

  // -- getDeviceStatus: online:true carries no claim/completion semantics ------

  it('reports online:true for an active device without inventing any claim/completion fields', async () => {
    // US-005: getDeviceStatus online:true ALONE never completes a claim. The
    // device-status shape exposes connectivity only — no provisioning status,
    // no completed/authenticated/claimed marker the waiting screen could
    // misread as a finished claim.
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { id: 'device-on', serial_number: 'TBOT-ON', status: 'active', battery_level: 50 },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getDeviceStatus('device-on');
    expect(result.online).toBe(true);
    expect(result).not.toHaveProperty('status');
    expect(result).not.toHaveProperty('provisioningStatus');
    expect(result).not.toHaveProperty('claimed');
    expect(result).not.toHaveProperty('completed');
    expect(result).not.toHaveProperty('deviceAuthenticated');
    expect(JSON.stringify(result)).not.toContain('completed');
    expect(JSON.stringify(result)).not.toContain('device_authenticated');
  });

  it('treats connectivity_state:online as online even when the lifecycle status is not active', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        id: 'device-conn',
        status: 'provisioning',
        battery_level: 12,
        connectivity_metrics: { connectivity_state: 'online' },
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('device-conn')).resolves.toMatchObject({ online: true, batteryPercent: 12 });
  });

  it('reports offline when neither status nor connectivity_state indicates online', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        id: 'device-off',
        status: 'provisioning',
        battery_level: 0,
        connectivity_metrics: { connectivity_state: 'offline' },
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('device-off')).resolves.toMatchObject({ online: false });
  });

  // -- normalizeDevice edge cases ----------------------------------------------

  it('falls back to device_id when the canonical id is absent', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { device_id: 'legacy-id', status: 'offline', battery_level: 5 },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('legacy-id')).resolves.toMatchObject({ id: 'legacy-id' });
  });

  it('falls back the display name to the literal TJBot when no name/serial/id is present', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({ data: { status: 'offline', battery_level: 0 } });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getDeviceStatus('whatever');
    expect(result.name).toBe('TJBot');
    expect(result.id).toBe('');
  });

  it('drops a non-finite Wi-Fi RSSI rather than emitting NaN/Infinity', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        id: 'device-nan',
        status: 'active',
        battery_level: 30,
        connectivity_metrics: { wifi_rssi: Number.POSITIVE_INFINITY },
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getDeviceStatus('device-nan');
    expect(result).not.toHaveProperty('wifiRssi');
  });

  it('always reports charging:false because the contract does not expose charging state', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { id: 'device-charge', status: 'active', battery_level: 99 },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('device-charge')).resolves.toMatchObject({ charging: false });
  });

  it('returns a safe placeholder device when the household list is empty', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({ data: [] });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getDeviceStatus('primary');
    expect(result).toMatchObject({ id: '', name: 'TJBot', online: false, batteryPercent: 0 });
    expect(get).toHaveBeenCalledWith('/devices/household/me');
  });

  it('unwraps the household device from a { data: [...] } envelope', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { data: [{ id: 'wrapped-1', status: 'active', battery_level: 77, serial_number: 'TBOT-WRAP' }] },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('primary')).resolves.toMatchObject({
      id: 'wrapped-1',
      online: true,
      batteryPercent: 77,
      serialNumber: 'TBOT-WRAP',
    });
  });

  it('selects the household robot bound to the active child instead of the first robot', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'device-for-other-child',
          status: 'active',
          battery_level: 62,
          serial_number: 'TBOT-OTHER',
          assigned_child_profile_id: 'child-other',
        },
        {
          id: 'device-for-active-child',
          status: 'active',
          battery_level: 91,
          serial_number: 'TBOT-ACTIVE',
          assigned_child_profile_id: 'child-active',
        },
      ],
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('primary', 'child-active')).resolves.toMatchObject({
      id: 'device-for-active-child',
      name: 'TBOT-ACTIVE',
      serialNumber: 'TBOT-ACTIVE',
      batteryPercent: 91,
      assignedChildProfileId: 'child-active',
    });
    expect(get).toHaveBeenCalledWith('/devices/household/me');
  });

  it('trims a padded serial number and omits serialNumber when it is blank', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValueOnce({
      data: { id: 'device-blank-serial', status: 'active', battery_level: 1, serial_number: '   ' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    const result = await getDeviceStatus('device-blank-serial');
    expect(result).not.toHaveProperty('serialNumber');

    jest.resetModules();
    const get2 = jest.fn().mockResolvedValueOnce({
      data: { id: 'device-pad-serial', status: 'active', battery_level: 1, serial_number: '  TBOT-PAD  ' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get: get2 } }));
    const api2 = require('@/services/api/device.api') as typeof import('@/services/api/device.api');
    await expect(api2.getDeviceStatus('device-pad-serial')).resolves.toMatchObject({ serialNumber: 'TBOT-PAD' });
  });

  it('propagates a backend status-poll error rather than masking the failure', async () => {
    // Failure must be retry-safe at the screen layer: the client surfaces the
    // error so the poll loop can decide, rather than silently resolving.
    jest.resetModules();
    const get = jest.fn().mockRejectedValueOnce(Object.assign(new Error('502'), { code: 'SERVER_ERROR' }));
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getProvisioningAttemptStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getProvisioningAttemptStatus('attempt-err')).rejects.toMatchObject({ code: 'SERVER_ERROR' });
  });
});
