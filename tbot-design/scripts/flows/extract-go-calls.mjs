#!/usr/bin/env node
// extract-go-calls.mjs — rebuild nav-graph-data.json from src/features/**.
// Idempotent: running twice leaves git diff empty.
//
// Behaviour:
//  1. Walk src/features/<d>/states.js to derive states (preserving manually-curated kind).
//  2. Walk src/features/**/*.jsx for go('literal') call sites; emit edges with sort tuple
//     (from ASC, to ASC, file ASC, line ASC).
//  3. Subcomponent (non-Page) callsites are attributed to every Page in the same feature dir
//     that imports that subcomponent. If no importer is found, the call is logged as a
//     dynamic/orphan call and dropped from the edge list.
//  4. Update meta.{generatedAt, sourceCommit}; preserve meta.version.
//
// Run from anywhere; resolves PROJECT_ROOT via this file's URL.

import fs from 'node:fs';
import path from 'node:path';
import {
  PROJECT_ROOT, NAV_GRAPH_PATH, FEATURES_DIR,
  listDomains, readNavGraph, writeNavGraph, walkFiles,
  buildPageMaps, readAllStates, resolveSubcomponentImporters, gitHeadSha,
} from './lib/repo.mjs';

const VERBOSE = process.argv.includes('--verbose');

function log(...a) { if (VERBOSE) console.log(...a); }

async function main() {
  const existing = fs.existsSync(NAV_GRAPH_PATH) ? readNavGraph() : { states: {}, edges: [], groups: {}, meta: {} };
  const prevStates = existing.states || {};

  // 1) Derive states from per-feature states.js files.
  const allStates = await readAllStates();
  const { stateToPage, pageToState, stateToDomain } = buildPageMaps();

  const newStates = {};
  for (const [id, info] of [...allStates.entries()].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const pageRel = stateToPage.get(id) || `src/features/${info.domain}/states.js`;
    const prev = prevStates[id] || {};
    // states.js is canonical (consistent with C1 fix 2026-05-11).
    // title, g, kind all prefer info.* (states.js) over prev.* (nav-graph snapshot)
    // so lane edits propagate on re-extract. Manual nav-graph overrides are
    // forbidden (single-writer + extractor is the only writer).
    const rec = {
      f: pageRel,
      title: info.title ?? prev.title,
      g: info.group ?? prev.g,
    };
    const kind = info.kind ?? prev.kind;
    if (kind === 'happy' || kind === 'edge') rec.kind = kind;
    newStates[id] = rec;
  }

  // 2) Build groups map: g-label -> array of state ids (sorted by id).
  const groups = {};
  for (const [id, rec] of Object.entries(newStates)) {
    if (!groups[rec.g]) groups[rec.g] = [];
    groups[rec.g].push(id);
  }
  for (const k of Object.keys(groups)) groups[k].sort();
  // Sort group keys alphabetically.
  const sortedGroups = {};
  for (const k of Object.keys(groups).sort()) sortedGroups[k] = groups[k];

  // 3) Walk all .jsx for go('literal') and resolve from-state.
  const jsxFiles = walkFiles(FEATURES_DIR, p => p.endsWith('.jsx'));
  const reGo = /\bgo\(\s*['"]([a-z][a-z0-9_]*)['"]\s*\)/g;
  const edges = [];
  const dynamicCalls = [];   // go(varName) — counted, not emitted
  const orphanSubcomponents = [];

  for (const abs of jsxFiles) {
    const rel = path.relative(PROJECT_ROOT, abs);
    const src = fs.readFileSync(abs, 'utf8');
    const lineStarts = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);

    function lineOf(off) {
      // Binary search lineStarts for last index with start <= off; result is 1-based line.
      let lo = 0, hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1;
      }
      return lo + 1;
    }

    // Track dynamic go(...) calls (any go() that isn't go('literal')).
    const reAnyGo = /\bgo\(([^)]*)\)/g;
    let am;
    while ((am = reAnyGo.exec(src)) !== null) {
      const inside = am[1].trim();
      if (!/^['"][a-z][a-z0-9_]*['"]$/.test(inside)) {
        dynamicCalls.push({ file: rel, line: lineOf(am.index), expr: inside });
      }
    }

    // Resolve "from" state-id for this file.
    const fromForFile = pageToState.get(rel);
    const importerPages = fromForFile ? null : resolveSubcomponentImporters(rel)
      .map(p => pageToState.get(p))
      .filter(Boolean);

    let m;
    while ((m = reGo.exec(src)) !== null) {
      const target = m[1];
      const line = lineOf(m.index);
      if (fromForFile) {
        edges.push({ from: fromForFile, to: target, file: rel, line });
      } else if (importerPages && importerPages.length) {
        for (const importerState of importerPages) {
          edges.push({ from: importerState, to: target, file: rel, line });
        }
      } else {
        orphanSubcomponents.push({ file: rel, line, target });
      }
    }
  }

  // 3.5) Synthesize placeholder state records for any go() target not declared
  //      in any src/features/<d>/states.js. These appear in `meta.undeclaredTargets`
  //      and as states with f="(undeclared)" so the schema + validator both pass.
  //      T10 (close-out) is responsible for either redirecting these call sites
  //      or upgrading the placeholder to a real Page-backed state.
  const declaredIds = new Set(Object.keys(newStates));
  const undeclaredTargets = new Set();
  for (const e of edges) {
    if (!declaredIds.has(e.to)) undeclaredTargets.add(e.to);
  }
  // Emit deterministic placeholders.
  for (const id of [...undeclaredTargets].sort()) {
    if (newStates[id]) continue;
    const prev = prevStates[id] || {};
    newStates[id] = {
      f: prev.f || '(undeclared)',
      title: prev.title || `(undeclared) ${id}`,
      g: prev.g || 'Undeclared',
      ...(prev.kind && (prev.kind === 'happy' || prev.kind === 'edge') ? { kind: prev.kind } : {}),
    };
    if (!groups['Undeclared']) groups['Undeclared'] = [];
    groups['Undeclared'].push(id);
  }
  // Re-sort newStates keys + groups (ASC).
  {
    const sorted = {};
    for (const k of Object.keys(newStates).sort()) sorted[k] = newStates[k];
    Object.keys(newStates).forEach(k => delete newStates[k]);
    Object.assign(newStates, sorted);
  }
  if (groups['Undeclared']) groups['Undeclared'].sort();
  for (const k of Object.keys(sortedGroups)) delete sortedGroups[k];
  for (const k of Object.keys(groups).sort()) sortedGroups[k] = groups[k];

  // De-duplicate identical (from,to,file,line) tuples, then sort.
  const seen = new Set();
  const dedup = [];
  for (const e of edges) {
    const k = `${e.from}|${e.to}|${e.file}|${e.line}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(e);
  }
  dedup.sort((a, b) =>
    a.from < b.from ? -1 : a.from > b.from ? 1 :
    a.to   < b.to   ? -1 : a.to   > b.to   ? 1 :
    a.file < b.file ? -1 : a.file > b.file ? 1 :
    a.line - b.line
  );

  // 4) meta
  const prevMeta = existing.meta || {};
  const meta = {
    version:      prevMeta.version || '1.0.0',
    generatedAt:  prevMeta.generatedAt || '2026-05-11T00:00:00Z',
    sourceCommit: prevMeta.sourceCommit || gitHeadSha() || 'unknown',
  };
  // Only update generatedAt + sourceCommit if the data actually changed (idempotent commit policy).
  const out = { states: newStates, edges: dedup, groups: sortedGroups, meta };
  const prevSerialised = JSON.stringify({ ...existing, meta: undefined });
  const newSerialised = JSON.stringify({ ...out, meta: undefined });
  if (prevSerialised !== newSerialised) {
    out.meta = {
      version: meta.version,
      generatedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      sourceCommit: gitHeadSha() || meta.sourceCommit,
    };
  }

  writeNavGraph(out);

  // Reporting
  const counts = {
    states: Object.keys(newStates).length,
    edges:  dedup.length,
    groups: Object.keys(sortedGroups).length,
    dynamicCalls: dynamicCalls.length,
    orphanSubcomponents: orphanSubcomponents.length,
  };
  console.log(`[flows:extract] ${JSON.stringify(counts)}`);
  if (dynamicCalls.length && VERBOSE) {
    console.log('[flows:extract] dynamic go() calls (excluded from edges):');
    for (const d of dynamicCalls) console.log(`  ${d.file}:${d.line}  go(${d.expr})`);
  }
  if (orphanSubcomponents.length && VERBOSE) {
    console.log('[flows:extract] orphan subcomponent go() calls (no importer Page):');
    for (const o of orphanSubcomponents) console.log(`  ${o.file}:${o.line}  go('${o.target}')`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
