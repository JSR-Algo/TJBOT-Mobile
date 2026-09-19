import React from 'react';
import { Alert, AppState } from 'react-native';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import {
  getCourses, getCourseLessons, getCurrentAssignment, enrollCourse, listChildEnrollments,
  normalizeAssignmentRefPayload, normalizeCurrentAssignmentPayload, normalizeEnrollmentPayload, normalizePublishedLessonsPayload,
} from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';

jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'),
  getCourses: jest.fn(), getCourseLessons: jest.fn(), getCurrentAssignment: jest.fn(), enrollCourse: jest.fn(), listChildEnrollments: jest.fn(),
}));
jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));
const child = { id: '11111111-1111-4111-8111-111111111111', name: 'Child A' };
const mockHousehold = { activeChild: child as typeof child | undefined, children: [child], activeHousehold: { id: 'household-a' }, setActiveChild: jest.fn() };
jest.mock('@/contexts/HouseholdContext', () => ({ useOptionalHousehold: () => mockHousehold }));

const courseId = 'english-6month-4-6';
const deviceId = '22222222-2222-4222-8222-222222222222';
const robot = { id: deviceId, name: 'Robot A', online: true, batteryPercent: 80, assignedChildProfileId: child.id };
const enrollment = normalizeEnrollmentPayload({ id: '55555555-5555-4555-8555-555555555555', courseId, childId: child.id, deviceId, status: 'active' });
const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
function detail() {
  return <CourseDetailScreen navigation={navigation as never} route={{ key: 'detail', name: 'CourseDetailScreen', params: { courseId } } as never} />;
}
beforeEach(() => {
  jest.resetAllMocks();
  mockHousehold.activeChild = child;
  jest.mocked(AppState.addEventListener).mockReturnValue({ remove: jest.fn() });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(getCourses).mockResolvedValue([{ courseId, title: 'English course', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue(normalizePublishedLessonsPayload({ lessons: [{ lesson_id: 'w01', lesson_version: 1, title: 'Greetings', profile: 'espTft', manifest_ready: true }] }));
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [] });
  jest.mocked(getDeviceStatus).mockResolvedValue(robot);
});

it('a same-frame double tap on Add to Robot runs one device preflight and one unlock hand-off', async () => {
  const preflight = deferred<typeof robot>();
  jest.mocked(getDeviceStatus).mockReturnValue(preflight.promise);
  render(detail()); await flush();
  const add = screen.getByRole('button', { name: 'Add to Robot' });
  act(() => { fireEvent.press(add); fireEvent.press(add); });
  expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Preparing course' })).toBeDisabled();
  await act(async () => preflight.resolve(robot)); await flush();
  expect(navigation.navigate.mock.calls).toEqual([['UnlockConfirmScreen', { courseId }]]);
  expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeEnabled();
});

it('a same-frame double tap on Resume course enrolls once and hands off once', async () => {
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [{ ...enrollment, status: 'PAUSED' }] });
  const preflight = deferred<typeof robot>();
  jest.mocked(getDeviceStatus).mockReturnValue(preflight.promise);
  jest.mocked(enrollCourse).mockResolvedValue({ enrollment, assignment: normalizeAssignmentRefPayload({
    id: 'a1', assignment_version: 1, device_id: deviceId, child_id: child.id, lesson_id: 'w01', lesson_title: 'Greetings', lesson_version: 1, manifest_checksum: 'c'.repeat(64), profile: 'espTft', state: 'ASSIGNED',
  }) });
  render(detail()); await flush();
  const resume = screen.getByRole('button', { name: 'Resume course' });
  act(() => { fireEvent.press(resume); fireEvent.press(resume); });
  expect(getDeviceStatus).toHaveBeenCalledTimes(1);
  await act(async () => preflight.resolve(robot)); await flush();
  expect(enrollCourse).toHaveBeenCalledTimes(1);
  expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', expect.objectContaining({ assignmentId: 'a1', lessonTitle: 'Greetings' })]]);
});

it('a resume receipt without a lesson title hands off without inventing a title', async () => {
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [{ ...enrollment, status: 'PAUSED' }] });
  jest.mocked(enrollCourse).mockResolvedValue({ enrollment, assignment: normalizeAssignmentRefPayload({
    id: 'a1', assignment_version: 1, device_id: deviceId, child_id: child.id, lesson_id: 'w01', lesson_version: 1, manifest_checksum: null, profile: 'espTft', state: 'ASSIGNED',
  }) });
  const user = userEvent.setup();
  render(detail()); await flush();
  await user.press(screen.getByRole('button', { name: 'Resume course' })); await flush();
  expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', {
    childId: child.id, courseId, deviceId, assignmentId: 'a1', assignmentVersion: 1, lessonTitle: undefined, manifestChecksum: null,
  }]]);
  expect(navigation.navigate.mock.calls[0][1]).not.toHaveProperty('lessonTitle', '');
});

it('a conflict readback without a lesson title resumes the matching assignment without an empty title', async () => {
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [{ ...enrollment, status: 'ACTIVE' }] });
  jest.mocked(enrollCourse).mockRejectedValue({ response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } } });
  jest.mocked(getCurrentAssignment).mockResolvedValue(normalizeCurrentAssignmentPayload({ data: { assignment: {
    assignment_id: 'a-current', assignment_version: 3, child_id: child.id, lesson_id: 'w01', lesson_version: 1, manifest_checksum: 'd'.repeat(64), profile: 'espTft', state: 'READY', session_id: null,
  } } }));
  const user = userEvent.setup();
  render(detail()); await flush();
  await user.press(screen.getByRole('button', { name: 'Continue course' })); await flush();
  expect(getCurrentAssignment).toHaveBeenCalledWith(deviceId);
  expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', {
    childId: child.id, courseId, deviceId, assignmentId: 'a-current', assignmentVersion: 3, lessonTitle: undefined, manifestChecksum: 'd'.repeat(64),
  }]]);
  expect(screen.queryByText(/already has/i)).not.toBeOnTheScreen();
});

it('published lessons without an id still list in order without duplicate keys', async () => {
  const keyWarnings = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.mocked(getCourseLessons).mockResolvedValue(normalizePublishedLessonsPayload({ lessons: [
    { lesson_version: 1, title: 'Hello', profile: 'espTft', manifest_ready: true },
    { lesson_version: 1, title: '', profile: 'espTft', manifest_ready: false },
  ] }));
  render(detail()); await flush();
  expect(screen.getByText('Hello')).toBeOnTheScreen();
  expect(screen.getByText('Lesson 2')).toBeOnTheScreen();
  expect(keyWarnings.mock.calls.filter(call => String(call[0]).includes('same key'))).toEqual([]);
  keyWarnings.mockRestore();
});

it('removing the selected child while a resumable course is shown falls back to the connection prompt', async () => {
  jest.mocked(listChildEnrollments).mockResolvedValue({ enrollments: [{ ...enrollment, status: 'PAUSED' }] });
  const user = userEvent.setup();
  const view = render(detail()); await flush();
  expect(screen.getByRole('button', { name: 'Resume course' })).toBeEnabled();
  mockHousehold.activeChild = undefined;
  view.rerender(detail()); await flush();
  expect(screen.queryByRole('button', { name: 'Resume course' })).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Add to Robot' }));
  expect(screen.getByRole('alert', { name: "Robot isn't ready yet" })).toBeOnTheScreen();
  expect(getDeviceStatus).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  expect(listChildEnrollments).toHaveBeenCalledTimes(1);
});
