import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

function source(path: string): string {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : '';
}

describe('mobile-safe navigation transitions', () => {
  it('keeps native-stack transition options explicit and shared', () => {
    expect(source('src/navigation/options.ts')).toContain('PROTECTED_STACK_SCREEN_OPTIONS');
    expect(source('src/navigation/options.ts')).toContain('MODAL_STACK_SCREEN_OPTIONS');

    const navigatorFiles = [
      'src/navigation/AuthNavigator.tsx',
      'src/navigation/OnboardingNavigator.tsx',
      'src/navigation/ModalNavigator.tsx',
    ];

    for (const file of navigatorFiles) {
      expect(source(file)).not.toContain('screenOptions={{ headerShown: false }}');
    }
  });

  it('uses separate push and modal transition options in the protected navigator', () => {
    const modalNavigator = source('src/navigation/ModalNavigator.tsx');

    expect(modalNavigator).toContain('screenOptions={PROTECTED_STACK_SCREEN_OPTIONS}');
    expect(modalNavigator).toContain('screenOptions={MODAL_STACK_SCREEN_OPTIONS}');
  });
});
