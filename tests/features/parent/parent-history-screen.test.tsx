import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useParentLearningHistoryQuery } from '@/features/parent/hooks/useParentLearningHistoryQuery';
import { ROUTES } from '@/navigation/routes';
import ParentHistoryScreen from '@/features/parent/screens/ParentHistoryScreen';
import { setAppLanguage } from '@/services/i18n/i18n';

jest.mock('@/features/parent/hooks/useParentGateGuard', () => ({ useParentGateGuard: () => undefined }));
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: jest.fn() }));
jest.mock('@/features/parent/hooks/useParentLearningHistoryQuery', () => ({ useParentLearningHistoryQuery: jest.fn() }));

const mockHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;
const mockHistory = useParentLearningHistoryQuery as jest.MockedFunction<typeof useParentLearningHistoryQuery>;
const row = { childId: 'child-1', assignmentId: 'a-1', sessionId: 'session-exact', courseId: 'c-1', courseTitle: 'First English', lessonId: 'l-1', lessonTitle: 'Farm Friends', state: 'COMPLETED', completedAt: '2026-07-27T02:00:00Z', durationSec: 180, reportAvailable: true };

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 'history', name: 'ParentHistoryScreen', params: undefined };
  return { ...render(<ParentHistoryScreen navigation={navigation as never} route={route as never} />), navigation };
}

describe('ParentHistoryScreen', () => {
  afterAll(async () => { await setAppLanguage('en'); });
  beforeEach(() => {
    jest.clearAllMocks();
    mockHousehold.mockReturnValue({ activeChild: { id: 'child-1', name: 'Mai' } } as never);
    mockHistory.mockReturnValue({ data: { items: [row], nextCursor: 'next' }, isLoading: false, isError: false, isFetchingNextPage: false, hasNextPage: true, fetchNextPage: jest.fn(), refetch: jest.fn() } as never);
  });

  it('opens the dedicated report with the exact child and session identifiers', () => {
    const { getByLabelText, navigation } = renderScreen();
    fireEvent.press(getByLabelText('Open report for Farm Friends'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ParentSessionReportScreen, { childId: 'child-1', sessionId: 'session-exact' });
  });

  it('loads the next cursor page from the accessible load-more control', () => {
    const fetchNextPage = jest.fn();
    mockHistory.mockReturnValue({ data: { items: [row], nextCursor: 'next' }, isLoading: false, isError: false, isFetchingNextPage: false, hasNextPage: true, fetchNextPage, refetch: jest.fn() } as never);
    fireEvent.press(renderScreen().getByRole('button', { name: 'Load more lessons' }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('shows the backend duration without rounding a short session up to one minute', () => {
    mockHistory.mockReturnValue({ data: { items: [{ ...row, durationSec: 30 }], nextCursor: null }, isLoading: false, isError: false, hasNextPage: false, refetch: jest.fn() } as never);
    expect(renderScreen().getByText(/30 sec/)).toBeTruthy();
  });

  it('renders empty and error states', () => {
    mockHistory.mockReturnValue({ data: { items: [], nextCursor: null }, isLoading: false, isError: false, hasNextPage: false, refetch: jest.fn() } as never);
    expect(renderScreen().getByText('No completed lessons yet')).toBeTruthy();
    mockHistory.mockReturnValue({ data: undefined, isLoading: false, isError: true, hasNextPage: false, refetch: jest.fn() } as never);
    expect(renderScreen().getByText('Lesson history is offline')).toBeTruthy();
  });

  it('localizes interpolated completion state in Vietnamese', async () => {
    await setAppLanguage('vi');
    const screen = renderScreen();
    expect(screen.getByText(/hoàn tất/i)).toBeTruthy();
    expect(screen.queryByText(/Completed/)).toBeNull();
  });
});
