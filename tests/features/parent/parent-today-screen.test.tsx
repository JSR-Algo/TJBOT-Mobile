// ParentTodayScreen now renders REAL lesson-progress (US-006 child-scoped
// feed) instead of the old hardcoded facade. These tests lock in the
// loading → success/empty/error branching off getChildLessonProgress.

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

const ParentTodayScreen = require('../../../src/features/parent/screens/ParentTodayScreen').default;

// Only `children` is read by the screen (children[0]?.id).
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

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 't', name: 'ParentTodayScreen', params: undefined };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ParentSessionProvider>
        <ParentTodayScreen navigation={navigation as any} route={route as any} />
      </ParentSessionProvider>
    </QueryClientProvider>,
  );
}

describe('ParentTodayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    householdWith([{ id: 'child-1' }]);
  });

  it('renders the active lesson and not the failure copy when the fetch succeeds', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment()]);

    const { queryByText, findByText } = renderScreen();

    await findByText('Greetings');
    expect(queryByText("Loading today's progress")).toBeNull();
    expect(queryByText('Today summary unavailable')).toBeNull();
    expect(queryByText('No lessons yet')).toBeNull();
  });

  it('renders the empty state when there is no active assignment', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment({ state: 'COMPLETED', completedAt: '2026-05-18T10:10:00.000Z' })]);

    const { findByText, queryByText } = renderScreen();

    await findByText('No lessons yet');
    expect(queryByText("Loading today's progress")).toBeNull();
  });

  it('renders the retry affordance when the fetch rejects', async () => {
    mockGetChildLessonProgress.mockRejectedValueOnce(Object.assign(new Error('network'), { isAxiosError: true }));
    const { findByText, queryByText } = renderScreen();
    await findByText('Retry');
    expect(queryByText("Loading today's progress")).toBeNull();
  });

  it('clears the loading message after a successful fetch', async () => {
    let resolveIt: ((v: AssignmentProgress[]) => void) | null = null;
    mockGetChildLessonProgress.mockImplementationOnce(
      () => new Promise((res) => { resolveIt = res; }),
    );

    const { queryByText } = renderScreen();
    expect(queryByText("Loading today's progress")).not.toBeNull();

    await act(async () => { resolveIt!([makeAssignment()]); });
    await waitFor(() => {
      expect(queryByText("Loading today's progress")).toBeNull();
    });
  });
});
