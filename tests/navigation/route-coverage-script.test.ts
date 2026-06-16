import { spawnSync } from 'child_process';
import { join } from 'path';

const root = join(__dirname, '..', '..');

describe('route coverage script', () => {
  it('reports exact feature route registration and duplicate screen registration counts', () => {
    const result = spawnSync('node', ['scripts/check-route-coverage.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('136 screen files, 129 routes registered');
    expect(result.stdout).toContain('129 feature route registrations');
    expect(result.stdout).toContain('0 duplicate screen registrations');
  });
});
