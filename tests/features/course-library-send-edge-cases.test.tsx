import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import {
  createAssignment,
  enrollCourse,
  getCourseLessons,
  getCourses,
  getCurrentAssignment,
} from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';

// Keep the pure helpers real; mock ONLY the network reads/writes + the household
// source (so we can drive the empty-children branch the e2e flow never exercises).
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    createAssignment: jest.fn(),
    enrollCourse: jest.fn(),
    getCurrentAssignment: jest.fn(),
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

const mockedCreateAssignment = createAssignment as jest.MockedFunction<typeof createAssignment>;
const mockedEnrollCourse = enrollCourse as jest.MockedFunction<typeof enrollCourse>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockedGetCourses = getCourses as jest.MockedFunction<typeof getCourses>;
const mockedGetCourseLessons = getCourseLessons as jest.MockedFunction<typeof getCourseLessons>;
const mockedUseOptionalHousehold = useOptionalHousehold as jest.MockedFunction<typeof useOptionalHousehold>;

const SEED_COURSE = { courseId: 'c_barn', title: 'Barn Friends', lessonCount: 1 };
const SEED_LESSONS = [
  { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
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

function renderSend(navigation = navigationFor()) {
  render(
    <SendToRobotScreen
      navigation={navigation as never}
      route={{ key: 'send', name: ROUTES.SendToRobotScreen, params: {} } as never}
    />,
  );
  return navigation;
}

describe('SendToRobotScreen — course-flow edge cases (screen level)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubPublishedCatalog();
    // Default: a household WITH a child (each test that needs the empty case
    // overrides this explicitly). activeChild resolves to the single child,
    // matching the context's children[0] fallback.
    mockedUseOptionalHousehold.mockReturnValue({ children: [{ id: 'ch-1' }], activeChild: { id: 'ch-1' } } as never);
  });

  // ── Empty-children "add a child first" guard ───────────────────────────────
  // The existing e2e flow ALWAYS mocks a child present, so the no-child path is
  // unproven. The guard must: show the "add a child" hint, gate the CTA, and —
  // critically — NEVER reach createAssignment with childId: undefined.
  describe('empty-children guard (childId never undefined)', () => {
    it('shows the "add a child" hint and disables the send CTA when the household has no children', async () => {
      mockedUseOptionalHousehold.mockReturnValue({ children: [] } as never);
      renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      // The persistent hint is rendered for the empty-children household.
      expect(screen.getByText('Add a child to this household to send a lesson.')).toBeTruthy();
      // The CTA is gated (canSend requires hasChild). accessibilityState lives on
      // the pressable (label="Send to Robot"), not the inner Text node.
      expect(screen.getByLabelText('Send to Robot').props.accessibilityState?.disabled).toBe(true);
    });

    it('never calls createAssignment with an undefined childId when the CTA is pressed', async () => {
      mockedUseOptionalHousehold.mockReturnValue({ children: [] } as never);
      renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('Send to Robot'));
      });

      // Two layers protect childId: undefined. (1) canSend is false → the CTA is
      // disabled, so the press is swallowed before handleSend runs. (2) Even the
      // handleSend !childId guard would short-circuit before any network call.
      // Either way: no device read, no assign with an undefined childId.
      expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
      expect(mockedCreateAssignment).not.toHaveBeenCalled();
      // The persistent "add a child" hint stays on-screen as the recovery path.
      expect(screen.getByText('Add a child to this household to send a lesson.')).toBeTruthy();
    });

    it('degrades gracefully when there is no household provider at all (childId undefined → guarded)', async () => {
      // useOptionalHousehold can return undefined outside a provider; the screen
      // must treat that as "no child" rather than crashing or sending undefined.
      mockedUseOptionalHousehold.mockReturnValue(undefined as never);
      renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('Send to Robot'));
      });

      expect(mockedCreateAssignment).not.toHaveBeenCalled();
      expect(screen.getByText('Add a child to this household to send a lesson.')).toBeTruthy();
    });
  });

  // ── ASSIGNMENT_CONFLICT with no recoverable current assignment ─────────────
  // The e2e covers the case where getCurrentAssignment RETURNS a fresh row.
  // The uncovered branch: a conflict where current is NULL (the conflicting
  // assignment was already torn down) — the screen must NOT navigate to
  // robot-ready and must fall through to error copy.
  describe('ASSIGNMENT_CONFLICT with null current assignment', () => {
    it('does not navigate to robot-ready when the conflict refetch returns null', async () => {
      mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
      mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
      // Conflict, but there is no current assignment to fall back to.
      mockedGetCurrentAssignment.mockResolvedValueOnce(null);
      const navigation = renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('Send to Robot'));
      });

      // It DID try the recovery refetch…
      expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1');
      // …but with nothing to resume, it must not navigate forward.
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
    });

    it('does not navigate when the recovered lesson assignment belongs to another child', async () => {
      mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
      mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
      mockedGetCurrentAssignment.mockResolvedValueOnce({
        assignmentId: 'asg-other-child',
        sessionId: null,
        assignmentVersion: 4,
        lessonId: 'w01-d01-barn-say-it',
        lessonTitle: 'This Is a Barn',
        lessonVersion: 1,
        manifestChecksum: 'sha256:w01-d01',
        state: 'PRELOADING',
        childId: 'ch-2',
        profile: 'espTft',
      });
      const navigation = renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('Send to Robot'));
      });

      expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1');
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
    });

    it('does not navigate when the recovered lesson assignment is for a different lesson version', async () => {
      mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
      mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
      mockedGetCurrentAssignment.mockResolvedValueOnce({
        assignmentId: 'asg-wrong-version',
        sessionId: null,
        assignmentVersion: 4,
        lessonId: 'w01-d01-barn-say-it',
        lessonTitle: 'This Is a Barn',
        lessonVersion: 2,
        manifestChecksum: 'sha256:w01-d01-v2',
        state: 'PRELOADING',
        childId: 'ch-1',
        profile: 'espTft',
      });
      const navigation = renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('Send to Robot'));
      });

      expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1');
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
    });
  });

  // ── STEP_TIMEOUT → error copy at the screen ────────────────────────────────
  // The e2e only exercises ROBOT_OFFLINE on assign failure. STEP_TIMEOUT is a
  // distinct M4 code whose copy is token-free; the screen must render the restart
  // copy verbatim and stay put.
  describe('STEP_TIMEOUT assign failure', () => {
    it('renders the restart copy and does not navigate when createAssignment fails with STEP_TIMEOUT', async () => {
      mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
      mockedCreateAssignment.mockRejectedValueOnce({ response: { status: 422, data: { error: { code: 'STEP_TIMEOUT' } } } });
      const navigation = renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('Send to Robot'));
      });

      expect(mockedCreateAssignment).toHaveBeenCalled();
      // Conflict-recovery path must NOT fire for a non-conflict code.
      expect(mockedGetCurrentAssignment).not.toHaveBeenCalled();
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
      // The token-free STEP_TIMEOUT copy renders verbatim (robot name is a no-op here).
      expect(screen.getByText('Something interrupted the lesson. Tap to restart.')).toBeTruthy();
    });
  });

  // ── Whole-course renderability gate ───────────────────────────────────────
  // Course assignment must be all-or-nothing for the current robot renderer. A
  // single non-espTft lesson would strand the child mid-course, so even stale
  // catalog rows with manifestReady=true must keep course-mode gated.
  describe('whole-course renderability gate', () => {
    it.each([
      ['null profile', null],
      ['mobile profile', 'mobile'],
      ['piTft profile', 'piTft'],
      ['unknown profile', 'bogus'],
    ])('blocks course assignment when any lesson has %s despite manifestReady=true', async (_label, profile) => {
      mockedGetCourseLessons.mockResolvedValueOnce([
        { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
        { lessonId: 'w01-d02-barn-colors', lessonVersion: 3, title: 'Barn Colors', profile, manifestReady: true },
      ] as never);
      renderSend();

      await waitFor(() => expect(screen.getByText('Barn Colors')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Send whole course'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Assign course'));
      });

      expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
      expect(mockedEnrollCourse).not.toHaveBeenCalled();
      expect(mockedCreateAssignment).not.toHaveBeenCalled();
      expect(screen.getByText('This course is still preparing on the server. Try again in a moment.')).toBeTruthy();
    });

    it.each([
      ['NaN lessonVersion', Number.NaN],
      ['zero lessonVersion', 0],
      ['negative lessonVersion', -1],
      ['fractional lessonVersion', 1.5],
    ])('blocks course assignment when any lesson has %s', async (_label, lessonVersion) => {
      mockedGetCourseLessons.mockResolvedValueOnce([
        { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
        { lessonId: 'w01-d02-barn-colors', lessonVersion, title: 'Barn Colors', profile: 'espTft', manifestReady: true },
      ] as never);
      renderSend();

      await waitFor(() => expect(screen.getByText('Barn Colors')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Send whole course'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Assign course'));
      });

      expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
      expect(mockedEnrollCourse).not.toHaveBeenCalled();
      expect(mockedCreateAssignment).not.toHaveBeenCalled();
      expect(screen.getByText('This course is still preparing on the server. Try again in a moment.')).toBeTruthy();
    });
  });

  describe('lesson version guard', () => {
    it('does not assign a lesson when the catalog lessonVersion is not a positive integer', async () => {
      mockedGetCourseLessons.mockResolvedValueOnce([
        { lessonId: 'w01-d01-barn-say-it', lessonVersion: Number.NaN, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
      ] as never);
      renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('Send to Robot'));
      });

      expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
      expect(mockedCreateAssignment).not.toHaveBeenCalled();
      expect(screen.getByText('This lesson is still preparing on the server. Try again in a moment.')).toBeTruthy();
    });
  });

  // ── Course-mode enrollCourse ASSIGNMENT_CONFLICT recovers like lesson mode ───
  // A course enroll can race with a previous assign/enroll request for the same
  // device. Match lesson-mode recovery: refetch the current assignment and resume
  // RobotReady from the fresh assignment_version instead of stranding the parent
  // on generic error copy.
  //
  // To reach course mode we press the "Send whole course" mode toggle; the CTA
  // then renders as "Assign course". courseReady is satisfied because SEED_LESSONS
  // is manifestReady with a recognized (espTft) profile.
  describe('course-mode enrollCourse ASSIGNMENT_CONFLICT recovery', () => {
    it('refetches the current assignment and navigates to robot-ready from the fresh version', async () => {
      mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
      mockedEnrollCourse.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
      mockedGetCurrentAssignment.mockResolvedValueOnce({
        assignmentId: 'asg-course-existing',
        sessionId: null,
        assignmentVersion: 7,
        lessonId: 'w01-d01-barn-say-it',
        lessonTitle: 'This Is a Barn',
        lessonVersion: 1,
        manifestChecksum: 'sha256:w01-d01',
        state: 'PRELOADING',
        childId: 'ch-1',
        profile: 'espTft',
      });
      const navigation = renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      // Switch to whole-course mode; the CTA becomes "Assign course".
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Send whole course'));
      });

      await act(async () => {
        fireEvent.press(screen.getByText('Assign course'));
      });

      expect(mockedEnrollCourse).toHaveBeenCalled();
      expect(mockedCreateAssignment).not.toHaveBeenCalled();
      expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1');
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
        childId: 'ch-1',
        deviceId: 'dev-1',
        assignmentId: 'asg-course-existing',
        assignmentVersion: 7,
        manifestChecksum: 'sha256:w01-d01',
      });
      expect(screen.queryByText('An unexpected error occurred. Please try again.')).toBeNull();
    });

    it('does not navigate when the recovered course conflict assignment is outside the selected course', async () => {
      mockedGetCourseLessons.mockResolvedValueOnce([
        { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
      ]);
      mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
      mockedEnrollCourse.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
      mockedGetCurrentAssignment.mockResolvedValueOnce({
        assignmentId: 'asg-other-course',
        sessionId: null,
        assignmentVersion: 7,
        lessonId: 'w99-d01-space',
        lessonTitle: 'Space',
        lessonVersion: 1,
        manifestChecksum: 'sha256:space',
        state: 'PRELOADING',
        childId: 'ch-1',
        profile: 'espTft',
      });
      const navigation = renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Send whole course'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Assign course'));
      });

      expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1');
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
    });

    it('navigates to robot-ready on a SUCCESSFUL course enroll (proves the conflict assertions above are non-tautological)', async () => {
      mockedGetDeviceStatus.mockResolvedValueOnce({ id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false });
      // Same code path, but enroll succeeds → the screen MUST navigate forward and
      // MUST NOT show the generic error. This proves the negative assertions in the
      // conflict test are driven by the rejection, not by an unreachable CTA.
      mockedEnrollCourse.mockResolvedValueOnce({
        enrollment: { id: 'enr-1', childId: 'ch-1', courseId: 'c_barn', state: 'active' },
        assignment: {
          id: 'asg-1',
          assignmentVersion: 3,
          lessonId: 'w01-d01-barn-say-it',
          lessonVersion: 1,
          manifestChecksum: 'sha256:w01-d01',
          state: 'assigned',
        },
      } as never);
      const navigation = renderSend();

      await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Send whole course'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Assign course'));
      });

      expect(mockedEnrollCourse).toHaveBeenCalled();
      // Forward navigation uses the enroll's assignment ref (id + assignmentVersion).
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
        childId: 'ch-1',
        deviceId: 'dev-1',
        assignmentId: 'asg-1',
        assignmentVersion: 3,
        manifestChecksum: 'sha256:w01-d01',
      });
      // No error copy on the happy path.
      expect(screen.queryByText('An unexpected error occurred. Please try again.')).toBeNull();
    });
  });
});
