#!/usr/bin/env node
// dbml-to-mermaid.mjs — render Mermaid erDiagram from docs/erd/_global/global-erd.dbml.
//
// Output: docs/erd/_global/global-erd.mmd.
// Uses a minimal regex parser (no @dbml/parser dep). Supported constructs:
//   - Table <name> { col type [attrs] ... }
//   - Ref: a.b > c.d   (also `<`, `-`, `<>`)
//   - enum blocks (skipped from rendering — Mermaid erDiagram doesn't show enum types).
//
// PK columns rendered as `PK`. FK columns receive `FK`.
// Empty input → an empty but valid mermaid block.

import fs from 'node:fs';
import path from 'node:path';
import { APP_ROOT, DOCS_ROOT } from '../_lib/paths.mjs';

const PROJECT_ROOT = APP_ROOT;
const IN = path.join(DOCS_ROOT, 'erd', '_global', 'global-erd.dbml');
const OUT = path.join(DOCS_ROOT, 'erd', '_global', 'global-erd.mmd');

if (!fs.existsSync(IN)) {
  // Empty render still valid.
  const empty = '```mermaid\nerDiagram\n  %% no tables — run scripts/erd/build-global-erd.mjs first.\n```\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, empty);
  console.log(`[dbml-to-mermaid] no input found; wrote empty diagram to ${path.relative(PROJECT_ROOT, OUT)}`);
  process.exit(0);
}

const src = fs.readFileSync(IN, 'utf8');
const lines = src.split(/\r?\n/);

const tables = []; // {name, cols:[{name,type,pk}]}
const refs = []; // {left:{t,c}, right:{t,c}}
const fkCols = new Map(); // tableName → Set(colNames)

let i = 0;
while (i < lines.length) {
  const raw = lines[i];
  const trimmed = raw.replace(/\/\/.*$/, '').trim();
  if (!trimmed) { i++; continue; }

  // enum — skip whole block.
  if (/^enum\s+/.test(trimmed)) {
    while (i < lines.length && !lines[i].includes('}')) i++;
    i++; continue;
  }

  const tableM = trimmed.match(/^Table\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
  if (tableM) {
    const tbl = { name: tableM[1], cols: [] };
    i++;
    while (i < lines.length) {
      const inner = lines[i];
      const innerTrim = inner.replace(/\/\/.*$/, '').trim();
      if (innerTrim === '}') { i++; break; }
      if (/^Indexes\s*\{/.test(innerTrim)) {
        while (i < lines.length && !lines[i].includes('}')) i++;
        i++; continue;
      }
      const colM = innerTrim.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_().]*)\s*(\[.*\])?/);
      if (colM) {
        const attrs = colM[3] || '';
        tbl.cols.push({ name: colM[1], type: mermaidType(colM[2]), pk: /\bpk\b/i.test(attrs) });
      }
      i++;
    }
    tables.push(tbl);
    continue;
  }

  const refM = trimmed.match(/^Ref:\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*([<>\-]+)\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)/);
  if (refM) {
    refs.push({ left: { t: refM[1], c: refM[2] }, right: { t: refM[4], c: refM[5] }, op: refM[3] });
    if (!fkCols.has(refM[1])) fkCols.set(refM[1], new Set());
    fkCols.get(refM[1]).add(refM[2]);
  }

  i++;
}

function mermaidType(t) {
  // Mermaid erDiagram type tokens cannot contain `(` or special chars; strip.
  return t.replace(/\(.*$/, '').replace(/[^A-Za-z0-9_]/g, '');
}

function cardinality(op) {
  // DBML: `>` = many-to-one (left many, right one); `<` = one-to-many; `-` = one-to-one.
  // Mermaid: `}o--||` `||--o{` etc.
  if (op.includes('>')) return '}o--||';
  if (op.includes('<')) return '||--o{';
  return '||--||';
}

const out = [];
out.push('```mermaid');
out.push('erDiagram');
for (const t of tables) {
  out.push(`  ${t.name} {`);
  for (const c of t.cols) {
    const tags = [];
    if (c.pk) tags.push('PK');
    if (fkCols.has(t.name) && fkCols.get(t.name).has(c.name)) tags.push('FK');
    out.push(`    ${c.type || 'unknown'} ${c.name}${tags.length ? ' ' + tags.join(',') : ''}`);
  }
  out.push('  }');
}
for (const r of refs) {
  out.push(`  ${r.left.t} ${cardinality(r.op)} ${r.right.t} : "${r.left.c}"`);
}
out.push('```');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log(`[dbml-to-mermaid] wrote ${path.relative(PROJECT_ROOT, OUT)} (${tables.length} tables, ${refs.length} refs)`);
