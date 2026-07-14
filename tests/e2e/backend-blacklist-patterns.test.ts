import { backendBlacklistPatterns } from '../../e2e/helpers/localServices';

describe('native E2E backend URL blocking', () => {
  test.each([
    [3000, '127.0.0.1'],
    [13300, 'localhost'],
    [15300, '10.0.2.2'],
  ])('matches configured port %i through the %s alias', (port, host) => {
    const patterns = backendBlacklistPatterns(`http://127.0.0.1:${port}/v1`);

    expect(patterns.some(pattern => new RegExp(pattern).test(`http://${host}:${port}/v1/courses`))).toBe(true);
    expect(patterns.some(pattern => new RegExp(pattern).test(`http://${host}:${port}?health=1`))).toBe(true);
  });

  test.each([3000, 13300, 15300])('rejects neighboring ports for configured port %i', port => {
    const patterns = backendBlacklistPatterns(`http://127.0.0.1:${port}/v1`);

    for (const candidatePort of [port - 1, port + 1, Number(`${port}0`)]) {
      expect(patterns.some(pattern => new RegExp(pattern).test(`http://localhost:${candidatePort}/v1`))).toBe(false);
    }
  });

  test.each([
    'http://127.0.0.1:30000/v1',
    'http://localhost:30000/v1',
    'http://10.0.2.2:30000/v1',
    'https://127.0.0.1:3000/v1',
    'http://evil127.0.0.1:3000/v1',
  ])('does not overmatch a different authority or port: %s', candidate => {
    const patterns = backendBlacklistPatterns('http://127.0.0.1:3000/v1');

    expect(patterns.some(pattern => new RegExp(pattern).test(candidate))).toBe(false);
  });

  test.each([
    ['http://127.0.0.1/v1', ['http://localhost/v1', 'http://localhost:80/v1'], ['http://localhost:81/v1', 'http://localhost:800/v1']],
    ['http://127.0.0.1:80/v1', ['http://10.0.2.2/v1', 'http://10.0.2.2:80/v1'], ['http://10.0.2.2:81/v1']],
    ['https://127.0.0.1/v1', ['https://127.0.0.1/v1', 'https://127.0.0.1:443/v1'], ['https://127.0.0.1:444/v1', 'http://127.0.0.1:443/v1']],
  ])('handles URL-normalized default ports for %s', (root, matches, misses) => {
    const patterns = backendBlacklistPatterns(root);

    for (const candidate of matches) {
      expect(patterns.some(pattern => new RegExp(pattern).test(candidate))).toBe(true);
    }
    for (const candidate of misses) {
      expect(patterns.some(pattern => new RegExp(pattern).test(candidate))).toBe(false);
    }
  });
});
