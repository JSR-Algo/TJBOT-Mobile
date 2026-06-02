import { execFileSync } from 'child_process';
import { join } from 'path';

const root = join(__dirname, '..', '..');

function readFlowPageMaps(): Record<string, string | undefined> {
  const script = [
    "import('./scripts/flows/lib/repo.mjs').then(({ buildPageMaps }) => {",
    '  const { stateToDomain } = buildPageMaps();',
    "  console.log(JSON.stringify({",
    "    onb_login: stateToDomain.get('onb_login'),",
    "    onb_welcome: stateToDomain.get('onb_welcome'),",
    "    onb_child: stateToDomain.get('onb_child'),",
    '  }));',
    '});',
  ].join('\n');

  return JSON.parse(execFileSync('node', ['--input-type=module', '--eval', script], {
    cwd: root,
    encoding: 'utf8',
  })) as Record<string, string | undefined>;
}

describe('flow script TypeScript feature source support', () => {
  it('derives state owners from TypeScript feature index and states files', () => {
    expect(readFlowPageMaps()).toEqual({
      onb_login: 'auth',
      onb_welcome: 'auth',
      onb_child: 'onboarding',
    });
  });
});
