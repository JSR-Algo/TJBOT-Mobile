#!/usr/bin/env node
// AC1 (count=154) + AC11 (subset of legacy) + AC14 (alias completeness ≥95% of (154−no_puml)).
// Pure ESM, node-only deps. Exit 0 on pass, 1 on fail.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DOCS_ROOT, APP_ROOT } from '../_lib/paths.mjs';

const ROOT = DOCS_ROOT;
const LEGACY = resolve(ROOT, 'architecture/use-case-diagram.md');
const INDEX = resolve(ROOT, 'usecases/reference/use-case-index.json');
const OVR = resolve(ROOT, 'usecases/reference/alias-overrides.json');

function fail(msg) { console.error(`FAIL ${msg}`); process.exit(1); }
function ok(msg) { console.log(`PASS ${msg}`); }

const idx = JSON.parse(readFileSync(INDEX, 'utf8'));
const ovr = JSON.parse(readFileSync(OVR, 'utf8'));

// AC1: count == 154
if (idx.entries.length !== 154)
  fail(`AC1 count=${idx.entries.length}, expected 154`);
ok(`AC1 count=154`);

// AC11: keys subset of legacy
const legacyIds = new Set();
for (const line of readFileSync(LEGACY, 'utf8').split('\n')) {
  const m = line.match(/^- (UC-[A-Z]{1,6}\d+)\b/);
  if (m) legacyIds.add(m[1]);
}
const indexIds = new Set(idx.entries.map(e => e.id));
const invented = [...indexIds].filter(id => !legacyIds.has(id));
if (invented.length) fail(`AC11 invented IDs: ${invented.join(',')}`);
const missing = [...legacyIds].filter(id => !indexIds.has(id));
if (missing.length) fail(`AC11 missing legacy IDs: ${missing.join(',')}`);
ok(`AC11 keys ⊂ legacy (${legacyIds.size} legacy IDs covered)`);

// AC14: alias completeness ≥ 95% of (154 − no_puml)
const noPuml = ovr.overrides.filter(o => o.override === 'no-puml').map(o => o.id);
const denom = idx.entries.length - noPuml.length;
const matched = idx.entries.filter(e => Array.isArray(e.aliases) && e.aliases.length > 0).length;
const ratio = denom > 0 ? matched / denom : 1;
if (ratio < 0.95)
  fail(`AC14 alias completeness ${(ratio * 100).toFixed(1)}% < 95% (matched=${matched}, denominator=${denom}, no-puml=${noPuml.length})`);
ok(`AC14 alias completeness ${(ratio * 100).toFixed(1)}% (matched=${matched} / denominator=${denom}, no-puml=${noPuml.length})`);

// AC14 strict-fuzzy: every entry without alias has an override
const overrideIds = new Set(ovr.overrides.map(o => o.id));
const unresolved = idx.entries.filter(e => e.aliases.length === 0 && !overrideIds.has(e.id));
if (unresolved.length)
  fail(`AC14 entries missing alias AND override: ${unresolved.map(e => e.id).join(',')}`);
ok(`AC14 every unmapped UC has an override entry`);

// AC14 ambiguous overrides have a decision
const undecided = ovr.overrides.filter(o => Object.hasOwn(o, 'decision') && o.decision === '');
if (undecided.length)
  console.error(`WARN ${undecided.length} ambiguous overrides need manual decision: ${undecided.map(o => o.id).join(',')}`);

console.log('check-index-coverage: OK');
