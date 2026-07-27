import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useChildProgressDashboardQuery } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import ParentSummaryScreen from '@/features/parent/screens/ParentSummaryScreen';

jest.mock('@/features/parent/hooks/useParentGateGuard', () => ({ useParentGateGuard: () => undefined }));
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: jest.fn() }));
jest.mock('@/features/progress/hooks/useChildProgressDashboardQuery', () => ({ useChildProgressDashboardQuery: jest.fn() }));

const mockHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;
const mockDashboard = useChildProgressDashboardQuery as jest.MockedFunction<typeof useChildProgressDashboardQuery>;

const canonical = {
  activeLearning: null,
  sessions: [{ childId: 'child-1', assignmentId: 'a-1', sessionId: 's-1', courseId: 'c-1', courseTitle: 'English', lessonId: 'l-1', lessonTitle: 'Farm', state: 'COMPLETED', completedAt: new Date().toISOString(), durationSec: 300, reportAvailable: true }],
  courses: [{ courseId: 'c-1', courseTitle: 'English', currentLessonNumber: 5, completedLessons: 4, totalLessons: 10, percent: 40, suggestedNextLesson: { lessonId: 'l-2', lessonTitle: 'Animals' } }],
  completedLessons: 4, totalLessons: 10, completedSessions: 1, failedSessions: 0, recentDurationSec: 300,
};

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  return render(<ParentSummaryScreen navigation={navigation as never} route={{ key: 'p', name: 'ParentSummaryScreen', params: undefined } as never} />);
}

describe('ParentSummaryScreen canonical aggregate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHousehold.mockReturnValue({ activeChild: { id: 'child-1', name: 'Mai' } } as never);
    mockDashboard.mockReturnValue({ data: canonical, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() } as never);
  });

  it('renders only canonical session and course totals', () => {
    const screen = renderScreen();
    expect(screen.getByText('5 min')).toBeTruthy();
    expect(screen.getAllByText('1 recent lesson')).toHaveLength(2);
    expect(screen.getByText('English · 40%')).toBeTruthy();
    expect(screen.getByText('4/10 lessons')).toBeTruthy();
  });

  it('updates immediately when the canonical adapter data changes', () => {
    const screen = renderScreen();
    expect(screen.getByText('4/10 lessons')).toBeTruthy();
    mockDashboard.mockReturnValue({ data: { ...canonical, completedLessons: 5, sessions: [...canonical.sessions, { ...canonical.sessions[0], sessionId: 's-2' }], completedSessions: 2, recentDurationSec: 600, courses: [{ ...canonical.courses[0], completedLessons: 5, percent: 50 }] }, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() } as never);
    act(() => screen.rerender(<ParentSummaryScreen navigation={{ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() } as never} route={{ key: 'p', name: 'ParentSummaryScreen', params: undefined } as never} />));
    expect(screen.queryByText('4/10 lessons')).toBeNull();
    expect(screen.getByText('5/10 lessons')).toBeTruthy();
    expect(screen.getAllByText('2 recent lessons')).toHaveLength(2);
  });

  it('renders loading, empty, and offline states', () => {
    mockDashboard.mockReturnValue({ data: undefined, isLoading: true } as never);
    expect(renderScreen().getByText('Loading parent summary')).toBeTruthy();
    mockDashboard.mockReturnValue({ data: { ...canonical, sessions: [], courses: [], completedLessons: 0, totalLessons: 0, completedSessions: 0, recentDurationSec: 0 }, isLoading: false, isError: false } as never);
    expect(renderScreen().getByText('No lesson activity has synced yet.')).toBeTruthy();
    mockDashboard.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() } as never);
    expect(renderScreen().getByText('Parent summary unavailable')).toBeTruthy();
  });
});
