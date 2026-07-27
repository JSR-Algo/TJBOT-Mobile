import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParentLearningHistoryQuery } from '@/features/parent/hooks/useParentLearningHistoryQuery';
import { getParentLearningHistory, type ParentSessionSummary } from '@/services/api/parentLearning.api';

jest.mock('@/services/api/parentLearning.api', () => ({
  ...jest.requireActual('@/services/api/parentLearning.api'),
  getParentLearningHistory: jest.fn(),
}));

const mockHistory = getParentLearningHistory as jest.MockedFunction<typeof getParentLearningHistory>;
const item = (sessionId: string): ParentSessionSummary => ({ childId: 'child-1', assignmentId: `a-${sessionId}`, sessionId, courseId: 'course-1', courseTitle: 'English', lessonId: 'lesson-1', lessonTitle: 'Farm', state: 'COMPLETED', completedAt: '2026-07-27T00:00:00Z', durationSec: 10, reportAvailable: true });

function wrapper({ children }: React.PropsWithChildren): React.JSX.Element {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}>{children}</QueryClientProvider>;
}

it('merges cursor pages and deduplicates sessions by session id', async () => {
  mockHistory.mockResolvedValueOnce({ items: [item('s1'), item('s2')], nextCursor: 'p2' })
    .mockResolvedValueOnce({ items: [item('s2'), item('s3')], nextCursor: null });
  const { result } = renderHook(() => useParentLearningHistoryQuery('child-1'), { wrapper });
  await waitFor(() => expect(result.current.data?.items.map(x => x.sessionId)).toEqual(['s1', 's2']));
  await act(async () => { await result.current.fetchNextPage(); });
  await waitFor(() => expect(result.current.data?.items.map(x => x.sessionId)).toEqual(['s1', 's2', 's3']));
});
