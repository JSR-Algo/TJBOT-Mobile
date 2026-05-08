#!/usr/bin/env node
// coverage-report.mjs
// Aggregates state of the i18n migration into a single JSON snapshot.
// Drives AC14. Emits scripts/i18n/coverage-report.json.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SCRIPTS = path.join(ROOT, 'scripts/i18n');

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/en.json'), 'utf8'));
const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/vi.json'), 'utf8'));
const allowlistRaw = fs.existsSync(path.join(SCRIPTS, '.i18n-allowlist'))
  ? fs.readFileSync(path.join(SCRIPTS, '.i18n-allowlist'), 'utf8')
  : '';
const allowlist = allowlistRaw.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));

const enKeys = Object.keys(en).filter(k => !k.startsWith('_'));
const viKeys = Object.keys(vi).filter(k => !k.startsWith('_'));

let viStrings = 0, viPersonaObjects = 0, viEmpty = 0;
for (const k of viKeys) {
  const v = vi[k];
  if (typeof v === 'string') {
    if (v.trim() === '') viEmpty++; else viStrings++;
  } else if (v && typeof v === 'object') {
    viPersonaObjects++;
    if (typeof v.child !== 'string' || v.child.trim() === '') viEmpty++;
    if (typeof v.parent !== 'string' || v.parent.trim() === '') viEmpty++;
  }
}

// case-folded duplicates in en
const lowerMap = new Map();
for (const k of enKeys) {
  const lc = k.toLowerCase();
  if (!lowerMap.has(lc)) lowerMap.set(lc, []);
  lowerMap.get(lc).push(k);
}
let caseDups = 0;
for (const arr of lowerMap.values()) if (arr.length > 1) caseDups++;

// last-scan summary
let scan = { count: 0, findings: [] };
const scanPath = path.join(SCRIPTS, 'last-scan.json');
if (fs.existsSync(scanPath)) {
  try { scan = JSON.parse(fs.readFileSync(scanPath, 'utf8')); } catch (_) { /* ignore */ }
}
const hardcodedPerFile = {};
for (const f of scan.findings || []) {
  hardcodedPerFile[f.file] = (hardcodedPerFile[f.file] || 0) + 1;
}

// Rough persona-per-file: scan JSX for data-persona occurrences (best-effort).
const personaPerFile = {};
const JSX_FILES = [
  'screens.jsx', 'home.jsx', 'onboarding.jsx', 'course.jsx', 'progress.jsx',
  'parent.jsx', 'fallback.jsx', 'device.jsx', 'purchase.jsx',
  'course-library.jsx', 'robot-mgmt.jsx', 'paths.jsx', 'vn-features.jsx',
  'tb-components.jsx', 'design-system.jsx',
];
for (const rel of JSX_FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { personaPerFile[rel] = { child: 0, parent: 0 }; continue; }
  const src = fs.readFileSync(abs, 'utf8');
  const child = (src.match(/data-persona\s*=\s*["']child["']/g) || []).length;
  const parent = (src.match(/data-persona\s*=\s*["']parent["']/g) || []).length;
  personaPerFile[rel] = { child, parent };
}

// data-i18n-key sites
const dataI18nKeySites = [];
for (const rel of JSX_FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const re = /data-i18n-key\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const before = src.slice(0, m.index);
    dataI18nKeySites.push({ file: rel, line: before.split('\n').length, key: m[1] });
  }
}

// optional locale variants on disk
const localeFilesLoaded = ['vi', 'en']
  .concat(['vi-pseudo', 'vi-stretched'].filter(v => fs.existsSync(path.join(ROOT, 'locales', v + '.json'))));

// register lint quick scan (mirrors check-register.mjs without invoking it)
const CHILD_PARTICLES = ['nhé', 'nha', 'nào', ' nè ', ' nè!', ' nè?', ' con ', ' mình '];
let regWarn = 0, regFail = 0;
for (const k of viKeys) {
  const v = vi[k];
  if (!v || typeof v !== 'object') continue;
  if (!('child' in v) && !('parent' in v)) continue;
  const c = v.child, p = v.parent;
  if (typeof c !== 'string' || !c.trim() || typeof p !== 'string' || !p.trim() || c === p) { regFail++; continue; }
  const lc = (' ' + c.toLowerCase() + ' ').replace(/[!?.,;:]/g, ' ');
  const lp = (' ' + p.toLowerCase() + ' ').replace(/[!?.,;:]/g, ' ');
  if (!CHILD_PARTICLES.some(x => lc.includes(x))) regWarn++;
  if (CHILD_PARTICLES.some(x => lp.includes(x))) regWarn++;
}

let gitCommit = 'unknown';
try { gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch (_) { /* ignore */ }

const out = {
  run_at: new Date().toISOString(),
  git_commit: gitCommit,
  en_keys: enKeys.length,
  vi_keys: viKeys.length,
  vi_strings: viStrings,
  vi_persona_objects: viPersonaObjects,
  vi_empty: viEmpty,
  case_folded_duplicates: caseDups,
  hardcoded_total: scan.count || 0,
  hardcoded_per_file: hardcodedPerFile,
  persona_per_file: personaPerFile,
  allowlist_size: allowlist.length,
  data_i18n_key_sites: dataI18nKeySites,
  locale_files_loaded: localeFilesLoaded,
  fixture_pass_count: null,
  fixture_total: null,
  register_lint: { persona_objects: viPersonaObjects, warnings: regWarn, failures: regFail },
  format_leaks: { dollar_jsx: null, undef_locale_calls: null },
  phase_status: {},
};

const target = path.join(SCRIPTS, 'coverage-report.json');
fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${target}`);
console.log(`  en=${out.en_keys} vi=${out.vi_keys} (parity ${(out.vi_keys/out.en_keys*100).toFixed(1)}%)`);
console.log(`  hardcoded total: ${out.hardcoded_total}`);
console.log(`  persona objects: ${out.vi_persona_objects}`);
console.log(`  case-folded dups: ${out.case_folded_duplicates}`);
process.exit(0);
