import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { ParentActiveLearning, ParentCourseProgress, ParentLearningStatus, ParentSessionSummary } from '@/services/api/parentLearning.api';
import { parentLearningHistoryKey, useParentLearningHistoryQuery } from '@/features/parent/hooks/useParentLearningHistoryQuery';
import { parentLearningStatusKey, useParentLearningStatusQuery } from '@/features/parent/hooks/useParentLearningStatusQuery';
import { childLessonProgressQueryKey } from './useChildLessonProgressQuery';

export interface ChildProgressDashboard {
  activeLearning: ParentActiveLearning | null;
  sessions: ParentSessionSummary[];
  courses: ParentCourseProgress[];
  completedLessons: number;
  totalLessons: number;
  completedSessions: number;
  failedSessions: number;
  recentDurationSec: number;
  todayLessonsCompleted: number;
  todayActiveSec: number;
}

// Households are Asia/Ho_Chi_Minh, a fixed UTC+7 zone with no DST, so the local day
// is derived arithmetically. Hermes builds do not always ship a full ICU timezone
// database, so `Intl` with an explicit timeZone is not safe to rely on here.
const HOUSEHOLD_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** The Asia/Ho_Chi_Minh calendar day (YYYY-MM-DD) an instant falls in, or null if unparseable. */
export function householdDayKey(instant: string | number | Date): string | null {
  const time = new Date(instant).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time + HOUSEHOLD_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

export function childProgressDashboardQueryKey(childId: string | undefined) {
  return ['child-progress-dashboard', 'child', childId] as const;
}

/**
 * The projection may only ever be counted per course key. Counting the rows it
 * arrives in is the version-space defect class that keeps recurring across this
 * stack, and here it would silently double a parent's lesson totals.
 */
function coursesByKey(courses: ParentCourseProgress[]): ParentCourseProgress[] {
  const unique = new Map<string, ParentCourseProgress>();
  for (const course of courses) if (!unique.has(course.courseId)) unique.set(course.courseId, course);
  return [...unique.values()];
}

export function buildCanonicalProgressDashboard(
  status: ParentLearningStatus,
  history?: ParentSessionSummary[],
  now: number = Date.now(),
): ChildProgressDashboard {
  const sessions = history ?? status.recentSessions.items;
  const courses = coursesByKey(status.courseProgress);
  const todayKey = householdDayKey(now);
  const todaySessions = todayKey === null ? [] : sessions.filter(session => householdDayKey(session.completedAt) === todayKey);
  return {
    activeLearning: status.activeLearning,
    sessions,
    courses,
    completedLessons: courses.reduce((sum, course) => sum + course.completedLessonCount, 0),
    totalLessons: courses.reduce((sum, course) => sum + course.totalLessonCount, 0),
    completedSessions: sessions.filter(session => session.terminalState === 'COMPLETED').length,
    failedSessions: sessions.filter(session => session.terminalState !== 'COMPLETED').length,
    recentDurationSec: sessions.reduce((sum, session) => sum + session.durationSec, 0),
    todayLessonsCompleted: todaySessions.filter(session => session.terminalState === 'COMPLETED').length,
    todayActiveSec: todaySessions.reduce((sum, session) => sum + session.durationSec, 0),
  };
}

export function useChildProgressDashboardQuery(childId: string | undefined) {
  const queryClient = useQueryClient();
  const statusQuery = useParentLearningStatusQuery(childId);
  const historyQuery = useParentLearningHistoryQuery(childId);
  const historyItems = historyQuery.data?.items;
  const data = React.useMemo(
    () => statusQuery.data ? buildCanonicalProgressDashboard(statusQuery.data, historyItems) : undefined,
    [historyItems, statusQuery.data],
  );
  const dependencyRevision = `${statusQuery.data?.projectionRevision ?? '0'}:${historyItems?.map(item => item.sessionId).join(',') ?? ''}`;

  React.useEffect(() => {
    if (!childId || !statusQuery.data) return;
    queryClient.removeQueries({ queryKey: childProgressDashboardQueryKey(childId), exact: true });
    void queryClient.invalidateQueries({ queryKey: childLessonProgressQueryKey(childId) });
  }, [childId, dependencyRevision, queryClient, statusQuery.data]);

  // Re-focusing a screen that stayed mounted must never leave a parent reading a
  // cached projection (or a "today" bucket built before local midnight). The mount
  // fetch already covers the first focus.
  const initialFocusSeenRef = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (!childId) return undefined;
      if (!initialFocusSeenRef.current) {
        initialFocusSeenRef.current = true;
        return undefined;
      }
      void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
      void queryClient.invalidateQueries({ queryKey: parentLearningHistoryKey(childId) });
      return undefined;
    }, [childId, queryClient]),
  );

  return {
    ...statusQuery,
    data,
    isLoading: statusQuery.isLoading || (!historyQuery.data && historyQuery.isLoading),
    isError: statusQuery.isError && !statusQuery.data,
    isFetching: statusQuery.isFetching || historyQuery.isFetching,
    refetch: async () => {
      const [statusResult] = await Promise.all([statusQuery.refetch(), historyQuery.refetch()]);
      return statusResult;
    },
  };
}
