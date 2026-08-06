// T3.3 deep-dive — parent progress dashboard correctness.
//
// Boxes covered here:
//   * Totals equal backend projections on a seeded fixture (key-space counting)
//   * Day boundary Asia/Ho_Chi_Minh: 'today' progress buckets correctly at midnight
//   * Long history: pagination accumulates without duplicating or unbounded re-listing
//   * Stale cached dashboard is refreshed on focus (no silent stale data)

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  buildCanonicalProgressDashboard,
  householdDayKey,
  useChildProgressDashboardQuery,
} from '@/features/progress/hooks/useChildProgressDashboardQuery';
import { useParentLearningHistoryQuery } from '@/features/parent/hooks/useParentLearningHistoryQuery';
import {
  getParentLearningHistory,
  getParentLearningStatus,
  normalizeParentLearningStatus,
  type ParentLearningStatus,
  type ParentSessionSummary,
} from '@/services/api/parentLearning.api';

let latestFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as typeof import('@react-navigation/native');
  const ReactInner = require('react') as typeof import('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => void | (() => void)) => {
      ReactInner.useEffect(() => {
        latestFocusEffect = cb;
        return () => { latestFocusEffect = null; };
      }, [cb]);
    },
  };
});

jest.mock('@/services/api/parentLearning.api', () => ({
  ...jest.requireActual('@/services/api/parentLearning.api'),
  getParentLearningStatus: jest.fn(),
  getParentLearningHistory: jest.fn(),
}));

// A healthy realtime connection: the socket lifecycle (and its own refetch rules)
// is covered by t33-parent-realtime-catchup; here the only refresh trigger under
// test is screen focus.
jest.mock('@/services/ws/parentProgressRealtime', () => ({
  openParentProgressRealtime: jest.fn(async () => ({ url: 'wss://test/parent-progress', close: jest.fn(), send: jest.fn() })),
}));

const mockStatus = getParentLearningStatus as jest.MockedFunction<typeof getParentLearningStatus>;
const mockHistory = getParentLearningHistory as jest.MockedFunction<typeof getParentLearningHistory>;

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const Wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, Wrapper };
}

function session(overrides: Partial<ParentSessionSummary> = {}): ParentSessionSummary {
  return {
    childId: 'child-1', assignmentId: 'assign-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'English',
    lessonId: 'lesson-1', lessonTitle: 'Farm animals', terminalState: 'COMPLETED',
    startedAt: '2026-08-06T01:00:00Z', completedAt: '2026-08-06T01:05:00Z', durationSec: 300, reportAvailable: true,
    ...overrides,
  };
}

const emptyStatus: ParentLearningStatus = {
  activeLearning: null,
  recentSessions: { items: [], nextCursor: null },
  courseProgress: [],
  projectionRevision: '1',
};

describe('T3.3 — dashboard totals match the backend projection (key-space counting)', () => {
  // Seeded fixture mirroring `parent-learning-progress.service.ts` /* parent-course-progress */:
  // `published_lessons` is DISTINCT ON (course_id, lesson_key) ORDER BY lesson_version DESC,
  // so a lesson_key republished as v1 AND v2 contributes exactly ONE row to the course total,
  // and `completed` is EXISTS-per-lesson_key, not a per-assignment count. The wire payload below
  // is what that SQL produces for a child holding assignments against BOTH published versions
  // of `greetings` plus a completion on each of `greetings` and `colours`.
  const backendWirePayload = {
    data: {
      activeLearning: null,
      recentSessions: { items: [], nextCursor: null },
      courseProgress: [
        {
          courseId: 'course-1',
          title: 'English',
          currentLessonPosition: 3,
          completedLessonCount: 2, // greetings (v1+v2 collapsed) + colours
          totalLessonCount: 3, // greetings, colours, numbers — NOT 4
          positionPercent: 67,
          suggestedNextLesson: { lessonId: 'numbers', lessonTitle: 'Numbers' },
        },
        {
          courseId: 'course-2',
          title: 'Maths',
          currentLessonPosition: 1,
          completedLessonCount: 0,
          totalLessonCount: 2,
          positionPercent: 0,
          suggestedNextLesson: { lessonId: 'shapes', lessonTitle: 'Shapes' },
        },
      ],
      projectionRevision: '104',
    },
  };

  it('sums the canonical projection without re-deriving counts from rows', () => {
    const status = normalizeParentLearningStatus(backendWirePayload);
    const dashboard = buildCanonicalProgressDashboard(status, undefined, Date.parse('2026-08-06T01:00:00Z'));

    // Backend truth for this fixture: 2 of 5 distinct lesson_keys completed.
    expect(dashboard.completedLessons).toBe(2);
    expect(dashboard.totalLessons).toBe(5);
    expect(dashboard.courses.map(course => course.courseId)).toEqual(['course-1', 'course-2']);
  });

  it('counts a course once per course key even if the projection repeats it', () => {
    // Row-space counting is the recurring defect class in this stack: a repeated
    // course key must never double a parent's lesson totals.
    const repeated = normalizeParentLearningStatus({
      data: {
        ...backendWirePayload.data,
        courseProgress: [...backendWirePayload.data.courseProgress, backendWirePayload.data.courseProgress[0]],
      },
    });
    const dashboard = buildCanonicalProgressDashboard(repeated, undefined, Date.parse('2026-08-06T01:00:00Z'));

    expect(dashboard.completedLessons).toBe(2);
    expect(dashboard.totalLessons).toBe(5);
    expect(dashboard.courses).toHaveLength(2);
  });
});

describe('T3.3 — "today" buckets on the Asia/Ho_Chi_Minh day boundary', () => {
  it('maps an instant to the household local day', () => {
    // Asia/Ho_Chi_Minh is UTC+7 year-round (no DST).
    expect(householdDayKey('2026-08-06T16:59:59Z')).toBe('2026-08-06'); // 23:59:59 local
    expect(householdDayKey('2026-08-06T17:00:00Z')).toBe('2026-08-07'); // 00:00:00 local
    expect(householdDayKey('not-a-date')).toBeNull();
  });

  it('excludes sessions that finished before local midnight', () => {
    const yesterday = session({ sessionId: 'yesterday', completedAt: '2026-08-06T16:59:59Z', durationSec: 600 });
    const today = session({ sessionId: 'today', completedAt: '2026-08-06T17:00:01Z', durationSec: 180 });
    const todayFailed = session({ sessionId: 'today-failed', completedAt: '2026-08-06T18:00:00Z', durationSec: 60, terminalState: 'FAILED' });

    // 00:30 local on 2026-08-07.
    const dashboard = buildCanonicalProgressDashboard(
      { ...emptyStatus, recentSessions: { items: [yesterday, today, todayFailed], nextCursor: null } },
      undefined,
      Date.parse('2026-08-06T17:30:00Z'),
    );

    expect(dashboard.todayActiveSec).toBe(240);
    expect(dashboard.todayLessonsCompleted).toBe(1);
    // Lifetime aggregates stay lifetime.
    expect(dashboard.recentDurationSec).toBe(840);
    expect(dashboard.completedSessions).toBe(2);
  });

  it('resets the today bucket the moment the local day rolls over', () => {
    const items = [session({ sessionId: 'late', completedAt: '2026-08-06T16:30:00Z', durationSec: 420 })];
    const beforeMidnight = buildCanonicalProgressDashboard({ ...emptyStatus, recentSessions: { items, nextCursor: null } }, undefined, Date.parse('2026-08-06T16:59:00Z'));
    const afterMidnight = buildCanonicalProgressDashboard({ ...emptyStatus, recentSessions: { items, nextCursor: null } }, undefined, Date.parse('2026-08-06T17:00:01Z'));

    expect(beforeMidnight.todayActiveSec).toBe(420);
    expect(afterMidnight.todayActiveSec).toBe(0);
    expect(afterMidnight.todayLessonsCompleted).toBe(0);
  });
});

describe('T3.3 — long history pagination', () => {
  beforeEach(() => { jest.clearAllMocks(); latestFocusEffect = null; });

  it('accumulates pages without re-listing a session the previous page already carried', async () => {
    const page1 = { items: [session({ sessionId: 's-1' }), session({ sessionId: 's-2' })], nextCursor: 'cursor-2' };
    const page2 = { items: [session({ sessionId: 's-2' }), session({ sessionId: 's-3' })], nextCursor: null };
    mockHistory.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

    const { Wrapper } = wrapper();
    const view = renderHook(() => useParentLearningHistoryQuery('child-1'), { wrapper: Wrapper });
    await waitFor(() => expect(view.result.current.data?.items).toHaveLength(2));

    await act(async () => { await view.result.current.fetchNextPage(); });
    await waitFor(() => expect(view.result.current.isFetchingNextPage).toBe(false));

    expect(view.result.current.data?.items.map(item => item.sessionId)).toEqual(['s-1', 's-2', 's-3']);
    expect(view.result.current.data?.nextCursor).toBeNull();
    expect(mockHistory).toHaveBeenLastCalledWith('child-1', 'cursor-2');
    view.unmount();
  });
});

describe('T3.3 — the dashboard refuses to serve silently stale data on re-focus', () => {
  beforeEach(() => { jest.clearAllMocks(); latestFocusEffect = null; });

  it('refetches the parent projection when the screen is focused again', async () => {
    const first: ParentLearningStatus = { ...emptyStatus, projectionRevision: '10', courseProgress: [{ courseId: 'course-1', title: 'English', currentLessonPosition: 2, completedLessonCount: 1, totalLessonCount: 4, positionPercent: 25, suggestedNextLesson: null }] };
    const fresh: ParentLearningStatus = { ...first, projectionRevision: '11', courseProgress: [{ ...first.courseProgress[0], completedLessonCount: 3, positionPercent: 75 }] };
    mockStatus.mockResolvedValueOnce(first).mockResolvedValue(fresh);
    mockHistory.mockResolvedValue({ items: [], nextCursor: null });

    const { Wrapper } = wrapper();
    const view = renderHook(() => useChildProgressDashboardQuery('child-1'), { wrapper: Wrapper });
    await waitFor(() => expect(view.result.current.data?.completedLessons).toBe(1));
    expect(mockStatus).toHaveBeenCalledTimes(1);

    // The first focus is the mount that already fetched — it must not double-fetch.
    await act(async () => { latestFocusEffect?.(); await Promise.resolve(); });
    expect(mockStatus).toHaveBeenCalledTimes(1);

    // Navigating back to a screen that stayed mounted must not leave stale totals on screen.
    await act(async () => { latestFocusEffect?.(); await Promise.resolve(); });
    await waitFor(() => expect(view.result.current.data?.completedLessons).toBe(3));
    expect(mockStatus).toHaveBeenCalledTimes(2);
    view.unmount();
  });
});
