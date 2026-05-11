#!/usr/bin/env node
// validate-go-calls.mjs — assert nav-graph + generated docs + lane-write protocol.
//
// Flags (all optional; if none given, run every check):
//   --schema-only           Only validate nav-graph against JSON Schema.
//   --check-generated       Only assert generated-file sha headers match nav-graph sha.
//   --check-cross-domain    Only assert cross-domain exclusivity rules.
//   --check-edge-exemptions Only assert happy-path exemptions carry kind:"happy".
//   --quiet                 Suppress per-check OK lines.
//
// Exit 0 = all pass; non-zero = at least one failure.

import fs from 'node:fs';
import path from 'node:path';
import {
  PROJECT_ROOT, NAV_GRAPH_PATH, FEATURES_DIR, DOCS_FLOWS_DIR, SCHEMA_DIR,
  listDomains, readNavGraph, readJsonFile, walkFiles, sha256OfFile,
  generatedHeader, EDGE_CASE_TEMPLATES, HAPPY_PATH_EXEMPTIONS,
  buildPageMaps, gitHeadShortBranch, gitStagedFiles, projectPrefixWithinGit,
} from './lib/repo.mjs';
import { validate } from './lib/json-validate.mjs';

const FLAGS = new Set(process.argv.slice(2));
const ALL = !['--schema-only','--check-generated','--check-cross-domain','--check-edge-exemptions']
  .some(f => FLAGS.has(f));
const QUIET = FLAGS.has('--quiet');

const errors = [];
function fail(check, msg) { errors.push(`[${check}] ${msg}`); }
function ok(check) { if (!QUIET) console.log(`[validate] ${check}: OK`); }

const navGraph = readNavGraph();
const navGraphSha = sha256OfFile(NAV_GRAPH_PATH).slice(0, 12);

// ─── (a) JSON Schema validation ──────────────────────────────────────────────
if (ALL || FLAGS.has('--schema-only')) {
  const schema = readJsonFile(path.join(SCHEMA_DIR, 'nav-graph.schema.json'));
  const errs = validate(schema, navGraph);
  if (errs.length) errs.forEach(e => fail('schema', e));
  else ok('schema(nav-graph)');

  const dmSchema = readJsonFile(path.join(SCHEMA_DIR, 'domain-meta.schema.json'));
  for (const d of listDomains()) {
    const metaP = path.join(FEATURES_DIR, d, 'domain.meta.json');
    if (!fs.existsSync(metaP)) continue;  // Phase-1 files; tolerate absence here.
    const obj = readJsonFile(metaP);
    const e2 = validate(dmSchema, obj);
    if (e2.length) e2.forEach(e => fail('schema(domain-meta)', `${d}: ${e}`));
  }
  ok('schema(domain-meta)');
}

// ─── (b) every edge target exists in states; (c) every state in src exists ──
if (ALL) {
  const stateIds = new Set(Object.keys(navGraph.states));
  for (const e of navGraph.edges) {
    if (!stateIds.has(e.from)) fail('edges', `edge from-id "${e.from}" not in states (${e.file}:${e.line})`);
    if (!stateIds.has(e.to))   fail('edges', `edge to-id "${e.to}" not in states (${e.file}:${e.line})`);
  }
  if (!errors.some(e => e.startsWith('[edges]'))) ok('edges(target-resolves)');

  // Every state declared in src/features/<d>/states.js exists in nav-graph.
  for (const d of listDomains()) {
    const sjs = path.join(FEATURES_DIR, d, 'states.js');
    if (!fs.existsSync(sjs)) continue;
    const src = fs.readFileSync(sjs, 'utf8');
    const re = /\{\s*id\s*:\s*['"]([a-z][a-z0-9_]*)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (!stateIds.has(m[1])) fail('src-coverage', `${d}/states.js declares "${m[1]}" but nav-graph.states is missing it`);
    }
  }
  if (!errors.some(e => e.startsWith('[src-coverage]'))) ok('src-coverage');
}

// ─── (d) generated-file sha headers match nav-graph sha ──────────────────────
if (ALL || FLAGS.has('--check-generated')) {
  const generatedRoots = [
    DOCS_FLOWS_DIR,
  ];
  const mmds = generatedRoots.flatMap(r =>
    walkFiles(r, p => p.endsWith('.mmd') || p.endsWith('.md') || p.endsWith('.html'))
  );
  let checked = 0, headerErrors = 0;
  for (const p of mmds) {
    const first = fs.readFileSync(p, 'utf8').split('\n', 2)[0];
    // Allow hand-curated files to skip the generated-sha header.
    if (first.includes('<!-- HAND-CURATED.')) continue;
    if (!first.startsWith('<!-- GENERATED FROM nav-graph-data.json sha=')) {
      // Files that aren't part of the generated set are silently skipped.
      continue;
    }
    checked++;
    const expected = generatedHeader(navGraphSha);
    if (first.trim() !== expected) {
      fail('generated-sha', `${path.relative(PROJECT_ROOT, p)}: header sha mismatch (expected ${navGraphSha})`);
      headerErrors++;
    }
  }
  if (!headerErrors) ok(`generated-sha(${checked} files)`);
}

// ─── (f, h) cross-domain exclusivity + edge-case template names ──────────────
if (ALL || FLAGS.has('--check-cross-domain')) {
  const { stateToDomain } = buildPageMaps();
  // Re-derive stateToDomain via states.js (since stateToDomain only covers SCREEN_MAP states).
  for (const d of listDomains()) {
    const sjs = path.join(FEATURES_DIR, d, 'states.js');
    if (!fs.existsSync(sjs)) continue;
    const src = fs.readFileSync(sjs, 'utf8');
    const re = /\{\s*id\s*:\s*['"]([a-z][a-z0-9_]*)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (!stateToDomain.has(m[1])) stateToDomain.set(m[1], d);
    }
  }

  // Verify each domain flow.mmd does not reference states outside its domain
  // outside the cross-domain stub block. Identifier match: surrounded by chars
  // outside [A-Za-z0-9_] (treats hyphens like 'course-library' as separators).
  for (const d of listDomains()) {
    const mmdP = path.join(DOCS_FLOWS_DIR, 'domains', d, 'flow.mmd');
    if (!fs.existsSync(mmdP)) continue;
    const src = fs.readFileSync(mmdP, 'utf8');
    // Strip cross-domain stub block (everything after '%% cross-domain' line).
    const stub = src.indexOf('%% cross-domain');
    let body = stub >= 0 ? src.slice(0, stub) : src;
    // Strip mermaid string labels ("...") and comment lines ('%% ...') so we
    // only check the structural identifier tokens.
    body = body
      .split('\n')
      .filter(l => !l.trimStart().startsWith('%%'))
      .join('\n')
      .replace(/"[^"]*"/g, '""');
    for (const stateId of Object.keys(navGraph.states)) {
      const owner = stateToDomain.get(stateId);
      if (owner === d) continue;
      if (!owner) continue;  // synthesized/undeclared state — skip; flagged separately
      // Identifier-aware boundary: previous + next chars must not be [A-Za-z0-9_].
      const re = new RegExp(`(^|[^A-Za-z0-9_])${stateId}([^A-Za-z0-9_]|$)`);
      if (re.test(body)) fail('cross-domain', `${d}/flow.mmd references foreign state "${stateId}" (owner=${owner}) outside cross-domain stub`);
    }
  }
  if (!errors.some(e => e.startsWith('[cross-domain]'))) ok('cross-domain');
}

// ─── (e, i) edge meta coverage + happy-path exemptions ───────────────────────
if (ALL || FLAGS.has('--check-edge-exemptions')) {
  // For every state with kind="edge", its owning domain.meta.json must list it
  // in edge_cases with at least one valid template name.
  const { stateToDomain } = buildPageMaps();
  for (const d of listDomains()) {
    const sjs = path.join(FEATURES_DIR, d, 'states.js');
    if (!fs.existsSync(sjs)) continue;
    const src = fs.readFileSync(sjs, 'utf8');
    const re = /\{\s*id\s*:\s*['"]([a-z][a-z0-9_]*)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (!stateToDomain.has(m[1])) stateToDomain.set(m[1], d);
    }
  }

  for (const [stateId, rec] of Object.entries(navGraph.states)) {
    if (rec.kind !== 'edge') continue;
    const d = stateToDomain.get(stateId);
    if (!d) { fail('edge-meta', `state "${stateId}" marked kind="edge" but no domain found`); continue; }
    const metaP = path.join(FEATURES_DIR, d, 'domain.meta.json');
    if (!fs.existsSync(metaP)) { fail('edge-meta', `state "${stateId}" kind="edge" but ${d}/domain.meta.json missing (Phase-1 lane work)`); continue; }
    const meta = readJsonFile(metaP);
    const entry = meta.edge_cases?.[stateId];
    if (!entry || !entry.length) {
      fail('edge-meta', `state "${stateId}" kind="edge" has no edge_cases[] entry in ${d}/domain.meta.json`);
      continue;
    }
    for (const tmpl of entry) {
      if (!EDGE_CASE_TEMPLATES.includes(tmpl)) {
        fail('edge-meta', `state "${stateId}" edge_cases[] contains invalid template "${tmpl}"`);
      }
    }
  }
  if (!errors.some(e => e.startsWith('[edge-meta]'))) ok('edge-meta');

  // (i) Happy-path exemptions.
  for (const exempt of HAPPY_PATH_EXEMPTIONS) {
    const rec = navGraph.states[exempt];
    if (!rec) {
      // If the state isn't in the nav-graph, no exemption violation (state may be undeclared).
      continue;
    }
    if (rec.kind && rec.kind !== 'happy') {
      fail('edge-exemptions', `state "${exempt}" is a documented happy-path exemption but has kind="${rec.kind}"`);
    }
    const d = (await import('./lib/repo.mjs')).buildPageMaps().stateToDomain.get(exempt);
    if (d) {
      const metaP = path.join(FEATURES_DIR, d, 'domain.meta.json');
      if (fs.existsSync(metaP)) {
        const meta = readJsonFile(metaP);
        if (meta.edge_cases?.[exempt]?.length) {
          fail('edge-exemptions', `state "${exempt}" is a happy-path exemption but has non-empty edge_cases[] in ${d}/domain.meta.json`);
        }
      }
    }
  }
  if (!errors.some(e => e.startsWith('[edge-exemptions]'))) ok('edge-exemptions');
}

// ─── (g) lane-write protocol — WARN-ONLY (no auto gate per 2026-05-11 decision) ──
// Prints to stderr if a lane-A/B/C/D branch stages forbidden files; never exits non-zero.
// Trunk safety is the lane-z Phase 1.5 re-extract, not this check.
if (ALL) {
  const branch = gitHeadShortBranch();
  const laneWarnings = [];
  if (/^lane-[A-Da-d]-/.test(branch)) {
    const prefix = projectPrefixWithinGit();
    const guardedTargets = [
      `${prefix}nav-graph-data.json`,
      `${prefix}docs/flows/domains/`,
      `${prefix}docs/flows/global.flow.mmd`,
      `${prefix}docs/flows/shared/cross-domain.flow.mmd`,
      `${prefix}docs/flows/user-flow.md`,
      `${prefix}docs/flows/user-flow.html`,
    ];
    const staged = gitStagedFiles();
    for (const f of staged) {
      // generated files inside docs/flows/domains/<d>/ are flow.mmd and go-calls.json only;
      // flow.md is hand-curated and IS allowed on lane branches.
      if (f.startsWith(`${prefix}docs/flows/domains/`)) {
        const base = path.basename(f);
        if (base === 'flow.md') continue;
      }
      if (f === guardedTargets[0] || f.startsWith(guardedTargets[1]) ||
          guardedTargets.slice(2).includes(f)) {
        laneWarnings.push(`branch "${branch}" stages "${f}" — Lane Z exclusive. Unstage before push (process discipline; lane-z Phase 1.5 will overwrite).`);
      }
    }
  }
  if (laneWarnings.length) {
    console.error('[validate] lane-write WARNINGS (process-discipline only; not blocking):');
    for (const w of laneWarnings) console.error('  ' + w);
  } else {
    ok(`lane-write(branch=${branch || 'unknown'})`);
  }
}

if (errors.length) {
  console.error('\n[validate] FAILED:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
} else {
  console.log('[validate] ALL CHECKS PASSED');
}
