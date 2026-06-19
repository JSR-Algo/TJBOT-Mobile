// Lock in the success-branch fix from Batch 1:
//   - When `getParentSummary` resolves, the screen MUST move to a
//     'success' state and NOT render the "Parent summary unavailable"
//     failure copy.
//
// This regression would have re-introduced the audit's CRITICAL finding
// "ParentSummaryScreen flips successful API response to failure state —
// child screen never renders real data even when API returns 200".

import React from 'react';
import type { RouteProp } from '@react-navigation/native';
import { act, render, waitFor } from '@testing-library/react-native';
import { ParentSessionProvider } from '../../../src/features/parent/context/ParentSessionContext';
import { ROUTES, type RootStackParamList } from '../../../src/navigation/routes';
import { setAppLanguage } from '../../../src/services/i18n/i18n';

// Treat useFocusEffect as useEffect so the load runs on mount without a
// real NavigationContainer mounted.
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

// Disable the parent-gate guard for this test — we are exercising the
// API/render path, not the gate behaviour. Guard behaviour has its own
// dedicated test (use-parent-gate-guard.test.tsx).
jest.mock('../../../src/features/parent/hooks/useParentGateGuard', () => ({
  useParentGateGuard: () => undefined,
}));

const mockGetParentSummary = jest.fn();
jest.mock('../../../src/services/api/parent.api', () => ({
  getParentSummary: () => mockGetParentSummary(),
}));

const mockGetChildProgress = jest.fn();
const mockGetChildLessonProgress = jest.fn();
jest.mock('../../../src/services/api/progress.api', () => ({
  getChildProgress: (childId: string) => mockGetChildProgress(childId),
  getChildLessonProgress: (childId: string) => mockGetChildLessonProgress(childId),
}));

const mockGetKPIs = jest.fn();
const mockGetPronunciationTrend = jest.fn();
jest.mock('../../../src/services/api/learning', () => ({
  getKPIs: (childId: string) => mockGetKPIs(childId),
  getPronunciationTrend: (childId: string, days?: number) => mockGetPronunciationTrend(childId, days),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: () => ({ activeChild: { id: 'child-1', name: 'Mai' } }),
}));

// Imported after mocks so the screen module picks up the mocked seams.
const ParentSummaryScreen = require('../../../src/features/parent/screens/ParentSummaryScreen').default;

type ParentSummaryRoute = RouteProp<RootStackParamList, typeof ROUTES.ParentSummaryScreen>;

function fakeNavigation() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  };
}

function fakeRoute(): ParentSummaryRoute {
  return { key: 'p', name: ROUTES.ParentSummaryScreen, params: undefined };
}

function renderScreen() {
  const navigation = fakeNavigation();
  const route = fakeRoute();
  return render(
    <ParentSessionProvider>
      <ParentSummaryScreen navigation={navigation} route={route} />
    </ParentSessionProvider>,
  );
}

describe('ParentSummaryScreen', () => {
  beforeEach(() => {
    mockGetParentSummary.mockReset();
    mockGetChildProgress.mockReset();
    mockGetChildLessonProgress.mockReset();
    mockGetKPIs.mockReset();
    mockGetPronunciationTrend.mockReset();
    mockGetChildProgress.mockResolvedValue({
      childId: 'child-1',
      lessonsCompleted: 7,
      currentStreakDays: 3,
      masteredWords: 18,
      byCourse: [{ courseId: 'animals', lessonsCompleted: 4, lessonsTotal: 10 }],
    });
    mockGetChildLessonProgress.mockResolvedValue([
      {
        assignmentId: 'assign-1',
        deviceId: 'device-1',
        childId: 'child-1',
        lessonId: 'lesson-1',
        lessonVersion: 1,
        lessonTitle: 'Barn',
        profile: 'espTft',
        state: 'COMPLETED',
        startedAt: '2026-06-18T08:00:00.000Z',
        completedAt: '2026-06-18T08:05:00.000Z',
        stepsCompleted: 5,
        stepsSucceeded: 4,
        lastEventAt: '2026-06-18T08:05:00.000Z',
        createdAt: '2026-06-18T07:59:00.000Z',
        updatedAt: '2026-06-18T08:05:00.000Z',
      },
    ]);
    mockGetKPIs.mockResolvedValue({
      vocab_words_this_week: 5,
      speaking_confidence: 62,
      engagement_score: 80,
      retention_rate: 75,
      sessions_this_week: 4,
      daily_streak: 3,
      weak_words: ['red'],
    });
    mockGetPronunciationTrend.mockResolvedValue({ avg_score: 71, trend: 'improving', points: [] });
  });

  it('does not render the failure copy when the API call succeeds', async () => {
    mockGetParentSummary.mockResolvedValueOnce({ weekMinutes: 8, weekLessons: 1, streak: 2, topWords: ['hello'] });

    const { queryByText } = renderScreen();

    // Wait until the load has resolved — the loading message should be gone
    // and the failure message must NEVER have appeared.
    await waitFor(() => {
      expect(queryByText('Loading parent summary')).toBeNull();
    });

    expect(queryByText('Parent summary unavailable')).toBeNull();
    expect(queryByText('Try again.')).toBeNull();
    expect(queryByText('Parent summary offline')).toBeNull();
  });

  it('keeps parent summary backend failures explicit instead of masking them as empty activity', async () => {
    mockGetParentSummary.mockRejectedValueOnce(
      Object.assign(new Error('Parent summary API route not documented'), {
        code: 'BACKEND_CONTRACT_UNAVAILABLE',
      }),
    );

    const { findByText, queryByText } = renderScreen();

    await findByText('Parent summary unavailable');

    expect(queryByText('No lesson activity has synced yet.')).toBeNull();
    expect(queryByText('Try again.')).toBeTruthy();
    expect(queryByText('Retry')).toBeTruthy();
    expect(queryByText('Mira practiced greetings and feelings for about 8 minutes.')).toBeNull();
  });

  it('renders failure copy when the API call rejects', async () => {
    mockGetParentSummary.mockRejectedValueOnce(Object.assign(new Error('network'), { isAxiosError: true }));

    const { findByText, queryByText } = renderScreen();

    await findByText('Parent summary unavailable');

    expect(queryByText('Loading parent summary')).toBeNull();
    expect(queryByText('No lesson activity has synced yet.')).toBeNull();
    expect(queryByText('Retry')).toBeTruthy();
  });

  it('treats malformed parent summary payloads as unavailable instead of empty activity', async () => {
    mockGetParentSummary.mockResolvedValueOnce({ weekMinutes: '5', weekLessons: 2, streak: 1, topWords: [] });

    const { findByText, queryByText } = renderScreen();

    await findByText('Parent summary unavailable');

    expect(queryByText('No lesson activity has synced yet.')).toBeNull();
    expect(queryByText('Tuần này: 2 bài và 5 phút.')).toBeNull();
  });

  it('translates dynamic parent summary copy in Vietnamese', async () => {
    await setAppLanguage('vi');
    mockGetParentSummary.mockResolvedValueOnce({ weekMinutes: 5, weekLessons: 2, streak: 3, topWords: [] });

    const { findByText } = renderScreen();

    await findByText('Tuần này: 2 bài và 5 phút.');
    await findByText('2 bài trong tuần này');
  });

  it('eventually clears the loading message after a successful fetch', async () => {
    let resolveIt: ((v: unknown) => void) | null = null;
    mockGetParentSummary.mockImplementationOnce(
      () => new Promise(res => { resolveIt = res; }),
    );

    const { queryByText } = renderScreen();

    // Mid-flight: loading is shown.
    expect(queryByText('Loading parent summary')).not.toBeNull();

    await act(async () => {
      resolveIt!({ weekMinutes: 1, weekLessons: 1, streak: 1, topWords: [] });
    });

    await waitFor(() => {
      expect(queryByText('Loading parent summary')).toBeNull();
    });

    // After load, neither loading nor failure copy is on screen.
    expect(queryByText('Parent summary unavailable')).toBeNull();
  });

  it('renders course quality and learning path dashboards from child-scoped feeds', async () => {
    mockGetParentSummary.mockResolvedValueOnce({ weekMinutes: 8, weekLessons: 1, streak: 2, topWords: ['hello'] });

    const { findByText } = renderScreen();

    await findByText('Course quality');
    await findByText('80% step success');
    await findByText('Learning path');
    await findByText('animals · 40%');
    await findByText('Pronunciation improving · 71%');
  });
});
