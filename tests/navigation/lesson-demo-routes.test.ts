import { ROUTE_MAP } from '@/navigation/routeMap';
import { ROUTES } from '@/navigation/routes';

const expectedLessonRoutes = [
  'LessonDemoHomeScreen',
  'LessonDemoRoadmapScreen',
  'LessonDemoSessionScreen',
  'LessonDemoParentSummaryScreen',
  'LessonDemoShowcaseScreen',
  'LessonPlannerScreen',
  'ChildPracticeScreen',
  'RobotLessonControlScreen',
] as const;

describe('lesson demo routes', () => {
  it('registers lesson demo routes as progress-owned protected stack screens', () => {
    for (const routeName of expectedLessonRoutes) {
      expect(ROUTES[routeName]).toBe(routeName);
      expect(ROUTE_MAP[routeName].feature).toBe('progress');
      expect(ROUTE_MAP[routeName].rootBranch).toBe('protected');
      expect(ROUTE_MAP[routeName].navigator).toBe('ModalNavigator');
    }
  });
});
