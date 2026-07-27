import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import PairConnectingScreen from '@/features/device/pairing/screens/PairConnectingScreen';
import PairFailedScreen from '@/features/device/pairing/screens/PairFailedScreen';
import { ROUTES } from '@/navigation/routes';
import { provisionWifiViaLocalBle } from '@/services/ble/service';
import {
  confirmLocalBlePaired,
  getDeviceStatus,
  getProvisioningAttemptStatus,
  mintBootstrapToken,
  reportProvisioningDeviceAuthenticated,
} from '@/services/api/device.api';
import { getClaimStatus, requestClaim } from '@/services/api/claim.api';
import { describeClaimFailure } from '@/features/device/pairing/claimStatus';
import {
  clearPairingBootstrapToken,
  consumePairingWifiPassword,
  getPairingBootstrapToken,
  putPairingBootstrapToken,
  putPairingWifiPassword,
} from '@/features/device/pairing/pairingSecretHandoff';
import { savePendingPairingContext } from '@/features/device/pairing/pendingPairingContext';

// ---------------------------------------------------------------------------
// US-005 — mb-pair-connecting (PairConnectingScreen.tsx orchestration).
//
// This screen is the single place where the mobile app turns a local BLE/Wi-Fi
// handoff into a *backend-confirmed* claim. The cardinal US-005 invariant for
// this unit: a local Wi-Fi credential handoff ('wifi_credentials_sent') is NOT
// success. The screen must keep waiting on the authoritative backend status
// (device_authenticated / completed / CLAIM_CONFIRMED / CLAIMED) and never show
// final success or advance to a setup/home screen before that confirmation.
//
// The BLE service (provisionWifiViaLocalBle), device.api and claim.api are
// mocked exactly like the existing pairing tests so this suite exercises the
// screen's orchestration / exit-path logic, not the wire protocol. BluFi
// UUID/TLV/opcode wire invariants belong to the BLE-service unit, which owns
// the real (unmocked) provisionWifiViaLocalBle implementation.
// ---------------------------------------------------------------------------

jest.mock('@/services/ble/service', () => ({
  __esModule: true,
  provisionWifiViaLocalBle: jest.fn(),
}));

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  confirmLocalBlePaired: jest.fn(),
  getDeviceStatus: jest.fn(),
  getProvisioningAttemptStatus: jest.fn(),
  mintBootstrapToken: jest.fn(),
  reportProvisioningDeviceAuthenticated: jest.fn(),
}));

jest.mock('@/services/api/claim.api', () => ({
  __esModule: true,
  getClaimStatus: jest.fn(),
  requestClaim: jest.fn(),
}));

jest.mock('@/features/device/pairing/pendingPairingContext', () => ({
  __esModule: true,
  savePendingPairingContext: jest.fn(),
}));

const mockedProvisionWifiViaLocalBle = provisionWifiViaLocalBle as jest.MockedFunction<typeof provisionWifiViaLocalBle>;
const mockedConfirmLocalBlePaired = confirmLocalBlePaired as jest.MockedFunction<typeof confirmLocalBlePaired>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockedGetProvisioningAttemptStatus = getProvisioningAttemptStatus as jest.MockedFunction<typeof getProvisioningAttemptStatus>;
const mockedMintBootstrapToken = mintBootstrapToken as jest.MockedFunction<typeof mintBootstrapToken>;
const mockedReportProvisioningDeviceAuthenticated = reportProvisioningDeviceAuthenticated as jest.MockedFunction<typeof reportProvisioningDeviceAuthenticated>;
const mockedGetClaimStatus = getClaimStatus as jest.MockedFunction<typeof getClaimStatus>;
const mockedRequestClaim = requestClaim as jest.MockedFunction<typeof requestClaim>;
const mockedSavePendingPairingContext = savePendingPairingContext as jest.MockedFunction<typeof savePendingPairingContext>;

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

async function advancePairingPolls(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

// Opaque fixtures. These are passed INTO mocked encoders/requests as the screen
// would; they are never logged or asserted as substrings against any rendered /
// navigated payload (that anti-leak check is the point of several tests below).
const BOOTSTRAP_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const WIFI_PASSWORD = 'sup3r-s3cret-wifi-pass';
const PROVISIONING_CODE = '123456';
const SERIAL = 'TBT-2026-004217';
const SSID = 'Casa';

// A claim-flow attempt id (matches the screen's isLikelyClaimId heuristic so the
// run never re-creates a cloud claim) carrying a pre-minted bootstrap token.
function bleClaimParams(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: 'device-1',
    serialNumber: SERIAL,
    provisioningAttemptId: 'claim-1',
    ssid: SSID,
    bleDeviceId: 'ble-device-1',
    provisioningTransport: 'ble_claim',
    ...overrides,
  } as never;
}

// A BLE-reconnect attempt: credential-only handoff, completion via device_online.
function bleReconnectParams(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: 'device-1',
    serialNumber: SERIAL,
    provisioningAttemptId: 'attempt-rc-1',
    ssid: SSID,
    bleDeviceId: 'ble-device-1',
    provisioningTransport: 'ble_reconnect',
    ...overrides,
  } as never;
}

function seedSecrets(provisioningAttemptId: string): void {
  putPairingWifiPassword(provisioningAttemptId, WIFI_PASSWORD);
  putPairingBootstrapToken(provisioningAttemptId, BOOTSTRAP_TOKEN);
}

// Recursively flatten every string value that the screen passed into a
// navigate() call so we can assert no secret ever rides into a route payload.
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out));
  } else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => collectStrings(v, out));
  }
  return out;
}

function navigatePayloadStrings(navigate: jest.Mock): string[] {
  return navigate.mock.calls.flatMap((call) => collectStrings(call));
}

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.clearAllMocks();
  mockedSavePendingPairingContext.mockResolvedValue(undefined);
  // Defaults: a BLE handoff resolves the local "credentials sent" handoff only.
  mockedProvisionWifiViaLocalBle.mockResolvedValue({
    deviceId: 'ble-device-1',
    status: 'wifi_credentials_sent',
    transport: 'ble-blufi',
  });
  mockedConfirmLocalBlePaired.mockResolvedValue({
    deviceId: 'device-1',
    provisioningAttemptId: 'claim-1',
    status: 'ble_paired',
  });
  mockedMintBootstrapToken.mockResolvedValue({
    token: BOOTSTRAP_TOKEN,
    expiresAt: '2026-06-10T12:05:00.000Z',
    ttlSeconds: 300,
  });
  mockedReportProvisioningDeviceAuthenticated.mockResolvedValue(undefined);
  mockedRequestClaim.mockResolvedValue({
    claimId: 'claim-1',
    deviceId: 'device-1',
    status: 'WAITING_PHYSICAL_CONFIRM',
    message: 'Press the button on your TBot to allow connection.',
    expiresAt: '2026-06-10T12:05:00.000Z',
  });
});

afterEach(() => {
  try {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  } finally {
    consoleErrorSpy.mockRestore();
    // Drain any leftover one-shot secrets so handoff TTL timers (and the
    // module-level bootstrap-token map, which persists across tests) do not bleed
    // across tests.
    ['claim-1', 'attempt-1', 'attempt-rc-1', 'attempt-zc-1', 'claim-NEW'].forEach((id) => {
      consumePairingWifiPassword(id);
      clearPairingBootstrapToken(id);
    });
  }
});

// ===========================================================================
// 1. Pre-flight guards (synchronous exit paths before any I/O).
// ===========================================================================
describe('PairConnectingScreen — pre-flight guards', () => {
  it('routes to PairFailed with PAIRING_CONTEXT_MISSING when required params are absent', async () => {
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        // No ssid / deviceId / serial / attempt / code: the run cannot start.
        route={{ params: {} } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'PAIRING_CONTEXT_MISSING' }),
    ));
    // No provisioning I/O may have run.
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
    expect(mockedConfirmLocalBlePaired).not.toHaveBeenCalled();
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
  });

  it('routes to PairFailed when a request has neither code nor BLE handle', async () => {
    putPairingWifiPassword('attempt-1', WIFI_PASSWORD);
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: {
          deviceId: 'device-1',
          serialNumber: SERIAL,
          provisioningAttemptId: 'attempt-1',
          ssid: SSID,
        } } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'PAIRING_CONTEXT_MISSING' }),
    ));
  });

  it('[bleDeviceId loss, no code] BLE transport that lost its handle routes to clean PAIRING_CONTEXT_MISSING recovery', async () => {
    // Identity loss with no fallback code: the screen must surface a clean
    // recovery — never a silent hang and never a credential/token write without
    // a live BLE handle.
    seedSecrets('claim-1');
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ bleDeviceId: undefined, code: undefined }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'PAIRING_CONTEXT_MISSING' }),
    ));
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    // The guard fires before consuming the bootstrap token; the token is retained
    // for a retry (it is not silently dropped).
    expect(getPairingBootstrapToken('claim-1')).toBe(BOOTSTRAP_TOKEN);
  });

  it('[bleDeviceId loss, code present] degrades to the backend path — no BLE handoff, never a silent hang', async () => {
    // A BLE attempt that lost its handle but still has a fallback code must NOT
    // try to write the token/credentials over a non-existent BLE link. It
    // legitimately falls back to backend provisioning and still reaches a
    // terminal recovery screen (here, a malformed/absent status poll), proving
    // it does not hang silently.
    seedSecrets('claim-1');
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ bleDeviceId: undefined, code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything()));
    // The cardinal safety check: no credential/token write without a BLE handle.
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
    expect(mockedConfirmLocalBlePaired).not.toHaveBeenCalled();
    // It did not silently succeed.
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });

  it('routes back to PairWifiPassword when the one-shot Wi-Fi password is missing (consumed/expired)', async () => {
    // Bootstrap token seeded but the Wi-Fi password handoff is absent: the
    // screen must re-prompt rather than send a blank password over BLE or show
    // a generic missing-context error.
    putPairingBootstrapToken('claim-1', BOOTSTRAP_TOKEN);
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairWifiPasswordScreen,
      expect.objectContaining({
        deviceId: 'device-1',
        serialNumber: SERIAL,
        provisioningAttemptId: 'claim-1',
        code: PROVISIONING_CODE,
        ssid: SSID,
        bleDeviceId: 'ble-device-1',
        provisioningTransport: 'ble_claim',
        errorCode: 'WIFI_PASSWORD_EXPIRED',
      }),
    ));
    expect(navigate).not.toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'PAIRING_CONTEXT_MISSING' }),
    );
    expect(JSON.stringify(navigate.mock.calls)).not.toContain(WIFI_PASSWORD);
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
  });

  it('never renders final success on the initial pairing render', () => {
    seedSecrets('claim-1');
    mockedProvisionWifiViaLocalBle.mockReturnValue(new Promise(() => undefined)); // initial-render assertion only
    mockedGetProvisioningAttemptStatus.mockReturnValue(new Promise(() => undefined)); // never resolves
    const navigate = jest.fn();
    const screen = render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    expect(screen.queryByText('Robot authenticated')).toBeNull();
    expect(screen.getByText('Hang tight — about 30 seconds')).toBeTruthy();
  });
});

// ===========================================================================
// 2. BLE *claim* path (code present): confirm -> mint -> handoff -> auth poll.
// ===========================================================================
describe('PairConnectingScreen — BLE claim path (code present)', () => {
  it('does not retry an HTTP 401 while reconciling a code attempt', async () => {
    seedSecrets('claim-1');
    mockedProvisionWifiViaLocalBle.mockRejectedValue(Object.assign(
      new Error('Device disconnected after write'),
      { code: 'BLE_PROVISIONING_DISCONNECTED', deliveryUnknown: true },
    ));
    mockedGetProvisioningAttemptStatus.mockRejectedValue({ response: { status: 401 } });
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ deliveryUnknown: true }),
    ));
    expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledTimes(1);
  });

  it('retries a transient 503 while reconciling a code attempt after ambiguous delivery', async () => {
    jest.useFakeTimers();
    try {
      seedSecrets('claim-1');
      mockedProvisionWifiViaLocalBle.mockRejectedValue(Object.assign(
        new Error('Device disconnected after write'),
        { code: 'BLE_PROVISIONING_DISCONNECTED', deliveryUnknown: true },
      ));
      mockedGetProvisioningAttemptStatus
        .mockRejectedValueOnce({ status: 503, code: 'SERVICE_UNAVAILABLE' })
        .mockResolvedValueOnce({ provisioningAttemptId: 'claim-1', deviceId: 'device-1', status: 'device_authenticated' });
      const navigate = jest.fn();

      render(
        <PairConnectingScreen
          navigation={{ navigate } as never}
          route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
        />,
      );

      await waitFor(() => expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledTimes(1));
      await advancePairingPolls(3000);
      await waitFor(() => expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairRenameScreen,
        expect.objectContaining({ provisioningAttemptId: 'claim-1' }),
      ));
      expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledTimes(2);
      expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('reconciles a code attempt when BLE disconnects after the robot may have received the handoff', async () => {
    seedSecrets('claim-1');
    mockedProvisionWifiViaLocalBle.mockRejectedValue(Object.assign(
      new Error('Device disconnected after write'),
      { code: 'BLE_PROVISIONING_DISCONNECTED', deliveryUnknown: true },
    ));
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'device_authenticated',
    });
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-1',
    }));
    expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledWith('claim-1');
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
  });

  it('happy path: confirms, ensures token, hands off credentials, then device_authenticated advances', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'device_authenticated',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-1',
    }));
    expect(mockedConfirmLocalBlePaired).toHaveBeenCalledWith({
      deviceId: 'device-1',
      provisioningAttemptId: 'claim-1',
      serialNumber: SERIAL,
      code: PROVISIONING_CODE,
    });
    expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalledTimes(1);
    expect(mockedReportProvisioningDeviceAuthenticated).toHaveBeenCalledWith({
      deviceId: 'device-1',
      code: PROVISIONING_CODE,
      bootstrapToken: BOOTSTRAP_TOKEN,
    });
    expect(mockedProvisionWifiViaLocalBle.mock.invocationCallOrder[0]).toBeLessThan(
      mockedReportProvisioningDeviceAuthenticated.mock.invocationCallOrder[0],
    );
    expect(mockedReportProvisioningDeviceAuthenticated.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0],
    );
  });

  it('[token-before-credentials] the bootstrap token is in hand before the Wi-Fi credential handoff', async () => {
    // No pre-seeded token: the screen must mint one and have it BEFORE the
    // credential frames are written over BLE. We prove ordering: provision is
    // called with the minted token, and minting happened before the handoff.
    putPairingWifiPassword('claim-1', WIFI_PASSWORD);
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'completed',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    expect(mockedMintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'claim-1' });
    // The credential handoff carried the token (0x01) and the code (0x02).
    expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalledWith(
      expect.objectContaining({ token: BOOTSTRAP_TOKEN, code: PROVISIONING_CODE, ssid: SSID, password: WIFI_PASSWORD }),
    );
    // Mint strictly precedes the credential handoff.
    expect(mockedMintBootstrapToken.mock.invocationCallOrder[0]).toBeLessThan(
      mockedProvisionWifiViaLocalBle.mock.invocationCallOrder[0],
    );
  });

  it('replaces a pre-minted bootstrap token immediately before BLE handoff', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'device_authenticated',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    // Tokens are short-lived and may have been minted before Wi-Fi selection.
    // Always mint at the handoff boundary so an expired/consumed token cannot
    // leave the robot online while the mobile waits for claim confirmation.
    expect(mockedMintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'claim-1' });
    expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalledWith(
      expect.objectContaining({ token: BOOTSTRAP_TOKEN }),
    );
    expect(mockedMintBootstrapToken.mock.invocationCallOrder[0]).toBeLessThan(
      mockedProvisionWifiViaLocalBle.mock.invocationCallOrder[0],
    );
  });

  it('moves to rename immediately after wifi_credentials_sent while backend authentication continues', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockReturnValue(new Promise(() => undefined));
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalled());
    await waitFor(() => expect(mockedSavePendingPairingContext).toHaveBeenCalledWith({
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-1',
    }));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-1',
    });
    expect(mockedGetProvisioningAttemptStatus).not.toHaveBeenCalled();
  });

  it('does not claim backend authentication on the handoff screen before navigating to rename', async () => {
    seedSecrets('claim-1');
    const navigate = jest.fn();
    const screen = render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    expect(screen.queryByText('Robot authenticated')).toBeNull();
    expect(mockedGetProvisioningAttemptStatus).not.toHaveBeenCalled();
  });

  it('[STA_CONN_FAIL] a WIFI_CONNECT_FAILED from the BLE handoff routes to PairFailed with that code', async () => {
    seedSecrets('claim-1');
    // The BLE service maps STA_CONN_FAIL -> WIFI_CONNECT_FAILED; the screen must
    // surface it (wrong-password recovery) and never poll for auth.
    mockedProvisionWifiViaLocalBle.mockRejectedValue(
      Object.assign(new Error('Robot could not join the Wi-Fi network.'), { code: 'WIFI_CONNECT_FAILED' }),
    );
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'WIFI_CONNECT_FAILED' }),
    ));
    expect(mockedGetProvisioningAttemptStatus).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
  });

  it('confirmLocalBlePaired rejection (wrong/absent code) routes to PairFailed with INVALID_BLE_CODE; no token, no handoff', async () => {
    seedSecrets('claim-1');
    mockedConfirmLocalBlePaired.mockRejectedValue(
      Object.assign(new Error('bad code'), { code: 'INVALID_BLE_CODE' }),
    );
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: '000000' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'INVALID_BLE_CODE' }),
    ));
    // A rejected confirm must not advance to the credential handoff.
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
  });

  it('PairFailed payload carries the BLE recovery context (transport + bleDeviceId) for retry', async () => {
    seedSecrets('claim-1');
    mockedProvisionWifiViaLocalBle.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'WIFI_CONNECT_FAILED' }),
    );
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({
        errorCode: 'WIFI_CONNECT_FAILED',
        bleDeviceId: 'ble-device-1',
        provisioningTransport: 'ble_claim',
        serialNumber: SERIAL,
      }),
    ));
  });
});

// ===========================================================================
// 4. BLE zero-code claim path: claim_confirmed via getClaimStatus polling.
// ===========================================================================
describe('PairConnectingScreen — BLE zero-code claim path', () => {
  it('settles the pending poll delay on unmount without another status request', async () => {
    jest.useFakeTimers();
    try {
      seedSecrets('claim-1');
      mockedGetClaimStatus.mockResolvedValue({
        claimId: 'claim-1', deviceId: 'device-1', status: 'WAITING_PHYSICAL_CONFIRM',
        online: false, expiresAt: null, failureCode: null,
      });
      const screen = render(
        <PairConnectingScreen
          navigation={{ navigate: jest.fn() } as never}
          route={{ params: bleClaimParams() } as never}
        />,
      );
      await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledTimes(1));

      screen.unmount();
      await act(async () => Promise.resolve());

      await advancePairingPolls(6000);
      expect(mockedGetClaimStatus).toHaveBeenCalledTimes(1);
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('uses the freshly-created claim id when bootstrap-token minting fails', async () => {
    putPairingWifiPassword('attempt-zc-1', WIFI_PASSWORD);
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-NEW',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Waiting for Robot.',
      expiresAt: '2026-06-10T12:05:00.000Z',
    });
    mockedMintBootstrapToken.mockRejectedValue(Object.assign(
      new Error('Token service unavailable'),
      { code: 'SERVICE_UNAVAILABLE' },
    ));
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-1' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({
        errorCode: 'SERVICE_UNAVAILABLE',
        provisioningAttemptId: 'claim-NEW',
      }),
    ));
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
  });

  it('wraps a frozen mint failure while preserving its code and the fresh claim id', async () => {
    putPairingWifiPassword('attempt-zc-1', WIFI_PASSWORD);
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-NEW',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Waiting for Robot.',
      expiresAt: '2026-06-10T12:05:00.000Z',
    });
    mockedMintBootstrapToken.mockRejectedValue(Object.freeze(Object.assign(
      new Error('Token service unavailable'),
      { code: 'SERVICE_UNAVAILABLE' },
    )));
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-1' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'SERVICE_UNAVAILABLE', provisioningAttemptId: 'claim-NEW' }),
    ));
  });

  it('wraps a primitive mint failure without losing the fresh claim id', async () => {
    putPairingWifiPassword('attempt-zc-1', WIFI_PASSWORD);
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-NEW', deviceId: 'device-1', status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Waiting for Robot.', expiresAt: '2026-06-10T12:05:00.000Z',
    });
    mockedMintBootstrapToken.mockRejectedValue('network unavailable');
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-1' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'PAIRING_CONNECT_FAILED', provisioningAttemptId: 'claim-NEW' }),
    ));
  });

  it('reconciles the claim when BLE disconnects after the robot may have received the handoff', async () => {
    seedSecrets('claim-1');
    mockedProvisionWifiViaLocalBle.mockRejectedValue(Object.assign(
      new Error('Device disconnected after write'),
      { code: 'BLE_PROVISIONING_DISCONNECTED', deliveryUnknown: true },
    ));
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-1',
    }));
    expect(mockedGetClaimStatus).toHaveBeenCalledWith('claim-1');
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
  });

  it('reconciles a re-minted claim id after an ambiguous late BLE failure', async () => {
    putPairingWifiPassword('attempt-zc-1', WIFI_PASSWORD);
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-NEW',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Waiting for Robot.',
      expiresAt: '2026-06-10T12:05:00.000Z',
    });
    mockedProvisionWifiViaLocalBle.mockRejectedValue(Object.assign(
      new Error('Device disconnected after write'),
      {
        code: 'BLE_PROVISIONING_DISCONNECTED',
        deliveryUnknown: true,
        provisioningAttemptId: 'claim-NEW',
      },
    ));
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-NEW',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-1' }) } as never}
      />,
    );

    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledWith('claim-NEW'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairRenameScreen,
      expect.objectContaining({ provisioningAttemptId: 'claim-NEW' }),
    ));
  });

  it('CLAIM_CONFIRMED advances to PairRename with the claim id', async () => {
    seedSecrets('claim-1');
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never} // no code -> claim_confirmed completion mode
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-1',
    }));
    // Zero-code path polls the claim, not the provisioning-attempt, status.
    expect(mockedGetClaimStatus).toHaveBeenCalledWith('claim-1');
    expect(mockedGetProvisioningAttemptStatus).not.toHaveBeenCalled();
  });

  it('does not retry a top-level HTTP 401 while polling claim status', async () => {
    seedSecrets('claim-1');
    mockedGetClaimStatus.mockRejectedValue({
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password.',
      status: 401,
      retryable: false,
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'INVALID_CREDENTIALS' }),
    ));
    expect(mockedGetClaimStatus).toHaveBeenCalledTimes(1);
  });

  it('CLAIMED (idempotent terminal) also advances to PairRename', async () => {
    seedSecrets('claim-1');
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'CLAIMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.objectContaining({
      provisioningAttemptId: 'claim-1',
    })));
  });

  it('[online != claimed] getClaimStatus online:true but WAITING never advances (single-poll, no hang)', async () => {
    seedSecrets('claim-1');
    // Robot heartbeat is up, but physical confirm has not happened. With a single
    // poll attempt the loop times out -> CLAIM_CONFIRM_TIMEOUT, never success.
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never}
      />,
    );

    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalled());
    // An online heartbeat alone never advances the claim to a success/home screen.
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });

  it('keeps waiting past 20 polls for delayed CLAIM_CONFIRMED status', async () => {
    jest.useFakeTimers();
    try {
      seedSecrets('claim-1');
      const claimExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      let polls = 0;
      mockedGetClaimStatus.mockImplementation(async () => {
        polls += 1;
        if (polls >= 25) {
          return {
            claimId: 'claim-1',
            deviceId: 'device-1',
            status: 'CLAIM_CONFIRMED',
            online: true,
            expiresAt: null,
            failureCode: null,
          };
        }
        return {
          claimId: 'claim-1',
          deviceId: 'device-1',
          status: 'WAITING_PHYSICAL_CONFIRM',
          online: true,
          expiresAt: claimExpiresAt,
          failureCode: null,
        };
      });
      const navigate = jest.fn();
      render(
        <PairConnectingScreen
          navigation={{ navigate } as never}
          route={{ params: bleClaimParams() } as never}
        />,
      );

      await advancePairingPolls(24 * 3000);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
        deviceId: 'device-1',
        serialNumber: SERIAL,
        provisioningAttemptId: 'claim-1',
      }));
      expect(mockedGetClaimStatus).toHaveBeenCalledTimes(25);
      expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('does not shrink the backend claim expiry window while polling status updates', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
    try {
      seedSecrets('claim-1');
      const claimExpiresAt = '2026-06-10T12:05:00.000Z';
      let polls = 0;
      mockedGetClaimStatus.mockImplementation(async () => {
        polls += 1;
        if (polls >= 76) {
          return {
            claimId: 'claim-1',
            deviceId: 'device-1',
            status: 'CLAIM_CONFIRMED',
            online: true,
            expiresAt: null,
            failureCode: null,
          };
        }
        return {
          claimId: 'claim-1',
          deviceId: 'device-1',
          status: 'WAITING_PHYSICAL_CONFIRM',
          online: true,
          expiresAt: claimExpiresAt,
          failureCode: null,
        };
      });
      const navigate = jest.fn();
      render(
        <PairConnectingScreen
          navigation={{ navigate } as never}
          route={{ params: bleClaimParams() } as never}
        />,
      );

      await advancePairingPolls(75 * 3000);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
        deviceId: 'device-1',
        serialNumber: SERIAL,
        provisioningAttemptId: 'claim-1',
      }));
      expect(mockedGetClaimStatus).toHaveBeenCalledTimes(76);
      expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('does not extend the original claim deadline when status expiresAt is malformed', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
    try {
      putPairingWifiPassword('attempt-zc-invalid-expiry', WIFI_PASSWORD);
      mockedRequestClaim.mockResolvedValue({
        claimId: 'claim-invalid-expiry',
        deviceId: 'device-1',
        status: 'WAITING_PHYSICAL_CONFIRM',
        message: 'Press the button on your TBot to allow connection.',
        expiresAt: '2026-06-10T12:00:30.000Z',
      });
      mockedGetClaimStatus.mockResolvedValue({
        claimId: 'claim-invalid-expiry',
        deviceId: 'device-1',
        status: 'WAITING_PHYSICAL_CONFIRM',
        online: true,
        expiresAt: 'not-a-date',
        failureCode: null,
      });
      const navigate = jest.fn();
      render(
        <PairConnectingScreen
          navigation={{ navigate } as never}
          route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-invalid-expiry' }) } as never}
        />,
      );

      await advancePairingPolls(35 * 1000);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({
          errorCode: 'CLAIM_CONFIRM_TIMEOUT',
          provisioningAttemptId: 'claim-invalid-expiry',
        }),
      ));
      expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    } finally {
      consumePairingWifiPassword('attempt-zc-invalid-expiry');
      clearPairingBootstrapToken('attempt-zc-invalid-expiry');
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('claim FAILED surfaces the backend failureCode to PairFailed', async () => {
    seedSecrets('claim-1');
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'FAILED',
      online: false,
      expiresAt: null,
      failureCode: 'WIFI_CONNECT_FAILED',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'WIFI_CONNECT_FAILED' }),
    ));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
  });

  it('keeps claim-domain recovery parity when DEVICE_ALREADY_OWNED reaches PairFailed through PairConnecting', async () => {
    seedSecrets('claim-1');
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'FAILED',
      online: false,
      expiresAt: null,
      failureCode: 'DEVICE_ALREADY_OWNED',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'DEVICE_ALREADY_OWNED' }),
    ));

    const [, failedParams] = navigate.mock.calls.find(([route]) => route === ROUTES.PairFailedScreen) ?? [];
    const descriptor = describeClaimFailure({ code: 'DEVICE_ALREADY_OWNED', message: 'owned', status: 409 });
    const failed = render(
      <PairFailedScreen
        navigation={{ navigate: jest.fn(), reset: jest.fn() } as never}
        route={{ params: failedParams } as never}
      />,
    );

    expect(failed.getByText(descriptor.title)).toBeTruthy();
    expect(failed.getByText(descriptor.body)).toBeTruthy();
    expect(failed.queryByText('Wrong Wi-Fi password')).toBeNull();
    expect(failed.queryByText('Robot looks asleep')).toBeNull();
  });

  it('[late-claim id] a re-minted claim id is forwarded to PairFailed on a confirmation failure (not the stale route id)', async () => {
    // Production zero-code path that reaches this screen WITHOUT a pre-minted
    // token and with a non-claim attempt id (e.g. the bootstrap-token handoff
    // expired): the run re-runs requestClaim and adopts a brand-new claim id.
    // When confirmation then fails, PairFailed must receive that NEW id so its
    // late-claim recovery polls the real claim — not the stale route param.
    putPairingWifiPassword('attempt-zc-1', WIFI_PASSWORD); // password only, no token
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-NEW',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-10T12:05:00.000Z',
    });
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-NEW',
      deviceId: 'device-1',
      status: 'FAILED',
      online: false,
      expiresAt: null,
      failureCode: 'WIFI_CONNECT_FAILED',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        // non-claim attempt id so the run re-mints a cloud claim
        route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-1' }) } as never}
      />,
    );

    await waitFor(() => expect(mockedRequestClaim).toHaveBeenCalledWith({ deviceId: 'device-1' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({
        errorCode: 'WIFI_CONNECT_FAILED',
        // The freshly-minted claim id, NOT the stale 'attempt-zc-1' route param.
        provisioningAttemptId: 'claim-NEW',
        provisioningTransport: 'ble_claim',
      }),
    ));
  });

  it('[late-claim confirmed] a retry request that returns CLAIM_CONFIRMED advances without minting another token', async () => {
    // Reproduces the field symptom class: the robot has already confirmed, but
    // the mobile route lost its in-memory bootstrap token and re-runs
    // requestClaim. If the backend returns the confirmed claim, the screen must
    // not mint/send another token or restart local BLE; it should adopt that
    // claim id and let the status poll exit the waiting screen.
    putPairingWifiPassword('attempt-zc-1', WIFI_PASSWORD); // password only, no token
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-confirmed-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      message: 'Connection already confirmed.',
      expiresAt: '2026-06-10T12:05:00.000Z',
    });
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-confirmed-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-1' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-confirmed-1',
    }));
    expect(mockedRequestClaim).toHaveBeenCalledWith({ deviceId: 'device-1' });
    expect(mockedGetClaimStatus).toHaveBeenCalledWith('claim-confirmed-1');
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
  });

  it('persists the confirmed pairing context before navigating to Rename', async () => {
    putPairingWifiPassword('attempt-zc-1', WIFI_PASSWORD); // password only, no token
    let resolveSave: (() => void) | undefined;
    mockedSavePendingPairingContext.mockReturnValue(new Promise<void>((resolve) => {
      resolveSave = resolve;
    }));
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-confirmed-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      message: 'Connection already confirmed.',
      expiresAt: '2026-06-10T12:05:00.000Z',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ provisioningAttemptId: 'attempt-zc-1' }) } as never}
      />,
    );

    await waitFor(() => expect(mockedSavePendingPairingContext).toHaveBeenCalledWith({
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-confirmed-1',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());

    await act(async () => {
      resolveSave?.();
    });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: SERIAL,
      provisioningAttemptId: 'claim-confirmed-1',
    }));
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
  });

  it('zero-code without a pre-minted token mints one before the BLE handoff', async () => {
    putPairingWifiPassword('claim-1', WIFI_PASSWORD); // password only, no token
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams() } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    expect(mockedMintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'claim-1' });
    expect(mockedRequestClaim).not.toHaveBeenCalled(); // attempt id already looks like a claim id
    expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalledWith(
      expect.objectContaining({ token: BOOTSTRAP_TOKEN }),
    );
  });
});

// ===========================================================================
// 5. BLE reconnect path (credential-only): device_online via getDeviceStatus.
// ===========================================================================
describe('PairConnectingScreen — BLE reconnect (credential-only) path', () => {
  it('tolerates exactly four retryable backend status failures before succeeding on the fifth poll', async () => {
    jest.useFakeTimers();
    try {
      putPairingWifiPassword('attempt-rc-1', WIFI_PASSWORD);
      mockedGetDeviceStatus
        .mockRejectedValueOnce({ response: { status: 404 }, code: 'DEVICE_NOT_FOUND' })
        .mockRejectedValueOnce({ response: { status: 408 } })
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValueOnce({ id: 'device-1', name: SERIAL, online: true, batteryPercent: 90 });
      const navigate = jest.fn();
      const reset = jest.fn();

      render(
        <PairConnectingScreen
          navigation={{ navigate, reset } as never}
          route={{ params: bleReconnectParams() } as never}
        />,
      );

      await waitFor(() => expect(mockedGetDeviceStatus).toHaveBeenCalledTimes(1));
      expect(reset).not.toHaveBeenCalled();
      await advancePairingPolls(12000);
      await waitFor(() => expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] }));
      expect(mockedGetDeviceStatus).toHaveBeenCalledTimes(5);
      expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('exhausts all 20 reconnect polls before routing to RECONNECT_DEVICE_OFFLINE_TIMEOUT', async () => {
    jest.useFakeTimers();
    try {
      putPairingWifiPassword('attempt-rc-1', WIFI_PASSWORD);
      mockedGetDeviceStatus.mockRejectedValue({ response: { status: 503 } });
      const navigate = jest.fn();
      const reset = jest.fn();

      render(
        <PairConnectingScreen
          navigation={{ navigate, reset } as never}
          route={{ params: bleReconnectParams() } as never}
        />,
      );

      await waitFor(() => expect(mockedGetDeviceStatus).toHaveBeenCalledTimes(1));
      expect(reset).not.toHaveBeenCalled();
      await advancePairingPolls(57000);
      await waitFor(() => expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'RECONNECT_DEVICE_OFFLINE_TIMEOUT' }),
      ));
      expect(mockedGetDeviceStatus).toHaveBeenCalledTimes(20);
      expect(reset).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen, expect.anything());
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('retries Axios 404/503 device-online polls before succeeding', async () => {
    jest.useFakeTimers();
    try {
      putPairingWifiPassword('attempt-rc-1', WIFI_PASSWORD);
      mockedGetDeviceStatus
        .mockRejectedValueOnce({ response: { status: 404 }, code: 'DEVICE_NOT_FOUND' })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValueOnce({ id: 'device-1', name: SERIAL, online: true, batteryPercent: 90 });
      const navigate = jest.fn();
      const reset = jest.fn();
      render(
        <PairConnectingScreen
          navigation={{ navigate, reset } as never}
          route={{ params: bleReconnectParams() } as never}
        />,
      );

      await waitFor(() => expect(mockedGetDeviceStatus).toHaveBeenCalledTimes(1));
      await advancePairingPolls(6000);
      await waitFor(() => expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] }));
      expect(mockedGetDeviceStatus).toHaveBeenCalledTimes(3);
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });
  it('credential-only handoff, then getDeviceStatus online:true advances to DeviceHome', async () => {
    putPairingWifiPassword('attempt-rc-1', WIFI_PASSWORD);
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: SERIAL,
      online: true,
      batteryPercent: 90,
    });
    const navigate = jest.fn();
    const reset = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate, reset } as never}
        route={{ params: bleReconnectParams() } as never}
      />,
    );

    // Reset (not navigate) so the finished reconnect/pairing stack is dropped and
    // DeviceHome becomes the root — Back must not re-enter the finished screens.
    await waitFor(() => expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
    // Credential-only: no claim confirm, no token mint, no claim poll.
    expect(mockedConfirmLocalBlePaired).not.toHaveBeenCalled();
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalledWith(
      expect.objectContaining({ allowCredentialOnly: true, ssid: SSID, password: WIFI_PASSWORD }),
    );
  });

  it('[reconnect waiting] before getDeviceStatus online, the screen stays waiting (no premature home nav)', async () => {
    putPairingWifiPassword('attempt-rc-1', WIFI_PASSWORD);
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: SERIAL,
      online: false,
      batteryPercent: 90,
    });
    const navigate = jest.fn();
    const screen = render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleReconnectParams() } as never}
      />,
    );

    await waitFor(() => expect(mockedGetDeviceStatus).toHaveBeenCalled());
    // Robot offline => no home nav, screen still says hang-tight.
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
    expect(screen.queryByText('Robot authenticated')).toBeNull();
  });
});

// ===========================================================================
// 6. Secret hygiene + token lifecycle (success clears, failure retains).
// ===========================================================================
describe('PairConnectingScreen — secret lifecycle and anti-leak', () => {
  it('clears the bootstrap token on a confirmed success', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'device_authenticated',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    // Token is consumed/cleared once the backend confirms.
    expect(getPairingBootstrapToken('claim-1')).toBeUndefined();
  });

  it('reconnect success clears the bootstrap token', async () => {
    seedSecrets('attempt-rc-1');
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: SERIAL,
      online: true,
      batteryPercent: 90,
    });
    const navigate = jest.fn();
    const reset = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate, reset } as never}
        route={{ params: bleReconnectParams() } as never}
      />,
    );

    await waitFor(() => expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] }));
    expect(getPairingBootstrapToken('attempt-rc-1')).toBeUndefined();
  });

  it('never leaks the Wi-Fi password, token, or code into a success navigation payload', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'device_authenticated',
    });
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    const strings = navigatePayloadStrings(navigate);
    expect(strings).not.toContain(WIFI_PASSWORD);
    expect(strings).not.toContain(BOOTSTRAP_TOKEN);
    // The next setup screen does not receive the provisioning code.
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.not.objectContaining({ code: expect.anything() }));
  });

  it('never leaks the Wi-Fi password or bootstrap token into a failure navigation payload', async () => {
    seedSecrets('claim-1');
    mockedProvisionWifiViaLocalBle.mockRejectedValue(
      // Even if a service error message accidentally embedded a secret, the screen
      // only forwards the error CODE — not the message — into the route.
      Object.assign(new Error(`Robot refused token ${BOOTSTRAP_TOKEN} for ${WIFI_PASSWORD}`), { code: 'WIFI_CONNECT_FAILED' }),
    );
    const navigate = jest.fn();
    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: PROVISIONING_CODE }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'WIFI_CONNECT_FAILED' }),
    ));
    const strings = navigatePayloadStrings(navigate);
    expect(strings).not.toContain(WIFI_PASSWORD);
    expect(strings).not.toContain(BOOTSTRAP_TOKEN);
  });
});
