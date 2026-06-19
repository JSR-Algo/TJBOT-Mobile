#!/usr/bin/env node
/**
 * T32 verification: Fix failing unit-test baseline and native mocks.
 *
 * This script proves that the foundational test baseline is green and that
 * the specific T32 acceptance criteria are in place:
 *   1. scripts/api-contract-sync.mjs resolves an OpenAPI fixture and runs.
 *   2. Route-coverage test expectations match scripts/check-route-coverage.mjs output.
 *   3. tests/api/config.test.ts asserts the current hosted fallback URL.
 *   4. tests/features/parent/parent-today-screen.test.tsx waits for async state.
 *   5. tests/__mocks__/expo-audio.ts defaults recording permission to granted.
 *   6. tests/__mocks__/react-native-ble-plx.ts models stateful behavior.
 *   7. npm test exits 0 with zero failed suites.
 *
 * Usage: node scripts/verification/T32-fix-failing-test-baseline.js
 */

import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`❌ ${message}`);
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function runNodeScript(scriptPath, args = [], options = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, scriptPath), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    ...options,
  });
  return result;
}

// 1. OpenAPI fixture resolution for api-contract-sync.mjs
{
  const scriptPath = 'scripts/api-contract-sync.mjs';
  const source = readProjectFile(scriptPath);
  const hasEnvPath = source.includes('TBOT_BACKEND_OPENAPI_PATH');
  const hasFallback = source.includes('backend/openapi.json') || source.includes('tbot-backend/openapi.json');

  if (!hasEnvPath) {
    fail(`${scriptPath} does not support TBOT_BACKEND_OPENAPI_PATH environment override`);
  }
  if (!hasFallback) {
    fail(`${scriptPath} does not define a fallback OpenAPI fixture path`);
  }

  const result = runNodeScript(scriptPath, ['--json', '--no-write'], { env: process.env });
  if (result.status !== 0) {
    fail(`${scriptPath} --json --no-write exited ${result.status}\n${result.stderr || result.stdout}`);
  } else {
    try {
      const audit = JSON.parse(result.stdout);
      if (typeof audit.status !== 'string') {
        fail(`${scriptPath} JSON output is missing 'status'`);
      } else {
        pass(`${scriptPath} resolved an OpenAPI fixture and reported status="${audit.status}"`);
      }
    } catch (err) {
      fail(`${scriptPath} --json output is not valid JSON: ${err.message}`);
    }
  }
}

// 2. Route-coverage expectation alignment
{
  const scriptPath = 'scripts/check-route-coverage.mjs';
  const result = runNodeScript(scriptPath);
  if (result.status !== 0) {
    fail(`${scriptPath} exited ${result.status}\n${result.stderr || result.stdout}`);
  } else {
    const stdout = result.stdout;
    const testSource = readProjectFile('tests/navigation/route-coverage-script.test.ts');
    const expectedCounts = [
      { label: 'screen/route count', regex: /(\d+ screen files, \d+ routes registered)/, testRegex: /\d+ screen files, \d+ routes registered/ },
      { label: 'feature route registrations', regex: /(\d+ feature route registrations)/, testRegex: /\d+ feature route registrations/ },
      { label: 'duplicate screen registrations', regex: /(\d+ duplicate screen registrations)/, testRegex: /\d+ duplicate screen registrations/ },
    ];

    for (const { label, regex, testRegex } of expectedCounts) {
      const scriptMatch = stdout.match(regex);
      const testMatch = testSource.match(testRegex);
      if (!scriptMatch) {
        fail(`Could not extract ${label} from ${scriptPath} output`);
      } else if (!testMatch) {
        fail(`tests/navigation/route-coverage-script.test.ts does not assert ${label}`);
      } else {
        // Compare the actual string values
        if (testSource.includes(scriptMatch[1])) {
          pass(`Route-coverage test expects the current ${label}: ${scriptMatch[1]}`);
        } else {
          fail(`Route-coverage test expects a stale ${label}. Script says: ${scriptMatch[1]}`);
        }
      }
    }
  }
}

// 3. API config hosted fallback URL
{
  const configSource = readProjectFile('src/config.ts');
  const hostedRootMatch = configSource.match(/HOSTED_API_ROOT\s*=\s*'([^']+)'/);
  if (!hostedRootMatch) {
    fail('Could not find HOSTED_API_ROOT in src/config.ts');
  } else {
    const expectedUrl = `${hostedRootMatch[1]}/v1`;
    const testSource = readProjectFile('tests/api/config.test.ts');
    if (testSource.includes(expectedUrl)) {
      pass(`tests/api/config.test.ts asserts the current hosted fallback URL: ${expectedUrl}`);
    } else {
      fail(`tests/api/config.test.ts is missing the current hosted fallback URL: ${expectedUrl}`);
    }
  }
}

// 4. Parent-today-screen async determinism
{
  const testSource = readProjectFile('tests/features/parent/parent-today-screen.test.tsx');
  const usesWaitFor = testSource.includes('waitFor(');
  const usesFindBy = /findByText\(|findBy/.test(testSource);
  if (!usesWaitFor && !usesFindBy) {
    fail('tests/features/parent/parent-today-screen.test.tsx does not wait for async state (no waitFor/findBy)');
  } else {
    pass('tests/features/parent/parent-today-screen.test.tsx waits for async state');
  }
}

// 5. Native mock defaults
{
  const audioMock = readProjectFile('tests/__mocks__/expo-audio.ts');
  const grantsByDefault = audioMock.includes('granted: true');
  const deniesByDefault = audioMock.includes('granted: false');
  if (!grantsByDefault) {
    fail('tests/__mocks__/expo-audio.ts does not default requestRecordingPermissionsAsync to granted: true');
  } else if (deniesByDefault) {
    fail('tests/__mocks__/expo-audio.ts still contains a denied default path alongside granted: true');
  } else {
    pass('tests/__mocks__/expo-audio.ts defaults recording permission to granted');
  }

  const bleMock = readProjectFile('tests/__mocks__/react-native-ble-plx.ts');
  const hasState = /state\s*[:=]|onStateChange|connectToDevice|discoverAllServicesAndCharacteristics/.test(bleMock);
  const hasConnectionEvents = /onDeviceDisconnected|connectedDevices/.test(bleMock);
  if (!hasState) {
    fail('tests/__mocks__/react-native-ble-plx.ts does not model BLE manager state');
  } else if (!hasConnectionEvents) {
    fail('tests/__mocks__/react-native-ble-plx.ts does not model connection state/events');
  } else {
    pass('tests/__mocks__/react-native-ble-plx.ts models stateful BLE behavior');
  }
}

// 6. Full test baseline
{
  console.log('\n⏳ Running npm test (this may take ~30 s)...');
  const result = spawnSync('npm', ['test', '--', '--passWithNoTests'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const output = `${result.stdout}\n${result.stderr}`;
  const failedMatch = output.match(/Test Suites:\s*(\d+) failed/);
  const failedSuites = failedMatch ? parseInt(failedMatch[1], 10) : 0;

  if (result.status !== 0 || failedSuites > 0) {
    fail(`npm test failed (exit ${result.status}, ${failedSuites} failed suites)`);
    // Print the summary lines so the caller can diagnose quickly.
    const summaryLines = output.split('\n').filter(line =>
      line.includes('Test Suites:') || line.includes('Tests:') || line.includes('FAIL')
    );
    summaryLines.forEach(line => console.error(`   ${line}`));
  } else {
    pass('npm test exits 0 with zero failed suites');
  }
}

// Final verdict
if (failures.length > 0) {
  console.error(`\n❌ T32 baseline verification FAILED with ${failures.length} issue(s).`);
  process.exit(1);
} else {
  console.log('\n✅ T32 baseline verification PASSED.');
  process.exit(0);
}
