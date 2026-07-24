import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import { getActiveNestLesson } from '@/features/lesson-session/nestPhoneLesson';
import { ROUTES } from '@/navigation/routes';

jest.mock('@/features/lesson-session/nestPhoneLesson', () => ({
  getActiveNestLesson: jest.fn(),
}));

const mockedGetActiveNestLesson = getActiveNestLesson as jest.MockedFunction<typeof getActiveNestLesson>;

function navigationFor() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

describe('LessonSummaryScreen', () => {
  it('shows the redesigned evidence and word outcomes without fabricated rewards', () => {
    mockedGetActiveNestLesson.mockReturnValue({
      childId: 'child-1',
      sessionId: 'session-1',
      session: {
        id: 'session-1',
        session_date: '2026-07-22',
        session_payload: {
          core_learning: [
            { word: 'cat' },
            { word: 'dog' },
            { word: 'sun' },
          ],
        },
        prompts_shown: 0,
        responses_given: 0,
        correct_responses: 0,
        completed_at: null,
      },
    } as never);

    render(
      <LessonSummaryScreen
        navigation={navigationFor() as never}
        route={{ key: 'summary', name: ROUTES.LessonSummaryScreen } as never}
      />,
    );

    expect(screen.getByText('Report detail')).toBeTruthy();
    expect(screen.getByText('5 of 6')).toBeTruthy();
    expect(screen.getByText('Session evidence')).toBeTruthy();
    expect(screen.getByText('Word-by-word outcome')).toBeTruthy();
    expect(screen.getByText('cat')).toBeTruthy();
    expect(screen.getByText('dog')).toBeTruthy();
    expect(screen.getByText('sun')).toBeTruthy();
    expect(screen.queryByText('8 English turns')).toBeNull();
    expect(screen.queryByText('12 stars')).toBeNull();
    expect(screen.queryByText('3 new friends')).toBeNull();
  });
});
