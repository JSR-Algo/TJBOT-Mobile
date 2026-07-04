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
    // The previously hard-coded drift rows (signup DTO, error response,
    // auth/idempotency) have been resolved, so the endpoint inventory is the
    // only remaining source of OUT_OF_SYNC status.
    expect(audit.endpointInventoryStatus).toBeDefined();
    expect(audit.summary.mobileCallCount).toBeGreaterThan(30);
    expect(audit.summary.backendRouteCount).toBeGreaterThan(20);
    expect(typeof audit.summary.missingBackendEndpointCount).toBe('number');
    expect(audit.apiMismatchTable).toEqual([]);
  });

  it('does not false-match literal backend segments against mobile :param wildcards', () => {
    const stdout = execFileSync(
      process.execPath,
      [
        path.join(process.cwd(), 'scripts/api-contract-sync.mjs'),
        '--json',
        '--no-write',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const audit = JSON.parse(stdout) as AuditJson;
    const missingPaths = audit.missingBackendEndpoints.map((entry) => entry.path);
    expect(missingPaths).not.toContain('/v1/devices/:param/assignments');
    expect(missingPaths).not.toContain('/v1/devices/:param/preload-status');
  });

  it('reports SYNCED when endpoint inventory and contract shapes align', () => {
    const stdout = execFileSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts/api-contract-sync.mjs'), '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    const audit = JSON.parse(stdout) as AuditJson;
    expect(audit.status).toBe('SYNCED');
    expect(audit.apiMismatchTable).toHaveLength(0);
    expect(audit.missingBackendEndpoints).toHaveLength(0);
  });
});
