import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

const STATEFUL_FEATURES = [
  'auth',
  'onboarding',
  'home',
  'lesson-session',
  'course',
  'course-library',
  'device',
  'robot-mgmt',
  'progress',
  'parent',
  'purchase',
  'fallback',
] as const;

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function readFeatureFile(feature: string, file: string): string {
  const featureDir = join(root, 'src', 'features', feature);
  try {
    return readFileSync(join(featureDir, file), 'utf8');
  } catch (error) {
    if (file.endsWith('.ts')) {
      return readFileSync(join(featureDir, file.replace(/\.ts$/, '.js')), 'utf8');
    }
    throw error;
  }
}

function stateIds(feature: string): string[] {
  const src = readFeatureFile(feature, 'states.ts');
  return Array.from(src.matchAll(/\{\s*id:\s*'([^']+)'/g), match => match[1]);
}

function screenMapIds(feature: string): string[] {
  const src = readFeatureFile(feature, 'index.ts');
  const block = src.match(/SCREEN_MAP\s*=\s*\{([\s\S]*?)\n\};/);
  expect(block).not.toBeNull();

  return Array.from(block?.[1].matchAll(/^\s*([a-z][a-z0-9_]*):/gm) ?? [], match => match[1]);
}

function edgeCaseIds(feature: string): string[] {
  const meta = JSON.parse(readFeatureFile(feature, 'domain.meta.json')) as {
    edge_cases?: Record<string, readonly string[]>;
  };
  return Object.keys(meta.edge_cases ?? {});
}

describe('feature state alignment', () => {
  it('does not keep legacy stub screen maps in feature indexes', () => {
    const offenders = listSourceFiles(join(root, 'src', 'features'))
      .filter(file => readFileSync(file, 'utf8').includes('STUB_SCREEN_MAP'))
      .map(file => file.replace(`${root}/`, ''));

    expect(offenders).toEqual([]);
  });

  it('does not keep legacy JavaScript feature indexes as screen-map owners', () => {
    const offenders = STATEFUL_FEATURES
      .map(feature => join(root, 'src', 'features', feature, 'index.js'))
      .filter(file => {
        try {
          return readFileSync(file, 'utf8').includes('SCREEN_MAP');
        } catch {
          return false;
        }
      })
      .map(file => file.replace(`${root}/`, ''));

    expect(offenders).toEqual([]);
  });

  it('does not keep legacy JavaScript feature state owners', () => {
    const offenders = STATEFUL_FEATURES
      .map(feature => join(root, 'src', 'features', feature, 'states.js'))
      .filter(file => {
        try {
          return readFileSync(file, 'utf8').includes('STATES');
        } catch {
          return false;
        }
      })
      .map(file => file.replace(`${root}/`, ''));

    expect(offenders).toEqual([]);
  });

  it('keeps feature STATES aligned to the feature SCREEN_MAP owner', () => {
    for (const feature of STATEFUL_FEATURES) {
      expect(stateIds(feature).sort()).toEqual(screenMapIds(feature).sort());
    }
  });

  it('keeps domain edge metadata scoped to states owned by the same feature', () => {
    for (const feature of STATEFUL_FEATURES) {
      expect(edgeCaseIds(feature).sort()).toEqual(
        expect.arrayContaining(edgeCaseIds(feature).filter(id => stateIds(feature).includes(id)).sort()),
      );
      expect(edgeCaseIds(feature).filter(id => !stateIds(feature).includes(id))).toEqual([]);
    }
  });
});
