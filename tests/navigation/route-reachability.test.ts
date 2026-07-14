import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { ROUTE_MAP } from '@/navigation/routeMap';
import { isProductionNavigableRoute } from '@/navigation/featureRegistry';
import { ROBOT_MGMT_SCREENS } from '@/features/robot-mgmt/navigation';
import { ROUTES } from '@/navigation/routes';

const root = join(__dirname, '..', '..');

const STATIC_ENTRY_ROLES = new Set([
  'auth',
  'onboarding-root',
  'tab',
  'stack-entry',
  'modal-entry',
  'state-machine',
  'fallback-entry',
]);

function listFeatureFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listFeatureFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry) && entry !== 'navigation.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

function routeKeys(): string[] {
  const src = readFileSync(join(root, 'src', 'navigation', 'routes.ts'), 'utf8');
  return Array.from(src.matchAll(/^\s{2}(\w+):/gm), match => match[1]);
}

function inboundRoutes(): ReadonlySet<string> {
  const routes = new Set(routeKeys());
  const inbound = new Set<string>();
  const files = listFeatureFiles(join(root, 'src', 'features'));
  const patterns = [
    /navigation\.(?:navigate|replace|push)\((?:'([^']+)'|ROUTES\.(\w+))/g,
    /completeOnboarding\([^)]*(?:'([^']+)'|ROUTES\.(\w+))/g,
    /\bnext=(?:"([^"]+)"|\{ROUTES\.(\w+)\})/g,
  ];

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const backOnlyRoutes = new Set(Array.from(src.matchAll(/\bprev=(?:"([^"]+)"|\{ROUTES\.(\w+)\})/g), match => match[1] ?? match[2]));

    for (const pattern of patterns) {
      for (const match of src.matchAll(pattern)) {
        const route = match[1] ?? match[2] ?? match[3];
        const beforeMatch = src.slice(Math.max(0, match.index - 40), match.index);
        const isBackHandler = beforeMatch.includes('onBack={');
        if (route && routes.has(route) && !backOnlyRoutes.has(route) && !isBackHandler) {
          inbound.add(route);
        }
      }
    }
  }

  return inbound;
}

describe('route reachability', () => {
  it('requires Parent Settings to own the inbound edge for the robot privacy screen', () => {
    const parentSettings = readFileSync(join(root, 'src', 'features', 'parent', 'screens', 'ParentSettingsScreen.tsx'), 'utf8');

    expect(ROBOT_MGMT_SCREENS.find(screen => screen.name === ROUTES.MyRobotScreen)?.role).toBe('stack-entry');
    expect(parentSettings).toMatch(/navigation\.navigate\(ROUTES\.MyRobotScreen\)/);
  });

  it('has no hidden routes without static inbound navigation or explicit entry role', () => {
    const inbound = inboundRoutes();
    const hiddenRoutes = routeKeys().filter((route) => {
      if (!isProductionNavigableRoute(route as keyof typeof ROUTE_MAP)) return false;
      if (inbound.has(route)) return false;
      const entry = ROUTE_MAP[route as keyof typeof ROUTE_MAP];
      return !STATIC_ENTRY_ROLES.has(entry.role);
    });

    expect(hiddenRoutes).toEqual([]);
  });
});
