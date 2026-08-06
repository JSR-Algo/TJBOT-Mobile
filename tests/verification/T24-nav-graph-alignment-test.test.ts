import fs from 'fs';
import path from 'path';
import { ROUTE_MAP } from '@/navigation/routeMap';

const root = path.resolve(__dirname, '../..');
const featuresDir = path.join(root, 'src', 'features');
const navGraphPath = path.join(root, 'nav-graph-data.json');

const FEATURE_DIRS = [
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
];

type NavigationRegistration = {
  stateId: string;
  routeName: string;
  screenFilePath: string;
  featureOwner: string;
  featureDir: string;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function toRelativeRoot(absolutePath: string): string {
  return path.relative(root, absolutePath).replace(/\\/g, '/');
}

function parseImports(content: string): Record<string, string> {
  const imports: Record<string, string> = {};
  const regex = /import\s+(\w+)\s+from\s+'([^']+)';/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports[match[1]] = match[2];
  }
  return imports;
}

function parseStateMachineIds(block: string): string[] {
  const singleMatch = block.match(/stateMachineId:\s*'([^']+)'/);
  if (singleMatch) {
    return [singleMatch[1]];
  }
  const multiMatch = block.match(/stateMachineIds:\s*\[([^\]]*)\]/);
  if (multiMatch) {
    return multiMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/'/g, ''))
      .filter(Boolean);
  }
  return [];
}

function collectNavigationRegistrations(): NavigationRegistration[] {
  const registrations: NavigationRegistration[] = [];

  for (const featureDir of FEATURE_DIRS) {
    const navPath = path.join(featuresDir, featureDir, 'navigation.ts');
    if (!fs.existsSync(navPath)) {
      continue;
    }

    const content = fs.readFileSync(navPath, 'utf8');
    const imports = parseImports(content);
    const ownerMatch = content.match(/owner:\s*'([^']+)'/);
    const featureOwner = ownerMatch ? ownerMatch[1] : featureDir;

    // Match each screen block that has name: ROUTES.XXX, component: YYY, and stateMachineId(s).
    const blockRegex =
      /\{\s*name:\s*ROUTES\.(\w+),\s*component:\s*(\w+)[^}]*?stateMachineIds?:\s*(?:'[^']+'|\[[^\]]*\])[^}]*?\}/g;
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
      const routeName = match[1];
      const componentName = match[2];
      const importPath = imports[componentName];
      if (!importPath) {
        continue;
      }

      const stateIds = parseStateMachineIds(match[0]);
      const fullImportPath = path.join(featuresDir, featureDir, importPath);
      const screenFilePath = toRelativeRoot(
        fullImportPath + (importPath.endsWith('.tsx') ? '' : '.tsx'),
      );

      for (const stateId of stateIds) {
        registrations.push({
          stateId,
          routeName,
          screenFilePath,
          featureOwner,
          featureDir,
        });
      }
    }
  }

  return registrations;
}

function collectStatesTsIds(): Map<string, string> {
  const ids = new Map<string, string>();
  for (const featureDir of FEATURE_DIRS) {
    const statesPath = path.join(featuresDir, featureDir, 'states.ts');
    if (!fs.existsSync(statesPath)) {
      continue;
    }
    const content = fs.readFileSync(statesPath, 'utf8');
    const regex = /\{\s*id:\s*'([^']+)'/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      ids.set(match[1], featureDir);
    }
  }
  return ids;
}

describe('T24: nav-graph-data.json alignment', () => {
  const navGraph = readJson<{
    states: Record<string, { f: string; title: string; g: string; kind?: string }>;
    edges: unknown[];
    meta?: { retired?: boolean };
  }>(navGraphPath);

  const registrations = collectNavigationRegistrations();
  const navRegistrationsByStateId = new Map<string, NavigationRegistration>();
  for (const registration of registrations) {
    navRegistrationsByStateId.set(registration.stateId, registration);
  }

  const statesTsIds = collectStatesTsIds();

  it('maps every nav-graph state to the same screen file recorded in feature navigation.ts', () => {
    const mismatches: string[] = [];

    for (const [stateId, entry] of Object.entries(navGraph.states)) {
      const registration = navRegistrationsByStateId.get(stateId);
      if (!registration) {
        mismatches.push(`${stateId}: no feature navigation.ts declares this stateMachineId`);
        continue;
      }

      if (registration.screenFilePath !== entry.f) {
        mismatches.push(
          `${stateId}: expected ${registration.screenFilePath}, found ${entry.f}`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('maps every nav-graph state to a route registered in ROUTE_MAP', () => {
    const mismatches: string[] = [];

    for (const stateId of Object.keys(navGraph.states)) {
      const registration = navRegistrationsByStateId.get(stateId);
      if (!registration) {
        continue;
      }

      const routeMapEntry = ROUTE_MAP[registration.routeName as keyof typeof ROUTE_MAP];
      if (!routeMapEntry) {
        mismatches.push(`${stateId}: route ${registration.routeName} is missing from ROUTE_MAP`);
        continue;
      }

      if (routeMapEntry.feature !== registration.featureOwner) {
        mismatches.push(
          `${stateId}: route ${registration.routeName} owner mismatch (ROUTE_MAP=${routeMapEntry.feature}, navigation.ts=${registration.featureOwner})`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('has no orphaned entries in nav-graph-data.json, feature states.ts, or feature navigation.ts', () => {
    const navGraphStateIds = new Set(Object.keys(navGraph.states));
    const orphaned: string[] = [];

    // nav-graph states that no feature file claims.
    for (const stateId of navGraphStateIds) {
      if (!navRegistrationsByStateId.has(stateId) && !statesTsIds.has(stateId)) {
        orphaned.push(`${stateId}: in nav-graph-data.json but not in any feature states.ts/navigation.ts`);
      }
    }

    // Feature states.ts entries that are not in nav-graph-data.json.
    for (const [stateId, featureDir] of statesTsIds.entries()) {
      if (!navGraphStateIds.has(stateId)) {
        orphaned.push(`${stateId}: in src/features/${featureDir}/states.ts but not in nav-graph-data.json`);
      }
    }

    // Feature navigation.ts stateMachineId registrations that are not in nav-graph-data.json.
    for (const registration of registrations) {
      if (!navGraphStateIds.has(registration.stateId)) {
        orphaned.push(
          `${registration.stateId}: in src/features/${registration.featureDir}/navigation.ts (route=${registration.routeName}) but not in nav-graph-data.json`,
        );
      }
    }

    expect(orphaned).toEqual([]);
  });

  it('populates edges from actual navigators or documents retirement in meta.retired', () => {
    const hasEdges = Array.isArray(navGraph.edges) && navGraph.edges.length > 0;
    const isRetired = navGraph.meta?.retired === true;
    expect(hasEdges || isRetired).toBe(true);
  });
});
