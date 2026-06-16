import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const eslintConfigPath = path.join(projectRoot, 'eslint.config.js');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const eslintSource = fs.readFileSync(eslintConfigPath, 'utf-8');

// Normalize a transformIgnorePatterns regex string into a RegExp we can test.
function patternToRegExp(pattern: string): RegExp {
  return new RegExp(pattern);
}

// A path is "whitelisted" if it does NOT match the ignore pattern (i.e., Jest will transform it).
function isTransformed(pattern: string, modulePath: string): boolean {
  return !patternToRegExp(pattern).test(modulePath);
}

describe('T02: Jest, lint, and package hygiene', () => {
  describe('package.json scripts', () => {
    it('keeps only typecheck and removes build', () => {
      expect(packageJson.scripts).toHaveProperty('typecheck', 'tsc --noEmit');
      expect(packageJson.scripts).not.toHaveProperty('build');
    });
  });

  describe('package.json jest config', () => {
    const projects = packageJson.jest?.projects ?? [];

    it('has at least one jest project defined', () => {
      expect(projects.length).toBeGreaterThan(0);
    });

    it.each(projects.map((p: any, idx: number) => [p.displayName ?? `project-${idx}`, p]) as Array<[string, any] >)(
      '%s: removes expo-av moduleNameMapper',
      (_name: string, project: any) => {
        const mappers = project.moduleNameMapper ?? {};
        expect(mappers).not.toHaveProperty('expo-av');
      },
    );

    const requiredPackages = [
      '@orbital-systems/react-native-esp-idf-provisioning',
      '@google/genai',
      'lucide-react-native',
      'posthog-react-native',
      '@sentry/react-native',
      'axios',
    ];

    it.each(projects.map((p: any, idx: number) => [p.displayName ?? `project-${idx}`, p]) as Array<[string, any] >)(
      '%s: transformIgnorePatterns whitelists required ESM packages',
      (_name: string, project: any) => {
        const patterns = project.transformIgnorePatterns ?? [];
        expect(patterns.length).toBeGreaterThan(0);

        for (const pattern of patterns) {
          for (const pkg of requiredPackages) {
            const samplePath = `node_modules/${pkg}/dist/index.js`;
            expect(isTransformed(pattern, samplePath)).toBe(true);
          }

          // Existing runtime packages must stay whitelisted.
          expect(isTransformed(pattern, 'node_modules/react-native/index.js')).toBe(true);
          expect(isTransformed(pattern, 'node_modules/@react-navigation/native/src/index.js')).toBe(true);
          expect(isTransformed(pattern, 'node_modules/expo-secure-store/index.js')).toBe(true);

          // A package that is not whitelisted should still be ignored.
          expect(isTransformed(pattern, 'node_modules/some-random-package/index.js')).toBe(false);
        }
      },
    );
  });

  describe('package.json environment declarations', () => {
    it('declares engines.node', () => {
      expect(packageJson).toHaveProperty('engines');
      expect(packageJson.engines).toHaveProperty('node');
      expect(typeof packageJson.engines.node).toBe('string');
      expect(packageJson.engines.node.length).toBeGreaterThan(0);
    });

    it('declares browserslist', () => {
      expect(packageJson).toHaveProperty('browserslist');
      expect(Array.isArray(packageJson.browserslist)).toBe(true);
      expect(packageJson.browserslist.length).toBeGreaterThan(0);
    });
  });

  describe('eslint.config.js no-require-imports override', () => {
    // Extract top-level config objects that declare a `files` array.
    const scopedBlocks = eslintSource.match(/\{[\s\S]*?files\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g) ?? [];

    it('has a global lint block for source and test files', () => {
      const globalBlock = scopedBlocks.find((block) =>
        /files\s*:\s*\[\s*['"]\*\*\/\*\.\{js,jsx,ts,tsx\}['"]\s*\]/.test(block),
      );
      expect(globalBlock).toBeDefined();
    });

    it('disables no-require-imports in the global source/test rules block', () => {
      // Verify the global rules block turns off no-require-imports for source/test files.
      const globalRulesIndex = eslintSource.indexOf("files: ['**/*.{js,jsx,ts,tsx}']");
      expect(globalRulesIndex).toBeGreaterThan(-1);
      const nextConfigBlock = eslintSource.indexOf('{', globalRulesIndex + 1);
      const blockEnd = eslintSource.indexOf('\n  },', nextConfigBlock);
      const globalBlock = eslintSource.slice(globalRulesIndex, blockEnd);
      expect(globalBlock).toContain("'@typescript-eslint/no-require-imports': 'off'");
    });

    it('keeps no-require-imports disabled for config build files', () => {
      const configBlockIndex = eslintSource.indexOf("files: ['metro.config.js', 'babel.config.js']");
      if (configBlockIndex === -1) {
        // If no separate config block exists, the global disable already covers config files.
        expect(eslintSource).toContain("'@typescript-eslint/no-require-imports': 'off'");
        return;
      }
      const blockEnd = eslintSource.indexOf('\n  },', configBlockIndex);
      const configBlock = eslintSource.slice(configBlockIndex, blockEnd);
      expect(configBlock).toContain("'@typescript-eslint/no-require-imports': 'off'");
    });
  });
});
