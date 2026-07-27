import React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getParentLearningHistory, type ParentLearningHistoryPage, type ParentSessionSummary } from '@/services/api/parentLearning.api';

export const parentLearningHistoryKey = (childId: string) => ['parent-learning-history', childId] as const;

export function useParentLearningHistoryQuery(childId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: parentLearningHistoryKey(childId ?? ''),
    queryFn: ({ pageParam }) => getParentLearningHistory(childId!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page: ParentLearningHistoryPage) => page.nextCursor ?? undefined,
    enabled: Boolean(childId),
  });
  const items: ParentSessionSummary[] = [];
  const seen = new Set<string>();
  for (const page of query.data?.pages ?? []) for (const item of page.items) if (!seen.has(item.sessionId)) { seen.add(item.sessionId); items.push(item); }
  const sessionSignature = items.map(item => item.sessionId).join(',');
  React.useEffect(() => {
    if (!childId || !query.data) return;
    void queryClient.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
    queryClient.removeQueries({ queryKey: ['child-progress-dashboard', 'child', childId], exact: true });
  }, [childId, query.data, queryClient, sessionSignature]);
  return { ...query, data: query.data ? { items, nextCursor: query.data.pages.at(-1)?.nextCursor ?? null } : undefined };
}
