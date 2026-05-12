#!/usr/bin/env node
// AC7: no per-domain use-cases.md declares an edge whose target prefix differs from file's domain prefix.
// Allowlist: lines containing the literal `cross-domain-edges.json:` are exempt (legitimate cross-references).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DOMAINS = resolve(ROOT, 'docs/usecases/domains');
const INDEX = JSON.parse(readFileSync(resolve(ROOT, 'docs/usecases/reference/use-case-index.json'), 'utf8'));

// id → domain
const idDomain = {};
for (const e of INDEX.entries) idDomain[e.id] = e.domain;

// domain → allowed UC-ID prefixes (extract from the IDs assigned to it in the index)
const domainPrefixes = {};
for (const e of INDEX.entries) {
  const m = e.id.match(/^UC-([A-Z]{1,2})\d+$/);
  if (!m) continue;
  (domainPrefixes[e.domain] ??= new Set()).add(m[1]);
}

let failed = 0;
for (const d of readdirSync(DOMAINS)) {
  const path = resolve(DOMAINS, d, 'use-cases.md');
  if (!existsSync(path)) continue;
  const allowed = domainPrefixes[d] ?? new Set();
  const lines = readFileSync(path, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip allowlisted lines
    if (line.includes('cross-domain-edges.json:')) continue;
    // Find arrow → UC-LL-NN patterns
    const matches = [...line.matchAll(/[→]\s*(UC-([A-Z]{1,2})\d+)/g)];
    for (const m of matches) {
      const targetPrefix = m[2];
      if (!allowed.has(targetPrefix)) {
        console.error(`FAIL ${d}/use-cases.md:${i + 1}: cross-domain edge to ${m[1]} (prefix ${targetPrefix} not in allowed set {${[...allowed].join(',')}})`);
        failed++;
      }
    }
  }
}
console.log(`check-cross-domain-edges: failures=${failed}`);
process.exit(failed ? 1 : 0);
