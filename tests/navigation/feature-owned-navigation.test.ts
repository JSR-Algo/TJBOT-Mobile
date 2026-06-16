import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { basename, dirname, join, normalize, resolve } from 'path';
import { MAIN_TAB_SCREENS } from '@/navigation/featureRegistry';
import { ROUTE_MAP } from '@/navigation/routeMap';

const root = join(__dirname, '..', '..');

const FEATURES_WITH_ROUTES = [
  'auth',
  'onboarding',
  'home',
  'course',
  'course-library',
  'purchase',
  'lesson-demo',
  'lesson-session',
  'progress',
  'parent',
  'device',
  'robot-mgmt',
  'fallback',
] as const;

function featureDir(feature: string): string {
  return feature === 'lesson-demo' ? 'lessonDemo' : feature;
}

const ENTRY_ROLES = new Set(['tab', 'stack-entry', 'modal-entry', 'state-machine', 'fallback-entry']);

function listFiles(dir: string, predicate: (file: string) => boolean): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function importedComponentPaths(navigationFile: string): ReadonlyMap<string, string> {
  const src = readFileSync(navigationFile, 'utf8');
  const imports = new Map<string, string>();

  for (const match of src.matchAll(/^import\s+(\w+)\s+from\s+'([^']+)';/gm)) {
    const componentName = match[1];
    const importPath = match[2];
    if (!componentName || !importPath.startsWith('.')) continue;

    imports.set(componentName, normalize(resolve(dirname(navigationFile), `${importPath}.tsx`)));
  }

  return imports;
}

function screenFileToRoute(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  const navigationFiles = listFiles(join(root, 'src', 'features'), file => basename(file) === 'navigation.ts');

  for (const navigationFile of navigationFiles) {
    const imports = importedComponentPaths(navigationFile);
    const src = readFileSync(navigationFile, 'utf8');

    for (const match of src.matchAll(/\{\s*name:\s*ROUTES\.(\w+)\s*,\s*component:\s*(\w+)/g)) {
      const routeName = match[1];
      const componentName = match[2];
      if (!routeName || !componentName) continue;

      const componentPath = imports.get(componentName);
      if (componentPath) {
        map.set(componentPath, routeName);
      }
    }
  }

  return map;
}

describe('feature-owned navigation', () => {
  it('keeps route screen registration inside feature slices', () => {
    for (const feature of FEATURES_WITH_ROUTES) {
      expect(existsSync(join(root, 'src', 'features', featureDir(feature), 'navigation.ts'))).toBe(true);
    }

    const centralNavigators = [
      'src/navigation/AuthNavigator.tsx',
      'src/navigation/OnboardingNavigator.tsx',
      'src/navigation/MainTabNavigator.tsx',
      'src/navigation/ModalNavigator.tsx',
      'src/navigation/routeMap.ts',
      'src/navigation/routeOwnership.ts',
    ];

    for (const file of centralNavigators) {
      const src = readFileSync(join(root, file), 'utf8');
      const featureImports = src
        .split('\n')
        .filter(line => line.startsWith('import ') && line.includes('@/features/'));

      expect(featureImports).toEqual([]);
      for (const importLine of featureImports) {
        expect(importLine).not.toMatch(/@\/features\/.+\/screens\//);
        expect(importLine).not.toMatch(/@\/features\/.+\/[^/]+Modal/);
      }
    }
  });

  it('derives route ownership and route groups from feature navigation registries', () => {
    const featureRouteEntriesPath = join(root, 'src', 'navigation', 'featureRouteEntries.ts');
    expect(existsSync(featureRouteEntriesPath)).toBe(true);

    const featureRouteEntriesSource = readFileSync(featureRouteEntriesPath, 'utf8');
    const ownershipSource = readFileSync(join(root, 'src', 'navigation', 'routeOwnership.ts'), 'utf8');
    const routeMapSource = readFileSync(join(root, 'src', 'navigation', 'routeMap.ts'), 'utf8');
    const modalNavigatorSource = readFileSync(join(root, 'src', 'navigation', 'ModalNavigator.tsx'), 'utf8');
    const featureRegistrySource = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');

    for (const feature of FEATURES_WITH_ROUTES) {
      expect(featureRegistrySource).toContain(`@/features/${featureDir(feature)}/navigation`);
    }

    expect(featureRouteEntriesSource).toContain('./featureRegistry');
    expect(ownershipSource).toContain('./featureRouteEntries');
    expect(routeMapSource).toContain('./featureRouteEntries');
    expect(routeMapSource).toContain('./featureRegistry');
    expect(modalNavigatorSource).toContain('./featureRegistry');
    expect(featureRegistrySource).not.toContain('./routeOwnership');

    expect(ownershipSource).not.toMatch(/^\s{2}\w+:\s*'[^']+'/m);
    expect(routeMapSource).not.toMatch(/const\s+(AUTH|ONBOARDING|TAB_ROOT|MODAL)_ROUTES\s*=\s*\[/);
    expect(ownershipSource).not.toContain('FEATURE_NAVIGATION_REGISTRY.flatMap');
    expect(routeMapSource).not.toContain('FEATURE_NAVIGATION_REGISTRY.flatMap');

    for (const centralSource of [ownershipSource, routeMapSource, modalNavigatorSource]) {
      for (const feature of FEATURES_WITH_ROUTES) {
        expect(centralSource).not.toContain(`@/features/${feature}/navigation`);
      }
    }
  });

  it('keeps main tab labels and icons in feature-owned tab metadata', () => {
    const mainTabNavigatorSource = readFileSync(join(root, 'src', 'navigation', 'MainTabNavigator.tsx'), 'utf8');
    const featureRegistrySource = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');

    expect(mainTabNavigatorSource).not.toContain('const TAB_ICONS');
    expect(mainTabNavigatorSource).not.toContain('name="Home"');
    expect(mainTabNavigatorSource).not.toContain('name="Devices"');
    expect(mainTabNavigatorSource).not.toContain('name="Library"');
    expect(mainTabNavigatorSource).not.toContain('name="Progress"');
    expect(mainTabNavigatorSource).not.toContain('name="Profile"');
    expect(mainTabNavigatorSource).not.toContain("= 'Home'");
    expect(mainTabNavigatorSource).toContain('MAIN_TAB_SCREENS.map');
    expect(mainTabNavigatorSource).toContain('DEFAULT_MAIN_TAB_NAME');

    expect(featureRegistrySource).toContain('tabName');
    expect(featureRegistrySource).toContain('tabIcon');
    expect(featureRegistrySource).toContain('title');
    expect(featureRegistrySource).toContain('tabOrder');
    expect(featureRegistrySource).toContain('DEFAULT_MAIN_TAB_NAME');
    expect(featureRegistrySource).not.toContain('MAIN_TAB_ORDER');
    expect(featureRegistrySource).not.toContain("['Home', 'Devices', 'Library', 'Progress', 'Profile']");

    const tabOrders = FEATURES_WITH_ROUTES.flatMap((feature) => {
      const navigationSource = readFileSync(join(root, 'src', 'features', featureDir(feature), 'navigation.ts'), 'utf8');
      return Array.from(navigationSource.matchAll(/tabOrder:\s*(\d+)/g), match => Number(match[1]));
    });
    expect([...tabOrders].sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(tabOrders).size).toBe(tabOrders.length);
    expect(MAIN_TAB_SCREENS.map(screen => screen.tabName)).toEqual(['Home', 'Devices', 'Library', 'Progress', 'Profile']);
  });

  it('keeps root stack entry routes explicit in feature-owned metadata', () => {
    const authFeatureSource = readFileSync(join(root, 'src', 'features', 'auth', 'navigation.ts'), 'utf8');
    const onboardingFeatureSource = readFileSync(join(root, 'src', 'features', 'onboarding', 'navigation.ts'), 'utf8');
    const authNavigatorSource = readFileSync(join(root, 'src', 'navigation', 'AuthNavigator.tsx'), 'utf8');
    const onboardingNavigatorSource = readFileSync(join(root, 'src', 'navigation', 'OnboardingNavigator.tsx'), 'utf8');
    const featureRegistrySource = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');

    expect(authFeatureSource).toContain('initialRoute: AUTH_ENTRY_SCREEN.name');
    expect(onboardingFeatureSource).toContain('initialRoute: ONBOARDING_ENTRY_SCREEN.name');
    expect(featureRegistrySource).not.toContain('firstStackRoute(AUTH_NAVIGATION_CONFIG)');
    expect(featureRegistrySource).not.toContain("firstStackRouteByRole(ONBOARDING_NAVIGATION_CONFIG, 'onboarding-root')");
    expect(featureRegistrySource).not.toContain("featureByOwner('auth')");
    expect(featureRegistrySource).not.toContain("featureByOwner('onboarding')");
    expect(authNavigatorSource).toContain('initialRouteName={AUTH_INITIAL_ROUTE}');
    expect(onboardingNavigatorSource).toContain('initialRouteName={ONBOARDING_INITIAL_ROUTE}');
  });

  it('keeps pending device setup route in feature-owned metadata', () => {
    const deviceFeatureSource = readFileSync(join(root, 'src', 'features', 'device', 'navigation.ts'), 'utf8');
    const featureRegistrySource = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');

    expect(deviceFeatureSource).toContain('pendingDeviceSetupRoute');
    expect(featureRegistrySource).not.toContain("featureByOwner('device')");
    expect(featureRegistrySource).not.toContain('DEVICE_NAVIGATION_CONFIG');
    expect(featureRegistrySource).not.toContain("firstStackRouteByRole(DEVICE_NAVIGATION_CONFIG, 'stack-entry')");
  });

  it('keeps feature owner metadata inside feature navigation modules', () => {
    const featureRegistrySource = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');

    for (const feature of FEATURES_WITH_ROUTES) {
      const navigationSource = readFileSync(join(root, 'src', 'features', featureDir(feature), 'navigation.ts'), 'utf8');
      const exportName = `${feature.replace(/-/g, '_').toUpperCase()}_NAVIGATION`;

      expect(navigationSource).toContain(`export const ${exportName}`);
      expect(navigationSource).toContain(`owner: '${feature}'`);
      expect(featureRegistrySource).toContain(exportName);
      expect(featureRegistrySource).not.toContain(`owner: '${feature}'`);
    }
  });

  it('keeps root branch grouping inside feature navigation modules', () => {
    const featureRegistrySource = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');
    const expectedRootBranches = new Map([
      ['auth', 'auth'],
      ['onboarding', 'onboarding'],
      ['home', 'protected'],
      ['course', 'protected'],
      ['course-library', 'protected'],
      ['purchase', 'protected'],
      ['lesson-demo', 'protected'],
      ['lesson-session', 'protected'],
      ['progress', 'protected'],
      ['parent', 'protected'],
      ['device', 'protected'],
      ['robot-mgmt', 'protected'],
      ['fallback', 'protected'],
    ]);

    for (const [feature, rootBranch] of expectedRootBranches) {
      const navigationSource = readFileSync(join(root, 'src', 'features', featureDir(feature), 'navigation.ts'), 'utf8');
      expect(navigationSource).toContain(`rootBranch: '${rootBranch}'`);
    }

    expect(featureRegistrySource).not.toContain('PROTECTED_FEATURE_OWNERS');
    expect(featureRegistrySource).not.toContain("owner !== 'auth' && owner !== 'onboarding'");
    expect(featureRegistrySource).toContain('featuresByRootBranch');
    expect(featureRegistrySource).not.toContain('FEATURE_NAVIGATION_REGISTRY.flatMap(feature => feature.modalScreens)');
  });

  it('keeps the central feature registry limited to feature navigation configs', () => {
    const featureRegistrySource = readFileSync(join(root, 'src', 'navigation', 'featureRegistry.ts'), 'utf8');
    const featureImportLines = featureRegistrySource
      .split('\n')
      .filter(line => line.startsWith('import ') && line.includes('@/features/'));

    expect(featureImportLines.length).toBe(FEATURES_WITH_ROUTES.length);
    for (const line of featureImportLines) {
      const importedNames = line.match(/\{\s*([^}]+)\s*\}/)?.[1]
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);

      expect(importedNames).toBeDefined();
      expect(importedNames).toHaveLength(1);
      expect(importedNames?.[0]).toMatch(/^[A-Z_]+_NAVIGATION$/);
    }

    expect(featureImportLines.join('\n')).not.toMatch(/_(ENTRY_SCREEN|SCREENS|TAB_SCREEN)\b/);
  });

  it('keeps home CTA targets on explicit feature entry routes', () => {
    const homeStateSource = readFileSync(join(root, 'src', 'features', 'home', 'hooks', 'useHomeState.ts'), 'utf8');
    const homeCtaTargets = Array.from(homeStateSource.matchAll(/ctaTarget:\s*ROUTES\.(\w+)/g), match => match[1]);
    const nonEntryTargets = homeCtaTargets
      .filter((target): target is keyof typeof ROUTE_MAP => target in ROUTE_MAP)
      .filter(target => !ENTRY_ROLES.has(ROUTE_MAP[target].role))
      .map(target => `${target}: ${ROUTE_MAP[target].role}`);

    expect(homeCtaTargets.length).toBeGreaterThan(0);
    expect(nonEntryTargets).toEqual([]);
  });

  it('keeps cross-feature forward navigation on explicit entry routes', () => {
    const routeByFile = screenFileToRoute();
    const parsedRoutes = new Set(routeByFile.values());

    expect(routeByFile.size).toBe(Object.keys(ROUTE_MAP).length);
    expect(Array.from(parsedRoutes).sort()).toEqual(Object.keys(ROUTE_MAP).sort());

    const featureFiles = listFiles(join(root, 'src', 'features'), file => /\.(ts|tsx)$/.test(file));
    const offenders = featureFiles.flatMap((file) => {
      const sourceRoute = routeByFile.get(normalize(file));
      if (!sourceRoute) return [];

      const sourceEntry = ROUTE_MAP[sourceRoute as keyof typeof ROUTE_MAP];
      const source = readFileSync(file, 'utf8');
      return source.split('\n').flatMap((line, index) =>
        Array.from(line.matchAll(/navigation\.navigate\((?:'([^']+)'|ROUTES\.(\w+))/g)).flatMap((match) => {
          const targetRoute = (match[1] ?? match[2]) as keyof typeof ROUTE_MAP | undefined;
          if (!targetRoute || !(targetRoute in ROUTE_MAP)) return [];

          const targetEntry = ROUTE_MAP[targetRoute];
          if (sourceEntry.feature === targetEntry.feature) return [];
          if (sourceEntry.backTarget === targetRoute) return [];
          if (ENTRY_ROLES.has(targetEntry.role)) return [];

          return [`${file.replace(`${root}/`, '')}:${index + 1} ${sourceRoute} -> ${targetRoute} (${targetEntry.role})`];
        }),
      );
    });

    expect(offenders).toEqual([]);
  });
});
