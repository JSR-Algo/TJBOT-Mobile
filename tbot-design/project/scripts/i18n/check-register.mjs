#!/usr/bin/env node
// check-register.mjs
// Lints register quality of {child, parent} VI persona objects.
//
// Hard failures (exit 1):
//   - persona object missing child or parent (or either is empty)
//   - child === parent (defeats the persona split)
//
// Soft warnings (still exit 0 but printed):
//   - child entry contains NONE of {nhé, nha, nào, con, mình}
//   - parent entry contains ANY of those particles
//
// Drives AC10.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/vi.json'), 'utf8'));

const CHILD_PARTICLES = ['nhé', 'nha', 'nào', ' con ', ' mình '];
function hasChildParticle(s) {
  const lower = (' ' + s.toLowerCase() + ' ').replace(/[!?.,;:]/g, ' ');
  return CHILD_PARTICLES.some(p => lower.includes(p));
}

const fails = [];
const warns = [];
let personaCount = 0;

for (const [k, v] of Object.entries(vi)) {
  if (k.startsWith('_')) continue;
  if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
  if (!('child' in v) && !('parent' in v)) continue;
  personaCount++;
  const c = v.child, p = v.parent;
  if (typeof c !== 'string' || c.trim() === '') {
    fails.push({ key: k, why: 'child empty/missing' }); continue;
  }
  if (typeof p !== 'string' || p.trim() === '') {
    fails.push({ key: k, why: 'parent empty/missing' }); continue;
  }
  if (c.trim() === p.trim()) {
    fails.push({ key: k, why: 'child === parent — flatten or differentiate' }); continue;
  }
  if (!hasChildParticle(c)) warns.push({ key: k, why: 'child has no soft particle (nhé/nha/nào/con/mình)' });
  if (hasChildParticle(p)) warns.push({ key: k, why: 'parent contains child particle — too informal' });
}

console.log(`Persona objects: ${personaCount}`);
console.log(`Failures: ${fails.length}`);
console.log(`Warnings: ${warns.length}`);

if (fails.length) {
  console.log('\nFailures:');
  for (const f of fails.slice(0, 60)) console.log(`  ! ${JSON.stringify(f.key)}  — ${f.why}`);
  if (fails.length > 60) console.log(`  … +${fails.length - 60} more`);
}
if (warns.length) {
  console.log('\nWarnings:');
  for (const w of warns.slice(0, 60)) console.log(`  ~ ${JSON.stringify(w.key)}  — ${w.why}`);
  if (warns.length > 60) console.log(`  … +${warns.length - 60} more`);
}

process.exit(fails.length > 0 ? 1 : 0);
