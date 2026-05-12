#!/usr/bin/env node
// AC6: per UC enum subset of {cancel,error,retry,timeout,unauthorized,validation,n/a}, rationale ≥20 chars.
// n/a rationale must contain a keyword from {stateless, single-step, no-async, view-only, terminal}.
// n/a ratio per domain ≤ 50%.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DOCS_ROOT, APP_ROOT } from '../_lib/paths.mjs';

const ROOT = DOCS_ROOT;
const DOMAINS = resolve(ROOT, 'usecases/domains');
const ENUM = new Set(['cancel', 'error', 'retry', 'timeout', 'unauthorized', 'validation', 'n/a']);
const NA_KEYWORDS = ['stateless', 'single-step', 'no-async', 'view-only', 'terminal'];

let failed = 0;
let checked = 0;
for (const d of readdirSync(DOMAINS)) {
  const path = resolve(DOMAINS, d, 'edge-cases.md');
  if (!existsSync(path)) continue;
  const txt = readFileSync(path, 'utf8');
  const sections = txt.split(/^## (UC-[A-Z]{1,6}\d+)/m).slice(1);
  let naCount = 0, totalUC = 0;
  for (let i = 0; i < sections.length; i += 2) {
    const id = sections[i];
    const body = sections[i + 1] ?? '';
    totalUC++;
    checked++;
    // Each mode line must look like "- mode: rationale" or "- **mode** — rationale"
    const modeLines = [...body.matchAll(/^[-*]\s+(?:\*\*)?(\S[^*\n]*?)(?:\*\*)?\s*[:—-]\s*(.+)$/gm)];
    let modes = 0;
    for (const m of modeLines) {
      const mode = m[1].trim().toLowerCase();
      if (!ENUM.has(mode)) continue;
      modes++;
      const rationale = m[2].trim();
      if (rationale.length < 20) {
        console.error(`FAIL ${d}/${id}: mode "${mode}" rationale <20 chars: "${rationale}"`); failed++;
      }
      if (mode === 'n/a') {
        naCount++;
        if (!NA_KEYWORDS.some(k => rationale.toLowerCase().includes(k))) {
          console.error(`FAIL ${d}/${id}: n/a rationale missing justification keyword from {${NA_KEYWORDS.join(',')}}: "${rationale}"`); failed++;
        }
      }
    }
    if (modes === 0) { console.error(`FAIL ${d}/${id}: no enum modes declared`); failed++; }
  }
  if (totalUC > 0 && (naCount / totalUC) > 0.5) {
    console.error(`FAIL ${d}: n/a ratio ${naCount}/${totalUC} = ${(naCount/totalUC*100).toFixed(0)}% > 50% (D5 cap)`); failed++;
  }
}
console.log(`check-edge-case-enum: checked=${checked}, failures=${failed}`);
process.exit(failed ? 1 : 0);
