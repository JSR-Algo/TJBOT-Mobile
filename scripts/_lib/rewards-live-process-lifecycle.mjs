import { spawn } from 'child_process';
import { generateKeyPairSync } from 'crypto';
import { once } from 'events';
import { access, readdir } from 'fs/promises';
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

export function createProcessLifecycle({
  cleanupContainer,
  cleanupTimeoutMs = 5_000,
  killWindowsTree = killWindowsProcessTree,
  platform = process.platform,
}) {
  const activeChildren = new Set();
  let currentChild;
  let backendChild;
  let cleanupPromise;
  let handlingSignal = false;

  function spawnTracked(command, args, options = {}) {
    const { backend = false, ...spawnOptions } = options;
    const child = spawn(command, args, {
      ...spawnOptions,
      detached: platform !== 'win32',
    });
    activeChildren.add(child);
    currentChild = child;
    if (backend) backendChild = child;
    const release = () => {
      activeChildren.delete(child);
      if (currentChild === child) currentChild = undefined;
      if (backendChild === child) backendChild = undefined;
    };
    child.once('error', release);
    child.once('exit', release);
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

  function spawnBackend(command, args, options) {
    const child = spawnTracked(command, args, { ...options, backend: true });
    return new Promise((resolveBackend, reject) => {
      child.once('spawn', () => resolveBackend(child));
      child.once('error', reject);
    });
  }

  function sendPosixSignal(child, signal) {
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }

  function processGroupExists(child) {
    try {
      process.kill(-child.pid, 0);
      return true;
    } catch (error) {
      if (error?.code === 'ESRCH') return false;
      if (error?.code === 'EPERM') return true;
      throw error;
    }
  }

  function childIsRunning(child) {
    return child.exitCode === null && child.signalCode === null;
  }

  function waitForChild(child) {
    if (!childIsRunning(child)) return Promise.resolve(false);
    return new Promise((resolveWait) => {
      let cleanupTimer;
      const finish = (timedOut) => {
        child.removeListener('exit', onExit);
        if (cleanupTimer) {
          cleanupTimer.unref();
          clearTimeout(cleanupTimer);
        }
        resolveWait(timedOut);
      };
      const onExit = () => finish(false);
      child.once('exit', onExit);
      cleanupTimer = setTimeout(() => finish(true), cleanupTimeoutMs);
      cleanupTimer.unref();
    });
  }

  function waitForProcessGroup(child) {
    return new Promise((resolveWait) => {
      let cleanupTimer;
      const pollTimer = setInterval(() => {
        if (!processGroupExists(child)) finish(false);
      }, 10);
      const finish = (timedOut) => {
        clearInterval(pollTimer);
        if (cleanupTimer) {
          cleanupTimer.unref();
          clearTimeout(cleanupTimer);
        }
        resolveWait(timedOut);
      };
      cleanupTimer = setTimeout(() => finish(true), cleanupTimeoutMs);
      cleanupTimer.unref();
    });
  }

  async function terminatePosix(child) {
    if (!child || !processGroupExists(child)) return;
    sendPosixSignal(child, 'SIGTERM');
    const timedOut = await waitForProcessGroup(child);
    if (timedOut && processGroupExists(child)) {
      sendPosixSignal(child, 'SIGKILL');
      if (child.exitCode === null && child.signalCode === null) {
        await once(child, 'exit').catch(() => undefined);
      }
    }
  }

  async function terminateWindows(child) {
    if (!child || !childIsRunning(child)) return;
    try {
      await killWindowsTree(child.pid, false);
    } catch {
      await killWindowsTree(child.pid, true);
      if (childIsRunning(child)) await once(child, 'exit');
      return;
    }
    const timedOut = await waitForChild(child);
    if (timedOut && childIsRunning(child)) {
      await killWindowsTree(child.pid, true);
      await once(child, 'exit').catch(() => undefined);
    }
  }

  function terminate(child) {
    return platform === 'win32' ? terminateWindows(child) : terminatePosix(child);
  }

  function cleanup() {
    if (cleanupPromise) return cleanupPromise;
    cleanupPromise = (async () => {
      const first = currentChild;
      await terminate(first);
      if (backendChild !== first) await terminate(backendChild);
      for (const child of [...activeChildren]) await terminate(child);
      await cleanupContainer();
    })();
    return cleanupPromise;
  }

  function installSignalHandlers() {
    for (const signal of Object.keys(signalExitCodes)) {
      process.once(signal, async () => {
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
