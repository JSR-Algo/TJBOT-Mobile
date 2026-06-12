// ParentHistoryScreen now renders REAL terminal lesson assignments (US-006
// child-scoped feed) instead of the old fabricated 30-day calendar. These
// tests lock in the loading → success/empty/error branching off
// getChildLessonProgress.

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParentSessionProvider } from '../../../src/features/parent/context/ParentSessionContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';

jest.mock('@react-navigation/native', () => {
  const ReactInner = require('react') as typeof import('react');
  return {
    useFocusEffect: (cb: () => undefined | (() => void)) => {
      ReactInner.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

jest.mock('../../../src/features/parent/hooks/useParentGateGuard', () => ({
  useParentGateGuard: () => undefined,
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

jest.mock('@/services/api/progress.api', () => ({
  __esModule: true,
  getChildLessonProgress: jest.fn(),
}));

const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;
const mockGetChildLessonProgress = getChildLessonProgress as jest.MockedFunction<typeof getChildLessonProgress>;

const ParentHistoryScreen = require('../../../src/features/parent/screens/ParentHistoryScreen').default;

function householdWith(children: Array<{ id: string }> | undefined): void {
  mockedUseHousehold.mockReturnValue({ children } as never);
}

function makeAssignment(overrides: Partial<AssignmentProgress> = {}): AssignmentProgress {
  return {
    assignmentId: 'assign-1',
    deviceId: 'device-1',
    childId: 'child-1',
    lessonId: 'lesson-1',
    lessonVersion: 1,
    lessonTitle: 'Greetings',
    profile: 'espTft',
    state: 'COMPLETED',
    startedAt: '2026-05-18T10:00:00.000Z',
    completedAt: '2026-05-18T10:10:00.000Z',
    stepsCompleted: 5,
    stepsSucceeded: 4,
    lastEventAt: '2026-05-18T10:10:00.000Z',
    createdAt: '2026-05-18T09:59:00.000Z',
    updatedAt: '2026-05-18T10:10:00.000Z',
    ...overrides,
  };
}

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 'h', name: 'ParentHistoryScreen', params: undefined };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ParentSessionProvider>
        <ParentHistoryScreen navigation={navigation as any} route={route as any} />
      </ParentSessionProvider>
    </QueryClientProvider>,
  );
}

describe('ParentHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    householdWith([{ id: 'child-1' }]);
  });

  it('renders finished lessons and not the loading/failure copy after a successful fetch', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment()]);

    const { queryByText, findByText } = renderScreen();

    await findByText('Greetings');
    expect(queryByText('Loading history')).toBeNull();
    expect(queryByText('History unavailable')).toBeNull();
    expect(queryByText('Retry')).toBeNull();
  });

  it('renders the empty state when there are no finished lessons', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment({ state: 'RUNNING', completedAt: null })]);

    const { findByText } = renderScreen();

    await findByText('No lessons yet');
  });

  it('renders the retry affordance when the fetch rejects', async () => {
    mockGetChildLessonProgress.mockRejectedValueOnce(Object.assign(new Error('network'), { isAxiosError: true }));
    const { findByText, queryByText } = renderScreen();
    await findByText('Retry');
    expect(queryByText('Loading history')).toBeNull();
  });

  it('shows loading copy while the fetch is in flight', async () => {
    let resolveIt: ((v: AssignmentProgress[]) => void) | null = null;
    mockGetChildLessonProgress.mockImplementationOnce(
      () => new Promise((res) => { resolveIt = res; }),
    );

    const { queryByText } = renderScreen();
    expect(queryByText('Loading history')).not.toBeNull();

    await act(async () => { resolveIt!([]); });
    await waitFor(() => {
      expect(queryByText('Loading history')).toBeNull();
    });
  });
});
