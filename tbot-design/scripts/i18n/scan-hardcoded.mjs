#!/usr/bin/env node
// scan-hardcoded.mjs
// Static scanner over the prototype JSX/HTML files. Flags string literals
// in JSX text positions and selected attributes that are NOT present as
// keys in locales/en.json (i.e. not yet i18n-eligible via the runtime
// DOM walker).
//
// This is grep-grade, not AST-grade — adequate for a single-page HTML
// prototype. Production migration should swap to a Babel-AST walker.
//
// Usage:
//   node scripts/i18n/scan-hardcoded.mjs            (lists violations, exits non-zero)
//   node scripts/i18n/scan-hardcoded.mjs --json     (machine-readable)
//   node scripts/i18n/scan-hardcoded.mjs --report   (writes scripts/i18n/last-scan.json)
//
// Allowlist:  scripts/i18n/.i18n-allowlist  (one literal per line, ignored)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES = path.join(ROOT, 'locales');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts/i18n/.i18n-allowlist');

const FILES_TO_SCAN = [
  'index.html',
  'screens.jsx', 'course.jsx', 'progress.jsx', 'parent.jsx',
  'fallback.jsx', 'home.jsx', 'onboarding.jsx', 'device.jsx',
  'purchase.jsx', 'course-library.jsx', 'robot-mgmt.jsx',
  'paths.jsx', 'design-system.jsx', 'tb-components.jsx',
  'vn-features.jsx',
  // intentionally excluded: lcd-*.jsx (face-only, doc surface, EN-on-LCD is forbidden)
  // intentionally excluded: robot.jsx (no text), ios-frame.jsx (chrome only)
];

// ── load EN catalog ──
const en = JSON.parse(fs.readFileSync(path.join(LOCALES, 'en.json'), 'utf8'));
const EN_KEYS = new Set(Object.keys(en).filter(k => !k.startsWith('_')));

// ── load allowlist (proper nouns, brand strings, lorem) ──
const allowlist = new Set();
if (fs.existsSync(ALLOWLIST_PATH)) {
  fs.readFileSync(ALLOWLIST_PATH, 'utf8')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('#'))
    .forEach(s => allowlist.add(s));
}

// String shapes that are PRESENTATIONAL (UI copy) — heuristic.
// We flag a literal if:
//   - it is JSX text (between > and <), OR
//   - it is a string passed as `title=`, `placeholder=`, `aria-label=`,
//     `alt=`, `label=`, `subtitle=` attribute on a JSX element
// We skip:
//   - empty / whitespace-only
//   - shorter than 2 chars or all non-letter (icons, emoji-only, "·", ":")
//   - pure numbers, percentages
//   - identifiers / camelCase / SCREAMING_CASE / kebab-case slugs
//   - URLs, file paths, color hex
//   - strings already in EN catalog (i18n-eligible — not "hardcoded")
//   - strings on the allowlist
function isHardcodedCandidate(s){
  const t = s.trim();
  if (!t) return false;
  if (t.length < 2) return false;
  if (allowlist.has(t)) return false;
  if (EN_KEYS.has(t)) return false;
  // pure non-letter (icons, separators)
  if (!/[A-Za-z]/.test(t)) return false;
  // URL / path / hex / px values / numeric tokens
  if (/^(https?:|\/|\.\/|#[0-9a-fA-F]{3,8}$|\d+(px|rem|em|%|s|ms)$|\d+(\.\d+)?$)/.test(t)) return false;
  // identifiers — letters+digits, camelCase, snake_case, kebab-case slug, no spaces
  if (!/\s/.test(t) && /^[A-Za-z][A-Za-z0-9_-]*$/.test(t)) return false;
  // CSS / inline-style fragments like "12px solid #fff", "rgba(...)"
  if (/^(rgba?|hsla?|linear-gradient|var)\(/.test(t)) return false;
  if (/^[\d.\s,a-fA-F#%()-]+$/.test(t) && /\d/.test(t)) return false;
  // single emoji
  if (t.length <= 3 && /\p{Extended_Pictographic}/u.test(t)) return false;
  return true;
}

// Match JSX text nodes:    >Hello, world<
// (very permissive — captures the inner text between > and the next <)
const RE_JSX_TEXT = />([^<>{}\n][^<>{}\n]{1,200}?)</g;

// Match selected JSX attributes with string literals:
//   title="..."  placeholder="..."  aria-label="..."  alt="..."  label="..."  subtitle="..."
const RE_JSX_ATTR = /\b(title|placeholder|aria-label|alt|label|subtitle|right|cta|heading|body|caption)\s*=\s*(?:"([^"\n]+?)"|'([^'\n]+?)')/g;

const findings = [];

for (const rel of FILES_TO_SCAN) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');

  // JSX text
  let m;
  while ((m = RE_JSX_TEXT.exec(src)) !== null) {
    const raw = m[1];
    // ignore JSX expressions that leaked through ({foo})
    if (raw.includes('{') || raw.includes('}')) continue;
    if (!isHardcodedCandidate(raw)) continue;
    const before = src.slice(0, m.index);
    const line = before.split('\n').length;
    findings.push({ file: rel, line, kind: 'jsx-text', text: raw.trim() });
  }

  // JSX attributes
  while ((m = RE_JSX_ATTR.exec(src)) !== null) {
    const raw = m[2] || m[3];
    if (!isHardcodedCandidate(raw)) continue;
    const before = src.slice(0, m.index);
    const line = before.split('\n').length;
    findings.push({ file: rel, line, kind: `attr:${m[1]}`, text: raw.trim() });
  }

  // reset lastIndex (RegExp objects are stateful with /g)
  RE_JSX_TEXT.lastIndex = 0;
  RE_JSX_ATTR.lastIndex = 0;
}

// ── output ──
const args = process.argv.slice(2);
const asJson   = args.includes('--json');
const writeRpt = args.includes('--report');

if (writeRpt) {
  fs.mkdirSync('scripts/i18n', { recursive: true });
  fs.writeFileSync('scripts/i18n/last-scan.json',
    JSON.stringify({ count: findings.length, findings }, null, 2));
}

if (asJson) {
  console.log(JSON.stringify({ count: findings.length, findings }, null, 2));
} else {
  // group by file
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  let topN = 0;
  for (const [file, items] of [...byFile.entries()].sort((a,b)=>b[1].length-a[1].length)) {
    console.log(`\n${file}  (${items.length})`);
    const cap = 12;
    for (const it of items.slice(0, cap)) {
      console.log(`  ${String(it.line).padStart(4)} ${it.kind.padEnd(13)} ${JSON.stringify(it.text).slice(0,80)}`);
    }
    if (items.length > cap) console.log(`  … +${items.length - cap} more`);
    topN += items.length;
  }
  console.log(`\nTOTAL hardcoded (not in en.json, not allowlisted): ${findings.length}`);
}

process.exit(findings.length > 0 ? 1 : 0);
