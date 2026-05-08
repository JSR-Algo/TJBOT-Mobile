#!/usr/bin/env node
// check-format-leaks.mjs
// Greps JSX for raw currency literals (`$149`) inside JSX text and for
// `toLocaleDateString(undefined,` calls. Both bypass the locale switch.
// Drives AC11.
//
// Allowed: $ inside string literals/JSX *attributes* if they're already
// catalog-eligible OR if they're inside a JS comment / regex. The grep is
// intentionally conservative — only flags the patterns actually known to leak.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILES = [
  'screens.jsx', 'course.jsx', 'progress.jsx', 'parent.jsx',
  'fallback.jsx', 'home.jsx', 'onboarding.jsx', 'device.jsx',
  'purchase.jsx', 'course-library.jsx', 'robot-mgmt.jsx',
  'paths.jsx', 'design-system.jsx', 'tb-components.jsx', 'vn-features.jsx',
];

// JSX-text dollar literal: matches `>...$149...<` patterns where the dollar
// precedes a digit. Matches inside a JSX text fragment (between > and the
// next opening <).
const RE_JSX_TEXT = />[^<>{}\n]*?<|>[^<>{}\n]*$/gm;
const RE_DOLLAR_NUM = /\$\d/;

// Date / time / string format leak: any toLocale*String(undefined, ...) call.
const RE_LOCALE_UNDEF = /toLocale(?:DateString|TimeString|String)\s*\(\s*undefined/g;
// Number-format / Date-format with hard-coded en-US locale that should use the helper.
const RE_HARD_LOCALE_NUM = /Intl\.(?:NumberFormat|DateTimeFormat)\(\s*['"](?:en-US|undefined)['"]/g;

const dollarLeaks = [];
const dollarLiteralsIndirect = [];
const undefLocaleCalls = [];
const hardLocaleCalls = [];

for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');

  // Dollar-in-JSX-text scan (line-based to keep noise low).
  lines.forEach((line, idx) => {
    // Skip comment lines.
    const t = line.trimStart();
    if (t.startsWith('//') || t.startsWith('*')) return;
    // Look for >...$\d...< inside the line.
    const matches = line.match(/>[^<>{}\n]*?\$\d[^<>{}\n]*?</g);
    if (matches) {
      for (const m of matches) dollarLeaks.push({ file: rel, line: idx + 1, text: m });
    }
    // Indirect: JS string literal beginning with $<digit> assigned to a price/sub field.
    const indirect = line.match(/(price|sub|p)\s*:\s*['"]\$[\d]/g);
    if (indirect) {
      for (const m of indirect) dollarLiteralsIndirect.push({ file: rel, line: idx + 1, text: m });
    }
  });

  let m;
  while ((m = RE_LOCALE_UNDEF.exec(src)) !== null) {
    const before = src.slice(0, m.index);
    undefLocaleCalls.push({ file: rel, line: before.split('\n').length, text: m[0] });
  }
  RE_LOCALE_UNDEF.lastIndex = 0;
  while ((m = RE_HARD_LOCALE_NUM.exec(src)) !== null) {
    const before = src.slice(0, m.index);
    hardLocaleCalls.push({ file: rel, line: before.split('\n').length, text: m[0] });
  }
  RE_HARD_LOCALE_NUM.lastIndex = 0;
}

console.log(`Dollar-in-JSX-text leaks: ${dollarLeaks.length}`);
console.log(`Indirect $-literal data fields (price/sub/p:'$N'): ${dollarLiteralsIndirect.length}`);
console.log(`toLocale*(undefined,...) calls: ${undefLocaleCalls.length}`);
console.log(`Intl.* with hard-coded en-US/undefined: ${hardLocaleCalls.length}`);

if (dollarLeaks.length) {
  console.log('\nDollar leaks (JSX text):');
  for (const l of dollarLeaks.slice(0, 40)) console.log(`  ${l.file}:${l.line}  ${l.text.slice(0, 80)}`);
  if (dollarLeaks.length > 40) console.log(`  … +${dollarLeaks.length - 40} more`);
}
if (dollarLiteralsIndirect.length) {
  console.log('\nIndirect $-literal data fields:');
  for (const l of dollarLiteralsIndirect.slice(0, 40)) console.log(`  ${l.file}:${l.line}  ${l.text}`);
  if (dollarLiteralsIndirect.length > 40) console.log(`  … +${dollarLiteralsIndirect.length - 40} more`);
}
if (undefLocaleCalls.length) {
  console.log('\nUndefined-locale calls:');
  for (const l of undefLocaleCalls.slice(0, 20)) console.log(`  ${l.file}:${l.line}  ${l.text}`);
}
if (hardLocaleCalls.length) {
  console.log('\nHard-coded locale calls:');
  for (const l of hardLocaleCalls.slice(0, 20)) console.log(`  ${l.file}:${l.line}  ${l.text}`);
}

const fail = dollarLeaks.length > 0 || undefLocaleCalls.length > 0 || dollarLiteralsIndirect.length > 0;
process.exit(fail ? 1 : 0);
