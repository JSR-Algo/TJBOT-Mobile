import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PairRenameScreen from '@/features/device/pairing/screens/PairRenameScreen';
import { ROUTES } from '@/navigation/routes';
import { completeDeviceProvisioning } from '@/services/api/device.api';
import type { CompleteDeviceProvisioningResult } from '@/services/api/device.api';
import { markLocalDevicePaired } from '@/features/device/pairing/localPairedDevice';
import { getPendingPairingContext } from '@/features/device/pairing/pendingPairingContext';

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  completeDeviceProvisioning: jest.fn(),
  confirmLocalBlePaired: jest.fn(),
  mintBootstrapToken: jest.fn(),
  reportProvisioningDeviceAuthenticated: jest.fn(),
}));

jest.mock('@/features/device/pairing/localPairedDevice', () => ({
  __esModule: true,
  markLocalDevicePaired: jest.fn(),
}));

jest.mock('@/features/device/pairing/pendingPairingContext', () => ({
  __esModule: true,
  getPendingPairingContext: jest.fn(),
  clearPendingPairingContext: jest.fn(),
}));

const mockedComplete = completeDeviceProvisioning as jest.MockedFunction<typeof completeDeviceProvisioning>;
const mockedMarkLocal = markLocalDevicePaired as jest.MockedFunction<typeof markLocalDevicePaired>;
const mockedGetPendingPairingContext = getPendingPairingContext as jest.MockedFunction<typeof getPendingPairingContext>;

const FULL_PARAMS = {
  deviceId: 'device-1',
  serialNumber: 'TBT-2026-004217',
  provisioningAttemptId: 'claim-1',
};

const COMPLETE_OK: CompleteDeviceProvisioningResult = {
  device: {
    id: 'device-1',
    status: 'active',
    lifecycleState: 'provisioned',
    displayName: 'Living-room Robot',
    assignedChildProfileId: null,
  },
};

function renderScreen(navigate: jest.Mock, params?: Record<string, unknown>, reset: jest.Mock = jest.fn()) {
  return render(
    <PairRenameScreen navigation={{ navigate, reset } as never} route={{ params } as never} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedComplete.mockResolvedValue(COMPLETE_OK);
  mockedMarkLocal.mockResolvedValue(undefined);
  mockedGetPendingPairingContext.mockResolvedValue(null);
});

describe('PairRenameScreen auto-finalization bridge', () => {
  it('renders only a finishing state and auto-completes pairing without a child profile', async () => {
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    expect(screen.getByText('Finishing setup')).toBeTruthy();
    expect(screen.queryByText('Save & continue')).toBeNull();
    expect(screen.queryByLabelText("Robot's name")).toBeNull();
    expect(screen.queryByText('Buddy')).toBeNull();
    expect(screen.queryByText('Child')).toBeNull();

    await waitFor(() => expect(mockedComplete).toHaveBeenCalledTimes(1));
    const [payload] = mockedComplete.mock.calls[0];
    expect(payload).toEqual({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      displayName: 'Living-room Robot',
    });
    expect(payload).not.toHaveProperty('assignChildProfileId');
    expect(mockedMarkLocal).toHaveBeenCalledWith('device-1');
    expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: { deviceId: 'device-1', serialNumber: 'TBT-2026-004217', provisioningAttemptId: 'claim-1' },
        },
      ],
    });
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairChildProfileScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
  });

  it('uses the pending pairing context when route params were lost', async () => {
    mockedGetPendingPairingContext.mockResolvedValue({
      deviceId: 'device-from-pending',
      serialNumber: 'TBOT-PENDING',
      provisioningAttemptId: 'claim-from-pending',
    });
    const navigate = jest.fn();
    const reset = jest.fn();

    renderScreen(navigate, undefined, reset);

    await waitFor(() => expect(mockedComplete).toHaveBeenCalledWith({
      provisioningAttemptId: 'claim-from-pending',
      deviceId: 'device-from-pending',
      displayName: 'Living-room Robot',
    }));
    expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: {
            deviceId: 'device-from-pending',
            serialNumber: 'TBOT-PENDING',
            provisioningAttemptId: 'claim-from-pending',
          },
        },
      ],
    });
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairChildProfileScreen, expect.anything());
  });

  it('routes to PairFailed with PAIRING_CONTEXT_MISSING when route and pending context are incomplete', async () => {
    const navigate = jest.fn();

    renderScreen(navigate, { serialNumber: 'TBT-2026-004217' });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      deviceId: undefined,
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: undefined,
      errorCode: 'PAIRING_CONTEXT_MISSING',
    }));
    expect(mockedComplete).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairChildProfileScreen, expect.anything());
  });

  it('keeps DEVICE_AUTH_TIMEOUT on the bridge and retries with the same context when the parent taps retry', async () => {
    mockedComplete
      .mockRejectedValueOnce(Object.assign(new Error('robot is still initializing'), { code: 'DEVICE_AUTH_TIMEOUT' }))
      .mockResolvedValueOnce(COMPLETE_OK);
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    await waitFor(() => expect(screen.getByTestId('pairing-auth-timeout-message')).toBeTruthy());
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());

    fireEvent.press(screen.getByText('Try again'));

    await waitFor(() => expect(mockedComplete).toHaveBeenCalledTimes(2));
    expect(mockedComplete).toHaveBeenNthCalledWith(2, {
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      displayName: 'Living-room Robot',
    });
    await waitFor(() => expect(reset).toHaveBeenCalledWith(expect.objectContaining({ index: 1 })));
  });

  it('ignores duplicate retry taps while a finalize call is already in flight', async () => {
    mockedComplete.mockRejectedValueOnce(Object.assign(new Error('robot is still initializing'), { code: 'DEVICE_AUTH_TIMEOUT' }));
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
    let resolveComplete: (value: CompleteDeviceProvisioningResult) => void = () => undefined;
    mockedComplete.mockImplementationOnce(
      () => new Promise<CompleteDeviceProvisioningResult>((resolve) => { resolveComplete = resolve; }),
    );

    const retryButton = screen.getByText('Try again');
    fireEvent.press(retryButton);
    fireEvent.press(retryButton);
    fireEvent.press(retryButton);

    await waitFor(() => expect(mockedComplete).toHaveBeenCalledTimes(2));
    resolveComplete(COMPLETE_OK);
  });

  it('preserves typed non-timeout finalize errors on PairFailed', async () => {
    mockedComplete.mockRejectedValue(Object.assign(new Error('boom'), { code: 'BACKEND_5XX' }));
    const navigate = jest.fn();

    renderScreen(navigate, FULL_PARAMS);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
      errorCode: 'BACKEND_5XX',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairChildProfileScreen, expect.anything());
  });

  it('lifts axios-shaped error.response.data.error.code before falling back', async () => {
    mockedComplete.mockRejectedValue({ response: { data: { error: { code: 'PROVISIONING_ATTEMPT_EXPIRED' } } } });
    const navigate = jest.fn();

    renderScreen(navigate, FULL_PARAMS);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'PROVISIONING_ATTEMPT_EXPIRED' }),
      ),
    );
  });
});
