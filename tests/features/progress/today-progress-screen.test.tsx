// TodayProgressScreen is a data dashboard: it fans out the lesson-progress feed
// (backbone) plus the aggregate progress / KPIs / pronunciation-trend sources
// (enrichment, fault-tolerant), folds them through buildCourseInsightDashboard,
// and renders a hero band, quality cards, weekly strip, learning path, and
// today's-lesson card under a celebration header. These tests drive:
//   - isLoading  -> "Loading progress"
//   - isError    -> ProgressError retry path (backbone feed rejects)
//   - empty/only-failure -> "No practice yet" header + "No lessons yet"
//   - populated  -> celebration header + hero/quality/learning-path/today cards
//   - allSettled resilience -> enrichment sources reject but backbone resolves
// The isCelebratable filter is exercised by feeding a CANCELLED row first.

import React from 'react';
import { act, render, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  getChildLessonProgress,
  getChildProgress,
  type AssignmentProgress,
  type ChildProgress,
} from '@/services/api/progress.api';
import { getKPIs, getPronunciationTrend, type KPIs, type PronunciationTrend } from '@/services/api/learning';

let latestFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
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

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

jest.mock('@/services/api/progress.api', () => ({
  __esModule: true,
  getChildLessonProgress: jest.fn(),
  getChildProgress: jest.fn(),
}));

jest.mock('@/services/api/learning', () => ({
  __esModule: true,
  getKPIs: jest.fn(),
  getPronunciationTrend: jest.fn(),
}));

const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;
const mockGetChildLessonProgress = getChildLessonProgress as jest.MockedFunction<typeof getChildLessonProgress>;
const mockGetChildProgress = getChildProgress as jest.MockedFunction<typeof getChildProgress>;
const mockGetKPIs = getKPIs as jest.MockedFunction<typeof getKPIs>;
const mockGetPronunciationTrend = getPronunciationTrend as jest.MockedFunction<typeof getPronunciationTrend>;

const TodayProgressScreen = require('@/features/progress/screens/TodayProgressScreen').default;
const queryClients: QueryClient[] = [];

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

function makeChildProgress(overrides: Partial<ChildProgress> = {}): ChildProgress {
  return {
    childId: 'child-1',
    lessonsCompleted: 6,
    currentStreakDays: 3,
    masteredWords: 12,
    byCourse: [
      { courseId: 'Animals', lessonsCompleted: 4, lessonsTotal: 8 },
    ],
    ...overrides,
  };
}

function makeKpis(overrides: Partial<KPIs> = {}): KPIs {
  return {
    vocab_words_this_week: 5,
    speaking_confidence: 70,
    engagement_score: 80,
    retention_rate: 90,
    sessions_this_week: 3,
    daily_streak: 3,
    weak_words: [],
    ...overrides,
  };
}

function makeTrend(overrides: Partial<PronunciationTrend> = {}): PronunciationTrend {
  return {
    points: [{ date: '2026-05-18', score: 82 }],
    avg_score: 82,
    trend: 'improving',
    ...overrides,
  };
}

// Default the enrichment sources to healthy so each test only sets what it needs.
function primeEnrichmentDefaults(): void {
  mockGetChildProgress.mockResolvedValue(makeChildProgress());
  mockGetKPIs.mockResolvedValue(makeKpis());
  mockGetPronunciationTrend.mockResolvedValue(makeTrend());
}

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 't', name: ROUTES.TodayProgressScreen, params: undefined };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  queryClients.push(queryClient);
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
    latestFocusEffect = null;
    householdWith([{ id: 'child-1' }]);
    primeEnrichmentDefaults();
  });

  afterEach(async () => {
    await act(async () => {
      queryClients.splice(0).forEach(queryClient => queryClient.clear());
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  const EMPTY_AGGREGATE = () =>
    makeChildProgress({ lessonsCompleted: 0, currentStreakDays: 0, masteredWords: 0, byCourse: [] });

  it('shows the loading message while the feed resolves', async () => {
    let resolve!: (v: AssignmentProgress[]) => void;
    mockGetChildLessonProgress.mockReturnValueOnce(
      new Promise<AssignmentProgress[]>((r) => { resolve = r; }),
    );
    mockGetChildProgress.mockResolvedValue(EMPTY_AGGREGATE());
    const { getByText } = renderScreen();
    expect(getByText('Loading progress')).toBeTruthy();
    await act(async () => {
      resolve([]);
    });
    // Even with zero activity the dashboard scaffold renders (hero cards at 0)
    // plus the encouraging first-run hint — never a bare "no data" message.
    await waitFor(() => expect(getByText('Finish a lesson on Robot to fill in your progress.')).toBeTruthy());
    expect(getByText('Day streak')).toBeTruthy();
  });

  it('renders the dashboard and celebration header for a completed lesson', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment()]);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('You practiced speaking!')).toBeTruthy());
    // Hero band
    expect(getByText('Day streak')).toBeTruthy();
    expect(getByText('Lessons done')).toBeTruthy();
    expect(getByText('Mastered words')).toBeTruthy();
    // Quality cards
    expect(getByText('Step success')).toBeTruthy();
    expect(getByText('Completion')).toBeTruthy();
    // Today's lesson card
    expect(getByText('Greetings')).toBeTruthy();
    expect(getByText('Finished')).toBeTruthy();
  });

  it('renders the learning-path rows from the aggregate byCourse', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment()]);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Learning path')).toBeTruthy());
    expect(getByText('Animals')).toBeTruthy();
    expect(getByText('4 of 8 lessons')).toBeTruthy();
  });

  it('stays resilient when enrichment sources reject but the backbone feed resolves', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment()]);
    mockGetChildProgress.mockRejectedValueOnce(new Error('aggregate down'));
    mockGetKPIs.mockRejectedValueOnce(new Error('kpis down'));
    mockGetPronunciationTrend.mockRejectedValueOnce(new Error('trend down'));
    const { getByText } = renderScreen();
    // Backbone alone still drives the celebration + today card (no crash).
    await waitFor(() => expect(getByText('You practiced speaking!')).toBeTruthy());
    expect(getByText('Greetings')).toBeTruthy();
    expect(getByText('Learning path')).toBeTruthy();
  });

  it('skips a CANCELLED row and falls back to "No practice yet" when nothing is celebratable', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([
      makeAssignment({ state: 'CANCELLED' }),
      makeAssignment({ state: 'FAILED' }),
    ]);
    // No aggregate activity either -> empty state.
    mockGetChildProgress.mockResolvedValue(
      makeChildProgress({ lessonsCompleted: 0, currentStreakDays: 0, masteredWords: 0, byCourse: [] }),
    );
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('No practice yet')).toBeTruthy());
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
    mockGetChildLessonProgress.mockResolvedValueOnce([
      makeAssignment({ state: 'QUEUED' as never, lessonTitle: null as never }),
    ]);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('QUEUED')).toBeTruthy());
    expect(queryByText('Greetings')).toBeNull();
  });

  it('"Back home" CTA navigates to HomeHubScreen', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([]);
    mockGetChildProgress.mockResolvedValue(EMPTY_AGGREGATE());
    const { getByText, navigation } = renderScreen();
    await waitFor(() => expect(getByText('Finish a lesson on Robot to fill in your progress.')).toBeTruthy());
    fireEvent.press(getByText('Back home'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });

  it('refetches child progress when the screen receives a later focus event', async () => {
    mockGetChildLessonProgress
      .mockResolvedValueOnce([makeAssignment({ lessonTitle: 'First lesson' })])
      .mockResolvedValueOnce([makeAssignment({ lessonTitle: 'Fresh lesson' })]);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('First lesson')).toBeTruthy());
    expect(mockGetChildLessonProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      latestFocusEffect?.();
      await Promise.resolve();
    });
    expect(mockGetChildLessonProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      latestFocusEffect?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(getByText('Fresh lesson')).toBeTruthy());
    expect(queryByText('First lesson')).toBeNull();
    expect(mockGetChildLessonProgress).toHaveBeenCalledTimes(2);
  });
});
