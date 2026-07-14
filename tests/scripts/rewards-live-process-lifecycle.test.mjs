import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createPublicKey, generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as sleep } from 'node:timers/promises';
import test from 'node:test';
import * as lifecycleHelpers from '../../scripts/_lib/rewards-live-process-lifecycle.mjs';
import {
  buildBackendEnvironment,
  createProcessLifecycle,
  extractListeningPort,
  fetchWithTimeout,
  hasProcessExited,
  loadBackendDevelopmentKeyPair,
} from '../../scripts/_lib/rewards-live-process-lifecycle.mjs';

const {
  buildProofEnvironment,
  cleanupPreservingPrimaryError,
  removeContainerIfPresent,
} = lifecycleHelpers;

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

async function waitForExit(pid) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (!processExists(pid)) return;
    await sleep(100);
  }
  assert.fail(`child process ${pid} survived cleanup`);
}

for (const [signal, expectedCode] of [['SIGINT', 130], ['SIGTERM', 143]]) {
test(`${signal} awaits process-group and container cleanup without leaving the current child`, async () => {
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
    runner.kill(signal);
    await sleep(50);
    runner.kill(signal);
    const [code, exitSignal] = await new Promise((resolveExit) => runner.once('exit', (...args) => resolveExit(args)));

    assert.equal(exitSignal, null);
    assert.equal(code, expectedCode);
    assert.equal(await readFile(evidencePath, 'utf8'), 'container-cleanup\n');
    await waitForExit(childPid);
  } finally {
    lines.close();
    if (runner.exitCode === null) runner.kill('SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
});
}

test('cleanup force-kills a surviving process-group descendant after its leader exits', {
  skip: process.platform === 'win32' ? 'Windows does not expose POSIX process groups' : false,
}, async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'tbot-rewards-orphan-'));
  const evidencePath = resolve(directory, 'grandchild.pid');
  const fixture = resolve(root, 'tests/scripts/fixtures/rewards-live-orphan-runner.mjs');
  const runner = spawn(process.execPath, [fixture, evidencePath], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const lines = createInterface({ input: runner.stdout });
  let grandchildPid;

  try {
    const firstLine = await new Promise((resolveLine) => lines.once('line', resolveLine));
    ({ grandchildPid } = JSON.parse(firstLine));
    runner.kill('SIGTERM');
    const [code, exitSignal] = await new Promise((resolveExit) => runner.once('exit', (...args) => resolveExit(args)));

    assert.equal(exitSignal, null);
    assert.equal(code, 143);
    await waitForExit(grandchildPid);
  } finally {
    lines.close();
    if (runner.exitCode === null) runner.kill('SIGKILL');
    if (grandchildPid && processExists(grandchildPid)) process.kill(grandchildPid, 'SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
});

test('backend environment replaces inherited JWT key material with the exact fixture pair', () => {
  const environment = buildBackendEnvironment({
    baseEnv: {
      JWT_PRIVATE_KEY: 'conflicting-private-key',
      JWT_PUBLIC_KEY: 'conflicting-public-key',
      JWT_PRIVATE_KEY_PATH: '/tmp/conflicting-private-key.pem',
      PRESERVED: 'yes',
    },
    databaseUrl: 'postgresql://example',
    backendPort: 3210,
    jwtPrivateKey: 'matching-private-key',
    jwtPublicKey: 'matching-public-key',
  });

  assert.equal(environment.JWT_PRIVATE_KEY, 'matching-private-key');
  assert.equal(environment.JWT_PUBLIC_KEY, 'matching-public-key');
  assert.equal('JWT_PRIVATE_KEY_PATH' in environment, false);
  assert.equal(environment.PRESERVED, 'yes');
  assert.equal(environment.DATABASE_URL, 'postgresql://example');
  assert.equal(environment.PORT, '3210');
});

test('proof environment strips inherited JWT and admin signing secrets before adding fixtures', () => {
  const environment = buildProofEnvironment({
    baseEnv: {
      JWT_PRIVATE_KEY: 'jwt-private',
      JWT_PUBLIC_KEY: 'jwt-public',
      JWT_PRIVATE_KEY_PATH: '/tmp/jwt-private.pem',
      JWT_PRIVATE_KEY_PEM: 'jwt-private-pem',
      JWT_SECRET: 'jwt-secret',
      E2E_PRIVATE_KEY: 'e2e-private',
      PRIVATE_KEY: 'generic-private',
      ADMIN_PRIVATE_KEY: 'admin-private',
      ADMIN_JWT_SIGNING_SECRET: 'admin-signing',
      TOKEN_SIGNING_PRIVATE_KEY_PEM: 'token-signing-private',
      TBOT_BACKEND_PRIVATE_KEY_PEM: 'stale-fixture-private-key',
      PRESERVED: 'yes',
    },
    overrides: {
      TBOT_API_URL: 'http://127.0.0.1:3210/v1',
      TBOT_BACKEND_PRIVATE_KEY_PEM: 'fixture-private-key',
    },
  });

  assert.deepEqual(environment, {
    PRESERVED: 'yes',
    TBOT_API_URL: 'http://127.0.0.1:3210/v1',
    TBOT_BACKEND_PRIVATE_KEY_PEM: 'fixture-private-key',
  });
  assert.equal(
    'TBOT_BACKEND_PRIVATE_KEY_PEM' in buildProofEnvironment({
      baseEnv: { TBOT_BACKEND_PRIVATE_KEY_PEM: 'stale-fixture-private-key' },
    }),
    false,
  );
});

test('development keypair loads without a gitignored backend private-key file', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'tbot-rewards-keypair-'));
  const identityDirectory = resolve(directory, 'dist/identity');
  const keysDirectory = resolve(directory, 'keys');
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  try {
    await mkdir(identityDirectory, { recursive: true });
    await mkdir(keysDirectory, { recursive: true });
    await writeFile(
      resolve(identityDirectory, 'auth.service.js'),
      `exports._getPrivateKeyForTest = () => ${JSON.stringify(privateKey)};\n`,
    );
    const pair = loadBackendDevelopmentKeyPair({ backendRoot: directory });

    assert.equal(pair.privateKey, privateKey);
    assert.equal(
      pair.publicKey,
      createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }),
    );
    await assert.rejects(readFile(resolve(keysDirectory, 'dev-private.pem')), /ENOENT/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('development keypair loading temporarily overrides inherited production NODE_ENV', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'tbot-rewards-production-keypair-'));
  const identityDirectory = resolve(directory, 'dist/identity');
  const originalNodeEnv = process.env.NODE_ENV;
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  try {
    await mkdir(identityDirectory, { recursive: true });
    await writeFile(
      resolve(identityDirectory, 'auth.service.js'),
      "if (process.env.NODE_ENV !== 'development') throw new Error('development key disabled');\n"
        + `exports._getPrivateKeyForTest = () => ${JSON.stringify(privateKey)};\n`,
    );
    process.env.NODE_ENV = 'production';

    const pair = loadBackendDevelopmentKeyPair({ backendRoot: directory });

    assert.equal(pair.privateKey, privateKey);
    assert.equal(process.env.NODE_ENV, 'production');
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    await rm(directory, { recursive: true, force: true });
  }
});

test('cleanup still removes the container when process termination fails', async () => {
  let containerCleanupCount = 0;
  const lifecycle = createProcessLifecycle({
    cleanupContainer: async () => { containerCleanupCount += 1; },
    signalProcessGroup: () => {
      const error = new Error('termination denied');
      error.code = 'EPERM';
      throw error;
    },
  });
  lifecycle.spawnTracked(process.execPath, ['-e', 'setTimeout(() => {}, 1000)'], {
    stdio: 'ignore',
  });

  await assert.rejects(lifecycle.cleanup(), /termination denied/);
  assert.equal(containerCleanupCount, 1);
});

test('cleanup failure does not mask a primary run error', async () => {
  const primaryError = new Error('live proof failed');
  const reported = [];

  await assert.rejects(
    cleanupPreservingPrimaryError({
      cleanup: async () => { throw new Error('container cleanup failed'); },
      primaryError,
      reportCleanupError: (error) => reported.push(error.message),
    }),
    (error) => error === primaryError,
  );
  assert.deepEqual(reported, ['container cleanup failed']);
});

test('container cleanup tolerates an already-removed disposable container', async () => {
  await removeContainerIfPresent({
    containerName: 'missing-container',
    output: async () => { throw new Error('docker exited with 1: No such container: missing-container'); },
  });
});

test('tracked output rejects failed commands and enforces its timeout', async () => {
  const lifecycle = createProcessLifecycle({ cleanupContainer: async () => undefined });

  await assert.rejects(
    lifecycle.output(process.execPath, ['-e', "process.stderr.write('cleanup failed'); process.exit(7)"]),
    /cleanup failed/,
  );
  await assert.rejects(
    lifecycle.output(process.execPath, ['-e', 'setTimeout(() => {}, 1000)'], { timeout: 50 }),
    /SIGTERM/,
  );
  await lifecycle.cleanup();
});

test('HTTP readiness requests abort when a server does not answer', async () => {
  const hangingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    const keepAlive = setTimeout(() => undefined, 1_000);
    signal.addEventListener('abort', () => {
      clearTimeout(keepAlive);
      reject(signal.reason);
    }, { once: true });
  });

  await assert.rejects(
    fetchWithTimeout('http://127.0.0.1/health', 25, hangingFetch),
    (error) => error?.name === 'TimeoutError',
  );
});

test('signal-terminated children count as exited during readiness checks', () => {
  assert.equal(hasProcessExited({ exitCode: null, signalCode: 'SIGTERM' }), true);
  assert.equal(hasProcessExited({ exitCode: 1, signalCode: null }), true);
  assert.equal(hasProcessExited({ exitCode: null, signalCode: null }), false);
});

test('backend readiness extracts only a real nonzero listening port', () => {
  assert.equal(extractListeningPort('tbot-backend listening on port 41237'), 41237);
  assert.equal(extractListeningPort('tbot-backend listening on port 0'), null);
  assert.equal(extractListeningPort('Nest application successfully started'), null);
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
