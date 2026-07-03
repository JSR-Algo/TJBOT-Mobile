import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  childLessonProgressQueryKey,
  useChildLessonProgressQuery,
} from '@/features/progress/hooks/useChildLessonProgressQuery';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';

let latestFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as typeof import('@react-navigation/native');
  const ReactInner = require('react') as typeof import('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => void | (() => void)) => {
      ReactInner.useEffect(() => {
        latestFocusEffect = cb;
        return () => {
          latestFocusEffect = null;
        };
      }, [cb]);
    },
  };
});

jest.mock('@/services/api/progress.api', () => ({
  __esModule: true,
  getChildLessonProgress: jest.fn(),
}));

const mockGetChildLessonProgress = getChildLessonProgress as jest.MockedFunction<typeof getChildLessonProgress>;

function makeAssignment(overrides: Partial<AssignmentProgress> = {}): AssignmentProgress {
  return {
    assignmentId: 'assign-1',
    deviceId: 'device-1',
    childId: 'child-1',
    lessonId: 'lesson-1',
    lessonVersion: 1,
    lessonTitle: 'Greetings',
    profile: 'espTft',
    state: 'RUNNING',
    startedAt: '2026-05-18T10:00:00.000Z',
    completedAt: null,
    stepsCompleted: 3,
    stepsSucceeded: 2,
    lastEventAt: '2026-05-18T10:05:00.000Z',
    createdAt: '2026-05-18T09:59:00.000Z',
    updatedAt: '2026-05-18T10:05:00.000Z',
    ...overrides,
  };
}

function makeWrapper(): React.ComponentType<React.PropsWithChildren> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return function QueryWrapper({ children }: React.PropsWithChildren): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useChildLessonProgressQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestFocusEffect = null;
  });

  it('preserves the child-scoped query key', () => {
    expect(childLessonProgressQueryKey('child-1')).toEqual(['lesson-progress', 'child', 'child-1']);
  });

  it('fetches once on mount and refetches once on a later focus event', async () => {
    mockGetChildLessonProgress
      .mockResolvedValueOnce([makeAssignment({ lessonTitle: 'First lesson' })])
      .mockResolvedValueOnce([makeAssignment({ lessonTitle: 'Fresh lesson' })]);

    const { result } = renderHook(() => useChildLessonProgressQuery('child-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.data?.[0]?.lessonTitle).toBe('First lesson'));
    expect(mockGetChildLessonProgress).toHaveBeenCalledTimes(1);
    expect(mockGetChildLessonProgress).toHaveBeenLastCalledWith('child-1');

    await act(async () => {
      latestFocusEffect?.();
      await Promise.resolve();
    });
    expect(mockGetChildLessonProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      latestFocusEffect?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.data?.[0]?.lessonTitle).toBe('Fresh lesson'));
    expect(mockGetChildLessonProgress).toHaveBeenCalledTimes(2);
    expect(mockGetChildLessonProgress).toHaveBeenLastCalledWith('child-1');
  });

  it('fails closed instead of returning empty progress when manually refetched without a child id', async () => {
    const { result } = renderHook(() => useChildLessonProgressQuery(undefined), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetChildLessonProgress).not.toHaveBeenCalled();

    let refetchResult = result.current;
    await act(async () => {
      refetchResult = await result.current.refetch();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockGetChildLessonProgress).not.toHaveBeenCalled();
    expect(refetchResult.isError).toBe(true);
    expect(refetchResult.data).toBeUndefined();
    expect(refetchResult.error?.message).toBe('CHILD_ID_REQUIRED_FOR_LESSON_PROGRESS');
  });
});
