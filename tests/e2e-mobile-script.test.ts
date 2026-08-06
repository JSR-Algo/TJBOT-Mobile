import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'e2e-mobile.js');

type PlanModule = {
  name: string;
  screens: string[];
  endpoints: string[];
  scenarios: { kind: string }[];
  responseShapeAssertions?: string[];
  dbSideEffectAssertions?: string[];
  backendLogCheck?: boolean;
};

type Plan = {
  localOnly: boolean;
  simulationRequired: boolean;
  backendLogRequired: boolean;
  backendLogSettleMs: number;
  contractFallbacksAllowed: boolean;
  schemaDriftCheckRequired?: boolean;
  openApiPath?: string;
  backendBlockers: string[];
  modules: PlanModule[];
};

function runPlan(args: string[] = []): Plan {
  const output = execFileSync('node', [SCRIPT, '--plan-json', ...args], {
    cwd: ROOT,
    env: { ...process.env, SIMULATION_MODE: 'true' },
    encoding: 'utf8',
  });
  return JSON.parse(output) as Plan;
}

function runPlanWithEnv(env: NodeJS.ProcessEnv, args: string[] = []): Plan {
  const output = execFileSync('node', [SCRIPT, '--plan-json', ...args], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
  });
  return JSON.parse(output) as Plan;
}

function runLogScan(logContent: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'TJBot-mobile-log-scan-'));
  const logPath = path.join(dir, 'backend.log');
  fs.writeFileSync(logPath, logContent);
  return execFileSync('node', [SCRIPT, '--scan-log-only', `--backend-log=${logPath}`], {
    cwd: ROOT,
    env: { ...process.env, SIMULATION_MODE: 'true' },
    encoding: 'utf8',
  });
}

describe('e2e-mobile local production gate', () => {
  it('defines all module flows with happy and failure or retry scenarios', () => {
    const plan = runPlan();

    expect(plan.localOnly).toBe(true);
    expect(plan.simulationRequired).toBe(true);
    expect(plan.modules.map(module => module.name)).toEqual([
      'Auth + Onboarding',
      'Home Dashboard',
      'Device Pairing',
      'Learning + AI Interaction',
      'Progress',
      'Parent Control',
      'Course Library + Purchase',
      'Robot Management',
      'Fallback + Recovery',
    ]);

    for (const module of plan.modules) {
      expect(module.screens.length).toBeGreaterThan(0);
      expect(module.endpoints.length).toBeGreaterThan(0);
      expect(module.scenarios.some(scenario => scenario.kind === 'happy')).toBe(true);
      expect(module.scenarios.some(scenario => scenario.kind === 'unauthorized')).toBe(true);
      expect(module.scenarios.some(scenario => scenario.kind === 'validation')).toBe(true);
      expect(module.scenarios.some(scenario => scenario.kind === 'retry')).toBe(true);
    }
  });

  it('declares response-shape, database side-effect, and backend-log checks for every flow', () => {
    const plan = runPlan();

    for (const module of plan.modules) {
      expect(module.responseShapeAssertions?.length).toBeGreaterThan(0);
      expect(module.dbSideEffectAssertions?.length).toBeGreaterThan(0);
      expect(module.backendLogCheck).toBe(true);
    }
  });

  it('exposes backend log gate metadata for production readiness checks', () => {
    const plan = runPlan();

    expect(plan.backendLogRequired).toBe(true);
    expect(plan.backendLogSettleMs).toBe(70000);
  });

  it('disallows synthetic contract fallbacks in the local production gate', () => {
    const plan = runPlan();

    expect(plan.contractFallbacksAllowed).toBe(false);
  });

  it('requires OpenAPI schema drift checking before running local backend calls', () => {
    const plan = runPlan();

    expect(plan.schemaDriftCheckRequired).toBe(true);
    expect(plan.openApiPath).toBe('migrate-ui-ux-to-mobile-app-docs/api/openapi.json');
  });

  it('checks modular route-contract entries when OpenAPI paths are generated elsewhere', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).toContain("x-TJBot-modular-route-contract");
    expect(source).toContain('documentedContracts');
    expect(source).toContain('routeCoverage');
  });

  it('does not require local parent PIN provisioning for parent controls', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).toContain('backendBlockers');
    expect(source).toContain('parent PIN provisioning is unavailable');
    expect(source).toContain('PIN_INCORRECT');
    expect(source).toContain('TBOT_E2E_DATABASE_URL');
  });

  it('uses the documented local parent PIN for parent-gate contract checks', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'TJBot-mobile-openapi-'));
    const openApiPath = path.join(dir, 'openapi.json');
    fs.writeFileSync(openApiPath, JSON.stringify({
      paths: {
        '/v1/parent/auth': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  examples: {
                    default: { value: { pin: '0000' } },
                  },
                },
              },
            },
          },
        },
      },
    }));

    const plan = runPlanWithEnv({
      ...process.env,
      SIMULATION_MODE: 'true',
      TBOT_OPENAPI_PATH: openApiPath,
    });

    expect(plan.backendBlockers).toEqual([]);
    expect(source).toContain("PARENT_PIN = '0000'");
    expect(source).toContain('pin: PARENT_PIN');
    expect(source).toContain('seedParentPin');
    expect(source).toContain('parent_pins (household_id, parent_id, pin_hash)');
  });

  it('reports missing local parent PIN provisioning as an explicit backend blocker', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).toContain('backendBlockers');
    expect(source).toContain('parent PIN provisioning is unavailable');
    expect(source).toContain('PIN_INCORRECT');
  });

  it('can seed the documented parent PIN through local Postgres when DB access is available', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).toContain('seedParentPin');
    expect(source).toContain('parent_pins (household_id, parent_id, pin_hash)');
    expect(source).toContain('TBOT_E2E_DATABASE_URL');
    expect(source).toContain('loadBackendModule');
  });

  it('fails early when the contract gate is pointed at the mobile mock backend', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).toContain('assertRealBackend');
    expect(source).toContain('TJBot-mobile-e2e-mock');
    expect(source).toContain('Real backend required');
  });

  it('uses the running local backend factory token before falling back to defaults', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).toContain("readRunningBackendEnvValue('TBOT_FACTORY_TOKEN')");
    expect(source).toContain("readBackendEnvValue('TBOT_FACTORY_TOKEN')");
    expect(source).toContain("'local-e2e-factory-token'");
  });

  it('rejects non-local backend URLs', () => {
    expect(() => runPlan(['--url=https://staging.TJBot.ai'])).toThrow(/local backend/i);
  });

  it('does not require an AI service for the Nest-only checkpoint plan', () => {
    expect(() => runPlan(['--ai-url=https://ai.example.test'])).not.toThrow();
  });

  it('requires simulation mode before plan inspection', () => {
    const envWithoutSimulationMode = { ...process.env };
    delete envWithoutSimulationMode.SIMULATION_MODE;

    expect(() => runPlanWithEnv(envWithoutSimulationMode)).toThrow(/SIMULATION_MODE=true/i);
  });

  it('does not treat zero worker failure counters as backend errors', () => {
    expect(() => runLogScan([
      '{"level":"info","component":"AccountExportExecutorWorker","message":"AccountExportExecutorWorker finished: status=completed completed=0 failed=0"}',
      '{"level":"info","component":"AccountDeletionExecutorWorker","message":"AccountDeletionExecutorWorker finished: status=completed completed=0 failed=0"}',
    ].join('\n'))).not.toThrow();
  });

  it('fails when backend logs contain real worker errors', () => {
    expect(() => runLogScan('{"level":"error","component":"AccountExportExecutorWorker","message":"worker failed with database timeout"}')).toThrow(/backend worker\/background errors/i);
  });

  it('fails when zero worker counters appear on an error-level backend log', () => {
    expect(() => runLogScan('{"level":"error","component":"AccountExportExecutorWorker","message":"worker error after export, failed=0"}')).toThrow(/backend worker\/background errors/i);
  });

  it('fails when worker completion reports non-zero failed counters', () => {
    expect(() => runLogScan('{"level":"info","component":"AccountExportExecutorWorker","message":"AccountExportExecutorWorker finished: status=completed completed=0 failed=1"}')).toThrow(/backend worker\/background errors/i);
  });

  it('fails when worker errors contain otherwise expected auth words', () => {
    expect(() => runLogScan('{"level":"error","component":"AccountDeletionExecutorWorker","message":"worker failed unauthorized cleanup"}')).toThrow(/backend worker\/background errors/i);
  });

  it('does not allow synthetic local contract fallback paths in the harness', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).not.toMatch(/expectStatusOrLocalFallback/);
    expect(source).not.toMatch(/recordLocalContractFallback/);
    expect(source).not.toMatch(/syntheticDevice/);
  });

  it('can write a structured CI report with flow coverage and gate blockers', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');

    expect(source).toContain('report-json');
    expect(source).toContain('flowCoverage');
    expect(source).toContain('backendBlockers');
    expect(source).toContain('schemaDrift');
    expect(source).toContain('unexpected5xx');
  });
});
