import {
  factoryReset,
  runMicTest,
  runSpeakerTest,
  setControls,
  unpairRobot,
} from '../../../src/services/connectors/robot-control.connector';
import { unpairDevice } from '../../../src/services/api/device.api';
import { BackendContractUnavailableError } from '../../../src/services/api/undocumented-api-routes';

jest.mock('../../../src/services/api/device.api', () => ({
  unpairDevice: jest.fn(),
}));

const mockedUnpairDevice = jest.mocked(unpairDevice);

describe('RobotControlConnector hardware actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUnpairDevice.mockResolvedValue(undefined);
  });

  it('runSpeakerTest is honestly unsupported until a control bridge ships', async () => {
    const result = await runSpeakerTest();

    expect(result.state).toBe('unsupported_until_connector');
    expect(result.state !== 'ok' && result.retryable).toBe(false);
  });

  it('runMicTest is honestly unsupported until a control bridge ships', async () => {
    const result = await runMicTest();

    expect(result.state).toBe('unsupported_until_connector');
    expect(result.state !== 'ok' && result.retryable).toBe(false);
  });

  it('setControls is honestly unsupported until a control bridge ships', async () => {
    const result = await setControls({ volume: 6, quietHours: true });

    expect(result.state).toBe('unsupported_until_connector');
    expect(result.state !== 'ok' && result.retryable).toBe(false);
  });
});

describe('RobotControlConnector factoryReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUnpairDevice.mockResolvedValue(undefined);
  });

  it('is honestly unsupported and does not call unpairDevice', async () => {
    const result = await factoryReset('device-1');

    expect(result.state).toBe('unsupported_until_connector');
    expect(result.state !== 'ok' && result.retryable).toBe(false);
    expect(mockedUnpairDevice).not.toHaveBeenCalled();
  });
});

describe('RobotControlConnector unpairRobot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUnpairDevice.mockResolvedValue(undefined);
  });

  it('delegates to the real device.api unpair call', async () => {
    const result = await unpairRobot('device-1');

    expect(result).toEqual({ state: 'ok', value: null });
    expect(mockedUnpairDevice).toHaveBeenCalledWith('device-1');
  });

  it('accepts optional requestId without forwarding it to the API', async () => {
    await unpairRobot('device-1', 'req-42');
    expect(mockedUnpairDevice).toHaveBeenCalledWith('device-1');
  });

  it('maps contract gaps to unsupported_until_connector', async () => {
    mockedUnpairDevice.mockRejectedValue(new BackendContractUnavailableError('unpairDevice'));

    const result = await unpairRobot('device-1');

    expect(result.state).toBe('unsupported_until_connector');
    expect(result.state !== 'ok' && result.retryable).toBe(false);
  });

  it('maps transport failures to server_unavailable (retryable)', async () => {
    mockedUnpairDevice.mockRejectedValue(new Error('Network Error'));

    const result = await unpairRobot('device-1');

    expect(result.state).toBe('server_unavailable');
    expect(result.state !== 'ok' && result.retryable).toBe(true);
  });

  it('rethrows auth errors instead of coercing to server_unavailable', async () => {
    const authError = Object.assign(new Error('Unauthorized'), {
      response: { status: 401, data: { message: 'Unauthorized' } },
    });
    mockedUnpairDevice.mockRejectedValue(authError);

    await expect(unpairRobot('device-1')).rejects.toBe(authError);
  });

  it('rethrows ordinary validation-style errors instead of coercing', async () => {
    const ordinary = new Error('device id required');
    mockedUnpairDevice.mockRejectedValue(ordinary);

    await expect(unpairRobot('device-1')).rejects.toBe(ordinary);
  });
});
