import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('configured missing canonical input fails the native parity suite instead of skipping', () => {
  const work = mkdtempSync(join(tmpdir(), 'canonical-parity-'));
  const backendRoot = join(work, 'missing-backend');
  try {
    const resultPath = join(work, 'jest.json');
    const args = [
      join(mobileRoot, 'node_modules/jest/bin/jest.js'),
      '--selectProjects', 'unit', '--runInBand', '--watchman=false',
      '--cacheDirectory', join(work, 'cache'), '--runTestsByPath',
      'tests/contracts/parity.test.ts', '--json', '--outputFile', resultPath,
    ];
    const run = spawnSync(process.execPath, args, {
      cwd: mobileRoot, encoding: 'utf8', timeout: 30000,
      env: { ...process.env, TBOT_BACKEND_DIR: backendRoot },
    });
    assert.ifError(run.error);
    const results = JSON.parse(readFileSync(resultPath, 'utf8'));
    if (process.env.TBOT_PARITY_FAILURE_EVIDENCE) {
      writeFileSync(process.env.TBOT_PARITY_FAILURE_EVIDENCE, JSON.stringify({
        argv: [process.execPath, ...args], backendRoot, status: run.status,
        stdout: run.stdout, stderr: run.stderr, results,
      }, null, 2) + '\n');
    }
    assert.equal(run.status, 1, 'missing canonical input must make Jest fail');
    assert.equal(results.numFailedTestSuites, 1);
    assert.equal(results.numPendingTests, 0);
    assert.equal(results.numPassedTests, 0);
    assert.ok(run.stderr.includes(backendRoot), 'diagnostic must identify configured root');
    assert.match(run.stderr, /Cannot find module/);
    assert.match(run.stderr, /TBOT_BACKEND_DIR/);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test('real canonical modules with a missing Zod dependency retain the load error', () => {
  const work = mkdtempSync(join(tmpdir(), 'canonical-dependency-'));
  const backendRoot = process.env.TBOT_BACKEND_DIR ?? resolve(mobileRoot, '../tbot-backend');
  try {
    const copies = [];
    copyFileSync(join(backendRoot, 'package.json'), join(work, 'package.json'));
    for (const directory of ['vendor/contracts', 'node_modules/@tbot/contracts']) {
      mkdirSync(join(work, directory), { recursive: true });
      for (const name of ['package.json', 'robot-state.js', 'expression.js', 'motion.js', 'realtime-events.js']) {
        copyFileSync(join(backendRoot, 'vendor/contracts', name), join(work, directory, name));
        const source = join(backendRoot, 'vendor/contracts', name);
        const target = join(work, directory, name);
        assert.deepEqual(readFileSync(target), readFileSync(source));
        copies.push({ source, target, sha256: createHash('sha256').update(readFileSync(target)).digest('hex') });
      }
    }
    const run = spawnSync(process.execPath, [join(mobileRoot, 'tests/contracts/canonical-contracts-bridge.js'), work], {
      encoding: 'utf8', timeout: 10000, input: JSON.stringify({ operation: 'snapshot', states: [] }),
      env: { ...process.env, NODE_PATH: '' },
    });
    assert.ifError(run.error);
    if (process.env.TBOT_PARITY_FAILURE_EVIDENCE) {
      writeFileSync(process.env.TBOT_PARITY_FAILURE_EVIDENCE + '.dependency.json', JSON.stringify({
        backendRoot: work, copies, status: run.status, stdout: run.stdout, stderr: run.stderr,
      }, null, 2) + '\n');
    }
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.match(run.stderr, /Cannot find module 'zod'/);
    assert.match(run.stderr, /realtime-events\.js/);
    assert.ok(run.stderr.includes(work));
    assert.match(run.stderr, /TBOT_BACKEND_DIR/);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
