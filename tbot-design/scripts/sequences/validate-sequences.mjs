#!/usr/bin/env node
// validate-sequences.mjs — sequence-tree validator.
//
// Phase 1 scope (per plan §8 step 3) — checks 1, 4, 9 (warn-only), 11, 13.
// Phase 2+ will enable 5 (endpoint normalization grep-back), 7 (_cross derived_from), 8 (index diff).
//
// Flags:
//   --schema-only            Only AC-4 frontmatter schema.
//   --require-all-systems    Only AC-1 subdir coverage.
//   --quiet                  Suppress per-check OK lines.
//
// Exit 0 = pass; non-zero = at least one failure.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../flows/lib/json-validate.mjs';
import { readFrontmatter } from './lib/parse-frontmatter.mjs';
import { countSurfaces } from './lib/per-surface-count.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, '..', '..');
const SEQ_DIR = path.join(PROJECT_ROOT, 'docs', 'sequences');
const SCHEMA_PATH = path.join(here, 'schema', 'sequence-frontmatter.schema.json');
const ACTORS_ALLOWLIST_PATH = path.join(SEQ_DIR, '_actors.md');
const PKG_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

// 15 systems with existing sequenceDiagram blocks in spec (per plan §4).
const ALL_SYSTEM_IDS = Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, '0'));

const FLAGS = new Set(process.argv.slice(2));
const ALL = !['--schema-only', '--require-all-systems'].some(f => FLAGS.has(f));
const QUIET = FLAGS.has('--quiet');

const errors = [];
const warnings = [];
function fail(check, msg) { errors.push(`[${check}] ${msg}`); }
function warn(check, msg) { warnings.push(`[${check}] ${msg}`); }
function ok(check) { if (!QUIET) console.log(`[validate-sequences] ${check}: OK`); }

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && p.endsWith('.sequence.mmd')) out.push(p);
  }
  return out;
}

function listSubdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

// ─── AC-1: every system (01-22) has matching docs/sequences/<n>-*/ subdir ───
if (ALL || FLAGS.has('--require-all-systems')) {
  const subdirs = listSubdirs(SEQ_DIR);
  for (const sys of ALL_SYSTEM_IDS) {
    const found = subdirs.some(d => d.startsWith(`${sys}-`));
    if (!found) fail('AC-1-coverage', `no docs/sequences/${sys}-*/ subdir found`);
  }
  if (!errors.some(e => e.startsWith('[AC-1-coverage]'))) ok(`AC-1-coverage(22 systems)`);
}

// ─── AC-4: frontmatter schema ──────────────────────────────────────────────
if (ALL || FLAGS.has('--schema-only')) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const seqFiles = walk(SEQ_DIR);
  let validated = 0;
  for (const p of seqFiles) {
    const rel = path.relative(PROJECT_ROOT, p);
    let fm;
    try { fm = readFrontmatter(p).data; }
    catch (e) { fail('AC-4-schema', `${rel}: ${e.message}`); continue; }
    const errs = validate(schema, fm);
    if (errs.length) {
      for (const e of errs) fail('AC-4-schema', `${rel}: ${e}`);
      continue;
    }
    // _cross/ variant: also requires systems[] + derived_from[].
    if (rel.includes(`${path.sep}_cross${path.sep}`)) {
      if (!Array.isArray(fm.systems) || fm.systems.length < 2) {
        fail('AC-4-schema', `${rel}: _cross/ file missing systems[] (≥2)`);
      }
      if (!Array.isArray(fm.derived_from) || fm.derived_from.length < 2) {
        fail('AC-4-schema', `${rel}: _cross/ file missing derived_from[] (≥2)`);
      }
    }
    validated++;
  }
  if (!errors.some(e => e.startsWith('[AC-4-schema]'))) ok(`AC-4-schema(${validated} files)`);
}

// ─── AC-9 (BLOCKING — frozen 2026-05-11 by Phase 3 Z2): participants ⊆ _actors.md ───
if (ALL) {
  if (fs.existsSync(ACTORS_ALLOWLIST_PATH)) {
    const text = fs.readFileSync(ACTORS_ALLOWLIST_PATH, 'utf8');
    const allow = new Set(extractAllowedActors(text));
    let scanned = 0, foreign = 0;
    for (const p of walk(SEQ_DIR)) {
      const rel = path.relative(PROJECT_ROOT, p);
      let fm;
      try { fm = readFrontmatter(p).data; } catch { continue; }
      if (!Array.isArray(fm.actors)) continue;
      scanned++;
      for (const a of fm.actors) {
        if (!allow.has(a)) {
          fail('AC-9-actors', `${rel}: actor "${a}" not in _actors.md (frozen allow-list)`);
          foreign++;
        }
      }
    }
    if (!foreign) ok(`AC-9-actors(${scanned} files, 0 foreign)`);
  } else {
    fail('AC-9-actors', `_actors.md missing — required (frozen allow-list)`);
  }
}

// ─── AC-11: per-surface count ─────────────────────────────────────────────
if (ALL) {
  const { counts } = countSurfaces();
  const missing = Object.entries(counts).filter(([, n]) => n < 1).map(([s]) => s);
  if (missing.length) {
    warn('AC-11-surface', `surfaces with 0 files: ${missing.join(', ')} (warn-only during Phase 1)`);
  } else {
    ok(`AC-11-surface(all required surfaces ≥1)`);
  }
}

// ─── AC-13: package.json scripts + script files present ───────────────────
if (ALL) {
  const REQUIRED_SCRIPTS = [
    'sequences:validate',
    'sequences:validate-mermaid',
    'sequences:index',
    'sequences:fast',
    'sequences:surface-check',
  ];
  const REQUIRED_FILES = [
    'scripts/sequences/validate-sequences.mjs',
    'scripts/sequences/validate-mermaid.mjs',
    'scripts/sequences/build-index.mjs',
    'scripts/sequences/extract-from-specs.mjs',
    'scripts/sequences/lib/per-surface-count.mjs',
  ];
  const pkg = JSON.parse(fs.readFileSync(PKG_JSON_PATH, 'utf8'));
  for (const s of REQUIRED_SCRIPTS) {
    if (!pkg.scripts?.[s]) fail('AC-13-scripts', `package.json missing script "${s}"`);
  }
  for (const f of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(PROJECT_ROOT, f))) {
      fail('AC-13-scripts', `expected file "${f}" missing on disk`);
    }
  }
  if (!errors.some(e => e.startsWith('[AC-13-scripts]'))) ok(`AC-13-scripts(${REQUIRED_SCRIPTS.length} scripts + ${REQUIRED_FILES.length} files)`);
}

function extractAllowedActors(text) {
  // Lines beginning with `- ` followed by an ident; tolerates `- Name — note`.
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*-\s+`?([A-Za-z][A-Za-z0-9_]*)`?/);
    if (m) out.push(m[1]);
  }
  return out;
}

if (warnings.length) {
  console.warn('\n[validate-sequences] WARNINGS:');
  for (const w of warnings) console.warn('  ' + w);
}
if (errors.length) {
  console.error('\n[validate-sequences] FAILED:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
} else {
  console.log('[validate-sequences] ALL CHECKS PASSED');
}
