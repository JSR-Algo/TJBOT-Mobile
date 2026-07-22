import {
  assignLessonToRobot,
  getLessonPreloadStatus,
  getRobotLessonStatus,
  sendCourseToRobot,
  startRobotLesson,
  stopRobotLesson,
} from '../../../src/services/connectors/lesson-delivery.connector';
import {
  createAssignment,
  getPreloadStatus,
  sendCourseToRobot as sendCourseToRobotApi,
} from '../../../src/services/api/course-library.api';
import client from '../../../src/services/http/client';
import { BackendContractUnavailableError } from '../../../src/services/api/undocumented-api-routes';

jest.mock('../../../src/services/api/course-library.api', () => ({
  createAssignment: jest.fn(),
  getPreloadStatus: jest.fn(),
  sendCourseToRobot: jest.fn(),
}));

jest.mock('../../../src/services/http/client', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

const mockedCreateAssignment = createAssignment as jest.MockedFunction<typeof createAssignment>;
const mockedGetPreloadStatus = getPreloadStatus as jest.MockedFunction<typeof getPreloadStatus>;
const mockedSendCourse = sendCourseToRobotApi as jest.MockedFunction<typeof sendCourseToRobotApi>;
const mockedClient = client as unknown as {
  post: jest.Mock;
  get: jest.Mock;
};

const assignmentParams = {
  deviceId: 'device-1',
  lessonId: 'lesson-1',
  lessonVersion: 1,
  childId: 'child-1',
} as const;

describe('lesson-delivery connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps assignment success in an ok result', async () => {
    const assignment = {
      assignmentId: 'a-1',
      assignmentVersion: 1,
      deviceId: 'device-1',
      childId: 'child-1',
      lessonId: 'lesson-1',
      lessonVersion: 1,
      profile: 'espTft',
      state: 'READY' as const,
      createdAt: null,
    };
    mockedCreateAssignment.mockResolvedValueOnce(assignment);

    const result = await assignLessonToRobot(assignmentParams);

    expect(result).toEqual({ state: 'ok', value: assignment });
    expect(mockedCreateAssignment).toHaveBeenCalledWith(assignmentParams);
  });

  it('maps ROBOT_BRIDGE_UNAVAILABLE to robot_offline', async () => {
    mockedGetPreloadStatus.mockRejectedValueOnce({
      code: 'ROBOT_BRIDGE_UNAVAILABLE',
      message: 'bridge down',
    });

    const result = await getLessonPreloadStatus('device-1');

    expect(result).toEqual({
      state: 'robot_offline',
      reason: 'bridge down',
      retryable: false,
    });
  });

  it('maps ROBOT_BUSY to queued_for_robot', async () => {
    mockedCreateAssignment.mockRejectedValueOnce({ code: 'ROBOT_BUSY', message: 'busy' });

    const result = await assignLessonToRobot(assignmentParams);

    expect(result).toEqual({ state: 'queued_for_robot', reason: 'busy', retryable: false });
  });

  it('maps transport failures to server_unavailable', async () => {
    mockedSendCourse.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'offline', retryable: true });

    const result = await sendCourseToRobot('course-1', 'device-1', 'child-1');

    expect(result).toEqual({ state: 'server_unavailable', reason: 'offline', retryable: true });
  });

  it('maps contract gaps to unsupported_until_connector', async () => {
    mockedSendCourse.mockRejectedValueOnce(new BackendContractUnavailableError('sendCourseToRobot'));

    const result = await sendCourseToRobot('course-1', 'device-1', 'child-1');

    expect(result).toEqual({
      state: 'unsupported_until_connector',
      reason: 'BACKEND_CONTRACT_UNAVAILABLE: sendCourseToRobot has no documented backend contract',
      retryable: false,
    });
  });

  it('rethrows errors that are not link-state failures', async () => {
    mockedCreateAssignment.mockRejectedValueOnce(new Error('unexpected db corruption'));

    await expect(assignLessonToRobot(assignmentParams)).rejects.toThrow('unexpected db corruption');
  });

  it('starts a robot lesson through /robot-lessons/start', async () => {
    const status = {
      sessionId: 'sess-1',
      deviceId: 'device-1',
      childId: 'child-1',
      lessonId: 'lesson-1',
      state: 'starting',
      startedAt: '2026-07-18T10:00:00.000Z',
    };
    mockedClient.post.mockResolvedValueOnce({ data: status });

    const result = await startRobotLesson({ deviceId: 'device-1', childId: 'child-1', lessonId: 'lesson-1' });

    expect(mockedClient.post).toHaveBeenCalledWith('/robot-lessons/start', {
      deviceId: 'device-1',
      childId: 'child-1',
      lessonId: 'lesson-1',
    });
    expect(result).toEqual({ state: 'ok', value: status });
  });

  it('maps a robot_offline failure on status reads', async () => {
    mockedClient.get.mockRejectedValueOnce({ code: 'ROBOT_OFFLINE', message: 'robot asleep' });

    const result = await getRobotLessonStatus('sess-1');

    expect(mockedClient.get).toHaveBeenCalledWith('/robot-lessons/sess-1/status');
    expect(result).toEqual({ state: 'robot_offline', reason: 'robot asleep', retryable: false });
  });

  it('stops a robot lesson and encodes the session id', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: {} });

    const result = await stopRobotLesson('sess 1');

    expect(mockedClient.post).toHaveBeenCalledWith('/robot-lessons/sess%201/stop');
    expect(result).toEqual({ state: 'ok', value: undefined });
  });
});
