import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { ROUTE_MAP } from '@/navigation/routeMap';

const root = join(__dirname, '..', '..');

type BranchNavigator = 'AuthNavigator' | 'OnboardingNavigator' | 'MainTabNavigator' | 'ModalNavigator';

const BRANCH_DIRS: readonly { dir: string; navigator: BranchNavigator }[] = [
  { dir: 'src/features/auth', navigator: 'AuthNavigator' },
  { dir: 'src/features/onboarding', navigator: 'OnboardingNavigator' },
];

type NavigationTarget = {
  route: string;
  index: number;
};

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

function navigationTargets(source: string): readonly NavigationTarget[] {
  return Array.from(
    source.matchAll(/navigation\.(?:navigate|replace)\((?:'([^']+)'|ROUTES\.(\w+))/g),
    match => ({
      route: match[1] ?? match[2],
      index: match.index,
    }),
  ).filter((target): target is NavigationTarget => Boolean(target.route));
}

describe('root branch navigation isolation', () => {
  it('scans route-constant navigation calls in mounted root branches', () => {
    const scannedCalls = BRANCH_DIRS.flatMap(({ dir }) =>
      listSourceFiles(join(root, dir)).flatMap(file => {
        const source = readFileSync(file, 'utf8');
        return navigationTargets(source);
      }),
    );

    expect(scannedCalls.length).toBeGreaterThan(0);
  });

  it('does not directly navigate from auth or onboarding stacks to unmounted root branches', () => {
    const offenders = BRANCH_DIRS.flatMap(({ dir, navigator }) =>
      listSourceFiles(join(root, dir)).flatMap(file => {
        const source = readFileSync(file, 'utf8');
        return navigationTargets(source)
          .filter(({ route }) => {
            const entry = ROUTE_MAP[route as keyof typeof ROUTE_MAP];
            return entry ? entry.navigator !== navigator : false;
          })
          .map(({ route, index }) => {
            const lineNumber = source.slice(0, index).split('\n').length;
            const targetNavigator = ROUTE_MAP[route as keyof typeof ROUTE_MAP].navigator;
            return `${file.replace(`${root}/`, '')}:${lineNumber}: ${navigator} -> ${targetNavigator} via ${route}`;
          });
      }),
    );

    expect(offenders).toEqual([]);
  });
});
