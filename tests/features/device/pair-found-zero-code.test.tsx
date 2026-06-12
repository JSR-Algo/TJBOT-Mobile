import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PairFoundScreen from '@/features/device/pairing/screens/PairFoundScreen';
import { ROUTES } from '@/navigation/routes';
import { getClaimStatus, requestClaim } from '@/services/api/claim.api';
import { mintBootstrapToken } from '@/services/api/device.api';
import { sendClaimBootstrapTokenViaBle } from '@/services/ble/service';

jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: false,
  isSubscriptionFeatureEnabled: () => false,
  FEATURE_ZERO_CODE_CLAIM: true,
  isZeroCodeClaimEnabled: () => true,
}));

jest.mock('@/services/api/claim.api', () => ({
  __esModule: true,
  requestClaim: jest.fn(),
  getClaimStatus: jest.fn(),
}));

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  mintBootstrapToken: jest.fn(),
}));

jest.mock('@/services/ble/service', () => ({
  __esModule: true,
  sendClaimBootstrapTokenViaBle: jest.fn(),
}));

const mockedRequestClaim = requestClaim as jest.MockedFunction<typeof requestClaim>;
const mockedGetClaimStatus = getClaimStatus as jest.MockedFunction<typeof getClaimStatus>;
const mockedMintBootstrapToken = mintBootstrapToken as jest.MockedFunction<typeof mintBootstrapToken>;
const mockedSendClaimBootstrapTokenViaBle = sendClaimBootstrapTokenViaBle as jest.MockedFunction<typeof sendClaimBootstrapTokenViaBle>;

describe('PairFoundScreen zero-code default path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequestClaim.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    mockedGetClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
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

  it('prepares a claim bootstrap token then routes BLE-discovered robots through Wi-Fi provisioning', async () => {
    const navigate = jest.fn();
    const screen = render(
      <PairFoundScreen
        navigation={{ navigate } as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TBT-2026-004217',
            provisioningAttemptId: 'attempt-1',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble',
          },
        } as never}
      />,
    );

    fireEvent.press(screen.getByText('This is my Robot'));

    await waitFor(() => expect(mockedRequestClaim).toHaveBeenCalledWith({ deviceId: 'device-1' }));
    await waitFor(() => expect(mockedMintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'claim-1' }));
    expect(mockedSendClaimBootstrapTokenViaBle).not.toHaveBeenCalled();
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'attempt-1',
    });
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairQrScanScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairCodeScreen, expect.anything());
  });

  it('exits immediately when the Wi-Fi claim request is already confirmed', async () => {
    mockedRequestClaim.mockResolvedValueOnce({
      claimId: 'claim-confirmed',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      message: 'Already confirmed.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    const navigate = jest.fn();
    const screen = render(
      <PairFoundScreen
        navigation={{ navigate } as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TBT-2026-004217',
            provisioningAttemptId: 'attempt-1',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble',
          },
        } as never}
      />,
    );

    fireEvent.press(screen.getByText('This is my Robot'));

    await waitFor(() => expect(mockedRequestClaim).toHaveBeenCalledWith({ deviceId: 'device-1' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-confirmed',
    }));
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    expect(mockedSendClaimBootstrapTokenViaBle).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
  });

  it('shows retry and QR/code fallback after a claim failure', async () => {
    mockedRequestClaim.mockRejectedValueOnce({ code: 'INTERNAL_ERROR', message: 'boom', status: 500 });
    const navigate = jest.fn();
    const screen = render(
      <PairFoundScreen
        navigation={{ navigate } as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TBT-2026-004217',
            provisioningAttemptId: 'attempt-1',
            bleDeviceId: 'ble-device-1',
          },
        } as never}
      />,
    );

    fireEvent.press(screen.getByText('This is my Robot'));

    await waitFor(() => expect(screen.getByText('Service is having trouble')).toBeTruthy());
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Scan QR or enter code')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairQrScanScreen, expect.anything());

    fireEvent.press(screen.getByText('Scan QR or enter code'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'attempt-1',
      bleDeviceId: 'ble-device-1',
    });
  });

  it('routes to QR/code fallback instead of creating a claim when BLE identity is missing', async () => {
    const navigate = jest.fn();
    const screen = render(
      <PairFoundScreen
        navigation={{ navigate } as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TBT-2026-004217',
            provisioningAttemptId: 'attempt-1',
          },
        } as never}
      />,
    );

    fireEvent.press(screen.getByText('This is my Robot'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'attempt-1',
    });
    expect(mockedRequestClaim).not.toHaveBeenCalled();
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    expect(mockedSendClaimBootstrapTokenViaBle).not.toHaveBeenCalled();
  });
});
