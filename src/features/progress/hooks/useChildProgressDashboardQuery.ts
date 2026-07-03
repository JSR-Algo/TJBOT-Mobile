import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getChildLessonProgress,
  getChildProgress,
  type AssignmentProgress,
} from '@/services/api/progress.api';
import { getKPIs, getPronunciationTrend } from '@/services/api/learning';
import {
  buildCourseInsightDashboard,
  type CourseInsightDashboard,
} from '@/features/parent/courseInsights';

export interface ChildProgressDashboard {
  insights: CourseInsightDashboard;
  assignments: AssignmentProgress[];
}

export function childProgressDashboardQueryKey(childId: string | undefined) {
  return ['child-progress-dashboard', 'child', childId] as const;
}

// The lesson-progress feed is the backbone (celebration header, today's-lesson
// card, weekly activity strip), so it is awaited directly: if it fails the
// screen has nothing meaningful to show and falls to the error arm. The three
// enrichment sources (aggregate, KPIs, pronunciation) are fanned out with
// `Promise.allSettled` so one slow/5xx endpoint never blanks the dashboard —
// buildCourseInsightDashboard already tolerates null inputs.
async function fetchChildProgressDashboard(childId: string): Promise<ChildProgressDashboard> {
  const assignments = await getChildLessonProgress(childId);

  const [progress, kpis, pronunciationTrend] = await Promise.allSettled([
    getChildProgress(childId),
    getKPIs(childId),
    getPronunciationTrend(childId, 14),
  ]);

  const insights = buildCourseInsightDashboard({
    progress: progress.status === 'fulfilled' ? progress.value : null,
    assignments,
    kpis: kpis.status === 'fulfilled' ? kpis.value : null,
    pronunciationTrend: pronunciationTrend.status === 'fulfilled' ? pronunciationTrend.value : null,
  });

  return { insights, assignments };
}

export function useChildProgressDashboardQuery(
  childId: string | undefined,
): UseQueryResult<ChildProgressDashboard, Error> {
  const enabled = typeof childId === 'string' && childId.length > 0;
  const queryChildId = enabled ? childId : null;
  const query = useQuery<ChildProgressDashboard, Error>({
    queryKey: childProgressDashboardQueryKey(childId),
    queryFn: () => {
      if (!queryChildId) {
        throw new Error('CHILD_ID_REQUIRED_FOR_PROGRESS_DASHBOARD');
      }
      return fetchChildProgressDashboard(queryChildId);
    },
    enabled,
    // Treat data as fresh for 30s so a quick tab bounce (or a sibling screen
    // sharing this key) doesn't re-fan-out all four endpoints on every focus.
    // The focus-refetch below still forces a refresh after the window.
    staleTime: 30_000,
  });
  const refetch = query.refetch;
  const initialFocusSeenRef = React.useRef(false);

  // Refetch on tab re-focus so a lesson finished on the robot shows up without a
  // manual pull — but skip the first focus (the initial fetch already ran).
  useFocusEffect(
    React.useCallback(() => {
      if (!enabled) return undefined;
      if (!initialFocusSeenRef.current) {
        initialFocusSeenRef.current = true;
        return undefined;
      }
      void refetch();
      return undefined;
    }, [enabled, refetch]),
  );

  return query;
}
