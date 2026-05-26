import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, normalize, resolve } from 'path';
import { ROUTES } from '@/navigation/routes';

const root = join(__dirname, '..', '..');

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function listNavigationFiles(dir: string): string[] {
  return listSourceFiles(dir).filter(file => basename(file) === 'navigation.ts');
}

function listTestFiles(dir: string): string[] {
  return listSourceFiles(dir).filter(file => /\.(test|spec)\.(ts|tsx)$/.test(basename(file)));
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

function registeredRouteByScreenFile(): ReadonlyMap<string, string> {
  const routes = new Map<string, string>();

  for (const navigationFile of listNavigationFiles(join(root, 'src', 'features'))) {
    const imports = importedComponentPaths(navigationFile);
    const src = readFileSync(navigationFile, 'utf8');

    for (const match of src.matchAll(/\{\s*name:\s*ROUTES\.(\w+)\s*,\s*component:\s*(\w+)/g)) {
      const routeName = match[1];
      const componentName = match[2];
      const componentPath = imports.get(componentName);
      if (routeName && componentPath) {
        routes.set(componentPath, routeName);
      }
    }
  }

  return routes;
}

describe('type-safe feature navigation', () => {
  it('does not suppress route type errors in feature navigation calls', () => {
    const featureFiles = listSourceFiles(join(root, 'src', 'features'));
    const offenders = featureFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => /navigation\.navigate\([^\n]*\bas any\b/.test(line))
        .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('uses route constants for production screen navigation calls', () => {
    const featureFiles = listSourceFiles(join(root, 'src', 'features'));
    const offenders = featureFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => /\bnavigation\.navigate\(\s*['"][A-Z]\w+Screen['"]/.test(line))
        .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('does not hide production navigation targets behind route variables', () => {
    const allowedVariableTargets = new Set(['prev', 'next']);
    const featureFiles = listSourceFiles(join(root, 'src', 'features'));
    const offenders = featureFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      const routeConstantVariables = new Set(
        Array.from(source.matchAll(/\bconst\s+(\w+)\s*=\s*ROUTES\.\w+;/g), match => match[1]),
      );
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .flatMap(({ line, lineNumber }) => {
          const matches = Array.from(line.matchAll(/navigation\.(?:navigate|replace|push)\(([^),]+)/g));
          return matches.flatMap((match) => {
            const target = match[1]?.trim();
            if (!target || target.startsWith('ROUTES.') || target.startsWith("'") || target.startsWith('"')) return [];
            if (file.endsWith('src/features/onboarding/components/IntroFrame.tsx') && allowedVariableTargets.has(target)) return [];
            if (routeConstantVariables.has(target)) return [];
            return [`${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`];
          });
        });
    });

    expect(offenders).toEqual([]);
  });

  it('uses route constants for protected post-onboarding entry targets', () => {
    const featureFiles = listSourceFiles(join(root, 'src', 'features'));
    const offenders = featureFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => /\bcompleteOnboarding\([^)]*['"][A-Z]\w+Screen['"]/.test(line))
        .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('uses route constants for feature navigation metadata routes', () => {
    const navigationFiles = listNavigationFiles(join(root, 'src', 'features'));
    const offenders = navigationFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => /\b(?:name|backTarget):\s*['"]/.test(line))
        .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('uses route constants for feature-owned navigation target data', () => {
    const featureFiles = listSourceFiles(join(root, 'src', 'features'));
    const offenders = featureFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => /['"][A-Z]\w+(?:Screen|Overlay)['"]/.test(line))
        .filter(({ line }) => !line.includes('NativeStackScreenProps<RootStackParamList'))
        .filter(({ line }) => !line.includes('RootStackParamList['))
        .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('uses route constants in e2e navigation assertions and route mocks', () => {
    const testFiles = listTestFiles(join(root, 'tests', 'e2e'));
    const offenders = testFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => /(?:toHaveBeenCalledWith|mockRoute|name:)\([^)]*['"][A-Z]\w+(?:Screen|Overlay)['"]|name:\s*['"][A-Z]\w+Screen['"]|toHaveBeenCalledWith\([^)]*['"][A-Z]\w+(?:Screen|Overlay)['"]/.test(line))
        .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('uses route constants in navigation architecture tests', () => {
    const routeValues: ReadonlySet<string> = new Set(Object.values(ROUTES));
    const testFiles = listTestFiles(join(root, 'tests', 'navigation'));
    const offenders = testFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .flatMap(({ line, lineNumber }) =>
          Array.from(line.matchAll(/['"]([A-Z]\w+(?:Screen|Overlay))['"]/g)).flatMap((match) => {
            const routeName = match[1];
            if (!routeName || !routeValues.has(routeName)) return [];
            return [`${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`];
          }),
        );
    });

    expect(offenders).toEqual([]);
  });

  it('types every registered feature screen with its exact route name', () => {
    const routeByScreenFile = registeredRouteByScreenFile();
    const offenders = Array.from(routeByScreenFile.entries()).flatMap(([file, routeName]) => {
      const source = readFileSync(file, 'utf8');
      const routePropType = source.match(/NativeStackScreenProps<RootStackParamList,\s*'([^']+)'>/);
      const declaredRoute = routePropType?.[1];

      if (declaredRoute === routeName) return [];
      return [`${file.replace(`${root}/`, '')}: expected ${routeName}, got ${declaredRoute ?? 'missing NativeStackScreenProps'}`];
    });

    expect(offenders).toEqual([]);
  });
});
