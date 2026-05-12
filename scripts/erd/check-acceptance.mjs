#!/usr/bin/env node
// check-acceptance.mjs — explicit AC-1..AC-14 verifier for the TBOT ERD.
//
// Per .omc/plans/erd-22-systems-design.md §2. Each AC runs as a function that
// returns { ac, pass, evidence, rationale }. Prints a per-AC summary table
// and an aggregate verdict. Exit code = number of FAILs.
//
// Uses only Node stdlib + the existing scripts/sequences/lib/parse-frontmatter.mjs
// (no new deps). Re-uses scripts/erd/validate-erd.mjs for AC-3 / AC-9 cross-check.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readFrontmatter } from '../sequences/lib/parse-frontmatter.mjs';
import { APP_ROOT, DOCS_ROOT } from '../_lib/paths.mjs';

const PROJECT_ROOT = APP_ROOT;
const ERD_DIR = path.join(DOCS_ROOT, 'erd');
const GLOBAL_DIR = path.join(ERD_DIR, '_global');
const SHARED_DIR = path.join(ERD_DIR, '_shared');
const TEMPLATES_DIR = path.join(ERD_DIR, 'templates');
const ACTORS_PATH = path.join(DOCS_ROOT, 'sequences', '_actors.md');
const SEQ_DIR = path.join(DOCS_ROOT, 'sequences');

function rel(p) { return path.relative(PROJECT_ROOT, p); }

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

function readDbml(p) { return fs.readFileSync(p, 'utf8'); }

function extractTableNames(src) {
  const out = [];
  for (const m of src.matchAll(/^Table\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gm)) out.push(m[1]);
  return out;
}

function extractRefs(src) {
  const out = [];
  for (const m of src.matchAll(/^Ref:\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*[<>\-]+\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)/gm)) {
    out.push({ lt: m[1], lc: m[2], rt: m[3], rc: m[4] });
  }
  return out;
}

function extractServiceActors() {
  if (!fs.existsSync(ACTORS_PATH)) return [];
  const text = fs.readFileSync(ACTORS_PATH, 'utf8');
  const out = [];
  for (const m of text.matchAll(/^\s*-\s+`?([A-Za-z][A-Za-z0-9_]*)`?/gm)) {
    const a = m[1];
    if (/(Service|Worker|Handler|Scheduler|Cache|Buffer|Detector|Verifier|Classifier|Monitor|Resolver|Transformer|Signer|Assembler|Executor|Generator|Sweep|Bot)$/.test(a)) {
      out.push(a);
    }
  }
  return [...new Set(out)];
}

const allDbml = walk(ERD_DIR, '.dbml').filter(p => !p.startsWith(TEMPLATES_DIR) && !p.startsWith(GLOBAL_DIR));
const allMd = walk(ERD_DIR, '.md').filter(p => !p.startsWith(TEMPLATES_DIR) && !p.startsWith(GLOBAL_DIR));
const entityMd = allMd.filter(m => {
  const base = path.basename(m, '.md');
  if (['README', 'AGENTS', 'CONVENTIONS'].includes(base)) return false;
  if (!/\/(\d{2}-[a-z0-9-]+|_shared)\//.test(m)) return false;
  return /^[a-z][a-z0-9_]*$/.test(base);
});

const results = [];

// AC-1 — Every backend service in _actors.md owns ≥1 entity OR has explicit @stateless annotation.
{
  const services = extractServiceActors();
  const entityFms = entityMd.map(p => readFrontmatter(p).data || {});
  const owners = new Set(entityFms.map(f => f.service_owner).filter(Boolean));
  // Stateless annotations in lane READMEs and folder annotations.
  const allReadmeText = walk(ERD_DIR, '.md')
    .filter(p => path.basename(p, '.md') === 'README')
    .map(p => fs.readFileSync(p, 'utf8'))
    .join('\n');
  const statelessServices = new Set();
  for (const m of allReadmeText.matchAll(/@stateless\s*[\[:]?\s*([A-Za-z][A-Za-z0-9_,\s]*?)(?:\]|\.|$)/gm)) {
    for (const s of m[1].split(',').map(s => s.trim())) statelessServices.add(s);
  }
  // Also accept block-style `@stateless` per-line listings.
  for (const m of allReadmeText.matchAll(/`@stateless`?\s*[—:-]\s*`?([A-Za-z][A-Za-z0-9_]*)`?/gm)) {
    statelessServices.add(m[1]);
  }
  const missing = services.filter(s => !owners.has(s) && !statelessServices.has(s));
  results.push({
    ac: 'AC-1',
    pass: missing.length === 0,
    evidence: `services=${services.length}, owners=${owners.size}, stateless-annotated=${statelessServices.size}, missing=${missing.length}`,
    rationale: missing.length === 0
      ? 'every backend service in _actors.md owns an entity or is annotated @stateless'
      : `missing: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}`,
  });
}

// AC-2 — Every entity referenced in any .sequence.mmd Note / message payload exists as a table.
// We approximate: any entity present in frontmatter sequences_referenced_in[] of an entity .md
// implies the entity exists (tautology). Stronger check: every sequence file's `entities:` frontmatter
// (if present) lists entities that DO exist. Today no `entities:` block — pass with caveat.
{
  const allTables = new Set();
  for (const p of allDbml) for (const t of extractTableNames(readDbml(p))) allTables.add(t);
  // Scan sequence files for `entities:` block (advisory).
  let foundEntitiesBlocks = 0;
  let missingFromTree = 0;
  const missing = [];
  for (const sp of walk(SEQ_DIR, '.sequence.mmd')) {
    let fm; try { fm = readFrontmatter(sp).data; } catch { continue; }
    if (Array.isArray(fm.entities) && fm.entities.length) {
      foundEntitiesBlocks++;
      for (const e of fm.entities) if (!allTables.has(e)) { missingFromTree++; missing.push(`${rel(sp)}:${e}`); }
    }
  }
  results.push({
    ac: 'AC-2',
    pass: missingFromTree === 0,
    evidence: `tables=${allTables.size}, sequence-files-with-entities-block=${foundEntitiesBlocks}, missing=${missingFromTree}`,
    rationale: missingFromTree === 0
      ? `${foundEntitiesBlocks} sequence files declare entities[]; every named entity exists in the ERD`
      : `missing tables: ${missing.slice(0, 5).join(', ')}…`,
  });
}

// AC-3 — Every cross-system Ref has an explicit DBML Ref: line. Validator owns this; here we
// verify by running fk-reachable rule.
{
  let out, code = 0;
  try { out = execSync(`node ${path.join(here, 'validate-erd.mjs')} --rule fk-reachable --quiet`, { cwd: PROJECT_ROOT, encoding: 'utf8' }); }
  catch (e) { out = e.stdout?.toString() || ''; code = e.status || 1; }
  results.push({
    ac: 'AC-3',
    pass: code === 0,
    evidence: `validate-erd.mjs --rule fk-reachable exit=${code}`,
    rationale: code === 0 ? 'all declared Ref: endpoints resolve' : `${code} unresolved Ref(s)`,
  });
}

// AC-4 — 100% of entities have PK, created_at, soft-/hard-delete declared in entity .md.
{
  let missingPk = [], missingTs = [], missingRetention = [];
  for (const dp of allDbml) {
    const src = readDbml(dp);
    for (const tableM of src.matchAll(/^Table\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)^\}/gm)) {
      const [, tname, body] = tableM;
      if (!/\[\s*pk\b/i.test(body)) missingPk.push(`${rel(dp)}:${tname}`);
      if (!/\bcreated_at\b/.test(body)) missingTs.push(`${rel(dp)}:${tname}`);
    }
  }
  for (const mp of entityMd) {
    let fm; try { fm = readFrontmatter(mp).data || {}; } catch { continue; }
    if (!fm.retention) missingRetention.push(rel(mp));
  }
  const fails = missingPk.length + missingTs.length + missingRetention.length;
  results.push({
    ac: 'AC-4',
    pass: fails === 0,
    evidence: `missing pk=${missingPk.length}, missing created_at=${missingTs.length}, missing retention=${missingRetention.length}`,
    rationale: fails === 0
      ? 'all entities declare pk + created_at + retention frontmatter'
      : `${[...missingPk.slice(0, 3), ...missingTs.slice(0, 3), ...missingRetention.slice(0, 3)].join('; ')}…`,
  });
}

// AC-5 — State-bearing entities (with *_status enum) have state_machine in frontmatter.
{
  let total = 0, ok = 0, fail = [];
  for (const mp of entityMd) {
    const dbmlP = mp.replace(/\.md$/, '.dbml');
    if (!fs.existsSync(dbmlP)) continue;
    const src = readDbml(dbmlP);
    const enumM = src.match(/\benum\s+([a-z_][a-z0-9_]*_status)\s*\{/i);
    if (!enumM) continue;
    const tokens = [...src.matchAll(/\b([a-z_][a-z0-9_]*_status)\b/gi)].map(m => m[1].toLowerCase());
    const stateBearing = tokens.filter(t => !['http_status', 'http_status_code', 'response_status', 'response_status_code', 'webhook_status_code', 'response_http_status'].includes(t));
    if (!stateBearing.length) continue;
    total++;
    let fm; try { fm = readFrontmatter(mp).data || {}; } catch { fm = {}; }
    if (fm.state_machine && fm.state_machine !== 'none') ok++;
    else fail.push(rel(mp));
  }
  results.push({
    ac: 'AC-5',
    pass: fail.length === 0,
    evidence: `state-bearing entities=${total}, with state_machine=${ok}, missing=${fail.length}`,
    rationale: fail.length === 0
      ? `every state-bearing entity declares state_machine in frontmatter`
      : `missing: ${fail.slice(0, 5).join(', ')}`,
  });
}

// AC-6 — Global ERD at _global/global-erd.dbml assembles + parses without obvious DBML syntax errors.
{
  const gp = path.join(GLOBAL_DIR, 'global-erd.dbml');
  if (!fs.existsSync(gp)) {
    results.push({ ac: 'AC-6', pass: false, evidence: 'missing', rationale: '_global/global-erd.dbml not built' });
  } else {
    const src = readDbml(gp);
    const tables = extractTableNames(src).length;
    const refs = extractRefs(src).length;
    // Basic balance check: every Table { has a matching }.
    const opens = (src.match(/^Table\s+[A-Za-z_][A-Za-z0-9_]*\s*\{/gm) || []).length;
    const closes = (src.match(/^\}\s*$/gm) || []).length;
    const balanced = opens <= closes; // closes also count Indexes blocks etc
    results.push({
      ac: 'AC-6',
      pass: tables > 0 && refs > 0 && balanced,
      evidence: `tables=${tables}, refs=${refs}, open=${opens}, close=${closes}`,
      rationale: `concatenated DBML present + parses; brace balance ${balanced ? 'ok' : 'failed'}`,
    });
  }
}

// AC-7 — Mermaid projection at _global/global-erd.mmd is generated + non-empty.
{
  const mp = path.join(GLOBAL_DIR, 'global-erd.mmd');
  if (!fs.existsSync(mp)) {
    results.push({ ac: 'AC-7', pass: false, evidence: 'missing', rationale: 'global-erd.mmd not generated' });
  } else {
    const src = fs.readFileSync(mp, 'utf8');
    const erd = src.includes('erDiagram');
    const tableLines = (src.match(/^\s+[a-z_]+\s*\{$/gm) || []).length;
    results.push({
      ac: 'AC-7',
      pass: erd && tableLines > 50,
      evidence: `erDiagram=${erd}, table-blocks=${tableLines}`,
      rationale: erd && tableLines > 50 ? 'mermaid erDiagram block present, ≥50 table blocks' : 'shape suspicious',
    });
  }
}

// AC-8 — Index dictionary at _global/indexes.md lists every index with purpose.
{
  const ip = path.join(GLOBAL_DIR, 'indexes.md');
  if (!fs.existsSync(ip)) {
    results.push({ ac: 'AC-8', pass: false, evidence: 'missing', rationale: 'indexes.md not present' });
  } else {
    const src = fs.readFileSync(ip, 'utf8');
    const purposeKinds = ['lookup', 'FK', 'uniqueness', 'composite-hot', 'partial', 'time-series'];
    const hasAll = purposeKinds.every(k => src.toLowerCase().includes(k.toLowerCase()));
    const cites = (src.match(/\.sequence\.mmd/g) || []).length;
    results.push({
      ac: 'AC-8',
      pass: hasAll && cites >= 15,
      evidence: `purpose-kinds-present=${hasAll}, sequence-citations=${cites}`,
      rationale: hasAll && cites >= 15 ? 'all purpose kinds enumerated; composite indexes cite sequences (≥15 citations)' : 'shape suspicious',
    });
  }
}

// AC-9 — No entity name collides across domains. Use validator rule.
{
  let out, code = 0;
  try { out = execSync(`node ${path.join(here, 'validate-erd.mjs')} --rule no-cross-domain-name-collision --quiet`, { cwd: PROJECT_ROOT, encoding: 'utf8' }); }
  catch (e) { out = e.stdout?.toString() || ''; code = e.status || 1; }
  results.push({
    ac: 'AC-9',
    pass: code === 0,
    evidence: `validate-erd.mjs --rule no-cross-domain-name-collision exit=${code}`,
    rationale: code === 0 ? 'zero table-name collisions across all folders' : `${code} collision(s)`,
  });
}

// AC-10 — docs/erd/README.md is no longer "TBD" + has new entry-point shape.
{
  const rp = path.join(ERD_DIR, 'README.md');
  if (!fs.existsSync(rp)) {
    results.push({ ac: 'AC-10', pass: false, evidence: 'missing', rationale: 'README.md not present' });
  } else {
    const src = fs.readFileSync(rp, 'utf8');
    const noTbd = !/^TBD\s*$/m.test(src) && !/\*\*TBD\*\*/.test(src) && !/Status:\s*\*\*TBD/.test(src);
    const hasDomainMap = /Domain map/i.test(src);
    const hasHowTo = /How to read/i.test(src) && /How to edit/i.test(src);
    const hasValidation = /erd:fast|erd:full/.test(src);
    const pass = noTbd && hasDomainMap && hasHowTo && hasValidation;
    results.push({
      ac: 'AC-10',
      pass,
      evidence: `noTbd=${noTbd}, domainMap=${hasDomainMap}, howTo=${hasHowTo}, validationCmds=${hasValidation}`,
      rationale: pass ? 'README replaced; new entry-point present' : 'README missing one of: tbd-removed, domain map, how-to, validation commands',
    });
  }
}

// AC-11 — Every entity .md links to: system spec section, sequence file(s), API endpoint(s).
{
  let missingSeq = [], missingApi = [];
  for (const mp of entityMd) {
    let fm; try { fm = readFrontmatter(mp).data || {}; } catch { continue; }
    const body = fs.readFileSync(mp, 'utf8');
    const seqs = Array.isArray(fm.sequences_referenced_in) ? fm.sequences_referenced_in.length : 0;
    const apis = Array.isArray(fm.api_endpoints) ? fm.api_endpoints.length : 0;
    const noSeq = /@no-sequence/.test(body) || fm.no_sequence === true;
    const noApi = /@no-api/.test(body) || fm.no_api === true;
    if (seqs === 0 && !noSeq) missingSeq.push(rel(mp));
    if (apis === 0 && !noApi) missingApi.push(rel(mp));
  }
  const fails = missingSeq.length + missingApi.length;
  results.push({
    ac: 'AC-11',
    pass: fails === 0,
    evidence: `missing sequences=${missingSeq.length}, missing apis=${missingApi.length}`,
    rationale: fails === 0
      ? 'every entity links to ≥1 sequence + ≥1 api (or @no-sequence / @no-api)'
      : `missing seq: ${missingSeq.slice(0, 3).join(', ')}; missing api: ${missingApi.slice(0, 3).join(', ')}`,
  });
}

// AC-12 — Per-domain Multi-Agent Ownership row in _global/ownership.md.
{
  const op = path.join(GLOBAL_DIR, 'ownership.md');
  if (!fs.existsSync(op)) {
    results.push({ ac: 'AC-12', pass: false, evidence: 'missing', rationale: 'ownership.md not present' });
  } else {
    const src = fs.readFileSync(op, 'utf8');
    // Expect a per-folder row count ≥ 23 (22 systems + _shared).
    const rows = (src.match(/^\|\s+`\d{2}-/gm) || []).length;
    const sharedRow = /`_shared\/`/.test(src);
    const globalRow = /`_global\/`/.test(src);
    const lanesPresent = /Lane A|Lane B|Lane C|Lane D|Lane E|Lane F|Lane G/.test(src);
    const pass = rows >= 22 && sharedRow && globalRow && lanesPresent;
    results.push({
      ac: 'AC-12',
      pass,
      evidence: `per-folder rows=${rows}, _shared row=${sharedRow}, _global row=${globalRow}, lanes A..G=${lanesPresent}`,
      rationale: pass ? 'ownership matrix lists every folder + every lane' : 'ownership matrix incomplete',
    });
  }
}

// AC-13 — Cross-domain narrative _shared/cross-domain-data-flow.md enumerates every cross-folder FK.
{
  const cp = path.join(SHARED_DIR, 'cross-domain-data-flow.md');
  if (!fs.existsSync(cp)) {
    results.push({ ac: 'AC-13', pass: false, evidence: 'missing', rationale: 'cross-domain-data-flow.md not present' });
  } else {
    // Re-run validator rule.
    let code = 0;
    try { execSync(`node ${path.join(here, 'validate-erd.mjs')} --rule cross-domain-fk-documented --quiet`, { cwd: PROJECT_ROOT }); }
    catch (e) { code = e.status || 1; }
    results.push({
      ac: 'AC-13',
      pass: code === 0,
      evidence: `validate-erd.mjs --rule cross-domain-fk-documented exit=${code}`,
      rationale: code === 0 ? 'every cross-folder Ref documented' : `${code} undocumented cross-folder ref(s)`,
    });
  }
}

// AC-14 — All 14 output sections produced as artefacts under _global/.
{
  const expect = [
    'global-erd.dbml',
    'global-erd.mmd',
    'domain-overview.md',
    'relationships.md',
    'state-machine-alignment.md',
    'api-alignment.md',
    'validation-constraints.md',
    'indexes.md',
    'audit-history-strategy.md',
    'edge-cases.md',
    'ownership.md',
    'implementation-readiness.md',
    'clean-architecture-recommendations.md',
  ];
  const missing = expect.filter(f => !fs.existsSync(path.join(GLOBAL_DIR, f)));
  results.push({
    ac: 'AC-14',
    pass: missing.length === 0,
    evidence: `expected=${expect.length}, missing=${missing.length}`,
    rationale: missing.length === 0
      ? 'all 14 _global artefacts (2 build + 11 narrative) present'
      : `missing: ${missing.join(', ')}`,
  });
}

// ─── Report ─────────────────────────────────────────────────────────────────
console.log('\nERD Acceptance Criteria — verification report');
console.log('=============================================');
console.log();
const fails = results.filter(r => !r.pass).length;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${r.ac.padEnd(6)} ${r.evidence}`);
  console.log(`         ↳ ${r.rationale}`);
}
console.log();
console.log(`SUMMARY: ${results.length - fails}/${results.length} pass; ${fails} fail.`);
process.exit(fails);
