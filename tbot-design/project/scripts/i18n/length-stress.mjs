#!/usr/bin/env node
// length-stress.mjs
// Generate locales/vi-stretched.json — each vi.json value padded to 1.35× length
// with random Vietnamese diacritic characters. Render the app under this locale
// to surface truncation, overflow, and clipped touch targets.
//
// Activate at runtime: localStorage.tbot.lang = 'vi-stretched'.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/vi.json'), 'utf8'));

// Vietnamese diacritic-heavy characters for padding.
const PAD_CHARS = 'ăâđêôơưốồộổỗấầậẩẫắằặẳẵếềệểễíìịỉĩúùụủũóòọỏõýỳỵỷỹ';
function padOne(){ return PAD_CHARS[Math.floor(Math.random() * PAD_CHARS.length)]; }
function padN(n){ let s=''; for (let i=0;i<n;i++) s += padOne(); return s; }

function stretch(v) {
  const target = Math.ceil(v.length * 1.35);
  const need = Math.max(0, target - v.length);
  return need ? `${v} ${padN(need - 1)}` : v;
}

function transformValue(v) {
  if (typeof v === 'string') return v.trim() === '' ? v : stretch(v);
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out = {};
    for (const sub of ['child', 'parent']) {
      if (typeof v[sub] === 'string' && v[sub].trim() !== '') out[sub] = stretch(v[sub]);
      else if (sub in v) out[sub] = v[sub];
    }
    return out;
  }
  return v;
}

const out = { _meta: { note: 'Length-stress locale. +35% pad with VN diacritics. Generated. Do not edit.', source: 'vi.json', version: 2 } };
for (const [k, v] of Object.entries(vi)) {
  if (k.startsWith('_')) continue;
  out[k] = transformValue(v);
}

const target = path.join(ROOT, 'locales/vi-stretched.json');
fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${target}  (${Object.keys(out).length - 1} entries, +35% padded)`);
