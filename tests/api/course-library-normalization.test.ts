import client from '@/services/http/client';
import {
  getCourseDetail,
  isAssignablePublishedLesson,
  listLibrary,
  normalizeCourseLibraryDetailPayload,
  normalizeCourseLibraryPayload,
  normalizeRobotSyncStatusPayload,
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
        price: 0,
        owned: true,
        syncedToDevice: true,
        locked: false,
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

    // unlockCourse / sendCourseToRobot / getRobotSyncStatus are gone: the
    // backend retired all three (410 GONE), so the client no longer exposes a
    // call that could only fail. Assert they are not reachable any more.
    expect(mockedClient.post).not.toHaveBeenCalledWith(expect.stringContaining('/unlock'));
    expect(mockedClient.post).not.toHaveBeenCalledWith(expect.stringContaining('/send-to-robot'));
    expect(mockedClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/sync-status'));

    expect(mockedClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/billing'));
    expect(mockedClient.post).not.toHaveBeenCalledWith(expect.stringContaining('/billing'));
  });

  describe('published lesson assignability gate', () => {
    it('allows only manifest-ready espTft lessons with a positive integer lessonVersion', () => {
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'espTft', lessonVersion: 1 })).toBe(true);

      expect(isAssignablePublishedLesson({ manifestReady: false, profile: 'espTft', lessonVersion: 1 })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: null, lessonVersion: 1 })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'mobile', lessonVersion: 1 })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'piTft', lessonVersion: 1 })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'bogus', lessonVersion: 1 })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'espTft', lessonVersion: Number.NaN })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'espTft', lessonVersion: 0 })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'espTft', lessonVersion: -1 })).toBe(false);
      expect(isAssignablePublishedLesson({ manifestReady: true, profile: 'espTft', lessonVersion: 1.5 })).toBe(false);
    });
  });
});
