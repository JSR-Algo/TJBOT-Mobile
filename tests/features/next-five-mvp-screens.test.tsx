import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import LessonDetailScreen from '@/features/course/screens/LessonDetailScreen';
import PairAddScreen from '@/features/device/pairing/screens/PairAddScreen';
import DeviceHomeScreen from '@/features/device/screens/DeviceHomeScreen';
import DeviceOverviewScreen from '@/features/device/screens/DeviceOverviewScreen';
import { ROUTES } from '@/navigation/routes';
import {
  createAssignment,
  getCourseDetail,
  getCourseLessons,
  getCourses,
  getCurrentAssignment,
} from '@/services/api/course-library.api';
import { getDeviceStatus, unpairDevice } from '@/services/api/device.api';
import { fetchRobotStatus } from '@/services/connectors/robot-status.connector';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { getLocalPairedDeviceId } from '@/features/device/pairing/localPairedDevice';
import { setAppLanguage } from '@/services/i18n/i18n';

jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    createAssignment: jest.fn(),
    getCourseDetail: jest.fn(),
    getCourseLessons: jest.fn(),
    getCourses: jest.fn(),
    getCurrentAssignment: jest.fn(),
  };
});

jest.mock('@/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
  unpairDevice: jest.fn(),
}));

jest.mock('@/services/connectors/robot-status.connector', () => ({
  fetchRobotStatus: jest.fn(),
}));

jest.mock('@/features/device/pairing/localPairedDevice', () => ({
  clearLocalPairedDevice: jest.fn(),
  getLocalPairedDeviceId: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useOptionalHousehold: jest.fn(),
}));

const mocks = {
  createAssignment: createAssignment as jest.MockedFunction<typeof createAssignment>,
  fetchRobotStatus: fetchRobotStatus as jest.MockedFunction<typeof fetchRobotStatus>,
  getCourseDetail: getCourseDetail as jest.MockedFunction<typeof getCourseDetail>,
  getCourseLessons: getCourseLessons as jest.MockedFunction<typeof getCourseLessons>,
  getCourses: getCourses as jest.MockedFunction<typeof getCourses>,
  getCurrentAssignment: getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>,
  getDeviceStatus: getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>,
  getLocalPairedDeviceId: getLocalPairedDeviceId as jest.MockedFunction<typeof getLocalPairedDeviceId>,
  unpairDevice: unpairDevice as jest.MockedFunction<typeof unpairDevice>,
  useOptionalHousehold: useOptionalHousehold as jest.MockedFunction<typeof useOptionalHousehold>,
};

const COURSE = {
  courseId: 'c_barn',
  title: 'Barn Friends',
  description: 'Speak with friendly farm animals.',
  levelCount: 1,
  lessonCount: 2,
  previewUrl: null,
  difficulty: 'beginner',
  locked: false,
};

const LESSON = {
  lessonId: 'demo-barn-animals',
  lessonVersion: 1,
  lessonType: 'lesson' as const,
  title: 'Farm Sounds',
  profile: 'espTft',
  manifestReady: true,
  topicTags: ['animals', 'speaking'],
  difficultyBand: 'beginner',
  estimatedDurationSec: 480,
  monitorable: true,
};

function navigationFor() {
  return {
    addListener: jest.fn(() => jest.fn()),
    canGoBack: jest.fn(() => true),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    navigate: jest.fn(),
    removeListener: jest.fn(),
    replace: jest.fn(),
    setOptions: jest.fn(),
  };
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('next five MVP screen chain', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await setAppLanguage('en');
    mocks.getCourseDetail.mockResolvedValue(COURSE);
    mocks.getCourses.mockResolvedValue([{ courseId: COURSE.courseId, title: COURSE.title, lessonCount: 2 }]);
    mocks.getCourseLessons.mockResolvedValue([LESSON]);
    mocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'TeeBot',
      online: true,
      batteryPercent: 86,
      wifiSsid: 'Home Wi-Fi',
    });
    mocks.getLocalPairedDeviceId.mockResolvedValue('device-1');
    mocks.fetchRobotStatus.mockResolvedValue({
      state: 'ok',
      value: {
        device: {
          id: 'device-1',
          name: 'TeeBot',
          online: true,
          batteryPercent: 86,
          wifiSsid: 'Home Wi-Fi',
          serialNumber: 'TB-0001',
        },
        simulated: false,
      },
    });
    mocks.useOptionalHousehold.mockReturnValue({
      activeChild: { id: 'child-1', name: 'Mia' },
      children: [{ id: 'child-1', name: 'Mia' }],
    } as never);
  });

  it('connects Course Detail to the published Lesson Detail page', async () => {
    const navigation = navigationFor();
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'course', name: ROUTES.CourseDetailScreen, params: { courseId: COURSE.courseId } } as never}
      />,
    );

    await screen.findByText(COURSE.title);
    fireEvent.press(screen.getByTestId('openLessonDetails'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonDetailScreen, {
      courseId: COURSE.courseId,
    });
  });

  it('matches the blueprint Lesson Detail brief and continues to Send to Robot', async () => {
    const navigation = navigationFor();
    render(
      <LessonDetailScreen
        navigation={navigation as never}
        route={{
          key: 'lesson',
          name: ROUTES.LessonDetailScreen,
          params: { courseId: COURSE.courseId, lessonId: LESSON.lessonId },
        } as never}
      />,
    );

    await screen.findByText(LESSON.title);
    expect(screen.getByText('LESSON 3 · READY')).toBeTruthy();
    expect(screen.getAllByText('Lesson detail').length).toBeGreaterThan(0);
    expect(screen.getByText('Words, objective, duration and robot compatibility.')).toBeTruthy();
    expect(screen.getByTestId('lessonDetailBreadcrumb')).toBeTruthy();
    expect(screen.getByText('8 min')).toBeTruthy();
    expect(screen.getByText('Words and sounds')).toBeTruthy();
    for (const word of ['moo', 'quack', 'neigh', 'cow', 'duck', 'horse']) {
      expect(screen.getByText(word)).toBeTruthy();
    }
    for (const beat of ['Listen', 'Match', 'Say it', 'Play']) {
      expect(screen.getByText(beat)).toBeTruthy();
    }
    expect(screen.getByText('Robot compatibility confirmed')).toBeTruthy();

    fireEvent.press(screen.getByTestId('sendLessonToRobot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen, {
      courseId: COURSE.courseId,
    });
  });

  it('keeps Send to TeeBot disabled until the lesson package is ready', async () => {
    mocks.getCourseLessons.mockResolvedValueOnce([{ ...LESSON, manifestReady: false }]);
    const navigation = navigationFor();
    render(
      <LessonDetailScreen
        navigation={navigation as never}
        route={{
          key: 'lesson-preparing',
          name: ROUTES.LessonDetailScreen,
          params: { courseId: COURSE.courseId, lessonId: LESSON.lessonId },
        } as never}
      />,
    );

    await screen.findByText(LESSON.title);
    expect(screen.getByText('LESSON 3 · PREPARING')).toBeTruthy();
    expect(screen.getByText('Lesson is still preparing')).toBeTruthy();
    const sendButton = screen.getByTestId('sendLessonToRobot');
    expect(sendButton.props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(sendButton);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('renders the Lesson Detail blueprint in Vietnamese', async () => {
    await setAppLanguage('vi');
    render(
      <LessonDetailScreen
        navigation={navigationFor() as never}
        route={{
          key: 'lesson-vi',
          name: ROUTES.LessonDetailScreen,
          params: { courseId: COURSE.courseId, lessonId: LESSON.lessonId },
        } as never}
      />,
    );

    await screen.findByText('Âm thanh Nông trại');
    expect(screen.getAllByText('Chi tiết bài học').length).toBeGreaterThan(0);
    expect(screen.getByText('Đã xác nhận tương thích robot')).toBeTruthy();
    expect(screen.getByText('Gửi bài học đến TeeBot')).toBeTruthy();
  });

  it('shows a Send to Robot breadcrumb without weakening the existing assignment gate', async () => {
    const navigation = navigationFor();
    renderWithQuery(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: { courseId: COURSE.courseId } } as never}
      />,
    );

    await screen.findByText(LESSON.title);
    expect(screen.getByTestId('sendToRobotBreadcrumb')).toBeTruthy();
    expect(screen.getByText('Ready to send')).toBeTruthy();
    expect(screen.getByText('Robot readiness checked before sending')).toBeTruthy();
  });

  it('keeps the MVP Robot hub focused on detail, lessons, and pairing', async () => {
    const navigation = navigationFor();
    renderWithQuery(
      <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await screen.findByText('TeeBot');
    expect(screen.getByTestId('robotHubBreadcrumb')).toBeTruthy();
    for (const testID of [
      'robotHubBatteryIcon',
      'robotHubOpenDetailIcon',
      'robotHubChooseLessonIcon',
      'robotHubPairIcon',
      'robotHubUnpairIcon',
    ]) {
      expect(screen.getByTestId(testID)).toBeTruthy();
    }
    expect(screen.queryByTestId('robotHubFindIcon')).toBeNull();
    expect(screen.queryByTestId('robotHubFirmwareIcon')).toBeNull();
    fireEvent.press(screen.getByTestId('openRobotDetail'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceOverviewScreen, { deviceId: 'device-1' });
  });

  it('keeps the pairing entry reachable from both Robot hub and Robot Detail', async () => {
    const hubNavigation = navigationFor();
    const hub = renderWithQuery(
      <DeviceHomeScreen navigation={hubNavigation as never} route={{ params: undefined } as never} />,
    );

    await hub.findByText('TeeBot');
    fireEvent.press(hub.getByLabelText('Pair another Robot. Open the guided five-step setup'));
    expect(hubNavigation.navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
    hub.unmount();

    const navigation = navigationFor();
    const detail = render(
      <DeviceOverviewScreen
        navigation={navigation as never}
        route={{ key: 'robot', name: ROUTES.DeviceOverviewScreen, params: { deviceId: 'device-1' } } as never}
      />,
    );

    await detail.findByText('TeeBot');
    expect(detail.getByTestId('robotDetailBreadcrumb')).toBeTruthy();
    expect(detail.queryByLabelText('Back to Robot hub')).toBeNull();
    fireEvent.press(detail.getByTestId('openPairingSetup'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
  });

  it('keeps the pairing entry focused on its two real setup branches', () => {
    const navigation = navigationFor();
    render(
      <PairAddScreen
        navigation={navigation as never}
        route={{ key: 'pair', name: ROUTES.PairAddScreen, params: undefined } as never}
      />,
    );

    expect(screen.queryByText('Before you begin')).toBeNull();
    expect(screen.queryByTestId('pairingBreadcrumb')).toBeNull();

    fireEvent.press(screen.getByText('I have a new Robot'));
    fireEvent.press(screen.getByText('My Robot is offline'));
    expect(navigation.navigate.mock.calls).toEqual([
      [ROUTES.PairIntroScreen],
      [ROUTES.PairOfflineScreen],
    ]);
  });

  it('keeps the Lesson Detail failure state actionable', async () => {
    mocks.getCourseLessons.mockRejectedValueOnce(new Error('offline'));
    const navigation = navigationFor();
    render(
      <LessonDetailScreen
        navigation={navigation as never}
        route={{
          key: 'lesson-error',
          name: ROUTES.LessonDetailScreen,
          params: { courseId: COURSE.courseId },
        } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Lesson details unavailable')).toBeTruthy());
    fireEvent.press(screen.getByText('Back to course'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
