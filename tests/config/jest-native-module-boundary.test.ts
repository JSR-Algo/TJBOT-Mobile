import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

describe('Jest native module boundary', () => {
  it('maps expo-keep-awake to a repository-owned native mock', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      jest?: {
        projects?: Array<{
          displayName?: string;
          maxWorkers?: number;
          moduleNameMapper?: Record<string, string>;
        }>;
      };
    };
    const unitProject = packageJson.jest?.projects?.find((project) => project.displayName === 'unit');
    const mockPath = unitProject?.moduleNameMapper?.['expo-keep-awake'];

    expect(mockPath).toBe('<rootDir>/tests/__mocks__/expo-keep-awake.ts');
    expect(existsSync(join(root, 'tests', '__mocks__', 'expo-keep-awake.ts'))).toBe(true);
    expect(unitProject?.maxWorkers).toBe(1);
  });

  it('leaves the runtime env alias to Metro instead of TypeScript path resolution', () => {
    const tsconfig = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8')) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    const metroConfig = readFileSync(join(root, 'metro.config.js'), 'utf8');

    expect(tsconfig.compilerOptions?.paths).not.toHaveProperty('tbot-runtime-env');
    expect(metroConfig).toContain("'tbot-runtime-env': runtimeEnvPath");
  });
});
