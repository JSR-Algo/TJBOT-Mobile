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

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/en.json'), 'utf8'));

function bracket(v, isIdentity) {
  // Use distinct identity marker so AC7 spots untranslated EN-equals-VI cases.
  return isIdentity ? `[≡ ${v} ≡]` : `[ŁĐ ${v} ŁĐ]`;
}

function transformValue(k, v) {
  if (typeof v === 'string') {
    if (v.trim() === '') return v;
    const isIdentity = en[k] === v;
    return bracket(v, isIdentity);
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out = {};
    for (const sub of ['child', 'parent']) {
      if (typeof v[sub] === 'string' && v[sub].trim() !== '') {
        const isIdentity = en[k] === v[sub];
        out[sub] = bracket(v[sub], isIdentity);
      } else if (sub in v) {
        out[sub] = v[sub];
      }
    }
    return out;
  }
  return v;
}

const out = { _meta: { note: 'Pseudo-locale. Generated. Do not edit.', source: 'vi.json', version: 2 } };
for (const [k, v] of Object.entries(vi)) {
  if (k.startsWith('_')) continue;
  out[k] = transformValue(k, v);
}

const target = path.join(ROOT, 'locales/vi-pseudo.json');
fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${target}  (${Object.keys(out).length - 1} entries)`);
