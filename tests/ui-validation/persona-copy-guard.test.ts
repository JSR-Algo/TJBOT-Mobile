import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

const childFacingFeatureDirs = [
  'src/features/home',
  'src/features/course',
  'src/features/course-library',
  'src/features/lesson-session',
  'src/features/progress',
];

const parentOnlyRouteNames = [
  'ParentSummaryScreen',
  'ParentTodayScreen',
  'ParentHistoryScreen',
  'ParentSafetyScreen',
  'ParentSettingsScreen',
  'ParentAccountPrivacyScreen',
  'ParentLockedOutScreen',
];

const parentOnlyVisibleCopy = [
  'Parent Space',
  'parent account',
  'Account Privacy',
  'Safety & Privacy',
  'Past 30 days',
];

const parentInterventionExceptions = new Set([
  'src/features/lesson-session/screens/CostCappedScreen.tsx',
  'src/features/lesson-session/screens/ParentStoppedScreen.tsx',
]);

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe('parent/child persona copy guard', () => {
  it('keeps parent-only visible copy out of child-facing feature code', () => {
    const offenders = childFacingFeatureDirs.flatMap(dir =>
      listSourceFiles(join(root, dir)).flatMap((file) => {
        const relativeFile = file.replace(`${root}/`, '');
        if (parentInterventionExceptions.has(relativeFile)) return [];
        const source = readFileSync(file, 'utf8');
        return parentOnlyVisibleCopy
          .filter(copy => source.includes(copy))
          .map(copy => `${relativeFile}: ${copy}`);
      }),
    );

    expect(offenders).toEqual([]);
  });

  it('keeps parent-only route copy out of generated child deep-link paths', () => {
    const linkingSource = readFileSync(join(root, 'src', 'navigation', 'linking.ts'), 'utf8');

    for (const routeName of parentOnlyRouteNames) {
      expect(linkingSource).not.toContain(`child/${routeName}`);
    }
  });
});
