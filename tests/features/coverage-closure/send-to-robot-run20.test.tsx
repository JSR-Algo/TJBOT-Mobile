import React from 'react';
import { AppState } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import { createAssignment, enrollCourse, getCourseLessons, getCourses, normalizeAssignmentRefPayload, normalizeEnrollmentPayload } from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';

jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'),
  getCourses: jest.fn(), getCourseLessons: jest.fn(), getCurrentAssignment: jest.fn(), createAssignment: jest.fn(), enrollCourse: jest.fn(),
}));
jest.mock('@/services/api/device.api', () => ({ getDeviceStatus: jest.fn() }));
const child = { id: '11111111-1111-4111-8111-111111111111', name: 'Child A' };
const mockHousehold = { activeChild: child as typeof child | undefined, children: [child], activeHousehold: { id: 'household-a' }, setActiveChild: jest.fn() };
jest.mock('@/contexts/HouseholdContext', () => ({ useOptionalHousehold: () => mockHousehold }));

const courseId = 'english-6month-4-6';
const deviceId = '22222222-2222-4222-8222-222222222222';
const lesson = { lessonId: 'w01', lessonVersion: 1, title: 'Greetings', profile: 'espTft', manifestReady: true };
const robot = { id: deviceId, name: 'Robot A', online: true, batteryPercent: 80, assignedChildProfileId: null };
const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
function send(params: object = { courseId }) {
  return <SendToRobotScreen navigation={navigation as never} route={{ key: 'send', name: 'SendToRobotScreen', params } as never} />;
}
beforeEach(() => {
  jest.resetAllMocks();
  mockHousehold.activeChild = child;
  jest.mocked(AppState.addEventListener).mockReturnValue({ remove: jest.fn() });
  jest.mocked(getCourses).mockResolvedValue([{ courseId, title: 'English course', lessonCount: 1 }]);
  jest.mocked(getCourseLessons).mockResolvedValue([lesson]);
  jest.mocked(getDeviceStatus).mockResolvedValue(robot);
});

it('an automatic resume receipt without title or checksum keeps the resume context title and reports no checksum', async () => {
  const enrollment = normalizeEnrollmentPayload({ id: 'e1', courseId, childId: child.id, deviceId, status: 'active' });
  jest.mocked(enrollCourse).mockResolvedValue({ enrollment, assignment: normalizeAssignmentRefPayload({
    id: 'a1', assignment_version: 1, device_id: deviceId, child_id: child.id, lesson_id: 'w01', lesson_version: 1, profile: 'espTft', state: 'ASSIGNED',
  }) });
  render(send({ courseId, resumeContext: { courseId, childId: child.id, deviceId, lessonTitle: 'Where we stopped' } })); await flush();
  expect(getDeviceStatus).toHaveBeenCalledWith(deviceId);
  expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', {
    childId: child.id, courseId, deviceId, assignmentId: 'a1', assignmentVersion: 1, lessonTitle: 'Where we stopped', manifestChecksum: null,
  }]]);
  expect(mockHousehold.setActiveChild).toHaveBeenCalledWith(child.id);
});

it('an unbound robot sends the lesson to the household\'s active child', async () => {
  jest.mocked(createAssignment).mockResolvedValue({
    assignmentId: 'a2', assignmentVersion: 1, deviceId, childId: child.id, lessonId: 'w01', lessonVersion: 1, manifestChecksum: 'e'.repeat(64), profile: 'espTft', state: 'ASSIGNED', createdAt: null,
  });
  const user = userEvent.setup();
  render(send()); await flush();
  await user.press(screen.getByRole('button', { name: 'Send to Robot' })); await flush();
  expect(jest.mocked(createAssignment).mock.calls).toEqual([[{ deviceId, childId: child.id, lessonId: 'w01', lessonVersion: 1, profile: 'espTft' }]]);
  expect(screen.getByText('This lesson is assigned to Child A, who is linked to Robot A.')).toBeOnTheScreen();
  expect(navigation.navigate.mock.calls).toEqual([['RobotReadyScreen', { childId: child.id, deviceId, assignmentId: 'a2', assignmentVersion: 1, manifestChecksum: 'e'.repeat(64) }]]);
});

it('whole-course mode with an unavailable route course disables assignment until a course is picked again', async () => {
  jest.mocked(getCourses).mockResolvedValue([{ courseId, title: 'English course', lessonCount: 1 }, { courseId: 'course-b', title: 'Course B', lessonCount: 1 }]);
  const user = userEvent.setup();
  render(send({ courseId: 'retired-course' })); await flush();
  expect(screen.getByText('Your selected course is no longer available. Pick a course again.')).toBeOnTheScreen();
  expect(screen.getByText('This course has no lessons ready yet.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Send whole course' }));
  expect(screen.getByRole('button', { name: 'Assign course' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Assign course' }));
  expect(getDeviceStatus).not.toHaveBeenCalled();
  expect(enrollCourse).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Pick course Course B' }));
  expect(screen.queryByText('Your selected course is no longer available. Pick a course again.')).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Assign course' })).toBeEnabled();
});
