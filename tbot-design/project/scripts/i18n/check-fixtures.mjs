#!/usr/bin/env node
// check-fixtures.mjs
// jsdom-based fixture runner for the runtime walker. Loads i18n.js into a
// synthetic DOM, applies a fixture's HTML fragment, switches locale, and
// asserts expected substrings (or, in --leak mode, asserts no plain text).
//
// Usage:
//   node scripts/i18n/check-fixtures.mjs                       # run all fixtures vi+en
//   node scripts/i18n/check-fixtures.mjs --files purchase.jsx  # filter by source file
//   node scripts/i18n/check-fixtures.mjs --locale vi-pseudo --leak    # leak mode
//   node scripts/i18n/check-fixtures.mjs --locale vi-stretched --layout
//
// Fixture manifest: scripts/i18n/expected-fixtures.json
//   {
//     "fixtures": [
//       {
//         "name": "purchase-card",
//         "file": "purchase.jsx",
//         "html": "<div data-persona='parent'><h1>Buy Robot</h1><button>$149</button></div>",
//         "expect": { "vi": ["Mua Robot"], "en": ["Buy Robot"] }
//       }
//     ]
//   }
//
// Drives AC4, AC5, AC6, AC7, AC8, AC12, AC13.

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const SCRIPTS = path.join(ROOT, 'scripts/i18n');
const MANIFEST = path.join(SCRIPTS, 'expected-fixtures.json');

const argv = process.argv.slice(2);
function flagValue(name) {
  const eq = argv.find(a => a.startsWith(name + '='));
  if (eq) return eq.slice(name.length + 1);
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return null;
}
const localeArg = flagValue('--locale');
const filesArg = flagValue('--files');
const leakMode = argv.includes('--leak');
const layoutMode = argv.includes('--layout');

const filterFiles = filesArg ? new Set(filesArg.split(',').map(s => s.trim())) : null;

if (!fs.existsSync(MANIFEST)) {
  console.log(`[check-fixtures] no manifest at ${MANIFEST} — writing empty stub. Lanes populate per-screen entries.`);
  fs.writeFileSync(MANIFEST, JSON.stringify({
    note: 'Per-screen jsdom fixtures. Populate during Phase 2-7 catalog batches.',
    fixtures: [],
  }, null, 2) + '\n');
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const fixtures = manifest.fixtures || [];
if (fixtures.length === 0) {
  console.log('[check-fixtures] manifest empty — exit 0 (no fixtures to verify).');
  process.exit(0);
}

const i18nSource = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');

function buildLocaleMap() {
  const out = {};
  for (const name of ['vi', 'en', 'vi-pseudo', 'vi-stretched']) {
    const p = path.join(ROOT, 'locales', name + '.json');
    if (fs.existsSync(p)) out[name] = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  // legacy-inline as fallback target
  const lp = path.join(ROOT, 'locales', 'legacy-inline.json');
  if (fs.existsSync(lp)) out['legacy-inline'] = JSON.parse(fs.readFileSync(lp, 'utf8'));
  return out;
}
const LOCALES = buildLocaleMap();

async function runFixture(fx, locale) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${fx.html}</body></html>`, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });
  const { window } = dom;
  const { document } = window;
  // Stub fetch with the in-memory catalogs.
  window.fetch = async (url) => {
    const m = String(url).match(/locales\/([\w.-]+)\.json/);
    if (m && LOCALES[m[1]]) {
      return { ok: true, status: 200, json: async () => LOCALES[m[1]] };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  // localStorage stub (jsdom 21+ provides it; this guards older builds).
  if (!window.localStorage) {
    const store = new Map();
    window.localStorage = {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    };
  }
  window.localStorage.setItem('tbot.lang', locale);

  // Eval i18n.js inside the jsdom window context.
  const fn = new window.Function('window', 'document', 'localStorage', 'fetch', 'MutationObserver', 'Intl', i18nSource);
  fn.call(window, window, document, window.localStorage, window.fetch, window.MutationObserver, window.Intl);

  // Wait for catalog load + safety pass to apply.
  await new Promise(r => setTimeout(r, 50));
  // Re-apply explicitly (i18n.js may have applied 'vi' default before localStorage was set in some race).
  if (window.__tbot && typeof window.__tbot.setLang === 'function') window.__tbot.setLang(locale);
  await new Promise(r => setTimeout(r, 20));

  const text = document.body.textContent.replace(/\s+/g, ' ').trim();

  const failures = [];
  if (leakMode) {
    // Pseudo mode — every visible text should be wrapped in [ŁĐ ... ŁĐ] or [≡ ... ≡].
    const stripped = text.replace(/\[(?:ŁĐ|≡)[^\[\]]*?(?:ŁĐ|≡)\]/g, '').trim();
    if (stripped.length > 0) failures.push({ kind: 'leak', residue: stripped.slice(0, 120) });
  } else {
    const want = (fx.expect && fx.expect[locale]) || [];
    for (const sub of want) {
      if (!text.includes(sub)) failures.push({ kind: 'missing-substring', expected: sub });
    }
    const wantAttrs = (fx.expectAttrs && fx.expectAttrs[locale]) || [];
    for (const a of wantAttrs) {
      const el = document.querySelector(a.selector);
      const got = el ? el.getAttribute(a.attr) : null;
      if (got !== a.value) failures.push({ kind: 'attr-mismatch', selector: a.selector, attr: a.attr, expected: a.value, got });
    }
  }
  if (layoutMode) {
    // jsdom does not compute layout, so we cannot enforce scrollWidth > clientWidth here.
    // Mark as informational: real layout assertion needs Puppeteer or a Playwright runner.
  }

  return { name: fx.name, file: fx.file, locale, ok: failures.length === 0, failures, text: text.slice(0, 200) };
}

async function main() {
  const targetLocales = localeArg ? [localeArg] : ['vi', 'en'];
  const filtered = filterFiles
    ? fixtures.filter(f => filterFiles.has(f.file))
    : fixtures;

  const results = [];
  for (const fx of filtered) {
    for (const locale of targetLocales) {
      results.push(await runFixture(fx, locale));
    }
  }
  const fails = results.filter(r => !r.ok);
  console.log(`Fixtures run: ${results.length}, passed: ${results.length - fails.length}, failed: ${fails.length}`);
  for (const r of results) {
    const tag = r.ok ? 'OK' : 'FAIL';
    console.log(`  [${tag}] ${r.name} (${r.file}) @ ${r.locale}`);
    if (!r.ok) {
      for (const f of r.failures) console.log(`        - ${f.kind} ${JSON.stringify(f).slice(0, 200)}`);
      console.log(`        text: ${r.text}`);
    }
  }
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
