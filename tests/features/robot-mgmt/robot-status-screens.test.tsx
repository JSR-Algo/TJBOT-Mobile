import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ConnectorStateNotice from '../../../src/components/ConnectorStateNotice';
import MyRobotScreen from '../../../src/features/robot-mgmt/screens/MyRobotScreen';
import RobotStatusScreen from '../../../src/features/robot-mgmt/screens/RobotStatusScreen';
import RobotStorageScreen from '../../../src/features/robot-mgmt/screens/RobotStorageScreen';
import RobotSoundScreen from '../../../src/features/robot-mgmt/screens/RobotSoundScreen';
import SpeakerTestScreen from '../../../src/features/robot-mgmt/screens/SpeakerTestScreen';
import {
  ROBOT_LINK_STATES,
  ROBOT_LINK_STATE_COPY,
  type RobotLinkState,
} from '../../../src/services/connectors/types';
import {
  normalizeRobotTelemetry,
  useRobotTelemetry,
  type RobotTelemetryState,
} from '../../../src/features/robot-mgmt/telemetry';
import type { DeviceStatus } from '../../../src/services/api/device.api';
import { ROUTES } from '../../../src/navigation/routes';

jest.mock('../../../src/features/robot-mgmt/telemetry', () => ({
  ...jest.requireActual('../../../src/features/robot-mgmt/telemetry'),
  useRobotTelemetry: jest.fn(),
}));

const mockedUseRobotTelemetry = jest.mocked(useRobotTelemetry);

const navigate = jest.fn();
const navigation = { navigate } as never;
const emptyRoute = { key: 'robot-mgmt-test', name: 'RobotStatusScreen', params: undefined } as never;

const REAL_DEVICE: DeviceStatus = {
  id: 'device-1',
  name: 'TJBot-0001',
  serialNumber: 'SN-0001',
  online: true,
  batteryPercent: 87,
  wifiSsid: 'Casa',
  wifiRssi: -52,
  charging: true,
  lastSeenAt: new Date().toISOString(),
};

function hookState(overrides: Partial<RobotTelemetryState> = {}): RobotTelemetryState {
  return {
    telemetry: normalizeRobotTelemetry(REAL_DEVICE),
    loading: false,
    errorMessage: null,
    failureReason: null,
    featureUnavailable: false,
    linkState: null,
    simulated: false,
    retry: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseRobotTelemetry.mockReturnValue(hookState());
});

describe('ConnectorStateNotice', () => {
  it.each(ROBOT_LINK_STATES)('renders the canonical copy for %s', (state: RobotLinkState) => {
    const screen = render(<ConnectorStateNotice state={state} />);

    expect(screen.getByText(ROBOT_LINK_STATE_COPY[state].title)).toBeTruthy();
    expect(screen.getByText(ROBOT_LINK_STATE_COPY[state].body)).toBeTruthy();
    expect(screen.queryByText('Try again')).toBeNull();
    screen.unmount();
  });

  it('invokes onRetry from the Try again button', () => {
    const onRetry = jest.fn();
    const screen = render(<ConnectorStateNotice state="server_unavailable" onRetry={onRetry} />);

    fireEvent.press(screen.getByText('Try again'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    screen.unmount();
  });
});

describe('RobotStatusScreen', () => {
  it('renders real connector values and never the old fabricated rows', () => {
    const screen = render(<RobotStatusScreen navigation={navigation} route={emptyRoute} />);

    expect(screen.getByText('● Online')).toBeTruthy();
    expect(screen.getByText('87% · charging')).toBeTruthy();
    expect(screen.getByText('Casa · Strong signal')).toBeTruthy();
    expect(screen.queryByText(/Casa-Familia/)).toBeNull();
    expect(screen.queryByText(/Everything is working/)).toBeNull();
    screen.unmount();
  });

  it('renders the blocked state as a notice whose Try again re-runs the connector', () => {
    const retry = jest.fn();
    mockedUseRobotTelemetry.mockReturnValue(
      hookState({
        telemetry: normalizeRobotTelemetry(undefined),
        linkState: 'server_unavailable',
        errorMessage: 'Robot details are temporarily unavailable.',
        retry,
      }),
    );

    const screen = render(<RobotStatusScreen navigation={navigation} route={emptyRoute} />);

    expect(screen.getByText(ROBOT_LINK_STATE_COPY.server_unavailable.title)).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
    screen.unmount();
  });

  it('badges investor-demo data as simulated', () => {
    mockedUseRobotTelemetry.mockReturnValue(hookState({ simulated: true }));

    const screen = render(<RobotStatusScreen navigation={navigation} route={emptyRoute} />);

    expect(screen.getByText(ROBOT_LINK_STATE_COPY.simulated.title)).toBeTruthy();
    expect(screen.getByText('87% · charging')).toBeTruthy();
    screen.unmount();
  });
});

describe('MyRobotScreen', () => {
  it('shows the real robot name instead of the fabricated one', () => {
    const screen = render(<MyRobotScreen navigation={navigation} route={emptyRoute} />);

    expect(screen.getAllByText('TJBot-0001').length).toBeGreaterThan(0);
    expect(screen.getByText('SN-0001')).toBeTruthy();
    expect(screen.queryByText(/Buddy Panda/)).toBeNull();
    screen.unmount();
  });

  it('renders the not_connected notice when no robot is paired', () => {
    mockedUseRobotTelemetry.mockReturnValue(
      hookState({
        telemetry: normalizeRobotTelemetry(undefined),
        linkState: 'not_connected',
      }),
    );

    const screen = render(<MyRobotScreen navigation={navigation} route={emptyRoute} />);

    expect(screen.getByText(ROBOT_LINK_STATE_COPY.not_connected.title)).toBeTruthy();
    // Shell owns the single title; no second content "My Robot" heading.
    expect(screen.getAllByText('My Robot').length).toBe(1);
    // Permanent no-device → pair/connect, not Try again.
    expect(screen.queryByText('Try again')).toBeNull();
    fireEvent.press(screen.getByText('Connect Robot'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
    screen.unmount();
  });
});

describe('RobotStorageScreen', () => {
  it('reports storage as unsupported instead of a fabricated gauge', () => {
    const screen = render(<RobotStorageScreen navigation={navigation} route={emptyRoute} />);

    expect(screen.getByText(ROBOT_LINK_STATE_COPY.unsupported_until_connector.title)).toBeTruthy();
    expect(screen.queryByText(/1\.21 GB/)).toBeNull();
    screen.unmount();
  });
});

describe('RobotSoundScreen', () => {
  it('reports sound controls as unsupported instead of fake toggles', async () => {
    const screen = render(<RobotSoundScreen navigation={navigation} route={emptyRoute} />);

    expect(
      await screen.findByText(ROBOT_LINK_STATE_COPY.unsupported_until_connector.title),
    ).toBeTruthy();
    expect(screen.queryByText(/Quiet hours/)).toBeNull();
    screen.unmount();
  });
});

describe('SpeakerTestScreen', () => {
  it('replaces fake playback with the unsupported_until_connector notice', async () => {
    const screen = render(<SpeakerTestScreen navigation={navigation} route={emptyRoute} />);

    expect(
      await screen.findByText(ROBOT_LINK_STATE_COPY.unsupported_until_connector.title),
    ).toBeTruthy();
    expect(screen.queryByText(/I can hear Robot/)).toBeNull();
    screen.unmount();
  });
});
