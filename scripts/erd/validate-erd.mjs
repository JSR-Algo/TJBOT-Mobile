#!/usr/bin/env node
// validate-erd.mjs — DBML + entity-markdown lint for docs/erd/.
//
// Implements rules AC-1..AC-13 from .omc/plans/erd-22-systems-design.md §8.
//
// Severities:
//   FAIL — blocks (exit code increments).
//   WARN — advisory (printed, exit 0 unless other FAILs).
//
// Rules implemented (FAIL):
//   dbml-syntax                   — basic DBML lexer-level checks (Table/Ref balance, no inline [ref:], no naive timestamp, no serial/bigserial PK, no varchar() without length, no numeric/decimal for money).
//   entity-has-pk                 — every Table block declares a [pk] column.
//   entity-has-timestamps         — Table needs created_at + updated_at unless frontmatter sibling .md has `@stateless`.
//   fk-reachable                  — every `Ref:` resolves to an existing column.
//   no-cross-domain-name-collision— same table name in two folders fails.
//   entity-md-required            — every *.dbml has matching *.md.
//   entity-md-frontmatter         — frontmatter contains entity, domain, service_owner, retention.
//
// Rules implemented (WARN):
//   entity-md-sequences-referenced — list ≥1 sequence file OR @no-sequence annotation.
//   service-has-entities           — every actor in _actors.md backend-service block has ≥1 entity OR `@stateless` annotation in its lane.
//   state-machine-alignment        — Tables with a `<entity>_status` enum reference need state_machine in frontmatter.
//   index-justified                — composite indexes cite a sequence file in DBML Note:.
//   cross-domain-fk-documented     — cross-folder FK referenced in _shared/cross-domain-data-flow.md.
//
// Flags:
//   --rule <name>     Run only one rule.
//   --quiet           Suppress per-rule OK lines.
//
// Exit code: number of FAIL findings (0 = pass).
// Format: `<sev>: <relpath>:<line> <rule> — <msg>`.
//
// No new npm deps — Node stdlib + scripts/sequences/lib/parse-frontmatter.mjs (already on disk).

import fs from 'node:fs';
import path from 'node:path';
import { readFrontmatter } from '../sequences/lib/parse-frontmatter.mjs';
import { parseDbml } from './lib/parse-dbml.mjs';
import { APP_ROOT, DOCS_ROOT } from '../_lib/paths.mjs';

const PROJECT_ROOT = APP_ROOT;
const ERD_DIR = path.join(DOCS_ROOT, 'erd');
const TEMPLATES_DIR = path.join(ERD_DIR, 'templates');
const ACTORS_PATH = path.join(DOCS_ROOT, 'sequences', '_actors.md');
const CROSS_DOMAIN_DOC = path.join(ERD_DIR, '_shared', 'cross-domain-data-flow.md');

const ARGS = process.argv.slice(2);
let onlyRule = null;
let quiet = false;
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--rule' && ARGS[i + 1]) { onlyRule = ARGS[++i]; }
  else if (ARGS[i] === '--quiet') { quiet = true; }
}

const findings = [];
function fail(rule, file, line, msg) {
  if (onlyRule && onlyRule !== rule) return;
  findings.push({ sev: 'FAIL', rule, file, line, msg });
}
function warn(rule, file, line, msg) {
  if (onlyRule && onlyRule !== rule) return;
  findings.push({ sev: 'WARN', rule, file, line, msg });
}
function ok(rule, msg) {
  if (quiet) return;
  if (onlyRule && onlyRule !== rule) return;
  console.log(`[validate-erd] ${rule}: OK ${msg}`);
}

function walk(dir, ext) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, ext));
    else if (ent.isFile() && p.endsWith(ext)) out.push(p);
  }
  return out;
}

function rel(p) { return path.relative(PROJECT_ROOT, p); }

function isTemplateOrGlobal(absPath) {
  return absPath.startsWith(TEMPLATES_DIR) ||
         absPath.startsWith(path.join(ERD_DIR, '_global'));
}

// ─── Parse DBML (extracted to lib/parse-dbml.mjs) ───────────────────────────
// parseDbml() imported above; shared with scripts/erd/dbml-to-prisma.mjs.

// ─── Collect all DBML + MD ──────────────────────────────────────────────────
const GLOBAL_DIR = path.join(ERD_DIR, '_global');
const allDbml = walk(ERD_DIR, '.dbml').filter(p => !p.startsWith(TEMPLATES_DIR) && !p.startsWith(GLOBAL_DIR));
const allMd = walk(ERD_DIR, '.md').filter(p => !p.startsWith(TEMPLATES_DIR));
const templateDbml = walk(TEMPLATES_DIR, '.dbml');
const templateMd = walk(TEMPLATES_DIR, '.md');

// Parse every DBML (entity + template, separately tracked).
const parsedEntities = allDbml.map(p => ({ abs: p, parsed: parseDbml(fs.readFileSync(p, 'utf8'), p) }));
const parsedTemplates = templateDbml.map(p => ({ abs: p, parsed: parseDbml(fs.readFileSync(p, 'utf8'), p) }));

// ─── Rule: dbml-syntax ──────────────────────────────────────────────────────
{
  let any = false;
  for (const { abs, parsed } of [...parsedEntities, ...parsedTemplates]) {
    for (const v of parsed.violations) {
      fail('dbml-syntax', rel(abs), v.line, v.msg);
      any = true;
    }
  }
  if (!any) ok('dbml-syntax', `(${parsedEntities.length + parsedTemplates.length} files)`);
}

// ─── Rule: entity-has-pk ────────────────────────────────────────────────────
{
  let any = false;
  for (const { abs, parsed } of [...parsedEntities, ...parsedTemplates]) {
    for (const t of parsed.tables) {
      const hasPk = t.columns.some(c => /\bpk\b/i.test(c.attrs));
      if (!hasPk) {
        fail('entity-has-pk', rel(abs), t.line, `table "${t.name}" has no [pk] column`);
        any = true;
      }
    }
  }
  if (!any) ok('entity-has-pk', '');
}

// ─── Rule: entity-md-required (every *.dbml has *.md and vice versa) ────────
{
  const mdSet = new Set(allMd.map(p => p.replace(/\.md$/, '')));
  const dbmlSet = new Set(allDbml.map(p => p.replace(/\.dbml$/, '')));
  let any = false;
  for (const d of allDbml) {
    const stem = d.replace(/\.dbml$/, '');
    if (!mdSet.has(stem)) {
      fail('entity-md-required', rel(d), 1, `missing sibling .md (expected ${rel(stem)}.md)`);
      any = true;
    }
  }
  for (const m of allMd) {
    const stem = m.replace(/\.md$/, '');
    const base = path.basename(stem);
    // README and AGENTS and CONVENTIONS are folder docs, not entity docs.
    if (['README', 'AGENTS', 'CONVENTIONS'].includes(base)) continue;
    // _global narrative docs are intentionally bare.
    if (m.startsWith(path.join(ERD_DIR, '_global'))) continue;
    if (!dbmlSet.has(stem)) {
      // It is allowed to have lane README.md / narrative notes; only complain when filename looks like entity.
      // Heuristic: an "entity .md" sits at <domain>/<lower_snake>.md and doesn't match the exempt list.
      const inDomain = /\/(\d{2}-[a-z0-9-]+|_shared)\//.test(m);
      if (inDomain && /^[a-z][a-z0-9_]*$/.test(base)) {
        fail('entity-md-required', rel(m), 1, `missing sibling .dbml (expected ${rel(stem)}.dbml)`);
        any = true;
      }
    }
  }
  if (!any) ok('entity-md-required', '');
}

// ─── Rule: entity-md-frontmatter ────────────────────────────────────────────
const REQUIRED_FM = ['entity', 'domain', 'service_owner', 'retention'];
const entityMdData = []; // {abs, fm, body}
{
  let any = false;
  for (const m of allMd) {
    const base = path.basename(m, '.md');
    if (['README', 'AGENTS', 'CONVENTIONS'].includes(base)) continue;
    if (m.startsWith(path.join(ERD_DIR, '_global'))) continue;
    // Only treat <lower_snake>.md inside a domain folder as an entity .md. Narrative
    // / cross-cutting notes (e.g. _shared/cross-domain-data-flow.md) skip the rule.
    const inDomain = /\/(\d{2}-[a-z0-9-]+|_shared)\//.test(m);
    if (!(inDomain && /^[a-z][a-z0-9_]*$/.test(base))) continue;
    let parsed;
    try { parsed = readFrontmatter(m); }
    catch (e) { fail('entity-md-frontmatter', rel(m), 1, `frontmatter parse error: ${e.message}`); any = true; continue; }
    const fm = parsed.data || {};
    for (const k of REQUIRED_FM) {
      if (fm[k] === undefined || fm[k] === null || fm[k] === '') {
        fail('entity-md-frontmatter', rel(m), 1, `missing required frontmatter key "${k}"`);
        any = true;
      }
    }
    entityMdData.push({ abs: m, fm, body: parsed.body || '' });
  }
  if (!any) ok('entity-md-frontmatter', `(${entityMdData.length} entity .md files)`);
}

// ─── Rule: entity-has-timestamps ────────────────────────────────────────────
{
  let any = false;
  const statelessSet = new Set();
  for (const ent of entityMdData) {
    if (/@stateless/.test(ent.body) || ent.fm.stateless === true) {
      statelessSet.add(ent.abs.replace(/\.md$/, ''));
    }
  }
  for (const { abs, parsed } of parsedEntities) {
    const stem = abs.replace(/\.dbml$/, '');
    const skip = statelessSet.has(stem);
    if (skip) continue;
    for (const t of parsed.tables) {
      const colNames = new Set(t.columns.map(c => c.name));
      if (!colNames.has('created_at')) {
        fail('entity-has-timestamps', rel(abs), t.line, `table "${t.name}" missing created_at (add @stateless to ${path.basename(stem)}.md to waive)`);
        any = true;
      }
      if (!colNames.has('updated_at')) {
        fail('entity-has-timestamps', rel(abs), t.line, `table "${t.name}" missing updated_at`);
        any = true;
      }
    }
  }
  if (!any) ok('entity-has-timestamps', '');
}

// ─── Rule: fk-reachable ─────────────────────────────────────────────────────
{
  let any = false;
  // Build global table → column map across entities + templates.
  const colMap = new Map(); // table → Set(col)
  for (const { parsed } of [...parsedEntities, ...parsedTemplates]) {
    for (const t of parsed.tables) {
      if (!colMap.has(t.name)) colMap.set(t.name, new Set());
      for (const c of t.columns) colMap.get(t.name).add(c.name);
    }
  }
  for (const { abs, parsed } of [...parsedEntities, ...parsedTemplates]) {
    for (const r of parsed.refs) {
      const leftOk = colMap.has(r.leftTable) && colMap.get(r.leftTable).has(r.leftCol);
      const rightOk = colMap.has(r.rightTable) && colMap.get(r.rightTable).has(r.rightCol);
      if (!leftOk) {
        fail('fk-reachable', rel(abs), r.line, `Ref endpoint ${r.leftTable}.${r.leftCol} not found`);
        any = true;
      }
      if (!rightOk) {
        fail('fk-reachable', rel(abs), r.line, `Ref endpoint ${r.rightTable}.${r.rightCol} not found`);
        any = true;
      }
    }
  }
  if (!any) ok('fk-reachable', '');
}

// ─── Rule: no-cross-domain-name-collision ───────────────────────────────────
{
  let any = false;
  const nameMap = new Map(); // tableName → [folder]
  for (const { abs, parsed } of parsedEntities) {
    const segs = rel(abs).split(path.sep);
    // docs/erd/<NN-system>/<file>.dbml — folder = segs[2].
    const folder = segs[2] || '(root)';
    for (const t of parsed.tables) {
      if (!nameMap.has(t.name)) nameMap.set(t.name, []);
      nameMap.get(t.name).push({ folder, abs });
    }
  }
  for (const [name, occs] of nameMap.entries()) {
    const folders = new Set(occs.map(o => o.folder));
    if (folders.size > 1) {
      for (const o of occs) {
        fail('no-cross-domain-name-collision', rel(o.abs), 1, `table name "${name}" appears in multiple folders: ${[...folders].join(', ')}`);
        any = true;
      }
    }
  }
  if (!any) ok('no-cross-domain-name-collision', '');
}

// ─── Rule: entity-md-sequences-referenced (WARN) ────────────────────────────
{
  let anyW = false;
  for (const ent of entityMdData) {
    if (/@no-sequence/.test(ent.body) || ent.fm.no_sequence === true) continue;
    const seqs = ent.fm.sequences_referenced_in;
    if (!Array.isArray(seqs) || seqs.length === 0) {
      warn('entity-md-sequences-referenced', rel(ent.abs), 1, 'frontmatter sequences_referenced_in is empty (add @no-sequence to waive)');
      anyW = true;
    }
  }
  if (!anyW) ok('entity-md-sequences-referenced', '');
}

// ─── Rule: service-has-entities (WARN) ──────────────────────────────────────
{
  let anyW = false;
  if (fs.existsSync(ACTORS_PATH)) {
    const text = fs.readFileSync(ACTORS_PATH, 'utf8');
    // Extract just the "tjbot backend services" block. Heuristic: actors with `Service`/`Worker`/`Handler`/`Scheduler`/`Cache`/`Buffer` suffix.
    const serviceActors = [];
    for (const m of text.matchAll(/^\s*-\s+`?([A-Za-z][A-Za-z0-9_]*)`?/gm)) {
      const a = m[1];
      if (/(Service|Worker|Handler|Scheduler|Cache|Buffer|Detector|Verifier|Classifier|Monitor|Resolver|Transformer|Signer|Assembler|Executor|Generator|Sweep|tjtjbot)$/.test(a)) {
        serviceActors.push(a);
      }
    }
    const ownerSet = new Set(entityMdData.map(e => e.fm.service_owner).filter(Boolean));
    // Walk lane READMEs collecting any service flagged `@stateless: ServiceName`.
    const statelessSet = new Set();
    const readmes = [];
    for (const p of walk(ERD_DIR, '.md')) {
      if (path.basename(p, '.md') === 'README') readmes.push(p);
    }
    for (const rp of readmes) {
      const src = fs.readFileSync(rp, 'utf8');
      for (const m of src.matchAll(/@stateless:\s*`?([A-Za-z][A-Za-z0-9_]*)`?/g)) statelessSet.add(m[1]);
    }
    for (const sa of new Set(serviceActors)) {
      if (!ownerSet.has(sa) && !statelessSet.has(sa)) {
        warn('service-has-entities', rel(ACTORS_PATH), 1, `backend service "${sa}" owns 0 entities (annotate @stateless in its lane README to waive)`);
        anyW = true;
      }
    }
  } else {
    warn('service-has-entities', rel(ACTORS_PATH), 0, '_actors.md missing — cannot evaluate rule');
    anyW = true;
  }
  if (!anyW) ok('service-has-entities', '');
}

// ─── Rule: state-machine-alignment (WARN) ───────────────────────────────────
{
  let anyW = false;
  // Build set of enum names declared.
  const enumNames = new Set();
  for (const { parsed } of [...parsedEntities, ...parsedTemplates]) {
    for (const e of parsed.enums) enumNames.add(e.name);
  }
  // Names that look like *_status but represent HTTP / RPC response codes — never a state machine.
  const HTTP_STATUS_ALLOWLIST = new Set([
    'http_status', 'http_status_code', 'response_status', 'response_status_code',
    'webhook_status_code', 'response_http_status',
  ]);
  for (const ent of entityMdData) {
    const dbml = ent.abs.replace(/\.md$/, '.dbml');
    if (!fs.existsSync(dbml)) continue;
    const src = fs.readFileSync(dbml, 'utf8');
    // Only fire when the file actually declares a state-machine enum: `enum <name>_status {`.
    const enumDecl = src.match(/\benum\s+([a-z_][a-z0-9_]*_status)\s*\{/i);
    if (!enumDecl) continue;
    // If the only "_status" tokens in the file are HTTP-style allow-list names, skip.
    const tokens = [...src.matchAll(/\b([a-z_][a-z0-9_]*_status)\b/gi)].map(m => m[1].toLowerCase());
    const stateBearing = tokens.filter(t => !HTTP_STATUS_ALLOWLIST.has(t));
    if (stateBearing.length === 0) continue;
    const sm = ent.fm.state_machine;
    if (!sm || sm === 'none') {
      warn('state-machine-alignment', rel(ent.abs), 1, `entity declares enum ${enumDecl[1]} but frontmatter state_machine is "${sm || '(missing)'}"`);
      anyW = true;
    }
  }
  if (!anyW) ok('state-machine-alignment', '');
}

// ─── Rule: index-justified (WARN) ───────────────────────────────────────────
{
  let anyW = false;
  for (const { abs, parsed } of parsedEntities) {
    for (const t of parsed.tables) {
      for (const idx of t.indexes) {
        if (idx.unique) continue; // uniqueness needs no sequence justification.
        if (idx.cols.length < 2) continue; // single-col indexes are obvious.
        if (!/docs\/sequences\//.test(idx.note)) {
          warn('index-justified', rel(abs), idx.line, `composite index on (${idx.cols.join(', ')}) lacks docs/sequences/ note`);
          anyW = true;
        }
      }
    }
  }
  if (!anyW) ok('index-justified', '');
}

// ─── Rule: cross-domain-fk-documented (WARN) ────────────────────────────────
{
  let anyW = false;
  const folderOf = new Map(); // tableName → folder
  for (const { abs, parsed } of parsedEntities) {
    const segs = rel(abs).split(path.sep);
    const folder = segs[2] || '(root)';
    for (const t of parsed.tables) folderOf.set(t.name, folder);
  }
  const crossDoc = fs.existsSync(CROSS_DOMAIN_DOC) ? fs.readFileSync(CROSS_DOMAIN_DOC, 'utf8') : '';
  for (const { abs, parsed } of parsedEntities) {
    for (const r of parsed.refs) {
      const lf = folderOf.get(r.leftTable);
      const rf = folderOf.get(r.rightTable);
      if (!lf || !rf || lf === rf) continue;
      const tag = `${r.leftTable}.${r.leftCol} -> ${r.rightTable}.${r.rightCol}`;
      if (!crossDoc.includes(r.leftTable) || !crossDoc.includes(r.rightTable)) {
        warn('cross-domain-fk-documented', rel(abs), r.line, `cross-folder ref ${tag} not documented in _shared/cross-domain-data-flow.md`);
        anyW = true;
      }
    }
  }
  if (!anyW) ok('cross-domain-fk-documented', '');
}

// ─── Print findings ─────────────────────────────────────────────────────────
const fails = findings.filter(f => f.sev === 'FAIL');
const warns = findings.filter(f => f.sev === 'WARN');

if (warns.length) {
  console.warn('\n[validate-erd] WARNINGS:');
  for (const w of warns) console.warn(`  WARN: ${w.file}:${w.line} ${w.rule} — ${w.msg}`);
}
if (fails.length) {
  console.error('\n[validate-erd] FAILED:');
  for (const f of fails) console.error(`  FAIL: ${f.file}:${f.line} ${f.rule} — ${f.msg}`);
  process.exit(fails.length);
}

if (!quiet) console.log('\n[validate-erd] ALL CHECKS PASSED');
process.exit(0);
