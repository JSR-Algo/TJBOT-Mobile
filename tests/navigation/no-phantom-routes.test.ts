import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

describe('navigation route ownership', () => {
  it('does not expose legacy phantom route aliases from src/app/screens', () => {
    const routes = readFileSync(join(root, 'src', 'navigation', 'routes.ts'), 'utf8');
    const modalStack = readFileSync(join(root, 'src', 'navigation', 'ModalNavigator.tsx'), 'utf8');

    expect(routes).not.toMatch(/^\s{2}ListenScreen:/m);
    expect(routes).not.toMatch(/^\s{2}SpeakScreen:/m);
    expect(routes).not.toMatch(/^\s{2}DevicePairWifiScreen:/m);
    expect(modalStack).not.toContain('../screens/ListenScreen');
    expect(modalStack).not.toContain('../screens/SpeakScreen');
    expect(modalStack).not.toContain('../screens/DevicePairWifiScreen');
  });
});
