import { execFileSync } from 'node:child_process';
import path from 'node:path';

type AuditJson = {
  status: 'SYNCED' | 'OUT_OF_SYNC';
  endpointInventoryStatus: 'SYNCED' | 'OUT_OF_SYNC';
  summary: {
    mobileCallCount: number;
    backendRouteCount: number;
    missingBackendEndpointCount: number;
  };
  missingBackendEndpoints: Array<{
    method: string;
    path: string;
    files: string[];
  }>;
  apiMismatchTable: Array<{ area: string; mismatch?: string; backendFix?: string; mobileFix?: string }>;
};

describe('api contract sync audit script', () => {
  it('reports endpoint inventory sync separately from full contract drift without writing artifacts', () => {
    const stdout = execFileSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts/api-contract-sync.mjs'), '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    const audit = JSON.parse(stdout) as AuditJson;
    expect(audit.status).toBe('OUT_OF_SYNC');
    expect(audit.endpointInventoryStatus).toBeDefined();
    expect(audit.summary.mobileCallCount).toBeGreaterThan(30);
    expect(audit.summary.backendRouteCount).toBeGreaterThan(100);
    expect(typeof audit.summary.missingBackendEndpointCount).toBe('number');
    expect(audit.apiMismatchTable.map((row) => row.area)).toEqual(
      expect.arrayContaining([
        'Request DTO drift',
        'Error response drift',
        'Auth/idempotency proof gap',
      ]),
    );
  });

  it('mismatch table documents the additive fields (displayName, timezone, locale) pending backend confirmation', () => {
    const stdout = execFileSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts/api-contract-sync.mjs'), '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    const audit = JSON.parse(stdout) as AuditJson;
    const dtoDriftRow = audit.apiMismatchTable.find((row) => row.area === 'Request DTO drift');
    expect(dtoDriftRow).toBeDefined();
    const mismatchText = dtoDriftRow?.mismatch ?? '';
    expect(mismatchText).toMatch(/displayName/);
    expect(mismatchText).toMatch(/timezone/);
    expect(mismatchText).toMatch(/locale/);

    // Mobile is additive-only pending B-1 confirmation; status must NOT be IN_SYNC yet
    expect(audit.status).toBe('OUT_OF_SYNC');
  });

  it('ignores HTTP calls inside comments when building the mobile endpoint inventory', () => {
    const stdout = execFileSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts/api-contract-sync.mjs'), '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    const audit = JSON.parse(stdout) as AuditJson;
    const missingPaths = audit.missingBackendEndpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`);
    expect(missingPaths).not.toEqual(
      expect.arrayContaining([
        'POST /v1/stt/transcribe',
        'POST /v1/llm/chat',
        'POST /v1/tts/synthesize',
      ]),
    );
  });

  it('does not count optional query template suffixes as path params', () => {
    const stdout = execFileSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts/api-contract-sync.mjs'), '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    const audit = JSON.parse(stdout) as AuditJson;
    const missingPaths = audit.missingBackendEndpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`);
    expect(missingPaths).not.toContain('GET /v1/courses/:param/lessons:param');
  });
});
