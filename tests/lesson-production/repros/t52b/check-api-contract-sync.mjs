#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────────
// Backend <-> mobile API contract sync gate (LESSON_PRODUCTION_PLAN.md T5.2).
//
// Replaces the previous `process.exit(0)` placeholder, which reported "no drift
// detected" without reading a single file — it was green while mobile shipped
// ten routes the backend has never served.
//
// Sources of truth, both read from tbot-backend/openapi.json:
//
//   paths                                -> Nest routes under the /v1 global
//                                           prefix. The generator filters these
//                                           to IN_SCOPE_TAGS, so absence here
//                                           means "undocumented", NOT "unserved".
//   x-tbot-modular-route-contract.routes -> modular Express runtime. Only the
//                                           subset matched by isBridgeRoute() is
//                                           actually reachable.
//
// Because `paths` is tag-filtered, "is it served?" cannot be answered from
// openapi.json alone. The Nest controller decorators are scanned directly for
// that, which is also what lets the gate catch a route deleted backend-side.
//
// Checks:
//   1. every `client.<verb>(...)` route in src/services/api/** is served;
//   2. every `backendContractUnavailable(op)` has an UNDOCUMENTED_API_ROUTES row;
//   3. every registry row's `status` still matches backend reality;
//   4. `backend-route-exists` rows name an owning task;
//   5. no registry row is orphaned (declared but never thrown).
//
// Usage: npm run api:contract-sync:check [-- --json]
// Env:   TBOT_BACKEND_DIR to point at a backend checkout other than ../tbot-backend
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Walk up from the mobile root looking for a sibling `tbot-backend`. A plain
// `../tbot-backend` breaks under `git worktree`, where the checkout lives at
// `tbot-mobile/.worktrees/<branch>` and the backend is three levels up.
function locateBackendRoot() {
  if (process.env.TBOT_BACKEND_DIR) return resolve(process.env.TBOT_BACKEND_DIR);
  let dir = MOBILE_ROOT;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(dir, '..', 'tbot-backend');
    if (existsSync(join(candidate, 'openapi.json'))) return resolve(candidate);
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(join(MOBILE_ROOT, '..', 'tbot-backend'));
}

const BACKEND_ROOT = locateBackendRoot();
const API_DIR = join(MOBILE_ROOT, 'src', 'services', 'api');
const REGISTRY_FILE = join(API_DIR, 'undocumented-api-routes.ts');
const HTTP_VERBS = ['get', 'post', 'put', 'patch', 'delete'];

const asJson = process.argv.includes('--json');
const failures = [];
const notes = [];
const fail = (check, detail) => failures.push({ check, detail });

// ── path normalisation ────────────────────────────────────────────────────
// `/v1/orders/{orderId}`, `/v1/orders/:orderId` and `/v1/orders/${id}` all
// collapse to `/v1/orders/{}` so the three syntaxes compare cleanly.
function canon(path) {
  const noQuery = path.split('?')[0];
  return (
    noQuery
      .replace(/\$\{[^}]*\}/g, '{}')
      .replace(/\{[^}]*\}/g, '{}')
      .replace(/:[A-Za-z0-9_]+/g, '{}')
      .replace(/\/+$/, '') || '/'
  );
}
const opKey = (method, path) => `${method.toUpperCase()} ${canon(path)}`;

// ── backend: openapi.json ─────────────────────────────────────────────────
const specPath = join(BACKEND_ROOT, 'openapi.json');
if (!existsSync(specPath)) {
  console.error(
    `api:contract-sync:check FAILED — no backend contract at ${specPath}.\n` +
      'Generate it with `npm run openapi:generate` in tbot-backend, or set TBOT_BACKEND_DIR.',
  );
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const documented = new Set();
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const verb of Object.keys(item ?? {})) {
    if (HTTP_VERBS.includes(verb)) documented.add(opKey(verb, path));
  }
}

const modularRoutes = spec['x-tbot-modular-route-contract']?.routes ?? [];
if (modularRoutes.length === 0) {
  fail('backend-contract', 'openapi.json carries no x-tbot-modular-route-contract.routes — the contract is incomplete.');
}

// Mirror of tbot-backend/src/modules/app/modular-route-bridge.ts::isBridgeRoute.
// A modular route outside this predicate is declared but never mounted, so
// calling it 404s exactly like an undeclared one.
function isBridgeRoute(routePath, method) {
  return (
    routePath.startsWith('/v1/billing/') ||
    routePath.startsWith('/internal/v1/entitlements/') ||
    routePath === '/webhooks/stripe' ||
    (method === 'GET' && routePath === '/v1/me/notifications') ||
    (method === 'DELETE' && routePath === '/v1/notifications/push-token')
  );
}

// The bridge is only MOUNTED under one condition (src/main.ts):
//   if (NODE_ENV === 'production' && TBOT_ENABLE_MODULAR_ROUTES !== 'false')
// so every modular route below is production-only. Mobile always talks to a
// deployed backend, so this is the right contract for the app — but a local or
// E2E backend running NODE_ENV=development serves NONE of them and answers 404.
// Verified empirically against the T5.3 E2E stack (NODE_ENV=development):
// /v1/billing/orders/{id}, /cancel, /return-request and /v1/billing/reactivate
// all 404 there while PATCH /v1/identity/children/{id} (a plain Nest route)
// correctly 401s.
const MAIN_SOURCE = join(BACKEND_ROOT, 'src', 'main.ts');
let modularMountCondition = 'unknown';
if (existsSync(MAIN_SOURCE)) {
  const mainSrc = readFileSync(MAIN_SOURCE, 'utf8');
  const mounts = /process\.env\.NODE_ENV === 'production'[\s\S]{0,400}?createModularRouteBridge/.test(mainSrc);
  modularMountCondition = mounts ? "NODE_ENV==='production'" : 'CHANGED';
  if (!mounts) {
    fail(
      'bridge-mount-mirror',
      "main.ts no longer mounts createModularRouteBridge behind NODE_ENV==='production'. " +
        'This script labels every modular route production-only on that basis — re-check the ' +
        'condition and update the mirror in scripts/check-api-contract-sync.mjs.',
    );
  }
} else {
  notes.push(`main.ts not found at ${MAIN_SOURCE}; modular mount condition not verified.`);
}

const BRIDGE_SOURCE = join(BACKEND_ROOT, 'src', 'modules', 'app', 'modular-route-bridge.ts');
if (existsSync(BRIDGE_SOURCE)) {
  const bridgeSrc = readFileSync(BRIDGE_SOURCE, 'utf8');
  const clauses = [
    "'/v1/billing/'",
    "'/internal/v1/entitlements/'",
    "'/webhooks/stripe'",
    "'/v1/me/notifications'",
    "'/v1/notifications/push-token'",
  ];
  const drifted = clauses.filter((c) => !bridgeSrc.includes(c));
  if (drifted.length > 0) {
    fail(
      'bridge-mirror',
      'isBridgeRoute() in modular-route-bridge.ts no longer matches this script\'s mirror ' +
        `(missing ${drifted.join(', ')}). Update the mirror in scripts/check-api-contract-sync.mjs.`,
    );
  }
} else {
  notes.push(`bridge source not found at ${BRIDGE_SOURCE}; mirror not verified.`);
}

// ── backend: Nest controller scan ─────────────────────────────────────────
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') && !full.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

const served = new Map();
// Routes that exist only when the modular bridge is mounted (production).
const productionOnly = new Set();
// Routes whose handler exists but unconditionally returns 410 GONE. Tracked
// separately so the failure can say "retired" rather than "missing".
const retired = new Map();
const addServed = (key, source) => {
  if (!served.has(key)) served.set(key, []);
  served.get(key).push(source);
};

const backendSrc = join(BACKEND_ROOT, 'src');
if (!existsSync(backendSrc)) {
  console.error(`api:contract-sync:check FAILED — backend source not found at ${backendSrc}.`);
  process.exit(2);
}

// A @Controller is only reachable if its MODULE is registered. app.module.ts
// registers BillingLocalModule only when SIMULATION_MODE === 'true', and
// render.yaml sets it to "false", so those controllers serve nothing in
// production — confirmed by the live 404 on /v1/billing/plans. Scanning
// decorators alone counts them as served, which is the third variant of the
// same mistake: path exists != handler works != router mounted != module
// registered.
const CONDITIONAL_MODULE_DIRS = [];
const APP_MODULE = join(backendSrc, 'app.module.ts');
if (existsSync(APP_MODULE)) {
  const appSrc = readFileSync(APP_MODULE, 'utf8');
  if (/SIMULATION_MODE === 'true' \? \[BillingLocalModule\]/.test(appSrc)) {
    CONDITIONAL_MODULE_DIRS.push({ dir: join(backendSrc, 'billing-local'), why: "SIMULATION_MODE==='true'" });
  } else if (appSrc.includes('BillingLocalModule')) {
    fail(
      'conditional-module-mirror',
      'app.module.ts still references BillingLocalModule but no longer gates it on SIMULATION_MODE. ' +
        'This script excludes src/billing-local on that basis — re-check and update the mirror.',
    );
  }
}

for (const file of walk(backendSrc)) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('@Controller')) continue;
  const conditional = CONDITIONAL_MODULE_DIRS.find((m) => file.startsWith(m.dir));
  if (conditional) {
    notes.push(`skipped ${relative(BACKEND_ROOT, file)} — module registered only when ${conditional.why}`);
    continue;
  }

  const controllers = [];
  const ctrlRe = /@Controller\(\s*(?:['"`]([^'"`]*)['"`]|\{[^}]*path:\s*['"`]([^'"`]*)['"`][^}]*\})?\s*\)/g;
  let cm;
  while ((cm = ctrlRe.exec(src))) controllers.push({ at: cm.index, prefix: cm[1] ?? cm[2] ?? '' });
  if (controllers.length === 0) continue;

  const methodRe = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
  let mm;
  while ((mm = methodRe.exec(src))) {
    let prefix = controllers[0].prefix;
    for (const c of controllers) if (c.at < mm.index) prefix = c.prefix;
    const segments = ['v1', prefix, mm[2] ?? ''].filter(Boolean).join('/');
    const line = src.slice(0, mm.index).split('\n').length;
    const key = opKey(mm[1], `/${segments}`);
    const source = `${relative(BACKEND_ROOT, file)}:${line}`;

    // A decorator is not a contract. `CourseLibraryController` keeps @Post
    // handlers whose whole body is `throw new HttpException(retiredBody(), 410)`
    // — the route resolves, so a decorator scan calls it "served", but calling
    // it is exactly as broken as a 404. Classify those as retired instead.
    if (isRetiredHandler(src, mm.index)) retired.set(key, source);
    else addServed(key, source);
  }
}

// Look at the handler body immediately after the decorator: a signature
// returning `never` plus an unconditional throw carrying a Gone/410 status is a
// deliberately retired endpoint. Deliberately narrow — it only matches an
// unconditional throw in the first statement, never a conditional one.
function isRetiredHandler(src, decoratorIndex) {
  const body = src.slice(decoratorIndex, decoratorIndex + 400);
  const openBrace = body.indexOf('{');
  if (openBrace === -1) return false;
  const firstStatement = body.slice(openBrace + 1, openBrace + 200).trim();
  return (
    /^throw\s+new\s+HttpException\([^;]*,\s*(?:410|HttpStatus\.GONE)\s*\)/.test(firstStatement) ||
    /^throw\s+new\s+GoneException\(/.test(firstStatement)
  );
}

for (const route of modularRoutes) {
  if (isBridgeRoute(route.path, route.method)) {
    // NOT addServed. The bridge is mounted nowhere: main.ts requires
    // TBOT_ENABLE_MODULAR_ROUTES !== 'false' and render.yaml sets it to
    // "false" on both production services, so a bridged modular route is
    // declared-but-unmounted exactly like an unbridged one (F-T52-13).
    // Counting these as served is what let 16 dead mobile calls pass three
    // rounds of this gate.
    productionOnly.add(opKey(route.method, route.path));
  }
  documented.add(opKey(route.method, route.path));
}

if (served.size === 0) {
  console.error('api:contract-sync:check FAILED — scanned zero backend routes; the scan is broken, not the contract.');
  process.exit(2);
}

// ── mobile: client call sites ─────────────────────────────────────────────
const apiFiles = readdirSync(API_DIR)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(API_DIR, f));

const calls = [];
const thrownOperations = new Map();

for (const file of apiFiles) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(MOBILE_ROOT, file);

  const callRe = /client\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*([`'"])([^`'"]+)\2/g;
  let m;
  while ((m = callRe.exec(src))) {
    // A trailing `${query}` is a query string, not a path segment.
    const raw = m[3].replace(/\$\{query\}$/, '');
    calls.push({
      file: rel,
      line: src.slice(0, m.index).split('\n').length,
      key: opKey(m[1], `/v1${raw}`),
      raw: m[3],
    });
  }

  // `backendContractUnavailable('op')` or (`op:${arg}`) — the operation name is
  // everything before the first colon or interpolation.
  const stubRe = /backendContractUnavailable\(\s*([`'"])([^`'"]*?)(?:[:$]|\1)/g;
  let s;
  while ((s = stubRe.exec(src))) {
    const op = s[2].replace(/[:$].*$/, '').trim();
    if (op.length === 0) continue;
    if (!thrownOperations.has(op)) thrownOperations.set(op, []);
    thrownOperations.get(op).push(`${rel}:${src.slice(0, s.index).split('\n').length}`);
  }
}

if (calls.length === 0) {
  console.error('api:contract-sync:check FAILED — found zero mobile client calls; the extractor is broken.');
  process.exit(2);
}

// ── check 1: every mobile call is served ──────────────────────────────────
for (const call of calls) {
  if (retired.has(call.key) && !served.has(call.key)) {
    fail(
      'retired-route',
      `${call.key} (${call.file}:${call.line}) — the handler at ${retired.get(call.key)} exists but ` +
        'unconditionally throws 410 GONE, so this call can only ever fail. Repoint it to the ' +
        'replacement the backend names, or delete it.',
    );
  } else if (!served.has(call.key)) {
    fail(
      'unserved-route',
      `${call.key} (${call.file}:${call.line}) — no Nest controller and no bridged modular route serves this; ` +
        'it can only 404. Repoint it, or stub it and add an UNDOCUMENTED_API_ROUTES row.',
    );
  } else if (!documented.has(call.key)) {
    notes.push(`served but undocumented: ${call.key} [${served.get(call.key)[0]}] <- ${call.file}:${call.line}`);
  }
}

// ── registry parse ────────────────────────────────────────────────────────
// Read the literal rather than importing it: this script runs under plain node
// with no TypeScript loader.
const registrySrc = readFileSync(REGISTRY_FILE, 'utf8');
const registryBody = registrySrc.slice(registrySrc.indexOf('export const UNDOCUMENTED_API_ROUTES'));
const registry = [];
const rowRe =
  /\{\s*operation:\s*'([^']+)',\s*module:\s*'([^']+)',\s*attemptedRoute:\s*'([^']+)',\s*status:\s*'([^']+)',\s*reason:\s*(['"])((?:\\.|(?!\5)[\s\S])*)\5,\s*(?:owner:\s*'([^']+)',\s*)?\}/g;
let r;
while ((r = rowRe.exec(registryBody))) {
  registry.push({
    operation: r[1],
    module: r[2],
    attemptedRoute: r[3],
    status: r[4],
    reason: r[6],
    owner: r[7],
  });
}
if (registry.length === 0) {
  fail('registry', 'UNDOCUMENTED_API_ROUTES parsed as empty — the literal shape changed; update the parser.');
}

const declaredRowCount = (registryBody.match(/\boperation:\s*'/g) ?? []).length;
if (registry.length !== declaredRowCount) {
  fail(
    'registry',
    `parsed ${registry.length} registry rows but the literal declares ${declaredRowCount}; ` +
      'a row is missing a required field or the parser needs updating.',
  );
}

const registryByOp = new Map(registry.map((row) => [row.operation, row]));

// ── check 2: every thrown operation is declared, and names are unambiguous ─
for (const [op, sites] of thrownOperations) {
  // Two modules throwing the same operation name would silently share one
  // registry row and one justification — e.g. course.api.ts and progress.api.ts
  // both export `getReviewQueue` against different backend surfaces. Qualify
  // the name (`course.getReviewQueue`) instead.
  const modules = new Set(sites.map((s) => s.split(':')[0]));
  if (modules.size > 1) {
    fail(
      'ambiguous-operation',
      `'${op}' is thrown from ${modules.size} modules (${[...modules].join(', ')}), so one registry ` +
        'row would have to justify both. Qualify the operation name per module.',
    );
  }
  if (!registryByOp.has(op)) {
    fail(
      'unjustified-stub',
      `backendContractUnavailable('${op}') at ${sites.join(', ')} has no UNDOCUMENTED_API_ROUTES row. ` +
        'Every undocumented route must be justified per route.',
    );
  }
}

// ── checks 3-5: registry rows stay true ───────────────────────────────────
for (const row of registry) {
  const [method, ...rest] = row.attemptedRoute.split(' ');
  const key = opKey(method, rest.join(' '));
  const isServed = served.has(key);

  if (row.status === 'no-backend-contract' && isServed) {
    fail(
      'stale-registry-row',
      `'${row.operation}' is declared no-backend-contract, but ${row.attemptedRoute} is now served ` +
        `by ${served.get(key)[0]}. Wire it up, or change the row to backend-route-exists with an owner.`,
    );
  }
  if (row.status === 'backend-route-exists') {
    if (!isServed) {
      fail(
        'stale-registry-row',
        `'${row.operation}' is declared backend-route-exists, but nothing serves ${row.attemptedRoute} any more. ` +
          'Correct the row to no-backend-contract.',
      );
    }
    if (!row.owner) {
      fail('registry', `'${row.operation}' is backend-route-exists and must name an owning task in \`owner\`.`);
    }
  }
  if (!row.reason || row.reason.trim().length < 20) {
    fail('registry', `'${row.operation}' needs a real justification in \`reason\`.`);
  }
  if (!thrownOperations.has(row.operation)) {
    fail(
      'orphan-registry-row',
      `'${row.operation}' is in UNDOCUMENTED_API_ROUTES but no code calls backendContractUnavailable('${row.operation}'). ` +
        'Remove the row, or fix the operation name so it matches the call site.',
    );
  }
}

// ── report ────────────────────────────────────────────────────────────────
if (asJson) {
  console.log(
    JSON.stringify(
      {
        ok: failures.length === 0,
        mobileCalls: calls.length,
        backendServedOperations: served.size,
        backendDocumentedOperations: documented.size,
        registryRows: registry.length,
        failures,
        notes,
      },
      null,
      2,
    ),
  );
  process.exit(failures.length === 0 ? 0 : 1);
}

console.log('api:contract-sync:check');
console.log(`  backend spec        : ${relative(process.cwd(), specPath)}`);
console.log(`  backend served ops  : ${served.size}`);
console.log(`  backend documented  : ${documented.size}`);
console.log(`  mobile client calls : ${calls.length}`);
console.log(
  `  registry rows       : ${registry.length} (${registry.filter((x) => x.status === 'backend-route-exists').length} awaiting mobile wiring)`,
);

const productionOnlyCalls = calls.filter((c) => productionOnly.has(c.key));
if (productionOnlyCalls.length > 0) {
  console.log(
    `\n  ${productionOnlyCalls.length} mobile call(s) hit PRODUCTION-ONLY routes ` +
      `(modular bridge, mounted only when ${modularMountCondition}).`,
  );
  console.log('  Correct for the deployed backend; they 404 on a local/E2E stack running NODE_ENV=development:');
  for (const c of [...new Set(productionOnlyCalls.map((c) => c.key))]) console.log(`    - ${c}`);
}

if (notes.length > 0) {
  console.log(`\n  ${notes.length} served-but-undocumented route(s) — informational, not a failure:`);
  for (const n of notes) console.log(`    - ${n}`);
}

if (failures.length === 0) {
  console.log('\nPASS — no backend/mobile contract drift.');
  process.exit(0);
}

console.error(`\nFAIL — ${failures.length} contract drift finding(s):\n`);
for (const f of failures) console.error(`  [${f.check}] ${f.detail}\n`);
process.exit(1);
