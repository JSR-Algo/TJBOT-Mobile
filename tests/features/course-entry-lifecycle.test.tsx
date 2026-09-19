import React from 'react';
import { View, AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import UnlockConfirmModal from '@/features/course-library/UnlockConfirmModal';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import NeedsSyncScreen from '@/features/course-library/screens/NeedsSyncScreen';
import type { RootStackParamList } from '@/navigation/routes';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import { getCourses, getCourseLessons, getCurrentAssignment, getPreloadStatus, createAssignment, enrollCourse, listChildEnrollments, normalizeAssignmentRefPayload, normalizeCurrentAssignmentPayload, normalizePreloadStatusPayload, type CurrentAssignment, type PublishedLesson } from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { clearRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import client from '@/services/http/client';

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
}));
jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));
const mockHousehold = { activeChild: { id: 'child-a', name: 'Child A' }, children: [{ id: 'child-a', name: 'Child A' }], activeHousehold: { id: 'household-a' }, setActiveChild: jest.fn() };
let mockMissingChild = false;
jest.mock('@/contexts/HouseholdContext', () => ({ useOptionalHousehold: () => mockMissingChild ? { ...mockHousehold, activeChild: undefined } : mockHousehold }));
jest.mock('@/services/http/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
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
const deviceA = { id: 'device-a', name: 'Robot', batteryPercent: 90, online: true, assignedChildProfileId: 'child-a' };
const enrollmentA: Awaited<ReturnType<typeof enrollCourse>> = { enrollment: { id: 'enrollment-a', courseId: 'course-a', childId: 'child-a', deviceId: 'device-a', status: 'ACTIVE', currentLessonKey: 'lesson-a' }, assignment: { ...A, id: A.assignmentId, deviceId: 'device-a' } };
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
function unlock(courseId = 'course-a') {
  return <UnlockConfirmModal navigation={navigation as never} route={{ key: 'u', name: 'UnlockConfirmScreen', params: { courseId } } as never} />;
}
function sync(params: object = { ...selected, courseId: 'course-a', profile: 'espTft' }) {
  return <NeedsSyncScreen navigation={navigation as never} route={{ key: 'n', name: 'NeedsSyncScreen', params } as never} />;
}
function send() {
  return render(<SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { courseId: 'course-a' } } as never} />);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers(); mockFocused = true;
  mockMissingChild = false;
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
  jest.mocked(enrollCourse).mockResolvedValue(enrollmentA);
  jest.mocked(createAssignment).mockResolvedValue({ ...A, deviceId: 'device-a', createdAt: null });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); appListeners.clear(); });

it.each(['Back', 'unmount', 'blur', 'background', 'account', 'household', 'child', 'course'] as const)('entry: Unlock preflight is fenced after %s', async change => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  const view = render(unlock());
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' }));
  if (change === 'Back') fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
  if (change === 'unmount') view.unmount();
  if (change === 'blur') { await focus(false); await focus(true); }
  if (change === 'background') { await foreground('background'); await foreground('active'); }
  if (change === 'account') { mockAuth.user.id = 'parent-b'; view.rerender(unlock()); mockAuth.user.id = 'parent-a'; view.rerender(unlock()); }
  if (change === 'household') { mockHousehold.activeHousehold.id = 'household-b'; view.rerender(unlock()); }
  if (change === 'child') { mockHousehold.activeChild.id = 'child-b'; view.rerender(unlock()); }
  if (change === 'course') { view.rerender(unlock('course-b')); view.rerender(unlock()); }
  await act(async () => device.resolve(deviceA));
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
});

it('entry: a dispatched enrollment cannot navigate after Back and is not replayed', async () => {
  const response = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
  jest.mocked(enrollCourse).mockReturnValueOnce(response.promise);
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
  await act(async () => response.resolve(enrollmentA));
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
});

it.each(['READY', 'RUNNING'] as const)('entry: real Unlock -> Added -> Ready chain preserves identity for %s', async state => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state });
  const view = render(<View>{unlock()}</View>); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(navigation.replace).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining({ ...selected, profile: 'espTft', courseId: 'course-a' }));
  const addedParams: RootStackParamList['CourseAddedScreen'] = navigation.replace.mock.calls[0][1];
  view.rerender(<View><CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: addedParams }} /></View>); await flush();
  fireEvent.press(screen.getByRole('button', { name: "Open today's lesson" })); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('RobotReadyScreen', expect.objectContaining({ ...selected, profile: 'espTft' }));
  const readyParams: RootStackParamList['RobotReadyScreen'] = navigation.navigate.mock.calls[0][1];
  view.rerender(<View><RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params: readyParams }} /></View>); await flush();
  if (state === 'READY') fireEvent.press(screen.getByRole('button', { name: 'Hand it to your child' }));
  expect(navigation.navigate).toHaveBeenCalledWith('RunningScreen', expect.objectContaining({ childId: A.childId, assignmentId: A.assignmentId, assignmentVersion: 1 }));
  expect(enrollCourse).toHaveBeenCalledTimes(1); expect(createAssignment).not.toHaveBeenCalled();
  expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
});

it('entry: NeedsSync generic READY cannot adopt an unrelated assignment', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, assignmentId: 'assignment-b' });
  render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
});
it('entry: NeedsSync preserves the exact selection for matching readbacks', async () => {
  render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining({ ...selected, courseId: 'course-a', profile: 'espTft' }));
});
it('entry: NeedsSync ignores preload after Back', async () => {
  const preload = deferred<Awaited<ReturnType<typeof getPreloadStatus>>>();
  jest.mocked(getPreloadStatus).mockReturnValueOnce(preload.promise);
  render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Go back' })); navigation.navigate.mockClear();
  await act(async () => preload.resolve({ assignmentId: A.assignmentId, profile: A.profile, state: 'READY', assets: [], criticalTotal: 1, criticalReady: 1 }));
  expect(navigation.navigate).not.toHaveBeenCalled();
});
it('entry: Added never displays an unrelated seat as selected readiness', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, assignmentId: 'assignment-b', lessonTitle: 'Unrelated B' });
  render(<CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { ...selected, courseId: 'course-a' } }} />); await flush();
  expect(screen.queryByText('Unrelated B')).toBeNull(); expect(screen.queryByText('Ready to play')).toBeNull();
});

it('route-contract: automatic resume A-B-A does not revive the first deferred A', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  const component = (id: string) => <SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { courseId: 'course-a', resumeContext: { courseId: id, childId: 'child-a' } } }} />;
  const view = render(component('course-a')); await flush(); view.rerender(component('course-b')); await flush(); view.rerender(component('course-a')); await flush();
  await act(async () => device.resolve(deviceA));
  expect(enrollCourse).not.toHaveBeenCalled(); expect(getDeviceStatus).toHaveBeenCalledTimes(1);
});
it('route-contract: manual preflight cannot survive resumeContext absent-B-absent', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  const view = send(); await flush(); fireEvent.press(screen.getByRole('button', { name: 'Send to Robot' }));
  view.rerender(<SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { courseId: 'course-a', resumeContext: { courseId: 'course-b', childId: 'child-a' } } }} />); await flush();
  view.rerender(<SendToRobotScreen navigation={navigation as never} route={{ key: 's', name: 'SendToRobotScreen', params: { courseId: 'course-a' } }} />); await flush();
  await act(async () => device.resolve(deviceA));
  expect(createAssignment).not.toHaveBeenCalled(); expect(enrollCourse).not.toHaveBeenCalled();
});

it.each(['unmount', 'blur', 'background', 'account', 'household', 'child', 'course'] as const)('entry: late enrollment success is fenced after %s', async change => {
  const response = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
  jest.mocked(enrollCourse).mockReturnValueOnce(response.promise);
  const view = render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  if (change === 'unmount') view.unmount();
  if (change === 'blur') { await focus(false); await focus(true); }
  if (change === 'background') { await foreground('background'); await foreground('active'); }
  if (change === 'account') { mockAuth.user.id = 'parent-b'; view.rerender(unlock()); }
  if (change === 'household') { mockHousehold.activeHousehold.id = 'household-b'; view.rerender(unlock()); }
  if (change === 'child') { mockHousehold.activeChild.id = 'child-b'; view.rerender(unlock()); }
  if (change === 'course') { view.rerender(unlock('course-b')); view.rerender(unlock()); }
  await act(async () => response.resolve(enrollmentA));
  expect(navigation.replace).not.toHaveBeenCalled(); expect(enrollCourse).toHaveBeenCalledTimes(1);
});
it.each(['id', 'childId', 'deviceId', 'manifestChecksum', 'profile', 'assignmentVersion'] as const)('entry: incomplete enrollment %s never fabricates identity or replays the write', async field => {
  const assignment = { ...enrollmentA.assignment, [field]: field === 'assignmentVersion' ? 0 : '' };
  jest.mocked(enrollCourse).mockResolvedValue({ ...enrollmentA, assignment });
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(navigation.replace).not.toHaveBeenCalled(); expect(enrollCourse).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Pick a different lesson' }));
  expect(navigation.navigate).toHaveBeenCalledWith('SendToRobotScreen', { courseId: 'course-a' });
  expect(enrollCourse).toHaveBeenCalledTimes(1);
});
it('entry: duplicate Unlock taps share one pending preflight and enrollment', async () => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>(); jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  render(unlock()); const button = screen.getByRole('button', { name: 'Add to Robot' });
  fireEvent.press(button); fireEvent.press(button); expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  await act(async () => device.resolve(deviceA)); expect(enrollCourse).toHaveBeenCalledTimes(1);
});

it.each(['device', 'current', 'preload'] as const)('entry: NeedsSync ignores stale %s after context A-B-A', async stage => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  const current = deferred<CurrentAssignment | null>();
  const preload = deferred<Awaited<ReturnType<typeof getPreloadStatus>>>();
  if (stage === 'device') jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  if (stage === 'current') jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise);
  if (stage === 'preload') jest.mocked(getPreloadStatus).mockReturnValueOnce(preload.promise);
  const params = { ...selected, deviceId: stage === 'device' ? undefined : selected.deviceId, profile: 'espTft' };
  const view = render(sync(params)); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  view.rerender(sync({ ...params, assignmentId: 'assignment-b' })); view.rerender(sync(params));
  await act(async () => { device.resolve(deviceA); current.resolve(A); preload.resolve({ assignmentId: A.assignmentId, state: 'READY', profile: A.profile, assets: [], criticalReady: 1, criticalTotal: 1 }); });
  expect(navigation.navigate).not.toHaveBeenCalled();
  if (stage === 'device') expect(getPreloadStatus).not.toHaveBeenCalled();
});
it.each(['unmount', 'blur', 'background', 'account', 'household', 'child', 'home', 'connection'] as const)('entry: NeedsSync ignores pending read after %s', async change => {
  const current = deferred<CurrentAssignment | null>(); jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise);
  const view = render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  if (change === 'unmount') view.unmount();
  if (change === 'blur') { await focus(false); await focus(true); }
  if (change === 'background') { await foreground('background'); await foreground('active'); }
  if (change === 'account') { mockAuth.user.id = 'parent-b'; view.rerender(sync()); }
  if (change === 'household') { mockHousehold.activeHousehold.id = 'household-b'; view.rerender(sync()); }
  if (change === 'child') { mockHousehold.activeChild.id = 'child-b'; view.rerender(sync()); }
  if (change === 'home') fireEvent.press(screen.getByRole('button', { name: "I'll do it later" }));
  if (change === 'connection') fireEvent.press(screen.getByText('Check Robot connection'));
  navigation.navigate.mockClear(); await act(async () => current.resolve(A));
  expect(navigation.navigate).not.toHaveBeenCalled(); expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
});
it.each(['UNASSIGNED', 'ASSIGNED', 'PRELOADING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'none', 'replacement', 'version', 'child', 'checksum', 'profile', 'preload-profile', 'preload-assignment', 'preload-incomplete'] as const)('entry: NeedsSync rejects %s', async variant => {
  const states = ['UNASSIGNED', 'ASSIGNED', 'PRELOADING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const current: CurrentAssignment = { ...A };
  if (states.includes(variant)) current.state = variant as CurrentAssignment['state'];
  if (variant === 'replacement') current.assignmentId = 'assignment-b';
  if (variant === 'version') current.assignmentVersion = 2;
  if (variant === 'child') current.childId = 'child-b';
  if (variant === 'checksum') current.manifestChecksum = 'hash-b';
  if (variant === 'profile') current.profile = 'other';
  jest.mocked(getCurrentAssignment).mockResolvedValue(variant === 'none' ? null : current);
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: variant === 'preload-assignment' ? 'assignment-b' : A.assignmentId, profile: variant === 'preload-profile' ? 'other' : A.profile, state: variant === 'preload-incomplete' ? 'PRELOADING' : 'READY', assets: [], criticalReady: 1, criticalTotal: 1 });
  render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).not.toHaveBeenCalled(); expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Pick a different lesson' })).toBeOnTheScreen();
});
it.each(['childId', 'assignmentId', 'assignmentVersion', 'manifestChecksum', 'profile'] as const)('entry: NeedsSync cannot infer missing %s from current', async field => {
  render(sync({ ...selected, profile: 'espTft', [field]: undefined }));
  fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).not.toHaveBeenCalled();
});
it('entry: NeedsSync duplicate taps use one read and recover from a failed read', async () => {
  jest.mocked(getCurrentAssignment).mockRejectedValueOnce(new Error('offline'));
  render(sync()); const button = screen.getByRole('button', { name: 'Reconnect Robot now' });
  fireEvent.press(button); fireEvent.press(button); await flush(); expect(getPreloadStatus).toHaveBeenCalledTimes(1);
  fireEvent.press(button); await flush(); expect(navigation.navigate).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining(selected));
});
it('entry: NeedsSync resolves a missing device without losing the supplied assignment identity', async () => {
  render(sync({ ...selected, deviceId: undefined, profile: 'espTft' }));
  fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(getDeviceStatus).toHaveBeenCalledWith('primary', 'child-a');
  expect(navigation.navigate).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining(selected));
});
it.each(['childId', 'assignmentVersion', 'profile', 'manifestChecksum', 'assignmentId'] as const)('entry: Added cannot adopt mismatched %s', async field => {
  render(<CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { ...selected, profile: 'espTft', [field]: field === 'assignmentVersion' ? 2 : 'different' } }} />); await flush();
  expect(screen.queryByText('Lesson A')).toBeNull(); expect(screen.queryByText('Ready to play')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Try again' })); await flush();
  expect(navigation.navigate).not.toHaveBeenCalled(); expect(createAssignment).not.toHaveBeenCalled(); expect(enrollCourse).not.toHaveBeenCalled();
});
it.each(['FAILED', 'CANCELLED', 'COMPLETED', 'UNASSIGNED', 'PAUSED'] as const)('entry: Added never presents %s as ready', async state => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state });
  render(<CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { ...selected, profile: 'espTft' } }} />); await flush();
  expect(screen.queryByText('Ready to play')).toBeNull(); expect(screen.queryByText("Open today's lesson")).toBeNull();
});
it('entry: Added refreshes on return and discards pending readback after account A-B-A', async () => {
  const current = deferred<CurrentAssignment | null>(); jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise).mockResolvedValue(null);
  const component = <CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { ...selected, profile: 'espTft' } }} />;
  const view = render(component); await flush();
  mockAuth.user.id = 'parent-b'; view.rerender(React.cloneElement(component)); mockAuth.user.id = 'parent-a'; view.rerender(React.cloneElement(component)); await flush();
  await act(async () => current.resolve(A)); expect(screen.queryByText('Ready to play')).toBeNull();
  await foreground('background'); jest.mocked(getCurrentAssignment).mockResolvedValue(A); await foreground('active'); await flush();
  expect(screen.getByText('Ready to play')).toBeOnTheScreen();
  view.unmount(); expect(appListeners.size).toBe(0); expect(mockFocusListeners.size).toBe(0);
});
it.each(['READY', 'RUNNING'] as const)('entry: Ready rejects a route profile mismatch in %s', async state => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state });
  ready({ ...selected, profile: 'different' }); await flush();
  expect(navigation.navigate).not.toHaveBeenCalled(); expect(screen.queryByText('Hand it to your child')).toBeNull();
});

it.each([undefined, null, 42, {}, ''])(
  'entry: response parsers preserve unknown profile %p rather than manufacture espTft', profile => {
    expect(normalizeAssignmentRefPayload({ ...enrollmentA.assignment, profile }).profile).toBe('');
    expect(normalizeCurrentAssignmentPayload({ ...A, profile })?.profile).toBe('');
    expect(normalizePreloadStatusPayload({ assignmentId: A.assignmentId, state: 'READY', profile }).profile).toBe('');
  },
);

it.each(['COMPLETED', 'FAILED', 'CANCELLED', 'UNASSIGNED'] as const)('entry: RUNNING cannot use contradictory preload %s', async state => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state, profile: A.profile, assets: [], criticalReady: 1, criticalTotal: 1 });
  ready({ ...selected, profile: A.profile }); await flush();
  expect(navigation.navigate).not.toHaveBeenCalled();
});
it('entry: Added does not describe contradictory terminal preload as a running lesson', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state: 'COMPLETED', profile: A.profile, assets: [], criticalReady: 1, criticalTotal: 1 });
  render(<CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { ...selected, profile: A.profile } }} />); await flush();
  expect(screen.queryByText('Lesson in progress')).toBeNull();
});

it.each(['Added', 'NeedsSync', 'Ready'] as const)('entry: %s rejects READY carrying a preload error', async target => {
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state: 'READY', profile: A.profile, errorCode: 'ASSET_PACK_NOT_READY', assets: [], criticalReady: 1, criticalTotal: 1 });
  if (target === 'Added') render(<CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { ...selected, profile: A.profile } }} />);
  if (target === 'Ready') ready({ ...selected, profile: A.profile });
  if (target === 'NeedsSync') { render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); }
  await flush(); expect(navigation.navigate).not.toHaveBeenCalled(); expect(screen.queryByText('Ready to play')).toBeNull(); expect(screen.queryByText('Hand it to your child')).toBeNull();
});
it.each(['device', 'enrollment'] as const)('entry: late Unlock %s rejection cannot publish an error in a new lifetime', async stage => {
  const device = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
  const enrollment = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
  if (stage === 'device') jest.mocked(getDeviceStatus).mockReturnValueOnce(device.promise);
  else jest.mocked(enrollCourse).mockReturnValueOnce(enrollment.promise);
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  await focus(false); await focus(true);
  await act(async () => { if (stage === 'device') device.reject({ code: 'NETWORK_ERROR' }); else enrollment.reject({ code: 'ROBOT_BUSY' }); });
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.queryByText('Could not check Robot right now. Check connection and try again.')).toBeNull();
  expect(screen.queryByText('Robot is finishing another lesson. Try again in a moment.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
});
it('entry: stale NeedsSync failure cannot overwrite a new screen lifetime', async () => {
  const preload = deferred<Awaited<ReturnType<typeof getPreloadStatus>>>(); jest.mocked(getPreloadStatus).mockReturnValueOnce(preload.promise);
  render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  await foreground('background'); await foreground('active'); await act(async () => preload.reject(new Error('offline')));
  expect(screen.queryByText("We couldn't reach Robot just now. Check Wi-Fi and try again.")).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining(selected));
});

it('review: NeedsSync rejoins matching RUNNING current and RUNNING preload', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state: 'RUNNING', profile: A.profile, assets: [], criticalReady: 1, criticalTotal: 1 });
  render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining(selected));
});
it('review: Unlock unverified response does not poison a different course selection', async () => {
  jest.mocked(enrollCourse).mockResolvedValueOnce({ ...enrollmentA, assignment: { ...enrollmentA.assignment, profile: '' } });
  const view = render(unlock());
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(screen.getByRole('button', { name: 'Pick a different lesson' })).toBeOnTheScreen();
  view.rerender(unlock('course-b')); await flush();
  expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
});

it.each(['course', 'child', 'account', 'household', 'device'] as const)('run06: uncertain A permits explicit %s B and blocks A-B-A replay', async change => {
  const malformed = { ...enrollmentA, assignment: { ...enrollmentA.assignment, profile: '' } };
  jest.mocked(enrollCourse).mockResolvedValue(malformed);
  const view = render(unlock());
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  if (change === 'account') mockAuth.user.id = 'parent-b';
  if (change === 'household') mockHousehold.activeHousehold.id = 'household-b';
  if (change === 'child') mockHousehold.activeChild.id = 'child-b';
  if (change === 'device') jest.mocked(getDeviceStatus).mockResolvedValue({ ...deviceA, id: 'device-b' });
  view.rerender(unlock(change === 'course' ? 'course-b' : 'course-a')); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
  expect(enrollCourse).toHaveBeenLastCalledWith(change === 'course' ? 'course-b' : 'course-a', {
    childId: change === 'child' ? 'child-b' : 'child-a', deviceId: change === 'device' ? 'device-b' : 'device-a',
  });
  mockAuth.user.id = 'parent-a'; mockHousehold.activeHousehold.id = 'household-a'; mockHousehold.activeChild.id = 'child-a';
  jest.mocked(getDeviceStatus).mockResolvedValue(deviceA);
  view.rerender(unlock()); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.getByText('Could not verify the added lesson. Check Robot or pick a lesson again.')).toBeOnTheScreen();
});

it.each(['blur', 'background'] as const)('run06: uncertain write survives %s without explicit or automatic replay', async change => {
  jest.mocked(enrollCourse).mockResolvedValueOnce({ ...enrollmentA, assignment: { ...enrollmentA.assignment, profile: '' } });
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  if (change === 'blur') { await focus(false); await focus(true); }
  else { await foreground('background'); await foreground('active'); }
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  expect(navigation.replace).not.toHaveBeenCalled();
});

it.each([
  { code: 'NETWORK_ERROR', message: 'Network request failed' },
  { code: 'UNKNOWN_ERROR', message: 'Unknown result' },
  { response: { status: 500, data: { message: 'Server failed after dispatch' } } },
  { response: { status: 504, data: { message: 'Timed out' } } },
])('run06: uncertain enrollment rejection %j cannot replay after an explicit Add', async error => {
  jest.mocked(enrollCourse).mockRejectedValueOnce(error);
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1); expect(navigation.replace).not.toHaveBeenCalled();
});

it('run06: definitive playability rejection retains the explicit retry path', async () => {
  jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 422, data: { error: { code: 'LESSON_NOT_PLAYABLE' } } } });
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(screen.getByText('This course is still preparing on the server. Try again in a moment.')).toBeOnTheScreen();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
  expect(navigation.replace).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining(selected));
});

it('run06: failed device lookup remains read-only and permits explicit retry', async () => {
  jest.mocked(getDeviceStatus).mockRejectedValueOnce(new Error('Network request failed'));
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  expect(navigation.replace).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining(selected));
});

it.each(['valid', 'malformed', 'rejected'] as const)('run06: pending A does not block B and late %s A cannot release B duplicate lock', async result => {
  const first = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
  const second = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
  jest.mocked(enrollCourse).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  view.rerender(unlock('course-b')); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
  await act(async () => {
    if (result === 'rejected') first.reject({ code: 'NETWORK_ERROR' });
    else first.resolve(result === 'valid' ? enrollmentA : { ...enrollmentA, assignment: { ...enrollmentA.assignment, profile: '' } });
  });
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.queryByText('Could not verify the added lesson. Check Robot or pick a lesson again.')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Adding...' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
  await act(async () => second.resolve({ ...enrollmentA, enrollment: { ...enrollmentA.enrollment, courseId: 'course-b' } }));
  expect(navigation.replace).toHaveBeenCalledTimes(1);
  expect(navigation.replace).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining({ courseId: 'course-b', ...selected }));
  view.rerender(unlock()); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
});

it.each(['blur', 'background', 'course'] as const)('run06: dispatched same A stays guarded across %s before and after late receipt', async change => {
  const first = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
  jest.mocked(enrollCourse).mockReturnValueOnce(first.promise);
  const view = render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  if (change === 'blur') { await focus(false); await focus(true); }
  if (change === 'background') { await foreground('background'); await foreground('active'); }
  if (change === 'course') { view.rerender(unlock('course-b')); view.rerender(unlock()); }
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  await act(async () => first.resolve(enrollmentA));
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1); expect(navigation.replace).not.toHaveBeenCalled();
});

it('run06: real NeedsSync -> Added -> Ready rejoins matching RUNNING without a write or start', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state: 'RUNNING', profile: A.profile, assets: [], criticalReady: 0, criticalTotal: 1 });
  const view = render(<View>{sync()}</View>);
  fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining({ ...selected, profile: A.profile }));
  const addedParams: RootStackParamList['CourseAddedScreen'] = navigation.navigate.mock.calls[0][1];
  view.rerender(<View><CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: addedParams }} /></View>); await flush();
  expect(screen.getByText('Lesson in progress')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: "Open today's lesson" })); await flush();
  const readyParams: RootStackParamList['RobotReadyScreen'] = navigation.navigate.mock.calls[1][1];
  view.rerender(<View><RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params: readyParams }} /></View>); await flush();
  expect(navigation.navigate).toHaveBeenCalledWith('RunningScreen', expect.objectContaining({ deviceId: 'device-a', childId: 'child-a', assignmentId: 'assignment-a', assignmentVersion: 1, sessionId: 'session-a' }));
  expect(enrollCourse).not.toHaveBeenCalled(); expect(createAssignment).not.toHaveBeenCalled();
  expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
});

it.each(['FAILED', 'PAUSED', 'COMPLETED', 'CANCELLED', 'PRELOADING', 'ASSIGNED', 'UNASSIGNED', 'error', 'assignment', 'profile', 'child', 'version', 'checksum', 'ready-current'] as const)('run06: NeedsSync rejects RUNNING contradiction or mismatch %s', async variant => {
  const current: CurrentAssignment = { ...A, state: 'RUNNING' };
  const preload: Awaited<ReturnType<typeof getPreloadStatus>> = { assignmentId: A.assignmentId, state: 'RUNNING', profile: A.profile, assets: [], criticalReady: 1, criticalTotal: 1 };
  if (['FAILED', 'PAUSED', 'COMPLETED', 'CANCELLED', 'PRELOADING', 'ASSIGNED', 'UNASSIGNED'].includes(variant)) preload.state = variant as typeof preload.state;
  if (variant === 'error') preload.errorCode = 'ASSET_CHECKSUM_MISMATCH';
  if (variant === 'assignment') preload.assignmentId = 'assignment-b';
  if (variant === 'profile') preload.profile = 'other';
  if (variant === 'child') current.childId = 'child-b';
  if (variant === 'version') current.assignmentVersion = 2;
  if (variant === 'checksum') current.manifestChecksum = 'hash-b';
  if (variant === 'ready-current') current.state = 'READY';
  jest.mocked(getCurrentAssignment).mockResolvedValue(current); jest.mocked(getPreloadStatus).mockResolvedValue(preload);
  render(sync()); fireEvent.press(screen.getByRole('button', { name: 'Reconnect Robot now' })); await flush();
  expect(navigation.navigate).not.toHaveBeenCalled(); expect(enrollCourse).not.toHaveBeenCalled();
});

it('review: post-assignment COURSE_NOT_AVAILABLE remains uncertain and cannot replay', async () => {
  jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 404, data: { error: 'COURSE_NOT_AVAILABLE', message: 'Course is not available' } } });
  render(unlock()); fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  const retry = screen.queryByRole('button', { name: 'Add to Robot' });
  if (retry) fireEvent.press(retry);
  await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  expect(navigation.replace).not.toHaveBeenCalled();
});

const courseUnavailable = { response: { status: 404, data: { error: 'COURSE_NOT_AVAILABLE', message: 'Course is not available' } } };
async function tryExplicitAdd() {
  const button = screen.queryByRole('button', { name: 'Add to Robot' });
  if (button) fireEvent.press(button);
  await flush();
}

it('run15 A1: Unlock without a selected child reports recovery without reading or writing', async () => {
  mockMissingChild = true;
  render(unlock());
  await userEvent.setup().press(screen.getByRole('button', { name: 'Add to Robot' }));
  expect(screen.getByText('Add a child to this account before adding a course to Robot.')).toBeOnTheScreen();
  expect(getDeviceStatus).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
});

it('run15 A1: normalized transport failure permits only an explicit device read retry', async () => {
  jest.mocked(getDeviceStatus).mockRejectedValueOnce(new Error('Network Error'));
  render(unlock()); const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
  expect(screen.getByText('Could not check Robot right now. Check connection and try again.')).toBeOnTheScreen();
  expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  expect(enrollCourse).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
  expect(getDeviceStatus).toHaveBeenLastCalledWith('primary', 'child-a');
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  expect(enrollCourse).toHaveBeenCalledWith('course-a', { childId: 'child-a', deviceId: 'device-a' });
  expect(navigation.replace).toHaveBeenCalledTimes(1);
  expect(navigation.replace).toHaveBeenCalledWith('CourseAddedScreen', { ...selected, profile: 'espTft', courseId: 'course-a' });
  expect(createAssignment).not.toHaveBeenCalled();
});

it('run15 A1: an actual empty household device response cannot dispatch enrollment', async () => {
  const actual: typeof import('@/services/api/device.api') = jest.requireActual('@/services/api/device.api');
  jest.mocked(client.get).mockResolvedValue({ data: [] });
  jest.mocked(getDeviceStatus).mockImplementationOnce(actual.getDeviceStatus);
  render(unlock());
  await userEvent.setup().press(screen.getByRole('button', { name: 'Add to Robot' }));
  expect(screen.getByText('No Robot yet — connect Robot before adding a course.')).toBeOnTheScreen();
  expect(client.get).toHaveBeenCalledTimes(1);
  expect(client.get).toHaveBeenCalledWith('/devices/household/me');
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
});

it('run15 A1: no-course Unlock Back opens the library without a device or enrollment request', async () => {
  render(unlock(''));
  await userEvent.setup().press(screen.getByRole('button', { name: 'Go back' }));
  expect(navigation.navigate.mock.calls).toEqual([['CourseLibraryScreen']]);
  expect(getDeviceStatus).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
});

it('run15 A1: Added without a receipt opens the selected course picker once without replay', async () => {
  render(<CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { courseId: 'course-a' } }} />);
  await flush(); const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: "Send today's lesson now" }));
  await user.press(screen.getByRole('button', { name: "Send today's lesson now" }));
  expect(navigation.navigate.mock.calls).toEqual([['SendToRobotScreen', { courseId: 'course-a' }]]);
  expect(getCurrentAssignment).not.toHaveBeenCalled();
  expect(getPreloadStatus).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
});

it('run15 A1: failed NeedsSync escapes to its course picker and cannot reconnect after leaving', async () => {
  jest.mocked(getPreloadStatus).mockRejectedValueOnce(new Error('Network Error'));
  render(sync()); const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Reconnect Robot now' }));
  expect(screen.getByText("We couldn't reach Robot just now. Check Wi-Fi and try again.")).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Pick a different lesson' }));
  await user.press(screen.getByRole('button', { name: 'Reconnect Robot now' }));
  expect(navigation.navigate.mock.calls).toEqual([['SendToRobotScreen', { courseId: 'course-a' }]]);
  expect(getPreloadStatus).toHaveBeenCalledTimes(1);
  expect(getCurrentAssignment).toHaveBeenCalledTimes(1);
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
});

it('run15 A1: Ready without a device escapes to the picker without any readiness read or write', async () => {
  ready({});
  expect(screen.getAllByText("We can't prepare Robot because no device was selected.")).not.toHaveLength(0);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Pick a different lesson' }));
  expect(navigation.navigate.mock.calls).toEqual([['SendToRobotScreen']]);
  expect(getCurrentAssignment).not.toHaveBeenCalled();
  expect(getPreloadStatus).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled();
});

it('run15 A2: eighteen rejected readiness reads stall until explicit retry and preserve Running identity', async () => {
  jest.mocked(getCurrentAssignment).mockRejectedValue(new Error('read failed'));
  jest.mocked(getPreloadStatus).mockRejectedValue(new Error('read failed'));
  const view = ready(); await flush();
  for (let attempt = 1; attempt < 18; attempt++) {
    await act(async () => { jest.advanceTimersByTime(2500); });
  }
  expect(getCurrentAssignment).toHaveBeenCalledTimes(18);
  expect(getPreloadStatus).toHaveBeenCalledTimes(18);
  expect(screen.getAllByText('Robot is taking longer than expected.')).not.toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(getCurrentAssignment).toHaveBeenCalledTimes(18);
  expect(getPreloadStatus).toHaveBeenCalledTimes(18);
  expect(navigation.navigate).not.toHaveBeenCalled();
  jest.mocked(getCurrentAssignment).mockResolvedValue(A);
  jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state: 'READY', profile: A.profile, assets: [], criticalTotal: 1, criticalReady: 1 });
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(getCurrentAssignment).toHaveBeenCalledTimes(19);
  expect(getPreloadStatus).toHaveBeenCalledTimes(19);
  await user.press(screen.getByRole('button', { name: 'Hand it to your child' }));
  expect(navigation.navigate.mock.calls).toEqual([['RunningScreen', { deviceId: 'device-a', childId: 'child-a', assignmentId: 'assignment-a', assignmentVersion: 1, sessionId: 'session-a', lessonTitle: 'Lesson A' }]]);
  expect(enrollCourse).not.toHaveBeenCalled(); expect(createAssignment).not.toHaveBeenCalled();
  view.unmount();
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(getCurrentAssignment).toHaveBeenCalledTimes(19);
  expect(getPreloadStatus).toHaveBeenCalledTimes(19);
});

it('run15 A3: Added keeps current readiness when the previous focused read rejects late', async () => {
  const old = deferred<CurrentAssignment | null>();
  jest.mocked(getCurrentAssignment).mockReturnValueOnce(old.promise);
  render(<CourseAddedScreen navigation={navigation as never} route={{ key: 'a', name: 'CourseAddedScreen', params: { ...selected, profile: 'espTft', courseId: 'course-a' } }} />);
  await flush(); await focus(false); await focus(true); await flush();
  expect(screen.getByText('Ready to play')).toBeOnTheScreen();
  await act(async () => old.reject(new Error('old read failed')));
  expect(screen.getByText('Ready to play')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: "Open today's lesson" }));
  expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', { ...selected, courseId: 'course-a', profile: 'espTft' }]]);
  expect(enrollCourse).not.toHaveBeenCalled(); expect(createAssignment).not.toHaveBeenCalled();
});

it('run15 A5: valid enrollment with absent raw assignment remains unverified and cannot replay', async () => {
  const actual: typeof import('@/services/api/course-library.api') = jest.requireActual('@/services/api/course-library.api');
  jest.mocked(client.post).mockResolvedValue({ data: { data: { enrollment: enrollmentA.enrollment } } });
  jest.mocked(enrollCourse).mockImplementation(actual.enrollCourse);
  render(unlock()); const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
  expect(screen.getByText('Could not verify the added lesson. Check Robot or pick a lesson again.')).toBeOnTheScreen();
  expect(jest.mocked(client.post).mock.calls).toEqual([['/courses/course-a/enroll', { childId: 'child-a', deviceId: 'device-a' }]]);
  expect(navigation.replace).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
  await user.press(screen.getByRole('button', { name: 'Pick a different lesson' }));
  expect(enrollCourse).toHaveBeenCalledTimes(1); expect(client.post).toHaveBeenCalledTimes(1);
  expect(navigation.navigate.mock.calls).toEqual([['SendToRobotScreen', { courseId: 'course-a' }]]);
  expect(createAssignment).not.toHaveBeenCalled();
});

it.each([
  { response: { status: 404, data: { error: { code: 'COURSE_NOT_AVAILABLE', message: 'Course is not available' } } } },
  { response: { status: 404, data: { code: 'COURSE_NOT_AVAILABLE', message: 'Course is not available' } } },
  { status: 404, code: 'COURSE_NOT_AVAILABLE', message: 'Course is not available', retryable: true },
  { response: { status: 409, data: { code: 'ASSET_PACK_NOT_READY', message: 'Generation requested', retryable: true } } },
  { response: { status: 422, data: { code: 'FUTURE_DOMAIN_ERROR', message: 'Unknown disposition', retryable: true } } },
  { response: { status: 400, data: { code: 'VALIDATION_ERROR', message: 'Unproven boundary' } } },
  { response: { status: 403, data: { code: 'FORBIDDEN', message: 'Unproven boundary' } } },
  { response: { status: 409, data: { code: 'ROBOT_BUSY', message: 'Unproven boundary' } } },
  { response: { status: 404, data: {} } },
])('run07: unproven dispatched outcome %j retains its guard', async error => {
  jest.mocked(enrollCourse).mockRejectedValueOnce(error);
  render(unlock()); await tryExplicitAdd();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  await tryExplicitAdd();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled(); expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
});

it.each([undefined, 200, 400, 404, 408, 409, 412, 500, 504])('run07: playability code with unsupported status %s is unresolved', async status => {
  jest.mocked(enrollCourse).mockRejectedValueOnce({ code: 'LESSON_NOT_PLAYABLE', message: 'Could not verify disposition', status, retryable: true });
  render(unlock()); await tryExplicitAdd(); await tryExplicitAdd();
  expect(enrollCourse).toHaveBeenCalledTimes(1); expect(navigation.replace).not.toHaveBeenCalled();
});

it.each([
  { response: { status: 422, data: { error: 'LESSON_NOT_PLAYABLE', message: 'Missing critical assets' } } },
  { response: { status: 422, data: { code: 'LESSON_NOT_PLAYABLE', message: 'Missing critical assets' } } },
  { status: 422, code: 'LESSON_NOT_PLAYABLE', message: 'Missing critical assets', retryable: false },
])('run07: canonical pre-write playability response %j permits explicit retry', async error => {
  jest.mocked(enrollCourse).mockRejectedValueOnce(error);
  render(unlock()); await tryExplicitAdd();
  expect(screen.getByText('This course is still preparing on the server. Try again in a moment.')).toBeOnTheScreen();
  expect(enrollCourse).toHaveBeenCalledTimes(1); expect(navigation.replace).not.toHaveBeenCalled();
  await tryExplicitAdd();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
  expect(navigation.replace).toHaveBeenCalledWith('CourseAddedScreen', expect.objectContaining(selected));
});

it.each(['course', 'child', 'account', 'household', 'device'] as const)('run07: 404 A allows distinct %s B and guards A-B-A', async change => {
  jest.mocked(enrollCourse).mockRejectedValueOnce(courseUnavailable)
    .mockResolvedValueOnce({ ...enrollmentA, assignment: { ...enrollmentA.assignment, profile: '' } });
  const view = render(unlock()); await tryExplicitAdd();
  if (change === 'course') view.rerender(unlock('course-b'));
  if (change === 'child') mockHousehold.activeChild.id = 'child-b';
  if (change === 'account') mockAuth.user.id = 'parent-b';
  if (change === 'household') mockHousehold.activeHousehold.id = 'household-b';
  if (change === 'device') jest.mocked(getDeviceStatus).mockResolvedValue({ ...deviceA, id: 'device-b' });
  view.rerender(unlock(change === 'course' ? 'course-b' : 'course-a')); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' })); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(2);
  expect(enrollCourse).toHaveBeenLastCalledWith(change === 'course' ? 'course-b' : 'course-a', {
    childId: change === 'child' ? 'child-b' : 'child-a', deviceId: change === 'device' ? 'device-b' : 'device-a',
  });
  mockAuth.user.id = 'parent-a'; mockHousehold.activeHousehold.id = 'household-a'; mockHousehold.activeChild.id = 'child-a';
  jest.mocked(getDeviceStatus).mockResolvedValue(deviceA); view.rerender(unlock()); await flush();
  await tryExplicitAdd();
  expect(enrollCourse).toHaveBeenCalledTimes(2); expect(navigation.replace).not.toHaveBeenCalled();
});

it.each(['blur', 'background', 'course', 'child', 'account', 'household'] as const)('run07: late 404 after %s A-B-A cannot release the original guard', async change => {
  const first = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
  jest.mocked(enrollCourse).mockReturnValueOnce(first.promise);
  const view = render(unlock()); await tryExplicitAdd();
  if (change === 'blur') { await focus(false); await focus(true); }
  if (change === 'background') { await foreground('background'); await foreground('active'); }
  if (change === 'course') { view.rerender(unlock('course-b')); view.rerender(unlock()); }
  if (change === 'child') { mockHousehold.activeChild.id = 'child-b'; view.rerender(unlock()); mockHousehold.activeChild.id = 'child-a'; view.rerender(unlock()); }
  if (change === 'account') { mockAuth.user.id = 'parent-b'; view.rerender(unlock()); mockAuth.user.id = 'parent-a'; view.rerender(unlock()); }
  if (change === 'household') { mockHousehold.activeHousehold.id = 'household-b'; view.rerender(unlock()); mockHousehold.activeHousehold.id = 'household-a'; view.rerender(unlock()); }
  await act(async () => first.reject(courseUnavailable));
  expect(navigation.replace).not.toHaveBeenCalled();
  await tryExplicitAdd();
  expect(enrollCourse).toHaveBeenCalledTimes(1); expect(navigation.replace).not.toHaveBeenCalled();
});
