import type { RootStackParamList } from './routes';
import { ROUTE_OWNERS } from './routeOwnership';
import type { FeatureForwardCycleGroup, FeatureRootBranch, FeatureRouteOwner, FeatureRouteRole, FeatureStackScreen } from './types';
import { FEATURE_ROUTE_ENTRIES, FEATURE_ROUTE_SCREENS, type FeatureRouteBucket } from './featureRouteEntries';
import {
  AUTH_STACK_SCREENS,
  MAIN_TAB_NAMES,
  MAIN_TAB_SCREENS,
  ONBOARDING_STACK_SCREENS,
  PROTECTED_MODAL_SCREENS,
  PROTECTED_STACK_SCREENS,
} from './featureRegistry';

export type NavigatorOwner =
  | 'AuthNavigator'
  | 'OnboardingNavigator'
  | 'MainTabNavigator'
  | 'ModalNavigator';

export type RouteBackBehavior =
  | 'blocked-auth'
  | 'linear-onboarding'
  | 'tab-root'
  | 'stack-back'
  | 'modal-stack-back'
  | 'modal-dismiss';

type RouteMapEntry<RouteName extends keyof RootStackParamList = keyof RootStackParamList> = {
  route: RouteName;
  feature: FeatureRouteOwner;
  rootBranch: FeatureRootBranch;
  navigator: NavigatorOwner;
  bucket: FeatureRouteBucket;
  role: FeatureRouteRole;
  backBehavior: RouteBackBehavior;
  backTarget?: keyof RootStackParamList;
  forwardCycleGroup?: FeatureForwardCycleGroup;
  stateMachineId?: string;
  stateMachineIds?: readonly string[];
};

function routeNames(screens: readonly FeatureStackScreen[]): readonly (keyof RootStackParamList)[] {
  return screens.map(screen => screen.name);
}

const AUTH_ROUTES = routeNames(AUTH_STACK_SCREENS);
const ONBOARDING_ROUTES = routeNames(ONBOARDING_STACK_SCREENS);
const TAB_ROOT_ROUTES = routeNames(MAIN_TAB_SCREENS);
const MODAL_ROUTES = routeNames(PROTECTED_MODAL_SCREENS);
const PROTECTED_STACK_ROUTES = routeNames(PROTECTED_STACK_SCREENS);
const EXPLICIT_ROUTE_BUCKETS = new Map<keyof RootStackParamList, FeatureRouteBucket>(
  FEATURE_ROUTE_ENTRIES.map(entry => [entry.screen.name, entry.bucket] as const),
);
const EXPLICIT_ROOT_BRANCHES = new Map<keyof RootStackParamList, FeatureRootBranch>(
  FEATURE_ROUTE_ENTRIES.map(entry => [entry.screen.name, entry.rootBranch] as const),
);
const EXPLICIT_ROUTE_ROLES = new Map<keyof RootStackParamList, FeatureRouteRole>(
  FEATURE_ROUTE_SCREENS.map(screen => [screen.name, screen.role] as const),
);
const EXPLICIT_BACK_TARGETS = new Map<keyof RootStackParamList, keyof RootStackParamList>(
  FEATURE_ROUTE_SCREENS.flatMap(screen => (screen.backTarget ? [[screen.name, screen.backTarget] as const] : [])),
);
const EXPLICIT_FORWARD_CYCLE_GROUPS = new Map<keyof RootStackParamList, FeatureForwardCycleGroup>(
  FEATURE_ROUTE_SCREENS.flatMap(screen => (screen.forwardCycleGroup ? [[screen.name, screen.forwardCycleGroup] as const] : [])),
);
const EXPLICIT_STATE_MACHINE_IDS = new Map<keyof RootStackParamList, string>(
  FEATURE_ROUTE_SCREENS.flatMap(screen => (screen.stateMachineId ? [[screen.name, screen.stateMachineId] as const] : [])),
);
const EXPLICIT_STATE_MACHINE_ID_GROUPS = new Map<keyof RootStackParamList, readonly string[]>(
  FEATURE_ROUTE_SCREENS.flatMap(screen => (screen.stateMachineIds ? [[screen.name, screen.stateMachineIds] as const] : [])),
);

function includesRoute<const T extends readonly (keyof RootStackParamList)[]>(
  routes: T,
  route: keyof RootStackParamList,
): boolean {
  return routes.includes(route);
}

function navigatorFor(route: keyof RootStackParamList): NavigatorOwner {
  if (includesRoute(AUTH_ROUTES, route)) return 'AuthNavigator';
  if (includesRoute(ONBOARDING_ROUTES, route)) return 'OnboardingNavigator';
  if (includesRoute(TAB_ROOT_ROUTES, route)) return 'MainTabNavigator';
  return 'ModalNavigator';
}

function explicitBucketFor(route: keyof RootStackParamList): FeatureRouteBucket {
  const bucket = EXPLICIT_ROUTE_BUCKETS.get(route);
  if (!bucket) {
    throw new Error(`Missing feature route bucket for ${route}`);
  }
  return bucket;
}

function explicitRootBranchFor(route: keyof RootStackParamList): FeatureRootBranch {
  const rootBranch = EXPLICIT_ROOT_BRANCHES.get(route);
  if (!rootBranch) {
    throw new Error(`Missing feature root branch for ${route}`);
  }
  return rootBranch;
}

function explicitRoleFor(route: keyof RootStackParamList): FeatureRouteRole {
  const explicitRole = EXPLICIT_ROUTE_ROLES.get(route);
  if (!explicitRole) {
    throw new Error(`Missing feature route role for ${route}`);
  }
  return explicitRole;
}

function backBehaviorFor(route: keyof RootStackParamList): RouteBackBehavior {
  if (includesRoute(AUTH_ROUTES, route)) return 'blocked-auth';
  if (includesRoute(ONBOARDING_ROUTES, route)) return 'linear-onboarding';
  if (includesRoute(TAB_ROOT_ROUTES, route)) return 'tab-root';
  if (includesRoute(MODAL_ROUTES, route)) {
    return EXPLICIT_BACK_TARGETS.has(route) ? 'modal-stack-back' : 'modal-dismiss';
  }
  return 'stack-back';
}

function createRouteMap(): Record<keyof RootStackParamList, RouteMapEntry> {
  const entries = Object.keys(ROUTE_OWNERS).map((route) => {
    const routeName = route as keyof RootStackParamList;
    const entry: RouteMapEntry = {
      route: routeName,
      feature: ROUTE_OWNERS[routeName],
      rootBranch: explicitRootBranchFor(routeName),
      navigator: navigatorFor(routeName),
      bucket: explicitBucketFor(routeName),
      role: explicitRoleFor(routeName),
      backBehavior: backBehaviorFor(routeName),
    };
    const backTarget = EXPLICIT_BACK_TARGETS.get(routeName);
    if (backTarget) {
      entry.backTarget = backTarget;
    }
    const forwardCycleGroup = EXPLICIT_FORWARD_CYCLE_GROUPS.get(routeName);
    if (forwardCycleGroup) {
      entry.forwardCycleGroup = forwardCycleGroup;
    }
    const stateMachineId = EXPLICIT_STATE_MACHINE_IDS.get(routeName);
    if (stateMachineId) {
      entry.stateMachineId = stateMachineId;
    }
    const stateMachineIds = EXPLICIT_STATE_MACHINE_ID_GROUPS.get(routeName);
    if (stateMachineIds) {
      entry.stateMachineIds = stateMachineIds;
    }
    return [routeName, entry] as const;
  });

  return Object.fromEntries(entries) as Record<keyof RootStackParamList, RouteMapEntry>;
}

export const ROUTE_MAP = createRouteMap();

export const NAVIGATION_TREE = {
  root: {
    navigator: 'RootStackNavigator',
    branches: ['auth', 'onboarding', 'protected'],
  },
  auth: {
    navigator: 'AuthNavigator',
    routes: AUTH_ROUTES,
  },
  onboarding: {
    navigator: 'OnboardingNavigator',
    routes: ONBOARDING_ROUTES,
  },
  protected: {
    navigator: 'ModalNavigator',
    tabs: MAIN_TAB_NAMES,
    tabRoutes: TAB_ROOT_ROUTES,
    stack: PROTECTED_STACK_ROUTES,
    modals: MODAL_ROUTES,
  },
} as const;
