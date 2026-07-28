import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { NAVIGATION_INVENTORY } from '@/navigation/inventory';
import { NAVIGATION_LINKING_CONFIG } from '@/navigation/linking';
import {
  AUTH_STACK_SCREEN_OPTIONS,
  MODAL_STACK_SCREEN_OPTIONS,
  ONBOARDING_STACK_SCREEN_OPTIONS,
  PROTECTED_STACK_SCREEN_OPTIONS,
} from '@/navigation/options';
import { NAVIGATION_TREE, ROUTE_MAP } from '@/navigation/routeMap';
import { ROUTES } from '@/navigation/routes';
import {
  AUTH_INITIAL_ROUTE,
  FEATURE_NAVIGATION_REGISTRY,
  MAIN_TAB_SCREENS,
  ONBOARDING_INITIAL_ROUTE,
  PENDING_DEVICE_SETUP_ROUTE,
  PRODUCTION_LINKING_ROUTE_ENTRIES,
  PROTECTED_MODAL_SCREENS,
  PROTECTED_STACK_SCREENS,
  PROTECTED_DEFAULT_ROUTE,
} from '@/navigation/featureRegistry';

const root = join(__dirname, '..', '..');

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('navigation architecture', () => {
  const protectedInitialRouteRoles = new Set(['tab', 'stack-entry', 'state-machine', 'fallback-entry']);

  it('uses the production src/navigation navigator layout', () => {
    const navigationDir = join(root, 'src', 'navigation');
    const expectedFiles = [
      'AppNavigator.tsx',
      'AuthNavigator.tsx',
      'MainTabNavigator.tsx',
      'RootStackNavigator.tsx',
      'ModalNavigator.tsx',
      'linking.ts',
      'routes.ts',
    ];

    for (const file of expectedFiles) {
      expect(existsSync(join(navigationDir, file))).toBe(true);
    }

    expect(existsSync(join(root, 'src', 'app', 'navigation'))).toBe(false);
  });

  it('wires a production deep-link config from the feature route map', () => {
    const linkingPath = join(root, 'src', 'navigation', 'linking.ts');
    const appNavigator = readFileSync(join(root, 'src', 'navigation', 'AppNavigator.tsx'), 'utf8');

    expect(existsSync(linkingPath)).toBe(true);
    expect(appNavigator).toContain('NAVIGATION_LINKING_CONFIG');
    expect(appNavigator).toContain('linking={NAVIGATION_LINKING_CONFIG}');

    const screens = NAVIGATION_LINKING_CONFIG.config?.screens;

    expect(screens).toBeDefined();
    if (!screens) return;

    const routeNames = PRODUCTION_LINKING_ROUTE_ENTRIES.map(entry => entry.screen.name).sort();
    const linkingNames = Object.keys(screens).sort();
    const paths = Object.values(screens).filter((path): path is string => typeof path === 'string');

    expect(linkingNames).toEqual(routeNames);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every(path => /^[a-z0-9-]+\/[a-z0-9-]+$/.test(path))).toBe(true);
  });

  it('does not suppress all native warnings at app startup', () => {
    const entrySource = readFileSync(join(root, 'index.js'), 'utf8');
    const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');

    expect(entrySource).toContain("ENV.EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true'");
    expect(entrySource).toContain('LogBox.ignoreAllLogs(true)');
    expect(appSource).not.toContain('ignoreAllLogs');
    expect(appSource).toContain('LogBox.ignoreLogs');
  });

  it('does not import route types from legacy app navigation path', () => {
    const sourceFiles = listSourceFiles(join(root, 'src'));
    const offenders = sourceFiles.filter((file) => {
      const src = readFileSync(file, 'utf8');
      return src
        .split('\n')
        .filter(line => line.startsWith('import '))
        .some(line => line.includes('@/app/navigation/routes') || line.includes('src/app/navigation'));
    });

    expect(offenders.map((file) => file.replace(`${root}/`, ''))).toEqual([]);
  });

  it('does not keep retired navigator labels in production source comments or strings', () => {
    const allowedFiles = new Set([
      join(root, 'src', 'navigation', 'inventory.ts'),
    ]);
    const retiredLabels = ['RootNavigator', 'AuthStack', 'OnboardingStack', 'ModalStack', 'MainStack', 'MainTabs'];
    const offenders = listSourceFiles(join(root, 'src'))
      .filter(file => !allowedFiles.has(file))
      .flatMap((file) => {
        const src = readFileSync(file, 'utf8');
        return src
          .split('\n')
          .map((line, index) => ({ line, lineNumber: index + 1 }))
          .filter(({ line }) => retiredLabels.some(label => line.includes(label)))
          .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
      });

    expect(offenders).toEqual([]);
  });

  it('does not describe current production navigation as the retired prototype', () => {
    const currentDocPaths = [
      join(root, 'src', 'navigation', 'routes.ts'),
      join(root, 'src', 'navigation', 'README.md'),
      join(root, 'tests', 'e2e', 'auth.test.tsx'),
      join(root, 'tests', 'e2e', 'onboarding.test.tsx'),
      join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-audit.md'),
      join(root, 'scripts', 'flows', 'render-html.mjs'),
      join(root, 'scripts', 'flows', 'schema', 'nav-graph.schema.json'),
      join(root, 'scripts', 'flows', 'lib', 'repo.mjs'),
    ];
    const offenders = currentDocPaths.flatMap((docPath) => {
      const doc = readFileSync(docPath, 'utf8');
      return doc
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => line.includes('TJBot-design'))
        .map(({ line, lineNumber }) => `${docPath.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('keeps an AI-readable navigation architecture guide beside the navigators', () => {
    const guidePath = join(root, 'src', 'navigation', 'README.md');
    expect(existsSync(guidePath)).toBe(true);

    const guide = readFileSync(guidePath, 'utf8');
    expect(guide).toContain('## Architecture');
    expect(guide).toContain('## Source Of Truth');
    expect(guide).toContain('## Route Map');
    expect(guide).toContain('## Navigation Tree');
    expect(guide).toContain('## Ownership');
    expect(guide).toContain('## Invariants');
    expect(guide).toContain('FEATURE_NAVIGATION_REGISTRY');
    expect(guide).toContain('ROUTE_MAP');
    expect(guide).toContain('NAVIGATION_TREE');
  });

  it('keeps the architecture README aligned to production navigation', () => {
    const readmePath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'README.md');
    const readme = readFileSync(readmePath, 'utf8');

    expect(readme).toContain('src/navigation');
    expect(readme).toContain('FEATURE_NAVIGATION_REGISTRY');
    expect(readme).toContain('ROUTE_MAP');
    expect(readme).toContain('NAVIGATION_TREE');
    expect(readme).toContain('navigation-audit.md');
    expect(readme).toContain('route-mapping.json');
    expect(readme).toContain('navigation-tree.mmd');

    const retiredTerms = ['TJBot-design', 'Vite', 'App.jsx', 'states.js', 'index.js'];
    const offenders = retiredTerms.filter(term => readme.includes(term));
    expect(offenders).toEqual([]);
  });

  it('keeps current architecture docs on the production src/navigation path', () => {
    const currentDocPaths = [
      join(root, 'src', 'navigation', 'README.md'),
      join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-audit.md'),
      join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-tree.mmd'),
      join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'route-mapping.json'),
    ];
    const retiredLabels = ['RootNavigator', 'AuthStack', 'OnboardingStack', 'ModalStack', 'MainTabs', 'ActivityStub'];
    const offenders = currentDocPaths.flatMap((docPath) => {
      const doc = readFileSync(docPath, 'utf8');
      return doc
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) =>
          line.includes('src/app/navigation')
          || line.includes('src/app/RootNavigator.tsx')
          || retiredLabels.some(label => line.includes(label)),
        )
        .map(({ line, lineNumber }) => `${docPath.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('does not preserve stale broken-flow TODOs in the navigation audit', () => {
    const auditPath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-audit.md');
    const audit = readFileSync(auditPath, 'utf8');
    const staleFragments = [
      'Broken flows / dead-ends',
      'TODO(POST-PR5',
      'NEEDS MAJOR REFACTOR',
      'Google/Apple buttons navigate',
      'TrustScreen → MicAskScreen → "Not now" → LoginScreen',
      'AuthContext.logout()',
      'payment provider integration is TODO',
      'retired without replacement',
    ];
    const offenders = staleFragments.filter(fragment => audit.includes(fragment));

    expect(offenders).toEqual([]);
  });

  it('keeps navigation output artifacts aligned with the production route map and tree', () => {
    const routeMappingPath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'route-mapping.json');
    const navigationTreePath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-tree.mmd');
    const routeMapping = JSON.parse(readFileSync(routeMappingPath, 'utf8')) as {
      routeCount?: number;
      routes?: Record<string, {
        feature?: string;
        navigator?: string;
        backBehavior?: string;
        deepLinkPath?: string;
        stateMachineId?: string;
        stateMachineIds?: readonly string[];
      }>;
    };
    const navigationTree = readFileSync(navigationTreePath, 'utf8');

    expect(routeMapping.routeCount).toBe(Object.keys(ROUTE_MAP).length);
    expect(Object.keys(routeMapping.routes ?? {}).sort()).toEqual(Object.keys(ROUTE_MAP).sort());

    for (const [route, entry] of Object.entries(ROUTE_MAP)) {
      const routeName = route as keyof typeof ROUTE_MAP;
      const artifactEntry = routeMapping.routes?.[route];
      expect(artifactEntry?.feature).toBe(entry.feature);
      expect(artifactEntry?.navigator).toBe(entry.navigator);
      expect(artifactEntry?.backBehavior).toBe(entry.backBehavior);
      expect(artifactEntry?.deepLinkPath).toBe(NAVIGATION_LINKING_CONFIG.config?.screens?.[routeName]);
      expect(artifactEntry?.stateMachineId).toBe(Reflect.get(entry, 'stateMachineId'));
      expect(artifactEntry?.stateMachineIds).toEqual(Reflect.get(entry, 'stateMachineIds'));
    }

    expect(navigationTree).toContain(NAVIGATION_TREE.root.navigator);
    expect(navigationTree).toContain(NAVIGATION_TREE.auth.navigator);
    expect(navigationTree).toContain(NAVIGATION_TREE.onboarding.navigator);
    expect(navigationTree).toContain(NAVIGATION_TREE.protected.navigator);
    expect(navigationTree).toContain('MainTabNavigator');
    expect(navigationTree).toContain(`Auth --> AuthInitial[${AUTH_INITIAL_ROUTE}]`);
    expect(navigationTree).toContain(`Onboarding --> OnboardingInitial[${ONBOARDING_INITIAL_ROUTE}]`);
    expect(navigationTree).toContain(`Protected --> ProtectedDefault[${PROTECTED_DEFAULT_ROUTE}]`);
    expect(navigationTree).toContain(`Protected --> PendingDeviceSetup[${PENDING_DEVICE_SETUP_ROUTE}]`);
    expect(navigationTree).toContain('Protected_HomeHubScreen[HomeHubScreen<br/>tabScreen / tab]');
    expect(navigationTree).toContain('Protected_CourseScreen[CourseScreen<br/>stackScreens / stack-entry]');
    expect(navigationTree).toContain('Modal_PurchaseIntroScreen[PurchaseIntroScreen<br/>modalScreens / modal-entry]');
    expect(navigationTree).not.toContain('RootNavigator');
    expect(navigationTree).not.toContain('AuthStack');
    expect(navigationTree).not.toContain('ModalStack');
    expect(navigationTree).not.toContain('MainTabs');
    expect(navigationTree).not.toContain('ActivityStub');
  });

  it('keeps the route-map output artifact reproducible from a repo script', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const scriptPath = join(root, 'scripts', 'navigation', 'export-route-mapping.mjs');

    expect(existsSync(scriptPath)).toBe(true);
    expect(packageJson.scripts?.['navigation:route-map']).toBe('node scripts/navigation/export-route-mapping.mjs');
  });

  it('keeps the navigation-tree output artifact reproducible from a repo script', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const scriptPath = join(root, 'scripts', 'navigation', 'export-navigation-tree.mjs');

    expect(existsSync(scriptPath)).toBe(true);
    expect(packageJson.scripts?.['navigation:tree']).toBe('node scripts/navigation/export-navigation-tree.mjs');
  });

  it('keeps the forward-edge output artifact reproducible from a repo script', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const scriptPath = join(root, 'scripts', 'navigation', 'export-forward-edges.mjs');
    const artifactPath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-forward-edges.json');

    expect(existsSync(scriptPath)).toBe(true);
    expect(packageJson.scripts?.['navigation:forward-edges']).toBe('node scripts/navigation/export-forward-edges.mjs');

    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as {
      edgeCount?: number;
      forwardEdges?: readonly {
        sourceRoute?: string;
        targetRoute?: string;
      }[];
      reciprocalCycleViolations?: readonly string[];
      crossFeatureInteriorViolations?: readonly string[];
      productionVisibilityViolations?: readonly string[];
      hiddenRoutes?: readonly string[];
    };

    expect(artifact.edgeCount).toBe(artifact.forwardEdges?.length);
    expect(artifact.edgeCount).toBeGreaterThan(0);
    expect(artifact.forwardEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceRoute: ROUTES.HomeHubScreen, targetRoute: ROUTES.SendToRobotScreen }),
        expect.objectContaining({ sourceRoute: ROUTES.PairIntroScreen, targetRoute: ROUTES.PairSearchScreen }),
        expect.objectContaining({ sourceRoute: ROUTES.PurchaseIntroScreen, targetRoute: ROUTES.HowItWorksScreen }),
      ]),
    );
    expect(artifact.reciprocalCycleViolations).toEqual([]);
    expect(artifact.crossFeatureInteriorViolations).toEqual([]);
    expect(artifact.productionVisibilityViolations).toEqual([]);
    expect(artifact.hiddenRoutes).toEqual([]);
  });

  it('documents feature route entries, inventory, tab metadata, and route coverage counts', () => {
    const guide = readFileSync(join(root, 'src', 'navigation', 'README.md'), 'utf8');

    expect(guide).toContain('featureRouteEntries.ts');
    expect(guide).toContain('inventory.ts');
    expect(guide).toContain('tabName');
    expect(guide).toContain('title');
    expect(guide).toContain('tabIcon');
    expect(guide).toContain('tabBarButtonTestID');
    expect(guide).toContain('modal-stack-back');
    expect(guide).toContain('modal-dismiss');
    // Counts drift with route scope; guide points at the live coverage command.
    expect(guide).toContain('npm run check:route-coverage');
    expect(guide).not.toMatch(/\d+ screen files/);
    expect(guide).not.toMatch(/\d+ routes registered/);
    expect(guide).not.toMatch(/\d+ feature route registrations/);
  });

  it('exports a production navigation inventory for final delivery review', () => {
    const inventoryPath = join(root, 'src', 'navigation', 'inventory.ts');
    expect(existsSync(inventoryPath)).toBe(true);

    const inventory = NAVIGATION_INVENTORY;

    expect(inventory).toBeTruthy();
    expect(inventory.architecture).toEqual([
      'AppNavigator.tsx',
      'AuthNavigator.tsx',
      'MainTabNavigator.tsx',
      'RootStackNavigator.tsx',
      'ModalNavigator.tsx',
    ]);
    expect(Object.keys(inventory.routeMap)).toEqual(Object.keys(ROUTE_MAP));
    expect(inventory.deletedRoutes).toEqual([
      'retired app-navigation route aliases',
      'legacy src/screens tree',
      'prototype StubScreen registrations',
      'ListenScreen alias',
      'SpeakScreen alias',
      'DevicePairWifiScreen alias',
    ]);
    expect(inventory.mergedNavigators).toContain('src/app/navigation');
    expect(Object.keys(inventory.ownership).length).toBe(Object.keys(ROUTE_MAP).length);
    expect(inventory.businessFlows).toEqual({
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
    });
    expect(inventory.businessFlowSequenceGovernance).toEqual({
      source: 'src/features/*/navigation.ts',
      sequences: {
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
      },
      routesMissingRouteMapEntries: [],
      routesMissingStateMachineMetadata: [],
      routesWithWrongFeatureOwner: [],
      routesWithInvalidBackChain: [],
    });
    expect(inventory.stackHierarchy).toEqual({
      root: 'RootStackNavigator',
      depth: 3,
      branches: ['AuthNavigator', 'OnboardingNavigator', 'ModalNavigator'],
      protectedHost: 'MainTabNavigator',
      modalPresentation: 'native-stack modal group',
    });
    expect(inventory.navigatorComposition).toEqual({
      authRoutes: NAVIGATION_TREE.auth.routes,
      onboardingRoutes: NAVIGATION_TREE.onboarding.routes,
      tabHostRoutes: MAIN_TAB_SCREENS.map(screen => screen.name),
      protectedStackRoutes: PROTECTED_STACK_SCREENS.map(screen => screen.name),
      protectedModalRoutes: PROTECTED_MODAL_SCREENS.map(screen => screen.name),
      duplicateTabStackRoutes: [],
      duplicateStackModalRoutes: [],
      duplicateTabModalRoutes: [],
    });
    expect(inventory.mobileTransitions).toEqual({
      auth: 'shared native-stack options',
      onboarding: 'shared native-stack options',
      protectedStack: 'push options',
      protectedModals: 'modal presentation options',
    });
    expect(inventory.mobileTransitionGovernance).toEqual({
      authOptions: AUTH_STACK_SCREEN_OPTIONS,
      onboardingOptions: ONBOARDING_STACK_SCREEN_OPTIONS,
      protectedStackOptions: PROTECTED_STACK_SCREEN_OPTIONS,
      modalOptions: MODAL_STACK_SCREEN_OPTIONS,
      modalPresentation: 'modal',
      protectedGestureEnabled: true,
      modalGestureEnabled: true,
      rootBranchGesturesDisabled: true,
    });
    expect(inventory.resetFlows).toEqual({
      logout: 'auth state change remounts AuthNavigator with key auth',
      authInvalidated: '401 refresh failure clears tokens and flips root branch',
      onboardingComplete: 'household state remounts protected ModalNavigator with key protected',
    });
    expect(inventory.routeNaming).toEqual({
      style: 'PascalCase route constants matching screen component names',
      allowedSuffixes: ['Screen', 'Overlay'],
      legacyAliasesRemoved: ['ListenScreen', 'SpeakScreen', 'DevicePairWifiScreen'],
      deepLinkStyle: '<feature>/<kebab-case-route>',
      routeNameViolations: [],
    });
    expect(inventory.deterministicRouting).toEqual({
      routeCount: Object.keys(ROUTE_MAP).length,
      deepLinkPathCount: Object.keys(NAVIGATION_LINKING_CONFIG.config.screens).length,
      duplicateDeepLinkPaths: [],
    });
    expect(inventory.deepLinkCoverage).toEqual({
      routeCount: Object.keys(ROUTE_MAP).length,
      deepLinkPathCount: Object.keys(NAVIGATION_LINKING_CONFIG.config.screens).length,
      routesMissingDeepLinks: Object.keys(ROUTE_MAP)
        .filter(route => !Object.hasOwn(NAVIGATION_LINKING_CONFIG.config.screens, route))
        .sort(),
      deepLinksMissingRouteMapEntries: [],
      invalidDeepLinkPaths: [],
    });
    expect(inventory.stateMachineAlignment).toEqual({
      routeCount: Object.keys(ROUTE_MAP).length,
      stateMappedRouteCount: Object.values(ROUTE_MAP).filter(entry =>
        Boolean(Reflect.get(entry, 'stateMachineId')) || Array.isArray(Reflect.get(entry, 'stateMachineIds')),
      ).length,
      missingStateMachineMetadata: [],
    });
    expect(Object.keys(inventory.screenResponsibilities).sort()).toEqual(Object.keys(ROUTE_MAP).sort());
    for (const [route, responsibility] of Object.entries(inventory.screenResponsibilities)) {
      const routeName = route as keyof typeof ROUTE_MAP;
      const entry = ROUTE_MAP[routeName];
      expect(responsibility).toEqual({
        route: entry.route,
        feature: entry.feature,
        navigator: entry.navigator,
        bucket: entry.bucket,
        role: entry.role,
      });
    }
    const expectedFeatureOwnership = Object.values(ROUTE_MAP).reduce<Record<string, string[]>>((features, route) => {
      const existingRoutes = features[route.feature] ?? [];
      return {
        ...features,
        [route.feature]: [...existingRoutes, route.route].sort(),
      };
    }, {});
    expect(inventory.featureOwnership).toEqual(expectedFeatureOwnership);
    expect(inventory.multiAgentSafety).toEqual({
      routeSource: 'src/features/*/navigation.ts',
      ownershipSource: 'FEATURE_NAVIGATION_REGISTRY',
      duplicateRouteOwners: [],
      featureCount: Object.keys(expectedFeatureOwnership).length,
    });
    expect(inventory.modalGovernance).toEqual({
      modalRouteCount: NAVIGATION_TREE.protected.modals.length,
      modalRoutesOutsideModalBucket: [],
      modalRoutesMissingModalRole: [],
      protectedStackRoutesWithModalRole: [],
      modalInteriorRoutesMissingBackTargets: [],
    });
    expect(inventory.backBehaviorCoverage).toEqual({
      routeCount: Object.keys(ROUTE_MAP).length,
      routesMissingBackBehavior: [],
      routesWithInvalidBackTargets: [],
      modalStackRoutesMissingBackTargets: [],
      tabRootsWithBackTargets: [],
    });
    expect(inventory.routeRegistrationIntegrity).toEqual({
      routeMapCount: Object.keys(ROUTE_MAP).length,
      featureRouteEntryCount: Object.keys(ROUTE_MAP).length,
      duplicateFeatureRegistrations: [],
      routesMissingFeatureRegistration: [],
      featureRegistrationsMissingRouteMapEntry: [],
      unownedFeatureRegistrations: [],
    });
    expect(inventory.tabHierarchy).toEqual({
      tabCount: 5,
      tabNames: ['Home', 'Devices', 'Library', 'Progress', 'Profile'],
      tabRoutes: MAIN_TAB_SCREENS.map(screen => screen.name),
      defaultTabRoute: PROTECTED_DEFAULT_ROUTE,
      duplicateTabOrders: [],
      duplicateTabNames: [],
      tabsMissingRouteMapEntries: [],
      nonTabRoutesInTabHierarchy: [],
    });
    expect(inventory.screenComponentResponsibility).toEqual({
      routeCount: Object.keys(ROUTE_MAP).length,
      registeredComponentCount: Object.keys(ROUTE_MAP).length,
      duplicateComponentRegistrations: [],
      routesMissingComponents: [],
    });
    expect(inventory.forwardCycleGovernance).toEqual({
      cycleGroupCount: 4,
      cycleGroups: {
        'course-dispatch-picker': [ROUTES.RobotReadyScreen, ROUTES.SendToRobotScreen],
        'device-pairing-retry': [
          ROUTES.PairCodeScreen,
          ROUTES.PairConnectingScreen,
          ROUTES.PairFailedScreen,
          ROUTES.PairFoundScreen,
          ROUTES.PairQrScanScreen,
          ROUTES.PairRenameScreen,
          ROUTES.PairSearchScreen,
          ROUTES.PairWifiPasswordScreen,
          ROUTES.PairWifiScreen,
        ],
        'lesson-exit-resume': [
          ROUTES.ExitConfirmScreen,
          ROUTES.RobotListeningScreen,
          ROUTES.RobotSpeakingScreen,
          ROUTES.SuccessScreen,
          ROUTES.ThinkingScreen,
          ROUTES.UserSpeakingScreen,
        ],
        'network-retry': [ROUTES.NetworkErrorScreen, ROUTES.ReconnectingOverlay],
      },
      routesWithUnknownCycleGroups: [],
      cycleGroupsWithSingleRoute: [],
    });
    const allowedProtectedInitialRoutes = Object.values(ROUTE_MAP)
      .filter(entry => entry.navigator === 'MainTabNavigator' || entry.navigator === 'ModalNavigator')
      .filter(entry => entry.bucket !== 'modalScreens')
      .filter(entry => protectedInitialRouteRoles.has(entry.role))
      .map(entry => entry.route)
      .sort();
    expect(inventory.protectedEntryGovernance).toEqual({
      defaultRoute: PROTECTED_DEFAULT_ROUTE,
      pendingDeviceSetupRoute: PENDING_DEVICE_SETUP_ROUTE,
      allowedInitialRoutes: allowedProtectedInitialRoutes,
      invalidInitialRoutes: [],
      rootResetKeys: ['auth', 'onboarding', 'protected'],
    });
    expect(inventory.rootBranchResetGovernance).toEqual({
      source: 'RootStackNavigator.tsx',
      branchKeys: {
        auth: 'auth',
        onboarding: 'onboarding',
        protected: 'protected',
      },
      authResetCondition: '!isAuthenticated',
      onboardingResetCondition: '!onboardingComplete',
      protectedInitialRouteExpression: 'pendingDeviceSetup ? PENDING_DEVICE_SETUP_ROUTE : protectedInitialRoute',
      protectedDefaultInitialRoute: PROTECTED_DEFAULT_ROUTE,
      pendingDeviceSetupInitialRoute: PENDING_DEVICE_SETUP_ROUTE,
      missingResetKeys: [],
      missingBranchConditions: [],
    });
    const expectedDeepNestedFeatures = Object.fromEntries(
      FEATURE_NAVIGATION_REGISTRY.map(feature => [
        feature.owner,
        {
          rootBranch: feature.rootBranch,
          tabRoutes: feature.tabScreen ? [feature.tabScreen.name] : [],
          stackEntryRoutes: feature.stackScreens
            .filter(screen => protectedInitialRouteRoles.has(screen.role))
            .map(screen => screen.name)
            .sort(),
          interiorStackRoutes: feature.stackScreens
            .filter(screen => !protectedInitialRouteRoles.has(screen.role))
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
        },
      ]),
    );
    expect(inventory.deepNestedFeatureGovernance).toEqual({
      featureCount: FEATURE_NAVIGATION_REGISTRY.length,
      features: expectedDeepNestedFeatures,
      featuresWithoutEntryRoutes: [],
      interiorRoutesMissingBackTargets: [],
      modalInteriorRoutesOutsideModalBucket: [],
    });
    const expectedFeatureSliceGovernance = Object.fromEntries(
      FEATURE_NAVIGATION_REGISTRY.map(feature => [
        feature.owner,
        {
          rootBranch: feature.rootBranch,
          stackRouteCount: feature.stackScreens.length,
          modalRouteCount: feature.modalScreens.length,
          tabRouteCount: feature.tabScreen ? 1 : 0,
          routeCount: feature.stackScreens.length + feature.modalScreens.length + (feature.tabScreen ? 1 : 0),
        },
      ]),
    );
    expect(inventory.featureSliceGovernance).toEqual({
      featureCount: FEATURE_NAVIGATION_REGISTRY.length,
      features: expectedFeatureSliceGovernance,
      featuresWithoutRoutes: [],
      featuresWithMismatchedOwnership: [],
    });
    expect(inventory.deliveryGovernance).toEqual({
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
      objectiveViolations: [],
      blockerScope: 'non-navigation-gates',
      blockerCount: inventory.remainingRisks.length,
      readinessStatus: 'partial-blocked-by-non-navigation-gates',
    });
    expect(inventory.remainingRisks.length).toBeGreaterThan(0);
    expect(inventory.productionReadinessStatus).toBe('partial-blocked-by-non-navigation-gates');
  });

  it('records production app entry wiring in the navigation delivery inventory', () => {
    const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
    const indexSource = readFileSync(join(root, 'index.js'), 'utf8');
    const rootNavigatorSource = readFileSync(join(root, 'src', 'navigation', 'RootStackNavigator.tsx'), 'utf8');

    expect(indexSource).toContain("import App from './src/App'");
    expect(appSource).toContain("import { AppNavigator } from './navigation/AppNavigator'");
    expect(appSource).toContain('<AppNavigator />');
    expect(appSource).not.toContain('./app/navigation');
    expect(appSource).not.toContain('RootNavigator');
    expect(appSource).not.toContain('MainTabs');

    expect(NAVIGATION_INVENTORY.appEntry).toEqual({
      nativeEntry: 'index.js',
      appComponent: 'src/App.tsx',
      navigatorComponent: 'src/navigation/AppNavigator.tsx',
      routeSource: 'src/features/*/navigation.ts',
    });

    expect(rootNavigatorSource).toContain('<AuthNavigator key="auth" />');
    expect(rootNavigatorSource).toContain('<OnboardingNavigator key="onboarding" />');
    expect(rootNavigatorSource).toContain('<ModalNavigator key="protected"');
    expect(rootNavigatorSource).toContain('if (!isAuthenticated)');
    expect(rootNavigatorSource).toContain('if (!onboardingComplete)');
    expect(rootNavigatorSource).toContain('pendingDeviceSetup ? PENDING_DEVICE_SETUP_ROUTE : protectedInitialRoute');
  });
});
