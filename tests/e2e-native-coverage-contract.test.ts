import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('native Detox E2E coverage contract', () => {
  it('keeps stable app-level anchors for blank-screen and crash checks', () => {
    const appSource = read('src/App.tsx');
    const tabSource = read('src/navigation/MainTabNavigator.tsx');

    expect(appSource).toContain('testID="appRoot"');
    expect(tabSource).toContain('testID="mainTabs"');
  });

  it('requires native E2E helpers for no-blank, loading-timeout, and crash assertions', () => {
    const helperSource = read('e2e/helpers/ui.ts');

    expect(helperSource).toContain('expectNoBlankScreen');
    expect(helperSource).toContain('expectNoStuckLoading');
    expect(helperSource).toContain('expectNativeAppAlive');
    expect(helperSource).toContain('SCREEN_TIMEOUT_MS = 10000');
    expect(helperSource).toContain('newInstance: true');
    expect(helperSource).toContain('delete: true');
  });

  it('keeps Detox backend and AI endpoints configurable per platform', () => {
    const detoxConfig = read('.detoxrc.js');
    const packageJson = read('package.json');

    expect(detoxConfig).toContain('process.env.E2E_IOS_API_URL');
    expect(detoxConfig).toContain('process.env.E2E_ANDROID_API_URL');
    expect(detoxConfig).toContain('process.env.E2E_IOS_AI_URL');
    expect(detoxConfig).toContain('process.env.E2E_ANDROID_AI_URL');
    expect(detoxConfig).toContain('SIMULATION_MODE=true');
    expect(detoxConfig).toContain('EXPO_PUBLIC_VOICE_TEST_HARNESS=true');
    expect(detoxConfig).toContain('process.env.E2E_ENABLE_VOICE_TEST_HARNESS');
    expect(detoxConfig).toContain('-Pe2eBundleDebug=true');
    expect(detoxConfig).toContain('generic/platform=iOS Simulator');
    expect(packageJson).toContain('ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}');
  });

  it('covers requested native flows in Detox scenarios', () => {
    const moduleMatrix = read('e2e/module-matrix.test.ts');

    for (const requiredText of [
      'cold-starts',
      'logs in',
      'completes onboarding',
      'navigates every protected tab',
      'device/device-home',
      'lesson-session/lesson-ready',
      'parent/parent-summary',
      'purchase/purchase-intro',
      'fallback/network-error',
      'supports back gesture',
      'dismisses modal fallback',
      'keeps the native app alive',
    ]) {
      expect(moduleMatrix).toContain(requiredText);
    }
  });
});
