#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..');
const BACKEND_OPENAPI_PATH = process.env.TBOT_BACKEND_OPENAPI_PATH
  ? path.resolve(APP_ROOT, process.env.TBOT_BACKEND_OPENAPI_PATH)
  : path.join(REPO_ROOT, 'tbot-backend', 'openapi.json');
const ARTIFACTS_DIR = path.join(APP_ROOT, 'artifacts');
const JSON_ARTIFACT = path.join(ARTIFACTS_DIR, 'api-contract-sync-latest.json');
const REPORT_ARTIFACT = path.join(ARTIFACTS_DIR, 'api-contract-sync-report.md');

const args = new Set(process.argv.slice(2));
const outputJson = args.has('--json');
const noWrite = args.has('--no-write');
const failOnDrift = args.has('--fail-on-drift');

const MOBILE_SCAN_DIRS = [
  path.join(APP_ROOT, 'src', 'services', 'api'),
  path.join(APP_ROOT, 'src', 'services', 'ai'),
  path.join(APP_ROOT, 'src', 'services', 'ws'),
];

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const CALL_RE = /\b(?:client|http|_aiClient|axios)\.(get|post|put|patch|delete)[\s\S]{0,180}?\(\s*(`([^`]+)`|'([^']+)'|"([^"]+)")/g;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(fullPath);
  }
  return out;
}

function toPosixRelative(filePath) {
  return path.relative(APP_ROOT, filePath).split(path.sep).join('/');
}

function normalizeMobilePath(rawPath) {
  const withoutQuery = rawPath.split('?')[0];
  const withParams = withoutQuery
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\{[^}]+\}/g, ':param');
  return withParams.startsWith('/v1/') ? withParams : `/v1${withParams}`;
}

function backendPathToRegex(pathPattern) {
  const escaped = pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped
    .replace(/:([A-Za-z0-9_]+)/g, '[^/]+')
    .replace(/\\\{[^}]+\\\}/g, '[^/]+')}$`);
}

function extractMobileCalls() {
  const callsByKey = new Map();
  for (const filePath of MOBILE_SCAN_DIRS.flatMap(walkFiles)) {
    const source = fs.readFileSync(filePath, 'utf8');
    CALL_RE.lastIndex = 0;
    let match;
    while ((match = CALL_RE.exec(source)) !== null) {
      const method = match[1];
      const rawPath = match[3] ?? match[4] ?? match[5];
      if (!HTTP_METHODS.has(method) || !rawPath?.startsWith('/')) continue;
      const normalizedPath = normalizeMobilePath(rawPath);
      const key = `${method.toUpperCase()} ${normalizedPath}`;
      const existing = callsByKey.get(key);
      if (existing) {
        existing.files.add(toPosixRelative(filePath));
      } else {
        callsByKey.set(key, {
          method: method.toUpperCase(),
          path: normalizedPath,
          rawPaths: new Set([rawPath]),
          files: new Set([toPosixRelative(filePath)]),
        });
      }
    }
  }

  return [...callsByKey.values()]
    .map((call) => ({
      method: call.method,
      path: call.path,
      rawPaths: [...call.rawPaths].sort(),
      files: [...call.files].sort(),
    }))
    .sort(compareEndpoint);
}

function extractBackendRoutes(openapi) {
  const routesByKey = new Map();
  for (const [routePath, operations] of Object.entries(openapi.paths ?? {})) {
    for (const method of Object.keys(operations ?? {})) {
      if (!HTTP_METHODS.has(method)) continue;
      const route = {
        method: method.toUpperCase(),
        path: routePath,
        source: 'openapi.paths',
        requiresAuth: null,
        idempotencyHeader: null,
      };
      routesByKey.set(`${route.method} ${route.path}`, route);
    }
  }

  const extensionRoutes = openapi['x-TJBot-modular-route-contract']?.routes ?? [];
  for (const route of extensionRoutes) {
    const normalizedRoute = {
      method: route.method,
      path: route.path,
      source: 'x-TJBot-modular-route-contract.routes',
      requiresAuth: route.requiresAuth ?? null,
      idempotencyHeader: route.idempotencyHeader ?? null,
    };
    routesByKey.set(`${normalizedRoute.method} ${normalizedRoute.path}`, normalizedRoute);
  }

  return [...routesByKey.values()].sort(compareEndpoint);
}

function compareEndpoint(a, b) {
  return `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`);
}

function findBackendMatch(call, backendRoutes) {
  return backendRoutes.find(
    (route) => route.method === call.method && backendPathToRegex(route.path).test(call.path),
  );
}

function makeMismatchRows(missingBackendEndpoints) {
  const rows = [];
  if (missingBackendEndpoints.length > 0) {
    rows.push({
      area: 'Missing backend endpoints',
      mismatch: `${missingBackendEndpoints.length} mobile calls are absent from backend OpenAPI/modular route inventory.`,
      backendFix: 'Implement and publish the route, or mark it reserved/deprecated with owner/date.',
      mobileFix: 'Retarget/remove unsupported calls; gate unavailable features explicitly.',
    });
  }
  rows.push(
    {
      area: 'Request DTO drift',
      mismatch: 'Mobile signup sends legacy {name,email,password}; modular auth schema requires displayName/timezone/locale/acceptances.',
      backendFix: 'Choose one signup schema and regenerate OpenAPI plus modular route tests.',
      mobileFix: 'Align signup form/API payload to the chosen schema.',
    },
    {
      area: 'Error response drift',
      mismatch: 'Backend emits flat+nested errors and lower snake_case modular codes; mobile maps only a small code set.',
      backendFix: 'Publish canonical error-code union and envelope compatibility in OpenAPI.',
      mobileFix: 'Map every documented error code, retryability, Retry-After, and auth invalidation path.',
    },
    {
      area: 'Auth/idempotency proof gap',
      mismatch: 'Bearer and X-Request-Id behavior exists, but there is no route-by-route contract proof.',
      backendFix: 'Expose route auth/idempotency metadata in the generated contract.',
      mobileFix: 'Assert headers for each mobile route against generated metadata.',
    },
  );
  return rows;
}

function buildMarkdownReport(audit) {
  const missingRows = audit.missingBackendEndpoints
    .map((endpoint) => `| ${endpoint.method} | \`${endpoint.path}\` | ${endpoint.files.map((f) => `\`${f}\``).join('<br>')} |`)
    .join('\n');

  const mismatchRows = audit.apiMismatchTable
    .map(
      (row) =>
        `| ${row.area} | ${row.mismatch} | ${row.backendFix} | ${row.mobileFix} |`,
    )
    .join('\n');

  return `# API Contract Sync Report

Generated: ${audit.generatedAt}

## Final Contract Sync Status

${audit.status}

## Summary

| Metric | Count |
|---|---:|
| Mobile API calls | ${audit.summary.mobileCallCount} |
| Backend routes/contracts | ${audit.summary.backendRouteCount} |
| Missing backend endpoints | ${audit.summary.missingBackendEndpointCount} |

## API Mismatch Table

| Area | Mismatch | Backend fix | Mobile fix |
|---|---|---|---|
${mismatchRows}

## Missing Backend Endpoints

| Method | Path | Mobile files |
|---|---|---|
${missingRows || '| n/a | n/a | n/a |'}

## Backend Fixes

${audit.backendFixes.map((item) => `- ${item}`).join('\n')}

## Mobile Fixes

${audit.mobileFixes.map((item) => `- ${item}`).join('\n')}

## Shared Types Recommendation

${audit.sharedTypesRecommendation}

## Tests To Add

${audit.testsToAdd.map((item) => `- ${item}`).join('\n')}
`;
}

function main() {
  const openapi = readJson(BACKEND_OPENAPI_PATH);
  const mobileCalls = extractMobileCalls();
  const backendRoutes = extractBackendRoutes(openapi);
  const matched = [];
  const missingBackendEndpoints = [];

  for (const call of mobileCalls) {
    const backendMatch = findBackendMatch(call, backendRoutes);
    if (backendMatch) {
      matched.push({ ...call, backend: backendMatch });
    } else {
      missingBackendEndpoints.push(call);
    }
  }
  const apiMismatchTable = makeMismatchRows(missingBackendEndpoints);
  const status = apiMismatchTable.length === 0 ? 'SYNCED' : 'OUT_OF_SYNC';

  const audit = {
    generatedAt: new Date().toISOString(),
    status,
    endpointInventoryStatus: missingBackendEndpoints.length === 0 ? 'SYNCED' : 'OUT_OF_SYNC',
    contractSources: {
      backendOpenapi: path.relative(APP_ROOT, BACKEND_OPENAPI_PATH).split(path.sep).join('/'),
      mobileDocs: 'migrate-ui-ux-to-mobile-app-docs/api/README.md',
    },
    summary: {
      mobileCallCount: mobileCalls.length,
      backendRouteCount: backendRoutes.length,
      matchedCallCount: matched.length,
      missingBackendEndpointCount: missingBackendEndpoints.length,
    },
    missingBackendEndpoints,
    apiMismatchTable,
    backendFixes: [
      'Regenerate and validate tbot-backend/openapi.json with npm run openapi:check.',
      'Add a backend contract test that imports this mobile endpoint inventory.',
      'Normalize refresh response shape across implementation, OpenAPI, and modular E2E fixtures.',
      'Converge signup and consent DTOs between legacy Nest DTOs, modular Zod schemas, and OpenAPI.',
      'Publish a canonical error-code union and dual-envelope compatibility rules.',
      'Assert route auth/idempotency metadata, retryable statuses, and invoice 307 redirect behavior.',
    ],
    mobileFixes: [
      'Retarget or remove every missing endpoint listed in this report.',
      'Move /auth/consent usage to the canonical identity consent endpoint.',
      'Align signup payload to the backend-selected schema.',
      'Lock refresh parsing to the canonical response shape and test queue/failure behavior.',
      'Map every documented backend error code to stable AppError behavior.',
      'Assert Bearer and X-Request-Id headers against generated route metadata.',
    ],
    sharedTypesRecommendation:
      'Generate a shared @TJBot/api-contract package from tbot-backend/openapi.json plus x-TJBot-modular-route-contract. Mobile should import endpoint constants, DTOs, route auth/idempotency metadata, and the error-code union instead of duplicating handwritten DTO assumptions.',
    testsToAdd: [
      'Backend: mobile API inventory contract test covering method/path presence.',
      'Backend: OpenAPI metadata assertions for request/response/error/auth/idempotency/redirect rules.',
      'Backend: modular E2E refresh/error/header shape tests.',
      'Mobile: OpenAPI fixture-driven parser tests for success and error payloads.',
      'Mobile: refresh queue tests for rotation, replay detection, concurrent 401s, failure logout, and no recursive refresh.',
      'Mobile: endpoint path tests for every src/services/api module.',
    ],
  };

  if (!noWrite) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    fs.writeFileSync(JSON_ARTIFACT, `${JSON.stringify(audit, null, 2)}\n`);
    fs.writeFileSync(REPORT_ARTIFACT, buildMarkdownReport(audit));
  }

  if (outputJson) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  } else {
    process.stdout.write(`${audit.status}: ${audit.summary.missingBackendEndpointCount} missing backend endpoints\n`);
    if (!noWrite) {
      process.stdout.write(`Wrote ${path.relative(APP_ROOT, JSON_ARTIFACT)}\n`);
      process.stdout.write(`Wrote ${path.relative(APP_ROOT, REPORT_ARTIFACT)}\n`);
    }
  }

  if (failOnDrift && audit.status !== 'SYNCED') {
    process.exitCode = 1;
  }
}

main();
