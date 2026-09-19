import { matchesActive, matchesTerminal, matchesObserver, readyAssignment, validAssignmentVersion } from '@/features/course-library/assignmentReconciliation';
import type { CurrentAssignment } from '@/services/api/course-library.api';

const selection = { deviceId: 'd', assignmentId: 'a', childId: 'c', assignmentVersion: 1 };
const active: CurrentAssignment = { assignmentId: 'a', childId: 'c', assignmentVersion: 1, state: 'READY', sessionId: 's', lessonId: 'l', lessonVersion: 7, lessonTitle: 'Lesson', manifestChecksum: 'hash', profile: 'espTft' };
const terminal = { assignmentId: 'a', assignmentVersion: 1, state: 'COMPLETED' as const };
const preload = { assignmentId: 'a', state: 'READY' as const, profile: 'espTft', criticalTotal: 1, criticalReady: 1, assets: [] };
it.each([undefined, null, '', '1', 0, -1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid version domain %#', value => {
  expect(validAssignmentVersion(value)).toBe(false);
});
it.each([1, 2, Number.MAX_SAFE_INTEGER])('accepts safe positive version %s', version => {
  expect(validAssignmentVersion(version)).toBe(true);
});
it.each(['deviceId', 'assignmentId', 'assignmentVersion'])('terminal cannot supply missing selected %s', field => {
  expect(matchesTerminal({ ...selection, [field]: undefined }, terminal)).toBe(false);
});
it('keeps assignment version separate from lesson version', () => {
  expect(matchesActive(selection, active)).toBe(true);
  expect(matchesActive({ ...selection, assignmentVersion: active.lessonVersion }, active)).toBe(false);
  expect(matchesTerminal(selection, terminal)).toBe(true);
});
it.each(['assignmentId', 'childId', 'assignmentVersion'])('active identity mismatch %s cannot authorize Ready', field => {
  const changed = { ...selection, [field]: field === 'assignmentVersion' ? 2 : 'other' };
  expect(matchesActive(changed, active)).toBe(false);
  expect(readyAssignment(changed, active, preload)).toBeNull();
});
it('legacy version is learned only after ID and child match', () => {
  expect(readyAssignment({ ...selection, assignmentVersion: undefined }, active, preload)).toBe(active);
  expect(readyAssignment({ ...selection, assignmentId: undefined }, active, preload)).toBeNull();
  expect(readyAssignment({ ...selection, childId: undefined }, active, preload)).toBeNull();
});
it.each(['session_id', 'sessionId', 'assignment_id', 'assignmentId', 'assignmentVersion', 'assignment_version'])('rejects conflicting observer %s', field => {
  expect(matchesObserver({ [field]: 'other' }, active, 's')).toBe(false);
});
it.each([null, [], 'terminal', 1])('rejects non-object observer %#', frame => {
  expect(matchesObserver(frame, active, 's')).toBe(false);
});
