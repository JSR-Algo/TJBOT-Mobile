import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, normalize, resolve } from 'path';
import { ROUTE_MAP } from '@/navigation/routeMap';

const root = join(__dirname, '..', '..');
const featuresRoot = join(root, 'src', 'features');

type NavigationEdge = {
  sourceRoute: string;
  targetRoute: string;
  file: string;
  lineNumber: number;
};

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

function routeKeys(): ReadonlySet<string> {
  const src = readFileSync(join(root, 'src', 'navigation', 'routes.ts'), 'utf8');
  return new Set(Array.from(src.matchAll(/^\s{2}(\w+):/gm), match => match[1]));
}

function importedComponentPaths(navigationFile: string): ReadonlyMap<string, string> {
  const src = readFileSync(navigationFile, 'utf8');
  const imports = new Map<string, string>();

  for (const match of src.matchAll(/^import\s+(\w+)\s+from\s+'([^']+)';/gm)) {
    const componentName = match[1];
    const importPath = match[2];
    if (!componentName || !importPath || !importPath.startsWith('.')) continue;

    imports.set(componentName, normalize(resolve(dirname(navigationFile), `${importPath}.tsx`)));
  }

  return imports;
}

function screenFileToRoute(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  const navigationFiles = listFiles(featuresRoot, file => basename(file) === 'navigation.ts');

  for (const navigationFile of navigationFiles) {
    const imports = importedComponentPaths(navigationFile);
    const src = readFileSync(navigationFile, 'utf8');

    for (const match of src.matchAll(/\{\s*name:\s*(?:'([^']+)'|ROUTES\.(\w+))\s*,\s*component:\s*(\w+)/g)) {
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

function routeBackTarget(route: string): unknown {
  const entry = ROUTE_MAP[route as keyof typeof ROUTE_MAP];
  return Reflect.get(entry, 'backTarget');
}

function routeRole(route: string): string {
  const entry = ROUTE_MAP[route as keyof typeof ROUTE_MAP];
  return entry.role;
}

function routeForwardCycleGroup(route: string): unknown {
  const entry = ROUTE_MAP[route as keyof typeof ROUTE_MAP];
  return Reflect.get(entry, 'forwardCycleGroup');
}

function isTabExit(route: string): boolean {
  return routeRole(route) === 'tab';
}

function navigationEdges(): readonly NavigationEdge[] {
  const routes = routeKeys();
  const routeByFile = screenFileToRoute();
  const featureFiles = listFiles(featuresRoot, file => /\.(ts|tsx)$/.test(file));
  const edges: NavigationEdge[] = [];

  for (const file of featureFiles) {
    const sourceRoute = routeByFile.get(normalize(file));
    if (!sourceRoute) continue;

    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/navigation\.navigate\((?:'([^']+)'|ROUTES\.(\w+))/g)) {
        const targetRoute = match[1] ?? match[2];
        if (!targetRoute || !routes.has(targetRoute)) continue;
        if (routeBackTarget(sourceRoute) === targetRoute) continue;
        if (isTabExit(targetRoute)) continue;

        edges.push({
          sourceRoute,
          targetRoute,
          file: file.replace(`${root}/`, ''),
          lineNumber: index + 1,
        });
      }
    });
  }

  return edges;
}

function undeclaredForwardCycles(edges: readonly NavigationEdge[]): readonly string[] {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const existingTargets = adjacency.get(edge.sourceRoute) ?? [];
    adjacency.set(edge.sourceRoute, [...existingTargets, edge.targetRoute]);
  }

  const cycles = new Set<string>();

  function visit(route: string, path: readonly string[]): void {
    const targets = adjacency.get(route) ?? [];
    for (const target of targets) {
      const existingIndex = path.indexOf(target);
      if (existingIndex >= 0) {
        const cycle = [...path.slice(existingIndex), target];
        const cycleRoutes = cycle.slice(0, -1);
        const groups = cycleRoutes.map(cycleRoute => routeForwardCycleGroup(cycleRoute));
        const allowed = groups.every(group => typeof group === 'string' && group === groups[0]);
        if (!allowed) {
          cycles.add(cycle.join(' -> '));
        }
        continue;
      }
      visit(target, [...path, target]);
    }
  }

  for (const route of adjacency.keys()) {
    visit(route, [route]);
  }

  return Array.from(cycles).sort();
}

describe('no circular forward navigation', () => {
  it('maps feature navigation screen files to every route', () => {
    const routeByFile = screenFileToRoute();

    expect(routeByFile.size).toBe(Object.keys(ROUTE_MAP).length);
  });

  it('does not contain reciprocal forward edges unless routes declare a shared cycle group', () => {
    const edges = navigationEdges();
    const edgeKeys = new Set(edges.map(edge => `${edge.sourceRoute}->${edge.targetRoute}`));
    const offenders = edges
      .filter((edge) => {
        if (!edgeKeys.has(`${edge.targetRoute}->${edge.sourceRoute}`)) return false;
        const sourceCycleGroup = routeForwardCycleGroup(edge.sourceRoute);
        const targetCycleGroup = routeForwardCycleGroup(edge.targetRoute);
        return !sourceCycleGroup || sourceCycleGroup !== targetCycleGroup;
      })
      .map(edge => `${edge.file}:${edge.lineNumber} ${edge.sourceRoute} -> ${edge.targetRoute}`);

    expect(offenders).toEqual([]);
  });

  it('does not contain longer forward cycles unless every route in the cycle declares the same cycle group', () => {
    expect(undeclaredForwardCycles(navigationEdges())).toEqual([]);
  });
});
