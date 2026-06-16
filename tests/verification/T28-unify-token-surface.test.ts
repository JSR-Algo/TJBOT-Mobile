import fs from 'fs';
import path from 'path';
import {
  colors as legacyColors,
  spacing as legacySpacing,
  radius as legacyRadius,
  shadows as legacyShadows,
  typography as legacyTypography,
} from '@/design-system/tokens/legacy-semantic';
import { colors as lowLevelColors } from '@/design-system/tokens/colors';
import { spacing as lowLevelSpacing } from '@/design-system/tokens/spacing';
import { radii as lowLevelRadii } from '@/design-system/tokens/radii';
import { shadows as lowLevelShadows } from '@/design-system/tokens/shadows';
import { typography as lowLevelTypography } from '@/design-system/tokens/typography';

const projectRoot = path.resolve(__dirname, '../..');

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(projectRoot, 'src', ...segments), 'utf-8');
}


function collectScalarValues(obj: unknown): Array<string | number> {
  const values: Array<string | number> = [];
  if (obj === null || obj === undefined) return values;
  if (typeof obj === 'string' || typeof obj === 'number') {
    values.push(obj);
    return values;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) values.push(...collectScalarValues(item));
    return values;
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj)) values.push(...collectScalarValues(value));
  }
  return values;
}

function* walkDir(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Never descend into tests or generated directories.
      if (entry.name === '__mocks__' || entry.name === 'integration') continue;
      yield* walkDir(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      yield fullPath;
    }
  }
}

describe('T28: Unify design-token surface and migrate legacy imports', () => {
  describe('legacy-semantic.ts is a pure transform of low-level tokens', () => {
    it('colors resolve to low-level palette values', () => {
      const allowed = new Set(
        collectScalarValues(lowLevelColors).filter((v): v is string => typeof v === 'string'),
      );
      for (const [_key, value] of Object.entries(legacyColors)) {
        expect(allowed).toContain(value);
      }
    });

    it('spacing resolves to low-level spacing values', () => {
      const allowed = new Set(
        collectScalarValues(lowLevelSpacing).filter((v): v is number => typeof v === 'number'),
      );
      for (const [_key, value] of Object.entries(legacySpacing)) {
        expect(allowed).toContain(value);
      }
    });

    it('radius resolves to low-level radii values', () => {
      const allowed = new Set(
        collectScalarValues(lowLevelRadii).filter((v): v is number => typeof v === 'number'),
      );
      for (const [_key, value] of Object.entries(legacyRadius)) {
        expect(allowed).toContain(value);
      }
    });

    it('shadows resolve to low-level shadow values', () => {
      const allowed = Object.values(lowLevelShadows);
      for (const [_key, value] of Object.entries(legacyShadows)) {
        expect(allowed).toContainEqual(value);
      }
    });

    it('typography resolves to low-level typography values', () => {
      const allowed = new Set(
        collectScalarValues(lowLevelTypography).filter(
          (v): v is string | number => typeof v === 'string' || typeof v === 'number',
        ),
      );
      for (const [_variant, style] of Object.entries(legacyTypography)) {
        for (const [_prop, value] of Object.entries(style as Record<string, unknown>)) {
          expect(allowed).toContain(value);
        }
      }
    });
  });

  describe('local ad-hoc palettes are removed', () => {
    it('Device-tokens.ts no longer defines raw color literals', () => {
      const deviceTokensPath = path.join(projectRoot, 'src/components/Device-tokens.ts');
      if (!fs.existsSync(deviceTokensPath)) {
        // File deleted = local palette removed.
        return;
      }
      const source = fs.readFileSync(deviceTokensPath, 'utf-8');
      const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(/;
      expect(source).not.toMatch(rawColorPattern);
    });
  });

  describe('in-scope components consume only the unified token surface', () => {
    const scopeComponents = [
      'components/Button.tsx',
      'components/Card.tsx',
      'components/Input.tsx',
      'components/OnboardingHeader.tsx',
    ];

    it.each(scopeComponents)('%s imports from the unified semantic tokens', (relativePath) => {
      const source = readSrc(...relativePath.split('/'));
      const importsUnified =
        /from\s+['"]@\/design-system\/tokens\/legacy-semantic['"]/.test(source) ||
        /from\s+['"]@\/theme['"]/.test(source);
      expect(importsUnified).toBe(true);
    });

    it.each(scopeComponents)('%s does not import from Device-tokens', (relativePath) => {
      const source = readSrc(...relativePath.split('/'));
      expect(source).not.toMatch(/from\s+['"][.@/]*components\/Device-tokens['"]/);
    });
  });

  describe('no production file imports both legacy-semantic and direct low-level tokens', () => {
    it('scans src/ for conflicting token imports', () => {
      const conflicts: string[] = [];
      const srcRoot = path.join(projectRoot, 'src');

      for (const filePath of walkDir(srcRoot)) {
        const source = fs.readFileSync(filePath, 'utf-8');
        const importsLegacy = /from\s+['"]@\/design-system\/tokens\/legacy-semantic['"]/.test(
          source,
        );
        const importsDirect =
          /from\s+['"]@\/design-system\/tokens\/(colors|spacing|radii|shadows|typography)['"]/.test(
            source,
          ) || /from\s+['"]@\/design-system\/tokens['"]/.test(source);
        if (importsLegacy && importsDirect) {
          conflicts.push(path.relative(projectRoot, filePath));
        }
      }

      expect(conflicts).toEqual([]);
    });
  });
});
