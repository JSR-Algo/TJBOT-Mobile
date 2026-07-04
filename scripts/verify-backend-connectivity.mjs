#!/usr/bin/env node
/**
 * Smoke test: mobile app's configured backend URLs respond.
 * Run: node scripts/verify-backend-connectivity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { resolveOwnedApiRoot } from './runtime/owned-backend-url.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const envPath = path.join(repoRoot, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const apiBase = resolveOwnedApiRoot(env);

async function check(label, url, init) {
  const started = Date.now();
  const res = await fetch(url, init);
  const ms = Date.now() - started;
  const body = await res.text();
  console.log(`${label}: HTTP ${res.status} (${ms}ms)`);
  if (!res.ok && res.status !== 401 && res.status !== 400) {
    console.error(body.slice(0, 300));
    process.exitCode = 1;
  }
  return { status: res.status, body };
}

console.log('API base:', apiBase);
await check('health', `${apiBase}/health`);
await check('login (expect 401)', `${apiBase}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'mobile-smoke@test.invalid', password: 'invalid' }),
});
console.log('Backend connectivity OK');