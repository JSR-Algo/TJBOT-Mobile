import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ParentActiveLearning, ParentCourseProgress, ParentLearningStatus, ParentSessionSummary } from '@/services/api/parentLearning.api';
import { useParentLearningHistoryQuery } from '@/features/parent/hooks/useParentLearningHistoryQuery';
import { useParentLearningStatusQuery } from '@/features/parent/hooks/useParentLearningStatusQuery';
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
}

export function childProgressDashboardQueryKey(childId: string | undefined) {
  return ['child-progress-dashboard', 'child', childId] as const;
}

export function buildCanonicalProgressDashboard(status: ParentLearningStatus, history?: ParentSessionSummary[]): ChildProgressDashboard {
  const sessions = history ?? status.recentSessions.items;
  return {
    activeLearning: status.activeLearning,
    sessions,
    courses: status.courseProgress,
    completedLessons: status.courseProgress.reduce((sum, course) => sum + course.completedLessonCount, 0),
    totalLessons: status.courseProgress.reduce((sum, course) => sum + course.totalLessonCount, 0),
    completedSessions: sessions.filter(session => session.terminalState === 'COMPLETED').length,
    failedSessions: sessions.filter(session => session.terminalState !== 'COMPLETED').length,
    recentDurationSec: sessions.reduce((sum, session) => sum + session.durationSec, 0),
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
