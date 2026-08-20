import { existsSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const root = join(__dirname, '..', '..');

describe('generated mobile environment defaults', () => {
  it('keeps runtime values outside tracked source', () => {
    const trackedFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .filter((file) => file && existsSync(join(root, file)));
    const defaults = readFileSync(join(root, 'src/__env__.defaults.ts'), 'utf8');
    const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');

    expect(trackedFiles).not.toContain('src/__env__.ts');
    expect(trackedFiles).toContain('src/__env__.defaults.ts');
    expect(defaults).not.toMatch(/\.onrender\.com/i);
    expect(defaults).not.toMatch(/https:\/\//i);
    expect(defaults).toContain('TBOT_API_URL: ""');
    expect(defaults).toContain('TBOT_AI_URL: ""');
    expect(gitignore).toMatch(/^\.runtime\/$/m);
  });
});
