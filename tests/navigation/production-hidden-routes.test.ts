import {
  FEATURE_NAVIGATION_REGISTRY,
  PRODUCTION_HIDDEN_ROUTE_NAMES,
  PRODUCTION_LINKING_ROUTE_ENTRIES,
  PROTECTED_MOUNTED_STACK_SCREENS,
  isProductionNavigableRoute,
} from '@/navigation/featureRegistry';
import { NAVIGATION_LINKING_SCREENS, navigationTargetForDeepLinkUrl } from '@/navigation/linking';
import { ROUTES } from '@/navigation/routes';
import fs from 'fs';
import path from 'path';

const LESSON_SESSION_PROTOTYPE_ROUTES = new Set<keyof typeof ROUTES>([
  ROUTES.ConnectingScreen,
  ROUTES.GreetingScreen,
  ROUTES.LessonReadyScreen,
  ROUTES.RobotListeningScreen,
  ROUTES.UserSpeakingScreen,
  ROUTES.RobotSpeakingScreen,
  ROUTES.ThinkingScreen,
  ROUTES.ActivityIntroScreen,
  ROUTES.ActivityDoneScreen,
  ROUTES.SuccessScreen,
  ROUTES.LessonDoneScreen,
  ROUTES.ExitConfirmScreen,
  ROUTES.RetryScreen,
  ROUTES.SilenceScreen,
  ROUTES.BargeinScreen,
  ROUTES.GentleScreen,
  ROUTES.OfftopicScreen,
  ROUTES.SafetyScreen,
  ROUTES.CostCappedScreen,
  ROUTES.ParentStoppedScreen,
  ROUTES.TimedOutScreen,
  ROUTES.AudioErrorScreen,
  ROUTES.AbandonedDisconnectScreen,
  ROUTES.ReconnectingScreen,
]);

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    if (/\.(ts|tsx)$/.test(entry.name)) return [entryPath];
    return [];
  });
}

describe('production-hidden routes', () => {
  it('requires an explicit reason for every production-hidden route', () => {
    const hiddenScreens = FEATURE_NAVIGATION_REGISTRY
      .flatMap(feature => [
        ...feature.stackScreens,
        ...feature.modalScreens,
        ...(feature.tabScreen ? [feature.tabScreen] : []),
      ])
      .filter(screen => screen.productionVisible === false);

    expect(hiddenScreens.map(screen => screen.name)).toEqual(PRODUCTION_HIDDEN_ROUTE_NAMES);
    for (const screen of hiddenScreens) {
      expect(screen.productionHiddenReason).toMatch(/^(backend-contract-unavailable|static-prototype-hidden)$/);
      if (LESSON_SESSION_PROTOTYPE_ROUTES.has(screen.name)) {
        expect(screen.productionHiddenReason).toBe('backend-contract-unavailable');
      }
    }
  });

  it('keeps the legacy lesson-session prototype out of mounted protected navigation', () => {
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.LessonReadyScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.ConnectingScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.LessonDoneScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.LevelScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.UnitScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.LessonListScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.LessonDetailScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.RobotBatteryScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.RobotStorageScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.RobotFirmwareScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.MicTestScreen);
    expect(PRODUCTION_HIDDEN_ROUTE_NAMES).toContain(ROUTES.SpeakerTestScreen);

    const mountedRoutes = PROTECTED_MOUNTED_STACK_SCREENS.map(screen => screen.name);
    for (const route of PRODUCTION_HIDDEN_ROUTE_NAMES) {
      expect(mountedRoutes).not.toContain(route);
      expect(isProductionNavigableRoute(route)).toBe(false);
    }
  });

  it('does not expose production-hidden lesson-session routes through deep links', () => {
    const linkedRoutes = PRODUCTION_LINKING_ROUTE_ENTRIES.map(entry => entry.screen.name);

    for (const route of PRODUCTION_HIDDEN_ROUTE_NAMES) {
      expect(linkedRoutes).not.toContain(route);
      expect(NAVIGATION_LINKING_SCREENS).not.toHaveProperty(route);
    }

    expect(navigationTargetForDeepLinkUrl('tjbot://lesson-session/lesson-ready')).toBeNull();
    expect(navigationTargetForDeepLinkUrl('tjbot://lesson-session/connecting')).toBeNull();
    expect(navigationTargetForDeepLinkUrl('tjbot://course/level')).toBeNull();
    expect(navigationTargetForDeepLinkUrl('tjbot://course/lesson-detail')).toBeNull();
  });

  it('keeps the dead lesson-session state machine out of runtime source callers', () => {
    const sourceFiles = listSourceFiles(path.join(process.cwd(), 'src'));
    const callers = sourceFiles
      .filter(file => !file.endsWith(path.join('src', 'state', 'machines', 'lessonSession.machine.ts')))
      .filter(file => fs.readFileSync(file, 'utf8').includes('createLessonSessionMachine('));

    expect(callers.map(file => path.relative(process.cwd(), file))).toEqual([]);
  });
});
