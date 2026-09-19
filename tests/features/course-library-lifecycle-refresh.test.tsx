import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import { getCourses, getCourseLessons, getCurrentAssignment, getPreloadStatus, createAssignment, enrollCourse, listChildEnrollments, cancelCourseEnrollment, normalizeEnrollmentPayload, type CurrentAssignment, type PublishedLesson } from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { clearRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';

let mockFocused = true;
const mockFocusListeners = new Set<() => void>();
const mockSubscribe = (listener: () => void) => { mockFocusListeners.add(listener); return () => { mockFocusListeners.delete(listener); }; };
const mockFocusSnapshot = () => mockFocused;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => {
    const R: typeof React = require('react');
    return R.useSyncExternalStore(mockSubscribe, mockFocusSnapshot);
  },
}));
jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'),
  getCourses: jest.fn(), getCourseLessons: jest.fn(), getCurrentAssignment: jest.fn(), getPreloadStatus: jest.fn(),
  getAssignmentReadback: jest.fn(() => Promise.resolve({ kind: 'none' })),
  createAssignment: jest.fn(), enrollCourse: jest.fn(), listChildEnrollments: jest.fn(() => Promise.resolve({ enrollments: [] })),
  cancelCourseEnrollment: jest.fn(),
}));
jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));
const mockHousehold = { activeChild: { id: 'child-a', name: 'Child A' }, children: [{ id: 'child-a', name: 'Child A' }], activeHousehold: { id: 'household-a' }, setActiveChild: jest.fn() };
jest.mock('@/contexts/HouseholdContext', () => ({ useOptionalHousehold: () => mockHousehold }));
const mockAuth = { user: { id: 'parent-a' }, isAuthenticated: true };
jest.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: () => mockAuth }));
jest.mock('@/features/fallback/recoveryCheckpointStore', () => ({ writeRecoveryCheckpoint: jest.fn(), clearRecoveryCheckpoint: jest.fn() }));
jest.mock('@/services/ws/realtime', () => ({ openRealtime: jest.fn() }));
jest.mock('@/services/observability/sentry', () => ({ captureError: jest.fn() }));
const appListeners = new Set<(state: AppStateStatus) => void>();
const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => jest.fn()), isFocused: () => mockFocused };
const selected = { deviceId: 'device-a', assignmentId: 'assignment-a', assignmentVersion: 1, childId: 'child-a', manifestChecksum: 'hash-a' };
const A: CurrentAssignment = { assignmentId: 'assignment-a', assignmentVersion: 1, childId: 'child-a', lessonId: 'lesson-a', lessonTitle: 'Lesson A', lessonVersion: 1, manifestChecksum: 'hash-a', sessionId: 'session-a', profile: 'espTft', state: 'READY' };
const lessonA: PublishedLesson = { lessonId: 'lesson-a', lessonVersion: 1, title: 'Lesson A', profile: 'espTft', manifestReady: true };
const lessonB: PublishedLesson = { ...lessonA, lessonVersion: 2, title: 'Lesson B' };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function foreground(state: AppStateStatus) {
  await act(async () => { appListeners.forEach(listener => listener(state)); });
}
async function focus(value: boolean) {
  await act(async () => { mockFocused = value; mockFocusListeners.forEach(listener => listener()); });
}
function ready(params: object = selected) {
  return render(<RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params } as never} />);
}
function detail(courseId = 'course-a') {
  return render(<CourseDetailScreen navigation={navigation as never} route={{ key: 'd', name: 'CourseDetailScreen', params: { courseId } } as never} />);
}
function send() {
  return render(<SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { courseId: 'course-a' } } as never} />);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers(); mockFocused = true;
  mockAuth.user.id = 'parent-a'; mockAuth.isAuthenticated = true;
  mockHousehold.activeChild.id = 'child-a'; mockHousehold.activeHousehold.id = 'household-a';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appListeners.add(listener); return { remove: () => { appListeners.delete(listener); } };
  });
  jest.mocked(getCurrentAssignment).mockResolvedValue(A);
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [] });
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state: 'READY', profile: 'espTft', assets: [], criticalTotal: 1, criticalReady: 1 });
  jest.mocked(getCourses).mockResolvedValue([{ courseId: 'course-a', title: 'Course A', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonA]);
  jest.mocked(getDeviceStatus).mockResolvedValue({ id: 'device-a', name: 'Robot', batteryPercent: 90, online: true, assignedChildProfileId: 'child-a' });
  jest.mocked(createAssignment).mockResolvedValue({ ...A, deviceId: 'device-a', createdAt: null });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); appListeners.clear(); });

it('R1: mounted Resume ignores old device rejection after a foreground refresh', async () => {
  const old = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  const enrollment = normalizeEnrollmentPayload({
    id: 'enrollment-a', courseId: 'course-a', childId: 'child-a', deviceId: 'device-a',
    status: 'paused', currentLessonKey: 'lesson-a',
  });
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [enrollment] });
  jest.mocked(getDeviceStatus).mockReturnValueOnce(old.promise);
  const view = detail(); const user = userEvent.setup(); await flush();
  expect(screen.getByText('Course A')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Resume course' })).toBeEnabled();
  await user.press(screen.getByRole('button', { name: 'Resume course' }));
  expect(jest.mocked(getDeviceStatus).mock.calls).toEqual([['primary', 'child-a']]);
  await foreground('background');
  jest.mocked(getCourses).mockResolvedValue([{ courseId: 'course-a', title: 'Refreshed course', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await foreground('active'); await flush();
  expect(screen.getByText('Refreshed course')).toBeOnTheScreen();
  expect(screen.getByText('Lesson B')).toBeOnTheScreen();
  expect(screen.getByText('Course paused')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Preparing course' })).toBeDisabled();
  expect(listChildEnrollments).toHaveBeenCalledTimes(2);
  expect(getCourses).toHaveBeenCalledTimes(2);
  expect(getCourseLessons).toHaveBeenCalledTimes(2);
  await act(async () => old.reject({ code: 'ROBOT_OFFLINE', message: 'Device offline' }));
  await flush();
  expect(screen.getByText('Refreshed course')).toBeOnTheScreen();
  expect(screen.getByText('Lesson B')).toBeOnTheScreen();
  expect(screen.getByText('Course paused')).toBeOnTheScreen();
  expect(screen.queryByText('Course A')).not.toBeOnTheScreen();
  expect(screen.queryByText('Lesson A')).not.toBeOnTheScreen();
  expect(screen.queryByText(/check it.s on and connected/i)).not.toBeOnTheScreen();
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Resume course' })).toBeEnabled();
  expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
  expect(cancelCourseEnrollment).not.toHaveBeenCalled();
  expect(getCurrentAssignment).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Back to library' }));
  expect(navigation.navigate.mock.calls).toEqual([['CourseLibraryScreen']]);
  expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  view.unmount();
});

it('C4: keeps refreshed picker choices when the old lesson fan-out settles', async () => {
  const old = deferred<Awaited<ReturnType<typeof getCourseLessons>>>();
  jest.mocked(getCourseLessons).mockReturnValueOnce(old.promise);
  send(); await flush();
  expect(getCourseLessons).toHaveBeenCalledWith('course-a', { childId: 'child-a' });
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeDisabled();
  await focus(false);
  jest.mocked(getCourses).mockResolvedValue([
    { courseId: 'course-a', title: 'Course B', lessonCount: 1 },
    { courseId: 'course-other', title: 'Other course', lessonCount: 1 },
  ]);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await focus(true); await flush();
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Pick lesson Lesson B' }));
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
  await act(async () => old.resolve([lessonA]));
  expect(screen.getByText('Course B')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Pick lesson Lesson B', selected: true })).toBeOnTheScreen();
  expect(screen.queryByText('Course A')).not.toBeOnTheScreen();
  expect(screen.queryByText('Lesson A')).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
  expect(getCourses).toHaveBeenCalledTimes(2);
  expect(getCourseLessons).toHaveBeenCalledTimes(3);
  expect(getDeviceStatus).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it('C5: keeps a usable new picker when an obsolete course-list request rejects', async () => {
  const old = deferred<Awaited<ReturnType<typeof getCourses>>>();
  jest.mocked(getCourses).mockReturnValueOnce(old.promise);
  send(); await flush();
  expect(getCourseLessons).not.toHaveBeenCalled();
  await focus(false);
  jest.mocked(getCourses).mockResolvedValue([
    { courseId: 'course-a', title: 'Course B', lessonCount: 1 },
    { courseId: 'course-other', title: 'Other course', lessonCount: 1 },
  ]);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await focus(true); await flush();
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
  await act(async () => old.reject(new Error('obsolete catalog unavailable')));
  await flush();
  expect(screen.getByText('Course B')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  expect(screen.queryByText('An unexpected error occurred. Please try again.')).not.toBeOnTheScreen();
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Pick lesson Lesson B' }));
  expect(screen.getByRole('button', { name: 'Pick lesson Lesson B', selected: true })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
  expect(getCourses).toHaveBeenCalledTimes(2);
  expect(getCourseLessons).toHaveBeenCalledTimes(2);
  expect(getDeviceStatus).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it('M03: mounted Ready refreshes on foreground and monitors matching RUNNING', async () => {
  ready(); await flush(); expect(screen.getByText('Hand it to your child')).toBeOnTheScreen();
  await foreground('background');
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
  await foreground('active'); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('RunningScreen', expect.objectContaining({ assignmentId: A.assignmentId, assignmentVersion: 1, childId: A.childId }));
  expect(screen.queryByText('Hand it to your child')).toBeNull();
});
it('M03: initially matching RUNNING enters its monitor without a settling timeout', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
  ready(); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('RunningScreen', expect.objectContaining({ assignmentId: A.assignmentId }));
});
it('M04: mounted CourseDetail refreshes title and lesson list on focus', async () => {
  detail(); await flush(); expect(screen.getByText('Course A')).toBeOnTheScreen();
  await focus(false);
  jest.mocked(getCourses).mockResolvedValue([{ courseId: 'course-a', title: 'Course B', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await focus(true); await flush();
  expect(screen.getByText('Course B')).toBeOnTheScreen(); expect(screen.getByText('Lesson B')).toBeOnTheScreen();
  expect(screen.queryByText('Lesson A')).toBeNull();
});
it('M04: mounted Send refreshes and submits the new public version', async () => {
  send(); await flush(); await foreground('background');
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await foreground('active'); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' })); await flush();
  expect(createAssignment).toHaveBeenCalledWith(expect.objectContaining({ lessonId: 'lesson-a', lessonVersion: 2, childId: 'child-a', deviceId: 'device-a' }));
});

it('M04: an explicit exact-version pick requires reselection after publication', async () => {
  send(); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Pick lesson Lesson A' }));
  await focus(false);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await focus(true); await flush();
  expect(screen.getByText('Your selected lesson version is no longer available. Pick a lesson again.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Pick lesson Lesson B' }));
  fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' })); await flush();
  expect(createAssignment).toHaveBeenCalledWith(expect.objectContaining({ lessonVersion: 2 }));
});

it('M04: a pending preflight cannot create after blur and refocus', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  send(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' }));
  await focus(false); await focus(true); await flush();
  await act(async () => device.resolve({ id: 'device-a', name: 'Robot', batteryPercent: 90, online: true, assignedChildProfileId: 'child-a' }));
  expect(createAssignment).not.toHaveBeenCalled();
});

it('M04: a pending write stays pinned to A and cannot navigate after refresh to B', async () => {
  const assignment = deferred<Awaited<ReturnType<typeof createAssignment>>>();
  jest.mocked(createAssignment).mockReturnValueOnce(assignment.promise);
  send(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' })); await flush();
  await foreground('background'); jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await foreground('active'); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' }));
  expect(createAssignment).toHaveBeenCalledTimes(1);
  expect(createAssignment).toHaveBeenCalledWith(expect.objectContaining({ lessonVersion: 1 }));
  await act(async () => assignment.resolve({ ...A, deviceId: 'device-a', createdAt: null }));
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it('M04: CourseDetail ignores a preflight after backgrounding', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  detail(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' }));
  await foreground('background');
  await act(async () => device.resolve({ id: 'device-a', name: 'Robot', batteryPercent: 90, online: true }));
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it('M04: automatic resume rejects a preflight from an earlier foreground', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  render(<SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { resumeContext: { courseId: 'course-a', childId: 'child-a' } } } as never} />);
  await flush(); await foreground('background'); await foreground('active'); await flush();
  await act(async () => device.resolve({ id: 'device-a', name: 'Robot', batteryPercent: 90, online: true }));
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
});

it.each(['COMPLETED', 'FAILED', 'CANCELLED', 'UNKNOWN', 'null', 'replacement'] as const)('M03: returning to %s never retains READY or clears the selected checkpoint', async state => {
  ready(); await flush(); await focus(false);
  // The API normalizes an unknown wire state to UNASSIGNED.
  const current: CurrentAssignment | null = state === 'null' ? null : state === 'replacement' ? { ...A, assignmentId: 'assignment-b', state: 'RUNNING' } : { ...A, state: state === 'UNKNOWN' ? 'UNASSIGNED' : state };
  jest.mocked(getCurrentAssignment).mockResolvedValue(current);
  await focus(true); await flush();
  expect(screen.queryByText('Hand it to your child')).toBeNull();
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
});

it.each(['deviceId', 'childId', 'assignmentVersion', 'account', 'household'] as const)('M03: ignores a pending read after %s changes', async change => {
  const current = deferred<CurrentAssignment | null>();
  jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise).mockResolvedValue(null);
  const view = ready(); await flush();
  const next = { ...selected };
  if (change === 'deviceId') next.deviceId = 'device-b';
  if (change === 'childId') next.childId = 'child-b';
  if (change === 'assignmentVersion') next.assignmentVersion = 2;
  if (change === 'account') mockAuth.user.id = 'parent-b';
  if (change === 'household') mockHousehold.activeHousehold.id = 'household-b';
  view.rerender(<RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params: next } as never} />);
  await act(async () => current.resolve({ ...A, state: 'RUNNING' }));
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(screen.queryByText('Hand it to your child')).toBeNull();
});

it('M03: focus plus foreground triggers one refresh and removes listeners and timers', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue(null);
  const view = ready(); await flush();
  await focus(false); await foreground('background');
  const count = jest.mocked(getCurrentAssignment).mock.calls.length;
  await act(async () => jest.advanceTimersByTime(60000));
  expect(getCurrentAssignment).toHaveBeenCalledTimes(count);
  await focus(true); expect(getCurrentAssignment).toHaveBeenCalledTimes(count);
  await foreground('active'); await foreground('active'); await flush();
  expect(getCurrentAssignment).toHaveBeenCalledTimes(count + 1);
  view.unmount(); expect(appListeners.size).toBe(0); expect(mockFocusListeners.size).toBe(0);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(getCurrentAssignment).toHaveBeenCalledTimes(count + 1);
});

it('M03: unknown readback reaches bounded retry and can recover', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue(null);
  ready(); await flush();
  for (let i = 0; i < 20; i++) await act(async () => jest.advanceTimersByTime(2500));
  expect(getCurrentAssignment).toHaveBeenCalledTimes(18);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  jest.mocked(getCurrentAssignment).mockResolvedValue(A);
  fireEvent.press(screen.getByRole('button', { name: 'Try again' })); await flush();
  expect(screen.getByText('Hand it to your child')).toBeOnTheScreen();
});

it.each(['detail', 'send'] as const)('M04: %s rejects late catalog A after refreshed B', async target => {
  const courses = deferred<Awaited<ReturnType<typeof getCourses>>>();
  jest.mocked(getCourses).mockReturnValueOnce(courses.promise);
  if (target === 'detail') detail(); else send();
  await flush(); await focus(false);
  jest.mocked(getCourses).mockResolvedValue([{ courseId: 'course-a', title: 'Course B', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await focus(true); await flush();
  await act(async () => courses.resolve([{ courseId: 'course-a', title: 'Course A', lessonCount: 1 }]));
  expect(screen.getByText('Lesson B')).toBeOnTheScreen();
  expect(screen.queryByText('Lesson A')).toBeNull();
});

it.each(['detail', 'send'] as const)('M04: %s exposes retry after refresh failure', async target => {
  if (target === 'detail') detail(); else send();
  await flush(); await focus(false);
  jest.mocked(getCourses).mockRejectedValueOnce(new Error('offline'));
  await focus(true); await flush();
  expect(screen.queryByText('Lesson A')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Try again' })); await flush();
  expect(screen.getByText('Lesson A')).toBeOnTheScreen();
});

it('M04: preserves an exact choice still present and gates changed readiness', async () => {
  send(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Pick lesson Lesson A' }));
  await focus(false); jest.mocked(getCourseLessons).mockResolvedValue([{ ...lessonA, manifestReady: false }]);
  await focus(true); await flush();
  expect(screen.getByRole('button', { name: 'Pick lesson Lesson A', selected: true })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeDisabled();
  await focus(false); jest.mocked(getCourseLessons).mockResolvedValue([lessonA]); await focus(true); await flush();
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
});

it('M04: a removed course requires a new course choice even with only one course left', async () => {
  send(); await flush(); await focus(false);
  jest.mocked(getCourses).mockResolvedValue([{ courseId: 'course-b', title: 'Course B', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]);
  await focus(true); await flush();
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Pick course Course B' }));
  expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
});

it.each(['lesson', 'course'] as const)('M04: a %s conflict with a different profile cannot resume the selection', async mode => {
  jest.mocked(createAssignment).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ROBOT_BUSY' } } } });
  jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ROBOT_BUSY' } } } });
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, profile: 'mobile' });
  send(); await flush();
  if (mode === 'course') fireEvent.press(screen.getByRole('button', { name: 'Send whole course' }));
  fireEvent.press(screen.getByRole('button', { name: mode === 'course' ? 'Assign course' : 'Send to Robot' })); await flush();
  expect(getCurrentAssignment).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it('M04: CourseDetail conflict recovery requires the public lesson profile', async () => {
  jest.mocked(listChildEnrollments).mockResolvedValueOnce({ enrollments: [{ id: 'enrollment-a', currentLessonKey: 'lesson-a', courseId: 'course-a', childId: 'child-a', deviceId: 'device-a', status: 'PAUSED' }] });
  jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, profile: 'mobile' });
  detail(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Resume course' })); await flush();
  expect(getCurrentAssignment).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it.each(['account', 'household', 'child', 'route', 'unmount'] as const)('M04: Send rejects preflight after %s changes', async change => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  const view = send(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' }));
  if (change === 'account') mockAuth.user.id = 'parent-b';
  if (change === 'household') mockHousehold.activeHousehold.id = 'household-b';
  if (change === 'child') mockHousehold.activeChild.id = 'child-b';
  if (change === 'unmount') view.unmount();
  else view.rerender(<SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { courseId: change === 'route' ? 'course-b' : 'course-a' } } as never} />);
  await act(async () => device.resolve({ id: 'device-a', name: 'Robot', batteryPercent: 90, online: true }));
  expect(createAssignment).not.toHaveBeenCalled(); expect(navigation.navigate).not.toHaveBeenCalled();
});

it('M04: a late conflict read after backgrounding cannot navigate', async () => {
  const current = deferred<CurrentAssignment | null>();
  jest.mocked(createAssignment).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ROBOT_BUSY' } } } });
  jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise);
  send(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' })); await flush();
  expect(getCurrentAssignment).toHaveBeenCalledTimes(1); await foreground('background');
  await act(async () => current.resolve(A)); expect(navigation.navigate).not.toHaveBeenCalled();
});

it('M03: a late matching RUNNING read after unmount cannot navigate', async () => {
  const current = deferred<CurrentAssignment | null>();
  jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise);
  const view = ready(); await flush(); view.unmount();
  await act(async () => current.resolve({ ...A, state: 'RUNNING' }));
  expect(navigation.navigate).not.toHaveBeenCalled(); expect(appListeners.size).toBe(0);
});

it('M04: an automatic resume preflight is cancelled by a new manual selection', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  render(<SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { resumeContext: { courseId: 'course-a', childId: 'child-a' } } } as never} />);
  await flush(); fireEvent.press(screen.getByRole('button', { name: 'Pick lesson Lesson A' }));
  await act(async () => device.resolve({ id: 'device-a', name: 'Robot', batteryPercent: 90, online: true }));
  expect(enrollCourse).not.toHaveBeenCalled();
});

it('M04: same-frame taps create once and unmount rejects the pending response', async () => {
  const assignment = deferred<Awaited<ReturnType<typeof createAssignment>>>();
  jest.mocked(createAssignment).mockReturnValueOnce(assignment.promise);
  const view = send(); await flush();
  const button = screen.getByRole('button', { name: 'Send to Robot' });
  act(() => { fireEvent.press(button); fireEvent.press(button); }); await flush();
  expect(createAssignment).toHaveBeenCalledTimes(1);
  view.unmount();
  await act(async () => assignment.resolve({ ...A, deviceId: 'device-a', createdAt: null }));
  expect(navigation.navigate).not.toHaveBeenCalled(); expect(appListeners.size).toBe(0);
});

it('M04: a same-frame mode A -> B -> A change invalidates the pending preflight', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  send(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' }));
  act(() => {
    fireEvent.press(screen.getByRole('button', { name: 'Send whole course' }));
    fireEvent.press(screen.getByRole('button', { name: 'Send one lesson' }));
  });
  await act(async () => device.resolve({ id: 'device-a', name: 'Robot', batteryPercent: 90, online: true }));
  expect(createAssignment).not.toHaveBeenCalled();
});

it('M03/M04: refreshing new sends to B leaves the running A monitor identity pinned', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
  ready(); await flush();
  expect(navigation.navigate).toHaveBeenLastCalledWith('RunningScreen', expect.objectContaining({ assignmentId: 'assignment-a', assignmentVersion: 1, sessionId: 'session-a', lessonTitle: 'Lesson A' }));
  const monitorCalls = navigation.navigate.mock.calls.length;
  send(); await flush(); await focus(false);
  jest.mocked(getCourseLessons).mockResolvedValue([lessonB]); await focus(true); await flush();
  expect(navigation.navigate.mock.calls.slice(monitorCalls).every(call => call[1].assignmentId === 'assignment-a' && call[1].assignmentVersion === 1)).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' })); await flush();
  expect(createAssignment).toHaveBeenCalledWith(expect.objectContaining({ lessonVersion: 2 }));
});
