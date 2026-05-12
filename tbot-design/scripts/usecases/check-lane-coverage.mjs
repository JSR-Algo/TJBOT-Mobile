#!/usr/bin/env node
// AC8: parse multi-agent-execution.md lane table; verify all 14 domains covered exhaustively + disjointly.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const FILE = resolve(ROOT, 'docs/usecases/reference/multi-agent-execution.md');
const DOMAINS_DIR = resolve(ROOT, 'docs/usecases/domains');

const fsDomains = new Set(readdirSync(DOMAINS_DIR).filter(d => {
  try { return existsSync(resolve(DOMAINS_DIR, d, 'use-cases.md')); } catch { return false; }
}));

if (fsDomains.size !== 14) {
  console.error(`FAIL fs domain count = ${fsDomains.size}, expected 14`);
  process.exit(1);
}

const txt = readFileSync(FILE, 'utf8');
const lines = txt.split('\n');
const seen = new Map(); // domain → lane

// Parse lane rows: | **Lane X** | `dom1`, `dom2` | ... |
for (const line of lines) {
  const m = line.match(/^\|\s*\*\*Lane\s+([A-Z])\*\*\s*\|\s*([^|]+)\|/);
  if (!m) continue;
  const lane = m[1];
  if (lane === 'Z') continue; // Lane Z is infra, not domain owner
  const cell = m[2];
  for (const d of cell.matchAll(/`([a-z][a-z-]+)`/g)) {
    const dom = d[1];
    if (seen.has(dom)) {
      console.error(`FAIL domain "${dom}" assigned to multiple lanes: Lane ${seen.get(dom)} AND Lane ${lane}`);
      process.exit(1);
    }
    seen.set(dom, lane);
  }
}

const assigned = new Set(seen.keys());
const missing = [...fsDomains].filter(d => !assigned.has(d));
const extra = [...assigned].filter(d => !fsDomains.has(d));
let failed = 0;
if (missing.length) { console.error(`FAIL domains not covered by any lane: ${missing.join(',')}`); failed++; }
if (extra.length) { console.error(`FAIL lane references unknown domains: ${extra.join(',')}`); failed++; }
if (failed) process.exit(1);
console.log(`check-lane-coverage: ${assigned.size} domains across 4 lanes, exhaustive + disjoint OK`);
