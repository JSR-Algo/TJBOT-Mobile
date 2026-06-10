import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import {
  createAssignment,
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
    getCurrentAssignment: jest.fn(),
    getCourses: jest.fn(),
    getCourseLessons: jest.fn(),
  };
});

jest.mock('@/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useOptionalHousehold: jest.fn(() => ({ children: [{ id: 'ch-1' }] })),
}));

const mockedCreateAssignment = createAssignment as jest.MockedFunction<typeof createAssignment>;
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
    // overrides this explicitly).
    mockedUseOptionalHousehold.mockReturnValue({ children: [{ id: 'ch-1' }] } as never);
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
});
