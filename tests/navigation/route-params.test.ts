import { readFileSync } from 'fs';
import { join } from 'path';
import { ROUTES } from '@/navigation/routes';

const root = join(__dirname, '..', '..');

type RouteParamShape = 'none' | 'optional-object' | 'invalid';

function routeParamDeclarations(): ReadonlyMap<string, RouteParamShape> {
  const source = readFileSync(join(root, 'src', 'navigation', 'routes.ts'), 'utf8');
  const block = source.match(/export type RootStackParamList = \{([\s\S]*?)\n\};/);
  expect(block).not.toBeNull();

  const declarations = new Map<string, RouteParamShape>();
  const routeNames: ReadonlySet<string> = new Set(Object.values(ROUTES));
  const lines = block?.[1].split('\n') ?? [];
  for (let index = 0; index < lines.length; index += 1) {
    const routeMatch = lines[index].match(/^\s{2}'?(\w+)'?:\s*(.*)$/);
    const route = routeMatch?.[1];
    if (!route || !routeNames.has(route)) continue;

    const paramLines = [routeMatch[2] ?? ''];
    let cursor = index + 1;
    while (!paramLines.join('\n').trim().endsWith(';') && cursor < lines.length && !lines[cursor].match(/^\s{2}'?\w+'?:/)) {
      paramLines.push(lines[cursor]);
      cursor += 1;
    }
    const params = paramLines.join('\n').trim().replace(/;\s*$/, '');
    if (params === 'undefined') {
      declarations.set(route, 'none');
    } else if (/^undefined\s*\|\s*\{[\s\S]*\}$/.test(params)) {
      declarations.set(route, 'optional-object');
    } else {
      declarations.set(route, 'invalid');
    }
  }

  return declarations;
}

describe('route params', () => {
  it('declares explicit params for every route constant', () => {
    const declarations = routeParamDeclarations();
    const routeNames = Object.values(ROUTES);

    expect(Array.from(declarations.keys()).sort()).toEqual([...routeNames].sort());
  });

  it('uses either no params or optional object params for current navigable routes', () => {
    const invalidParamDeclarations = Array.from(routeParamDeclarations().entries())
      .filter(([, shape]) => shape !== 'none' && shape !== 'optional-object')
      .map(([route, shape]) => `${route}:${shape}`);

    expect(invalidParamDeclarations).toEqual([]);
  });

  it('keeps known route params attached to routes that consume identifiers', () => {
    const declarations = routeParamDeclarations();

    expect(declarations.get(ROUTES.CourseScreen)).toBe('optional-object');
    expect(declarations.get(ROUTES.CourseDetailScreen)).toBe('optional-object');
    expect(declarations.get(ROUTES.OrderConfirmScreen)).toBe('optional-object');
    expect(declarations.get(ROUTES.PairWifiPasswordScreen)).toBe('optional-object');
    expect(declarations.get(ROUTES.DeviceOverviewScreen)).toBe('optional-object');
    expect(declarations.get(ROUTES.LessonSummaryScreen)).toBe('optional-object');
  });
});
