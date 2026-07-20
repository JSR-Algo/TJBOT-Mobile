#!/usr/bin/env node
// One-shot builder for use-case-index.json + alias-overrides.json.
// Reads legacy doc + all .usecase.puml files, fuzzy-matches titles, writes JSON.
// NOT a check script — intentionally a build helper. Idempotent.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DOCS_ROOT, APP_ROOT } from '../_lib/paths.mjs';

const ROOT = DOCS_ROOT;
const LEGACY = resolve(ROOT, 'architecture/use-case-diagram.md');
const PUML_DIR = resolve(ROOT, 'architecture/usecases');
const OUT_INDEX = resolve(ROOT, 'usecases/reference/use-case-index.json');
const OUT_OVR = resolve(ROOT, 'usecases/reference/alias-overrides.json');

// Domain header → folder name
const HEADER_TO_DOMAIN = {
  'AUTH': 'auth',
  'ONBOARDING': 'onboarding',
  'KID HUB / HOME': 'kid-hub',
  'COURSE BROWSE (kid-side)': 'course-browse',
  'LESSON SESSION (voice + activity loop)': 'lesson-session',
  'PROGRESS': 'progress',
  'PARENT (gated)': 'parent-summary', // PR01 → parent-gate, PR02-07 → parent-summary
  'COURSE LIBRARY (parent-gated commerce + sync)': 'course-library',
  'PURCHASE FUNNEL (hardware + subscription)': 'purchase',
  'DEVICE PAIRING (parent / setup)': 'device-pairing',
  'DEVICE MANAGEMENT (post-pair)': 'device-mgmt',
  'ROtjtjbot MANAGEMENT (parent diagnostics)': 'rotjtjbot-mgmt',
  'FALLBACK / SAFETY / RECOVERY': 'fallback-shell',
  // P5 (2026-05-12): mobile-shell promoted from fallback-shell interim placement
  'MOBILE SHELL (cross-cutting OS-bridge surfaces, added P3.F / promoted P5)': 'mobile-shell',
};

// UC ID prefix → domain folder (for fuzzy-match locality)
const PREFIX_TO_DOMAIN = {
  A: 'auth', O: 'onboarding', H: 'kid-hub', C: 'course-browse',
  L: 'lesson-session', P: 'progress',
  PR: 'parent-summary', // PR01 overridden below to parent-gate
  CL: 'course-library', BU: 'purchase',
  DP: 'device-pairing', DM: 'device-mgmt', RM: 'rotjtjbot-mgmt', F: 'fallback-shell',
  // 2026-05-12 P3.C / P3.F additions — bodies live in existing domain folders, no new puml yet
  SUB: 'purchase',      // UC-SUB01..05 — subscription lifecycle, body in purchase/use-cases.md
  INV: 'purchase',      // UC-INV01 — invoice history, body in purchase/use-cases.md
  MOBILE: 'mobile-shell', // UC-MOBILE01 — push deep-link, body in mobile-shell/use-cases.md (P5 promotion)
};

// Domain folders that have no .usecase.puml (mobile-shell is net-new, device-mgmt is KD5).
const DOMAINS_NO_PUML = new Set(['device-mgmt', 'mobile-shell']);

// Domain folder → puml file basename
const DOMAIN_TO_PUML = {
  auth: 'auth.usecase.puml',
  onboarding: 'onboarding.usecase.puml',
  'kid-hub': 'kid-hub.usecase.puml',
  'course-browse': 'course-browse.usecase.puml',
  'lesson-session': 'lesson-session.usecase.puml',
  progress: 'progress.usecase.puml',
  'parent-gate': 'parent-gate.usecase.puml',
  'parent-summary': 'parent-summary.usecase.puml',
  'course-library': 'course-library.usecase.puml',
  purchase: 'purchase.usecase.puml',
  'device-pairing': 'device-pairing.usecase.puml',
  'rotjtjbot-mgmt': 'rotjtjbot-mgmt.usecase.puml',
  'fallback-shell': 'fallback-shell.usecase.puml',
  // device-mgmt has no puml (KD5)
};

// --- 1. Parse legacy doc ---
const legacy = readFileSync(LEGACY, 'utf8').split('\n');
const entries = [];
let currentDomain = null;
legacy.forEach((line, i) => {
  const h = line.match(/^### (.+)$/);
  if (h) { currentDomain = HEADER_TO_DOMAIN[h[1].trim()] ?? null; return; }
  const u = line.match(/^- (UC-[A-Z]{1,6}\d+)\s+(.+)$/);
  if (!u || !currentDomain) return;
  const id = u[1];
  let rawTitle = u[2];
  // Strip trailing parenthetical and trailing em-dash qualifier
  const parenIdx = rawTitle.indexOf(' (');
  if (parenIdx >= 0) rawTitle = rawTitle.slice(0, parenIdx);
  const dashIdx = rawTitle.search(/\s[—–]\s/);
  if (dashIdx >= 0) rawTitle = rawTitle.slice(0, dashIdx);
  rawTitle = rawTitle.trim();
  // Domain override: UC-PR01 → parent-gate
  let domain = currentDomain;
  if (id === 'UC-PR01') domain = 'parent-gate';
  entries.push({ id, name: rawTitle, domain, source_md_line: i + 1 });
});

// --- 2. Parse pumls ---
function normalize(s) {
  return s.toLowerCase().replace(/[\s\-_/().,]/g, '');
}
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]);
  return d[m][n];
}
function ratio(a, b) {
  const max = Math.max(a.length, b.length) || 1;
  const levR = 1 - lev(a, b) / max;
  // Substring containment bonus: if one fully contains the other, ratio = min(0.85, len-ratio + base).
  // Justification: legacy "Listen to Rotjtjbot Speech" vs puml "Listen to Rotjtjbot" is the same UC.
  if (a.includes(b) || b.includes(a)) {
    const lenR = Math.min(a.length, b.length) / max;
    return Math.max(levR, 0.7 + 0.25 * lenR);
  }
  return levR;
}

const pumlByDomain = {};
for (const [domain, file] of Object.entries(DOMAIN_TO_PUML)) {
  const path = resolve(PUML_DIR, file);
  const txt = readFileSync(path, 'utf8');
  const ucs = [];
  for (const m of txt.matchAll(/usecase\s+"([^"]+)"\s+as\s+(UC_[A-Z]+_[A-Z_]+)/g)) {
    ucs.push({ title: m[1], alias: m[2] });
  }
  pumlByDomain[domain] = ucs;
}

// --- 3. Fuzzy-match ---
// Manual overrides for known cross-equivalents the algorithm cannot reach
// (legacy title diverges substantively from puml title, but UC is the same).
const MANUAL = {
  'UC-A02': 'UC_AUTH_SIGNUP',
  'UC-A03': 'UC_AUTH_LOGIN',
  'UC-A09': 'UC_AUTH_REFRESH',
  'UC-C06': null,                    // "Start Lesson From Detail" — no equivalent puml entry
  'UC-CL04': 'UC_PG_UNLOCK',         // shared parent-gate UC, lives in parent-gate puml
  'UC-CL09': 'UC_CL_COMPANION',
  'UC-CL10': 'UC_CL_COMPLETE',
  'UC-L07':  'UC_LSN_SPEAK',
  'UC-PR03': 'UC_PRT_TODAY',
  'UC-PR04': 'UC_PRT_HISTORY',
  'UC-RM08': 'UC_RM_MIC',
};
const overrides = [];
for (const e of entries) {
  // Special case: domains without a .usecase.puml (device-mgmt = KD5; mobile-shell = P5 net-new).
  if (DOMAINS_NO_PUML.has(e.domain)) {
    e.aliases = [];
    const reason = e.domain === 'device-mgmt'
      ? 'KD5 — Lane D adds device-mgmt.usecase.puml in Phase 1'
      : 'P5 — mobile-shell domain has no puml (net-new cross-cutting domain)';
    overrides.push({ id: e.id, override: 'no-puml', reason });
    continue;
  }
  // Manual override (cross-equivalent the algorithm cannot reach)
  if (Object.hasOwn(MANUAL, e.id)) {
    if (MANUAL[e.id] === null) {
      e.aliases = [];
      overrides.push({ id: e.id, override: 'no-puml', reason: 'no equivalent in any puml file (legacy-only)' });
    } else {
      e.aliases = [MANUAL[e.id]];
      overrides.push({ id: e.id, override: `manual: ${MANUAL[e.id]}`, reason: 'legacy title diverges from puml title; manually mapped' });
    }
    continue;
  }
  const candidates = pumlByDomain[e.domain] ?? [];
  // UC-A01 is special — appears in onboarding puml as SPLASH+WELCOME, not auth puml.
  let pool = candidates;
  if (e.id === 'UC-A01') pool = pumlByDomain['onboarding'] ?? [];
  const normTitle = normalize(e.name);
  const scored = pool.map(c => ({ c, r: ratio(normTitle, normalize(c.title)) }));
  scored.sort((x, y) => y.r - x.r);
  const top = scored[0];
  const second = scored[1];
  if (!top || top.r < 0.7) {
    e.aliases = [];
    overrides.push({ id: e.id, override: 'no-puml', reason: `no match ≥0.7 in ${e.domain} puml (best=${top?.c.alias ?? 'none'} r=${top?.r.toFixed(2) ?? 'NA'})` });
  } else if (second && second.r >= 0.7 && (top.r - second.r) < 0.05) {
    e.aliases = [top.c.alias];
    overrides.push({ id: e.id, decision: '', candidates: scored.filter(s => s.r >= 0.65).slice(0, 5).map(s => ({ alias: s.c.alias, ratio: +s.r.toFixed(3) })), note: 'ambiguous — manual decision required' });
  } else {
    e.aliases = [top.c.alias];
  }
}

// UC-A01 special: also alias UC_ONB_WELCOME (since legacy combines splash+welcome)
const a01 = entries.find(x => x.id === 'UC-A01');
if (a01 && pumlByDomain.onboarding) {
  const splash = pumlByDomain.onboarding.find(c => c.alias === 'UC_ONB_SPLASH');
  const welcome = pumlByDomain.onboarding.find(c => c.alias === 'UC_ONB_WELCOME');
  a01.aliases = [];
  if (splash) a01.aliases.push(splash.alias);
  if (welcome) a01.aliases.push(welcome.alias);
}

// --- 4. Status hints (KD1/KD2/KD3/KD13) ---
const STATUS_HINTS = {
  'UC-A06': 'button-only',     // KD13
  'UC-A09': 'undefined',        // KD2
  'UC-A10': 'undefined',        // KD3
};
for (const e of entries) {
  e.status = STATUS_HINTS[e.id] ?? 'defined';
}

// --- 5. Output ---
entries.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
overrides.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

const indexOut = {
  generated_by: 'scripts/usecases/_build-index.mjs',
  source_legacy: 'docs/architecture/use-case-diagram.md',
  source_pumls: 'docs/architecture/usecases/*.usecase.puml',
  total: entries.length,
  entries,
};
const overridesOut = {
  generated_by: 'scripts/usecases/_build-index.mjs',
  fuzzy_threshold: 0.7,
  ambiguity_band: 0.05,
  total: overrides.length,
  overrides,
};
writeFileSync(OUT_INDEX, JSON.stringify(indexOut, null, 2) + '\n');
writeFileSync(OUT_OVR, JSON.stringify(overridesOut, null, 2) + '\n');
console.log(`Wrote ${OUT_INDEX} (${entries.length} entries)`);
console.log(`Wrote ${OUT_OVR} (${overrides.length} overrides)`);
