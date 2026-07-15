import { randomInt } from 'crypto';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  buildBackendEnvironment,
  buildProofEnvironment,
  createProcessLifecycle,
  createSecretLeakScanner,
  extractListeningPort,
  fetchWithTimeout,
  finalizeProofRun,
  hasProcessExited,
  loadBackendDevelopmentKeyPair,
  removeContainerIfPresent,
} from './_lib/rewards-live-process-lifecycle.mjs';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = resolve(
  process.env.TBOT_BACKEND_WORKTREE
    ?? resolve(mobileRoot, '../../tbot-backend/mobile-robot-rewards'),
);
const containerName = `tbot-rewards-live-${process.pid}`;
const postgresImage = process.env.TBOT_REWARDS_POSTGRES_IMAGE ?? 'postgres:16-alpine';
const proofEnvironment = buildProofEnvironment({ baseEnv: process.env });
const pairingCode = String(randomInt(0, 1_000_000)).padStart(6, '0');
let backendProcess;
let primaryError;
const backendLogTail = [];
const backendLeakScanners = [];
const lifecycle = createProcessLifecycle({ cleanupContainer: removeContainer });
const { output, run } = lifecycle;

function removeContainer() {
  return removeContainerIfPresent({
    containerName,
    output,
    env: proofEnvironment,
  });
}

function backendLogText() {
  return backendLogTail.join('').replaceAll(pairingCode, '[REDACTED_PAIRING_CODE]');
}

async function waitForDatabase() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      await output('docker', [
        'exec', '-e', 'PGCONNECT_TIMEOUT=1', containerName,
        'psql', '-X', '-U', 'tbot', '-d', 'tbot', '-Atqc', 'SELECT 1',
      ], {
        env: proofEnvironment,
        timeout: Math.min(1_000, Math.max(1, deadline - Date.now())),
      });
      return;
    } catch {
      const delayMs = Math.min(500, Math.max(0, deadline - Date.now()));
      if (delayMs > 0) await new Promise((resolveWait) => setTimeout(resolveWait, delayMs));
    }
  }
  throw new Error('Disposable PostgreSQL did not become queryable');
}

async function waitForBackendPort() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (hasProcessExited(backendProcess)) {
      throw new Error(
        `Backend exited before reporting its listening port (${backendProcess.exitCode ?? backendProcess.signalCode})\n${backendLogText()}`,
      );
    }
    const port = extractListeningPort(backendLogText());
    if (port !== null) return port;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Backend listening-port discovery timed out\n${backendLogText()}`);
}

async function waitForBackend(apiUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (hasProcessExited(backendProcess)) {
      throw new Error(
        `Backend exited before health check passed (${backendProcess.exitCode ?? backendProcess.signalCode})\n${backendLogText()}`,
      );
    }
    try {
      const response = await fetchWithTimeout(`${apiUrl}/health`, 500);
      if (response.status === 200) return;
    } catch {
      // The socket is expected to reject while Nest is booting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Backend health check timed out\n${backendLogText()}`);
}

function captureBackendLogs(stream) {
  const leakScanner = createSecretLeakScanner(pairingCode);
  backendLeakScanners.push(leakScanner);
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    leakScanner.scan(chunk);
    backendLogTail.push(chunk);
    if (backendLogTail.length > 80) backendLogTail.shift();
  });
}

async function startBackend(databaseUrl, jwtPrivateKey, jwtPublicKey) {
  backendLogTail.length = 0;
  backendProcess = lifecycle.spawnBackend('npm', ['start'], {
    cwd: backendRoot,
    env: buildBackendEnvironment({
      baseEnv: process.env,
      databaseUrl,
      backendPort: 0,
      jwtPrivateKey,
      jwtPublicKey,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  captureBackendLogs(backendProcess.stdout);
  captureBackendLogs(backendProcess.stderr);

  const backendPort = await waitForBackendPort();
  const apiUrl = `http://127.0.0.1:${backendPort}/v1`;
  await waitForBackend(apiUrl);
  return apiUrl;
}

lifecycle.installSignalHandlers();

try {
  await output('docker', [
    'run', '--rm', '-d', '--name', containerName,
    '-e', 'POSTGRES_USER=tbot',
    '-e', 'POSTGRES_PASSWORD=tbot',
    '-e', 'POSTGRES_DB=tbot',
    '-p', '127.0.0.1::5432',
    postgresImage,
  ], { env: proofEnvironment });
  await waitForDatabase();

  const postgresPortOutput = await output('docker', ['port', containerName, '5432/tcp'], {
    env: proofEnvironment,
  });
  const postgresPort = postgresPortOutput.match(/:(\d+)$/)?.[1];
  if (!postgresPort) throw new Error(`Unable to parse PostgreSQL port from ${postgresPortOutput}`);
  const databaseUrl = `postgresql://tbot:tbot@127.0.0.1:${postgresPort}/tbot`;

  await run('npm', ['run', 'migrate'], {
    cwd: backendRoot,
    env: buildProofEnvironment({ baseEnv: proofEnvironment, overrides: { DATABASE_URL: databaseUrl } }),
  });
  await run('npm', ['run', 'build'], { cwd: backendRoot, env: proofEnvironment });

  const { privateKey: jwtPrivateKey, publicKey: jwtPublicKey } = loadBackendDevelopmentKeyPair({
    backendRoot,
  });
  const apiUrl = await startBackend(databaseUrl, jwtPrivateKey, jwtPublicKey);

  await run('npm', ['run', 'test:integration:rewards:live'], {
    cwd: mobileRoot,
    env: buildProofEnvironment({
      baseEnv: proofEnvironment,
      overrides: {
        TBOT_API_URL: apiUrl,
        TBOT_BACKEND_PRIVATE_KEY_PEM: jwtPrivateKey,
        TBOT_BACKEND_WORKTREE: backendRoot,
        TBOT_REWARDS_LIVE: '1',
        TBOT_REWARDS_PAIRING_CODE: pairingCode,
        TBOT_REWARDS_POSTGRES_CONTAINER: containerName,
      },
    }),
  });
} catch (error) {
  primaryError = error;
}

let finalError;
try {
  await finalizeProofRun({
    cleanup: lifecycle.cleanup,
    primaryError,
    hasSecretLeak: () => backendLeakScanners.some((scanner) => scanner.hasSecretLeak()),
    reportCleanupError: (error) => process.stderr.write(`\nCleanup also failed: ${error.message}\n`),
  });
} catch (error) {
  finalError = error;
}
if (finalError) {
  if (backendLogTail.length > 0) process.stderr.write(`\nBackend log tail:\n${backendLogText()}`);
  throw finalError;
}
console.info('Rewards live proof passed: 102 migrations, real Nest HTTP/JWT, two households, one persisted reward.');
