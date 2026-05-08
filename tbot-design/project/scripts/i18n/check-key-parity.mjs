#!/usr/bin/env node
// check-key-parity.mjs
// Asserts:
//   1. keys(en) === keys(vi)
//   2. no empty VI string values
//   3. for {child, parent} VI entries, BOTH fields non-empty
//   4. (warning) no case-folded duplicate EN keys ('Try again' vs 'Try Again')
//      unless _meta.distinctVariants in en.json lists them as intentional
// Exit code 1 on any hard failure (1, 2, 3). Case-fold duplicates produce a
// non-fatal warning so v1 catalogs do not regress mid-migration.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/en.json'), 'utf8'));
const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/vi.json'), 'utf8'));

const enKeys = new Set(Object.keys(en).filter(k => !k.startsWith('_')));
const viKeys = new Set(Object.keys(vi).filter(k => !k.startsWith('_')));

const onlyEn = [...enKeys].filter(k => !viKeys.has(k));
const onlyVi = [...viKeys].filter(k => !enKeys.has(k));

function isEmptyString(v) {
  return typeof v === 'string' && v.trim() === '';
}
function isPersonaObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
    && (Object.prototype.hasOwnProperty.call(v, 'child')
        || Object.prototype.hasOwnProperty.call(v, 'parent'));
}

const emptyVi = [];
const personaIncomplete = [];
for (const k of viKeys) {
  const v = vi[k];
  if (isEmptyString(v)) { emptyVi.push(k); continue; }
  if (isPersonaObject(v)) {
    const c = v.child, p = v.parent;
    if (typeof c !== 'string' || c.trim() === '' || typeof p !== 'string' || p.trim() === '') {
      personaIncomplete.push(k);
    }
  }
}

// Case-fold duplicate detection on EN keys.
const distinctVariants = new Set((en._meta && Array.isArray(en._meta.distinctVariants)) ? en._meta.distinctVariants : []);
const lowerMap = new Map(); // lower -> [orig, ...]
for (const k of enKeys) {
  const lc = k.toLowerCase();
  if (!lowerMap.has(lc)) lowerMap.set(lc, []);
  lowerMap.get(lc).push(k);
}
const caseDups = [];
for (const [lc, arr] of lowerMap) {
  if (arr.length > 1) {
    const intentional = arr.every(k => distinctVariants.has(k));
    if (!intentional) caseDups.push(arr);
  }
}

console.log(`EN keys: ${enKeys.size}`);
console.log(`VI keys: ${viKeys.size}`);
console.log(`Delta:   ${onlyEn.length + onlyVi.length}  (only-en: ${onlyEn.length}, only-vi: ${onlyVi.length})`);
console.log(`Empty VI values (untranslated TODOs): ${emptyVi.length}`);
console.log(`Persona-incomplete VI ({child,parent} missing one): ${personaIncomplete.length}`);
console.log(`Case-folded duplicate EN keys: ${caseDups.length}  (warning unless in _meta.distinctVariants)`);

if (onlyEn.length) {
  console.log('\nMissing in vi.json:');
  for (const k of onlyEn.slice(0, 50)) console.log(`  + ${JSON.stringify(k)}`);
  if (onlyEn.length > 50) console.log(`  … +${onlyEn.length - 50} more`);
}
if (onlyVi.length) {
  console.log('\nOrphan in vi.json (no matching en key):');
  for (const k of onlyVi.slice(0, 50)) console.log(`  - ${JSON.stringify(k)}`);
  if (onlyVi.length > 50) console.log(`  … +${onlyVi.length - 50} more`);
}
if (emptyVi.length) {
  console.log('\nEmpty VI values:');
  for (const k of emptyVi.slice(0, 50)) console.log(`  ! ${JSON.stringify(k)}`);
}
if (personaIncomplete.length) {
  console.log('\nPersona-incomplete VI entries (need both child and parent):');
  for (const k of personaIncomplete.slice(0, 50)) console.log(`  ! ${JSON.stringify(k)}`);
}
if (caseDups.length) {
  console.log('\nCase-folded duplicate EN keys (warning):');
  for (const arr of caseDups.slice(0, 30)) console.log(`  ~ ${arr.map(s => JSON.stringify(s)).join(' / ')}`);
}

const fail = (onlyEn.length + onlyVi.length) > 0
  || emptyVi.length > 0
  || personaIncomplete.length > 0;
process.exit(fail ? 1 : 0);
