#!/usr/bin/env node
/**
 * Remote Metro dev loop for physical iPad/iPhone over the internet.
 *
 * 1. Ensures Metro is running on localhost:8081
 * 2. Opens a Cloudflare quick tunnel to Metro (HTTPS, works off-LAN)
 * 3. Auto-detects the Mac's public IP and republishes when it changes
 * 4. Stores the latest session locally + on the dev registry backend
 *
 * Usage:
 *   npm run start:remote
 *   npm run start:remote -- --no-metro
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMobileEnv } from './mobile-env.mjs';
import { resolveDevRegistryRoot } from './owned-backend-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const artifactPath = path.join(repoRoot, 'artifacts/metro-dev-session.json');
const METRO_PORT = Number(process.env.TBOT_METRO_PORT || 8081);
const WATCH_MS = Number(process.env.TBOT_METRO_SESSION_WATCH_MS || 30_000);

function printHelp() {
  console.log(`Remote Metro dev publisher

Starts (or reuses) Metro, opens a Cloudflare quick tunnel, auto-detects the Mac
public IP, and publishes the bundler host for iPad reconnect from any network.

Environment:
  TBOT_DEV_REGISTRY_URL   Registry API root (default: owned backend /v1)
  TBOT_DEV_SESSION_TOKEN  Must match backend DEV_METRO_SESSION_TOKEN
  TBOT_METRO_PORT         Metro port (default: 8081)

Artifacts:
  ${artifactPath}
`);
}

function parseArgs(argv) {
  const options = { startMetro: true, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    if (arg === '--no-metro') options.startMetro = false;
  }
  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMetroUp() {
  const result = spawnSync('lsof', ['-i', `:${METRO_PORT}`], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function startMetro(env) {
  if (isMetroUp()) {
    console.log(`[remote-dev] Metro already listening on :${METRO_PORT}`);
    return null;
  }
  console.log(`[remote-dev] Starting Metro on :${METRO_PORT}`);
  return spawn('npx', ['react-native', 'start', '--port', String(METRO_PORT)], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });
}

async function fetchPublicIp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    if (!res.ok) throw new Error(`ipify status ${res.status}`);
    const body = await res.json();
    if (!body?.ip) throw new Error('ipify missing ip');
    return String(body.ip);
  } finally {
    clearTimeout(timer);
  }
}

function parseTunnelUrl(chunk) {
  const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  return match ? match[0] : null;
}

function startCloudflaredTunnel() {
  const cloudflared = spawn(
    'cloudflared',
    ['tunnel', '--url', `http://127.0.0.1:${METRO_PORT}`, '--no-autoupdate'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('cloudflared tunnel URL not received within 60s'));
      }
    }, 60_000);

    const onData = (chunk) => {
      process.stderr.write(chunk);
      const url = parseTunnelUrl(chunk);
      if (url && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ process: cloudflared, tunnelUrl: url });
      }
    };

    cloudflared.stdout.on('data', onData);
    cloudflared.stderr.on('data', onData);
    cloudflared.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
    cloudflared.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`cloudflared exited ${code ?? 'unknown'}`));
      }
    });
  });
}

function resolveRegistryRoot() {
  return resolveDevRegistryRoot(process.env);
}

function bundlerHostFromTunnel(tunnelUrl) {
  const parsed = new URL(tunnelUrl);
  return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
}

async function publishSession(session) {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(session, null, 2)}\n`);

  const token = process.env.TBOT_DEV_SESSION_TOKEN?.trim();
  const registryRoot = resolveRegistryRoot();
  if (!token) {
    console.warn('[remote-dev] TBOT_DEV_SESSION_TOKEN unset — wrote local artifact only');
    return { published: false, registryRoot };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${registryRoot}/dev/metro-session`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-dev-session-token': token,
      },
      body: JSON.stringify({
        public_ip: session.public_ip,
        bundler_host: session.bundler_host,
        bundler_scheme: session.bundler_scheme,
        tunnel_url: session.tunnel_url,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`registry publish ${res.status}: ${text}`);
    }
    console.log(`[remote-dev] Published session to ${registryRoot}/dev/metro-session`);
    return { published: true, registryRoot };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const env = createMobileEnv();
  const metroChild = options.startMetro ? startMetro(env) : null;
  if (options.startMetro) await sleep(2500);

  const { process: tunnelProc, tunnelUrl } = await startCloudflaredTunnel();
  const bundlerHost = bundlerHostFromTunnel(tunnelUrl);
  let lastPublicIp = null;
  let lastPublishedAt = null;

  const shutdown = () => {
    tunnelProc.kill('SIGTERM');
    if (metroChild) metroChild.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`[remote-dev] Tunnel ready: ${tunnelUrl}`);
  console.log(`[remote-dev] iPad bundler host: ${bundlerHost} (https)`);

  while (true) {
    try {
      const publicIp = await fetchPublicIp();
      const ipChanged = publicIp !== lastPublicIp;
      const session = {
        public_ip: publicIp,
        bundler_host: bundlerHost,
        bundler_scheme: 'https',
        tunnel_url: tunnelUrl,
        updated_at: new Date().toISOString(),
      };

      if (ipChanged || !lastPublishedAt) {
        await publishSession(session);
        lastPublicIp = publicIp;
        lastPublishedAt = session.updated_at;
        console.log(
          `[remote-dev] Session ${ipChanged ? 'updated (public IP changed)' : 'published'} — public_ip=${publicIp}`,
        );
      }
    } catch (error) {
      console.error(`[remote-dev] Watch loop error: ${error instanceof Error ? error.message : String(error)}`);
    }

    await sleep(WATCH_MS);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});