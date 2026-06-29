// TodayProgressScreen renders the child-scoped lesson-progress feed under a
// "You practiced speaking!" celebration. The body-branching block (source
// lines 69-77) — loading message, error retry, empty-state, and the populated
// ProgressBody — was uncovered. These tests drive each arm:
//   - isLoading  -> "Loading progress"
//   - isError    -> ProgressError retry path
//   - empty/only-failure -> "No practice yet" header + "No lessons yet"
//   - populated  -> celebration header + ProgressBody (lessonTitle, chips, state)
// The isCelebratable filter is exercised by feeding a CANCELLED row first.

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';

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

const TodayProgressScreen = require('@/features/progress/screens/TodayProgressScreen').default;

function householdWith(children: Array<{ id: string }> | undefined): void {
  mockedUseHousehold.mockReturnValue({ children, activeChild: children?.[0] ?? null } as never);
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
    completedAt: '2026-05-18T10:05:00.000Z',
    stepsCompleted: 4,
    stepsSucceeded: 3,
    lastEventAt: '2026-05-18T10:05:00.000Z',
    createdAt: '2026-05-18T09:59:00.000Z',
    updatedAt: '2026-05-18T10:05:00.000Z',
    ...overrides,
  };
}

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 't', name: ROUTES.TodayProgressScreen, params: undefined };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const tree = render(
    <QueryClientProvider client={queryClient}>
      <TodayProgressScreen navigation={navigation as never} route={route as never} />
    </QueryClientProvider>,
  );
  return { ...tree, navigation };
}

describe('TodayProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    householdWith([{ id: 'child-1' }]);
  });

  it('shows the loading message while the feed resolves', async () => {
    let resolve!: (v: AssignmentProgress[]) => void;
    mockGetChildLessonProgress.mockReturnValueOnce(
      new Promise<AssignmentProgress[]>((r) => { resolve = r; }),
    );
    const { getByText } = renderScreen();
    expect(getByText('Loading progress')).toBeTruthy();
    resolve([]);
    await waitFor(() => expect(getByText('No lessons yet')).toBeTruthy());
  });

  it('renders the populated body and celebration header for a completed lesson', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment()]);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('You practiced speaking!')).toBeTruthy());
    // ProgressBody fields
    expect(getByText('Greetings')).toBeTruthy();
    expect(getByText('Finished')).toBeTruthy();
    expect(getByText('steps right')).toBeTruthy();
  });

  it('skips a CANCELLED row and falls back to "No practice yet" when nothing is celebratable', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([
      makeAssignment({ state: 'CANCELLED' }),
      makeAssignment({ state: 'FAILED' }),
    ]);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('No lessons yet')).toBeTruthy());
    expect(getByText('No practice yet')).toBeTruthy();
    expect(queryByText('You practiced speaking!')).toBeNull();
  });

  it('renders the error branch with a working retry', async () => {
    mockGetChildLessonProgress.mockRejectedValueOnce(new Error('boom'));
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment()]);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Progress unavailable')).toBeTruthy());
    fireEvent.press(getByText('Tap to try again.'));
    await waitFor(() => expect(getByText('You practiced speaking!')).toBeTruthy());
  });

  it('passes an unknown state through stateLabel and omits a missing lessonTitle', async () => {
    // state not in STATE_COPY -> the `?? state` fallback (line 41);
    // lessonTitle null -> the false arm of the title ternary (line 87).
    mockGetChildLessonProgress.mockResolvedValueOnce([
      makeAssignment({ state: 'QUEUED' as never, lessonTitle: null as never }),
    ]);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('QUEUED')).toBeTruthy());
    expect(queryByText('Greetings')).toBeNull();
  });

  it('"Back home" CTA navigates to HomeHubScreen', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([]);
    const { getByText, navigation } = renderScreen();
    await waitFor(() => expect(getByText('No lessons yet')).toBeTruthy());
    fireEvent.press(getByText('Back home'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });
});
