import {
  ROBOT_LINK_STATES,
  ROBOT_LINK_STATE_COPY,
  linkBlocked,
  mapErrorToLinkState,
  ok,
  resolvePreconditionState,
} from '../../../src/services/connectors/types';
import { BackendContractUnavailableError } from '../../../src/services/api/undocumented-api-routes';
import { FeatureDeviceManagementDisabledError } from '../../../src/config/feature-flags';

describe('robot link state vocabulary', () => {
  it('declares exactly the six governed states', () => {
    expect([...ROBOT_LINK_STATES]).toEqual([
      'not_connected',
      'simulated',
      'queued_for_robot',
      'robot_offline',
      'server_unavailable',
      'unsupported_until_connector',
    ]);
  });

  it('has paired copy for every state', () => {
    for (const state of ROBOT_LINK_STATES) {
      const copy = ROBOT_LINK_STATE_COPY[state];
      expect(copy.title.trim().length).toBeGreaterThan(0);
      expect(copy.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('ok/linkBlocked build the connector envelope', () => {
    expect(ok(42)).toEqual({ state: 'ok', value: 42 });
    expect(linkBlocked('robot_offline', 'ws down', true)).toEqual({
      state: 'robot_offline',
      reason: 'ws down',
      retryable: true,
    });
    expect(linkBlocked('not_connected')).toEqual({ state: 'not_connected' });
  });
});

describe('mapErrorToLinkState', () => {
  it('maps BACKEND_CONTRACT_UNAVAILABLE to unsupported_until_connector', () => {
    expect(mapErrorToLinkState(new BackendContractUnavailableError('getFirmwareVersion'))).toBe(
      'unsupported_until_connector',
    );
  });

  it('maps feature-flag disabled errors to unsupported_until_connector', () => {
    expect(mapErrorToLinkState(new FeatureDeviceManagementDisabledError('getRobotStatus'))).toBe(
      'unsupported_until_connector',
    );
  });

  it('maps transport failures to server_unavailable', () => {
    expect(mapErrorToLinkState(new Error('Network Error'))).toBe('server_unavailable');
    expect(mapErrorToLinkState({ response: { status: 503, data: { message: 'down' } } })).toBe(
      'server_unavailable',
    );
  });

  it('maps robot reachability codes to robot_offline', () => {
    expect(
      mapErrorToLinkState({ response: { status: 503, data: { error: { code: 'ROBOT_OFFLINE' } } } }),
    ).toBe('robot_offline');
    expect(
      mapErrorToLinkState({
        response: { status: 503, data: { error: { code: 'ROBOT_BRIDGE_UNAVAILABLE' } } },
      }),
    ).toBe('robot_offline');
  });

  it('maps ROBOT_BUSY to queued_for_robot', () => {
    expect(
      mapErrorToLinkState({ response: { status: 409, data: { error: { code: 'ROBOT_BUSY' } } } }),
    ).toBe('queued_for_robot');
  });

  it('returns null for non-link errors so screens keep normal error UX', () => {
    expect(mapErrorToLinkState(new Error('boom'))).toBeNull();
    expect(mapErrorToLinkState({ response: { status: 401, data: { message: 'nope' } } })).toBeNull();
  });
});

describe('resolvePreconditionState', () => {
  it('simulated wins over every other condition', () => {
    expect(resolvePreconditionState({ simulated: true, hasPairedDevice: false })).toBe('simulated');
    expect(resolvePreconditionState({ simulated: true, hasPairedDevice: true })).toBe('simulated');
  });

  it('missing paired device means not_connected', () => {
    expect(resolvePreconditionState({ hasPairedDevice: false })).toBe('not_connected');
  });

  it('a paired device with no demo flag is clear to proceed', () => {
    expect(resolvePreconditionState({ hasPairedDevice: true })).toBeNull();
    expect(resolvePreconditionState({ hasPairedDevice: null })).toBeNull();
  });
});
