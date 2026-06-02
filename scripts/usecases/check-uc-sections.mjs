#!/usr/bin/env node
// AC2 (≥5 mandatory sections per UC, no `(none)` stubs).
// Mandatory section labels (case-insensitive on the bullet key): goal, trigger, preconditions, main flow, postconditions.
// Optional sections (alt flow / error flow) must be non-empty if present.
// Skips skeleton bodies (where every value is "_TBD_") — only checks UCs that have been started.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DOCS_ROOT, APP_ROOT } from '../_lib/paths.mjs';

const ROOT = DOCS_ROOT;
const DOMAINS = resolve(ROOT, 'usecases/domains');

const MANDATORY = ['goal', 'trigger', 'preconditions', 'main flow', 'postconditions'];
const OPTIONAL = ['alt flow', 'error flow'];

let failed = 0;
let checked = 0;
let skeletons = 0;

for (const d of readdirSync(DOMAINS)) {
  const path = resolve(DOMAINS, d, 'use-cases.md');
  try { statSync(path); } catch { continue; }
  const txt = readFileSync(path, 'utf8');
  const sections = txt.split(/^## (UC-[A-Z]{1,6}\d+) /m).slice(1);
  // sections is [id1, body1, id2, body2, ...]
  for (let i = 0; i < sections.length; i += 2) {
    const id = sections[i];
    const body = sections[i + 1] ?? '';
    // Skeleton detection: every "TBD" placeholder
    const tbdMatches = body.match(/_TBD/g) ?? [];
    if (tbdMatches.length >= 5) { skeletons++; continue; }
    checked++;
    const lower = body.toLowerCase();
    for (const sec of MANDATORY) {
      if (!lower.includes(`**${sec}:**`) && !lower.includes(`* **${sec}**`) && !lower.includes(`- **${sec}**`)) {
        console.error(`FAIL ${d}/${id}: missing mandatory section "${sec}"`);
        failed++;
      }
    }
    for (const sec of OPTIONAL) {
      const re = new RegExp(`\\*\\*${sec}:\\*\\*\\s*([\\s\\S]*?)(?:\\n\\n|$)`, 'i');
      const m = body.match(re);
      if (m && /^\s*\(none\)\s*$/i.test(m[1].trim())) {
        console.error(`FAIL ${d}/${id}: optional section "${sec}" is "(none)" stub`);
        failed++;
      }
    }
  }
}

console.log(`check-uc-sections: checked=${checked}, skeletons=${skeletons}, failures=${failed}`);
process.exit(failed ? 1 : 0);
