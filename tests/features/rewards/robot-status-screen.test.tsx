import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RobotStatusScreen from '@/features/robot-mgmt/screens/RobotStatusScreen';
import { setAppLanguage } from '@/services/i18n/i18n';

const mockDevice = jest.fn();
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeChild: { id: 'child-1' } }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({ useActiveChildRobotQuery: () => mockDevice() }));

describe('RobotStatusScreen authoritative state', () => {
  beforeEach(() => { jest.clearAllMocks(); mockDevice.mockReturnValue({ data: { id: 'r1', name: 'Tee', serialNumber: 'TBOT-1', online: true }, isLoading: false, isError: false, refetch: jest.fn() }); });
  afterEach(async () => { await act(async () => { await setAppLanguage('en'); }); });

  it('renders only real device identity and operational state', () => {
    render(<RobotStatusScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 's', name: 'RobotStatusScreen' } as never} />);
    expect(screen.getByText('Tee')).toBeTruthy();
    expect(screen.getByText('TBOT-1')).toBeTruthy();
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.queryByText(/78%|Casa-Familia|3 installed|Working|v1\.4\.2|28°C|3 days|Everything is working|just now/)).toBeNull();
  });

  it('shows translated loading, error/retry, and unavailable states', () => {
    mockDevice.mockReturnValueOnce({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() });
    const loading = render(<RobotStatusScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'a', name: 'RobotStatusScreen' } as never} />);
    expect(loading.getByText('Loading robot status')).toBeTruthy();
    loading.unmount();
    const refetch = jest.fn();
    mockDevice.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true, refetch });
    const error = render(<RobotStatusScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'b', name: 'RobotStatusScreen' } as never} />);
    fireEvent.press(error.getByLabelText('Retry robot status'));
    expect(refetch).toHaveBeenCalled();
    error.unmount();
    mockDevice.mockReturnValueOnce({ data: { id: '', name: '', online: false }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<RobotStatusScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'c', name: 'RobotStatusScreen' } as never} />);
    expect(screen.getByText('Robot status unavailable')).toBeTruthy();
  });

  it('does not turn an unknown operational state into offline', () => {
    mockDevice.mockReturnValueOnce({ data: { id: 'r1', name: 'Tee', online: null }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<RobotStatusScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'u', name: 'RobotStatusScreen' } as never} />);
    expect(screen.getByText('Status unavailable')).toBeTruthy();
    expect(screen.queryByText('Offline')).toBeNull();
  });

  it('localizes an authoritative offline state in Vietnamese', async () => {
    await act(async () => { await setAppLanguage('vi'); });
    mockDevice.mockReturnValueOnce({ data: { id: 'r1', name: 'Tee', online: false }, isLoading: false, isError: false, refetch: jest.fn() });
    render(<RobotStatusScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'v', name: 'RobotStatusScreen' } as never} />);
    expect(screen.getByText('Ngoại tuyến')).toBeTruthy();
    expect(screen.getByLabelText(/Ngoại tuyến/)).toBeTruthy();
  });
});
