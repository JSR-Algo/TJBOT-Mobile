import { AUTH_NAVIGATION } from '@/features/auth/navigation';
import { COURSE_LIBRARY_NAVIGATION } from '@/features/course-library/navigation';
import { COURSE_NAVIGATION } from '@/features/course/navigation';
import { DEVICE_NAVIGATION } from '@/features/device/navigation';
import { FALLBACK_NAVIGATION } from '@/features/fallback/navigation';
import { HOME_NAVIGATION } from '@/features/home/navigation';
import { LESSON_DEMO_NAVIGATION } from '@/features/lesson-demo/navigation';
import { LESSON_SESSION_NAVIGATION } from '@/features/lesson-session/navigation';
import { ONBOARDING_NAVIGATION } from '@/features/onboarding/navigation';
import { PARENT_NAVIGATION } from '@/features/parent/navigation';
import { PROGRESS_NAVIGATION } from '@/features/progress/navigation';
import { PURCHASE_NAVIGATION } from '@/features/purchase/navigation';
import { ROBOT_MGMT_NAVIGATION } from '@/features/robot-mgmt/navigation';
import type { RootStackParamList } from './routes';
import type { FeatureNavigationConfig, FeatureRootBranch, FeatureRouteOwner, FeatureStackScreen, FeatureTabScreen } from './types';

export { MVP_PRODUCTION_ROUTE_NAMES, isMvpProductionRoute } from './mvpProductionRoutes';

type ProductionRouteEntry = {
  readonly owner: FeatureRouteOwner;
  readonly screen: FeatureStackScreen;
};

export const FEATURE_NAVIGATION_REGISTRY: readonly FeatureNavigationConfig[] = [
  AUTH_NAVIGATION,
  ONBOARDING_NAVIGATION,
  HOME_NAVIGATION,
  COURSE_NAVIGATION,
  COURSE_LIBRARY_NAVIGATION,
  PURCHASE_NAVIGATION,
  LESSON_DEMO_NAVIGATION,
  LESSON_SESSION_NAVIGATION,
  PROGRESS_NAVIGATION,
  PARENT_NAVIGATION,
  DEVICE_NAVIGATION,
  ROBOT_MGMT_NAVIGATION,
  FALLBACK_NAVIGATION,
] as const;

function featuresByRootBranch(rootBranch: FeatureRootBranch): readonly FeatureNavigationConfig[] {
  return FEATURE_NAVIGATION_REGISTRY.filter(feature => feature.rootBranch === rootBranch);
}

function initialRouteFor(rootBranch: FeatureRootBranch): keyof RootStackParamList {
  const routes = featuresByRootBranch(rootBranch).flatMap(feature =>
    feature.initialRoute ? [feature.initialRoute] : [],
  );
  if (routes.length !== 1) {
    throw new Error(`Expected exactly one ${rootBranch} initial route, found ${routes.length}`);
  }
  return routes[0];
}

const PROTECTED_NAVIGATION_CONFIGS = featuresByRootBranch('protected');

function isProductionVisibleScreen(screen: FeatureStackScreen): boolean {
  return screen.productionVisible !== false;
}

export function isProductionNavigableRoute(route: keyof RootStackParamList): boolean {
  return FEATURE_NAVIGATION_REGISTRY.some(feature =>
    [
      ...feature.stackScreens,
      ...feature.modalScreens,
      ...(feature.tabScreen ? [feature.tabScreen] : []),
    ].some(screen => screen.name === route && isProductionVisibleScreen(screen)),
  );
}

function pendingDeviceSetupRoute(): keyof RootStackParamList {
  const routes = FEATURE_NAVIGATION_REGISTRY.flatMap(feature =>
    feature.pendingDeviceSetupRoute ? [feature.pendingDeviceSetupRoute] : [],
  );
  if (routes.length !== 1) {
    throw new Error(`Expected exactly one pending device setup route, found ${routes.length}`);
  }
  return routes[0];
}

export const AUTH_STACK_SCREENS = featuresByRootBranch('auth').flatMap(feature => feature.stackScreens);
export const ONBOARDING_STACK_SCREENS = featuresByRootBranch('onboarding').flatMap(feature => feature.stackScreens);
/** Mounted auth routes; hidden entries remain in registry-derived architecture inventory. */
export const AUTH_MOUNTED_STACK_SCREENS: readonly FeatureStackScreen[] =
  AUTH_STACK_SCREENS.filter(isProductionVisibleScreen);
export const ONBOARDING_MOUNTED_STACK_SCREENS: readonly FeatureStackScreen[] =
  ONBOARDING_STACK_SCREENS.filter(isProductionVisibleScreen);
export const AUTH_INITIAL_ROUTE = initialRouteFor('auth');
export const ONBOARDING_INITIAL_ROUTE = initialRouteFor('onboarding');

export const PROTECTED_MODAL_SCREENS: readonly FeatureStackScreen[] = PROTECTED_NAVIGATION_CONFIGS.flatMap(feature => feature.modalScreens);

function sortTabScreens(screens: readonly FeatureTabScreen[]): readonly FeatureTabScreen[] {
  return [...screens].sort((left, right) => left.tabOrder - right.tabOrder);
}

export const MAIN_TAB_SCREENS: readonly FeatureTabScreen[] = sortTabScreens(
  FEATURE_NAVIGATION_REGISTRY.flatMap(feature => (feature.tabScreen ? [feature.tabScreen] : [])),
);
export const MAIN_TAB_NAMES = MAIN_TAB_SCREENS.map(screen => screen.tabName);
export const MAIN_TAB_TITLES = MAIN_TAB_SCREENS.map(screen => screen.title);
export const MAIN_TAB_ICONS = MAIN_TAB_SCREENS.map(screen => screen.tabIcon);
export const DEFAULT_MAIN_TAB_NAME = MAIN_TAB_SCREENS[0].tabName;
export const PROTECTED_DEFAULT_ROUTE = MAIN_TAB_SCREENS[0].name;
export const PENDING_DEVICE_SETUP_ROUTE = pendingDeviceSetupRoute();

const MAIN_TAB_ROUTE_NAMES: ReadonlySet<keyof RootStackParamList> = new Set(MAIN_TAB_SCREENS.map(screen => screen.name));
export const PROTECTED_STACK_SCREENS: readonly FeatureStackScreen[] = PROTECTED_NAVIGATION_CONFIGS
  .flatMap(feature => feature.stackScreens)
  .filter(screen => !MAIN_TAB_ROUTE_NAMES.has(screen.name));
export const PROTECTED_MOUNTED_STACK_SCREENS: readonly FeatureStackScreen[] =
  PROTECTED_STACK_SCREENS.filter(isProductionVisibleScreen);
export const PROTECTED_MOUNTED_MODAL_SCREENS: readonly FeatureStackScreen[] =
  PROTECTED_MODAL_SCREENS.filter(isProductionVisibleScreen);
export const PRODUCTION_HIDDEN_ROUTE_NAMES: readonly (keyof RootStackParamList)[] =
  FEATURE_NAVIGATION_REGISTRY.flatMap(feature => [
    ...feature.stackScreens,
    ...feature.modalScreens,
    ...(feature.tabScreen ? [feature.tabScreen] : []),
  ])
    .filter(screen => !isProductionVisibleScreen(screen))
    .map(screen => screen.name);
export const PRODUCTION_LINKING_ROUTE_ENTRIES: readonly ProductionRouteEntry[] =
  FEATURE_NAVIGATION_REGISTRY.flatMap(feature =>
    [
      ...feature.stackScreens,
      ...feature.modalScreens,
      ...(feature.tabScreen ? [feature.tabScreen] : []),
    ]
      .filter(isProductionVisibleScreen)
      .map(screen => ({ owner: feature.owner, screen })),
  );
