#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const root = join(__dirname, '..', '..');
const artifactPath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'route-mapping.json');
const checkOnly = process.argv.includes('--check');

const navigators = {
  AuthNavigator: 'unauthenticated auth routes',
  OnboardingNavigator: 'authenticated setup routes before protected app',
  MainTabNavigator: 'protected five-tab daily UX host',
  ModalNavigator: 'protected stack routes plus modal group and tab hosts',
};

function routeKeys() {
  const source = readFileSync(join(root, 'src', 'navigation', 'routes.ts'), 'utf8');
  return Array.from(source.matchAll(/^\s{2}(\w+):/gm), match => match[1]);
}

function featureNavigationFiles() {
  const featuresDir = join(root, 'src', 'features');
  return readdirSync(featuresDir)
    .map(feature => ({
      owner: feature,
      path: join(featuresDir, feature, 'navigation.ts'),
    }))
    .filter(entry => existsSync(entry.path));
}

function parseRouteEntry(owner, bucket, block) {
  const route = block.match(/\bname:\s*ROUTES\.(\w+)/)?.[1];
  const role = block.match(/\brole:\s*'([^']+)'/)?.[1];
  if (!route || !role) return null;

  const backTarget = block.match(/\bbackTarget:\s*ROUTES\.(\w+)/)?.[1];
  const forwardCycleGroup = block.match(/\bforwardCycleGroup:\s*'([^']+)'/)?.[1];
  const stateMachineId = block.match(/\bstateMachineId:\s*'([^']+)'/)?.[1];
  const stateMachineIdsBlock = block.match(/\bstateMachineIds:\s*\[([\s\S]*?)\]/)?.[1];
  const stateMachineIds = stateMachineIdsBlock
    ? Array.from(stateMachineIdsBlock.matchAll(/'([^']+)'/g), match => match[1])
    : undefined;

  return {
    route,
    owner,
    bucket,
    role,
    productionVisible:
      !block.includes('productionVisible: false')
      && !/\.\.\.HIDDEN_[A-Z_]+_ROUTE/.test(block)
      && !block.includes('...MVP_SCOPE_HIDDEN'),
    backTarget,
    forwardCycleGroup,
    stateMachineId,
    stateMachineIds,
  };
}

function parseObjectExports(owner, source) {
  return Array.from(source.matchAll(/export const (\w+) = \{([\s\S]*?)\n\} as const;/g))
    .filter(([name]) => name.includes('TAB_SCREEN') || name.includes('ENTRY_SCREEN'))
    .flatMap(([, name, body]) => {
      const bucket = name.includes('TAB_SCREEN') ? 'tabScreen' : 'stackScreens';
      const entry = parseRouteEntry(owner, bucket, body);
      return entry ? [entry] : [];
    });
}

function parseScreenArrays(owner, source) {
  return Array.from(source.matchAll(/export const (\w+) = defineFeatureScreens\(\[([\s\S]*?)\]\);/g))
    .flatMap(([, name, body]) => {
      const bucket = name.includes('MODAL') ? 'modalScreens' : 'stackScreens';
      return Array.from(body.matchAll(/\{([^{}]*\bname:\s*ROUTES\.\w+[^{}]*)\}/g))
        .flatMap(([, block]) => {
          const entry = parseRouteEntry(owner, bucket, block);
          return entry ? [entry] : [];
        });
    });
}

function featureEntriesByRoute() {
  const entries = new Map();
  for (const { owner, path } of featureNavigationFiles()) {
    const source = readFileSync(path, 'utf8');
    const rootBranch = source.match(/\brootBranch:\s*'([^']+)'/)?.[1];
    if (!rootBranch) {
      throw new Error(`Missing rootBranch in ${path.replace(`${root}/`, '')}`);
    }
    for (const entry of [...parseObjectExports(owner, source), ...parseScreenArrays(owner, source)]) {
      if (!entries.has(entry.route)) {
        entries.set(entry.route, { ...entry, rootBranch });
      }
    }
  }
  return entries;
}

function navigatorFor(entry) {
  if (entry.owner === 'auth') return 'AuthNavigator';
  if (entry.owner === 'onboarding') return 'OnboardingNavigator';
  if (entry.bucket === 'tabScreen') return 'MainTabNavigator';
  return 'ModalNavigator';
}

function backBehaviorFor(entry) {
  if (entry.owner === 'auth') return 'blocked-auth';
  if (entry.owner === 'onboarding') return 'linear-onboarding';
  if (entry.bucket === 'tabScreen') return 'tab-root';
  if (entry.bucket === 'modalScreens') return entry.backTarget ? 'modal-stack-back' : 'modal-dismiss';
  return 'stack-back';
}

function slugRouteName(route) {
  return route
    .replace(/Screen$/, '')
    .replace(/Overlay$/, '-overlay')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function deepLinkPathFor(entry) {
  return `${entry.owner}/${slugRouteName(entry.route)}`;
}

function existingGeneratedDate() {
  if (!existsSync(artifactPath)) return undefined;
  return JSON.parse(readFileSync(artifactPath, 'utf8')).generated;
}

function generatedDate() {
  return process.env.TBOT_NAV_GENERATED_DATE ?? existingGeneratedDate() ?? new Date().toISOString().slice(0, 10);
}

export function buildRouteMapping() {
  const entries = featureEntriesByRoute();
  const routes = {};

  for (const route of routeKeys()) {
    const entry = entries.get(route);
    if (!entry) {
      throw new Error(`Missing feature navigation entry for ${route}`);
    }

    routes[route] = {
      feature: entry.owner,
      rootBranch: entry.rootBranch,
      navigator: navigatorFor(entry),
      bucket: entry.bucket,
      role: entry.role,
      backBehavior: backBehaviorFor(entry),
    };
    if (!entry.productionVisible) routes[route].productionVisible = false;
    if (entry.productionVisible) routes[route].deepLinkPath = deepLinkPathFor(entry);
    if (entry.backTarget) routes[route].backTarget = entry.backTarget;
    if (entry.forwardCycleGroup) routes[route].forwardCycleGroup = entry.forwardCycleGroup;
    if (entry.stateMachineId) routes[route].stateMachineId = entry.stateMachineId;
    if (entry.stateMachineIds) routes[route].stateMachineIds = entry.stateMachineIds;
  }

  return {
    generated: generatedDate(),
    routeCount: Object.keys(routes).length,
    navigators,
    routes,
  };
}

function run() {
  const next = `${JSON.stringify(buildRouteMapping(), null, 2)}\n`;

  if (checkOnly) {
    const current = readFileSync(artifactPath, 'utf8');
    if (current !== next) {
      console.error(`export-route-mapping: FAIL — ${artifactPath.replace(`${root}/`, '')} is stale`);
      process.exit(1);
    }
    console.info(`export-route-mapping: OK — ${Object.keys(JSON.parse(next).routes).length} routes checked`);
    process.exit(0);
  }

  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, next);
  console.info(`export-route-mapping: wrote ${basename(artifactPath)} with ${Object.keys(JSON.parse(next).routes).length} routes`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
