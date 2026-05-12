#!/usr/bin/env node
// validate-mermaid.mjs — AC-3: every .sequence.mmd parses as a valid sequence diagram.
//
// Implementation note (post-plan adjustment):
//   Plan §6 names `@mermaid-js/parser@1.1.0` as the AST validator. The 1.x parser
//   API exposes only {info, packet, pie, treeView, architecture, gitGraph, radar,
//   treemap, wardley} — `sequence` is NOT yet covered (verified empirically on
//   2026-05-11). We therefore validate sequence diagrams via `mermaid.parse()`
//   from the `mermaid` core package (already hoisted into node_modules via the
//   `@mermaid-js/mermaid-cli` devDep). `mermaid.parse()` returns
//   `{ diagramType, config }` on success and throws on syntax error.
//
//   The `@mermaid-js/parser` devDep remains pinned-exact per plan §6 so that
//   when sequence-diagram support is added in a future minor we can flip the
//   import without churn. AC-13 also relies on the pin marker.
//
// Strips YAML frontmatter + optional ```mermaid``` fence before parsing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, '..', '..');
const SEQ_DIR = path.join(PROJECT_ROOT, 'docs', 'sequences');

// Ensure the pin marker import resolves — fail fast if devDep missing.
try {
  await import('@mermaid-js/parser');
} catch (e) {
  console.error('[validate-mermaid] FAIL: cannot import @mermaid-js/parser (devDep pin marker).');
  console.error('  ' + e.message);
  process.exit(2);
}

let mermaidParse;
try {
  const m = await import('mermaid');
  mermaidParse = (m.default && m.default.parse) ? m.default.parse.bind(m.default) : m.parse;
  if (typeof mermaidParse !== 'function') throw new Error('mermaid.parse is not a function');
} catch (e) {
  console.error('[validate-mermaid] FAIL: cannot import mermaid (core sequence parser).');
  console.error('  ' + e.message);
  process.exit(2);
}

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

function extractMermaidBody(src) {
  let s = src;
  // Strip outer ```mermaid fence if present.
  const fenceOpen = s.match(/^[\s\S]*?```\s*mermaid\s*\n/);
  if (fenceOpen) {
    s = s.slice(fenceOpen[0].length);
    const fenceClose = s.lastIndexOf('```');
    if (fenceClose >= 0) s = s.slice(0, fenceClose);
  }
  // Strip frontmatter ---...---.
  const lines = s.split(/\r?\n/);
  if (/^---\s*$/.test(lines[0] || '')) {
    let end = -1;
    for (let i = 1; i < lines.length; i++) {
      if (/^---\s*$/.test(lines[i])) { end = i; break; }
    }
    if (end > 0) s = lines.slice(end + 1).join('\n');
  }
  return s.trim();
}

const errors = [];
const files = walk(SEQ_DIR);
let pass = 0;
for (const p of files) {
  const rel = path.relative(PROJECT_ROOT, p);
  const src = fs.readFileSync(p, 'utf8');
  const body = extractMermaidBody(src);
  if (!body) { errors.push(`${rel}: empty diagram body after frontmatter strip`); continue; }
  try {
    const res = await mermaidParse(body);
    if (res && res.diagramType && res.diagramType !== 'sequence') {
      errors.push(`${rel}: parsed as diagramType=${res.diagramType}, expected sequence`);
    } else {
      pass++;
    }
  } catch (e) {
    errors.push(`${rel}: ${e.message || String(e)}`);
  }
}

if (errors.length) {
  console.error(`[validate-mermaid] FAILED (${errors.length} of ${files.length}):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`[validate-mermaid] OK — ${pass} files parsed as sequence diagrams`);
