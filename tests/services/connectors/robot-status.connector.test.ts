import { fetchRobotStatus } from '../../../src/services/connectors/robot-status.connector';
import { getDeviceStatus } from '../../../src/services/api/device.api';
import { isInvestorDemoEnabled } from '../../../src/config/investorDemo';
import { BackendContractUnavailableError } from '../../../src/services/api/undocumented-api-routes';
import type { DeviceStatus } from '../../../src/services/api/device.api';

jest.mock('../../../src/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
}));

jest.mock('../../../src/config/investorDemo', () => ({
  isInvestorDemoEnabled: jest.fn(),
}));

const mockedGetDeviceStatus = jest.mocked(getDeviceStatus);
const mockedIsInvestorDemoEnabled = jest.mocked(isInvestorDemoEnabled);

const REAL_DEVICE: DeviceStatus = {
  id: 'device-1',
  name: 'TJBot-0001',
  serialNumber: 'SN-0001',
  online: true,
  batteryPercent: 87,
  wifiSsid: 'Casa',
  wifiRssi: -52,
  charging: true,
  lastSeenAt: '2026-07-18T00:00:00.000Z',
};

describe('fetchRobotStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsInvestorDemoEnabled.mockReturnValue(false);
    mockedGetDeviceStatus.mockResolvedValue(REAL_DEVICE);
  });

  it('returns the real device status via primary without local pairing preflight', async () => {
    const result = await fetchRobotStatus();

    expect(result).toEqual({ state: 'ok', value: { device: REAL_DEVICE, simulated: false } });
    expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary', undefined);
  });

  it('still calls the network when local pairing is unknown and maps empty device to not_connected', async () => {
    mockedGetDeviceStatus.mockResolvedValue({ ...REAL_DEVICE, id: '' });

    const result = await fetchRobotStatus();

    expect(result.state).toBe('not_connected');
    expect(result.state !== 'ok' && result.retryable).toBe(true);
    expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary', undefined);
  });

  it('maps 404/DEVICE_NOT_FOUND to not_connected', async () => {
    const notFound = Object.assign(new Error('Device not found'), {
      response: { status: 404, data: { message: 'Device not found' } },
    });
    mockedGetDeviceStatus.mockRejectedValue(notFound);

    const result = await fetchRobotStatus();

    expect(result.state).toBe('not_connected');
    expect(result.state !== 'ok' && result.retryable).toBe(true);
  });

  it('returns the seeded device flagged simulated in investor demo mode', async () => {
    mockedIsInvestorDemoEnabled.mockReturnValue(true);

    const result = await fetchRobotStatus();

    expect(result).toEqual({ state: 'ok', value: { device: REAL_DEVICE, simulated: true } });
    expect(mockedGetDeviceStatus).toHaveBeenCalledTimes(1);
  });

  it('maps backend-contract gaps to unsupported_until_connector (not retryable)', async () => {
    mockedGetDeviceStatus.mockRejectedValue(new BackendContractUnavailableError('getDeviceStatus'));

    const result = await fetchRobotStatus();

    expect(result.state).toBe('unsupported_until_connector');
    expect(result.state !== 'ok' && result.retryable).toBe(false);
  });

  it('maps transport failures to server_unavailable (retryable)', async () => {
    mockedGetDeviceStatus.mockRejectedValue(new Error('Network Error'));

    const result = await fetchRobotStatus();

    expect(result.state).toBe('server_unavailable');
    expect(result.state !== 'ok' && result.retryable).toBe(true);
  });

  it('rethrows auth errors instead of coercing to server_unavailable', async () => {
    const authError = Object.assign(new Error('Unauthorized'), {
      response: { status: 401, data: { message: 'Unauthorized' } },
    });
    mockedGetDeviceStatus.mockRejectedValue(authError);

    await expect(fetchRobotStatus()).rejects.toBe(authError);
  });

  it('rethrows ordinary errors when mapErrorToLinkState returns null', async () => {
    const ordinary = new Error('unexpected validation failure');
    mockedGetDeviceStatus.mockRejectedValue(ordinary);

    await expect(fetchRobotStatus()).rejects.toBe(ordinary);
  });
});
