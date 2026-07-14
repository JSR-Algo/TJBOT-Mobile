import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');

test('focused reward hook tests exit without retained cache timers', () => {
  const result = spawnSync(process.execPath, [
    resolve(root, 'node_modules/jest/bin/jest.js'),
    '--selectProjects', 'unit',
    '--runInBand',
    '--runTestsByPath', 'tests/features/rewards/reward-hooks.test.tsx',
  ], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
  });

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
