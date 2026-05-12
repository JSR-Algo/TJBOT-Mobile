#!/usr/bin/env node
// extract-from-specs.mjs — Option A' Phase 1 seed extraction (plan §8 step 8).
//
// Walks the 15 specced systems at /Users/manhhodinh/Documents/TBOT/docs/site/software/systems/<n>-*.md,
// finds every fenced ```mermaid block whose body begins with `sequenceDiagram`,
// emits docs/sequences/<sys>/_seed.<idx>.sequence.mmd carrying minimal frontmatter with `status: seed`
// and a best-effort `spec_anchor:` pointing to the most recently seen markdown heading.
//
// Idempotent on re-run: overwrites _seed.* files; never touches non-seed files.
// AC-14 gate: caller asserts post-run count ≥15.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, '..', '..');
const SEQ_DIR = path.join(PROJECT_ROOT, 'docs', 'sequences');
const SPECS_DIR = path.resolve(PROJECT_ROOT, '..', '..', 'docs', 'site', 'software', 'systems');

// 15 systems with existing sequenceDiagram blocks (plan §3 / §4).
const SEEDED_SYSTEMS = ['01', '02', '03', '04', '06', '07', '08', '09', '10', '12', '13', '14', '15', '16', '18'];

function slugifyHeading(h) {
  return h.toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findSpec(sysId) {
  const all = fs.readdirSync(SPECS_DIR);
  return all.find(n => n.startsWith(`${sysId}-`) && n.endsWith('.md')) || null;
}

function findSubdir(sysId) {
  const all = fs.readdirSync(SEQ_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);
  return all.find(n => n.startsWith(`${sysId}-`)) || null;
}

function extractBlocks(specPath) {
  const lines = fs.readFileSync(specPath, 'utf8').split(/\r?\n/);
  const blocks = [];
  let inBlock = false;
  let blockStart = -1;
  let lastHeading = null;
  let lastHeadingLine = 0;
  let buf = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h && !inBlock) {
      lastHeading = h[1];
      lastHeadingLine = i;
    }
    if (!inBlock) {
      if (/^```\s*mermaid\s*$/.test(line)) {
        inBlock = true;
        blockStart = i;
        buf = [];
      }
    } else {
      if (/^```\s*$/.test(line)) {
        const body = buf.join('\n').trim();
        if (/^sequenceDiagram\b/m.test(body)) {
          blocks.push({
            body,
            startLine: blockStart,
            heading: lastHeading,
            headingLine: lastHeadingLine,
          });
        }
        inBlock = false;
        buf = [];
      } else {
        buf.push(line);
      }
    }
  }
  return blocks;
}

function frontmatterFor(sysSlug, idx, heading, specBasename) {
  const anchor = heading ? `${specBasename.replace(/\.md$/, '')}#${slugifyHeading(heading)}` : specBasename.replace(/\.md$/, '');
  return [
    '---',
    `system: sys-${sysSlug}`,
    `flow_id: seed-${idx}`,
    `surface: internal-RPC`,
    `spec_anchor: /software/systems/${anchor}`,
    `actors: [TODO]`,
    `apis: []`,
    `externals: []`,
    `queues: []`,
    `failure_paths:`,
    `  - TODO_failure_path`,
    `status: seed`,
    '---',
  ].join('\n');
}

function main() {
  let total = 0;
  for (const sys of SEEDED_SYSTEMS) {
    const specName = findSpec(sys);
    if (!specName) { console.warn(`[extract] sys-${sys}: spec file not found in ${SPECS_DIR}`); continue; }
    const subdir = findSubdir(sys);
    if (!subdir) { console.warn(`[extract] sys-${sys}: subdir not found in ${SEQ_DIR}`); continue; }
    const specPath = path.join(SPECS_DIR, specName);
    const sysSlug = subdir; // e.g. 01-identity
    const blocks = extractBlocks(specPath);
    if (!blocks.length) {
      console.warn(`[extract] sys-${sys}: no sequenceDiagram blocks found`);
      continue;
    }
    for (let i = 0; i < blocks.length; i++) {
      const idx = i + 1;
      const outPath = path.join(SEQ_DIR, subdir, `_seed.${idx}.sequence.mmd`);
      const fm = frontmatterFor(sysSlug, idx, blocks[i].heading, specName);
      const out = `${fm}\n%% SEED — extracted from ${specName}#L${blocks[i].startLine + 1}. NORMALIZE before promoting to draft/final.\n${blocks[i].body}\n`;
      fs.writeFileSync(outPath, out);
      total++;
    }
    console.log(`[extract] sys-${sys}: ${blocks.length} block(s) -> docs/sequences/${subdir}/_seed.*.sequence.mmd`);
  }
  console.log(`[extract] total seed files written: ${total}`);
  if (total < 15) {
    console.error(`[extract] FAIL: AC-14 gate — produced ${total} seed files, need ≥15.`);
    process.exit(1);
  }
}

main();
