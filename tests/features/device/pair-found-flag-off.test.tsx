import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PairFoundScreen from '@/features/device/pairing/screens/PairFoundScreen';
import { ROUTES } from '@/navigation/routes';

// Explicit override: when the zero-code physical-confirm flow is OFF,
// PairFound must still offer a WORKING forward path into the device.api Wi-Fi
// pairing path (via the QR/code code-funnel), not dead-end on "Search again".
jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: false,
  isSubscriptionFeatureEnabled: () => false,
  FEATURE_ZERO_CODE_CLAIM: false,
  isZeroCodeClaimEnabled: () => false,
}));

// The zero-code claim service must never be touched while the flag is OFF.
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

import { requestClaim, getClaimStatus } from '@/services/api/claim.api';
import { mintBootstrapToken } from '@/services/api/device.api';

const mockedRequestClaim = requestClaim as jest.MockedFunction<typeof requestClaim>;
const mockedGetClaimStatus = getClaimStatus as jest.MockedFunction<typeof getClaimStatus>;
const mockedMintBootstrapToken = mintBootstrapToken as jest.MockedFunction<typeof mintBootstrapToken>;

const ROUTE_PARAMS = {
  deviceId: 'device-1',
  serialNumber: 'TBT-2026-004217',
  provisioningAttemptId: 'attempt-1',
  bleDeviceId: 'ble-device-1',
  provisioningTransport: 'ble' as const,
};

function renderPairFound(navigate: jest.Mock) {
  return render(
    <PairFoundScreen
      navigation={{ navigate } as never}
      route={{ params: ROUTE_PARAMS } as never}
    />,
  );
}

describe('PairFoundScreen with FEATURE_ZERO_CODE_CLAIM OFF override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the primary CTA enabled even though a deviceId is present', () => {
    const navigate = jest.fn();
    const screen = renderPairFound(navigate);

    const cta = screen.getByText('This is my Robot');
    // The CTA must not be disabled — a discovered robot is not a dead-end.
    expect(cta).toBeTruthy();
    fireEvent.press(cta);
    // Pressing it forwards into the device.api Wi-Fi path via the QR/code funnel.
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, ROUTE_PARAMS);
  });

  it('routes the forward path to the device.api Wi-Fi flow and never invokes the zero-code claim', () => {
    const navigate = jest.fn();
    const screen = renderPairFound(navigate);

    fireEvent.press(screen.getByText('This is my Robot'));

    // No zero-code claim side effects while the flag is OFF.
    expect(mockedRequestClaim).not.toHaveBeenCalled();
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
    expect(mockedMintBootstrapToken).not.toHaveBeenCalled();
    // The forward route is the QR/code funnel that supplies the 6-digit code the
    // device.api PairConnecting step requires.
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, ROUTE_PARAMS);
  });

  it('offers more than a "Search again" dead-end: a working forward action exists', () => {
    const navigate = jest.fn();
    const screen = renderPairFound(navigate);

    // The brick was: with the flag OFF + a deviceId, only "Search again" worked.
    // The primary CTA must now be a real forward action distinct from search.
    fireEvent.press(screen.getByText('This is my Robot'));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSearchScreen);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, ROUTE_PARAMS);

    // "Search again" still exists as a secondary escape, but is not the only path.
    expect(screen.getByText('Search again')).toBeTruthy();
  });
});
