#!/usr/bin/env node
// AC4 + AC5 STATE-BASED.
// For each domains/<d>/backend-mapping.md: parse rows; each cell must be sentinel BACKEND_NOT_DESIGNED OR a real export.
// If any non-sentinel row exists, Domain ADR Pointer column must cite an existing decisions/NNNN-backend-<d>.md file.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DOCS_ROOT, APP_ROOT } from '../_lib/paths.mjs';

const ROOT = DOCS_ROOT;
const DOMAINS = resolve(ROOT, 'usecases/domains');
const SENTINEL = 'BACKEND_NOT_DESIGNED';

// Build set of valid (file, export) tuples and store actions
function exportsOf(file) {
  if (!existsSync(file)) return new Set();
  const txt = readFileSync(file, 'utf8');
  const out = new Set();
  for (const m of txt.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) out.add(m[1]);
  for (const m of txt.matchAll(/export\s+const\s+(\w+)/g)) out.add(m[1]);
  return out;
}
const apiDir = resolve(APP_ROOT, 'src/services/api');
const storeDir = resolve(APP_ROOT, 'src/store');
const apiExports = {};
for (const f of existsSync(apiDir) ? readdirSync(apiDir) : []) {
  if (f.endsWith('.api.js') || f.endsWith('.api.ts')) apiExports[f] = exportsOf(resolve(apiDir, f));
}
const storeExports = {};
for (const f of existsSync(storeDir) ? readdirSync(storeDir) : []) {
  if (f.endsWith('.store.js')) storeExports[f] = exportsOf(resolve(storeDir, f));
}
const erdEntities = new Set();
const erdPath = resolve(ROOT, 'erd/README.md');
if (existsSync(erdPath))
  for (const m of readFileSync(erdPath, 'utf8').matchAll(/^\|\s*`?([A-Z][A-Za-z]+)`?\s*\|/gm))
    erdEntities.add(m[1]);

function cellOk(cell, kind) {
  if (cell === SENTINEL) return true;
  if (cell === '—' || cell === '-') return kind === 'adr';
  if (kind === 'adr') {
    const m = cell.match(/decisions\/[\w-]+\.md/);
    if (!m) return false;
    return existsSync(resolve(ROOT, 'docs', m[0]));
  }
  if (kind === 'endpoint') {
    // expect like `auth.api.js → login` or token containing api-file + export
    for (const [file, exps] of Object.entries(apiExports))
      for (const e of exps) if (cell.includes(file) || cell.includes(e)) return cell.includes(e);
    return false;
  }
  if (kind === 'service') {
    for (const [file, exps] of Object.entries(storeExports))
      for (const e of exps) if (cell.includes(e)) return true;
    return false;
  }
  if (kind === 'entity') {
    for (const ent of erdEntities) if (cell.includes(ent)) return true;
    return false;
  }
  return false;
}

let failed = 0;
let checked = 0;
for (const d of readdirSync(DOMAINS)) {
  const path = resolve(DOMAINS, d, 'backend-mapping.md');
  if (!existsSync(path)) continue;
  const lines = readFileSync(path, 'utf8').split('\n');
  let hasNonSentinel = false;
  for (const line of lines) {
    if (!/^\|\s*UC-/.test(line)) continue;
    checked++;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 6) { console.error(`FAIL ${d}: row has ${cells.length} cells, need 6: ${line}`); failed++; continue; }
    const [, endpoint, service, entity, events, adrPointer] = cells;
    const kinds = [['endpoint', endpoint], ['service', service], ['entity', entity]];
    for (const [k, c] of kinds) {
      if (!cellOk(c, k)) { console.error(`FAIL ${d}: cell "${c}" (${k}) is neither ${SENTINEL} nor a real reference`); failed++; }
      if (c !== SENTINEL) hasNonSentinel = true;
    }
    if (events !== SENTINEL) hasNonSentinel = true;
    if (hasNonSentinel && !cellOk(adrPointer, 'adr')) {
      console.error(`FAIL ${d}: row ${cells[0]} has non-sentinel cells but ADR Pointer "${adrPointer}" is missing/invalid`); failed++;
    }
  }
}
console.log(`check-backend-sentinel: checked=${checked}, failures=${failed}`);
process.exit(failed ? 1 : 0);
