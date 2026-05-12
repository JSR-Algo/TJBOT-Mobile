#!/usr/bin/env node
// per-surface-count.mjs — AC-11: each consumer surface has ≥1 sequence file.
//
// Reads frontmatter `surface:` from every docs/sequences/**/*.sequence.mmd.
// Required surfaces (per plan §6 + AC-11):
//   mobile, device, admin, internal-RPC, webhook-inbound, cron
// `multi` (used by _cross/) and `factory`/`CI` are accepted but not required.
//
// Exit 0 if every required surface has ≥1; non-zero otherwise.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrontmatter } from './parse-frontmatter.mjs';

const REQUIRED = ['mobile', 'device', 'admin', 'internal-RPC', 'webhook-inbound', 'cron'];

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, '..', '..', '..');
const SEQ_DIR = path.join(PROJECT_ROOT, 'docs', 'sequences');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && p.endsWith('.sequence.mmd')) out.push(p);
  }
  return out;
}

export function countSurfaces() {
  const counts = Object.fromEntries(REQUIRED.map(s => [s, 0]));
  const extras = {};
  for (const p of walk(SEQ_DIR)) {
    let fm;
    try { fm = readFrontmatter(p).data; } catch { continue; }
    const s = fm.surface;
    if (!s) continue;
    if (s in counts) counts[s]++;
    else extras[s] = (extras[s] || 0) + 1;
  }
  return { counts, extras };
}

function main() {
  const { counts, extras } = countSurfaces();
  let fail = false;
  for (const s of REQUIRED) {
    const n = counts[s];
    if (n < 1) { console.error(`[surface-check] FAIL: surface "${s}" has 0 files (need ≥1)`); fail = true; }
    else console.log(`[surface-check] ${s}: ${n}`);
  }
  for (const [s, n] of Object.entries(extras)) {
    console.log(`[surface-check] (extra) ${s}: ${n}`);
  }
  if (fail) process.exit(1);
  console.log('[surface-check] OK');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
