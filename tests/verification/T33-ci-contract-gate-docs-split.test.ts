import fs from 'node:fs';
import path from 'node:path';

const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relativePath), 'utf8');
}

function readPackageJson(): { scripts: Record<string, string | undefined> } {
  return JSON.parse(readFile('package.json'));
}

function extractJob(yaml: string, jobName: string): string {
  // Jobs are indented two spaces in the current ci.yml.
  const pattern = new RegExp(
    `^  ${jobName}:\\n([\\s\\S]*?)(?=^  [a-zA-Z][\\w-]*:\\n|\\Z)`,
    'm',
  );
  const match = yaml.match(pattern);
  return match ? match[1] : '';
}

describe('T33: replace stub API-contract gate and split docs-integrity CI', () => {
  it('runs the real contract-sync script with --fail-on-drift', () => {
    const pkg = readPackageJson();
    const script = pkg.scripts['api:contract-sync:check'] ?? '';

    expect(script).toMatch(/api-contract-sync\.mjs/);
    expect(script).not.toMatch(/check-api-contract-sync\.mjs/);
    expect(script).toMatch(/--fail-on-drift/);
  });

  it('removes the stub contract-sync script', () => {
    const stubPath = path.join(MOBILE_ROOT, 'scripts/check-api-contract-sync.mjs');
    expect(fs.existsSync(stubPath)).toBe(false);
  });

  it('keeps the mobile-api-contract-sync CI job wired to the npm script', () => {
    const ciYaml = readFile('.github/workflows/ci.yml');
    const jobBody = extractJob(ciYaml, 'mobile-api-contract-sync');

    expect(jobBody).toContain('npm run api:contract-sync:check');
  });

  it('keeps docs-integrity checks out of the mobile-quality job', () => {
    const ciYaml = readFile('.github/workflows/ci.yml');
    const jobBody = extractJob(ciYaml, 'mobile-quality');

    expect(jobBody).toContain('npm run lint');
    expect(jobBody).toContain('npm run typecheck');
    expect(jobBody).toContain('npm test');
    expect(jobBody).toContain('npm run test:integration');
    expect(jobBody).toContain('npx expo config');

    expect(jobBody).not.toContain('npm run flows:validate');
    expect(jobBody).not.toContain('npm run sequences:fast');
    expect(jobBody).not.toContain('npm run erd:validate');
    expect(jobBody).not.toContain('npm run usecases:check');
  });

  it('runs docs-integrity checks in a separate CI job or workflow', () => {
    const ciYaml = readFile('.github/workflows/ci.yml');
    const docsJobInCi = extractJob(ciYaml, 'docs-integrity');

    const docsWorkflowPath = path.join(
      MOBILE_ROOT,
      '.github/workflows/docs-integrity.yml',
    );
    const docsWorkflowExists = fs.existsSync(docsWorkflowPath);

    const docsBlock = docsJobInCi || (docsWorkflowExists ? readFile('.github/workflows/docs-integrity.yml') : '');

    expect(docsBlock.length > 0).toBe(true);
    expect(docsBlock).toContain('npm run flows:validate');
    expect(docsBlock).toContain('npm run sequences:fast');
    expect(docsBlock).toContain('npm run erd:validate');
    expect(docsBlock).toContain('npm run usecases:check');
  });
});
