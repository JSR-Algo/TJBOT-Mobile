// Zero-code claim — error mapping, entry points, and flow-hook reliability UX.

import { act, renderHook, waitFor } from '@testing-library/react-native';

// Force the feature flag ON for the hook/entry-point behaviour under test.
jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: false,
  isSubscriptionFeatureEnabled: () => false,
  FEATURE_ZERO_CODE_CLAIM: true,
  isZeroCodeClaimEnabled: () => true,
}));

// Service client is mocked so the hook test never hits the network.
jest.mock('@/services/api/claim.api', () => ({
  __esModule: true,
  requestClaim: jest.fn(),
  getClaimStatus: jest.fn(),
  generateBleCode: jest.fn(),
  fetchBootstrapConfig: jest.fn(),
}));

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  mintBootstrapToken: jest.fn(),
}));

jest.mock('@/services/ble/service', () => ({
  __esModule: true,
  sendClaimBootstrapTokenViaBle: jest.fn(),
}));

import {
  describeClaimFailure,
  CLAIM_STATUS,
} from '@/features/device/pairing/claimStatus';
import {
  fromQrPayload,
  fromBleAdvert,
} from '@/features/device/pairing/claimEntryPoints';
import { useZeroCodeClaimFlow } from '@/features/device/pairing/useZeroCodeClaimFlow';
import { getClaimStatus, requestClaim } from '@/services/api/claim.api';
import { mintBootstrapToken } from '@/services/api/device.api';
import { sendClaimBootstrapTokenViaBle } from '@/services/ble/service';

const mockedRequestClaim = requestClaim as jest.MockedFunction<typeof requestClaim>;
const mockedGetClaimStatus = getClaimStatus as jest.MockedFunction<typeof getClaimStatus>;
const mockedMintBootstrapToken = mintBootstrapToken as jest.MockedFunction<typeof mintBootstrapToken>;
const mockedSendClaimBootstrapTokenViaBle = sendClaimBootstrapTokenViaBle as jest.MockedFunction<typeof sendClaimBootstrapTokenViaBle>;

const BLE_DEVICE = { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [] };

describe('describeClaimFailure error-code mapping', () => {
  it('maps DEVICE_ALREADY_OWNED to a non-retryable support recovery', () => {
    const d = describeClaimFailure({ code: 'DEVICE_ALREADY_OWNED', message: 'x', status: 409 });
    expect(d).toBe(CLAIM_STATUS.DEVICE_ALREADY_CLAIMED);
    expect(d.retryable).toBe(false);
    expect(d.recovery).toBe('support');
  });

  it('maps a bare 403 (invalid/expired BLE code) to a rescan recovery', () => {
    const d = describeClaimFailure({ code: 'FORBIDDEN', message: 'x', status: 403 });
    expect(d).toBe(CLAIM_STATUS.CLAIM_INVALID_CODE);
    expect(d.recovery).toBe('rescan');
    expect(d.retryable).toBe(true);
  });

  // Codes the backend ACTUALLY emits for invalid/expired fallback input: the
  // 6-digit fallback emits PAIRING_CODE_*; the QR fallback token emits
  // FALLBACK_TOKEN_* (NOT FALLBACK_CODE_*, which is reserved/never emitted).
  it.each([
    'FALLBACK_TOKEN_INVALID',
    'FALLBACK_TOKEN_EXPIRED',
    'PAIRING_CODE_INVALID',
    'PAIRING_CODE_EXPIRED',
  ])(
    'maps emitted invalid/expired code %s to rescan recovery even when the backend returns 401',
    (code) => {
      const d = describeClaimFailure({ code, message: 'x', status: 401 });
      expect(d).toBe(CLAIM_STATUS.CLAIM_INVALID_CODE);
      expect(d.recovery).toBe('rescan');
      expect(d.retryable).toBe(true);
    },
  );

  // Reserved-but-never-emitted codes must NOT be keyed. A bare 401/409 with one
  // of these falls through to the status-based default (here 401 → auth), proving
  // the stale entries were removed rather than silently re-mapped.
  it.each([
    'FALLBACK_CODE_INVALID',
    'FALLBACK_CODE_EXPIRED',
    'CLAIM_WINDOW_EXPIRED',
    'DEVICE_NOT_ONLINE',
    'WIFI_PROVISION_TIMEOUT',
  ])('does not key the reserved never-emitted code %s', (code) => {
    const d = describeClaimFailure({ code, message: 'x', status: 401 });
    expect(d).toBe(CLAIM_STATUS.CLAIM_AUTH_REQUIRED);
  });

  it('maps the idempotent CLAIM_ALREADY_CONFIRMED to a non-retryable, no-recovery descriptor', () => {
    const d = describeClaimFailure({ code: 'CLAIM_ALREADY_CONFIRMED', message: 'x', status: 409 });
    expect(d).toBe(CLAIM_STATUS.CLAIM_ALREADY_CONFIRMED);
    expect(d.retryable).toBe(false);
    expect(d.recovery).toBe('none');
  });

  it('maps WIFI_PROVISIONED_INVALID_STATE to a retryable server-error connect recovery', () => {
    const d = describeClaimFailure({ code: 'WIFI_PROVISIONED_INVALID_STATE', message: 'x', status: 409 });
    expect(d).toBe(CLAIM_STATUS.CLAIM_SERVER_ERROR);
    expect(d.recovery).toBe('connect');
  });

  it('maps a bare 409 to already-claimed even when code is generic CONFLICT', () => {
    const d = describeClaimFailure({ code: 'CONFLICT', message: 'x', status: 409 });
    expect(d).toBe(CLAIM_STATUS.DEVICE_ALREADY_CLAIMED);
  });

  it('maps network and rate-limit failures to retryable wait recoveries', () => {
    expect(describeClaimFailure({ code: 'NETWORK_ERROR', message: 'x' }).recovery).toBe('wait');
    expect(describeClaimFailure({ code: 'RATE_LIMIT_EXCEEDED', message: 'x', status: 429 }).recovery).toBe('wait');
  });

  it('maps BLE claim-token delivery failures to retry the connection flow', () => {
    const d = describeClaimFailure({ code: 'BLE_CLAIM_TOKEN_SEND_FAILED', message: 'x' });
    expect(d).toBe(CLAIM_STATUS.CLAIM_SERVER_ERROR);
    expect(d.retryable).toBe(true);
    expect(d.recovery).toBe('connect');
  });

  it('maps 5xx to a retryable server-error connect recovery', () => {
    const d = describeClaimFailure({ code: 'INTERNAL_ERROR', message: 'x', status: 500 });
    expect(d).toBe(CLAIM_STATUS.CLAIM_SERVER_ERROR);
    expect(d.recovery).toBe('connect');
  });

  it('falls back to a retryable unknown descriptor', () => {
    const d = describeClaimFailure({ code: 'SOMETHING_NEW', message: 'x' });
    expect(d).toBe(CLAIM_STATUS.CLAIM_UNKNOWN);
    expect(d.retryable).toBe(true);
  });
});

describe('claim entry points', () => {
  it('parses a SERIAL:CODE QR payload into claim inputs', () => {
    expect(fromQrPayload('TBOT-0001:ABC123')).toEqual({
      serialNumber: 'TBOT-0001',
      bleCode: 'ABC123',
      source: 'qr',
    });
  });

  it('rejects malformed QR payloads', () => {
    expect(() => fromQrPayload('no-separator')).toThrow('CLAIM_QR_MALFORMED');
    expect(() => fromQrPayload('TBOT-0001:short')).toThrow('CLAIM_CODE_INVALID');
  });

  it('derives serial + uppercased code from a BLE advert candidate', () => {
    const candidate = { id: 'dev', name: 'TBOT-0042', localName: 'TBOT-0042', serviceUUIDs: [] };
    expect(fromBleAdvert(candidate, 'abc123')).toEqual({
      serialNumber: 'TBOT-0042',
      bleCode: 'ABC123',
      source: 'ble-advert',
    });
  });
});

describe('useZeroCodeClaimFlow reliability UX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedMintBootstrapToken.mockResolvedValue({
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      expiresAt: '2026-06-03T12:05:00.000Z',
      ttlSeconds: 300,
    });
    mockedSendClaimBootstrapTokenViaBle.mockResolvedValue({
      deviceId: 'ble-device-1',
      status: 'claim_token_sent',
      transport: 'ble-blufi',
    });
  });

  it('requests then waits for physical confirm status, disabling Connect in flight', async () => {
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim_1',
      deviceId: 'dev_1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    mockedGetClaimStatus
      .mockResolvedValueOnce({ claimId: 'claim_1', deviceId: 'dev_1', status: 'WAITING_PHYSICAL_CONFIRM', online: false, expiresAt: null, failureCode: null })
      .mockResolvedValueOnce({ claimId: 'claim_1', deviceId: 'dev_1', status: 'CLAIM_CONFIRMED', online: true, expiresAt: null, failureCode: null });
    const onConnected = jest.fn();

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({
        deviceId: 'dev_1',
        bleDevice: BLE_DEVICE,
        pollIntervalMs: 1,
        onConnected,
      }),
    );

    expect(result.current[0].phase).toBe('idle');
    expect(result.current[0].canConnect).toBe(true);

    act(() => {
      result.current[1].connect();
    });

    await waitFor(() => expect(result.current[0].phase).toBe('connected'));
    expect(result.current[0].canConnect).toBe(false);
    expect(result.current[0].result).toEqual({ deviceId: 'dev_1' });
    expect(onConnected).toHaveBeenCalledWith({ deviceId: 'dev_1' });
    expect(mockedRequestClaim).toHaveBeenCalledWith({ deviceId: 'dev_1' });
    expect(mockedGetClaimStatus).toHaveBeenCalledWith('claim_1');
  });

  it('mints and sends a claim-bound bootstrap token over BLE before polling status', async () => {
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim_1',
      deviceId: 'dev_1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    mockedGetClaimStatus.mockResolvedValue({ claimId: 'claim_1', deviceId: 'dev_1', status: 'CLAIM_CONFIRMED', online: true, expiresAt: null, failureCode: null });

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({
        deviceId: 'dev_1',
        bleDevice: BLE_DEVICE,
        pollIntervalMs: 1,
      }),
    );

    act(() => { result.current[1].connect(); });

    await waitFor(() => expect(result.current[0].phase).toBe('connected'));
    expect(mockedMintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'claim_1' });
    expect(mockedSendClaimBootstrapTokenViaBle).toHaveBeenCalledWith({
      device: BLE_DEVICE,
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    });
    expect(mockedSendClaimBootstrapTokenViaBle.mock.invocationCallOrder[0]).toBeLessThan(
      mockedGetClaimStatus.mock.invocationCallOrder[0],
    );
  });

  it('exits immediately when requestClaim returns an already confirmed claim', async () => {
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim_confirmed_1',
      deviceId: 'dev_1',
      status: 'CLAIM_CONFIRMED',
      message: 'Connection already confirmed.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    const onConnected = jest.fn();

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({
        deviceId: 'dev_1',
        bleDevice: BLE_DEVICE,
        pollIntervalMs: 1,
        onConnected,
      }),
    );

    act(() => { result.current[1].connect(); });

    await waitFor(() => expect(result.current[0].phase).toBe('connected'));
    expect(result.current[0].result).toEqual({ deviceId: 'dev_1' });
    expect(onConnected).toHaveBeenCalledWith({ deviceId: 'dev_1' });
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    expect(mockedSendClaimBootstrapTokenViaBle).not.toHaveBeenCalled();
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
  });

  it('does not treat robot online heartbeat as claim confirmation', async () => {
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim_1',
      deviceId: 'dev_1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim_1',
      deviceId: 'dev_1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      online: true,
      expiresAt: null,
      failureCode: null,
    });

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({
        deviceId: 'dev_1',
        bleDevice: BLE_DEVICE,
        pollIntervalMs: 1,
        maxPollAttempts: 1,
      }),
    );

    act(() => { result.current[1].connect(); });

    await waitFor(() => expect(result.current[0].phase).toBe('failed'));
    expect(result.current[0].error?.code).toBe('CLAIM_CONFIRM_TIMEOUT');
    expect(result.current[0].result).toBeNull();
  });

  it('continues polling past 20 quick attempts while the claim window is still open', async () => {
    const claimExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim_1',
      deviceId: 'dev_1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: claimExpiresAt,
    });
    let polls = 0;
    mockedGetClaimStatus.mockImplementation(async () => {
      polls += 1;
      if (polls >= 25) {
        return { claimId: 'claim_1', deviceId: 'dev_1', status: 'CLAIM_CONFIRMED', online: true, expiresAt: null, failureCode: null };
      }
      return { claimId: 'claim_1', deviceId: 'dev_1', status: 'WAITING_PHYSICAL_CONFIRM', online: true, expiresAt: claimExpiresAt, failureCode: null };
    });

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({
        deviceId: 'dev_1',
        bleDevice: BLE_DEVICE,
        pollIntervalMs: 1,
      }),
    );

    act(() => { result.current[1].connect(); });

    await waitFor(() => expect(result.current[0].phase).toBe('connected'));
    expect(mockedGetClaimStatus).toHaveBeenCalledTimes(25);
    expect(result.current[0].error).toBeNull();
  });

  it('does not shrink the claim expiry window while polling status updates', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
    try {
      const claimExpiresAt = '2026-06-10T12:01:40.000Z';
      mockedRequestClaim.mockResolvedValue({
        claimId: 'claim_1',
        deviceId: 'dev_1',
        status: 'WAITING_PHYSICAL_CONFIRM',
        message: 'Press the button on your TBot to allow connection.',
        expiresAt: claimExpiresAt,
      });
      let polls = 0;
      mockedGetClaimStatus.mockImplementation(async () => {
        polls += 1;
        if (polls >= 76) {
          return { claimId: 'claim_1', deviceId: 'dev_1', status: 'CLAIM_CONFIRMED', online: true, expiresAt: null, failureCode: null };
        }
        return { claimId: 'claim_1', deviceId: 'dev_1', status: 'WAITING_PHYSICAL_CONFIRM', online: true, expiresAt: claimExpiresAt, failureCode: null };
      });

      const { result } = renderHook(() =>
        useZeroCodeClaimFlow({
          deviceId: 'dev_1',
          bleDevice: BLE_DEVICE,
          pollIntervalMs: 1000,
        }),
      );

      act(() => { result.current[1].connect(); });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(75_000);
      });

      await waitFor(() => expect(result.current[0].phase).toBe('connected'));
      expect(mockedGetClaimStatus).toHaveBeenCalledTimes(76);
      expect(result.current[0].error).toBeNull();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('does not extend the original claim deadline when status expiresAt is malformed', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
    try {
      mockedRequestClaim.mockResolvedValue({
        claimId: 'claim_1',
        deviceId: 'dev_1',
        status: 'WAITING_PHYSICAL_CONFIRM',
        message: 'Press the button on your TBot to allow connection.',
        expiresAt: '2026-06-10T12:00:30.000Z',
      });
      mockedGetClaimStatus.mockResolvedValue({
        claimId: 'claim_1',
        deviceId: 'dev_1',
        status: 'WAITING_PHYSICAL_CONFIRM',
        online: true,
        expiresAt: 'not-a-date',
        failureCode: null,
      });

      const { result } = renderHook(() =>
        useZeroCodeClaimFlow({
          deviceId: 'dev_1',
          bleDevice: BLE_DEVICE,
          pollIntervalMs: 1000,
        }),
      );

      act(() => { result.current[1].connect(); });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(35_000);
      });

      await waitFor(() => expect(result.current[0].phase).toBe('failed'));
      expect(result.current[0].error?.code).toBe('CLAIM_CONFIRM_TIMEOUT');
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('prevents double-submit: a second connect() while in flight issues one claim request', async () => {
    let resolveClaim: ((v: { claimId: string; deviceId: string; status: string; message: string; expiresAt: string }) => void) | undefined;
    mockedRequestClaim.mockImplementation(
      () => new Promise((resolve) => { resolveClaim = resolve; }),
    );
    mockedGetClaimStatus.mockResolvedValue({ claimId: 'claim_1', deviceId: 'dev_1', status: 'CLAIM_CONFIRMED', online: true, expiresAt: null, failureCode: null });

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({ deviceId: 'dev_1', bleDevice: BLE_DEVICE, pollIntervalMs: 1 }),
    );

    act(() => { result.current[1].connect(); });
    act(() => { result.current[1].connect(); }); // ignored — claim in flight

    expect(result.current[0].phase).toBe('claiming');
    expect(mockedRequestClaim).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveClaim?.({ claimId: 'claim_1', deviceId: 'dev_1', status: 'WAITING_PHYSICAL_CONFIRM', message: 'press', expiresAt: '2026-06-03T12:05:00.000Z' });
    });
    await waitFor(() => expect(result.current[0].phase).toBe('connected'));
    expect(mockedRequestClaim).toHaveBeenCalledTimes(1);
  });

  it('surfaces a retryable failure descriptor and allows retry()', async () => {
    mockedRequestClaim
      .mockRejectedValueOnce({ code: 'INTERNAL_ERROR', message: 'boom', status: 500 })
      .mockResolvedValueOnce({ claimId: 'claim_1', deviceId: 'dev_1', status: 'WAITING_PHYSICAL_CONFIRM', message: 'press', expiresAt: '2026-06-03T12:05:00.000Z' });
    mockedGetClaimStatus.mockResolvedValue({ claimId: 'claim_1', deviceId: 'dev_1', status: 'CLAIM_CONFIRMED', online: true, expiresAt: null, failureCode: null });

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({ deviceId: 'dev_1', bleDevice: BLE_DEVICE, pollIntervalMs: 1 }),
    );

    act(() => { result.current[1].connect(); });
    await waitFor(() => expect(result.current[0].phase).toBe('failed'));
    expect(result.current[0].error?.retryable).toBe(true);
    expect(result.current[0].canConnect).toBe(true); // retry allowed from failed

    act(() => { result.current[1].retry(); });
    await waitFor(() => expect(result.current[0].phase).toBe('connected'));
    expect(mockedRequestClaim).toHaveBeenCalledTimes(2);
  });

  it('does not create a cloud claim when the BLE identity is missing', async () => {
    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({ deviceId: 'dev_1', pollIntervalMs: 1 }),
    );

    act(() => { result.current[1].connect(); });

    await waitFor(() => expect(result.current[0].phase).toBe('failed'));
    expect(result.current[0].error?.code).toBe('NO_DEVICE_AVAILABLE');
    expect(result.current[0].error?.recovery).toBe('rescan');
    expect(mockedRequestClaim).not.toHaveBeenCalled();
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    expect(mockedSendClaimBootstrapTokenViaBle).not.toHaveBeenCalled();
  });

  it('does not poll when the device-already-owned failure is non-retryable in the UI', async () => {
    mockedRequestClaim.mockRejectedValueOnce({ code: 'DEVICE_ALREADY_OWNED', message: 'x', status: 409 });

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({ deviceId: 'dev_1', bleDevice: BLE_DEVICE, pollIntervalMs: 1 }),
    );

    act(() => { result.current[1].connect(); });
    await waitFor(() => expect(result.current[0].phase).toBe('failed'));
    expect(result.current[0].error?.code).toBe('DEVICE_ALREADY_CLAIMED');
    expect(result.current[0].error?.retryable).toBe(false);
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
  });

  it('maps backend claim timeout status to a retryable connect recovery', async () => {
    mockedRequestClaim.mockResolvedValue({ claimId: 'claim_1', deviceId: 'dev_1', status: 'WAITING_PHYSICAL_CONFIRM', message: 'press', expiresAt: '2026-06-03T12:05:00.000Z' });
    mockedGetClaimStatus.mockResolvedValue({ claimId: 'claim_1', deviceId: 'dev_1', status: 'CLAIM_CONFIRM_TIMEOUT', online: false, expiresAt: null, failureCode: 'CLAIM_CONFIRM_TIMEOUT' });

    const { result } = renderHook(() =>
      useZeroCodeClaimFlow({ deviceId: 'dev_1', bleDevice: BLE_DEVICE, pollIntervalMs: 1 }),
    );

    act(() => { result.current[1].connect(); });

    await waitFor(() => expect(result.current[0].phase).toBe('failed'));
    expect(result.current[0].error?.code).toBe('CLAIM_CONFIRM_TIMEOUT');
    expect(result.current[0].error?.retryable).toBe(true);
    expect(result.current[0].error?.recovery).toBe('connect');
  });
});
