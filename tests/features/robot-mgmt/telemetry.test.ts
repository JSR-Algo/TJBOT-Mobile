import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import {
  getDeviceStatus,
  getFirmwareVersion,
} from '@/services/api/device.api';
import { BackendContractUnavailableError } from '@/services/api/undocumented-api-routes';
import { useRobotTelemetry } from '@/features/robot-mgmt/telemetry';

jest.mock('@/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
  getFirmwareVersion: jest.fn(),
  isBackendContractUnavailableError: jest.requireActual('@/services/api/device.api')
    .isBackendContractUnavailableError,
}));

const mockedGetDeviceStatus = jest.mocked(getDeviceStatus);
const mockedGetFirmwareVersion = jest.mocked(getFirmwareVersion);

describe('useRobotTelemetry', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders coming-soon state when firmware endpoint is unavailable', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'primary',
      name: 'TJBot-0001',
      online: true,
      batteryPercent: 87,
      wifiSsid: 'Casa',
      charging: false,
      lastSeenAt: '2026-05-16T00:00:00.000Z',
    });
    mockedGetFirmwareVersion.mockRejectedValue(
      new BackendContractUnavailableError('getFirmwareVersion:primary'),
    );

    const { result } = renderHook(() => useRobotTelemetry(), {
      wrapper: ({ children }) => React.createElement(React.Fragment, null, children),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.featureUnavailable).toBe(true);
    expect(result.current.errorMessage).toBe('Robot details are coming soon.');
  });

  it('renders generic error state for non-contract failures', async () => {
    mockedGetDeviceStatus.mockRejectedValue(new Error('network failure'));
    mockedGetFirmwareVersion.mockRejectedValue(new Error('network failure'));

    const { result } = renderHook(() => useRobotTelemetry(), {
      wrapper: ({ children }) => React.createElement(React.Fragment, null, children),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.featureUnavailable).toBe(false);
    expect(result.current.errorMessage).toBe('Robot details are temporarily unavailable.');
  });
});
