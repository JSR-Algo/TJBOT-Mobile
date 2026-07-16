import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

describe('generated mobile environment defaults', () => {
  it('does not check production service URLs into the generated source', () => {
    const source = readFileSync(join(root, 'src/__env__.ts'), 'utf8');

    expect(source).not.toMatch(/\.onrender\.com/i);
    expect(source).not.toMatch(/https:\/\//i);
    expect(source).toContain('TBOT_API_URL: ""');
    expect(source).toContain('TBOT_AI_URL: ""');
  });
});
