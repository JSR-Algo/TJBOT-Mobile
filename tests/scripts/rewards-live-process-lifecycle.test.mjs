import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { sign, verify } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import test from 'node:test';
import {
  countForwardMigrations,
  createJwtKeyPair,
  createProcessLifecycle,
} from '../../scripts/_lib/rewards-live-process-lifecycle.mjs';

const root = resolve(import.meta.dirname, '../..');

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    throw error;
  }
}

test('counts only forward SQL migrations from the backend primary candidate directory', async () => {
  const backendRoot = await mkdtemp(resolve(tmpdir(), 'tbot-rewards-migrations-'));
  const primary = resolve(backendRoot, 'src/database/migrations');
  const fallback = resolve(backendRoot, 'migrations');

  try {
    await mkdir(primary, { recursive: true });
    await mkdir(fallback, { recursive: true });
    await Promise.all([
      writeFile(resolve(primary, '001_first.sql'), '-- up\n'),
      writeFile(resolve(primary, '002_second.SQL'), '-- not lowercase sql\n'),
      writeFile(resolve(primary, '003_third.down.sql'), '-- down\n'),
      writeFile(resolve(primary, 'notes.txt'), 'not sql\n'),
      writeFile(resolve(fallback, '999_fallback.sql'), '-- ignored while primary exists\n'),
    ]);

    assert.equal(await countForwardMigrations(backendRoot), 1);
  } finally {
    await rm(backendRoot, { recursive: true, force: true });
  }
});

test('falls back to the backend migrations directory when the primary candidate is absent', async () => {
  const backendRoot = await mkdtemp(resolve(tmpdir(), 'tbot-rewards-migrations-'));
  const fallback = resolve(backendRoot, 'migrations');

  try {
    await mkdir(fallback, { recursive: true });
    await Promise.all([
      writeFile(resolve(fallback, '001_first.sql'), '-- up\n'),
      writeFile(resolve(fallback, '002_second.sql'), '-- up\n'),
      writeFile(resolve(fallback, '002_second.down.sql'), '-- down\n'),
    ]);

    assert.equal(await countForwardMigrations(backendRoot), 2);
  } finally {
    await rm(backendRoot, { recursive: true, force: true });
  }
});

test('creates an ephemeral RS256 key pair shared by the runner and backend', () => {
  const { privateKey, publicKey } = createJwtKeyPair();
  const payload = Buffer.from('tbot-rewards-live-proof');
  const signature = sign('RSA-SHA256', payload, privateKey);

  assert.match(privateKey, /^-----BEGIN PRIVATE KEY-----/);
  assert.match(publicKey, /^-----BEGIN PUBLIC KEY-----/);
  assert.equal(verify('RSA-SHA256', payload, publicKey, signature), true);
});

async function waitForExit(pid) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (!processExists(pid)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  assert.fail(`child process ${pid} survived cleanup`);
}

test('SIGTERM awaits process-group and container cleanup without leaving the current child', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'tbot-rewards-runner-'));
  const evidencePath = resolve(directory, 'cleanup.log');
  const fixture = resolve(root, 'tests/scripts/fixtures/rewards-live-signal-runner.mjs');
  const runner = spawn(process.execPath, [fixture, evidencePath], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const lines = createInterface({ input: runner.stdout });

  try {
    const firstLine = await new Promise((resolveLine) => lines.once('line', resolveLine));
    const { childPid } = JSON.parse(firstLine);
    runner.kill('SIGTERM');
    const [code, signal] = await new Promise((resolveExit) => runner.once('exit', (...args) => resolveExit(args)));

    assert.equal(signal, null);
    assert.equal(code, 143);
    assert.equal(await readFile(evidencePath, 'utf8'), 'container-cleanup\n');
    await waitForExit(childPid);
  } finally {
    lines.close();
    if (runner.exitCode === null) runner.kill('SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
});

test('cleanup kills a surviving descendant after its process-group leader exits', { skip: process.platform === 'win32' }, async () => {
  const fixture = resolve(root, 'tests/scripts/fixtures/rewards-live-descendant-leader.mjs');
  const lifecycle = createProcessLifecycle({ cleanupContainer: async () => undefined, cleanupTimeoutMs: 200 });
  const leader = lifecycle.spawnTracked(process.execPath, [fixture], { stdio: ['ignore', 'pipe', 'inherit'] });
  const lines = createInterface({ input: leader.stdout });
  const firstLine = await new Promise((resolveLine) => lines.once('line', resolveLine));
  const { descendantPid } = JSON.parse(firstLine);

  let cleanupError;
  try {
    await lifecycle.cleanup();
    await waitForExit(descendantPid);
  } finally {
    lines.close();
    try {
      process.kill(-leader.pid, 'SIGKILL');
    } catch (error) {
      if (error?.code !== 'ESRCH') cleanupError = error;
    }
  }
  if (cleanupError) throw cleanupError;
});

test('spawnBackend rejects immediately when the executable cannot be spawned', async () => {
  const lifecycle = createProcessLifecycle({ cleanupContainer: async () => undefined });
  await assert.rejects(
    lifecycle.spawnBackend(`missing-rewards-backend-${process.pid}`, []),
    (error) => error?.code === 'ENOENT',
  );
  await lifecycle.cleanup();
});

test('spawnBackend rejects EACCES before health polling can start', { skip: process.platform === 'win32' }, async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'tbot-rewards-runner-eacces-'));
  const executable = resolve(directory, 'backend');
  await writeFile(executable, '#!/bin/sh\nexit 0\n');
  await chmod(executable, 0o600);
  const lifecycle = createProcessLifecycle({ cleanupContainer: async () => undefined });

  try {
    await assert.rejects(
      lifecycle.spawnBackend(executable, []),
      (error) => error?.code === 'EACCES',
    );
    await lifecycle.cleanup();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Windows cleanup escalates from task tree termination to forced tree termination', async () => {
  const killCalls = [];
  let child;
  const lifecycle = createProcessLifecycle({
    cleanupContainer: async () => undefined,
    cleanupTimeoutMs: 50,
    platform: 'win32',
    killWindowsTree: async (pid, force) => {
      killCalls.push({ pid, force });
      if (force) child.kill('SIGKILL');
    },
  });
  child = lifecycle.spawnTracked(process.execPath, [
    '-e',
    "process.on('SIGTERM',()=>{}); process.stdout.write('ready\\n'); setInterval(()=>{},1000)",
  ], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolveReady) => child.stdout.once('data', resolveReady));

  try {
    await lifecycle.cleanup();
    assert.deepEqual(killCalls, [
      { pid: child.pid, force: false },
      { pid: child.pid, force: true },
    ]);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});

test('Windows cleanup falls back to forced tree termination when graceful taskkill fails', async () => {
  const killCalls = [];
  let child;
  const lifecycle = createProcessLifecycle({
    cleanupContainer: async () => undefined,
    platform: 'win32',
    killWindowsTree: async (pid, force) => {
      killCalls.push({ pid, force });
      if (!force) throw new Error('graceful taskkill failed');
      child.kill('SIGKILL');
    },
  });
  child = lifecycle.spawnTracked(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });

  try {
    await lifecycle.cleanup();
    assert.deepEqual(killCalls, [
      { pid: child.pid, force: false },
      { pid: child.pid, force: true },
    ]);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});

test('completed cleanup does not retain the process for the grace timeout', async () => {
  const fixture = resolve(root, 'tests/scripts/fixtures/rewards-live-cleanup-timer.mjs');
  const result = spawnSync(process.execPath, [fixture], { encoding: 'utf8', timeout: 3_000 });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'cleanup-complete\n');
});

test('runner and lifecycle helper pass Node syntax validation', () => {
  for (const file of [
    'scripts/run-rewards-live-e2e.mjs',
    'scripts/_lib/rewards-live-process-lifecycle.mjs',
  ]) {
    const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});
