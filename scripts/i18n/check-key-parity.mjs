#!/usr/bin/env node
// check-key-parity.mjs
// Asserts keys(en) === keys(vi). Exit code 1 on any delta.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/services/i18n/locales/en.json'), 'utf8'));
const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/services/i18n/locales/vi.json'), 'utf8'));

const enKeys = new Set(Object.keys(en).filter(k => !k.startsWith('_')));
const viKeys = new Set(Object.keys(vi).filter(k => !k.startsWith('_')));

const onlyEn = [...enKeys].filter(k => !viKeys.has(k));
const onlyVi = [...viKeys].filter(k => !enKeys.has(k));

// also check empty-string vi values (TODO markers)
const emptyVi = [...viKeys].filter(k => typeof vi[k] === 'string' && vi[k].trim() === '');

// Some labels are intentionally identical in both locales: product names,
// personal names, protocols, and technical tokens. Any other English copy
// left unchanged in vi.json is a missing translation.
const intentionallyIdentical = new Set([
  'OK',
  'Email',
  'Robot: {{deviceId}}',
  'Wi-Fi',
  'Robot English Plus',
  'Robot',
  'Buddy: Panda',
  'Visa',
  'Touch ID',
  'void | Promise',
  'FAQ: ',
  'Robot + Hello Friends',
  'TJBot Future Tech',
  'email@example.com',
  'TeeBot',
  'Maestro',
  'Mia',
  '"barn"',
]);
const hasTranslatableText = value => value
  .replace(/\{\{[^}]+\}\}/g, '')
  .match(/\p{L}/u);
const identicalVi = [...enKeys].filter(key => (
  en[key] === vi[key]
  && hasTranslatableText(en[key])
  && !intentionallyIdentical.has(key)
));

console.log(`EN keys: ${enKeys.size}`);
console.log(`VI keys: ${viKeys.size}`);
console.log(`Delta:   ${onlyEn.length + onlyVi.length}  (only-en: ${onlyEn.length}, only-vi: ${onlyVi.length})`);
console.log(`Empty VI values (untranslated TODOs): ${emptyVi.length}`);
console.log(`Unexpected identical EN/VI values: ${identicalVi.length}`);

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
if (identicalVi.length) {
  console.log('\nUnexpected identical EN/VI values:');
  for (const k of identicalVi.slice(0, 50)) console.log(`  = ${JSON.stringify(k)}`);
  if (identicalVi.length > 50) console.log(`  … +${identicalVi.length - 50} more`);
}

const fail = (onlyEn.length + onlyVi.length + emptyVi.length + identicalVi.length) > 0;
process.exit(fail ? 1 : 0);
