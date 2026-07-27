import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';
import { parentLearningHistoryKey } from '@/features/parent/hooks/useParentLearningHistoryQuery';
import { parentLearningStatusKey } from '@/features/parent/hooks/useParentLearningStatusQuery';

export function childLessonProgressQueryKey(childId: string | undefined) {
  return ['lesson-progress', 'child', childId] as const;
}

export function useChildLessonProgressQuery(
  childId: string | undefined,
): UseQueryResult<AssignmentProgress[], Error> {
  const enabled = typeof childId === 'string' && childId.length > 0;
  const queryClient = useQueryClient();
  const queryChildId = enabled ? childId : null;
  const query = useQuery<AssignmentProgress[], Error>({
    queryKey: childLessonProgressQueryKey(childId),
    queryFn: () => {
      if (!queryChildId) {
        throw new Error('CHILD_ID_REQUIRED_FOR_LESSON_PROGRESS');
      }
      return getChildLessonProgress(queryChildId);
    },
    enabled,
  });
  const refetch = query.refetch;
  const initialFocusSeenRef = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!enabled) return undefined;
      if (!initialFocusSeenRef.current) {
        initialFocusSeenRef.current = true;
        return undefined;
      }
      void refetch();
      void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
      void queryClient.invalidateQueries({ queryKey: parentLearningHistoryKey(childId) });
      return undefined;
    }, [childId, enabled, queryClient, refetch]),
  );

  return query;
}
