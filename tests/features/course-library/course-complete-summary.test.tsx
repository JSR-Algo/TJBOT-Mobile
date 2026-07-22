import React from 'react';
import { render } from '@testing-library/react-native';
import CourseCompleteScreen from '@/features/course-library/screens/CourseCompleteScreen';

function renderComplete(params: Record<string, unknown> | undefined) {
  const navigation = { navigate: jest.fn() };
  return render(
    <CourseCompleteScreen
      navigation={navigation as never}
      route={{ key: 'complete', name: 'CourseCompleteScreen', params } as never}
    />,
  );
}

describe('CourseCompleteScreen summary outlet', () => {
  it('shows honest no-summary state without fabricated stats or sync claims', () => {
    const screen = renderComplete(undefined);

    expect(screen.getByTestId('course-complete-no-summary')).toBeTruthy();
    expect(screen.getByText('Lesson complete')).toBeTruthy();
    expect(
      screen.getByText(
        'A full summary will show when lesson results are available. Audio was never saved.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Synced from Robot just now. Audio was never saved.')).toBeNull();
    expect(screen.queryByText('A lovely 4 minutes')).toBeNull();
    expect(screen.queryByTestId('course-complete-stats')).toBeNull();
    expect(screen.queryByTestId('course-complete-words')).toBeNull();
    expect(screen.queryByText('cat')).toBeNull();
    expect(screen.queryByText('10')).toBeNull();
  });

  it('renders only real supplied summary fields', () => {
    const screen = renderComplete({
      courseId: 'c_food',
      summary: {
        heading: 'A lovely 6 minutes',
        minutesTogether: 6,
        wordsPlayed: 4,
        words: [
          { word: 'apple', confident: true },
          { word: 'bread', confident: false },
        ],
      },
    });

    expect(screen.queryByTestId('course-complete-no-summary')).toBeNull();
    expect(screen.getByText('A lovely 6 minutes')).toBeTruthy();
    expect(screen.getByText('Results from this lesson. Audio was never saved.')).toBeTruthy();
    expect(screen.getByTestId('course-complete-stats')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Minutes together')).toBeTruthy();
    expect(screen.getByText('Words played with')).toBeTruthy();
    // not supplied → not invented
    expect(screen.queryByText('Tried out loud')).toBeNull();
    expect(screen.getByText('apple')).toBeTruthy();
    expect(screen.getByText('bread')).toBeTruthy();
    expect(screen.queryByText('cat')).toBeNull();
  });
});
