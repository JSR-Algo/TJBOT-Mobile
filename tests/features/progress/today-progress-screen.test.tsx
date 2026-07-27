import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useChildProgressDashboardQuery } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import TodayProgressScreen from '@/features/progress/screens/TodayProgressScreen';

jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: jest.fn() }));
jest.mock('@/features/progress/hooks/useChildProgressDashboardQuery', () => ({ useChildProgressDashboardQuery: jest.fn() }));
const mockHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;
const mockDashboard = useChildProgressDashboardQuery as jest.MockedFunction<typeof useChildProgressDashboardQuery>;

const canonical = {
  activeLearning: { assignmentId: 'a-2', sessionId: 's-2', courseId: 'c-1', courseTitle: 'English', lessonId: 'l-2', lessonTitle: 'Animals', state: 'LISTEN', startedAt: null, currentStep: null, positionPercent: 50, activeDurationSec: 90 },
  sessions: [{ childId: 'child-1', assignmentId: 'a-1', sessionId: 's-1', courseId: 'c-1', courseTitle: 'English', lessonId: 'l-1', lessonTitle: 'Farm', terminalState: 'COMPLETED', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationSec: 300, reportAvailable: true }],
  courses: [{ courseId: 'c-1', title: 'English', currentLessonPosition: 5, completedLessonCount: 4, totalLessonCount: 10, positionPercent: 40, suggestedNextLesson: { lessonId: 'l-2', lessonTitle: 'Animals' } }],
  completedLessons: 4, totalLessons: 10, completedSessions: 1, failedSessions: 0, recentDurationSec: 300,
};

function renderScreen() {
  const navigation = { navigate: jest.fn() };
  return render(<TodayProgressScreen navigation={navigation as never} route={{ key: 't', name: 'TodayProgressScreen' } as never} />);
}

describe('TodayProgressScreen canonical aggregate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHousehold.mockReturnValue({ activeChild: { id: 'child-1', name: 'Mai' } } as never);
    mockDashboard.mockReturnValue({ data: canonical, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() } as never);
  });

  it('renders canonical course, session, and active lesson facts', () => {
    const screen = renderScreen();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('5 min')).toBeTruthy();
    expect(screen.getAllByText('English')).toHaveLength(2);
    expect(screen.getByText('4 of 10 lessons')).toBeTruthy();
    expect(screen.getByText('Animals')).toBeTruthy();
  });

  it.each([
    ['READY', 'Preparing'],
    ['RUNNING', 'In progress'],
    ['LISTENING', 'Listening'],
  ])('renders %s as parent-facing copy instead of a raw enum', (state, label) => {
    mockDashboard.mockReturnValue({ data: { ...canonical, activeLearning: { ...canonical.activeLearning, state } }, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() } as never);
    const screen = renderScreen();
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText(state)).toBeNull();
  });

  it('drops stale totals as soon as canonical adapter data updates', () => {
    const screen = renderScreen();
    expect(screen.getByText('4 of 10 lessons')).toBeTruthy();
    mockDashboard.mockReturnValue({ data: { ...canonical, completedLessons: 5, courses: [{ ...canonical.courses[0], completedLessonCount: 5, positionPercent: 50 }] }, isLoading: false, isError: false, refetch: jest.fn() } as never);
    act(() => screen.rerender(<TodayProgressScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 't', name: 'TodayProgressScreen' } as never} />));
    expect(screen.queryByText('4 of 10 lessons')).toBeNull();
    expect(screen.getByText('5 of 10 lessons')).toBeTruthy();
  });

  it('renders loading, empty, and offline states', () => {
    mockDashboard.mockReturnValue({ data: undefined, isLoading: true } as never);
    expect(renderScreen().getByText('Loading progress')).toBeTruthy();
    mockDashboard.mockReturnValue({ data: { ...canonical, activeLearning: null, sessions: [], courses: [], completedLessons: 0, totalLessons: 0, completedSessions: 0, recentDurationSec: 0 }, isLoading: false, isError: false } as never);
    expect(renderScreen().getByText('No practice yet')).toBeTruthy();
    mockDashboard.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() } as never);
    expect(renderScreen().getByText('Progress unavailable')).toBeTruthy();
  });
});
