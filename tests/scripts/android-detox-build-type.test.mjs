import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const run = promisify(execFile);

test('Detox debug instrumentation targets the debug app without building release', { timeout: 180000 }, async () => {
  const { stdout } = await run('./gradlew', [
    ':app:assembleAndroidTest', '-DtestBuildType=debug', '--dry-run', '--max-workers=2',
  ], {
    cwd: fileURLToPath(new URL('../../android/', import.meta.url)),
    timeout: 150000,
    maxBuffer: 4 * 1024 * 1024,
    env: process.env,
  });
  assert.match(stdout, /^:app:assembleDebugAndroidTest SKIPPED$/m);
  assert.doesNotMatch(stdout, /^:app:.*Release.* SKIPPED$/m);
});
