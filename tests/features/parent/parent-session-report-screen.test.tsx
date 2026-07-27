import React from 'react';
import { render } from '@testing-library/react-native';
import { useParentSessionReportQuery } from '@/features/parent/hooks/useParentSessionReportQuery';
import ParentSessionReportScreen from '@/features/parent/screens/ParentSessionReportScreen';
import { setAppLanguage } from '@/services/i18n/i18n';

jest.mock('@/features/parent/hooks/useParentGateGuard', () => ({ useParentGateGuard: () => undefined }));
jest.mock('@/features/parent/hooks/useParentSessionReportQuery', () => ({ useParentSessionReportQuery: jest.fn() }));
const mockReport = useParentSessionReportQuery as jest.MockedFunction<typeof useParentSessionReportQuery>;

const report = {
  childId: 'child-1', sessionId: 'session-1', assignmentId: 'a-1', courseId: 'c-1', courseTitle: 'First English', lessonId: 'l-1', lessonTitle: 'Farm Friends',
  objective: 'Name three farm animals', state: 'COMPLETED', durationSec: 185,
  presented: ['cow', 'duck'], attempted: ['cow'], accepted: ['cow'], needsReview: ['duck'],
  activities: [{ stepId: 'step-1', activityTitle: 'Meet the animals', subject: 'farm animals', outcome: 'ACCEPTED', attempts: 2, finalResponseClass: 'MATCH' }],
  reward: { xp: 20, stars: 2 }, suggestedNextLesson: { lessonId: 'l-2', lessonTitle: 'Animal Sounds' },
};

function renderScreen(params: { childId?: string; sessionId?: string } | undefined = { childId: 'child-1', sessionId: 'session-1' }) {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 'report', name: 'ParentSessionReportScreen', params };
  return render(<ParentSessionReportScreen navigation={navigation as never} route={route as never} />);
}

function renderScreenWithoutParams(params?: { childId?: string; sessionId?: string }) {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  return render(<ParentSessionReportScreen navigation={navigation as never} route={{ key: 'report', name: 'ParentSessionReportScreen', params } as never} />);
}

describe('ParentSessionReportScreen', () => {
  afterAll(async () => { await setAppLanguage('en'); });
  beforeEach(() => {
    jest.clearAllMocks();
    mockReport.mockReturnValue({ data: report, isLoading: false, isError: false, refetch: jest.fn() } as never);
  });

  it('shows factual evidence categories, authored objective, outcomes, reward, and backend next lesson', () => {
    const screen = renderScreen();
    expect(screen.getByText('Name three farm animals')).toBeTruthy();
    expect(screen.getByText('Presented')).toBeTruthy();
    expect(screen.getByText('Attempted')).toBeTruthy();
    expect(screen.getByText('Accepted')).toBeTruthy();
    expect(screen.getByText('Needs review')).toBeTruthy();
    expect(screen.getByText('2 attempts · Match')).toBeTruthy();
    expect(screen.getByText('20 XP · 2 stars')).toBeTruthy();
    expect(screen.getByText('Animal Sounds')).toBeTruthy();
  });

  it('does not claim mastery or render a child reward action', () => {
    const screen = renderScreen();
    expect(screen.queryByText(/master/i)).toBeNull();
    expect(screen.queryByText(/claim/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /reward/i })).toBeNull();
  });

  it('does not invent a suggested lesson when the backend omits it', () => {
    mockReport.mockReturnValue({ data: { ...report, suggestedNextLesson: null }, isLoading: false, isError: false, refetch: jest.fn() } as never);
    expect(renderScreen().queryByText('Suggested next lesson')).toBeNull();
  });

  it('renders unavailable and not-found states', () => {
    mockReport.mockReturnValue({ data: null, isLoading: false, isError: false, refetch: jest.fn() } as never);
    expect(renderScreen().getByText('Session report not found')).toBeTruthy();
    mockReport.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() } as never);
    expect(renderScreen().getByText('Session report is offline')).toBeTruthy();
  });

  it('keeps the query disabled and renders safely when route identifiers are missing', () => {
    expect(renderScreenWithoutParams().getByText('Session report unavailable')).toBeTruthy();
    expect(mockReport).toHaveBeenLastCalledWith(undefined, undefined);
    expect(renderScreenWithoutParams({ childId: 'child-1' }).getByText('Session report unavailable')).toBeTruthy();
    expect(mockReport).toHaveBeenLastCalledWith('child-1', undefined);
  });

  it('localizes report categories, state, and response class without English interpolation', async () => {
    await setAppLanguage('vi');
    const screen = renderScreen();
    expect(screen.getByText('Đã giới thiệu')).toBeTruthy();
    expect(screen.getByText('Đã thử')).toBeTruthy();
    expect(screen.getByText('Đã trả lời phù hợp')).toBeTruthy();
    expect(screen.getByText('Cần ôn lại')).toBeTruthy();
    expect(screen.getByText(/hoàn tất/i)).toBeTruthy();
    expect(screen.getByText('2 lần thử · Khớp')).toBeTruthy();
    expect(screen.queryByText(/Completed|Match|Presented|Attempted|Accepted|Needs review/)).toBeNull();
  });
});
