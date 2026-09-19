import React from 'react';
import { Alert, AppState, View } from 'react-native';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import RunningScreen from '@/features/course-library/screens/RunningScreen';
import CompanionScreen from '@/features/course-library/screens/CompanionScreen';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import { getCourses, getCourseLessons, getCurrentAssignment, getAssignmentReadback, getPreloadStatus, createAssignment, enrollCourse,
  listChildEnrollments, cancelCourseEnrollment, normalizeAssignmentRefPayload, normalizeEnrollmentPayload, normalizePublishedLessonsPayload, parseAssignmentReadback,
  type CurrentAssignment } from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { clearRecoveryCheckpoint, writeRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import { openRealtime } from '@/services/ws/realtime';

jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'),
  getCourses: jest.fn(), getCourseLessons: jest.fn(), getCurrentAssignment: jest.fn(), getAssignmentReadback: jest.fn(), getPreloadStatus: jest.fn(),
  createAssignment: jest.fn(), enrollCourse: jest.fn(), listChildEnrollments: jest.fn(), cancelCourseEnrollment: jest.fn(),
}));
jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));
const child = { id: '11111111-1111-4111-8111-111111111111', name: 'Child A' };
const sibling = { id: '33333333-3333-4333-8333-333333333333', name: 'Child B' };
const mockHousehold = { activeChild: child as typeof child | undefined, children: [child, sibling],
  activeHousehold: { id: 'household-a' }, setActiveChild: jest.fn() };
jest.mock('@/contexts/HouseholdContext', () => ({ useOptionalHousehold: () => mockHousehold }));
jest.mock('@/features/fallback/recoveryCheckpointStore', () => ({ clearRecoveryCheckpoint: jest.fn(), writeRecoveryCheckpoint: jest.fn() }));
jest.mock('@/services/ws/realtime', () => ({ openRealtime: jest.fn() }));
jest.mock('@/services/observability/sentry', () => ({ captureError: jest.fn() }));

const courseId = 'english-6month-4-6';
const deviceId = '22222222-2222-4222-8222-222222222222';
const lesson = { lessonId: 'w01-greetings-politeness', lessonVersion: 1, title: 'Greetings', profile: 'espTft', manifestReady: true };
const A: CurrentAssignment = { assignmentId: '44444444-4444-4444-8444-444444444444', assignmentVersion: 1,
  childId: child.id, lessonId: lesson.lessonId, lessonTitle: lesson.title, lessonVersion: 1,
  profile: 'espTft', manifestChecksum: 'a'.repeat(64), state: 'READY', sessionId: null };
const robot = { id: deviceId, name: 'Robot A', online: true, batteryPercent: 80, assignedChildProfileId: child.id };
const enrollment = normalizeEnrollmentPayload({ id: '55555555-5555-4555-8555-555555555555', courseId,
  childId: child.id, deviceId, status: 'active', currentLessonKey: lesson.lessonId });
const receipt = { enrollment, assignment: normalizeAssignmentRefPayload({ ...A, deviceId }) };
const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
const conflict = { response: { status: 409, data: { error: { code: 'ROBOT_BUSY' } } } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function press(name: string) { fireEvent.press(screen.getByRole('button', { name })); await flush(); }
function detail(id = courseId) {
  return <CourseDetailScreen navigation={navigation as never} route={{ key: 'detail', name: 'CourseDetailScreen', params: { courseId: id } } as never} />;
}
function send(params: object = { courseId }) {
  return <SendToRobotScreen navigation={navigation as never} route={{ key: 'send', name: 'SendToRobotScreen', params } as never} />;
}
function confirmCancel() {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  const confirm = buttons?.find(button => button.text === 'Cancel course');
  expect(confirm?.onPress).toBeDefined();
  act(() => confirm?.onPress?.());
}
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers();
  mockHousehold.activeChild = child;
  jest.mocked(AppState.addEventListener).mockReturnValue({ remove: jest.fn() });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(getCourses).mockResolvedValue([{ courseId, title: 'English course', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue([lesson]);
  jest.mocked(getCurrentAssignment).mockResolvedValue(A);
  jest.mocked(getAssignmentReadback).mockResolvedValue({ kind: 'none' });
  jest.mocked(getDeviceStatus).mockResolvedValue(robot);
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [enrollment] });
  jest.mocked(enrollCourse).mockResolvedValue(receipt);
  jest.mocked(createAssignment).mockResolvedValue({ ...A, deviceId, createdAt: null });
  jest.mocked(cancelCourseEnrollment).mockResolvedValue({ cancelled: true });
  jest.mocked(writeRecoveryCheckpoint).mockResolvedValue(undefined);
  jest.mocked(clearRecoveryCheckpoint).mockResolvedValue(undefined);
  jest.mocked(openRealtime).mockResolvedValue({ url: 'inert', close: jest.fn(), send: jest.fn() });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

describe('CourseDetail public lifecycle boundaries', () => {
  it('C1: offers connection recovery from Add without a selected child', async () => {
    mockHousehold.activeChild = undefined;
    const user = userEvent.setup();
    render(detail()); await flush();
    expect(screen.getByText('English course')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
    await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
    expect(screen.getByRole('alert', { name: "Robot isn't ready yet" })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
    expect(screen.getByRole('alert', { name: "Robot isn't ready yet" })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Connect Robot' }));
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(navigation.navigate.mock.calls).toEqual([['DeviceOverviewScreen']]);
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(getDeviceStatus).not.toHaveBeenCalled();
    expect(listChildEnrollments).not.toHaveBeenCalled();
    expect(enrollCourse).not.toHaveBeenCalled();
    expect(createAssignment).not.toHaveBeenCalled();
  });

  it('C2: retries a Resume preparation error only after an explicit parent action', async () => {
    jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [{ ...enrollment, status: 'PAUSED' }] });
    jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSET_PACK_NOT_READY' } } } });
    const user = userEvent.setup();
    render(detail()); await flush();
    await user.press(screen.getByRole('button', { name: 'Resume course' })); await flush();
    expect(screen.getByText('This lesson is still being prepared. Tap to try again in a moment.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resume course' })).toBeEnabled();
    expect(getCurrentAssignment).not.toHaveBeenCalled();
    expect(getCourseLessons).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    await flush();
    expect(jest.mocked(enrollCourse).mock.calls).toEqual([[courseId, { childId: child.id, deviceId }]]);
    expect(getDeviceStatus).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole('button', { name: 'Resume course' })); await flush();
    expect(enrollCourse).toHaveBeenCalledTimes(2);
    expect(jest.mocked(getDeviceStatus).mock.calls).toEqual([['primary', child.id], ['primary', child.id]]);
    expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', {
      childId: child.id, courseId, deviceId, assignmentId: A.assignmentId,
      assignmentVersion: A.assignmentVersion, lessonTitle: A.lessonTitle, manifestChecksum: A.manifestChecksum,
    }]]);
    expect(screen.queryByText('This lesson is still being prepared. Tap to try again in a moment.')).not.toBeOnTheScreen();
    expect(createAssignment).not.toHaveBeenCalled();
  });

  it('C3: ignores rejected Add preflight after replacement of the detail screen', async () => {
    const old = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
    jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [] });
    jest.mocked(getDeviceStatus).mockReturnValueOnce(old.promise);
    const user = userEvent.setup();
    const origin = render(detail()); await flush();
    await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
    expect(getDeviceStatus).toHaveBeenCalledWith('primary', child.id);
    origin.unmount();
    render(detail()); await flush();
    expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
    await act(async () => old.reject(new Error('obsolete device preflight')));
    expect(screen.getByText('English course')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(enrollCourse).not.toHaveBeenCalled();
    expect(createAssignment).not.toHaveBeenCalled();
    expect(getDeviceStatus).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole('button', { name: 'Back to library' }));
    expect(navigation.navigate.mock.calls).toEqual([['CourseLibraryScreen']]);
  });

  it('shows unavailable enrollment status and recovers when the selected child changes', async () => {
    jest.mocked(listChildEnrollments).mockRejectedValueOnce(new Error('read unavailable')).mockResolvedValue({ enrollments: [] });
    const view = render(detail()); await flush();
    expect(screen.getByText('Course status unavailable right now')).toBeOnTheScreen();
    expect(enrollCourse).not.toHaveBeenCalled();
    mockHousehold.activeChild = sibling; view.rerender(detail()); await flush();
    expect(listChildEnrollments).toHaveBeenLastCalledWith(sibling.id);
    expect(screen.queryByText('Course status unavailable right now')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
  });

  it('ignores an old enrollment rejection after another course has loaded', async () => {
    const old = deferred<Awaited<ReturnType<typeof listChildEnrollments>>>();
    jest.mocked(listChildEnrollments).mockReturnValueOnce(old.promise).mockResolvedValue({ enrollments: [] });
    const view = render(detail()); await flush();
    view.rerender(detail('another-course')); await flush();
    await act(async () => old.reject(new Error('late failure')));
    expect(screen.queryByText('Course status unavailable right now')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
  });

  it.each(['offline', 'missing', 'rejected'] as const)('offers device recovery after a %s resume preflight', async kind => {
    if (kind === 'rejected') jest.mocked(getDeviceStatus).mockRejectedValueOnce({ code: 'ROBOT_OFFLINE', message: 'Device offline' });
    else jest.mocked(getDeviceStatus).mockResolvedValueOnce({ ...robot, online: kind !== 'offline', id: kind === 'missing' ? '' : deviceId });
    render(detail()); await flush(); await press('Continue course');
    expect(enrollCourse).not.toHaveBeenCalled(); expect(navigation.navigate).not.toHaveBeenCalled();
    if (kind === 'rejected') expect(screen.getByText(/check it.s on and connected/i)).toBeOnTheScreen();
    else {
      expect(screen.getByRole('alert', { name: "Robot isn't ready yet" })).toBeOnTheScreen();
      await press('Not now');
    }
    jest.mocked(getDeviceStatus).mockResolvedValue(robot);
    await press('Continue course');
    expect(enrollCourse).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('RobotReadyScreen', expect.objectContaining({ assignmentId: A.assignmentId, assignmentVersion: 1, childId: child.id, courseId }));
  });

  it.each(['success', 'failure'] as const)('ignores an old resume %s after course selection changes', async outcome => {
    const pending = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
    jest.mocked(enrollCourse).mockReturnValueOnce(pending.promise);
    const view = render(detail()); await flush(); await press('Continue course');
    expect(enrollCourse).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Preparing course' })).toBeDisabled();
    view.rerender(detail('another-course')); await flush();
    await act(async () => outcome === 'success' ? pending.resolve(receipt) : pending.reject(conflict));
    expect(navigation.navigate).not.toHaveBeenCalled(); expect(getCurrentAssignment).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
  });

  it.each(['null', 'rejected'] as const)('retains the current screen when conflict readback is %s', async kind => {
    jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
    if (kind === 'null') jest.mocked(getCurrentAssignment).mockResolvedValueOnce(null);
    else jest.mocked(getCurrentAssignment).mockRejectedValueOnce({ code: 'ROBOT_OFFLINE', message: 'Device offline' });
    render(detail()); await flush(); await press('Continue course');
    expect(getCurrentAssignment).toHaveBeenCalledWith(deviceId);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Continue course' })).toBeEnabled();
    expect(enrollCourse).toHaveBeenCalledTimes(1);
  });

  it('rejects a conflict continuation after unmount', async () => {
    const current = deferred<CurrentAssignment | null>();
    jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
    jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise);
    const view = render(detail()); await flush(); await press('Continue course');
    expect(getCurrentAssignment).toHaveBeenCalledTimes(1); view.unmount();
    await act(async () => current.resolve(A));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('reports a cancellation that did not change a concurrently active enrollment', async () => {
    jest.mocked(cancelCourseEnrollment).mockResolvedValueOnce({ cancelled: false });
    render(detail()); await flush(); await press('Cancel course'); confirmCancel(); await flush();
    expect(cancelCourseEnrollment).toHaveBeenCalledWith(courseId, child.id);
    expect(listChildEnrollments).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Course active')).toBeOnTheScreen();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel course' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Resume course' })).not.toBeOnTheScreen();
    expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
    jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [{ ...enrollment, status: 'CANCELLED' }] });
    await press('Cancel course'); confirmCancel(); await flush();
    expect(cancelCourseEnrollment).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Course cancelled')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resume course' })).toBeEnabled();
    expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
  });

  it('shows unavailable readback after cancellation without claiming a completed lesson', async () => {
    jest.mocked(listChildEnrollments).mockResolvedValueOnce({ enrollments: [enrollment] }).mockRejectedValue(new Error('readback unavailable'));
    render(detail()); await flush(); await press('Cancel course'); confirmCancel(); await flush();
    expect(screen.getByText('Course status unavailable right now')).toBeOnTheScreen();
    expect(screen.queryByText('Course cancelled')).not.toBeOnTheScreen();
    expect(clearRecoveryCheckpoint).not.toHaveBeenCalled(); expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('ignores an alert confirmation from the previously selected course', async () => {
    const view = render(detail()); await flush(); await press('Cancel course');
    view.rerender(detail('another-course')); await flush(); confirmCancel(); await flush();
    expect(cancelCourseEnrollment).not.toHaveBeenCalled(); expect(enrollCourse).not.toHaveBeenCalled();
  });

  it('ignores a cancellation failure after unmount', async () => {
    const pending = deferred<Awaited<ReturnType<typeof cancelCourseEnrollment>>>();
    jest.mocked(cancelCourseEnrollment).mockReturnValueOnce(pending.promise);
    const view = render(detail()); await flush(); await press('Cancel course'); confirmCancel(); await flush();
    expect(screen.getByRole('button', { name: 'Cancelling course' })).toBeDisabled();
    view.unmount(); await act(async () => pending.reject(new Error('late cancel failure')));
    expect(listChildEnrollments).toHaveBeenCalledTimes(1); expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe('Send public operation boundaries', () => {
  it('C6: ignores automatic resume preflight rejection after unmount without replay', async () => {
    const old = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
    jest.mocked(getDeviceStatus).mockReturnValueOnce(old.promise);
    const origin = render(send({ courseId, resumeContext: { courseId, childId: child.id, deviceId } }));
    await flush();
    expect(getDeviceStatus).toHaveBeenCalledWith(deviceId);
    origin.unmount();
    render(send()); await flush();
    expect(screen.getByRole('button', { name: 'Pick lesson Greetings', selected: true })).toBeOnTheScreen();
    await act(async () => old.reject({ code: 'ROBOT_OFFLINE', message: 'Device offline' }));
    await flush();
    expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
    expect(screen.queryByText(/check it.s on and connected/i)).not.toBeOnTheScreen();
    expect(getDeviceStatus).toHaveBeenCalledTimes(1);
    expect(enrollCourse).not.toHaveBeenCalled();
    expect(createAssignment).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Send whole course' }));
    expect(screen.getByRole('button', { name: 'Assign course' })).toBeEnabled();
    expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  });

  it('C7: preserves the new course selection after an obsolete manual preflight rejects', async () => {
    const old = deferred<Awaited<ReturnType<typeof getDeviceStatus>>>();
    jest.mocked(getCourses).mockResolvedValue([
      { courseId, title: 'English course', lessonCount: 1 },
      { courseId: 'course-b', title: 'Course B', lessonCount: 1 },
    ]);
    jest.mocked(getCourseLessons).mockImplementation(async id => id === courseId ? [lesson] : [
      { ...lesson, lessonId: 'lesson-b', title: 'Lesson B' },
    ]);
    jest.mocked(getDeviceStatus).mockReturnValueOnce(old.promise);
    const user = userEvent.setup();
    render(send()); await flush();
    await user.press(screen.getByRole('button', { name: 'Send to Robot' }));
    expect(getDeviceStatus).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole('button', { name: 'Pick course Course B' }));
    expect(screen.getByRole('button', { name: 'Pick lesson Lesson B', selected: true })).toBeOnTheScreen();
    await act(async () => old.reject({ code: 'ROBOT_OFFLINE', message: 'Device offline' }));
    await flush();
    expect(screen.getByRole('button', { name: 'Pick course Course B', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pick lesson Lesson B', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
    expect(screen.queryByText('Greetings')).not.toBeOnTheScreen();
    expect(screen.queryByText(/check it.s on and connected/i)).not.toBeOnTheScreen();
    expect(getDeviceStatus).toHaveBeenCalledTimes(1);
    expect(getCurrentAssignment).not.toHaveBeenCalled();
    expect(enrollCourse).not.toHaveBeenCalled();
    expect(createAssignment).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows the supported course preparation failure without navigation or automatic replay', async () => {
    jest.mocked(enrollCourse).mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'ASSET_PACK_NOT_READY' } } } });
    render(send()); await flush(); await press('Send whole course'); await press('Assign course');
    expect(screen.getByText('This lesson is still being prepared. Tap to try again in a moment.')).toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled(); expect(getCurrentAssignment).not.toHaveBeenCalled();
    await flush(); expect(enrollCourse).toHaveBeenCalledTimes(1);
  });

  it('carries a recovered assignment through Ready into the running recovery checkpoint', async () => {
    jest.mocked(createAssignment).mockRejectedValueOnce(conflict);
    jest.mocked(getPreloadStatus).mockResolvedValue({ assignmentId: A.assignmentId, state: 'READY', profile: 'espTft', criticalTotal: 1, criticalReady: 1, assets: [] });
    const view = render(<View>{send()}</View>); await flush(); await press('Send to Robot');
    expect(navigation.navigate).toHaveBeenCalledWith('RobotReadyScreen', {
      childId: child.id, deviceId, assignmentId: A.assignmentId, assignmentVersion: 1, manifestChecksum: A.manifestChecksum,
    });
    const readyParams = navigation.navigate.mock.calls[0][1];
    view.rerender(<View><RobotReadyScreen navigation={navigation as never} route={{ key: 'ready', name: 'RobotReadyScreen', params: readyParams } as never} /></View>);
    await flush(); await press('Hand it to your child');
    expect(navigation.navigate).toHaveBeenLastCalledWith('RunningScreen', expect.objectContaining({ assignmentId: A.assignmentId, childId: child.id, assignmentVersion: 1 }));
    const runningParams = navigation.navigate.mock.calls.at(-1)?.[1];
    jest.mocked(getCurrentAssignment).mockResolvedValue({ ...A, state: 'RUNNING' });
    view.rerender(<View><RunningScreen navigation={navigation as never} route={{ key: 'running', name: 'RunningScreen', params: runningParams } as never} /></View>);
    await flush();
    expect(writeRecoveryCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      assignmentId: A.assignmentId, assignmentVersion: 1, deviceId, childId: child.id,
      manifestChecksum: A.manifestChecksum, phase: 'speaking', resumeTarget: 'RunningScreen',
    }));
    expect(clearRecoveryCheckpoint).not.toHaveBeenCalled(); expect(createAssignment).toHaveBeenCalledTimes(1);
  });

  it.each(['lesson', 'course'] as const)('recovers from an unavailable %s conflict readback without blind replay', async mode => {
    jest.mocked(createAssignment).mockRejectedValueOnce(conflict);
    jest.mocked(enrollCourse).mockRejectedValueOnce(conflict);
    jest.mocked(getCurrentAssignment).mockRejectedValueOnce(new Error('readback unavailable'));
    render(send()); await flush(); if (mode === 'course') await press('Send whole course');
    await press(mode === 'course' ? 'Assign course' : 'Send to Robot');
    expect(getCurrentAssignment).toHaveBeenCalledTimes(1); expect(getCourses).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/another lesson/i)).toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mode === 'course' ? enrollCourse : createAssignment).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'failure', 'conflict-read'] as const)('discards an old course send %s after mode selection changes', async outcome => {
    const pending = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
    const current = deferred<CurrentAssignment | null>();
    if (outcome === 'conflict-read') {
      jest.mocked(enrollCourse).mockRejectedValueOnce(conflict); jest.mocked(getCurrentAssignment).mockReturnValueOnce(current.promise);
    } else jest.mocked(enrollCourse).mockReturnValueOnce(pending.promise);
    render(send()); await flush(); await press('Send whole course'); await press('Assign course');
    expect(enrollCourse).toHaveBeenCalledTimes(1); await press('Send one lesson');
    await act(async () => {
      if (outcome === 'success') pending.resolve(receipt);
      else if (outcome === 'failure') pending.reject(conflict);
      else current.resolve(A);
    });
    expect(navigation.navigate).not.toHaveBeenCalled(); expect(mockHousehold.setActiveChild).not.toHaveBeenCalled();
    expect(screen.queryByText(/already has/i)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send to Robot' })).toBeEnabled();
  });

  it('discards a rejected lesson create after a child selector tap', async () => {
    const pending = deferred<Awaited<ReturnType<typeof createAssignment>>>();
    jest.mocked(createAssignment).mockReturnValueOnce(pending.promise);
    render(send()); await flush(); await press('Send to Robot'); await press('Send to Child B');
    expect(mockHousehold.setActiveChild).toHaveBeenCalledWith(sibling.id);
    await act(async () => pending.reject(conflict));
    expect(getCurrentAssignment).not.toHaveBeenCalled(); expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows a preflight failure and retries on explicit send without overlapping writes', async () => {
    jest.mocked(getDeviceStatus).mockRejectedValueOnce({ code: 'ROBOT_OFFLINE', message: 'Device offline' });
    render(send()); await flush(); await press('Send to Robot');
    expect(createAssignment).not.toHaveBeenCalled(); expect(screen.getByText(/check it.s on and connected/i)).toBeOnTheScreen();
    await press('Send to Robot'); expect(createAssignment).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('RobotReadyScreen', expect.objectContaining({ assignmentId: A.assignmentId, assignmentVersion: 1 }));
  });

  it.each(['offline', 'foreign-child'] as const)('blocks automatic resume for %s device without automatic retries', async kind => {
    jest.mocked(getDeviceStatus).mockResolvedValue({ ...robot, online: kind !== 'offline', assignedChildProfileId: kind === 'foreign-child' ? 'not-in-household' : child.id });
    render(send({ courseId, resumeContext: { courseId, childId: child.id, deviceId } })); await flush();
    expect(getDeviceStatus).toHaveBeenCalledWith(deviceId); expect(enrollCourse).not.toHaveBeenCalled();
    expect(screen.getByText(kind === 'offline' ? /check it.s on and connected/i : /isn't in this household/i)).toBeOnTheScreen();
    await flush(); expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  });

  it('discards an automatic resume receipt after the selected course changes', async () => {
    const pending = deferred<Awaited<ReturnType<typeof enrollCourse>>>();
    jest.mocked(enrollCourse).mockReturnValueOnce(pending.promise);
    jest.mocked(getCourses).mockResolvedValue([{ courseId, title: 'English course', lessonCount: 1 }, { courseId: 'other-course', title: 'Other course', lessonCount: 1 }]);
    render(send({ courseId, resumeContext: { courseId, childId: child.id, deviceId } })); await flush();
    expect(enrollCourse).toHaveBeenCalledTimes(1); await press('Pick course Other course');
    await act(async () => pending.resolve(receipt));
    expect(navigation.navigate).not.toHaveBeenCalled(); expect(mockHousehold.setActiveChild).not.toHaveBeenCalled();
  });
});

it.each(['RunningScreen', 'CompanionScreen'] as const)('%s requires a verified version before accepting canonical terminal readback on a legacy route', async name => {
  jest.mocked(getCurrentAssignment).mockResolvedValueOnce(null).mockResolvedValueOnce({ ...A, state: 'RUNNING' }).mockResolvedValue(null);
  jest.mocked(getAssignmentReadback).mockResolvedValue(parseAssignmentReadback({ data: { assignment: {
    assignmentId: A.assignmentId, assignmentVersion: 1, state: 'COMPLETED',
  } } }));
  const Component = name === 'RunningScreen' ? RunningScreen : CompanionScreen;
  render(<Component navigation={navigation as never} route={{ key: name, name, params: { deviceId, childId: child.id, assignmentId: A.assignmentId } } as never} />);
  await flush();
  expect(getAssignmentReadback).toHaveBeenCalledTimes(1);
  expect(clearRecoveryCheckpoint).not.toHaveBeenCalled(); expect(writeRecoveryCheckpoint).not.toHaveBeenCalled();
  expect(screen.queryByText(/Finished!/)).not.toBeOnTheScreen();
  await act(async () => jest.advanceTimersByTime(2500)); await flush();
  expect(writeRecoveryCheckpoint).toHaveBeenCalledWith(expect.objectContaining({ assignmentId: A.assignmentId, assignmentVersion: 1 }));
  await act(async () => jest.advanceTimersByTime(2500)); await flush();
  expect(getAssignmentReadback).toHaveBeenCalledTimes(2);
  expect(clearRecoveryCheckpoint).toHaveBeenCalledTimes(1); expect(screen.getByText(/Finished!/)).toBeOnTheScreen();
});


it('run15 A1: Send Back returns to Robot home without assignment or enrollment', async () => {
  const view = render(send()); await flush();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Go back' }));
  view.unmount();
  expect(navigation.navigate.mock.calls).toEqual([['DeviceHomeScreen']]);
  expect(getDeviceStatus).not.toHaveBeenCalled();
  expect(createAssignment).not.toHaveBeenCalled(); expect(enrollCourse).not.toHaveBeenCalled();
  expect(writeRecoveryCheckpoint).not.toHaveBeenCalled();
});

it('run15 A3: failed sibling lesson list leaves the published selected course sendable', async () => {
  jest.mocked(getCourses).mockResolvedValue([{ courseId: 'unavailable-course', title: 'Unavailable', lessonCount: 1 }, { courseId, title: 'English course', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockImplementation(async id => {
    if (id === 'unavailable-course') throw new Error('unpublished');
    return normalizePublishedLessonsPayload({ data: { lessons: [lesson] } });
  });
  render(send()); await flush();
  expect(screen.getByText('Greetings')).toBeOnTheScreen();
  expect(jest.mocked(getCourseLessons).mock.calls).toEqual([['unavailable-course', { childId: child.id }], [courseId, { childId: child.id }]]);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Send to Robot' }));
  expect(jest.mocked(createAssignment).mock.calls).toEqual([[{ deviceId, childId: child.id, lessonId: lesson.lessonId, lessonVersion: 1, profile: 'espTft' }]]);
  expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', { deviceId, assignmentId: A.assignmentId, assignmentVersion: 1, childId: child.id, manifestChecksum: A.manifestChecksum }]]);
  expect(enrollCourse).not.toHaveBeenCalled();
});

it('run15 A4: normalized producer fit metadata agrees with the exact selected assignment', async () => {
  const lessons = normalizePublishedLessonsPayload({ data: { lessons: [{ ...lesson, difficultyBand: 'beginner', estimatedDurationSec: 180, topicTags: ['animals'], personalization: { rank: 1, reasonCode: 'personality_match', matchedTopics: ['animals'] } }] } });
  jest.mocked(getCourseLessons).mockResolvedValue(lessons);
  render(send()); await flush();
  expect(screen.getByText('Best fit: animals · beginner · 3 min')).toBeOnTheScreen();
  expect(screen.getByText('Greetings')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Send to Robot' }));
  expect(jest.mocked(createAssignment).mock.calls).toEqual([[{ deviceId, childId: child.id, lessonId: lesson.lessonId, lessonVersion: 1, profile: 'espTft' }]]);
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
});
