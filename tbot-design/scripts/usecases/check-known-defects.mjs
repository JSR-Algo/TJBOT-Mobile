#!/usr/bin/env node
// AC12: KD1..KD14 entries present + verbatim §4 mirror of legacy doc.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const KD_FILE = resolve(ROOT, 'docs/usecases/reference/known-defects.md');
const LEGACY = resolve(ROOT, 'docs/architecture/use-case-diagram.md');

if (!existsSync(KD_FILE)) { console.error(`FAIL ${KD_FILE} missing`); process.exit(1); }
if (!existsSync(LEGACY)) { console.error(`FAIL ${LEGACY} missing`); process.exit(1); }

const kd = readFileSync(KD_FILE, 'utf8');
let failed = 0;

// 1. KD1..KD14 markers
for (let i = 1; i <= 14; i++) {
  if (!kd.includes(`KD${i}`)) { console.error(`FAIL missing KD${i}`); failed++; }
}

// 2. Legacy §4 mirror — extract §4 table rows from legacy and verify each is in KD file
const legacy = readFileSync(LEGACY, 'utf8');
const sec4 = legacy.split(/^## 4\. ASSUMPTIONS CHECK/m)[1];
if (!sec4) { console.error('FAIL legacy §4 section not found'); failed++; }
else {
  const sec4Until5 = sec4.split(/^## /m)[0];
  // Pull table rows: lines starting with '| ' but not header/separator
  const rows = sec4Until5.split('\n').filter(l => /^\|\s+[A-Z`]/i.test(l) && !/^\|\s*-+/.test(l));
  let missingRows = 0;
  for (const row of rows) {
    // Use first cell as key
    const key = row.split('|')[1]?.trim();
    if (!key) continue;
    // Strip backticks on both sides for fuzzy presence check
    const cleanKey = key.replace(/`/g, '').slice(0, 30);
    const cleanKd = kd.replace(/`/g, '');
    if (!cleanKd.includes(cleanKey)) {
      console.error(`FAIL §4 row not mirrored: "${key}"`);
      missingRows++;
    }
  }
  if (missingRows) failed += missingRows;
}

if (failed) { console.error(`check-known-defects: failures=${failed}`); process.exit(1); }
console.log('check-known-defects: KD1..KD14 + verbatim §4 mirror OK');
