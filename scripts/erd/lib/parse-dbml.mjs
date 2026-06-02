// parse-dbml.mjs — shared DBML parser for validator + emitter.
//
// Extracted verbatim from scripts/erd/validate-erd.mjs (Phase P0 refactor).
// Zero behaviour change: validate-erd.mjs imports parseDbml from here.
// dbml-to-prisma.mjs reuses the same parser so both tools see the same shape.
//
// Returned shape:
//   { file, tables, refs, enums, violations }
//     tables: [{ name, line, columns: [{name,type,attrs,line}], indexes: [{cols,unique,note,line}], block: [start,end] }]
//     refs:   [{ leftTable, leftCol, rightTable, rightCol, line }]
//     enums:  [{ name, line }]
//     violations: [{ line, msg }]

import path from 'node:path';
import { APP_ROOT } from '../../_lib/paths.mjs';

const PROJECT_ROOT = APP_ROOT;

function rel(p) { return path.relative(PROJECT_ROOT, p); }

export function parseDbml(src, absPath) {
  const file = rel(absPath);
  const lines = src.split(/\r?\n/);
  const tables = [];
  const refs = [];
  const enums = [];
  const violations = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trimmed = raw.replace(/\/\/.*$/, '').trim();
    if (!trimmed) { i++; continue; }

    // enum <name> { ... }
    const enumM = trimmed.match(/^enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
    if (enumM) {
      const enumName = enumM[1];
      const enumValues = [];
      i++;
      while (i < lines.length) {
        const eLine = lines[i];
        const eTrim = eLine.replace(/\/\/.*$/, '').trim();
        if (eTrim === '}') { i++; break; }
        if (eTrim) {
          const vm = eTrim.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
          if (vm) enumValues.push(vm[1]);
        }
        i++;
      }
      enums.push({ name: enumName, line: lineNo, values: enumValues });
      continue;
    }

    // Table <name> { ... }
    const tableM = trimmed.match(/^Table\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
    if (tableM) {
      const tbl = { name: tableM[1], line: lineNo, columns: [], indexes: [], notes: [], block: [lineNo, lineNo] };
      i++;
      while (i < lines.length) {
        const inner = lines[i];
        const innerLine = i + 1;
        const innerTrim = inner.replace(/\/\/.*$/, '').trim();
        if (innerTrim === '}') { tbl.block[1] = innerLine; i++; break; }
        // Table-level Note: '...'  (single-quoted, supports backslash-escaped inner quotes)
        const noteM = innerTrim.match(/^Note:\s*'((?:[^'\\]|\\.)*)'/);
        if (noteM) {
          // Unescape \' → ' (and \\ → \) so downstream consumers see the literal text.
          const text = noteM[1].replace(/\\(['\\])/g, '$1');
          tbl.notes.push({ text, line: innerLine });
          i++; continue;
        }
        // Indexes { ... }
        if (/^Indexes\s*\{/.test(innerTrim)) {
          i++;
          while (i < lines.length && !lines[i].includes('}')) {
            const idxLine = lines[i];
            const idxLineNo = i + 1;
            const idxTrim = idxLine.replace(/\/\/.*$/, '').trim();
            if (idxTrim) {
              const m = idxTrim.match(/^\(([^)]+)\)\s*(\[.*\])?/);
              if (m) {
                const cols = m[1].split(',').map(s => s.trim());
                const attrs = m[2] || '';
                const unique = /\bunique\b/.test(attrs);
                const name = (attrs.match(/name:\s*'([^']*)'/) || [])[1] || '';
                const note = (attrs.match(/note:\s*'([^']*)'/) || [])[1] || '';
                tbl.indexes.push({ cols, unique, name, note, line: idxLineNo });
              }
            }
            i++;
          }
          i++; // skip closing }
          continue;
        }
        // Column line:  name  type  [attrs]
        const colM = innerTrim.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_().]*)\s*(\[.*\])?/);
        if (colM) {
          const col = { name: colM[1], type: colM[2], attrs: colM[3] || '', line: innerLine };
          tbl.columns.push(col);
        }
        i++;
      }
      tables.push(tbl);
      continue;
    }

    // Ref: a.b > c.d  (or `<`, `-`, `<>`)
    const refM = trimmed.match(/^Ref:\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*[<>\-]+\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)/);
    if (refM) {
      refs.push({ leftTable: refM[1], leftCol: refM[2], rightTable: refM[3], rightCol: refM[4], line: lineNo });
    }

    i++;
  }

  // Quick scan for forbidden patterns (line-level).
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const lineNo = li + 1;
    // Strip line comments AND single-quoted string literals (DBML note/default contents)
    // before scanning so prose like "service-generated; never serial" doesn't trip rules.
    const noCmt = raw.replace(/\/\/.*$/, '').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
    if (/\[\s*ref\s*:/i.test(noCmt)) {
      violations.push({ line: lineNo, msg: 'inline [ref:] forbidden — declare Ref: line at bottom of file' });
    }
    if (/\bvarchar\b(?!\s*\()/i.test(noCmt)) {
      violations.push({ line: lineNo, msg: 'varchar must specify a length (e.g. varchar(254))' });
    }
    if (/\btimestamp\b(?!tz)/i.test(noCmt)) {
      violations.push({ line: lineNo, msg: 'use timestamptz (timestamp without tz is forbidden)' });
    }
    if (/\b(serial|bigserial)\b/i.test(noCmt)) {
      violations.push({ line: lineNo, msg: 'serial/bigserial PKs forbidden — use uuid' });
    }
    if (/\b(numeric|decimal|float)\b/i.test(noCmt) && /(money|amount|cents|price)/i.test(noCmt)) {
      violations.push({ line: lineNo, msg: 'money columns must be bigint cents, never numeric/decimal/float' });
    }
  }

  return { file, tables, refs, enums, violations };
}
