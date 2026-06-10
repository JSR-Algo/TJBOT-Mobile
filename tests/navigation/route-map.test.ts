import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AUTH_STACK_SCREENS,
  FEATURE_NAVIGATION_REGISTRY,
  MAIN_TAB_SCREENS,
  ONBOARDING_STACK_SCREENS,
  PROTECTED_MODAL_SCREENS,
  PROTECTED_STACK_SCREENS,
} from '@/navigation/featureRegistry';
import { FEATURE_ROUTE_ENTRIES } from '@/navigation/featureRouteEntries';
import { NAVIGATION_TREE, ROUTE_MAP } from '@/navigation/routeMap';

const root = join(__dirname, '..', '..');

function roleOf(screen: { readonly role?: string }): string | undefined {
  return screen.role;
}

function routeKeys(): string[] {
  const src = readFileSync(join(root, 'src', 'navigation', 'routes.ts'), 'utf8');
  return Array.from(src.matchAll(/^\s{2}(\w+):/gm), (match) => match[1]);
}

describe('navigation route map', () => {
  it('maps every route to a navigator, feature, root branch, and back behavior', () => {
    const keys = routeKeys();
    const mappedKeys = Object.keys(ROUTE_MAP);

    expect(mappedKeys.sort()).toEqual(keys.sort());
    for (const key of keys) {
      const entry = ROUTE_MAP[key as keyof typeof ROUTE_MAP];
      expect(entry.route).toBe(key);
      expect(entry.feature).toBeTruthy();
      expect(entry.rootBranch).toMatch(/^(auth|onboarding|protected)$/);
      expect(entry.navigator).toBeTruthy();
      expect(entry.role).toMatch(/^(auth|onboarding|onboarding-root|tab|stack-entry|stack|modal|modal-entry|state-machine|fallback-entry)$/);
      expect(entry.backBehavior).toBeTruthy();
    }
  });

  it('documents root navigation branches and modal routes', () => {
    const routeMapSource = readFileSync(join(root, 'src', 'navigation', 'routeMap.ts'), 'utf8');

    expect(NAVIGATION_TREE.root.branches).toEqual(['auth', 'onboarding', 'protected']);
    expect(NAVIGATION_TREE.protected.tabs).toEqual(MAIN_TAB_SCREENS.map(screen => screen.tabName));
    expect(Reflect.get(NAVIGATION_TREE.protected, 'tabRoutes')).toEqual(MAIN_TAB_SCREENS.map(screen => screen.name));
    expect(Reflect.get(NAVIGATION_TREE.protected, 'stack')).toEqual(PROTECTED_STACK_SCREENS.map(screen => screen.name));
    expect(NAVIGATION_TREE.protected.modals).toEqual(PROTECTED_MODAL_SCREENS.map(screen => screen.name));
    expect(routeMapSource).toContain('MAIN_TAB_NAMES');
    expect(routeMapSource).not.toContain("tabs: ['Home', 'Devices', 'Library', 'Progress', 'Profile']");
  });

  it('does not duplicate tab roots in the protected modal stack', () => {
    const tabRouteNames = MAIN_TAB_SCREENS.map(screen => screen.name);
    const protectedStackRouteNames = PROTECTED_STACK_SCREENS.map(screen => screen.name);

    for (const tabRouteName of tabRouteNames) {
      expect(protectedStackRouteNames).not.toContain(tabRouteName);
    }
  });

  it('registers every protected tab route name in the modal navigator stack', () => {
    const modalNavigatorSource = readFileSync(join(root, 'src', 'navigation', 'ModalNavigator.tsx'), 'utf8');

    expect(modalNavigatorSource).toContain('MAIN_TAB_SCREENS.map(renderTabHostScreen)');
    expect(modalNavigatorSource).not.toContain('<Stack.Screen name={PROTECTED_DEFAULT_ROUTE} component={MainTabNavigator} />');
  });

  it('does not register auth or onboarding routes in the protected stack', () => {
    const authGateRouteNames = [
      ...AUTH_STACK_SCREENS.map(screen => screen.name),
      ...ONBOARDING_STACK_SCREENS.map(screen => screen.name),
    ];
    const protectedStackRouteNames = PROTECTED_STACK_SCREENS.map(screen => screen.name);

    for (const gateRouteName of authGateRouteNames) {
      expect(protectedStackRouteNames).not.toContain(gateRouteName);
    }
  });

  it('keeps feature route buckets disjoint', () => {
    const duplicates = FEATURE_NAVIGATION_REGISTRY.flatMap((feature) => {
      const buckets = [
        ...feature.stackScreens.map(screen => [screen.name, 'stackScreens'] as const),
        ...feature.modalScreens.map(screen => [screen.name, 'modalScreens'] as const),
        ...(feature.tabScreen ? [[feature.tabScreen.name, 'tabScreen'] as const] : []),
      ];
      const bucketsByRoute = new Map<string, string[]>();

      for (const [route, bucket] of buckets) {
        const existingBuckets = bucketsByRoute.get(route) ?? [];
        bucketsByRoute.set(route, [...existingBuckets, bucket]);
      }

      return Array.from(bucketsByRoute.entries())
        .filter(([, routeBuckets]) => routeBuckets.length > 1)
        .map(([route, routeBuckets]) => `${feature.owner}:${route}:${routeBuckets.join(',')}`);
    });

    expect(duplicates).toEqual([]);
  });

  it('requires feature tab metadata to explicitly declare tab role', () => {
    const missingExplicitTabRole = MAIN_TAB_SCREENS
      .filter(screen => roleOf(screen) !== 'tab')
      .map(screen => screen.name);

    expect(missingExplicitTabRole).toEqual([]);
  });

  it('requires auth and onboarding gate metadata to explicitly declare gate roles', () => {
    const missingAuthRole = AUTH_STACK_SCREENS
      .filter(screen => roleOf(screen) !== 'auth')
      .map(screen => screen.name);
    const missingOnboardingRole = ONBOARDING_STACK_SCREENS
      .filter(screen => roleOf(screen) !== 'onboarding' && roleOf(screen) !== 'onboarding-root')
      .map(screen => screen.name);

    expect(missingAuthRole).toEqual([]);
    expect(missingOnboardingRole).toEqual([]);
  });

  it('requires protected stack metadata to explicitly declare protected stack roles', () => {
    const missingProtectedStackRole = PROTECTED_STACK_SCREENS
      .filter(screen => roleOf(screen) !== 'stack-entry' && roleOf(screen) !== 'stack' && roleOf(screen) !== 'state-machine' && roleOf(screen) !== 'fallback-entry')
      .map(screen => screen.name);

    expect(missingProtectedStackRole).toEqual([]);
  });

  it('requires route role at the feature screen type level', () => {
    const typesSource = readFileSync(join(root, 'src', 'navigation', 'types.ts'), 'utf8');

    expect(typesSource).toContain('readonly role: FeatureRouteRole;');
    expect(typesSource).not.toContain('readonly role?: FeatureRouteRole;');
  });

  it('preserves feature registry bucket provenance in the route map', () => {
    const bucketByRoute = new Map(FEATURE_ROUTE_ENTRIES.map(entry => [entry.screen.name, entry.bucket] as const));
    const missingBucketProvenance = Object.entries(ROUTE_MAP)
      .filter(([route, entry]) => Reflect.get(entry, 'bucket') !== bucketByRoute.get(route as keyof typeof ROUTE_MAP))
      .map(([route, entry]) => `${route}:${String(Reflect.get(entry, 'bucket'))}`);

    expect(missingBucketProvenance).toEqual([]);
  });

  it('preserves feature registry root branch provenance in the route map', () => {
    const branchByRoute = new Map(FEATURE_ROUTE_ENTRIES.map(entry => [entry.screen.name, entry.rootBranch] as const));
    const missingBranchProvenance = Object.entries(ROUTE_MAP)
      .filter(([route, entry]) => entry.rootBranch !== branchByRoute.get(route as keyof typeof ROUTE_MAP))
      .map(([route, entry]) => `${route}:${entry.rootBranch}`);

    expect(missingBranchProvenance).toEqual([]);
  });

  it('distinguishes modal stack back behavior from modal dismissal', () => {
    const modalRoutesWithBackTargets = Object.values(ROUTE_MAP)
      .filter(entry => Reflect.get(entry, 'bucket') === 'modalScreens' && Reflect.get(entry, 'backTarget'))
      .map(entry => [entry.route, entry.backBehavior] as const);
    const modalDismissRoutes = Object.values(ROUTE_MAP)
      .filter(entry => Reflect.get(entry, 'bucket') === 'modalScreens' && !Reflect.get(entry, 'backTarget'))
      .map(entry => [entry.route, entry.backBehavior] as const);

    expect(modalRoutesWithBackTargets.map(([, backBehavior]) => backBehavior)).toEqual(
      Array.from({ length: modalRoutesWithBackTargets.length }, () => 'modal-stack-back'),
    );
    expect(modalDismissRoutes.map(([, backBehavior]) => backBehavior)).toEqual(
      Array.from({ length: modalDismissRoutes.length }, () => 'modal-dismiss'),
    );
  });

  it('does not infer route metadata when feature metadata is missing', () => {
    const routeMapSource = readFileSync(join(root, 'src', 'navigation', 'routeMap.ts'), 'utf8');

    expect(routeMapSource).not.toContain("?? 'stackScreens'");
    expect(routeMapSource).not.toContain("return 'auth';");
    expect(routeMapSource).not.toContain("return 'onboarding';");
    expect(routeMapSource).not.toContain("return 'tab';");
    expect(routeMapSource).not.toContain("return 'modal';");
    expect(routeMapSource).not.toContain("return 'stack';");
  });
});
