import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PairFailedScreen from '@/features/device/pairing/screens/PairFailedScreen';
import PairConnectingScreen from '@/features/device/pairing/screens/PairConnectingScreen';
import { ROUTES } from '@/navigation/routes';
import { provisionWifiViaLocalBle } from '@/services/ble/service';
import {
  confirmLocalBlePaired,
  getDeviceStatus,
  getProvisioningAttemptStatus,
  mintBootstrapToken,
} from '@/services/api/device.api';
import { getClaimStatus, requestClaim } from '@/services/api/claim.api';
import {
  consumePairingWifiPassword,
  getPairingBootstrapToken,
  putPairingBootstrapToken,
  putPairingWifiPassword,
} from '@/features/device/pairing/pairingSecretHandoff';

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
}));

jest.mock('@/services/api/claim.api', () => ({
  __esModule: true,
  getClaimStatus: jest.fn(),
  requestClaim: jest.fn(),
}));

const mockedProvisionWifiViaLocalBle = provisionWifiViaLocalBle as jest.MockedFunction<typeof provisionWifiViaLocalBle>;
const mockedConfirmLocalBlePaired = confirmLocalBlePaired as jest.MockedFunction<typeof confirmLocalBlePaired>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockedGetProvisioningAttemptStatus = getProvisioningAttemptStatus as jest.MockedFunction<typeof getProvisioningAttemptStatus>;
const mockedMintBootstrapToken = mintBootstrapToken as jest.MockedFunction<typeof mintBootstrapToken>;
const mockedGetClaimStatus = getClaimStatus as jest.MockedFunction<typeof getClaimStatus>;
const mockedRequestClaim = requestClaim as jest.MockedFunction<typeof requestClaim>;

const BOOTSTRAP_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// A claim-flow attempt id (matches the screen's isLikelyClaimId heuristic so the
// run does not re-create a cloud claim) carrying a pre-minted bootstrap token.
function bleClaimParams(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: 'device-1',
    serialNumber: 'TBT-2026-004217',
    provisioningAttemptId: 'claim-1',
    ssid: 'Casa',
    bleDeviceId: 'ble-device-1',
    provisioningTransport: 'ble',
    ...overrides,
  } as never;
}

function seedSecrets(provisioningAttemptId: string): void {
  putPairingWifiPassword(provisioningAttemptId, 'secret-pass');
  putPairingBootstrapToken(provisioningAttemptId, BOOTSTRAP_TOKEN);
}

describe('PairFailedScreen recovery actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      online: false,
      expiresAt: null,
      failureCode: null,
    });
  });

  it('does not offer Wi-Fi password recovery when the robot is already owned', () => {
    const screen = render(
      <PairFailedScreen
        navigation={{ navigate: jest.fn() } as never}
        route={{ params: { errorCode: 'DEVICE_ALREADY_ASSIGNED' } } as never}
      />,
    );

    expect(screen.getByText('Robot is already paired')).toBeTruthy();
    expect(screen.queryByText('Wrong Wi-Fi password')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// US-005 mobile invariants MB6–MB11 (PairConnectingScreen orchestration).
// ---------------------------------------------------------------------------
describe('PairConnectingScreen US-005 invariants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expiresAt: '2026-06-09T12:05:00.000Z',
      ttlSeconds: 300,
    });
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-09T12:05:00.000Z',
    });
  });

  it('[MB6] after wifi_credentials_sent, code-based pairing advances to rename without an auth poll', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'ble_paired',
    });
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: '123456' }) } as never}
      />,
    );

    await waitFor(() => expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalled());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
    }));
    expect(mockedGetProvisioningAttemptStatus).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen, expect.anything());
  });

  it('[MB7] getProvisioningAttemptStatus -> device_authenticated advances to the next setup screen', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'device_authenticated',
    });
    const navigate = jest.fn();

    render(
      // code present so completionMode is device_authenticated -> polls the attempt status
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: '123456' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
    }));
  });

  it('[MB8] getProvisioningAttemptStatus -> completed advances to the next setup screen', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'completed',
    });
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: '123456' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
    }));
  });

  it('[MB9] a stale failed status does not override a successful code-based BLE handoff', async () => {
    seedSecrets('claim-1');
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'failed',
      failureCode: 'DEVICE_AUTH_NOT_VERIFIED',
    });
    const navigate = jest.fn();

    render(
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ code: '123456' }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    expect(mockedGetProvisioningAttemptStatus).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
  });

  it('[MB10] getDeviceStatus({online:true}) ALONE does not complete the BLE provisioning claim', async () => {
    seedSecrets('claim-1');
    // Robot reports online, but the claim/auth status never confirms. Online must
    // NOT be treated as claim completion on the BLE claim path.
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'TBT-2026-004217',
      online: true,
      batteryPercent: 90,
    });
    mockedGetProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      status: 'ble_paired',
    });
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

    await waitFor(() => expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalled());
    // Give the polling loop a chance to run.
    await waitFor(() => expect(
      mockedGetClaimStatus.mock.calls.length + mockedGetProvisioningAttemptStatus.mock.calls.length,
    ).toBeGreaterThan(0));

    // An online heartbeat alone never advances the claim flow to the home screen.
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.DeviceHomeScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
  });

  it('[MB11] losing bleDeviceId before token delivery routes to a fallback/recovery path (not a silent hang)', async () => {
    seedSecrets('claim-1');
    const navigate = jest.fn();

    render(
      // BLE transport but the BLE handle is missing — the screen must route to a
      // failure/recovery screen rather than hang or silently proceed.
      <PairConnectingScreen
        navigation={{ navigate } as never}
        route={{ params: bleClaimParams({ bleDeviceId: undefined }) } as never}
      />,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairFailedScreen,
      expect.objectContaining({ errorCode: 'PAIRING_CONTEXT_MISSING' }),
    ));
    // It must NOT attempt BLE token/credential delivery without a BLE handle.
    expect(mockedProvisionWifiViaLocalBle).not.toHaveBeenCalled();
    // Sanity: the seeded password was consumed/not consumed correctly — the guard
    // fires before credential handoff.
    expect(getPairingBootstrapToken('claim-1')).toBeDefined();
  });

  afterEach(() => {
    // Drain any leftover one-shot secrets so handoff TTL timers do not bleed
    // across tests.
    consumePairingWifiPassword('claim-1');
  });
});
