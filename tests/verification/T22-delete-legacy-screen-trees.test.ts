import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const srcDir = path.join(root, 'src');

function* walk(dir: string, extensions: string[]): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full, extensions);
    } else if (
      entry.isFile() &&
      extensions.some((ext) => entry.name.endsWith(ext))
    ) {
      yield full;
    }
  }
}

describe('T22: Legacy screen trees and phantom aliases are still present', () => {
  it('leaves legacy screen files on disk', () => {
    const legacyFiles = [
      'src/screens/dashboard/ParentDashboardScreen.tsx',
      'src/screens/learning/ChildPracticeScreen.tsx',
      'src/screens/learning/LessonPlannerScreen.tsx',
    ];

    for (const rel of legacyFiles) {
      const full = path.join(root, rel);
      expect(fs.existsSync(full)).toBe(true);
    }
  });

  it('exports LearningStackParamList and LearningScreenProps from src/navigation/types.ts', () => {
    const typesPath = path.join(srcDir, 'navigation', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');

    expect(content).toContain('LearningStackParamList');
    expect(content).toContain('LearningScreenProps');
  });

  it('has production source references to the legacy symbols', () => {
    const legacySymbols = [
      'ParentDashboardScreen',
      'ChildPracticeScreen',
      'LessonPlannerScreen',
      'LearningStackParamList',
      'LearningScreenProps',
    ];

    const found: string[] = [];

    for (const filePath of walk(srcDir, ['.ts', '.tsx'])) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const symbol of legacySymbols) {
        if (content.includes(symbol)) {
          found.push(`${path.relative(root, filePath)} references legacy symbol "${symbol}"`);
        }
      }
    }

    expect(found.length).toBeGreaterThan(0);
  });

  it('keeps the obsolete unit test that imported the legacy screen', () => {
    const obsoleteTest = path.join(
      root,
      'tests/screens/LessonPlannerScreen.test.tsx',
    );
    expect(fs.existsSync(obsoleteTest)).toBe(true);
  });
});
