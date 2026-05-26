import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, normalize, resolve } from 'path';
import { ROUTE_MAP } from '@/navigation/routeMap';

const root = join(__dirname, '..', '..');
const featuresRoot = join(root, 'src', 'features');

type BackLink = {
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

function customBackLinks(): readonly BackLink[] {
  const routeNames = routeKeys();
  const routeByFile = screenFileToRoute();
  const featureFiles = listFiles(featuresRoot, file => /\.(ts|tsx)$/.test(file));
  const links: BackLink[] = [];

  for (const file of featureFiles) {
    const sourceRoute = routeByFile.get(normalize(file));
    if (!sourceRoute) continue;

    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, index) => {
      const match = line.match(/onBack=\{\(\) => navigation\.navigate\((?:'([^']+)'|ROUTES\.(\w+))\)\}/);
      const targetRoute = match?.[1] ?? match?.[2];
      if (targetRoute && routeNames.has(targetRoute)) {
        links.push({
          sourceRoute,
          targetRoute,
          file: file.replace(`${root}/`, ''),
          lineNumber: index + 1,
        });
      }

      const prevMatch = line.match(/\bprev=(?:"([^"]+)"|\{ROUTES\.(\w+)\})/);
      const declarativeBackTarget = prevMatch?.[1] ?? prevMatch?.[2];
      if (declarativeBackTarget && routeNames.has(declarativeBackTarget)) {
        links.push({
          sourceRoute,
          targetRoute: declarativeBackTarget,
          file: file.replace(`${root}/`, ''),
          lineNumber: index + 1,
        });
      }
    });
  }

  return links;
}

function routeBackTarget(route: string): unknown {
  const entry = ROUTE_MAP[route as keyof typeof ROUTE_MAP];
  return Reflect.get(entry, 'backTarget');
}

describe('back stack consistency', () => {
  it('maps feature navigation screen files to every route', () => {
    const routeByFile = screenFileToRoute();

    expect(routeByFile.size).toBe(Object.keys(ROUTE_MAP).length);
  });

  it('declares custom back targets in feature-owned route metadata', () => {
    const missingMetadata = customBackLinks()
      .map((link) => ({
        ...link,
        declaredBackTarget: routeBackTarget(link.sourceRoute),
      }))
      .filter(link => link.declaredBackTarget !== link.targetRoute)
      .map(link => `${link.file}:${link.lineNumber} ${link.sourceRoute} -> ${link.targetRoute} (metadata: ${String(link.declaredBackTarget)})`);

    expect(missingMetadata).toEqual([]);
  });
});
