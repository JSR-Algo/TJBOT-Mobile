// Physical-confirm claim service client tests.
//
// Uses the same mocked-http-client pattern as tests/api/device-api.test.ts.

describe('zero-code claim API client', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('lists available physical-confirm devices', async () => {
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        devices: [
          {
            device_id: 'dev_1',
            display_name: 'TBOT-0001',
            model: 'esp32-s3',
            state: 'CLAIM_AVAILABLE',
            requires_physical_confirm: true,
            expires_at: '2026-06-03T12:05:00.000Z',
          },
        ],
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { listAvailableClaimDevices } = require('@/services/api/claim.api') as typeof import('@/services/api/claim.api');

    await expect(listAvailableClaimDevices()).resolves.toEqual([
      {
        deviceId: 'dev_1',
        displayName: 'TBOT-0001',
        model: 'esp32-s3',
        state: 'CLAIM_AVAILABLE',
        requiresPhysicalConfirm: true,
        expiresAt: '2026-06-03T12:05:00.000Z',
      },
    ]);
    expect(get).toHaveBeenCalledWith('/claim/available-devices');
  });

  it('requests a physical-confirm claim through the /claim/request route', async () => {
    const post = jest.fn().mockResolvedValueOnce({
      data: {
        claim_id: 'claim_01HXYZ',
        device_id: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
        status: 'WAITING_PHYSICAL_CONFIRM',
        message: 'Press the button on your TBot to allow connection.',
        expires_at: '2026-06-03T12:05:00.000Z',
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { requestClaim } = require('@/services/api/claim.api') as typeof import('@/services/api/claim.api');

    await expect(
      requestClaim({ deviceId: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e' }),
    ).resolves.toEqual({
      claimId: 'claim_01HXYZ',
      deviceId: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    expect(post).toHaveBeenCalledWith('/claim/request', {
      device_id: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
    });
  });

  it('polls claim status by claim id', async () => {
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        claim_id: 'claim_01HXYZ',
        device_id: 'dev_2',
        status: 'CLAIM_CONFIRMED',
        online: true,
        expires_at: null,
        failure_code: null,
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { getClaimStatus } = require('@/services/api/claim.api') as typeof import('@/services/api/claim.api');

    await expect(getClaimStatus('claim_01HXYZ')).resolves.toEqual({
      claimId: 'claim_01HXYZ',
      deviceId: 'dev_2',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    expect(get).toHaveBeenCalledWith('/claim/status/claim_01HXYZ');
  });

  it('propagates claim request failures unchanged for downstream mapping', async () => {
    const alreadyClaimed = { code: 'DEVICE_ALREADY_OWNED', message: 'taken', status: 409 };
    const post = jest.fn().mockRejectedValueOnce(alreadyClaimed);
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { requestClaim } = require('@/services/api/claim.api') as typeof import('@/services/api/claim.api');

    await expect(requestClaim({ deviceId: 'dev_3' })).rejects.toBe(alreadyClaimed);
  });

  it('generates a BLE code through the rate-limited ble-code route (URL-encoded serial)', async () => {
    const post = jest.fn().mockResolvedValueOnce({
      data: { code: 'ABC123', expires_at: '2026-04-14T12:05:00.000Z' },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { post } }));

    const { generateBleCode } = require('@/services/api/claim.api') as typeof import('@/services/api/claim.api');

    await expect(generateBleCode('TBOT 0004')).resolves.toEqual({
      code: 'ABC123',
      expiresAt: '2026-04-14T12:05:00.000Z',
    });
    expect(post).toHaveBeenCalledWith('/devices/ble-code/TBOT%200004');
  });

  it('fetches bootstrap discovery config and exposes websocket.url for the realtime layer', async () => {
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        api_url: 'https://api.example.test/v1',
        esp_server_url: 'wss://esp.example.test',
        ota_url: 'https://api.example.test/v1/ota/',
        websocket: { url: 'wss://api.example.test/tbot/v1/' },
        pairing: { enabled: true, ttl_seconds: 300, ble_timeout_seconds: 120, ap_timeout_seconds: 300 },
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { fetchBootstrapConfig } = require('@/services/api/claim.api') as typeof import('@/services/api/claim.api');

    const config = await fetchBootstrapConfig();
    expect(get).toHaveBeenCalledWith('/device/bootstrap');
    expect(config.wsUrl).toBe('wss://api.example.test/tbot/v1/');
    expect(config.pairing).toEqual({
      enabled: true,
      ttlSeconds: 300,
      bleTimeoutSeconds: 120,
      apTimeoutSeconds: 300,
    });
  });

  it('prefers legacy ws_url when both bootstrap websocket aliases are present', async () => {
    const get = jest.fn().mockResolvedValueOnce({
      data: {
        ws_url: 'wss://legacy.example.test/tbot/v1/',
        websocket: { url: 'wss://nested.example.test/tbot/v1/' },
      },
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));

    const { fetchBootstrapConfig } = require('@/services/api/claim.api') as typeof import('@/services/api/claim.api');

    await expect(fetchBootstrapConfig()).resolves.toMatchObject({
      wsUrl: 'wss://legacy.example.test/tbot/v1/',
    });
  });
});
