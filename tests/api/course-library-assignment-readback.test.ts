import { getAssignmentReadback, getCurrentAssignment, parseAssignmentReadback } from '@/services/api/course-library.api';
import client from '@/services/http/client';

// Inert request seam: asserts consumer path/query/envelope only; no HTTP listener.
jest.mock('@/services/http/client', () => ({ __esModule: true, default: { get: jest.fn() } }));
const get = jest.mocked(client.get);
const identity = { assignmentId: '44444444-4444-4444-8444-444444444444', assignmentVersion: 1 };
const active = { ...identity, childId: '11111111-1111-4111-8111-111111111111', lessonId: 'w01-greetings-politeness',
  lessonTitle: 'Greetings', lessonVersion: 1, sessionId: null, manifestChecksum: null, profile: 'espTft', state: 'RUNNING' };
const envelope = (assignment: unknown) => ({ data: { assignment } });
beforeEach(() => jest.resetAllMocks());
it('distinguishes canonical absence', () => expect(parseAssignmentReadback(envelope(null))).toEqual({ kind: 'none' }));
it.each(['COMPLETED', 'FAILED', 'CANCELLED'])('preserves minimal %s without inventing active metadata', state => {
  expect(parseAssignmentReadback(envelope({ ...identity, state }))).toEqual({ kind: 'terminal', terminal: { ...identity, state } });
});
it.each([null, [], {}, { data: null }, { data: [] }, { data: {} }, { assignment: null }])('rejects malformed envelope %#', value => {
  expect(() => parseAssignmentReadback(value)).toThrow();
});
it.each(['', ' ', null, undefined, 42])('rejects malformed ID %#', assignmentId => {
  expect(() => parseAssignmentReadback(envelope({ ...identity, state: 'COMPLETED', assignmentId }))).toThrow();
});
it.each([undefined, null, 0, -1, 1.5, '1', Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])('rejects malformed version %#', assignmentVersion => {
  expect(() => parseAssignmentReadback(envelope({ ...identity, state: 'COMPLETED', assignmentVersion }))).toThrow();
});
it.each(['FUTURE', '', null, undefined])('rejects unknown state %#', state => {
  expect(() => parseAssignmentReadback(envelope({ ...active, state }))).toThrow();
});
it.each(['ASSIGNED', 'PRELOADING', 'READY', 'RUNNING', 'PAUSED'])('accepts canonical active %s', state => {
  expect(parseAssignmentReadback(envelope({ ...active, state }))).toEqual({ kind: 'active', assignment: { ...active, state } });
});
it.each(['childId', 'lessonId', 'lessonTitle', 'lessonVersion', 'profile', 'sessionId', 'manifestChecksum'])('rejects missing active %s', field => {
  const value: Record<string, unknown> = { ...active }; delete value[field];
  expect(() => parseAssignmentReadback(envelope(value))).toThrow();
});
it('does not substitute conflicting legacy aliases after validating canonical identity', () => {
  expect(parseAssignmentReadback(envelope({ ...active, assignment_id: 'other', assignment_version: 2, child_id: 'other' })))
    .toEqual({ kind: 'active', assignment: active });
});
it('keeps the default active request unchanged and opts in only on reconciliation', async () => {
  get.mockResolvedValue({ data: envelope(null) });
  await expect(getCurrentAssignment('device-a')).resolves.toBeNull();
  expect(get).toHaveBeenNthCalledWith(1, '/devices/device-a/assignment/current');
  await expect(getAssignmentReadback('device-a')).resolves.toEqual({ kind: 'none' });
  expect(get).toHaveBeenNthCalledWith(2, '/devices/device-a/assignment/current', { params: { includeTerminal: 'true' } });
});
it('propagates read failure rather than projecting success', async () => {
  get.mockRejectedValue(new Error('inert failure'));
  await expect(getAssignmentReadback('device-a')).rejects.toThrow('inert failure');
});


it('run15 A5: canonical session and checksum remain exact in active readback', () => {
  const assignment = { ...active, sessionId: 'session-canonical', manifestChecksum: 'b'.repeat(64) };
  expect(parseAssignmentReadback(envelope(assignment))).toEqual({ kind: 'active', assignment });
});
it.each(['sessionId', 'manifestChecksum'] as const)('run15 A5: whitespace %s fails while canonical and null values remain valid', field => {
  for (const value of ['', ' ', '\t\n']) {
    expect(() => parseAssignmentReadback(envelope({ ...active, [field]: value }))).toThrow();
  }
  for (const value of ['canonical-value', null]) {
    const assignment = { ...active, [field]: value };
    expect(parseAssignmentReadback(envelope(assignment))).toEqual({ kind: 'active', assignment });
  }
});
