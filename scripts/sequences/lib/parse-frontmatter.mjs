// parse-frontmatter.mjs — minimal YAML-frontmatter reader for .sequence.mmd files.
//
// Supported frontmatter shapes (block delimited by `---` lines at top of file):
//   key: scalar
//   key: [a, b, c]                     (inline flow array)
//   key:                               (block scalar list)
//     - a
//     - b
//
// Returns { data: {...}, body: '<rest of file>' }.
// Throws on malformed delimiters. Pure ESM, no deps.

import fs from 'node:fs';

const FENCE = /^---\s*$/;

export function readFrontmatter(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  return parseFrontmatter(src);
}

export function parseFrontmatter(src) {
  const lines = src.split(/\r?\n/);
  // Mermaid block prefix lookup — frontmatter sits inside the ```mermaid ... ``` fence per §5,
  // but `---` delimiters work at any starting offset as long as both delimiters present.
  // Strategy: find first `---` line, then next `---` after it. Frontmatter is between.
  let firstIdx = -1;
  for (let i = 0; i < lines.length && i < 4; i++) {
    if (FENCE.test(lines[i])) { firstIdx = i; break; }
  }
  if (firstIdx < 0) return { data: {}, body: src };
  let secondIdx = -1;
  for (let i = firstIdx + 1; i < lines.length; i++) {
    if (FENCE.test(lines[i])) { secondIdx = i; break; }
  }
  if (secondIdx < 0) throw new Error('parse-frontmatter: opening --- found but no closing ---');
  const fm = lines.slice(firstIdx + 1, secondIdx);
  const body = lines.slice(secondIdx + 1).join('\n');
  const data = parseYamlSubset(fm);
  return { data, body };
}

function parseYamlSubset(fmLines) {
  const obj = {};
  let i = 0;
  while (i < fmLines.length) {
    const raw = fmLines[i];
    // Skip blank lines + full-line comments.
    if (/^\s*(#|$)/.test(raw)) { i++; continue; }
    const m = raw.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    const rest = stripInlineComment(m[2]).trim();
    if (rest === '') {
      // Block list / map. Only block lists supported here (per template).
      const list = [];
      i++;
      while (i < fmLines.length && /^\s*-\s+/.test(fmLines[i])) {
        const item = fmLines[i].replace(/^\s*-\s+/, '');
        list.push(stripQuotes(stripInlineComment(item).trim()));
        i++;
      }
      obj[key] = list;
      continue;
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      // Inline flow array.
      const inner = rest.slice(1, -1).trim();
      obj[key] = inner === '' ? [] : inner.split(',').map(s => stripQuotes(s.trim()));
    } else {
      obj[key] = coerceScalar(stripQuotes(rest));
    }
    i++;
  }
  return obj;
}

function stripQuotes(s) {
  if (s.length >= 2 && ((s[0] === '"' && s[s.length-1] === '"') || (s[0] === "'" && s[s.length-1] === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function stripInlineComment(s) {
  // Strip un-quoted `#` comment tail. Conservative: only when `#` preceded by space.
  // Avoids eating `#` inside spec_anchor values like '/path#anchor'.
  const m = s.match(/^(.*?)\s+#\s.*$/);
  return m ? m[1] : s;
}

function coerceScalar(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  return s;
}
