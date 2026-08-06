import { NAVIGATION_TREE, ROUTE_MAP } from './routeMap';
import { NAVIGATION_LINKING_SCREENS } from './linking';
import { ROUTE_OWNERS } from './routeOwnership';
import { FEATURE_ROUTE_ENTRIES } from './featureRouteEntries';
import { ROUTES } from './routes';
import type { FeatureForwardCycleGroup, FeatureRouteOwner, FeatureRouteRole } from './types';
import {
  AUTH_STACK_SCREEN_OPTIONS,
  MODAL_STACK_SCREEN_OPTIONS,
  ONBOARDING_STACK_SCREEN_OPTIONS,
  PROTECTED_STACK_SCREEN_OPTIONS,
} from './options';
import {
  AUTH_INITIAL_ROUTE,
  FEATURE_NAVIGATION_REGISTRY,
  MAIN_TAB_SCREENS,
  ONBOARDING_INITIAL_ROUTE,
  PENDING_DEVICE_SETUP_ROUTE,
  PROTECTED_MODAL_SCREENS,
  PROTECTED_STACK_SCREENS,
  PROTECTED_DEFAULT_ROUTE,
} from './featureRegistry';

export const NAVIGATION_ARCHITECTURE = [
  'AppNavigator.tsx',
  'AuthNavigator.tsx',
  'MainTabNavigator.tsx',
  'RootStackNavigator.tsx',
  'ModalNavigator.tsx',
] as const;

export const DELETED_LEGACY_ROUTES = [
  'retired app-navigation route aliases',
  'legacy src/app/screens alias tree',
  'prototype StubScreen registrations',
  'ListenScreen alias',
  'SpeakScreen alias',
  'DevicePairWifiScreen alias',
  'src/api/* shim aliases',
] as const;
export const MERGED_LEGACY_NAVIGATORS = [
  'src/app/navigation',
  'src/screens',
  'RootNavigator.tsx',
  'MainTabs.tsx',
] as const;

export const PRODUCTION_APP_ENTRY = {
  nativeEntry: 'index.js',
  appComponent: 'src/App.tsx',
  navigatorComponent: 'src/navigation/AppNavigator.tsx',
  routeSource: 'src/features/*/navigation.ts',
} as const;

export const NAVIGATION_REMAINING_RISKS = [
  'repo-wide lint debt outside navigation',
  'full unit suite has non-navigation voice/Gemini failures',
  'sequences:fast missing @mermaid-js/parser',
  'erd:validate script is absent; erd:fast is the available passing validator',
  'usecases:check has backend sentinel failures for parent/progress endpoints',
] as const;

export const NAVIGATION_SCREEN_RESPONSIBILITIES = Object.fromEntries(
  Object.values(ROUTE_MAP).map(route => [
    route.route,
    {
      route: route.route,
      feature: route.feature,
      navigator: route.navigator,
      bucket: route.bucket,
      role: route.role,
    },
  ] as const),
);

export const NAVIGATION_BUSINESS_FLOWS = {
  auth: {
    navigator: 'AuthNavigator',
    initialRoute: AUTH_INITIAL_ROUTE,
    routes: NAVIGATION_TREE.auth.routes,
  },
  onboarding: {
    navigator: 'OnboardingNavigator',
    initialRoute: ONBOARDING_INITIAL_ROUTE,
    routes: NAVIGATION_TREE.onboarding.routes,
  },
  protected: {
    navigator: 'ModalNavigator',
    initialRoute: PROTECTED_DEFAULT_ROUTE,
    pendingDeviceSetupRoute: PENDING_DEVICE_SETUP_ROUTE,
    tabs: NAVIGATION_TREE.protected.tabs,
    tabRoutes: NAVIGATION_TREE.protected.tabRoutes,
    stackRoutes: NAVIGATION_TREE.protected.stack,
    modalRoutes: NAVIGATION_TREE.protected.modals,
  },
} as const;

const BUSINESS_FLOW_SEQUENCES = {
  auth: [
    ROUTES.SplashScreen,
    ROUTES.WelcomeScreen,
    ROUTES.IntroListenScreen,
    ROUTES.IntroSpeakScreen,
    ROUTES.IntroRetryScreen,
    ROUTES.IntroCelebrateScreen,
    ROUTES.TrustScreen,
    ROUTES.LoginScreen,
  ],
  onboarding: [
    ROUTES.ParentConsentScreen,
    ROUTES.ChildProfileScreen,
    ROUTES.MicAskScreen,
    ROUTES.FirstLessonEntryScreen,
  ],
  devicePairing: [
    ROUTES.DeviceOverviewScreen,
    ROUTES.PairAddScreen,
    ROUTES.PairIntroScreen,
    ROUTES.PairFoundScreen,
    ROUTES.PairQrScanScreen,
    ROUTES.PairCodeScreen,
    ROUTES.PairWifiScreen,
    ROUTES.PairWifiPasswordScreen,
    ROUTES.PairConnectingScreen,
    ROUTES.PairSuccessScreen,
    ROUTES.PairRenameScreen,
    ROUTES.PairFirstLessonScreen,
  ],
  purchase: [
    ROUTES.PurchaseIntroScreen,
    ROUTES.HowItWorksScreen,
    ROUTES.IncludedScreen,
    ROUTES.BundleScreen,
    ROUTES.SubscriptionsScreen,
    ROUTES.PrivacyScreen,
    ROUTES.CheckoutScreen,
    ROUTES.OrderConfirmScreen,
    ROUTES.ShippingScreen,
    ROUTES.ArrivedScreen,
    ROUTES.ActivateScreen,
    ROUTES.FirstCourseScreen,
  ],
} as const;

type BusinessFlowName = keyof typeof BUSINESS_FLOW_SEQUENCES;

const BUSINESS_FLOW_FEATURE_OWNERS: Record<BusinessFlowName, FeatureRouteOwner> = {
  auth: 'auth',
  onboarding: 'onboarding',
  devicePairing: 'device',
  purchase: 'purchase',
};

function isRouteMapRoute(route: string): route is keyof typeof ROUTE_MAP {
  return Object.hasOwn(ROUTE_MAP, route);
}

function routesMissingBusinessFlowRouteMapEntries(): readonly string[] {
  return Object.values(BUSINESS_FLOW_SEQUENCES)
    .flat()
    .filter(route => !isRouteMapRoute(route))
    .sort();
}

function routesMissingBusinessFlowStateMachineMetadata(): readonly string[] {
  return Object.values(BUSINESS_FLOW_SEQUENCES)
    .flat()
    .filter(isRouteMapRoute)
    .filter(route => !hasStateMachineMetadata(ROUTE_MAP[route]))
    .sort();
}

function routesWithWrongBusinessFlowFeatureOwner(): readonly string[] {
  return Object.entries(BUSINESS_FLOW_SEQUENCES)
    .flatMap(([flowName, routes]) => {
      const expectedOwner = BUSINESS_FLOW_FEATURE_OWNERS[flowName as BusinessFlowName];
      return routes
        .filter(isRouteMapRoute)
        .filter(route => ROUTE_MAP[route].feature !== expectedOwner)
        .map(route => `${flowName}:${route}:${ROUTE_MAP[route].feature}`);
    })
    .sort();
}

function routesWithInvalidBusinessFlowBackChain(): readonly string[] {
  return Object.entries(BUSINESS_FLOW_SEQUENCES)
    .flatMap(([flowName, routes]) =>
      routes
        .filter(isRouteMapRoute)
        .flatMap((route, index, sequenceRoutes) => {
          if (index === 0) return [];
          const backTarget = ROUTE_MAP[route].backTarget;
          if (!backTarget || backTarget === sequenceRoutes[index - 1]) return [];
          return [`${flowName}:${route}->${String(backTarget)}`];
        }),
    )
    .sort();
}

export const NAVIGATION_BUSINESS_FLOW_SEQUENCE_GOVERNANCE = {
  source: 'src/features/*/navigation.ts',
  sequences: BUSINESS_FLOW_SEQUENCES,
  routesMissingRouteMapEntries: routesMissingBusinessFlowRouteMapEntries(),
  routesMissingStateMachineMetadata: routesMissingBusinessFlowStateMachineMetadata(),
  routesWithWrongFeatureOwner: routesWithWrongBusinessFlowFeatureOwner(),
  routesWithInvalidBackChain: routesWithInvalidBusinessFlowBackChain(),
} as const;

export const NAVIGATION_STACK_HIERARCHY = {
  root: 'RootStackNavigator',
  depth: 3,
  branches: ['AuthNavigator', 'OnboardingNavigator', 'ModalNavigator'],
  protectedHost: 'MainTabNavigator',
  modalPresentation: 'native-stack modal group',
} as const;

function overlappingRoutes(left: readonly string[], right: readonly string[]): readonly string[] {
  const rightRoutes = new Set(right);
  return left
    .filter(route => rightRoutes.has(route))
    .sort();
}

const TAB_HOST_ROUTES = MAIN_TAB_SCREENS.map(screen => screen.name);
const PROTECTED_STACK_ROUTES = PROTECTED_STACK_SCREENS.map(screen => screen.name);
const PROTECTED_MODAL_ROUTES = PROTECTED_MODAL_SCREENS.map(screen => screen.name);

export const NAVIGATION_NAVIGATOR_COMPOSITION = {
  authRoutes: NAVIGATION_TREE.auth.routes,
  onboardingRoutes: NAVIGATION_TREE.onboarding.routes,
  tabHostRoutes: TAB_HOST_ROUTES,
  protectedStackRoutes: PROTECTED_STACK_ROUTES,
  protectedModalRoutes: PROTECTED_MODAL_ROUTES,
  duplicateTabStackRoutes: overlappingRoutes(TAB_HOST_ROUTES, PROTECTED_STACK_ROUTES),
  duplicateStackModalRoutes: overlappingRoutes(PROTECTED_STACK_ROUTES, PROTECTED_MODAL_ROUTES),
  duplicateTabModalRoutes: overlappingRoutes(TAB_HOST_ROUTES, PROTECTED_MODAL_ROUTES),
} as const;

export const NAVIGATION_MOBILE_TRANSITIONS = {
  auth: 'shared native-stack options',
  onboarding: 'shared native-stack options',
  protectedStack: 'push options',
  protectedModals: 'modal presentation options',
} as const;

export const NAVIGATION_MOBILE_TRANSITION_GOVERNANCE = {
  authOptions: AUTH_STACK_SCREEN_OPTIONS,
  onboardingOptions: ONBOARDING_STACK_SCREEN_OPTIONS,
  protectedStackOptions: PROTECTED_STACK_SCREEN_OPTIONS,
  modalOptions: MODAL_STACK_SCREEN_OPTIONS,
  modalPresentation: MODAL_STACK_SCREEN_OPTIONS.presentation,
  protectedGestureEnabled: PROTECTED_STACK_SCREEN_OPTIONS.gestureEnabled,
  modalGestureEnabled: MODAL_STACK_SCREEN_OPTIONS.gestureEnabled,
  rootBranchGesturesDisabled: AUTH_STACK_SCREEN_OPTIONS.gestureEnabled === false
    && ONBOARDING_STACK_SCREEN_OPTIONS.gestureEnabled === false,
} as const;

export const NAVIGATION_RESET_FLOWS = {
  logout: 'auth state change remounts AuthNavigator with key auth',
  authInvalidated: '401 refresh failure clears tokens and flips root branch',
  onboardingComplete: 'household state remounts protected ModalNavigator with key protected',
} as const;

const ROUTE_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*(Screen|Overlay)$/;

function routeNameViolations(): readonly string[] {
  return Object.keys(ROUTE_MAP)
    .filter(route => !ROUTE_NAME_PATTERN.test(route))
    .sort();
}

export const NAVIGATION_ROUTE_NAMING = {
  style: 'PascalCase route constants matching screen component names',
  allowedSuffixes: ['Screen', 'Overlay'],
  legacyAliasesRemoved: ['ListenScreen', 'SpeakScreen', 'DevicePairWifiScreen'],
  deepLinkStyle: '<feature>/<kebab-case-route>',
  routeNameViolations: routeNameViolations(),
} as const;

function duplicateDeepLinkPaths(): readonly string[] {
  const counts = new Map<string, number>();
  for (const path of Object.values(NAVIGATION_LINKING_SCREENS)) {
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([path]) => path)
    .sort();
}

export const NAVIGATION_DETERMINISTIC_ROUTING = {
  routeCount: Object.keys(ROUTE_MAP).length,
  deepLinkPathCount: Object.values(NAVIGATION_LINKING_SCREENS).length,
  duplicateDeepLinkPaths: duplicateDeepLinkPaths(),
} as const;

const DEEP_LINK_PATH_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/;

function routesMissingDeepLinks(): readonly string[] {
  return Object.keys(ROUTE_MAP)
    .filter(route => !Object.hasOwn(NAVIGATION_LINKING_SCREENS, route))
    .sort();
}

function deepLinksMissingRouteMapEntries(): readonly string[] {
  return Object.keys(NAVIGATION_LINKING_SCREENS)
    .filter(route => !Object.hasOwn(ROUTE_MAP, route))
    .sort();
}

function invalidDeepLinkPaths(): readonly string[] {
  return Object.entries(NAVIGATION_LINKING_SCREENS)
    .filter(([, path]) => !DEEP_LINK_PATH_PATTERN.test(path))
    .map(([route, path]) => `${route}:${path}`)
    .sort();
}

export const NAVIGATION_DEEP_LINK_COVERAGE = {
  routeCount: Object.keys(ROUTE_MAP).length,
  deepLinkPathCount: Object.keys(NAVIGATION_LINKING_SCREENS).length,
  routesMissingDeepLinks: routesMissingDeepLinks(),
  deepLinksMissingRouteMapEntries: deepLinksMissingRouteMapEntries(),
  invalidDeepLinkPaths: invalidDeepLinkPaths(),
} as const;

function hasStateMachineMetadata(route: (typeof ROUTE_MAP)[keyof typeof ROUTE_MAP]): boolean {
  return Boolean(route.stateMachineId) || Boolean(route.stateMachineIds?.length);
}

function missingStateMachineMetadata(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => !hasStateMachineMetadata(route))
    .map(route => route.route)
    .sort();
}

export const NAVIGATION_STATE_MACHINE_ALIGNMENT = {
  routeCount: Object.keys(ROUTE_MAP).length,
  stateMappedRouteCount: Object.values(ROUTE_MAP).filter(hasStateMachineMetadata).length,
  missingStateMachineMetadata: missingStateMachineMetadata(),
} as const;

function featureOwnership(): Partial<Record<FeatureRouteOwner, readonly string[]>> {
  const grouped: Partial<Record<FeatureRouteOwner, string[]>> = {};
  for (const route of Object.values(ROUTE_MAP)) {
    grouped[route.feature] = [...(grouped[route.feature] ?? []), route.route].sort();
  }
  return grouped;
}

export const NAVIGATION_FEATURE_OWNERSHIP = featureOwnership();

function duplicateRouteOwners(): readonly string[] {
  const ownersByRoute = new Map<string, Set<FeatureRouteOwner>>();
  for (const entry of FEATURE_ROUTE_ENTRIES) {
    ownersByRoute.set(entry.screen.name, (ownersByRoute.get(entry.screen.name) ?? new Set()).add(entry.owner));
  }
  return Array.from(ownersByRoute.entries())
    .filter(([, owners]) => owners.size > 1)
    .map(([route, owners]) => `${route}:${Array.from(owners).sort().join(',')}`)
    .sort();
}

export const NAVIGATION_MULTI_AGENT_SAFETY = {
  routeSource: 'src/features/*/navigation.ts',
  ownershipSource: 'FEATURE_NAVIGATION_REGISTRY',
  duplicateRouteOwners: duplicateRouteOwners(),
  featureCount: Object.keys(NAVIGATION_FEATURE_OWNERSHIP).length,
} as const;

function modalRoutesOutsideModalBucket(): readonly string[] {
  return NAVIGATION_TREE.protected.modals
    .filter(route => ROUTE_MAP[route].bucket !== 'modalScreens')
    .sort();
}

function modalRoutesMissingModalRole(): readonly string[] {
  return NAVIGATION_TREE.protected.modals
    .filter((route) => {
      const role = ROUTE_MAP[route].role;
      return role !== 'modal' && role !== 'modal-entry';
    })
    .sort();
}

function protectedStackRoutesWithModalRole(): readonly string[] {
  return NAVIGATION_TREE.protected.stack
    .filter((route) => {
      const role = ROUTE_MAP[route].role;
      return role === 'modal' || role === 'modal-entry';
    })
    .sort();
}

function modalInteriorRoutesMissingBackTargets(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => route.bucket === 'modalScreens')
    .filter(route => route.role === 'modal')
    .filter(route => !route.backTarget)
    .map(route => route.route)
    .sort();
}

export const NAVIGATION_MODAL_GOVERNANCE = {
  modalRouteCount: NAVIGATION_TREE.protected.modals.length,
  modalRoutesOutsideModalBucket: modalRoutesOutsideModalBucket(),
  modalRoutesMissingModalRole: modalRoutesMissingModalRole(),
  protectedStackRoutesWithModalRole: protectedStackRoutesWithModalRole(),
  modalInteriorRoutesMissingBackTargets: modalInteriorRoutesMissingBackTargets(),
} as const;

function routesMissingBackBehavior(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => !route.backBehavior)
    .map(route => route.route)
    .sort();
}

function routesWithInvalidBackTargets(): readonly string[] {
  const routeNames = new Set(Object.keys(ROUTE_MAP));
  return Object.values(ROUTE_MAP)
    .filter(route => Boolean(route.backTarget) && !routeNames.has(String(route.backTarget)))
    .map(route => route.route)
    .sort();
}

function modalStackRoutesMissingBackTargets(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => route.backBehavior === 'modal-stack-back' && !route.backTarget)
    .map(route => route.route)
    .sort();
}

function tabRootsWithBackTargets(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => route.backBehavior === 'tab-root' && Boolean(route.backTarget))
    .map(route => route.route)
    .sort();
}

export const NAVIGATION_BACK_BEHAVIOR_COVERAGE = {
  routeCount: Object.keys(ROUTE_MAP).length,
  routesMissingBackBehavior: routesMissingBackBehavior(),
  routesWithInvalidBackTargets: routesWithInvalidBackTargets(),
  modalStackRoutesMissingBackTargets: modalStackRoutesMissingBackTargets(),
  tabRootsWithBackTargets: tabRootsWithBackTargets(),
} as const;

function duplicateFeatureRegistrations(): readonly string[] {
  const registrationsByRoute = new Map<string, string[]>();
  for (const entry of FEATURE_ROUTE_ENTRIES) {
    registrationsByRoute.set(entry.screen.name, [
      ...(registrationsByRoute.get(entry.screen.name) ?? []),
      `${entry.owner}.${entry.bucket}`,
    ]);
  }
  return Array.from(registrationsByRoute.entries())
    .filter(([, registrations]) => registrations.length > 1)
    .map(([route, registrations]) => `${route}:${registrations.sort().join(',')}`)
    .sort();
}

function routesMissingFeatureRegistration(): readonly string[] {
  const registeredRoutes = new Set(FEATURE_ROUTE_ENTRIES.map(entry => String(entry.screen.name)));
  return Object.keys(ROUTE_MAP)
    .filter(route => !registeredRoutes.has(route))
    .sort();
}

function featureRegistrationsMissingRouteMapEntry(): readonly string[] {
  const routeNames = new Set(Object.keys(ROUTE_MAP));
  return FEATURE_ROUTE_ENTRIES
    .map(entry => String(entry.screen.name))
    .filter(route => !routeNames.has(route))
    .sort();
}

function unownedFeatureRegistrations(): readonly string[] {
  const ownerEntries = new Set(Object.entries(ROUTE_OWNERS).map(([route, owner]) => `${route}:${owner}`));
  return FEATURE_ROUTE_ENTRIES
    .filter(entry => !ownerEntries.has(`${entry.screen.name}:${entry.owner}`))
    .map(entry => `${entry.screen.name}:${entry.owner}`)
    .sort();
}

export const NAVIGATION_ROUTE_REGISTRATION_INTEGRITY = {
  routeMapCount: Object.keys(ROUTE_MAP).length,
  featureRouteEntryCount: FEATURE_ROUTE_ENTRIES.length,
  duplicateFeatureRegistrations: duplicateFeatureRegistrations(),
  routesMissingFeatureRegistration: routesMissingFeatureRegistration(),
  featureRegistrationsMissingRouteMapEntry: featureRegistrationsMissingRouteMapEntry(),
  unownedFeatureRegistrations: unownedFeatureRegistrations(),
} as const;

function duplicateTabOrders(): readonly number[] {
  const orderCounts = new Map<number, number>();
  for (const screen of MAIN_TAB_SCREENS) {
    orderCounts.set(screen.tabOrder, (orderCounts.get(screen.tabOrder) ?? 0) + 1);
  }
  return Array.from(orderCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([order]) => order)
    .sort((left, right) => left - right);
}

function duplicateTabNames(): readonly string[] {
  const nameCounts = new Map<string, number>();
  for (const screen of MAIN_TAB_SCREENS) {
    nameCounts.set(screen.tabName, (nameCounts.get(screen.tabName) ?? 0) + 1);
  }
  return Array.from(nameCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort();
}

function tabsMissingRouteMapEntries(): readonly string[] {
  const routeNames = new Set(Object.keys(ROUTE_MAP));
  return MAIN_TAB_SCREENS
    .map(screen => String(screen.name))
    .filter(route => !routeNames.has(route))
    .sort();
}

function nonTabRoutesInTabHierarchy(): readonly string[] {
  return MAIN_TAB_SCREENS
    .filter(screen => ROUTE_MAP[screen.name]?.role !== 'tab')
    .map(screen => screen.name)
    .sort();
}

export const NAVIGATION_TAB_HIERARCHY = {
  tabCount: MAIN_TAB_SCREENS.length,
  tabNames: MAIN_TAB_SCREENS.map(screen => screen.tabName),
  tabRoutes: MAIN_TAB_SCREENS.map(screen => screen.name),
  defaultTabRoute: PROTECTED_DEFAULT_ROUTE,
  duplicateTabOrders: duplicateTabOrders(),
  duplicateTabNames: duplicateTabNames(),
  tabsMissingRouteMapEntries: tabsMissingRouteMapEntries(),
  nonTabRoutesInTabHierarchy: nonTabRoutesInTabHierarchy(),
} as const;

function routesMissingComponents(): readonly string[] {
  return FEATURE_ROUTE_ENTRIES
    .filter(entry => !entry.screen.component)
    .map(entry => entry.screen.name)
    .sort();
}

function duplicateComponentRegistrations(): readonly string[] {
  const registrationsByComponent = new Map<(typeof FEATURE_ROUTE_ENTRIES)[number]['screen']['component'], string[]>();
  for (const entry of FEATURE_ROUTE_ENTRIES) {
    const route = String(entry.screen.name);
    registrationsByComponent.set(entry.screen.component, [
      ...(registrationsByComponent.get(entry.screen.component) ?? []),
      route,
    ]);
  }
  return Array.from(registrationsByComponent.values())
    .filter(routes => routes.length > 1)
    .map(routes => routes.sort().join(','))
    .sort();
}

export const NAVIGATION_SCREEN_COMPONENT_RESPONSIBILITY = {
  routeCount: Object.keys(ROUTE_MAP).length,
  registeredComponentCount: FEATURE_ROUTE_ENTRIES.filter(entry => Boolean(entry.screen.component)).length,
  duplicateComponentRegistrations: duplicateComponentRegistrations(),
  routesMissingComponents: routesMissingComponents(),
} as const;

const FORWARD_CYCLE_GROUPS: readonly FeatureForwardCycleGroup[] = [
  'auth-trust-login', 'course-dispatch-picker',
  'device-pairing-retry',
  'lesson-demo-review',
  'lesson-session-loop',
  'network-retry', 'support-help',
] as const;

function isFeatureForwardCycleGroup(value: unknown): value is FeatureForwardCycleGroup {
  return typeof value === 'string' && FORWARD_CYCLE_GROUPS.some(cycleGroup => cycleGroup === value);
}

function forwardCycleGroups(): Record<FeatureForwardCycleGroup, readonly string[]> {
  const grouped: Record<FeatureForwardCycleGroup, string[]> = {
    'auth-trust-login': [],
    'course-dispatch-picker': [],
    'device-pairing-retry': [],
    'lesson-demo-review': [],
    'lesson-session-loop': [],
    'network-retry': [],
    'support-help': [],
  };
  for (const route of Object.values(ROUTE_MAP)) {
    const cycleGroup = Reflect.get(route, 'forwardCycleGroup');
    if (isFeatureForwardCycleGroup(cycleGroup)) {
      grouped[cycleGroup] = [...grouped[cycleGroup], route.route].sort();
    }
  }
  return grouped;
}

function routesWithUnknownCycleGroups(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter((route) => {
      const cycleGroup = Reflect.get(route, 'forwardCycleGroup');
      return cycleGroup !== undefined && !isFeatureForwardCycleGroup(cycleGroup);
    })
    .map(route => route.route)
    .sort();
}

function cycleGroupsWithSingleRoute(): readonly FeatureForwardCycleGroup[] {
  const grouped = forwardCycleGroups();
  return FORWARD_CYCLE_GROUPS
    .filter(cycleGroup => grouped[cycleGroup].length === 1)
    .sort();
}

export const NAVIGATION_FORWARD_CYCLE_GOVERNANCE = {
  cycleGroupCount: FORWARD_CYCLE_GROUPS.length,
  cycleGroups: forwardCycleGroups(),
  routesWithUnknownCycleGroups: routesWithUnknownCycleGroups(),
  cycleGroupsWithSingleRoute: cycleGroupsWithSingleRoute(),
} as const;

const PROTECTED_INITIAL_ROUTE_ROLES: readonly FeatureRouteRole[] = [
  'tab',
  'stack-entry',
  'state-machine',
  'fallback-entry',
] as const;

function isProtectedInitialRouteRole(role: FeatureRouteRole): boolean {
  return PROTECTED_INITIAL_ROUTE_ROLES.some(initialRouteRole => initialRouteRole === role);
}

function allowedProtectedInitialRoutes(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => route.navigator === 'MainTabNavigator' || route.navigator === 'ModalNavigator')
    .filter(route => route.bucket !== 'modalScreens')
    .filter(route => isProtectedInitialRouteRole(route.role))
    .map(route => route.route)
    .sort();
}

function invalidInitialRoutes(): readonly string[] {
  const allowedRoutes = new Set(allowedProtectedInitialRoutes());
  return [PROTECTED_DEFAULT_ROUTE, PENDING_DEVICE_SETUP_ROUTE]
    .filter(route => !allowedRoutes.has(route))
    .sort();
}

export const NAVIGATION_PROTECTED_ENTRY_GOVERNANCE = {
  defaultRoute: PROTECTED_DEFAULT_ROUTE,
  pendingDeviceSetupRoute: PENDING_DEVICE_SETUP_ROUTE,
  allowedInitialRoutes: allowedProtectedInitialRoutes(),
  invalidInitialRoutes: invalidInitialRoutes(),
  rootResetKeys: ['auth', 'onboarding', 'protected'],
} as const;

const ROOT_BRANCH_RESET_KEYS = {
  auth: 'auth',
  onboarding: 'onboarding',
  protected: 'protected',
} as const;

export const NAVIGATION_ROOT_BRANCH_RESET_GOVERNANCE = {
  source: 'RootStackNavigator.tsx',
  branchKeys: ROOT_BRANCH_RESET_KEYS,
  authResetCondition: '!isAuthenticated',
  onboardingResetCondition: '!onboardingComplete',
  protectedInitialRouteExpression: 'pendingDeviceSetup ? PENDING_DEVICE_SETUP_ROUTE : protectedInitialRoute',
  protectedDefaultInitialRoute: PROTECTED_DEFAULT_ROUTE,
  pendingDeviceSetupInitialRoute: PENDING_DEVICE_SETUP_ROUTE,
  missingResetKeys: [],
  missingBranchConditions: [],
} as const;

function isEntryRole(role: FeatureRouteRole): boolean {
  return PROTECTED_INITIAL_ROUTE_ROLES.some(entryRole => entryRole === role);
}

function deepNestedFeatureGovernance(): Partial<Record<FeatureRouteOwner, {
  readonly rootBranch: string;
  readonly tabRoutes: readonly string[];
  readonly stackEntryRoutes: readonly string[];
  readonly interiorStackRoutes: readonly string[];
  readonly modalEntryRoutes: readonly string[];
  readonly interiorModalRoutes: readonly string[];
}>> {
  const grouped: Partial<Record<FeatureRouteOwner, {
    readonly rootBranch: string;
    readonly tabRoutes: readonly string[];
    readonly stackEntryRoutes: readonly string[];
    readonly interiorStackRoutes: readonly string[];
    readonly modalEntryRoutes: readonly string[];
    readonly interiorModalRoutes: readonly string[];
  }>> = {};
  for (const feature of FEATURE_NAVIGATION_REGISTRY) {
    grouped[feature.owner] = {
      rootBranch: feature.rootBranch,
      tabRoutes: feature.tabScreen ? [feature.tabScreen.name] : [],
      stackEntryRoutes: feature.stackScreens
        .filter(screen => isEntryRole(screen.role))
        .map(screen => screen.name)
        .sort(),
      interiorStackRoutes: feature.stackScreens
        .filter(screen => !isEntryRole(screen.role))
        .map(screen => screen.name)
        .sort(),
      modalEntryRoutes: feature.modalScreens
        .filter(screen => screen.role === 'modal-entry')
        .map(screen => screen.name)
        .sort(),
      interiorModalRoutes: feature.modalScreens
        .filter(screen => screen.role === 'modal')
        .map(screen => screen.name)
        .sort(),
    };
  }
  return grouped;
}

function featuresWithoutEntryRoutes(): readonly FeatureRouteOwner[] {
  return FEATURE_NAVIGATION_REGISTRY
    .filter(feature =>
      !feature.initialRoute
      && !feature.tabScreen
      && feature.stackScreens.every(screen => !isEntryRole(screen.role))
      && feature.modalScreens.every(screen => screen.role !== 'modal-entry'),
    )
    .map(feature => feature.owner)
    .sort();
}

function interiorRoutesMissingBackTargets(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => route.navigator === 'ModalNavigator')
    .filter(route => route.bucket === 'stackScreens')
    .filter(route => !isEntryRole(route.role))
    .filter(route => !route.backTarget)
    .map(route => route.route)
    .sort();
}

function modalInteriorRoutesOutsideModalBucket(): readonly string[] {
  return Object.values(ROUTE_MAP)
    .filter(route => route.role === 'modal')
    .filter(route => route.bucket !== 'modalScreens')
    .map(route => route.route)
    .sort();
}

export const NAVIGATION_DEEP_NESTED_FEATURE_GOVERNANCE = {
  featureCount: FEATURE_NAVIGATION_REGISTRY.length,
  features: deepNestedFeatureGovernance(),
  featuresWithoutEntryRoutes: featuresWithoutEntryRoutes(),
  interiorRoutesMissingBackTargets: interiorRoutesMissingBackTargets(),
  modalInteriorRoutesOutsideModalBucket: modalInteriorRoutesOutsideModalBucket(),
} as const;

function featureSliceGovernance(): Partial<Record<FeatureRouteOwner, {
  readonly rootBranch: string;
  readonly stackRouteCount: number;
  readonly modalRouteCount: number;
  readonly tabRouteCount: number;
  readonly routeCount: number;
}>> {
  const grouped: Partial<Record<FeatureRouteOwner, {
    readonly rootBranch: string;
    readonly stackRouteCount: number;
    readonly modalRouteCount: number;
    readonly tabRouteCount: number;
    readonly routeCount: number;
  }>> = {};
  for (const feature of FEATURE_NAVIGATION_REGISTRY) {
    const tabRouteCount = feature.tabScreen ? 1 : 0;
    grouped[feature.owner] = {
      rootBranch: feature.rootBranch,
      stackRouteCount: feature.stackScreens.length,
      modalRouteCount: feature.modalScreens.length,
      tabRouteCount,
      routeCount: feature.stackScreens.length + feature.modalScreens.length + tabRouteCount,
    };
  }
  return grouped;
}

function featuresWithoutRoutes(): readonly FeatureRouteOwner[] {
  const governance = featureSliceGovernance();
  return FEATURE_NAVIGATION_REGISTRY
    .filter(feature => (governance[feature.owner]?.routeCount ?? 0) === 0)
    .map(feature => feature.owner)
    .sort();
}

function featuresWithMismatchedOwnership(): readonly FeatureRouteOwner[] {
  const routesByFeature = featureOwnership();
  return FEATURE_NAVIGATION_REGISTRY
    .filter((feature) => {
      const expectedCount = feature.stackScreens.length + feature.modalScreens.length + (feature.tabScreen ? 1 : 0);
      return (routesByFeature[feature.owner]?.length ?? 0) !== expectedCount;
    })
    .map(feature => feature.owner)
    .sort();
}

export const NAVIGATION_FEATURE_SLICE_GOVERNANCE = {
  featureCount: FEATURE_NAVIGATION_REGISTRY.length,
  features: featureSliceGovernance(),
  featuresWithoutRoutes: featuresWithoutRoutes(),
  featuresWithMismatchedOwnership: featuresWithMismatchedOwnership(),
} as const;

export const NAVIGATION_DELIVERY_GOVERNANCE = {
  objective: 'src/features/*/navigation.ts is the single source of truth for production React Native navigation',
  routeSource: 'src/features/*/navigation.ts',
  productionNavigatorSource: 'src/navigation',
  proofFields: [
    'routeMap',
    'navigationTree',
    'ownership',
    'businessFlows',
    'businessFlowSequenceGovernance',
    'routeRegistrationIntegrity',
    'featureSliceGovernance',
  ],
  objectiveViolations: [
    ...NAVIGATION_ROUTE_REGISTRATION_INTEGRITY.duplicateFeatureRegistrations,
    ...NAVIGATION_ROUTE_REGISTRATION_INTEGRITY.routesMissingFeatureRegistration,
    ...NAVIGATION_ROUTE_REGISTRATION_INTEGRITY.featureRegistrationsMissingRouteMapEntry,
    ...NAVIGATION_ROUTE_REGISTRATION_INTEGRITY.unownedFeatureRegistrations,
    ...NAVIGATION_FEATURE_SLICE_GOVERNANCE.featuresWithoutRoutes,
    ...NAVIGATION_FEATURE_SLICE_GOVERNANCE.featuresWithMismatchedOwnership,
  ].sort(),
  blockerScope: 'non-navigation-gates',
  blockerCount: NAVIGATION_REMAINING_RISKS.length,
  readinessStatus: 'partial-blocked-by-non-navigation-gates',
} as const;

export const NAVIGATION_INVENTORY = {
  architecture: NAVIGATION_ARCHITECTURE,
  routeMap: ROUTE_MAP,
  navigationTree: NAVIGATION_TREE,
  deletedRoutes: DELETED_LEGACY_ROUTES,
  mergedNavigators: MERGED_LEGACY_NAVIGATORS,
  appEntry: PRODUCTION_APP_ENTRY,
  ownership: ROUTE_OWNERS,
  businessFlows: NAVIGATION_BUSINESS_FLOWS,
  businessFlowSequenceGovernance: NAVIGATION_BUSINESS_FLOW_SEQUENCE_GOVERNANCE,
  stackHierarchy: NAVIGATION_STACK_HIERARCHY,
  navigatorComposition: NAVIGATION_NAVIGATOR_COMPOSITION,
  mobileTransitions: NAVIGATION_MOBILE_TRANSITIONS,
  mobileTransitionGovernance: NAVIGATION_MOBILE_TRANSITION_GOVERNANCE,
  resetFlows: NAVIGATION_RESET_FLOWS,
  routeNaming: NAVIGATION_ROUTE_NAMING,
  deterministicRouting: NAVIGATION_DETERMINISTIC_ROUTING,
  deepLinkCoverage: NAVIGATION_DEEP_LINK_COVERAGE,
  stateMachineAlignment: NAVIGATION_STATE_MACHINE_ALIGNMENT,
  screenResponsibilities: NAVIGATION_SCREEN_RESPONSIBILITIES,
  featureOwnership: NAVIGATION_FEATURE_OWNERSHIP,
  multiAgentSafety: NAVIGATION_MULTI_AGENT_SAFETY,
  modalGovernance: NAVIGATION_MODAL_GOVERNANCE,
  backBehaviorCoverage: NAVIGATION_BACK_BEHAVIOR_COVERAGE,
  routeRegistrationIntegrity: NAVIGATION_ROUTE_REGISTRATION_INTEGRITY,
  tabHierarchy: NAVIGATION_TAB_HIERARCHY,
  screenComponentResponsibility: NAVIGATION_SCREEN_COMPONENT_RESPONSIBILITY,
  forwardCycleGovernance: NAVIGATION_FORWARD_CYCLE_GOVERNANCE,
  protectedEntryGovernance: NAVIGATION_PROTECTED_ENTRY_GOVERNANCE,
  rootBranchResetGovernance: NAVIGATION_ROOT_BRANCH_RESET_GOVERNANCE,
  deepNestedFeatureGovernance: NAVIGATION_DEEP_NESTED_FEATURE_GOVERNANCE,
  featureSliceGovernance: NAVIGATION_FEATURE_SLICE_GOVERNANCE,
  deliveryGovernance: NAVIGATION_DELIVERY_GOVERNANCE,
  remainingRisks: NAVIGATION_REMAINING_RISKS,
  productionReadinessStatus: 'partial-blocked-by-non-navigation-gates',
} as const;
