#!/usr/bin/env node
// render-html.mjs — render every .mmd under docs/flows/ to a single combined
// docs/flows/user-flow.html via @mermaid-js/mermaid-cli (chromium). Slow.
// NOT wired into pre-commit; runs on pre-push instead.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  PROJECT_ROOT, DOCS_FLOWS_DIR, NAV_GRAPH_PATH,
  walkFiles, sha256OfFile, generatedHeader,
} from './lib/repo.mjs';

const navGraphSha = sha256OfFile(NAV_GRAPH_PATH).slice(0, 12);
const HEADER = generatedHeader(navGraphSha);

const mmds = walkFiles(DOCS_FLOWS_DIR, p => p.endsWith('.mmd')).sort();
if (!mmds.length) {
  console.log('[flows:render] no .mmd files found; nothing to render');
  process.exit(0);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flows-render-'));
const sections = [];
for (const mmd of mmds) {
  const rel = path.relative(DOCS_FLOWS_DIR, mmd);
  const safeName = rel.replace(/[\\/]/g, '__').replace(/\.mmd$/, '.svg');
  const out = path.join(tmpDir, safeName);
  try {
    execFileSync('npx', ['--yes', 'mmdc', '-i', mmd, '-o', out, '-b', 'transparent'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    console.error(`[flows:render] FAILED to render ${rel}: ${e.message}`);
    process.exit(1);
  }
  let svg = '';
  try { svg = fs.readFileSync(out, 'utf8'); } catch { svg = '<p>(render failed)</p>'; }
  sections.push({ rel, svg });
}

const html = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<title>tjbot-design · user flow</title>',
  '<style>',
  'body{font-family:-apple-system,Segoe UI,sans-serif;margin:0;padding:24px;background:#fafafa;color:#111}',
  'h1{font-size:22px;margin:0 0 8px} h2{font-size:16px;margin:32px 0 8px;border-tjtjbottom:1px solid #ddd;padding-tjtjbottom:4px}',
  '.meta{color:#666;font-size:12px;margin-tjtjbottom:24px}',
  '.section{background:#fff;border:1px solid #e3e3e3;border-radius:8px;padding:16px;margin-tjtjbottom:24px}',
  'svg{max-width:100%;height:auto}',
  '.nav{position:sticky;top:0;background:#fafafa;padding:8px 0;border-tjtjbottom:1px solid #ddd;margin-tjtjbottom:16px;z-index:10}',
  '.nav a{margin-right:12px;color:#1e40af;text-decoration:none;font-size:13px}',
  '</style>',
  '</head>',
  '<body>',
  HEADER,  // already HTML-comment-formatted via generatedHeader()
  '<h1>tjbot-design · user flow</h1>',
  `<div class="meta">Generated from <code>nav-graph-data.json</code> (sha <code>${navGraphSha}</code>) at ${new Date().toISOString()}.</div>`,
  '<nav class="nav">',
  ...sections.map(s => `<a href="#${s.rel.replace(/\W+/g, '_')}">${s.rel}</a>`),
  '</nav>',
  ...sections.map(s => `<section class="section" id="${s.rel.replace(/\W+/g, '_')}"><h2>${s.rel}</h2>${s.svg}</section>`),
  '</body></html>',
  '',
].join('\n');

const outPath = path.join(DOCS_FLOWS_DIR, 'user-flow.html');
const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
if (existing === html) {
  console.log(`[flows:render] no change (${sections.length} sections)`);
} else {
  fs.writeFileSync(outPath, html);
  console.log(`[flows:render] wrote ${path.relative(PROJECT_ROOT, outPath)} (${sections.length} sections)`);
}

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });
