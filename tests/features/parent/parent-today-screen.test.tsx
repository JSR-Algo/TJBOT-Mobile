import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useParentLearningStatusQuery } from '@/features/parent/hooks/useParentLearningStatusQuery';
import ParentTodayScreen from '@/features/parent/screens/ParentTodayScreen';

jest.mock('@/features/parent/hooks/useParentGateGuard', () => ({ useParentGateGuard: () => undefined }));
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: jest.fn() }));
jest.mock('@/features/parent/hooks/useParentLearningStatusQuery', () => ({ useParentLearningStatusQuery: jest.fn() }));

const mockHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;
const mockStatus = useParentLearningStatusQuery as jest.MockedFunction<typeof useParentLearningStatusQuery>;

const activeLearning = {
  assignmentId: 'a-1', sessionId: 's-1', deviceId: 'd-1', courseId: 'c-1', courseTitle: 'First English',
  lessonId: 'l-1', lessonTitle: 'Farm Friends', state: 'LISTEN', startedAt: '2026-07-27T01:00:00Z',
  currentStep: { stepId: 'step-2', stepNumber: 2, total: 5, activityTitle: 'Meet the animals', phase: 'LISTEN', subject: 'farm animals' },
  positionPercent: 40, activeDurationSec: 125,
};

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 'today', name: 'ParentTodayScreen', params: undefined };
  return { ...render(<ParentTodayScreen navigation={navigation as never} route={route as never} />), navigation };
}

describe('ParentTodayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHousehold.mockReturnValue({ activeChild: { id: 'child-1', name: 'Mai' } } as never);
    mockStatus.mockReturnValue({ data: { activeLearning, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '12' }, dataUpdatedAt: Date.now(), isLoading: false, isError: false, isFetching: false, fetchStatus: 'idle', refetch: jest.fn() } as never);
  });

  it('shows the active child, live lesson state, authored activity, progress, duration, and update time', () => {
    const { getByText, getByLabelText } = renderScreen();
    expect(getByText('Mai')).toBeTruthy();
    expect(getByLabelText('Mai avatar')).toBeTruthy();
    expect(getByText('Listening')).toBeTruthy();
    expect(getByText('First English')).toBeTruthy();
    expect(getByText('Farm Friends')).toBeTruthy();
    expect(getByText('Meet the animals')).toBeTruthy();
    expect(getByText('farm animals')).toBeTruthy();
    expect(getByText('Step 2 of 5')).toBeTruthy();
    expect(getByText('40%')).toBeTruthy();
    expect(getByText('2 min 5 sec active')).toBeTruthy();
    expect(getByText(/Updated/)).toBeTruthy();
  });

  it.each([
    ['PREPARING', 'Preparing'], ['ENTRANCE', 'Robot entrance'], ['TEACH', 'Teaching'], ['LISTEN', 'Listening'],
    ['THINK', 'Thinking'], ['FEEDBACK', 'Feedback'], ['PAUSED', 'Paused'], ['COMPLETED', 'Completed'], ['FAILED', "Didn't finish"],
  ])('maps %s to parent-safe live copy', (state, copy) => {
    mockStatus.mockReturnValue({ data: { activeLearning: { ...activeLearning, state }, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '12' }, dataUpdatedAt: Date.now(), isLoading: false, isError: false, isFetching: false, fetchStatus: 'idle', refetch: jest.fn() } as never);
    expect(renderScreen().getByText(copy)).toBeTruthy();
  });

  it('shows reconnecting and offline states without inventing lesson data', () => {
    mockStatus.mockReturnValue({ data: { activeLearning, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '12' }, dataUpdatedAt: Date.now(), isLoading: false, isError: false, isFetching: true, fetchStatus: 'fetching', refetch: jest.fn() } as never);
    expect(renderScreen().getByText('Reconnecting…')).toBeTruthy();
    mockStatus.mockReturnValue({ data: { activeLearning, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '12' }, dataUpdatedAt: Date.now(), isLoading: false, isError: true, isFetching: false, fetchStatus: 'idle', refetch: jest.fn() } as never);
    expect(renderScreen().getByText('Live progress is offline')).toBeTruthy();
    mockStatus.mockReturnValue({ data: undefined, dataUpdatedAt: 0, isLoading: false, isError: true, isFetching: false, fetchStatus: 'idle', refetch: jest.fn() } as never);
    const offline = renderScreen();
    expect(offline.getByText('Live progress is offline')).toBeTruthy();
    fireEvent.press(offline.getByText('Retry'));
  });

  it('shows an empty state for a child with no active lesson', () => {
    mockStatus.mockReturnValue({ data: { activeLearning: null, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '12' }, dataUpdatedAt: Date.now(), isLoading: false, isError: false, isFetching: false, fetchStatus: 'idle', refetch: jest.fn() } as never);
    expect(renderScreen().getByText('No lesson is active right now')).toBeTruthy();
  });
});
