import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import LessonDemoHomeScreen from '@/features/progress/screens/LessonDemoHomeScreen';
import LessonDemoRoadmapScreen from '@/features/progress/screens/LessonDemoRoadmapScreen';
import LessonDemoSessionScreen from '@/features/progress/screens/LessonDemoSessionScreen';
import LessonDemoParentSummaryScreen from '@/features/progress/screens/LessonDemoParentSummaryScreen';
import LessonDemoShowcaseScreen from '@/features/progress/screens/LessonDemoShowcaseScreen';
import { resetLessonDemoProgress } from '@/features/progress/lesson-demo';
import { ROUTES } from '@/navigation/routes';

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe('lesson demo screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLessonDemoProgress();
  });

  it('renders the home screen with age selector, roadmap entry, robot entry, and showcase entry', () => {
    const { getByText } = render(<LessonDemoHomeScreen navigation={navigation} route={{ name: 'LessonDemoHomeScreen', key: 'lesson-demo' }} />);

    expect(getByText('Today for Demo Learner')).toBeTruthy();
    expect(getByText('Age 4-6')).toBeTruthy();
    expect(getByText('Open six-month roadmap')).toBeTruthy();
    expect(getByText('Start lesson on robot')).toBeTruthy();
    expect(getByText('Investor showcase')).toBeTruthy();
    expect(getByText('120 sessions')).toBeTruthy();
  });

  it('navigates through the demo lesson and records local progress', () => {
    const { getByText, queryByText } = render(<LessonDemoSessionScreen navigation={navigation} route={{ name: 'LessonDemoSessionScreen', key: 'lesson-session' }} />);

    expect(getByText('Step 1 of 7')).toBeTruthy();
    expect(getByText('Warm up')).toBeTruthy();
    expect(queryByText('Try it')).toBeNull();

    for (let index = 0; index < 6; index += 1) {
      fireEvent.press(getByText('Next'));
    }
    fireEvent.press(getByText('Finish'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonDemoParentSummaryScreen, {
      lessonId: 'w01-d01-hello-name',
      ageBand: '7-9',
    });

    const summary = render(<LessonDemoParentSummaryScreen navigation={navigation} route={{ name: 'LessonDemoParentSummaryScreen', key: 'summary' }} />);
    expect(summary.getByText('Parent summary')).toBeTruthy();
    expect(summary.getByText('1 lesson')).toBeTruthy();
  });

  it('renders roadmap and showcase without source-card or provider labels', () => {
    const roadmap = render(<LessonDemoRoadmapScreen navigation={navigation} route={{ name: 'LessonDemoRoadmapScreen', key: 'roadmap' }} />);
    expect(roadmap.getAllByText(/Week \d+/)).toHaveLength(24);

    const showcase = render(<LessonDemoShowcaseScreen navigation={navigation} route={{ name: 'LessonDemoShowcaseScreen', key: 'showcase' }} />);
    fireEvent.press(showcase.getByText('Week 13 showcase'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonDemoSessionScreen, {
      week: 13,
      day: 5,
      ageBand: '7-9',
    });
    expect(showcase.queryByText(/sourceCard|provider|model|https:\/\//i)).toBeNull();
  });
});
