import { spawn } from 'child_process';
import { createPublicKey, generateKeyPairSync } from 'crypto';
import { once } from 'events';
import { access, readdir } from 'fs/promises';
import { createRequire } from 'module';
import { resolve } from 'path';

const signalExitCodes = { SIGINT: 130, SIGTERM: 143 };

export function createJwtKeyPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
}

export async function countForwardMigrations(backendRoot) {
  const candidateDirs = [
    resolve(backendRoot, 'src/database/migrations'),
    resolve(backendRoot, 'migrations'),
  ];
  let migrationsDir;
  for (const candidate of candidateDirs) {
    try {
      await access(candidate);
      migrationsDir = candidate;
      break;
    } catch {
      // Match the backend migration runner's first-existing-candidate behavior.
    }
  }
  if (!migrationsDir) throw new Error('Migrations directory not found');

  const files = await readdir(migrationsDir);
  return files.filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql')).length;
}

export function removeDockerContainer(containerName, { spawnProcess = spawn } = {}) {
  return new Promise((resolveCleanup, reject) => {
    const child = spawnProcess('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveCleanup();
        return;
      }
      reject(new Error(`docker rm -f ${containerName} exited with ${code ?? signal ?? 'unknown status'}`));
    });
  });
}

function killWindowsProcessTree(pid, force) {
  return new Promise((resolveKill, reject) => {
    const args = ['/PID', String(pid), '/T'];
    if (force) args.push('/F');
    const killer = spawn('taskkill', args, { stdio: 'ignore', windowsHide: true });
    killer.once('error', reject);
    killer.once('exit', (code) => {
      if (code === 0 || code === 128) {
        resolveKill();
        return;
      }
      reject(new Error(`taskkill exited with ${code ?? 'unknown status'}`));
    });
  });
}
const inheritedJwtKeys = new Set([
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'JWT_PRIVATE_KEY_PATH',
  'JWT_PRIVATE_KEY_PEM',
  'TBOT_BACKEND_PRIVATE_KEY_PEM',
]);

function isInheritedSigningSecret(key) {
  const normalized = key.toUpperCase();
  return inheritedJwtKeys.has(normalized)
    || /^JWT_.*(?:KEY|SECRET|PEM|PATH)$/.test(normalized)
    || /(?:^|_)PRIVATE_KEY(?:_|$)/.test(normalized)
    || (/(?:^|_)(?:ADMIN|SIGNING)(?:_|$)/.test(normalized)
      && /(?:KEY|SECRET|PEM)/.test(normalized));
}

export function buildProofEnvironment({ baseEnv, overrides = {} }) {
  const environment = {};
  for (const [key, value] of Object.entries(baseEnv)) {
    if (!isInheritedSigningSecret(key)) environment[key] = value;
  }
  return { ...environment, ...overrides };
}

export function buildBackendEnvironment({
  baseEnv,
  databaseUrl,
  backendPort,
  jwtPrivateKey,
  jwtPublicKey,
}) {
  return buildProofEnvironment({
    baseEnv,
    overrides: {
      DATABASE_URL: databaseUrl,
      JWT_PRIVATE_KEY: jwtPrivateKey,
      JWT_PUBLIC_KEY: jwtPublicKey,
      NODE_ENV: 'development',
      PORT: String(backendPort),
      SWAGGER_ENABLED: 'false',
    },
  });
}

export function loadBackendDevelopmentKeyPair({ backendRoot }) {
  const environmentKeys = ['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'JWT_PRIVATE_KEY_PATH', 'JWT_PRIVATE_KEY_PEM', 'NODE_ENV'];
  const inheritedValues = new Map(environmentKeys.map((key) => [key, process.env[key]]));
  let privateKey;

  try {
    for (const key of environmentKeys) delete process.env[key];
    process.env.NODE_ENV = 'development';
    const require = createRequire(import.meta.url);
    const authService = require(resolve(backendRoot, 'dist/identity/auth.service.js'));
    privateKey = authService._getPrivateKeyForTest();
  } finally {
    for (const [key, value] of inheritedValues) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
  return { privateKey, publicKey };
}

export async function removeContainerIfPresent({ containerName, output, env }) {
  try {
    await output('docker', ['rm', '-f', containerName], { env, timeout: 5_000 });
  } catch (error) {
    if (!/No such container/i.test(error?.message ?? '')) throw error;
  }
}

export async function cleanupPreservingPrimaryError({
  cleanup,
  primaryError,
  reportCleanupError = () => undefined,
}) {
  try {
    await cleanup();
  } catch (cleanupError) {
    if (!primaryError) throw cleanupError;
    reportCleanupError(cleanupError);
  }
  if (primaryError) throw primaryError;
}

export function createSecretLeakScanner(secret) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new TypeError('Secret leak scanner requires a non-empty string');
  }
  let overlap = '';
  let leaked = false;

  return {
    scan(chunk) {
      const combined = overlap + String(chunk);
      if (combined.includes(secret)) leaked = true;
      overlap = combined.slice(-(secret.length - 1));
    },
    hasSecretLeak() {
      return leaked;
    },
  };
}

export async function finalizeProofRun({
  cleanup,
  primaryError,
  hasSecretLeak = () => false,
  reportCleanupError = () => undefined,
}) {
  let cleanupError;
  try {
    await cleanup();
  } catch (error) {
    cleanupError = error;
  }

  const secretLeaked = hasSecretLeak();
  if (primaryError) {
    if (cleanupError) reportCleanupError(cleanupError);
    throw primaryError;
  }
  if (cleanupError) throw cleanupError;
  if (secretLeaked) {
    throw new Error('Backend logs exposed the runner-supplied pairing code');
  }
}

export function fetchWithTimeout(url, timeoutMs, fetchImpl = fetch) {
  return fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
}

export function hasProcessExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

export function extractListeningPort(logText) {
  const port = Number(logText.match(/tbot-backend listening on port (\d+)/)?.[1]);
  return Number.isInteger(port) && port > 0 ? port : null;
}

export function createProcessLifecycle({
  cleanupContainer,
  cleanupTimeoutMs = 5_000,
  killWindowsTree = killWindowsProcessTree,
  platform = process.platform,
  signalProcessGroup = process.kill,
}) {
  const activeChildren = new Set();
  const processGroups = new WeakMap();
  const closePromises = new WeakMap();
  let currentChild;
  let backendChild;
  let cleanupPromise;
  let handlingSignal = false;
  let signalHandlersInstalled = false;

  function spawnTracked(command, args, options = {}) {
    const { backend = false, ...spawnOptions } = options;
    const child = spawn(command, args, {
      ...spawnOptions,
      detached: platform !== 'win32',
    });
    if (platform !== 'win32' && child.pid !== undefined) {
      processGroups.set(child, { id: child.pid, owned: true, child });
    }
    const closePromise = new Promise((resolveClose) => {
      let closeSettled = false;
      const settleClose = (error) => {
        if (closeSettled) return;
        closeSettled = true;
        resolveClose({ error });
      };
      child.once('close', () => settleClose(undefined));
      child.once('error', settleClose);
    });
    closePromises.set(child, closePromise);
    activeChildren.add(child);
    currentChild = child;
    if (backend) backendChild = child;
    const release = () => {
      activeChildren.delete(child);
      if (currentChild === child) currentChild = undefined;
      if (backendChild === child) backendChild = undefined;
    };
    void closePromise.then(release);
    return child;
  }

  function run(command, args, options = {}) {
    return new Promise((resolveRun, reject) => {
      const child = spawnTracked(command, args, {
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

  function output(command, args, options = {}) {
    return new Promise((resolveOutput, reject) => {
      const child = spawnTracked(command, args, {
        cwd: options.cwd,
        env: options.env ?? process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let settled = false;
      let timeoutId;
      const settle = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        callback(value);
      };
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.once('error', (error) => settle(reject, error));
      child.once('exit', (code, signal) => {
        if (code === 0) {
          settle(resolveOutput, stdout.trim());
          return;
        }
        settle(reject, new Error(`${command} exited with ${code ?? signal ?? 'unknown status'}: ${stderr.trim()}`));
      });
      if (options.timeout !== undefined) {
        timeoutId = setTimeout(async () => {
          if (settled) return;
          settled = true;
          try {
            await terminate(child);
            await waitForCloseAndStreamDrain(child);
          } catch {
            // The deadline error remains authoritative after best-effort escalation.
          }
          reject(new Error(`${command} timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  function spawnBackend(command, args, options) {
    const child = spawnTracked(command, args, { ...options, backend: true });
    return new Promise((resolveBackend, reject) => {
      child.once('spawn', () => resolveBackend(child));
      child.once('error', reject);
    });
  }

  function sendProcessGroupSignal(group, signal) {
    if (!group.owned) return false;
    try {
      signalProcessGroup(-group.id, signal);
      return true;
    } catch (error) {
      if (error?.code === 'EPERM') {
        if (signal !== 0) throw error;
        if (!hasProcessExited(group.child)) return true;
      }
      if (error?.code !== 'ESRCH' && error?.code !== 'EPERM') throw error;
      group.owned = false;
      return false;
    }
  }

  async function waitForProcessGroupExit(group) {
    const deadline = Date.now() + cleanupTimeoutMs;
    while (Date.now() < deadline) {
      if (!sendProcessGroupSignal(group, 0)) return true;
      await new Promise((resolveWait) => setTimeout(resolveWait, Math.min(25, deadline - Date.now())));
    }
    return !sendProcessGroupSignal(group, 0);
  }

  async function terminateWindowsChild(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const gracefulExit = once(child, 'exit').catch(() => undefined);
    try {
      await killWindowsTree(child.pid, false);
    } catch {
      // Forced tree termination below is the fallback for a failed graceful taskkill.
    }
    await Promise.race([
      gracefulExit,
      new Promise((resolveWait) => setTimeout(resolveWait, cleanupTimeoutMs)),
    ]);
    if (child.exitCode === null && child.signalCode === null) {
      const forcedExit = once(child, 'exit').catch(() => undefined);
      await killWindowsTree(child.pid, true);
      await Promise.race([
        forcedExit,
        new Promise((resolveWait) => setTimeout(resolveWait, cleanupTimeoutMs)),
      ]);
    }
  }

  async function terminate(child) {
    if (!child) return;
    if (platform === 'win32') {
      await terminateWindowsChild(child);
      return;
    }

    const group = processGroups.get(child);
    if (!group || !sendProcessGroupSignal(group, 'SIGTERM')) return;
    if (await waitForProcessGroupExit(group)) return;
    if (!sendProcessGroupSignal(group, 'SIGKILL')) return;
    await waitForProcessGroupExit(group);
  }

  async function waitForCloseAndStreamDrain(child) {
    const closePromise = closePromises.get(child);
    if (!closePromise) return;
    let timeoutId;
    try {
      const result = await Promise.race([
        closePromise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Timed out waiting ${cleanupTimeoutMs}ms for child close and stream drain`));
          }, cleanupTimeoutMs);
        }),
      ]);
      if (result.error) throw result.error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function cleanup() {
    if (cleanupPromise) return cleanupPromise;
    cleanupPromise = (async () => {
      const errors = [];
      const first = currentChild;
      const children = new Set([first, backendChild, ...activeChildren]);
      children.delete(undefined);
      for (const child of children) {
        let terminated = true;
        try {
          await terminate(child);
        } catch (error) {
          terminated = false;
          errors.push(error);
        }
        if (terminated) {
          try {
            await waitForCloseAndStreamDrain(child);
          } catch (error) {
            errors.push(error);
          }
        }
      }
      try {
        await cleanupContainer();
      } catch (error) {
        errors.push(error);
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, errors.map((error) => error.message).join('; '));
      }
    })();
    return cleanupPromise;
  }

  function installSignalHandlers() {
    if (signalHandlersInstalled) return;
    signalHandlersInstalled = true;
    for (const signal of Object.keys(signalExitCodes)) {
      process.on(signal, async () => {
        if (handlingSignal) return;
        handlingSignal = true;
        try {
          await cleanup();
        } finally {
          process.exit(signalExitCodes[signal]);
        }
      });
    }
  }

  return { cleanup, installSignalHandlers, output, run, spawnBackend, spawnTracked };
}
