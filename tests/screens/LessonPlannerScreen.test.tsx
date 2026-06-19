import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { LessonPlannerScreen } from '../../src/screens/learning/LessonPlannerScreen';
import { ChildPracticeScreen } from '../../src/screens/learning/ChildPracticeScreen';
import { ParentDashboardScreen } from '../../src/screens/dashboard/ParentDashboardScreen';
import * as learningApi from '../../src/services/api/learning';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockChildren = [{ id: 'child-1', name: 'Mai', vocabulary_level: 'beginner' }];

jest.mock('../../src/contexts/HouseholdContext', () => ({
  useHousehold: () => ({
    children: mockChildren,
  }),
}));

jest.mock('../../src/services/api/learning', () => ({
  getTodaySession: jest.fn(),
  getKPIs: jest.fn(),
  getPronunciationTrend: jest.fn(),
}));

const navigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
} as any;

const route = {
  key: 'LessonPlanner',
  name: 'LessonPlanner' as const,
  params: { childId: 'child-1' },
};

const session = {
  id: 'session-1',
  session_date: '2026-05-08',
  difficulty_level: 2,
  prompts_shown: 0,
  responses_given: 0,
  correct_responses: 0,
  completed_at: null,
  session_payload: {
    warmup: { greeting: 'Hi Mai!', question: 'What do you see?' },
    core_learning: [
      { word: 'cat', sentence: 'I see a cat.' },
      { word: 'dog', sentence: 'I see a dog.' },
    ],
    interaction: { prompt: 'Can you say cat?', expected_vocab: ['cat'] },
    reinforcement: { type: 'repeat' as const, items: ['cat', 'dog'] },
    reward: { message: 'Good effort. You practiced today.', stars: 2 },
  },
};

describe('LessonPlannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (learningApi.getTodaySession as jest.Mock).mockResolvedValue(session);
  });

  it("shows the parent-facing lesson objective and focus words", async () => {
    const { getByText } = render(<LessonPlannerScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(getByText("Mai's plan")).toBeTruthy());
    expect(getByText('Practice cat, dog in a short English lesson.')).toBeTruthy();
    expect(getByText('cat')).toBeTruthy();
    expect(getByText('dog')).toBeTruthy();
    expect(getByText('Vietnamese support')).toBeTruthy();
  });

  it('navigates to child practice from the lesson plan', async () => {
    const { getByText } = render(<LessonPlannerScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(getByText('Start child practice')).toBeTruthy());
    fireEvent.press(getByText('Start child practice'));

    expect(mockNavigate).toHaveBeenCalledWith('ChildPractice', {
      childId: 'child-1',
      sessionId: 'session-1',
    });
  });

  it('shows a safe fallback when the lesson cannot load', async () => {
    (learningApi.getTodaySession as jest.Mock).mockRejectedValue(new Error('network down'));
    const { getByText } = render(<LessonPlannerScreen navigation={navigation} route={route} />);

    await waitFor(() => {
      expect(getByText(/Fallback ready/)).toBeTruthy();
      expect(getByText(/listen, repeat, and choice practice/)).toBeTruthy();
    });
  });

  it('opens child-safe fallback practice when the lesson cannot load', async () => {
    (learningApi.getTodaySession as jest.Mock).mockRejectedValue(new Error('network down'));
    const { getByText } = render(<LessonPlannerScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(getByText('Start fallback practice')).toBeTruthy());
    fireEvent.press(getByText('Start fallback practice'));

    expect(mockNavigate).toHaveBeenCalledWith('ChildPractice', { childId: 'child-1' });
  });
});

describe('ChildPracticeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (learningApi.getTodaySession as jest.Mock).mockResolvedValue(session);
  });

  it('shows child-safe practice copy without raw IDs', async () => {
    const { getByText, queryByText } = render(
      <ChildPracticeScreen
        navigation={navigation}
        route={{
          key: 'ChildPractice',
          name: 'ChildPractice',
          params: { childId: 'child-1', sessionId: 'session-1' },
        }}
      />,
    );

    expect(getByText('Practice Time')).toBeTruthy();

    await waitFor(() => expect(getByText('Lesson is ready.')).toBeTruthy());
    expect(learningApi.getTodaySession).toHaveBeenCalledWith('child-1');
    expect(getByText('Listen')).toBeTruthy();
    expect(getByText('Listen to "cat". Then say it back clearly.')).toBeTruthy();
    expect(queryByText('Try')).toBeNull();
    fireEvent.press(getByText('Next step'));
    expect(getByText('Try')).toBeTruthy();
    expect(queryByText('Finish')).toBeNull();
    expect(queryByText('child-1')).toBeNull();
    expect(queryByText('session-1')).toBeNull();
  });

  it('resets the practice step index when route params change', async () => {
    const view = render(
      <ChildPracticeScreen
        navigation={navigation}
        route={{
          key: 'ChildPractice',
          name: 'ChildPractice',
          params: { childId: 'child-1', sessionId: 'session-1' },
        }}
      />,
    );

    await waitFor(() => expect(view.getByText('Step 1 of 3')).toBeTruthy());
    fireEvent.press(view.getByText('Next step'));
    fireEvent.press(view.getByText('Next step'));
    expect(view.getByText('Step 3 of 3')).toBeTruthy();

    view.rerender(
      <ChildPracticeScreen
        navigation={navigation}
        route={{
          key: 'ChildPractice',
          name: 'ChildPractice',
          params: { childId: 'child-1' },
        }}
      />,
    );

    await waitFor(() => expect(view.getByText('Step 1 of 3')).toBeTruthy());
    expect(view.getByText('Fallback practice is ready.')).toBeTruthy();
  });
});

describe('ParentDashboardScreen lesson entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (learningApi.getKPIs as jest.Mock).mockResolvedValue({
      vocab_words_this_week: 4,
      speaking_confidence: 72,
      engagement_score: 80,
      retention_rate: 90,
      sessions_this_week: 3,
      daily_streak: 2,
      weak_words: ['cat'],
    });
    (learningApi.getPronunciationTrend as jest.Mock).mockResolvedValue({
      points: [],
      avg_score: 0,
      trend: 'stable',
    });
  });

  it("opens today's lesson from the parent progress card", async () => {
    const { getByText } = render(
      <ParentDashboardScreen
        navigation={navigation}
        route={{ key: 'Progress', name: 'Progress' }}
      />,
    );

    await waitFor(() => expect(getByText("View today's lesson")).toBeTruthy());
    fireEvent.press(getByText("View today's lesson"));

    expect(mockNavigate).toHaveBeenCalledWith('LessonPlanner', { childId: 'child-1' });
  });

  it('opens the standalone lesson demo from the parent progress screen', async () => {
    const { getByText } = render(
      <ParentDashboardScreen
        navigation={navigation}
        route={{ key: 'Progress', name: 'Progress' }}
      />,
    );

    await waitFor(() => expect(getByText('Open lesson demo')).toBeTruthy());
    fireEvent.press(getByText('Open lesson demo'));

    expect(mockNavigate).toHaveBeenCalledWith('LessonDemo');
  });

  it('keeps the lesson entry available when progress KPIs fail', async () => {
    (learningApi.getKPIs as jest.Mock).mockRejectedValue(new Error('progress unavailable'));
    const { getByText } = render(
      <ParentDashboardScreen
        navigation={navigation}
        route={{ key: 'Progress', name: 'Progress' }}
      />,
    );

    await waitFor(() => expect(getByText("View today's lesson")).toBeTruthy());
    fireEvent.press(getByText("View today's lesson"));

    expect(mockNavigate).toHaveBeenCalledWith('LessonPlanner', { childId: 'child-1' });
  });
});
