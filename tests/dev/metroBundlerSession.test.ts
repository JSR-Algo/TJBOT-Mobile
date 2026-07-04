import { shouldReplaceSession, type MetroBundlerSession } from '../../src/dev/metroBundlerSession';

const base: MetroBundlerSession = {
  public_ip: '203.0.113.10',
  bundler_host: 'demo.trycloudflare.com',
  bundler_scheme: 'https',
  tunnel_url: 'https://demo.trycloudflare.com',
  updated_at: '2026-06-22T10:00:00.000Z',
};

describe('shouldReplaceSession', () => {
  it('replaces when cache is empty', () => {
    expect(shouldReplaceSession(null, base)).toBe(true);
  });

  it('replaces when public IP changes', () => {
    expect(
      shouldReplaceSession(base, {
        ...base,
        public_ip: '203.0.113.11',
        updated_at: '2026-06-22T10:05:00.000Z',
      }),
    ).toBe(true);
  });

  it('replaces when bundler host changes', () => {
    expect(
      shouldReplaceSession(base, {
        ...base,
        bundler_host: 'next.trycloudflare.com',
        tunnel_url: 'https://next.trycloudflare.com',
        updated_at: '2026-06-22T10:05:00.000Z',
      }),
    ).toBe(true);
  });

  it('keeps cache when session is unchanged', () => {
    expect(shouldReplaceSession(base, { ...base })).toBe(false);
  });
});