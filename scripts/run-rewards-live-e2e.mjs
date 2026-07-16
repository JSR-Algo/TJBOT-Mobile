import { once } from 'events';
import { createServer } from 'net';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  countForwardMigrations,
  createJwtKeyPair,
  createProcessLifecycle,
  removeDockerContainer,
} from './_lib/rewards-live-process-lifecycle.mjs';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = resolve(
  process.env.TBOT_BACKEND_WORKTREE
    ?? resolve(mobileRoot, '../../tbot-backend/mobile-robot-rewards'),
);
const containerName = `tbot-rewards-live-${process.pid}`;
const postgresImage = process.env.TBOT_REWARDS_POSTGRES_IMAGE ?? 'postgres:16-alpine';
const jwtKeys = createJwtKeyPair();
let backendProcess;
let migrationCount;
const backendLogTail = [];
const lifecycle = createProcessLifecycle({
  cleanupContainer: () => removeDockerContainer(containerName),
});
const { output, run } = lifecycle;

async function freePort() {
  const server = createServer();
  server.unref();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Unable to reserve a local port');
  const port = address.port;
  server.close();
  await once(server, 'close');
  return port;
}

async function waitForDatabase() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await output('docker', [
        'exec', containerName, 'psql', '-X', '-U', 'tbot', '-d', 'tbot', '-Atqc', 'SELECT 1',
      ]);
      return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
  }
  throw new Error('Disposable PostgreSQL did not become queryable');
}

async function waitForBackend(apiUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (backendProcess.exitCode !== null) {
      throw new Error(`Backend exited before health check passed\n${backendLogTail.join('')}`);
    }
    try {
      const response = await fetch(`${apiUrl}/health`);
      if (response.status === 200) return;
    } catch {
      // The socket is expected to reject while Nest is booting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Backend health check timed out\n${backendLogTail.join('')}`);
}

function captureBackendLogs(stream) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    backendLogTail.push(chunk);
    if (backendLogTail.length > 80) backendLogTail.shift();
  });
}

lifecycle.installSignalHandlers();

try {
  await run('docker', [
    'run', '--rm', '-d', '--name', containerName,
    '-e', 'POSTGRES_USER=tbot',
    '-e', 'POSTGRES_PASSWORD=tbot',
    '-e', 'POSTGRES_DB=tbot',
    '-p', '127.0.0.1::5432',
    postgresImage,
  ], { stdio: 'ignore' });
  await waitForDatabase();

  const postgresPortOutput = await output('docker', ['port', containerName, '5432/tcp']);
  const postgresPort = postgresPortOutput.match(/:(\d+)$/)?.[1];
  if (!postgresPort) throw new Error(`Unable to parse PostgreSQL port from ${postgresPortOutput}`);
  const databaseUrl = `postgresql://tbot:tbot@127.0.0.1:${postgresPort}/tbot`;

  migrationCount = await countForwardMigrations(backendRoot);
  await run('npm', ['run', 'migrate'], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  await run('npm', ['run', 'build'], { cwd: backendRoot });

  const backendPort = await freePort();
  const apiUrl = `http://127.0.0.1:${backendPort}/v1`;
  backendProcess = await lifecycle.spawnBackend('npm', ['start'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'development',
      PORT: String(backendPort),
      SWAGGER_ENABLED: 'false',
      JWT_PRIVATE_KEY: jwtKeys.privateKey,
      JWT_PUBLIC_KEY: jwtKeys.publicKey,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  captureBackendLogs(backendProcess.stdout);
  captureBackendLogs(backendProcess.stderr);
  await waitForBackend(apiUrl);

  await run('npm', ['run', 'test:integration:rewards:live'], {
    cwd: mobileRoot,
    env: {
      ...process.env,
      TBOT_API_URL: apiUrl,
      TBOT_BACKEND_PRIVATE_KEY_PEM: jwtKeys.privateKey,
      TBOT_BACKEND_WORKTREE: backendRoot,
      TBOT_REWARDS_LIVE: '1',
      TBOT_REWARDS_POSTGRES_CONTAINER: containerName,
    },
  });
  console.info(`Rewards live proof passed: ${migrationCount} migrations, real Nest HTTP/JWT, two households, one persisted reward.`);
} catch (error) {
  if (backendLogTail.length > 0) process.stderr.write(`\nBackend log tail:\n${backendLogTail.join('')}`);
  throw error;
} finally {
  await lifecycle.cleanup();
}
