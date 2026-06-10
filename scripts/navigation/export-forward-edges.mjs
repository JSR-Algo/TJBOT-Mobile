#!/usr/bin/env node
/* global console, process */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, join, normalize, resolve } from 'path';
import { fileURLToPath } from 'url';
import { buildRouteMapping, root } from './export-route-mapping.mjs';

const artifactPath = join(root, 'migrate-ui-ux-to-mobile-app-docs', 'architecture', 'navigation-forward-edges.json');
const checkOnly = process.argv.includes('--check');
const featuresRoot = join(root, 'src', 'features');
const staticEntryRoles = new Set([
  'auth',
  'onboarding-root',
  'tab',
  'stack-entry',
  'modal-entry',
  'state-machine',
  'fallback-entry',
]);

function listFiles(dir, predicate) {
  const entries = readdirSync(dir);
  const files = [];
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

function importedComponentPaths(navigationFile) {
  const source = readFileSync(navigationFile, 'utf8');
  const imports = new Map();
  for (const match of source.matchAll(/^import\s+(\w+)\s+from\s+'([^']+)';/gm)) {
    const componentName = match[1];
    const importPath = match[2];
    if (!componentName || !importPath || !importPath.startsWith('.')) continue;
    imports.set(componentName, normalize(resolve(dirname(navigationFile), `${importPath}.tsx`)));
  }
  return imports;
}

function screenFileToRoute() {
  const map = new Map();
  const navigationFiles = listFiles(featuresRoot, file => basename(file) === 'navigation.ts');
  for (const navigationFile of navigationFiles) {
    const imports = importedComponentPaths(navigationFile);
    const source = readFileSync(navigationFile, 'utf8');
    for (const match of source.matchAll(/\{\s*name:\s*(?:'([^']+)'|ROUTES\.(\w+))\s*,\s*component:\s*(\w+)/g)) {
      const routeName = match[1] ?? match[2];
      const componentName = match[3];
      if (!routeName || !componentName) continue;
      const componentPath = imports.get(componentName);
      if (componentPath) {
        map.set(componentPath, routeName);
      }
    }
  }
  return map;
}

function isTabExit(mapping, route) {
  return mapping.routes[route]?.role === 'tab';
}

function staticForwardEdges(mapping) {
  const routes = new Set(Object.keys(mapping.routes));
  const routeByFile = screenFileToRoute();
  const featureFiles = listFiles(featuresRoot, file => /\.(ts|tsx)$/.test(file));
  const edges = [];
  const patterns = [
    /navigation\.(?:navigate|replace|push)\((?:'([^']+)'|ROUTES\.(\w+))/g,
    /completeOnboarding\([^)]*(?:'([^']+)'|ROUTES\.(\w+))/g,
    /\bnext=(?:"([^"]+)"|\{ROUTES\.(\w+)\})/g,
  ];

  for (const file of featureFiles) {
    const sourceRoute = routeByFile.get(normalize(file));
    if (!sourceRoute) continue;
    const source = readFileSync(file, 'utf8');
    const backOnlyRoutes = new Set(Array.from(source.matchAll(/\bprev=(?:"([^"]+)"|\{ROUTES\.(\w+)\})/g), match => match[1] ?? match[2]));
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        for (const match of line.matchAll(pattern)) {
          const targetRoute = match[1] ?? match[2] ?? match[3];
          if (!targetRoute || !routes.has(targetRoute)) continue;
          if (mapping.routes[sourceRoute]?.backTarget === targetRoute) continue;
          if (backOnlyRoutes.has(targetRoute)) continue;
          if (isTabExit(mapping, targetRoute)) continue;
          const beforeMatch = line.slice(Math.max(0, (match.index ?? 0) - 40), match.index);
          if (beforeMatch.includes('onBack={')) continue;
          edges.push({
            sourceRoute,
            targetRoute,
            sourceFeature: mapping.routes[sourceRoute].feature,
            targetFeature: mapping.routes[targetRoute].feature,
            file: file.replace(`${root}/`, ''),
            lineNumber: index + 1,
          });
        }
      }
    });
  }

  return edges.sort((left, right) =>
    `${left.sourceRoute}->${left.targetRoute}:${left.file}:${left.lineNumber}`
      .localeCompare(`${right.sourceRoute}->${right.targetRoute}:${right.file}:${right.lineNumber}`),
  );
}

function reciprocalCycleViolations(mapping, edges) {
  const edgeKeys = new Set(edges.map(edge => `${edge.sourceRoute}->${edge.targetRoute}`));
  return edges
    .filter((edge) => {
      if (!edgeKeys.has(`${edge.targetRoute}->${edge.sourceRoute}`)) return false;
      const sourceCycleGroup = mapping.routes[edge.sourceRoute].forwardCycleGroup;
      const targetCycleGroup = mapping.routes[edge.targetRoute].forwardCycleGroup;
      return !sourceCycleGroup || sourceCycleGroup !== targetCycleGroup;
    })
    .map(edge => `${edge.file}:${edge.lineNumber} ${edge.sourceRoute} -> ${edge.targetRoute}`)
    .sort();
}

function crossFeatureInteriorViolations(mapping, edges) {
  return edges
    .filter((edge) => {
      const sourceEntry = mapping.routes[edge.sourceRoute];
      const targetEntry = mapping.routes[edge.targetRoute];
      if (sourceEntry.feature === targetEntry.feature) return false;
      if (sourceEntry.backTarget === edge.targetRoute) return false;
      return !staticEntryRoles.has(targetEntry.role);
    })
    .map(edge => `${edge.file}:${edge.lineNumber} ${edge.sourceRoute} -> ${edge.targetRoute} (${mapping.routes[edge.targetRoute].role})`)
    .sort();
}

function hiddenRoutes(mapping, edges) {
  const inbound = new Set(edges.map(edge => edge.targetRoute));
  return Object.entries(mapping.routes)
    .filter(([route, entry]) => !inbound.has(route) && !staticEntryRoles.has(entry.role))
    .map(([route]) => route)
    .sort();
}

function existingGeneratedDate() {
  if (!existsSync(artifactPath)) return undefined;
  return JSON.parse(readFileSync(artifactPath, 'utf8')).generated;
}

function generatedDate() {
  return process.env.TBOT_NAV_GENERATED_DATE ?? existingGeneratedDate() ?? new Date().toISOString().slice(0, 10);
}

export function buildForwardEdges() {
  const mapping = buildRouteMapping();
  const edges = staticForwardEdges(mapping);
  return {
    generated: generatedDate(),
    edgeCount: edges.length,
    source: 'src/features/**/*.{ts,tsx}',
    routeSource: 'src/features/*/navigation.ts',
    forwardEdges: edges,
    reciprocalCycleViolations: reciprocalCycleViolations(mapping, edges),
    crossFeatureInteriorViolations: crossFeatureInteriorViolations(mapping, edges),
    hiddenRoutes: hiddenRoutes(mapping, edges),
  };
}

function run() {
  const next = `${JSON.stringify(buildForwardEdges(), null, 2)}\n`;
  if (checkOnly) {
    const current = readFileSync(artifactPath, 'utf8');
    if (current !== next) {
      console.error(`export-forward-edges: FAIL — ${artifactPath.replace(`${root}/`, '')} is stale`);
      process.exit(1);
    }
    const parsed = JSON.parse(next);
    console.log(`export-forward-edges: OK — ${parsed.edgeCount} forward edges checked`);
    process.exit(0);
  }

  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, next);
  console.log(`export-forward-edges: wrote ${basename(artifactPath)} with ${JSON.parse(next).edgeCount} forward edges`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
