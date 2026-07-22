import { firmwareUpdateConnector } from '../../../src/services/connectors/firmware-update.connector';
import { getFirmwareVersion, runFirmwareUpdate } from '../../../src/services/api/device.api';
import { BackendContractUnavailableError } from '../../../src/services/api/undocumented-api-routes';

jest.mock('../../../src/services/api/device.api', () => ({
  getFirmwareVersion: jest.fn(),
  runFirmwareUpdate: jest.fn(),
}));

const apiMocks = {
  getFirmwareVersion: getFirmwareVersion as jest.MockedFunction<typeof getFirmwareVersion>,
  runFirmwareUpdate: runFirmwareUpdate as jest.MockedFunction<typeof runFirmwareUpdate>,
};

describe('firmwareUpdateConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok with the real version when the backend contract exists', async () => {
    apiMocks.getFirmwareVersion.mockResolvedValue({
      current: '1.4.2',
      latest: '1.5.0',
      updateAvailable: true,
    });

    const result = await firmwareUpdateConnector.getVersion('device-1');

    expect(result).toEqual({
      state: 'ok',
      value: { current: '1.4.2', latest: '1.5.0', updateAvailable: true },
    });
    expect(apiMocks.getFirmwareVersion).toHaveBeenCalledWith('device-1');
  });

  it('maps a missing backend contract to unsupported_until_connector, not retryable', async () => {
    apiMocks.getFirmwareVersion.mockRejectedValue(
      new BackendContractUnavailableError('getFirmwareVersion:device-1'),
    );

    const result = await firmwareUpdateConnector.getVersion('device-1');

    expect(result).toEqual({ state: 'unsupported_until_connector', retryable: false });
  });

  it('rethrows unrecognized ordinary errors instead of coercing to server_unavailable', async () => {
    const ordinary = new Error('totally unexpected');
    apiMocks.getFirmwareVersion.mockRejectedValue(ordinary);

    await expect(firmwareUpdateConnector.getVersion('device-1')).rejects.toBe(ordinary);
  });

  it('rethrows auth errors instead of coercing to server_unavailable', async () => {
    const authError = Object.assign(new Error('Unauthorized'), {
      response: { status: 401, data: { message: 'Unauthorized' } },
    });
    apiMocks.getFirmwareVersion.mockRejectedValue(authError);

    await expect(firmwareUpdateConnector.getVersion('device-1')).rejects.toBe(authError);
  });

  it('maps transport failures on updateNow to server_unavailable, retryable', async () => {
    apiMocks.runFirmwareUpdate.mockRejectedValue(new Error('Network Error'));

    const result = await firmwareUpdateConnector.updateNow('device-1');

    expect(result).toEqual({ state: 'server_unavailable', retryable: true });
    expect(apiMocks.runFirmwareUpdate).toHaveBeenCalledWith('device-1');
  });

  it('returns ok(null) when updateNow succeeds against a real contract', async () => {
    apiMocks.runFirmwareUpdate.mockResolvedValue(undefined);

    const result = await firmwareUpdateConnector.updateNow('device-1');

    expect(result).toEqual({ state: 'ok', value: null });
  });

  it('keeps scheduleUpdate honestly blocked without calling the immediate-update API', async () => {
    const result = await firmwareUpdateConnector.scheduleUpdate('device-1');

    expect(result).toEqual({ state: 'unsupported_until_connector', retryable: false });
    expect(apiMocks.runFirmwareUpdate).not.toHaveBeenCalled();
    expect(apiMocks.getFirmwareVersion).not.toHaveBeenCalled();
  });
});
