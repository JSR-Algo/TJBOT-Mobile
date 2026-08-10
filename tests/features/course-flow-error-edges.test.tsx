import React from 'react';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import CourseScreen from '@/features/course/screens/CourseScreen';
import LessonListScreen from '@/features/course/screens/LessonListScreen';
import {
  createAssignment,
  getCourseLessons,
  getCourses,
  getCurrentAssignment,
} from '@/services/api/course-library.api';
import { listCourseCatalog, getLessonList } from '@/services/api/course.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { ERROR_MESSAGES } from '@/utils/errors';

// T3.1 deep-dive — the browse → send-to-robot flow's ERROR edges. The happy path
// and the "still preparing" gates already have coverage
// (course-library-send-edge-cases). What had none is what a parent hits when the
// flow goes wrong: the robot is busy with someone else's lesson, the robot is
// offline, the parent double-taps, or the network drops mid-browse.
//
// Pure helpers stay real; only the network reads/writes are mocked.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    createAssignment: jest.fn(),
    enrollCourse: jest.fn(),
    getCurrentAssignment: jest.fn(),
    getCourses: jest.fn(),
    getCourseLessons: jest.fn(),
    listChildEnrollments: jest.fn(() => Promise.resolve({ enrollments: [] })),
    cancelCourseEnrollment: jest.fn(),
  };
});

jest.mock('@/services/api/course.api', () => {
  const actual = jest.requireActual('@/services/api/course.api');
  return {
    ...actual,
    listCourseCatalog: jest.fn(),
    getLessonList: jest.fn(),
  };
});

jest.mock('@/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useOptionalHousehold: jest.fn(() => ({ children: [{ id: 'ch-1' }], activeChild: { id: 'ch-1' } })),
}));

// These cases take ~100-600 ms on an idle machine, but each drives several
// render + waitFor cycles on real timers, so they are wall-clock sensitive: on a
// contended host they blow through jest's 5000 ms default while doing nothing
// wrong (observed in a gate run where a sibling suite's 200 ms test reported
// 19.8 s elapsed). 30 s keeps ~50x headroom over the real cost while still
// failing fast on an actual hang. See the load-robustness finding routed to
// T0.4/T6.5 in LESSON_PRODUCTION_PLAN.md §5.
jest.setTimeout(30_000);

// jest.setTimeout alone is NOT enough: RNTL's waitFor has its own 1000 ms
// default, so under load it gives up first and reports "Unable to find an
// element" — a *lying* failure that looks like a broken assertion rather than a
// slow machine. A T0.4 gate run failed exactly this way on tests that pass 9/9
// under the identical command locally. The assertions are unchanged; only the
// wall-clock allowance is.
configure({ asyncUtilTimeout: 15_000 });

const mockedCreateAssignment = createAssignment as jest.MockedFunction<typeof createAssignment>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;
const mockedGetCourses = getCourses as jest.MockedFunction<typeof getCourses>;
const mockedGetCourseLessons = getCourseLessons as jest.MockedFunction<typeof getCourseLessons>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockedListCourseCatalog = listCourseCatalog as jest.MockedFunction<typeof listCourseCatalog>;
const mockedGetLessonList = getLessonList as jest.MockedFunction<typeof getLessonList>;

const SEED_COURSE = { courseId: 'c_barn', title: 'Barn Friends', lessonCount: 1 };
const SEED_LESSONS = [
  { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
];

const ONLINE_ROBOT = { id: 'dev-1', name: 'Casa Robot', online: true, batteryPercent: 80, charging: false };

/** A 409 in the backend's GlobalExceptionFilter envelope shape. */
function conflict(code: string) {
  return { response: { status: 409, data: { error: { code } }, headers: {} } };
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

function renderSend(params: Record<string, unknown> = {}) {
  const navigation = navigationFor();
  render(
    <SendToRobotScreen
      navigation={navigation as never}
      route={{ key: 'send', name: ROUTES.SendToRobotScreen, params } as never}
    />,
  );
  return navigation;
}

async function pressSend() {
  await act(async () => {
    fireEvent.press(screen.getByText('Send to Robot'));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCourses.mockResolvedValue(SEED_COURSE ? [SEED_COURSE] : []);
  mockedGetCourseLessons.mockResolvedValue(SEED_LESSONS);
  mockedGetDeviceStatus.mockResolvedValue(ONLINE_ROBOT);
});

// ── Checklist: "Assignment conflict (other parent assigned first): conflict
// surfaced, state refreshed" ────────────────────────────────────────────────
//
// The single-slot device index (`ux_one_active_assignment_per_device`) means the
// backend answers a create against an already-busy robot with ROBOT_BUSY (409),
// NOT ASSIGNMENT_CONFLICT — see tbot-backend lesson-assignment.service.ts:299,325.
// ASSIGNMENT_CONFLICT is the optimistic-concurrency code (stale
// assignment_version, :573) and the stale-preload-report code (:480). Both mean
// "the device's assignment is not what you think it is", so both must take the
// same recovery path.
describe('SendToRobotScreen — assignment conflict is surfaced and refreshes state', () => {
  it('sends to a household-owned unbound primary robot for the active child', async () => {
    mockedGetDeviceStatus.mockResolvedValueOnce({
      ...ONLINE_ROBOT,
      assignedChildProfileId: null,
    });
    mockedCreateAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-unbound',
      id: 'asg-unbound',
      assignmentVersion: 1,
      manifestChecksum: 'sha256:w01-d01',
    } as never);
    const navigation = renderSend();
    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    await pressSend();

    expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary', 'ch-1');
    expect(mockedCreateAssignment).toHaveBeenCalledWith(expect.objectContaining({
      deviceId: 'dev-1',
      childId: 'ch-1',
      lessonId: 'w01-d01-barn-say-it',
    }));
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.RobotReadyScreen,
      expect.objectContaining({ deviceId: 'dev-1', assignmentId: 'asg-unbound' }),
    );
  });

  it('recovers from ROBOT_BUSY when the robot already holds the lesson the parent picked', async () => {
    mockedCreateAssignment.mockRejectedValueOnce(conflict('ROBOT_BUSY'));
    mockedGetCurrentAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-existing',
      sessionId: null,
      assignmentVersion: 3,
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

    await pressSend();

    // The busy slot IS this child's own in-flight copy of the very lesson they
    // just picked — a duplicate send, not a real conflict. Carry the parent
    // forward on the server's fresh assignment version instead of dead-ending.
    expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1');
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.RobotReadyScreen,
      expect.objectContaining({ assignmentId: 'asg-existing', assignmentVersion: 3 }),
    );
  });

  it('surfaces conflict-specific copy naming the occupying lesson, never the generic unknown-error copy', async () => {
    mockedCreateAssignment.mockRejectedValueOnce(conflict('ASSIGNMENT_CONFLICT'));
    // Someone else got there first with a DIFFERENT lesson.
    mockedGetCurrentAssignment.mockResolvedValueOnce({
      assignmentId: 'asg-other',
      sessionId: null,
      assignmentVersion: 7,
      lessonId: 'w02-d03-farm-count',
      lessonTitle: 'Counting Sheep',
      lessonVersion: 1,
      manifestChecksum: 'sha256:w02-d03',
      state: 'RUNNING',
      childId: 'ch-1',
      profile: 'espTft',
    });
    const navigation = renderSend();
    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    await pressSend();

    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RobotReadyScreen, expect.anything());
    // "An unexpected error occurred. Please try again." is what an unmapped code
    // renders. A conflict is a KNOWN, explainable state — it must not fall
    // through to the unknown-error copy.
    expect(screen.queryByText(ERROR_MESSAGES.UNKNOWN_ERROR)).toBeNull();
    // The parent needs to know what is actually on the robot.
    expect(screen.getByText(/Counting Sheep/)).toBeTruthy();
  });

  it('refreshes the lesson catalog after a conflict it cannot recover from', async () => {
    mockedCreateAssignment.mockRejectedValueOnce(conflict('ASSIGNMENT_CONFLICT'));
    mockedGetCurrentAssignment.mockResolvedValueOnce(null);
    renderSend();
    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());
    const lessonReadsBefore = mockedGetCourseLessons.mock.calls.length;

    await pressSend();

    // A conflict means this screen's view of the world is stale. Re-read the
    // catalog so the next tap is decided on fresh data.
    await waitFor(() =>
      expect(mockedGetCourseLessons.mock.calls.length).toBeGreaterThan(lessonReadsBefore),
    );
  });
});

// ── Checklist: "Device offline at assign: clear error + retry path" ─────────
describe('SendToRobotScreen — device offline at assign', () => {
  it('refuses to assign to an offline robot and shows the robot-offline guidance', async () => {
    mockedGetDeviceStatus.mockResolvedValue({ ...ONLINE_ROBOT, online: false });
    renderSend();
    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    await pressSend();

    // The resume path on this same screen already gates on `online !== true`
    // before enrolling; the primary send path must not be laxer.
    expect(mockedCreateAssignment).not.toHaveBeenCalled();
    expect(screen.getByText("Couldn't reach Casa Robot. Check it's on and connected.")).toBeTruthy();
  });
});

// ── Checklist: "Double-tap assign: single assignment created" ───────────────
describe('SendToRobotScreen — double-tap assign', () => {
  it('issues a single createAssignment for two taps in the same frame', async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    mockedCreateAssignment.mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve; }) as never,
    );
    renderSend();
    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());

    // Two presses before React can re-render the disabled state. `sending` is
    // component STATE, so both handlers observe sending === false; only an
    // in-flight ref closes the window.
    await act(async () => {
      const cta = screen.getByText('Send to Robot');
      fireEvent.press(cta);
      fireEvent.press(cta);
    });

    expect(mockedCreateAssignment).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate?.({
        assignmentId: 'asg-1',
        assignmentVersion: 1,
        state: 'ASSIGNED',
        manifestChecksum: 'sha256:x',
      });
    });
  });
});

// ── Checklist: "Airplane mode on each screen: … retry restores" + the task's
// "retry on network failure" ────────────────────────────────────────────────
//
// A transport failure is the MOST retryable error there is. Every load-bearing
// screen in this flow must offer a way back without killing the app.
describe('course browse flow — every network failure has a retry', () => {
  const NETWORK_ERROR = { code: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR, retryable: true };

  it('SendToRobotScreen: catalog load failure offers a retry that refetches', async () => {
    mockedGetCourses.mockRejectedValueOnce(NETWORK_ERROR);
    renderSend();
    await waitFor(() => expect(screen.getByLabelText('Try again')).toBeTruthy());

    mockedGetCourses.mockResolvedValueOnce([SEED_COURSE]);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Try again'));
    });

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());
  });

  it('CourseScreen: an OFFLINE catalog offers a retry that refetches', async () => {
    mockedListCourseCatalog.mockRejectedValueOnce(NETWORK_ERROR);
    render(
      <CourseScreen
        navigation={navigationFor() as never}
        route={{ key: 'c', name: ROUTES.CourseScreen, params: {} } as never}
      />,
    );
    // Today a 429 and a generic failure both get a Retry, but NETWORK_ERROR —
    // the one a parent in airplane mode actually hits — gets none.
    // (This screen labels retries "Retry <title>"; keep its convention.)
    await waitFor(() => expect(screen.getByLabelText('Retry Course catalog offline')).toBeTruthy());

    mockedListCourseCatalog.mockResolvedValueOnce([
      { id: 'c1', title: 'Hello Friends', language: 'en', levelCount: 1, lessonCount: 4, locked: false, progress: 0 },
    ]);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Retry Course catalog offline'));
    });

    await waitFor(() => expect(screen.getByText('Hello Friends')).toBeTruthy());
  });

  it('LessonListScreen: a failed lesson load offers a retry that refetches', async () => {
    mockedGetLessonList.mockRejectedValueOnce(NETWORK_ERROR);
    render(
      <LessonListScreen
        navigation={navigationFor() as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: { unitId: 'u-1' } } as never}
      />,
    );
    // The screen's own 410 copy already tells the parent to "Refresh to
    // continue" — with nothing on screen to press.
    await waitFor(() => expect(screen.getByLabelText('Retry Lesson list offline')).toBeTruthy());

    mockedGetLessonList.mockResolvedValueOnce([
      { id: 'l-1', unitId: 'u-1', title: 'Say Hello', durationMinutes: 5, wordsCount: 6, state: 'available', stars: 0 },
    ]);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Retry Lesson list offline'));
    });

    await waitFor(() => expect(screen.getByText('Say Hello')).toBeTruthy());
  });

  it('CourseDetailScreen: a failed lesson load offers a retry that refetches', async () => {
    mockedGetCourseLessons.mockRejectedValueOnce(NETWORK_ERROR);
    render(
      <CourseDetailScreen
        navigation={navigationFor() as never}
        route={{ key: 'cd', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_barn' } } as never}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText('Try again')).toBeTruthy());

    mockedGetCourseLessons.mockResolvedValueOnce(SEED_LESSONS);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Try again'));
    });

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());
  });
});
