#!/usr/bin/env node
/* global console, process */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { buildRouteMapping, root } from './export-route-mapping.mjs';

const artifactPath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-tree.mmd');
const checkOnly = process.argv.includes('--check');

function routesBy(mapping, predicate) {
  return Object.entries(mapping.routes)
    .filter(([, entry]) => predicate(entry))
    .map(([route]) => route);
}

function routeBy(mapping, predicate) {
  const routes = routesBy(mapping, predicate);
  if (routes.length !== 1) {
    throw new Error(`Expected exactly one navigation tree route, found ${routes.length}`);
  }
  return routes[0];
}

function initialRouteFromFeature(feature) {
  const source = readFileSync(join(root, 'src', 'features', feature, 'navigation.ts'), 'utf8');
  const directMatch = source.match(/\binitialRoute:\s*ROUTES\.(\w+)/);
  if (directMatch) return directMatch[1];

  const entryNameMatch = source.match(/\binitialRoute:\s*(\w+)\.name/);
  const entryName = entryNameMatch?.[1];
  const entryBlockMatch = entryName
    ? source.match(new RegExp(`export const ${entryName} = \\{([\\s\\S]*?)\\n\\} as const;`))
    : undefined;
  const routeMatch = entryBlockMatch?.[1].match(/\bname:\s*ROUTES\.(\w+)/);
  if (!routeMatch) {
    throw new Error(`Missing initialRoute in src/features/${feature}/navigation.ts`);
  }
  return routeMatch[1];
}

function renderNavigationTree() {
  const mapping = buildRouteMapping();
  const authRoutes = routesBy(mapping, entry => entry.navigator === 'AuthNavigator');
  const onboardingRoutes = routesBy(mapping, entry => entry.navigator === 'OnboardingNavigator');
  const tabRoutes = routesBy(mapping, entry => entry.bucket === 'tabScreen');
  const protectedStackRoutes = routesBy(mapping, entry => entry.bucket === 'stackScreens' && entry.navigator === 'ModalNavigator');
  const modalRoutes = routesBy(mapping, entry => entry.bucket === 'modalScreens');
  const authInitialRoute = initialRouteFromFeature('auth');
  const onboardingInitialRoute = initialRouteFromFeature('onboarding');
  const protectedDefaultRoute = routeBy(mapping, entry => entry.bucket === 'tabScreen' && entry.feature === 'home');
  const pendingDeviceSetupRoute = routeBy(
    mapping,
    entry => entry.feature === 'device' && entry.stateMachineId === 'dv_overview',
  );
  const nodeLabel = route => `${route}<br/>${mapping.routes[route].bucket} / ${mapping.routes[route].role}`;

  const lines = [
    'flowchart TD',
    '  Boot([App launch]) --> Root[RootStackNavigator]',
    '  Root --> AuthCheck{isAuthenticated?}',
    '  AuthCheck -- no --> Auth[AuthNavigator]',
    '  AuthCheck -- yes --> OnboardingCheck{householdReady?}',
    '  OnboardingCheck -- no --> Onboarding[OnboardingNavigator]',
    '  OnboardingCheck -- yes --> Protected[ModalNavigator]',
    `  Auth --> AuthInitial[${authInitialRoute}]`,
    `  Onboarding --> OnboardingInitial[${onboardingInitialRoute}]`,
    `  Protected --> ProtectedDefault[${protectedDefaultRoute}]`,
    `  Protected --> PendingDeviceSetup[${pendingDeviceSetupRoute}]`,
    '',
    '  subgraph AuthNavigator',
    ...authRoutes.map(route => `    Auth_${route}[${nodeLabel(route)}]`),
    '  end',
    '',
    '  subgraph OnboardingNavigator',
    ...onboardingRoutes.map(route => `    Onboarding_${route}[${nodeLabel(route)}]`),
    '  end',
    '',
    '  subgraph ModalNavigator',
    '    MainTabNavigatorNode[MainTabNavigator]',
    ...tabRoutes.map(route => `    Protected_${route}[${nodeLabel(route)}] --> MainTabNavigatorNode`),
    ...protectedStackRoutes.map(route => `    Protected_${route}[${nodeLabel(route)}]`),
    ...modalRoutes.map(route => `    Modal_${route}[${nodeLabel(route)}]`),
    '  end',
  ];

  return `${lines.join('\n')}\n`;
}

const next = renderNavigationTree();

if (checkOnly) {
  const current = readFileSync(artifactPath, 'utf8');
  if (current !== next) {
    console.error(`export-navigation-tree: FAIL — ${artifactPath.replace(`${root}/`, '')} is stale`);
    process.exit(1);
  }
  console.log(`export-navigation-tree: OK — ${next.split('\n').filter(line => line.includes('[')).length} nodes checked`);
  process.exit(0);
}

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, next);
console.log(`export-navigation-tree: wrote ${basename(artifactPath)} with ${next.split('\n').filter(line => line.includes('[')).length} nodes`);
