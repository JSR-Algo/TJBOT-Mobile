import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import NeedsSyncScreen from '@/features/course-library/screens/NeedsSyncScreen';
import UnlockConfirmModal from '@/features/course-library/UnlockConfirmModal';
import {
  getRobotSyncStatus,
  sendCourseToRobot,
  unlockCourse,
} from '@/services/api/course-library.api';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';

jest.mock('@/services/api/course-library.api', () => ({
  unlockCourse: jest.fn(),
  sendCourseToRobot: jest.fn(),
  getRobotSyncStatus: jest.fn(),
}));

const mockedUnlockCourse = unlockCourse as jest.MockedFunction<typeof unlockCourse>;
const mockedSendCourseToRobot = sendCourseToRobot as jest.MockedFunction<typeof sendCourseToRobot>;
const mockedGetRobotSyncStatus = getRobotSyncStatus as jest.MockedFunction<typeof getRobotSyncStatus>;

function navigationFor() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

describe('course-library flow guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the course that was just added from route params', () => {
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'added', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_animals' } } as never}
      />,
    );

    expect(screen.getByText(/My Animal Friends/)).toBeTruthy();
  });

  it('passes course id into the added screen after parent unlock succeeds', async () => {
    mockedUnlockCourse.mockResolvedValueOnce(undefined);
    const navigation = navigationFor();
    render(
      <UnlockConfirmModal
        navigation={navigation as never}
        route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    for (const digit of ['7', '3', '5', '1']) {
      fireEvent.press(screen.getByText(digit));
    }
    await act(async () => {
      fireEvent.press(screen.getByText('Confirm add'));
    });

    expect(mockedUnlockCourse).toHaveBeenCalledWith('c_food');
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.CourseAddedScreen, { courseId: 'c_food' });
  });

  it('starts the free add path from detail without billing plan selection', () => {
    const navigation = navigationFor();
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'detail', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    fireEvent.press(screen.getByText('Add to Robot'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, { courseId: 'c_food' });
    expect(screen.queryByText('Choose a plan')).toBeNull();
    expect(screen.queryByText('Confirm & continue')).toBeNull();
  });

  it('labels parent unlock keypad controls', () => {
    const navigation = navigationFor();
    render(
      <UnlockConfirmModal
        navigation={navigation as never}
        route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    expect(screen.getByLabelText('Enter digit 7').props.accessibilityRole).toBe('button');
    expect(screen.getByLabelText('Delete last digit').props.accessibilityRole).toBe('button');
  });

  it('does not show robot-ready success when send-to-robot mutation fails', async () => {
    mockedSendCourseToRobot.mockRejectedValueOnce(new Error('sync route unavailable'));
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedSendCourseToRobot).toHaveBeenCalledWith('c_food');
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
    expect(screen.getByText('Robot sync is unavailable. Try again when Robot is online.')).toBeTruthy();
  });

  it('checks sync status before leaving NeedsSync', async () => {
    mockedGetRobotSyncStatus.mockResolvedValueOnce({
      courseId: 'c_food',
      synced: false,
      lastSyncAt: null,
    });
    const navigation = navigationFor();
    render(
      <NeedsSyncScreen
        navigation={navigation as never}
        route={{ key: 'needs-sync', name: ROUTES.NeedsSyncScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() => {
      expect(mockedGetRobotSyncStatus).toHaveBeenCalledWith('c_food');
    });
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.CourseAddedScreen, expect.anything());
    expect(screen.getByText('Robot has not synced this course yet. Check Wi-Fi and try again.')).toBeTruthy();
  });
});
