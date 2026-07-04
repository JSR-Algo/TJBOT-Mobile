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
} from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';

// Keep the pure helpers (e.g. isLessonProfile / presentAssignmentState) real —
// mock ONLY the network reads/writes the flow exercises.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    unlockCourse: jest.fn(),
    enrollCourse: jest.fn(),
    sendCourseToRobot: jest.fn(),
    getRobotSyncStatus: jest.fn(),
    // US-006 S11: SendToRobotScreen now assigns via the device-scoped lesson API.
    createAssignment: jest.fn(),
    getCurrentAssignment: jest.fn(),
    // P4: SendToRobotScreen + CourseDetail/CourseAdded read the published catalog.
    getCourses: jest.fn(),
    getCourseLessons: jest.fn(),
  };
});

jest.mock('@/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useOptionalHousehold: jest.fn(() => ({ children: [{ id: 'ch-1' }], activeChild: { id: 'ch-1' } })),
}));

const mockedEnrollCourse = enrollCourse as jest.MockedFunction<typeof enrollCourse>;
const mockedGetRobotSyncStatus = getRobotSyncStatus as jest.MockedFunction<typeof getRobotSyncStatus>;
const mockedCreateAssignment = createAssignment as jest.MockedFunction<typeof createAssignment>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
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

describe('course-library flow guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubPublishedCatalog();
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'dev-1',
      name: 'Casa Robot',
      online: true,
      batteryPercent: 80,
      charging: false,
    });
    mockedEnrollCourse.mockResolvedValue({ enrollment: { id: 'enroll-1' }, assignment: { id: 'assign-1' } } as never);
  });

  it('renders the course that was just added from route params', () => {
    // No 'c_animals' in the published catalog → falls back to static metadata,
    // proving the dynamic overlay never crashes on a non-published courseId.
    mockedGetCourses.mockResolvedValue([]);
    const navigation = navigationFor();
    renderWithProviders(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'added', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_animals' } } as never}
      />,
    );

    expect(screen.getByText(/My Animal Friends/)).toBeTruthy();
  });

  it('passes course id into the added screen after parent unlock succeeds', async () => {
    const navigation = navigationFor();
    renderWithProviders(
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

    await waitFor(() => expect(mockedEnrollCourse).toHaveBeenCalledWith('c_food', { childId: 'ch-1', deviceId: 'dev-1' }));
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.CourseAddedScreen, { courseId: 'c_food', assignmentId: 'assign-1' });
  });

  it('starts the free add path from detail without billing plan selection', () => {
    const navigation = navigationFor();
    renderWithProviders(
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
    renderWithProviders(
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
      lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, profile: 'espTft', state: 'PRELOADING', createdAt: null,
    });
    const navigation = navigationFor();
    renderWithProviders(
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
      deviceId: 'dev-1', assignmentId: 'asg-1', assignmentVersion: 1,
    });
  });

  // P4: selecting a DIFFERENT lesson feeds its real lessonId + lessonVersion into
  // the assignment (drives the (deviceId, lessonId, childId) idempotency key).
  it('assigns the lesson the parent actually picks (real lessonId + lessonVersion)', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-2', assignmentVersion: 1, deviceId: 'dev-1', childId: 'ch-1',
      lessonId: 'w01-d02-barn-colors', lessonVersion: 3, profile: 'espTft', state: 'PRELOADING', createdAt: null,
    });
    const navigation = navigationFor();
    renderWithProviders(
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

  it('does not navigate to robot-ready when the assignment fails, and shows the lesson error copy', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 504, data: { error: { code: 'ROBOT_OFFLINE' } } } });
    const navigation = navigationFor();
    renderWithProviders(
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
      lessonTitle: 'This Is a Barn', lessonVersion: 1, state: 'PRELOADING', childId: 'ch-1', profile: 'espTft',
    });
    const navigation = navigationFor();
    renderWithProviders(
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
      deviceId: 'dev-1', assignmentId: 'asg-existing', assignmentVersion: 4,
    });
  });

  // P4: empty published catalog → no lesson to send, send is gated, the assign
  // path never fires (no fallback to a hardcoded seed lesson).
  it('gates send when no lessons are published (no SEED_LESSON fallback)', async () => {
    mockedGetCourses.mockResolvedValue([]);
    const navigation = navigationFor();
    renderWithProviders(
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

  // MOB-3: a non-espTft published lesson must carry its REAL profile, not be
  // silently coerced to espTft (which would pin the wrong asset bundle / render
  // profile and fail the backend bundle check).
  it('sends a piTft lesson with profile=piTft (not coerced to espTft)', async () => {
    mockedGetCourses.mockResolvedValue([{ courseId: 'c_pi', title: 'Pi Course', lessonCount: 1 }]);
    mockedGetCourseLessons.mockResolvedValue([
      { lessonId: 'pi-d01', lessonVersion: 2, title: 'Pi Lesson', profile: 'piTft', manifestReady: true },
    ]);
    mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
    mockedCreateAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-pi', assignmentVersion: 1, deviceId: 'dev-1', childId: 'ch-1',
      lessonId: 'pi-d01', lessonVersion: 2, profile: 'piTft', state: 'PRELOADING', createdAt: null,
    });
    const navigation = navigationFor();
    renderWithProviders(
      <SendToRobotScreen
        navigation={navigation as never}
        route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Pi Lesson')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Send to Robot'));
    });

    expect(mockedCreateAssignment).toHaveBeenCalledWith({
      deviceId: 'dev-1', childId: 'ch-1', lessonId: 'pi-d01', lessonVersion: 2, profile: 'piTft',
    });
  });

  // MOB-3: an unrecognized profile is not sendable — the assign path must not
  // fire (rather than silently mis-sending as espTft).
  it('gates send for a lesson whose profile is not a recognized render profile', async () => {
    mockedGetCourses.mockResolvedValue([{ courseId: 'c_x', title: 'X Course', lessonCount: 1 }]);
    mockedGetCourseLessons.mockResolvedValue([
      { lessonId: 'x-d01', lessonVersion: 1, title: 'X Lesson', profile: 'bogus', manifestReady: true },
    ]);
    const navigation = navigationFor();
    renderWithProviders(
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
    renderWithProviders(
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
