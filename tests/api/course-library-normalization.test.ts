import client from '@/services/http/client';
import {
  enrollCourse,
  getCourseDetail,
  getRobotSyncStatus,
  listLibrary,
  normalizeCourseLibraryDetailPayload,
  normalizeCourseLibraryPayload,
  normalizeRobotSyncStatusPayload,
  sendCourseToRobot,
  unlockCourse,
} from '@/services/api/course-library.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('course-library API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes free library payloads from backend envelopes', () => {
    expect(normalizeCourseLibraryPayload({
      data: {
        courses: [
          {
            course_id: 'c_food',
            title: 'Yummy Words',
            language: 'en',
            price_cents: 2400,
            owned: false,
            synced_to_device: true,
            locked: true,
          },
        ],
      },
    })).toEqual([
      {
        courseId: 'c_food',
        title: 'Yummy Words',
        language: 'en',
        price: 24,
        owned: false,
        syncedToDevice: true,
        locked: true,
        isFree: false,
      },
    ]);
  });

  it('normalizes detail and sync status envelopes', () => {
    expect(normalizeCourseLibraryDetailPayload({
      data: {
        course: {
          course_id: 'c_food',
          name: 'Yummy Words',
          description: 'Food words',
          level_count: 2,
          lesson_count: 12,
          preview_url: null,
        },
      },
    })).toEqual({
      courseId: 'c_food',
      title: 'Yummy Words',
      description: 'Food words',
      levelCount: 2,
      lessonCount: 12,
      previewUrl: null,
    });

    expect(normalizeRobotSyncStatusPayload({
      data: {
        course_id: 'c_food',
        synced: true,
        last_sync_at: '2026-05-25T00:00:00.000Z',
      },
    })).toEqual({
      courseId: 'c_food',
      synced: true,
      lastSyncAt: '2026-05-25T00:00:00.000Z',
    });
  });

  it('calls documented course-library routes and no billing routes', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: { courses: [] } } });
    await expect(listLibrary()).resolves.toEqual([]);
    expect(mockedClient.get).toHaveBeenCalledWith('/course-library');

    mockedClient.get.mockResolvedValueOnce({ data: { data: { course: { course_id: 'c_food' } } } });
    await getCourseDetail('c_food');
    expect(mockedClient.get).toHaveBeenCalledWith('/course-library/c_food');

    mockedClient.post.mockResolvedValue({ data: { data: { courseId: 'c_food' } } });
    await unlockCourse('c_food');
    await sendCourseToRobot('c_food', 'device-123', 'child-123');
    expect(mockedClient.post).toHaveBeenCalledWith('/course-library/c_food/unlock', {});
    expect(mockedClient.post).toHaveBeenCalledWith('/course-library/c_food/send-to-robot', {
      deviceId: 'device-123',
      childId: 'child-123',
    });

    mockedClient.post.mockClear();
    await sendCourseToRobot('c_food', 'device-123', 'child-123', 'req-abc');
    await unlockCourse('c_food', 'req-abc');
    expect(mockedClient.post).toHaveBeenCalledWith(
      '/course-library/c_food/send-to-robot',
      { deviceId: 'device-123', childId: 'child-123' },
      { headers: { 'X-Request-Id': 'req-abc' } },
    );
    expect(mockedClient.post).toHaveBeenCalledWith(
      '/course-library/c_food/unlock',
      {},
      { headers: { 'X-Request-Id': 'req-abc' } },
    );

    mockedClient.get.mockResolvedValueOnce({ data: { data: { course_id: 'c_food', synced: false } } });
    await getRobotSyncStatus('c_food');
    expect(mockedClient.get).toHaveBeenCalledWith('/course-library/c_food/sync-status');

    expect(mockedClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/billing'));
    expect(mockedClient.post).not.toHaveBeenCalledWith(expect.stringContaining('/billing'));
  });

  it('uses local investor-demo library data without a protected backend token', async () => {
    process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'true';
    try {
      await expect(listLibrary()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ courseId: 'c_barn', owned: true }),
        ]),
      );
      await expect(getCourseDetail('c_barn')).resolves.toMatchObject({ courseId: 'c_barn' });
      await expect(getRobotSyncStatus('c_barn')).resolves.toMatchObject({ courseId: 'c_barn', synced: true });
      await expect(enrollCourse('c_barn', {
        childId: 'investor-demo-child',
        deviceId: 'investor-demo-robot',
      })).resolves.toMatchObject({
        enrollment: { courseId: 'c_barn', status: 'ACTIVE' },
        assignment: { id: 'demo-assignment-ready', state: 'READY' },
      });
      expect(mockedClient.get).not.toHaveBeenCalled();
      expect(mockedClient.post).not.toHaveBeenCalled();
    } finally {
      process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'false';
    }
  });
});
