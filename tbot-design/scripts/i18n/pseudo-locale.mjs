#!/usr/bin/env node
// pseudo-locale.mjs
// Generate locales/vi-pseudo.json by wrapping every vi.json value with
// [ŁĐ … ŁĐ]. Anything still rendering plain at runtime → leak proof.
//
// Activate at runtime by setting localStorage.tbot.lang = 'vi-pseudo' in
// the browser (i18n.js loads this catalog when present).

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/vi.json'), 'utf8'));

const out = { _meta: { note: 'Pseudo-locale. Generated. Do not edit.', source: 'vi.json', version: 1 } };
for (const [k, v] of Object.entries(vi)) {
  if (k.startsWith('_')) continue;
  if (typeof v !== 'string' || v.trim() === '') { out[k] = v; continue; }
  out[k] = `[ŁĐ ${v} ŁĐ]`;
}

const target = path.join(ROOT, 'locales/vi-pseudo.json');
fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${target}  (${Object.keys(out).length - 1} entries)`);
