import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'ci.yml');

const requiredValidateCommands = [
  'npm run test:rewards-runner',
  'npm run test:integration',
  'npm run api:contract-sync:check',
  'npm run test:state-machines',
  'npm run test:navigation',
  'npm run test:screens',
  'npm run flows:validate',
  'npm run sequences:fast',
  'npm run erd:validate',
  'npm run usecases:check',
  'npm run check:token-parity',
  'npm run check:route-coverage',
  'npm run check:screen-prop-types',
  'SIMULATION_MODE=true npm run e2e:mobile -- --plan-json',
];

const requiredNativeBuildCommands = [
  'npm run build:android',
  'npm run build:ios',
];

const requiredJobNames = [
  'mobile-quality',
  'mobile-api-contract-sync',
  'mobile-state-machines',
  'mobile-navigation',
  'mobile-screens',
  'mobile-e2e-plan',
  'mobile-android-build',
  'mobile-ios-build',
];

describe('mobile CI quality gates', () => {
  it('runs rewards lifecycle tests in the required mobile quality job', () => {
    const workflow = fs.readFileSync(WORKFLOW, 'utf8');
    const mobileQualityJob = workflow.match(/\n {2}mobile-quality:\n([\s\S]*?)(?=\n {2}[a-z0-9-]+:\n|$)/)?.[1];

    expect(mobileQualityJob).toContain('npm run test:rewards-runner');
  });

  it('runs all repo-required validation commands in pull request CI', () => {
    const workflow = fs.readFileSync(WORKFLOW, 'utf8');

    for (const command of requiredValidateCommands) {
      expect(workflow).toContain(command);
    }

    for (const command of requiredNativeBuildCommands) {
      expect(workflow).toContain(command);
    }

    for (const name of requiredJobNames) {
      expect(workflow).toContain(name);
    }
  });

  it('defines every npm script used by required CI gates', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    for (const command of requiredValidateCommands) {
      const scriptName = command.match(/npm run ([^ ]+)/)?.[1];
      if (scriptName) {
        expect(packageJson.scripts).toHaveProperty(scriptName);
      }
    }
  });
});
