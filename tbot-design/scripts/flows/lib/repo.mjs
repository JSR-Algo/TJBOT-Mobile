// Shared helpers for scripts/flows/* — repo paths, file walking, hashing,
// nav-graph IO, Page-to-state mapping. Pure ESM, node-only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const here = path.dirname(new URL(import.meta.url).pathname);
// Vite project root (tbot-design/) — NOT the git toplevel (tbot-mobile/).
// All paths in nav-graph + docs/flows are relative to this.
export const PROJECT_ROOT = path.resolve(here, '..', '..', '..');
export const REPO_ROOT = PROJECT_ROOT;
export const NAV_GRAPH_PATH = path.join(PROJECT_ROOT, 'nav-graph-data.json');
export const FEATURES_DIR = path.join(PROJECT_ROOT, 'src', 'features');
export const DOCS_FLOWS_DIR = path.join(PROJECT_ROOT, 'docs', 'flows');
export const SCHEMA_DIR = path.join(PROJECT_ROOT, 'scripts', 'flows', 'schema');

export const EDGE_CASE_TEMPLATES = ['error', 'retry', 'cancel', 'timeout', 'validation', 'unauthorized'];

export const HAPPY_PATH_EXEMPTIONS = new Set([
  'pr_confirm',
  'cl_unlock_confirm',
  'onb_intro_retry',
  'dv_pair_first_lesson',
]);

// Markdown variants (HTML comments) — used in .md files only.
export const GENERATED_HEADER_PREFIX = '<!-- GENERATED FROM nav-graph-data.json sha=';
export const GENERATED_HEADER_SUFFIX = '. Do not edit by hand. -->';
export const HAND_CURATED_HEADER = '<!-- HAND-CURATED. -->';

// Mermaid variants (%% comments) — used in .mmd files because mmdc rejects
// HTML comments before the diagram declaration (UnknownDiagramError).
export const MERMAID_GENERATED_HEADER_PREFIX = '%% GENERATED FROM nav-graph-data.json sha=';
export const MERMAID_GENERATED_HEADER_SUFFIX = '. Do not edit by hand.';
export const MERMAID_HAND_CURATED_HEADER = '%% HAND-CURATED.';

export function listDomains() {
  return fs.readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
}

export function readJsonFile(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeJsonFile(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

export function readNavGraph() {
  return readJsonFile(NAV_GRAPH_PATH);
}

export function writeNavGraph(obj) {
  writeJsonFile(NAV_GRAPH_PATH, obj);
}

export function sha256OfFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

export function sha256OfBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Header for generated MARKDOWN files (HTML comment, parsed by markdown renderers).
export function generatedHeader(sha) {
  return `${GENERATED_HEADER_PREFIX}${sha}${GENERATED_HEADER_SUFFIX}`;
}

// Header for generated MERMAID files (%% comment, valid mermaid pre-diagram).
export function mermaidGeneratedHeader(sha) {
  return `${MERMAID_GENERATED_HEADER_PREFIX}${sha}${MERMAID_GENERATED_HEADER_SUFFIX}`;
}

export function walkFiles(root, predicate) {
  const out = [];
  function recurse(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) recurse(full);
      else if (ent.isFile() && (!predicate || predicate(full))) out.push(full);
    }
  }
  recurse(root);
  return out.sort();
}

// Read a feature's STATES export by importing its states.js (sync via require not
// possible in ESM; called only from buildPageMaps via callers that prefetch).
function statesIdsFromFeature(domain) {
  const statesJs = path.join(FEATURES_DIR, domain, 'states.js');
  if (!fs.existsSync(statesJs)) return [];
  // Parse as text: extract { id: 'foo', ... } literals (avoids dynamic import in sync ctx).
  const src = fs.readFileSync(statesJs, 'utf8');
  const ids = [];
  const re = /\{\s*id\s*:\s*['"]([a-z][a-z0-9_]*)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) ids.push(m[1]);
  return ids;
}

// Extract { stateId -> pageFile (relative to PROJECT_ROOT) } by parsing each
// feature's index.js SCREEN_MAP. Supports two patterns:
//   (a) Literal map:   SCREEN_MAP = { state_id: ComponentIdent, ... }
//   (b) Fan-out:       SCREEN_MAP = Object.fromEntries(STATES.map(s => [s.id, ...XPage...]))
//                      → every state-id in this feature maps to the single Page identifier
//                        seen in the lambda body.
export function buildPageMaps() {
  const stateToPage = new Map();
  const stateToDomain = new Map();
  const pageToState = new Map();
  for (const domain of listDomains()) {
    const indexPath = path.join(FEATURES_DIR, domain, 'index.js');
    if (!fs.existsSync(indexPath)) continue;
    const src = fs.readFileSync(indexPath, 'utf8');

    // Build identifier -> relative-path map from imports.
    const importMap = {};
    const reImport = /import\s+(\w+)\s+from\s+['"]\.\/(.*?)['"]/g;
    let m;
    while ((m = reImport.exec(src)) !== null) {
      importMap[m[1]] = m[2];
    }

    function record(stateId, ident) {
      const rel = importMap[ident];
      if (!rel) return;
      const candidate = path.join('src', 'features', domain, rel + '.jsx');
      if (!fs.existsSync(path.join(PROJECT_ROOT, candidate))) return;
      stateToPage.set(stateId, candidate);
      pageToState.set(candidate, stateId);
      stateToDomain.set(stateId, domain);
    }

    // Pattern A: literal map.
    const litBlock = src.match(/SCREEN_MAP\s*=\s*\{([\s\S]*?)\n\s*\};?/);
    if (litBlock) {
      const reEntry = /(\w+)\s*:\s*(\w+)/g;
      let e;
      while ((e = reEntry.exec(litBlock[1])) !== null) record(e[1], e[2]);
    }

    // Pattern B: Object.fromEntries(STATES.map(... XPage ...))
    const fanout = src.match(/SCREEN_MAP\s*=\s*Object\.fromEntries\s*\(\s*STATES\.map[\s\S]*?\)\s*\)/);
    if (fanout) {
      // Find a Screen identifier referenced inside the lambda body.
      const pageIdentMatch = fanout[0].match(/\b([A-Z]\w*Screen)\b/);
      if (pageIdentMatch) {
        const ident = pageIdentMatch[1];
        for (const id of statesIdsFromFeature(domain)) record(id, ident);
      }
    }

    // Always tag stateToDomain even if no Page resolves (e.g. mismatched ident).
    for (const id of statesIdsFromFeature(domain)) {
      if (!stateToDomain.has(id)) stateToDomain.set(id, domain);
    }
  }
  return { stateToPage, pageToState, stateToDomain };
}

// Read all states.js into { stateId -> {title, group, domain, kind} }.
// C1 fix 2026-05-11: include `kind` so extract-go-calls.mjs can propagate
// happy/edge classification from src/features/<d>/states.js (canonical source)
// into nav-graph-data.json. Without this, kind silently drops and the entire
// edge-classification system passes vacuously.
export async function readAllStates() {
  const out = new Map();
  for (const domain of listDomains()) {
    const statesJs = path.join(FEATURES_DIR, domain, 'states.js');
    if (!fs.existsSync(statesJs)) continue;
    const mod = await import(`file://${statesJs}?t=${Date.now()}`);
    if (!mod.STATES) continue;
    for (const s of mod.STATES) {
      out.set(s.id, { title: s.title, group: s.group, domain, kind: s.kind });
    }
  }
  return out;
}

// Walk subcomponents and resolve callsites to importing Page files.
// For a non-Page jsx that calls go(), attribute the edge to every Page within
// the same domain that imports the subcomponent (transitively via siblings).
export function resolveSubcomponentImporters(callsiteRel) {
  const callsiteAbs = path.join(REPO_ROOT, callsiteRel);
  const callsiteName = path.basename(callsiteAbs, '.jsx');
  // Search the parent feature dir for files importing the callsite.
  const parts = callsiteRel.split(path.sep);
  const featuresIdx = parts.indexOf('features');
  if (featuresIdx < 0 || !parts[featuresIdx + 1]) return [];
  const featureDir = path.join(REPO_ROOT, ...parts.slice(0, featuresIdx + 2));
  const candidates = walkFiles(featureDir, p => p.endsWith('.jsx') && p !== callsiteAbs);
  const importers = [];
  const reImport = new RegExp(`from\\s+['"][^'"]*${callsiteName.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}['"]`);
  for (const c of candidates) {
    const src = fs.readFileSync(c, 'utf8');
    if (reImport.test(src)) {
      importers.push(path.relative(REPO_ROOT, c));
    }
  }
  return importers;
}

export function gitHeadShortBranch() {
  try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_ROOT }).toString().trim(); }
  catch { return ''; }
}

export function gitHeadSha() {
  try { return execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT }).toString().trim(); }
  catch { return ''; }
}

// Returns staged paths *relative to the git toplevel* (which may be an ancestor
// of PROJECT_ROOT, e.g. tbot-mobile/). Caller filters by prefix as needed.
export function gitStagedFiles() {
  try {
    return execSync('git diff --cached --name-only', { cwd: PROJECT_ROOT })
      .toString().trim().split('\n').filter(Boolean);
  } catch { return []; }
}

// Returns the project-relative prefix of PROJECT_ROOT inside the git toplevel.
// "" if PROJECT_ROOT === git toplevel; "tbot-design/" if nested.
export function projectPrefixWithinGit() {
  try {
    const top = execSync('git rev-parse --show-toplevel', { cwd: PROJECT_ROOT }).toString().trim();
    if (top === PROJECT_ROOT) return '';
    if (PROJECT_ROOT.startsWith(top + path.sep)) {
      return PROJECT_ROOT.slice(top.length + 1) + '/';
    }
    return '';
  } catch { return ''; }
}
