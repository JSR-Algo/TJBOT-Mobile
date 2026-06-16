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

describe('T22: delete legacy screen trees and phantom aliases', () => {
  it('does not leave legacy screen files on disk', () => {
    const legacyFiles = [
      'src/screens/dashboard/ParentDashboardScreen.tsx',
      'src/screens/learning/ChildPracticeScreen.tsx',
      'src/screens/learning/LessonPlannerScreen.tsx',
      'src/app/screens/SpeakScreen.tsx',
      'src/app/screens/ListenScreen.tsx',
      'src/app/screens/DevicePairWifiScreen.tsx',
    ];

    for (const rel of legacyFiles) {
      const full = path.join(root, rel);
      expect(fs.existsSync(full)).toBe(false);
    }
  });

  it('does not leave the src/app/screens directory', () => {
    expect(fs.existsSync(path.join(srcDir, 'app', 'screens'))).toBe(false);
  });

  it('does not export legacy param-list or screen-props types from src/navigation/types.ts', () => {
    const typesPath = path.join(srcDir, 'navigation', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');

    expect(content).not.toContain('LegacyMainStackParamList');
    expect(content).not.toContain('MainStackScreenProps');
    expect(content).not.toContain('LearningStackParamList');
    expect(content).not.toContain('LearningScreenProps');
  });

  it('has no production source imports of the deleted legacy symbols', () => {
    const deletedSymbols = [
      'ParentDashboardScreen',
      'ChildPracticeScreen',
      'LessonPlannerScreen',
      'LearningStackParamList',
      'LearningScreenProps',
    ];

    const violations: string[] = [];

    for (const filePath of walk(srcDir, ['.ts', '.tsx'])) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const symbol of deletedSymbols) {
        if (content.includes(symbol)) {
          violations.push(
            `${path.relative(root, filePath)} still references deleted symbol "${symbol}"`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('removes the obsolete unit test that imported the deleted screens', () => {
    const obsoleteTest = path.join(
      root,
      'tests/screens/LessonPlannerScreen.test.tsx',
    );
    expect(fs.existsSync(obsoleteTest)).toBe(false);
  });
});
