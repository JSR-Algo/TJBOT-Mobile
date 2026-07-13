import { spawn } from 'child_process';
import { once } from 'events';
import { createServer } from 'net';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = resolve(
  process.env.TBOT_BACKEND_WORKTREE
    ?? resolve(mobileRoot, '../../tbot-backend/mobile-robot-rewards'),
);
const containerName = `tbot-rewards-live-${process.pid}`;
const postgresImage = process.env.TBOT_REWARDS_POSTGRES_IMAGE ?? 'postgres:16-alpine';
let backendProcess;
let cleaningUp = false;
const backendLogTail = [];

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: options.stdio ?? 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      reject(new Error(`${command} exited with ${code ?? signal ?? 'unknown status'}`));
    });
  });
}

function output(command, args) {
  return new Promise((resolveOutput, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveOutput(stdout.trim());
        return;
      }
      reject(new Error(`${command} exited with ${code ?? signal ?? 'unknown status'}: ${stderr.trim()}`));
    });
  });
}

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

async function cleanup() {
  if (cleaningUp) return;
  cleaningUp = true;
  if (backendProcess && backendProcess.exitCode === null) {
    backendProcess.kill('SIGTERM');
    await Promise.race([
      once(backendProcess, 'exit'),
      new Promise((resolveWait) => setTimeout(resolveWait, 5_000)),
    ]);
    if (backendProcess.exitCode === null) backendProcess.kill('SIGKILL');
  }
  await run('docker', ['rm', '-f', containerName], { stdio: 'ignore' }).catch(() => undefined);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    cleanup().finally(() => process.exit(128 + (signal === 'SIGINT' ? 2 : 15)));
  });
}

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

  await run('npm', ['run', 'migrate'], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  await run('npm', ['run', 'build'], { cwd: backendRoot });

  const backendPort = await freePort();
  const apiUrl = `http://127.0.0.1:${backendPort}/v1`;
  backendProcess = spawn('npm', ['start'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'development',
      PORT: String(backendPort),
      SWAGGER_ENABLED: 'false',
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
      TBOT_BACKEND_PRIVATE_KEY: resolve(backendRoot, 'keys/dev-private.pem'),
      TBOT_BACKEND_WORKTREE: backendRoot,
      TBOT_REWARDS_LIVE: '1',
      TBOT_REWARDS_POSTGRES_CONTAINER: containerName,
    },
  });
  console.info('Rewards live proof passed: 102 migrations, real Nest HTTP/JWT, two households, one persisted reward.');
} catch (error) {
  if (backendLogTail.length > 0) process.stderr.write(`\nBackend log tail:\n${backendLogTail.join('')}`);
  throw error;
} finally {
  await cleanup();
}
