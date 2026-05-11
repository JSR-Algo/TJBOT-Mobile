#!/usr/bin/env node
// generate-domain-flows.mjs — emit per-domain mermaid + cross-domain + global +
// user-flow.md INDEX from nav-graph-data.json. Idempotent. Never writes flow.md.
//
// Flags:
//   --check   Assert no diff: write to memory, compare against on-disk; exit 1 if any diff.
//
// Sort tuples (per AC3):
//   states: (domain ASC, subgroup ASC, id ASC)
//   subgraphs: g ASC
//   cross-domain edges: (fromDomain ASC, toDomain ASC, fromId ASC, toId ASC)

import fs from 'node:fs';
import path from 'node:path';
import {
  PROJECT_ROOT, NAV_GRAPH_PATH, FEATURES_DIR, DOCS_FLOWS_DIR,
  listDomains, readNavGraph, sha256OfFile, generatedHeader, mermaidGeneratedHeader,
  buildPageMaps,
} from './lib/repo.mjs';

const CHECK = process.argv.includes('--check');

const navGraph = readNavGraph();
const navGraphSha = sha256OfFile(NAV_GRAPH_PATH).slice(0, 12);
const HEADER     = generatedHeader(navGraphSha);          // for .md outputs
const MMD_HEADER = mermaidGeneratedHeader(navGraphSha);   // for .mmd outputs

// Build state -> domain map from src/features/<d>/states.js (canonical).
function buildStateDomainMap() {
  const m = new Map();
  for (const d of listDomains()) {
    const sjs = path.join(FEATURES_DIR, d, 'states.js');
    if (!fs.existsSync(sjs)) continue;
    const src = fs.readFileSync(sjs, 'utf8');
    const re = /\{\s*id\s*:\s*['"]([a-z][a-z0-9_]*)['"]/g;
    let mm;
    while ((mm = re.exec(src)) !== null) m.set(mm[1], d);
  }
  return m;
}

const stateToDomain = buildStateDomainMap();

// Group states by (domain, subgroup g).
function partitionStates() {
  const out = new Map(); // domain -> Map<g, stateIds[]>
  for (const [id, rec] of Object.entries(navGraph.states)) {
    const d = stateToDomain.get(id);
    if (!d) continue;  // Foreign / undeclared
    if (!out.has(d)) out.set(d, new Map());
    const sub = out.get(d);
    if (!sub.has(rec.g)) sub.set(rec.g, []);
    sub.get(rec.g).push(id);
  }
  // Sort: subgroup keys ASC; ids within each ASC.
  for (const sub of out.values()) {
    for (const arr of sub.values()) arr.sort();
  }
  return out;
}

// Sanitize text for mermaid label (escape brackets and quotes).
function lbl(s) { return String(s).replace(/"/g, "''").replace(/\[/g, '(').replace(/\]/g, ')'); }

// Mermaid node form: id["label"] for happy, id(["label"]) for edge.
function nodeShape(id, rec) {
  const safe = lbl(rec.title);
  return rec.kind === 'edge' ? `${id}(["${safe}"])` : `${id}["${safe}"]`;
}

function emitDomainMmd(domain, partitioned) {
  const sub = partitioned.get(domain) || new Map();
  const lines = [];
  lines.push(MMD_HEADER);
  lines.push(`%% domain: ${domain}`);
  lines.push('flowchart TD');
  lines.push('  classDef happy fill:#dcfce7,stroke:#166534');
  lines.push('  classDef edge  fill:#fee2e2,stroke:#991b1b');

  // Emit subgraphs in g ASC order.
  const subKeys = [...sub.keys()].sort();
  for (const g of subKeys) {
    const safeG = g.replace(/[^A-Za-z0-9_]/g, '_');
    lines.push(`  subgraph ${safeG}["${lbl(g)}"]`);
    for (const id of sub.get(g)) {
      const rec = navGraph.states[id];
      lines.push(`    ${nodeShape(id, rec)}`);
    }
    lines.push('  end');
  }

  // Intra-domain edges only.
  const intra = navGraph.edges
    .filter(e => stateToDomain.get(e.from) === domain && stateToDomain.get(e.to) === domain)
    .sort((a, b) =>
      a.from < b.from ? -1 : a.from > b.from ? 1 :
      a.to   < b.to   ? -1 : a.to   > b.to   ? 1 : 0
    );
  // De-dup transitions (collapse multiple files/lines into one arrow).
  const seen = new Set();
  for (const e of intra) {
    const k = `${e.from}->${e.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    lines.push(`  ${e.from} --> ${e.to}`);
  }

  // Apply class assignments (happy vs edge).
  const happyIds = [];
  const edgeIds = [];
  for (const g of subKeys) for (const id of sub.get(g)) {
    const rec = navGraph.states[id];
    (rec.kind === 'edge' ? edgeIds : happyIds).push(id);
  }
  if (happyIds.length) lines.push(`  class ${happyIds.join(',')} happy`);
  if (edgeIds.length)  lines.push(`  class ${edgeIds.join(',')} edge`);

  // Cross-domain stub block.
  const outbound = navGraph.edges
    .filter(e => stateToDomain.get(e.from) === domain && stateToDomain.get(e.to) !== domain)
    .map(e => ({ from: e.from, to: e.to, toDomain: stateToDomain.get(e.to) || 'undeclared' }));
  if (outbound.length) {
    lines.push('');
    lines.push('%% cross-domain outbound (handled in shared/cross-domain.flow.mmd):');
    const outSet = new Set();
    outbound.sort((a,b) => a.toDomain < b.toDomain ? -1 : a.toDomain > b.toDomain ? 1 :
                            a.from < b.from ? -1 : a.from > b.from ? 1 :
                            a.to   < b.to   ? -1 : a.to   > b.to   ? 1 : 0);
    for (const e of outbound) {
      const k = `${e.from}|${e.to}`;
      if (outSet.has(k)) continue;
      outSet.add(k);
      lines.push(`%%   ${e.from} -> ${e.to} (${e.toDomain})`);
    }
  }

  return lines.join('\n') + '\n';
}

function emitGoCallsJson(domain) {
  // All edges originating in this domain (intra + outbound), sorted by file:line.
  const own = navGraph.edges
    .filter(e => stateToDomain.get(e.from) === domain)
    .map(e => ({
      from: e.from,
      to: e.to,
      file: e.file,
      line: e.line,
      cross_domain: stateToDomain.get(e.to) !== domain,
      target_domain: stateToDomain.get(e.to) || null,
    }))
    .sort((a, b) =>
      a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line
    );
  return {
    _generated: `from nav-graph-data.json sha=${navGraphSha}`,
    domain,
    count: own.length,
    calls: own,
  };
}

function emitCrossDomain() {
  const lines = [];
  lines.push(MMD_HEADER);
  lines.push('%% Cross-domain edges only. Intra-domain edges live in domains/<d>/flow.mmd.');
  lines.push('flowchart LR');
  const cross = navGraph.edges
    .filter(e => stateToDomain.get(e.from) !== stateToDomain.get(e.to))
    .map(e => ({
      fromDomain: stateToDomain.get(e.from) || 'undeclared',
      toDomain:   stateToDomain.get(e.to)   || 'undeclared',
      from: e.from, to: e.to,
    }))
    .sort((a, b) =>
      a.fromDomain < b.fromDomain ? -1 : a.fromDomain > b.fromDomain ? 1 :
      a.toDomain   < b.toDomain   ? -1 : a.toDomain   > b.toDomain   ? 1 :
      a.from < b.from ? -1 : a.from > b.from ? 1 :
      a.to   < b.to   ? -1 : a.to   > b.to   ? 1 : 0
    );

  // Subgraph per from-domain to keep edges grouped.
  const byFrom = new Map();
  for (const e of cross) {
    if (!byFrom.has(e.fromDomain)) byFrom.set(e.fromDomain, []);
    byFrom.get(e.fromDomain).push(e);
  }
  // Also collect every state node referenced.
  const refStates = new Set();
  for (const e of cross) { refStates.add(e.from); refStates.add(e.to); }

  // Emit nodes once.
  for (const id of [...refStates].sort()) {
    const rec = navGraph.states[id];
    if (rec) lines.push(`  ${nodeShape(id, rec)}`);
    else     lines.push(`  ${id}["(undeclared)${id}"]:::edge`);
  }

  const seen = new Set();
  for (const e of cross) {
    const k = `${e.from}->${e.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    lines.push(`  ${e.from} -->|${e.fromDomain}→${e.toDomain}| ${e.to}`);
  }
  lines.push('  classDef happy fill:#dcfce7,stroke:#166534');
  lines.push('  classDef edge  fill:#fee2e2,stroke:#991b1b');
  return lines.join('\n') + '\n';
}

function emitGlobalMmd() {
  const lines = [];
  lines.push(MMD_HEADER);
  lines.push('%% Domain-level overview only — intra-domain detail lives under domains/<d>/flow.mmd');
  lines.push('flowchart TD');
  for (const d of listDomains()) {
    const safeId = d.replace(/-/g, '_');
    lines.push(`  ${safeId}["${d}"]`);
  }
  // Domain-level edges = cross-domain edges collapsed by (fromDomain, toDomain).
  const domEdges = new Map();
  for (const e of navGraph.edges) {
    const fd = stateToDomain.get(e.from);
    const td = stateToDomain.get(e.to);
    if (!fd || !td || fd === td) continue;
    const k = `${fd}|${td}`;
    if (!domEdges.has(k)) domEdges.set(k, 0);
    domEdges.set(k, domEdges.get(k) + 1);
  }
  for (const k of [...domEdges.keys()].sort()) {
    const [fd, td] = k.split('|');
    const fid = fd.replace(/-/g,'_');
    const tid = td.replace(/-/g,'_');
    lines.push(`  ${fid} -->|${domEdges.get(k)}| ${tid}`);
  }
  return lines.join('\n') + '\n';
}

function emitUserFlowIndex() {
  const lines = [];
  lines.push(HEADER);
  lines.push('# User Flow — Index');
  lines.push('');
  lines.push(`> Generated from \`nav-graph-data.json\` (sha \`${navGraphSha}\`). DO NOT EDIT.`);
  lines.push('');
  lines.push('## Global overview');
  lines.push('');
  lines.push('- [Domain-level mermaid](./global.flow.mmd)');
  lines.push('- [Hand-curated narrative](./global.flow.md)');
  lines.push('');
  lines.push('## Domains');
  lines.push('');
  lines.push('| Domain | Lane | States | Mermaid | Narrative | Generated calls |');
  lines.push('|---|---|---|---|---|---|');
  for (const d of listDomains()) {
    const stateCount = Object.entries(navGraph.states)
      .filter(([id]) => stateToDomain.get(id) === d).length;
    const metaP = path.join(FEATURES_DIR, d, 'domain.meta.json');
    let lane = '?';
    if (fs.existsSync(metaP)) {
      try { lane = JSON.parse(fs.readFileSync(metaP, 'utf8')).owner_lane || '?'; } catch {}
    }
    lines.push(`| \`${d}\` | ${lane} | ${stateCount} | [flow.mmd](./domains/${d}/flow.mmd) | [flow.md](./domains/${d}/flow.md) | [go-calls.json](./domains/${d}/go-calls.json) |`);
  }
  lines.push('');
  lines.push('## Cross-domain & shared');
  lines.push('');
  lines.push('- [shared/cross-domain.flow.mmd](./shared/cross-domain.flow.mmd) — every cross-domain hop');
  lines.push('- [shared/navigation.flow.mmd](./shared/navigation.flow.mmd) — back-button + parent-gate + deep-link rules');
  lines.push('- Edge-case templates (`docs/flows/edge-cases/{error,retry,cancel,timeout,validation,unauthorized}.flow.mmd`)');
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`- States: ${Object.keys(navGraph.states).length}`);
  lines.push(`- Edges:  ${navGraph.edges.length}`);
  lines.push(`- Groups: ${Object.keys(navGraph.groups).length}`);
  lines.push(`- Domains: ${listDomains().length}`);
  return lines.join('\n') + '\n';
}

// ─── Emit pipeline ──────────────────────────────────────────────────────────
const writes = []; // {p, content}
for (const d of listDomains()) {
  const dir = path.join(DOCS_FLOWS_DIR, 'domains', d);
  writes.push({
    p: path.join(dir, 'flow.mmd'),
    content: emitDomainMmd(d, partitionStates()),
  });
  writes.push({
    p: path.join(dir, 'go-calls.json'),
    content: JSON.stringify(emitGoCallsJson(d), null, 2) + '\n',
  });
}
writes.push({
  p: path.join(DOCS_FLOWS_DIR, 'shared', 'cross-domain.flow.mmd'),
  content: emitCrossDomain(),
});
writes.push({
  p: path.join(DOCS_FLOWS_DIR, 'global.flow.mmd'),
  content: emitGlobalMmd(),
});
writes.push({
  p: path.join(DOCS_FLOWS_DIR, 'user-flow.md'),
  content: emitUserFlowIndex(),
});

let diffs = 0;
for (const { p, content } of writes) {
  const existing = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (existing === content) continue;
  diffs++;
  if (CHECK) {
    console.error(`[generate --check] DIFF: ${path.relative(PROJECT_ROOT, p)}`);
  } else {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
}

if (CHECK && diffs > 0) {
  console.error(`[generate --check] ${diffs} file(s) out of date. Run 'npm run flows:generate'.`);
  process.exit(1);
}
console.log(`[flows:generate] wrote=${CHECK ? 0 : diffs} files (check=${CHECK}); total=${writes.length}`);
