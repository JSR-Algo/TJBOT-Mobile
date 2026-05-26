import { readFileSync } from 'fs';
import { join } from 'path';
import { ROUTE_OWNER_ENTRIES, ROUTE_OWNERS } from '@/navigation/routeOwnership';

const root = join(__dirname, '..', '..');

function routeKeys(): string[] {
  const src = readFileSync(join(root, 'src', 'navigation', 'routes.ts'), 'utf8');
  return Array.from(src.matchAll(/^\s{2}(\w+):/gm), (match) => match[1]);
}

describe('route ownership', () => {
  it('assigns every route to exactly one src/features owner', () => {
    const keys = routeKeys();
    const owners = Object.keys(ROUTE_OWNERS);

    expect(owners.sort()).toEqual(keys.sort());
    expect(new Set(Object.values(ROUTE_OWNERS))).toEqual(
      new Set([
        'auth',
        'onboarding',
        'home',
        'course',
        'course-library',
        'purchase',
        'lesson-session',
        'progress',
        'parent',
        'device',
        'robot-mgmt',
        'fallback',
      ]),
    );
  });

  it('keeps raw route ownership entries duplicate-free before object materialization', () => {
    const ownersByRoute = new Map<string, string[]>();
    for (const [route, owner] of ROUTE_OWNER_ENTRIES) {
      const existingOwners = ownersByRoute.get(route) ?? [];
      ownersByRoute.set(route, [...existingOwners, owner]);
    }

    const duplicateEntries = Array.from(ownersByRoute.entries())
      .filter(([, owners]) => owners.length > 1)
      .map(([route, owners]) => `${route}:${owners.join(',')}`);

    expect(duplicateEntries).toEqual([]);
    expect(ROUTE_OWNER_ENTRIES).toHaveLength(routeKeys().length);
  });
});
