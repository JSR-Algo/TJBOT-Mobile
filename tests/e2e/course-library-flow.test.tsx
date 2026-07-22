import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROUTES } from '@/navigation/routes';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import NeedsSyncScreen from '@/features/course-library/screens/NeedsSyncScreen';
import UnlockConfirmModal from '@/features/course-library/UnlockConfirmModal';
import {
  createAssignment,
  getCourseLessons,
  getCourses,
  getCurrentAssignment,
  getRobotSyncStatus,
  enrollCourse,
  unlockCourse,
} from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { authenticateParent } from '@/services/api/parent.api';
import { setAppLanguage } from '@/services/i18n/i18n';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';

// Keep the pure helpers (e.g. isLessonProfile / presentAssignmentState) real —
// mock ONLY the network reads/writes the flow exercises.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    unlockCourse: jest.fn(),
    sendCourseToRobot: jest.fn(),
    getRobotSyncStatus: jest.fn(),
    // US-006 S11: SendToRobotScreen now assigns via the device-scoped lesson API.
    createAssignment: jest.fn(),
    getCurrentAssignment: jest.fn(),
    // P4: SendToRobotScreen + CourseDetail/CourseAdded read the published catalog.
    getCourses: jest.fn(),
    getCourseLessons: jest.fn(),
    enrollCourse: jest.fn(),
  };
});

jest.mock('@/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
}));

jest.mock('@/services/api/parent.api', () => ({
  authenticateParent: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useOptionalHousehold: jest.fn(() => ({ children: [{ id: 'ch-1' }], activeChild: { id: 'ch-1' } })),
}));

const mockedUnlockCourse = unlockCourse as jest.MockedFunction<typeof unlockCourse>;
const mockedEnrollCourse = enrollCourse as jest.MockedFunction<typeof enrollCourse>;
const mockedGetRobotSyncStatus = getRobotSyncStatus as jest.MockedFunction<typeof getRobotSyncStatus>;
const mockedCreateAssignment = createAssignment as jest.MockedFunction<typeof createAssignment>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockedAuthenticateParent = authenticateParent as jest.MockedFunction<typeof authenticateParent>;
const mockedGetCourses = getCourses as jest.MockedFunction<typeof getCourses>;
const mockedGetCourseLessons = getCourseLessons as jest.MockedFunction<typeof getCourseLessons>;

// P4: the published catalog SendToRobotScreen renders. The first lesson is the
// real seed lesson so the assignment carries its true {lessonId, lessonVersion,
// profile} — no hardcoded SEED_LESSON literal.
const SEED_COURSE = { courseId: 'c_barn', title: 'Barn Friends', lessonCount: 2 };
const SEED_LESSONS = [
  { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
  { lessonId: 'w01-d02-barn-colors', lessonVersion: 3, title: 'Barn Colors', profile: 'espTft', manifestReady: true },
];

function stubPublishedCatalog() {
  mockedGetCourses.mockResolvedValue([SEED_COURSE]);
  mockedGetCourseLessons.mockResolvedValue(SEED_LESSONS);
}

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

function renderWithQueryClient(element: React.ReactElement, queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      {element}
    </QueryClientProvider>,
  );
}

describe('course-library flow guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubPublishedCatalog();
    mockedAuthenticateParent.mockResolvedValue({ authenticated: true });
    // CourseAddedScreen reads the device's real seat on mount; default to "no
    // seat known" unless a test overrides it.
    mockedGetCurrentAssignment.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes a stable native route anchor for the send-to-robot screen', async () => {
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('sendToRobotScreen')).toBeTruthy());
  });

  it('renders the course that was just added from route params', () => {
    // No 'c_animals' in the published catalog → falls back to static metadata,
    // proving the dynamic overlay never crashes on a non-published courseId.
    mockedGetCourses.mockResolvedValue([]);
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'added', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_animals' } } as never}
      />,
    );

    expect(screen.getByText(/My Animal Friends/)).toBeTruthy();
  });

  it('passes course assignment metadata into the added screen after parent unlock succeeds', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedEnrollCourse.mockResolvedValueOnce({
      enrollment: { id: 'enr-1', courseId: 'c_food', childId: 'ch-1', deviceId: 'dev-1', status: 'ACTIVE', currentLessonKey: null },
      assignment: {
        id: 'asg-1', assignmentVersion: 1, deviceId: 'dev-1', childId: 'ch-1',
        lessonId: 'lesson-1', lessonTitle: '', lessonVersion: 1,
        manifestChecksum: 'sha256:lesson-1', profile: 'espTft', state: 'ASSIGNED',
      },
    });
    const navigation = navigationFor();
    render(
      <UnlockConfirmModal
        navigation={navigation as never}
        route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    expect(screen.queryByText('7 3 5 1')).toBeNull();
    expect(screen.queryByText('Type the number below')).toBeNull();

    for (const digit of ['2', '4', '6', '8']) {
      fireEvent.press(screen.getByText(digit));
    }
    await act(async () => {
      fireEvent.press(screen.getByText('Confirm add'));
    });

    expect(mockedAuthenticateParent).toHaveBeenCalledWith({ pin: '2468' });
    expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary', 'ch-1');
    expect(mockedEnrollCourse).toHaveBeenCalledWith('c_food', { childId: 'ch-1', deviceId: 'dev-1' });
    expect(mockedUnlockCourse).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.CourseAddedScreen, {
      courseId: 'c_food',
      deviceId: 'dev-1',
      assignmentId: 'asg-1',
      assignmentVersion: 1,
      manifestChecksum: 'sha256:lesson-1',
    });
  });

  it('blocks course enrollment when the parent PIN is wrong', async () => {
    mockedAuthenticateParent.mockResolvedValueOnce({ authenticated: false });
    const navigation = navigationFor();
    render(
      <UnlockConfirmModal
        navigation={navigation as never}
        route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    for (const digit of ['1', '1', '1', '1']) {
      fireEvent.press(screen.getByText(digit));
    }
    await act(async () => {
      fireEvent.press(screen.getByText('Confirm add'));
    });

    expect(mockedAuthenticateParent).toHaveBeenCalledWith({ pin: '1111' });
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
    expect(mockedEnrollCourse).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalledWith(ROUTES.CourseAddedScreen, expect.anything());
    expect(screen.getByText('Parent PIN was not accepted. Try again.')).toBeTruthy();
  });

  it('does not fall back to the demo course when unlock route has no courseId', async () => {
    const navigation = navigationFor();
    render(
      <UnlockConfirmModal
        navigation={navigation as never}
        route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: undefined } as never}
      />,
    );

    for (const digit of ['2', '4', '6', '8']) {
      fireEvent.press(screen.getByText(digit));
    }
    await act(async () => {
      fireEvent.press(screen.getByText('Confirm add'));
    });

    expect(mockedAuthenticateParent).not.toHaveBeenCalled();
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
    expect(mockedEnrollCourse).not.toHaveBeenCalledWith('c_food', expect.anything());
    expect(screen.getByText('Choose a course before unlocking it.')).toBeTruthy();
  });

  it('opens the already-created lesson assignment from the added screen without re-sending', async () => {
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{
          key: 'added',
          name: ROUTES.CourseAddedScreen,
          params: {
            courseId: 'c_food',
            deviceId: 'dev-1',
            assignmentId: 'asg-1',
            assignmentVersion: 1,
            manifestChecksum: 'sha256:lesson-1',
          },
        } as never}
      />,
    );

    fireEvent.press(screen.getByText("Open today's lesson"));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
      deviceId: 'dev-1',
      assignmentId: 'asg-1',
      assignmentVersion: 1,
      manifestChecksum: 'sha256:lesson-1',
    });
  });

  it('does not leave unlock flow when backend says the course lesson assets are not playable yet', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedEnrollCourse.mockRejectedValueOnce({ response: { status: 422, data: { error: { code: 'LESSON_NOT_PLAYABLE' } } } });
    const navigation = navigationFor();
    render(
      <UnlockConfirmModal
        navigation={navigation as never}
        route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    for (const digit of ['2', '4', '6', '8']) {
      fireEvent.press(screen.getByText(digit));
    }
    await act(async () => {
      fireEvent.press(screen.getByText('Confirm add'));
    });

    expect(mockedEnrollCourse).toHaveBeenCalledWith('c_food', { childId: 'ch-1', deviceId: 'dev-1' });
    expect(navigation.replace).not.toHaveBeenCalledWith(ROUTES.CourseAddedScreen, expect.anything());
    expect(screen.getByText('This course is still preparing on the server. Try again in a moment.')).toBeTruthy();
  });

  it('starts the free add path from detail without billing plan selection', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({
      id: 'dev-1',
      name: 'Casa Robot',
      online: true,
      batteryPercent: 80,
      charging: false,
    });
    const navigation = navigationFor();
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'detail', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Add to Robot'));
    });

    expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary', 'ch-1');
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, { courseId: 'c_food' });
    expect(screen.queryByText('Choose a plan')).toBeNull();
    expect(screen.queryByText('Confirm & continue')).toBeNull();
  });

  it('opens robot setup from the connection modal when the robot is offline', async () => {
    await setAppLanguage('vi');
    mockedGetDeviceStatus.mockResolvedValueOnce({
      id: 'dev-1',
      name: 'Casa Robot',
      online: false,
      batteryPercent: 80,
      charging: false,
    });
    const navigation = navigationFor();
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'detail', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Thêm vào Robot'));
    });

    expect(screen.getByText('Robot chưa sẵn sàng')).toBeTruthy();
    expect(screen.getByText('Kết nối Robot để gửi bài học và bắt đầu chơi cùng bé.')).toBeTruthy();
    expect(screen.getByText('Chỉ mất khoảng 3 phút.')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, expect.anything());

    fireEvent.press(screen.getByText('Kết nối Robot'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
    expect(screen.queryByText('Robot chưa sẵn sàng')).toBeNull();
  });

  it('stays on course detail and shows the connection modal when the robot status check fails', async () => {
    await setAppLanguage('vi');
    mockedGetDeviceStatus.mockRejectedValueOnce(new Error('status unavailable'));
    const navigation = navigationFor();
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'detail', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Thêm vào Robot'));
    });

    expect(screen.getByText('Robot chưa sẵn sàng')).toBeTruthy();
    expect(screen.getByText('Kết nối Robot để gửi bài học và bắt đầu chơi cùng bé.')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, expect.anything());
  });

  it('dismisses the robot connection modal and stays on course detail', async () => {
    await setAppLanguage('vi');
    mockedGetDeviceStatus.mockResolvedValueOnce({
      id: 'dev-1',
      name: 'Casa Robot',
      online: false,
      batteryPercent: 80,
      charging: false,
    });
    const navigation = navigationFor();
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'detail', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Thêm vào Robot'));
    });
    fireEvent.press(screen.getByText('Để sau'));

    expect(screen.queryByText('Robot chưa sẵn sàng')).toBeNull();
    expect(screen.getByText('Thêm vào Robot')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.PairAddScreen);
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, expect.anything());
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

  // US-006 S11 (M1): send-to-robot is re-keyed from courseId→deviceId and now
  // assigns the seed lesson via the device-scoped createAssignment (0010 /
  // DIV-MOBILE-DEVICEKEY). These replace the old sendCourseToRobot(courseId) test.
  // P4: the picker defaults to the first published lesson; createAssignment
  // carries that lesson's REAL {lessonId, lessonVersion (NUMBER), profile} — no
  // SEED_LESSON literal anywhere in the assign path.
  it('assigns the FIRST published lesson via createAssignment and threads assignment params forward', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-1', assignmentVersion: 1, deviceId: 'dev-1', childId: 'ch-1',
      lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, manifestChecksum: 'sha256:w01-d01', profile: 'espTft', state: 'PRELOADING', createdAt: null,
    });
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    // Wait for the published lessons to render (catalog fetch resolved).
    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedCreateAssignment).toHaveBeenCalledWith({
      deviceId: 'dev-1', childId: 'ch-1', lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, profile: 'espTft',
    });
    // lessonVersion is a NUMBER on the wire (D-LV).
    const sentParams = mockedCreateAssignment.mock.calls[0]![0];
    expect(typeof sentParams.lessonVersion).toBe('number');
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
      childId: 'ch-1', deviceId: 'dev-1', assignmentId: 'asg-1', assignmentVersion: 1, manifestChecksum: 'sha256:w01-d01',
    });
  });

  // P4: selecting a DIFFERENT lesson feeds its real lessonId + lessonVersion into
  // the assignment (drives the (deviceId, lessonId, childId) idempotency key).
  it('assigns the lesson the parent actually picks (real lessonId + lessonVersion)', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-2', assignmentVersion: 1, deviceId: 'dev-1', childId: 'ch-1',
      lessonId: 'w01-d02-barn-colors', lessonVersion: 3, manifestChecksum: 'sha256:w01-d02', profile: 'espTft', state: 'PRELOADING', createdAt: null,
    });
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Barn Colors')).toBeTruthy());
    fireEvent.press(screen.getByText('Barn Colors'));

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedCreateAssignment).toHaveBeenCalledWith({
      deviceId: 'dev-1', childId: 'ch-1', lessonId: 'w01-d02-barn-colors', lessonVersion: 3, profile: 'espTft',
    });
  });

  it('enrolls the whole selected course when parent switches to course mode', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedEnrollCourse.mockResolvedValueOnce({
      enrollment: { id: 'enr-1', courseId: 'c_barn', childId: 'ch-1', deviceId: 'dev-1', status: 'ACTIVE', currentLessonKey: 'w01-d01' },
      assignment: {
        id: 'asg-course-1', assignmentVersion: 1, deviceId: 'dev-1', childId: 'ch-1',
        lessonId: 'w01-d01-barn-say-it', lessonTitle: 'This Is a Barn', lessonVersion: 1,
        manifestChecksum: 'sha256:w01-d01', profile: 'espTft', state: 'PRELOADING',
      },
    });
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Send whole course'));

    await act(async () => {
      fireEvent.press(screen.getByText('Assign course'));
    });

    expect(mockedEnrollCourse).toHaveBeenCalledWith('c_barn', { childId: 'ch-1', deviceId: 'dev-1' });
    expect(mockedCreateAssignment).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
      childId: 'ch-1', deviceId: 'dev-1', assignmentId: 'asg-course-1', assignmentVersion: 1, manifestChecksum: 'sha256:w01-d01',
    });
  });

  it('gates whole-course assignment when any published lesson is still preparing', async () => {
    mockedGetCourseLessons.mockResolvedValueOnce([
      { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
      { lessonId: 'w01-d02-barn-colors', lessonVersion: 3, title: 'Barn Colors', profile: 'espTft', manifestReady: false },
    ]);
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Send whole course'));

    await act(async () => {
      fireEvent.press(screen.getByText('Assign course'));
    });

    expect(mockedEnrollCourse).not.toHaveBeenCalled();
    expect(mockedCreateAssignment).not.toHaveBeenCalled();
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
    expect(screen.getByText('This course is still preparing on the server. Try again in a moment.')).toBeTruthy();
  });

  it('does not navigate to robot-ready when the assignment fails, and shows the lesson error copy', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 504, data: { error: { code: 'ROBOT_OFFLINE' } } } });
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedCreateAssignment).toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
    expect(screen.getByText("Couldn't reach Casa Robot. Check it's on and connected.")).toBeTruthy();
  });

  it('on ASSIGNMENT_CONFLICT refetches the current assignment and proceeds from the fresh version (never blind-retry)', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
    mockedGetCurrentAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-existing', assignmentVersion: 4, lessonId: 'w01-d01-barn-say-it',
      sessionId: null, lessonTitle: 'This Is a Barn', lessonVersion: 1, manifestChecksum: 'sha256:w01-d01', state: 'PRELOADING', childId: 'ch-1', profile: 'espTft',
    });
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1');
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
      childId: 'ch-1', deviceId: 'dev-1', assignmentId: 'asg-existing', assignmentVersion: 4, manifestChecksum: 'sha256:w01-d01',
    });
  });

  it('invalidates child progress before opening the recovered assignment after assignment conflict', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
    mockedGetCurrentAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-existing', assignmentVersion: 4, lessonId: 'w01-d01-barn-say-it',
      sessionId: null, lessonTitle: 'This Is a Barn', lessonVersion: 1, manifestChecksum: 'sha256:w01-d01', state: 'PRELOADING', childId: 'ch-1', profile: 'espTft',
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const navigation = navigationFor();
    renderWithQueryClient(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
      queryClient,
    );

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lesson-progress', 'child', 'ch-1'] });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
      childId: 'ch-1', deviceId: 'dev-1', assignmentId: 'asg-existing', assignmentVersion: 4, manifestChecksum: 'sha256:w01-d01',
    });
  });

  // P4: empty published catalog → no lesson to send, send is gated, the assign
  // path never fires (no fallback to a hardcoded seed lesson).
  it('gates send when no lessons are published (no SEED_LESSON fallback)', async () => {
    mockedGetCourses.mockResolvedValue([]);
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText(/No published courses yet/)).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedCreateAssignment).not.toHaveBeenCalled();
  });

  // Current production renderer is espTft-only. Even if stale/malformed catalog
  // data marks a reserved piTft profile ready, the mobile app must not consume the
  // robot's active assignment slot with a lesson the firmware cannot render.
  it('gates send for a piTft lesson even when stale catalog data marks it ready', async () => {
    mockedGetCourses.mockResolvedValue([{ courseId: 'c_pi', title: 'Pi Course', lessonCount: 1 }]);
    mockedGetCourseLessons.mockResolvedValue([
      { lessonId: 'pi-d01', lessonVersion: 2, title: 'Pi Lesson', profile: 'piTft', manifestReady: true },
    ]);
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Pi Lesson')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
    expect(mockedCreateAssignment).not.toHaveBeenCalled();
    expect(screen.getByText('This lesson is still preparing on the server. Try again in a moment.')).toBeTruthy();
  });

  // MOB-3: an unrecognized profile is not sendable — the assign path must not
  // fire (rather than silently mis-sending as espTft).
  it('gates send for a lesson whose profile is not a recognized render profile', async () => {
    mockedGetCourses.mockResolvedValue([{ courseId: 'c_x', title: 'X Course', lessonCount: 1 }]);
    mockedGetCourseLessons.mockResolvedValue([
      { lessonId: 'x-d01', lessonVersion: 1, title: 'X Lesson', profile: 'bogus', manifestReady: true },
    ]);
    const navigation = navigationFor();
    render(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('X Lesson')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedCreateAssignment).not.toHaveBeenCalled();
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
