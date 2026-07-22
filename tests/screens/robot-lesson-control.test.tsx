import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RobotLessonControlScreen } from '@/screens/robot-lesson/RobotLessonControlScreen';
import {
  startRobotLesson,
  stopRobotLesson,
  getRobotLessonStatus,
} from '@/services/connectors/lesson-delivery.connector';

const mockUseOptionalHousehold = jest.fn();
const mockStartPoll = jest.fn();
const mockStopPoll = jest.fn();

jest.mock('@/contexts/HouseholdContext', () => ({
  useOptionalHousehold: () => mockUseOptionalHousehold(),
}));

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/services/connectors/lesson-delivery.connector', () => ({
  startRobotLesson: jest.fn(),
  stopRobotLesson: jest.fn(),
  getRobotLessonStatus: jest.fn(),
}));

jest.mock('../../src/hooks/useRobotLessonStatusPoll', () => ({
  useRobotLessonStatusPoll: () => ({
    startPoll: mockStartPoll,
    stopPoll: mockStopPoll,
  }),
}));

const mockedStart = startRobotLesson as jest.MockedFunction<typeof startRobotLesson>;
const mockedStop = stopRobotLesson as jest.MockedFunction<typeof stopRobotLesson>;
const mockedStatus = getRobotLessonStatus as jest.MockedFunction<typeof getRobotLessonStatus>;

function renderScreen(params: Record<string, unknown> = {}) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() } as never;
  const route = { key: 'robot-lesson-test', name: 'RobotLessonControlScreen', params } as never;
  return render(<RobotLessonControlScreen navigation={navigation} route={route} />);
}

function householdChild(id = 'child-7') {
  return {
    activeChild: { id, name: 'Minh', birth_year: 2020 },
  };
}

describe('RobotLessonControlScreen honesty gates', () => {
  const originalDemoFlag = process.env.EXPO_PUBLIC_INVESTOR_DEMO;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalHousehold.mockReturnValue(undefined);
    process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'false';
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_INVESTOR_DEMO = originalDemoFlag;
  });

  it('renders not_connected when no deviceId and no household child exist', () => {
    const screen = renderScreen({});

    expect(screen.getByTestId('connector-state-not_connected')).toBeTruthy();
    expect(screen.queryByText(/dev-123/)).toBeNull();
    expect(screen.queryByText(/demo-child/)).toBeNull();
  });

  it('still renders not_connected with a device param but no child in context', () => {
    const screen = renderScreen({ deviceId: 'device-9', lessonId: 'w01-d01' });

    expect(screen.getByTestId('connector-state-not_connected')).toBeTruthy();
  });

  it('renders the control form with real route/context ids and no fabricated fallbacks', () => {
    mockUseOptionalHousehold.mockReturnValue(householdChild());

    const screen = renderScreen({ deviceId: 'device-9', lessonId: 'w01-d01', sessionIndex: 3 });

    expect(screen.queryByTestId('connector-state-not_connected')).toBeNull();
    expect(screen.getByText('Device: device-9')).toBeTruthy();
    expect(screen.getByText('Lesson ID: w01-d01')).toBeTruthy();
    expect(screen.queryByText(/dev-123/)).toBeNull();
    expect(screen.queryByText(/demo-child/)).toBeNull();
  });

  it('release path with real ids does not force unsupported_until_connector', () => {
    mockUseOptionalHousehold.mockReturnValue(householdChild());

    const screen = renderScreen({ deviceId: 'device-9', lessonId: 'w01-d01' });

    expect(screen.queryByTestId('connector-state-unsupported_until_connector')).toBeNull();
    expect(screen.getByText('Start Lesson on Robot')).toBeTruthy();
  });

  it('shows the Simulated badge in investor-demo mode', () => {
    process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'true';
    mockUseOptionalHousehold.mockReturnValue({
      activeChild: { id: 'investor-demo-child', name: 'Minh', birth_year: 2020 },
    });

    const screen = renderScreen({});

    expect(screen.getByText('Simulated')).toBeTruthy();
    // Demo device id comes from the seed, not a fabricated literal.
    expect(screen.getByText('Device: investor-demo-robot')).toBeTruthy();
  });

  it('retry re-attempts the last failed start, not only clears link state', async () => {
    mockUseOptionalHousehold.mockReturnValue(householdChild());
    mockedStart
      .mockResolvedValueOnce({
        state: 'robot_offline',
        reason: 'robot asleep',
        retryable: false,
      })
      .mockResolvedValueOnce({
        state: 'ok',
        value: {
          sessionId: 'sess-1',
          deviceId: 'device-9',
          childId: 'child-7',
          lessonId: 'w01-d01',
          state: 'starting',
          startedAt: new Date().toISOString(),
        },
      });

    const screen = renderScreen({ deviceId: 'device-9', lessonId: 'w01-d01' });

    fireEvent.press(screen.getByText('Start Lesson on Robot'));

    await waitFor(() => {
      expect(screen.getByTestId('connector-state-robot_offline')).toBeTruthy();
    });
    expect(mockedStart).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Try again'));

    await waitFor(() => {
      expect(mockedStart).toHaveBeenCalledTimes(2);
    });
    expect(mockedStart).toHaveBeenLastCalledWith(
      expect.objectContaining({
        deviceId: 'device-9',
        childId: 'child-7',
        lessonId: 'w01-d01',
      }),
    );
    await waitFor(() => {
      expect(screen.queryByTestId('connector-state-robot_offline')).toBeNull();
    });
    expect(mockStartPoll).toHaveBeenCalledWith('sess-1');
  });

  it('retry re-attempts a failed stop', async () => {
    mockUseOptionalHousehold.mockReturnValue(householdChild());
    mockedStart.mockResolvedValue({
      state: 'ok',
      value: {
        sessionId: 'sess-2',
        deviceId: 'device-9',
        childId: 'child-7',
        lessonId: 'w01-d01',
        state: 'active',
        startedAt: new Date().toISOString(),
      },
    });
    mockedStop
      .mockResolvedValueOnce({
        state: 'server_unavailable',
        reason: 'Network Error',
        retryable: true,
      })
      .mockResolvedValueOnce({ state: 'ok', value: undefined as never });
    mockedStatus.mockResolvedValue({
      state: 'ok',
      value: {
        sessionId: 'sess-2',
        deviceId: 'device-9',
        childId: 'child-7',
        lessonId: 'w01-d01',
        state: 'completed',
        startedAt: new Date().toISOString(),
      },
    });

    const screen = renderScreen({ deviceId: 'device-9', lessonId: 'w01-d01' });

    fireEvent.press(screen.getByText('Start Lesson on Robot'));
    await waitFor(() => {
      expect(screen.getByText('Stop Lesson')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Stop Lesson'));
    await waitFor(() => {
      expect(screen.getByTestId('connector-state-server_unavailable')).toBeTruthy();
    });
    expect(mockedStop).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => {
      expect(mockedStop).toHaveBeenCalledTimes(2);
    });
    expect(mockedStop).toHaveBeenLastCalledWith('sess-2');
  });
});
