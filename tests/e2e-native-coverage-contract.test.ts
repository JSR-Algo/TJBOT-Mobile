import { existsSync, readFileSync } from 'fs';
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
    expect(helperSource).toContain('completeAgeGateIfVisible');
    expect(helperSource).toContain('completeFirstRunIntroIfVisible');
    expect(helperSource).toContain('SCREEN_TIMEOUT_MS = 10000');
    expect(helperSource).toContain('newInstance: true');
    expect(helperSource).toContain('delete: true');
  });

  it('clears iOS Keychain before clean unauthenticated Detox launches', () => {
    const helperSource = read('e2e/helpers/ui.ts');
    const initSource = read('e2e/init.ts');
    const authSpec = read('e2e/auth-signup-login.test.ts');

    expect(helperSource).toContain('clearIosKeychainForCleanLaunch');
    expect(helperSource).toContain('device.clearKeychain()');
    expect(helperSource.indexOf('device.clearKeychain()')).toBeLessThan(helperSource.indexOf('delete: true'));
    expect(initSource).toContain('launchCleanApp()');
    expect(authSpec.indexOf('clearIosKeychainForCleanLaunch()')).toBeLessThan(authSpec.indexOf('delete: true'));
  });

  it('avoids repeated iOS uninstall/reinstall cycles after the clean Detox launch', () => {
    const helperSource = read('e2e/helpers/ui.ts');
    const initSource = read('e2e/init.ts');

    expect(helperSource).toContain('let hasPerformedCleanInstall = false;');
    expect(helperSource).toContain('delete: !hasPerformedCleanInstall');
    expect(helperSource).toContain('hasPerformedCleanInstall = true;');
    expect(helperSource).not.toContain('delete: deleteAppData');
    expect(initSource).toContain('launchCleanApp');
  });

  it('checks for an already-visible login screen before optional first-run gates', () => {
    const helperSource = read('e2e/helpers/ui.ts');
    const loginProbeIndex = helperSource.indexOf('if (await waitForLoginInput(Math.min(timeout, SCREEN_TIMEOUT_MS))) return;');
    const ageGateIndex = helperSource.indexOf('await completeAgeGateIfVisible(Math.min(timeout, SCREEN_TIMEOUT_MS));');
    const introIndex = helperSource.indexOf('await completeFirstRunIntroIfVisible(Math.min(timeout, SCREEN_TIMEOUT_MS));');

    expect(helperSource).toContain("await waitForId('loginScreenScroll', timeout);");
    expect(loginProbeIndex).toBeGreaterThanOrEqual(0);
    expect(loginProbeIndex).toBeLessThan(ageGateIndex);
    expect(loginProbeIndex).toBeLessThan(introIndex);
  });

  it('keeps auth and smoke Detox specs aware of the first-launch age gate', () => {
    const authSpec = read('e2e/auth-signup-login.test.ts');
    const smokeSpec = read('e2e/smoke.test.ts');
    const introFrame = read('src/features/auth/components/IntroFrame.tsx');
    const loginScreen = read('src/features/auth/screens/LoginScreen.tsx');

    expect(authSpec).toContain('completeAgeGateIfVisible');
    expect(authSpec).toContain('completeFirstRunIntroIfVisible');
    expect(smokeSpec).toContain('completeAgeGateIfVisible');
    expect(introFrame).toContain('testID="introNextButton"');
    expect(loginScreen).toContain('testID="submitButton"');
    expect(loginScreen).toContain('testID="loginScreenScroll"');
    expect(loginScreen).toContain('testID="emailErrorText"');
    expect(loginScreen).toContain('testID="passwordErrorText"');
    expect(loginScreen).toContain('testID="generalErrorText"');
    expect(loginScreen).toContain('testID="resetMessageText"');
  });

  it('scrolls to the trust CTA during first-run intro completion', () => {
    const helperSource = read('e2e/helpers/ui.ts');
    const authTrustScreen = read('src/features/auth/screens/TrustScreen.tsx');
    const onboardingTrustScreen = read('src/features/onboarding/screens/TrustScreen.tsx');

    expect(helperSource).toContain("await tapIdAfterScroll('trustContinueButton', 'onboardingScroll'");
    expect(helperSource).toContain("await device.tap({ x: 540, y: 1710 })");
    expect(helperSource).toContain("await waitForId('loginScreenScroll', 5000)");
    expect(authTrustScreen).toContain('<OnbShell title="Our promise" testID="onboardingScroll"');
    expect(onboardingTrustScreen).toContain('<OnbShell title="Our promise" testID="onboardingScroll"');
    expect(authTrustScreen).toContain('testID="trustContinueButton"');
    expect(onboardingTrustScreen).toContain('testID="trustContinueButton"');
  });

  it('uses a scroll-aware submit tap in native auth specs', () => {
    const authSpec = read('e2e/auth-signup-login.test.ts');
    const smokeSpec = read('e2e/smoke.test.ts');

    for (const spec of [authSpec, smokeSpec]) {
      expect(spec).toContain('tapIdAfterScroll');
      expect(spec).not.toContain('device.pressBack()');
      expect(spec).toContain("await tapIdAfterScroll('submitButton', 'loginScreenScroll'");
      expect(spec).toContain("element(by.id('appRoot')).swipe('up'");
      expect(spec).toContain("waitFor(element(by.id('submitButton'))).toExist().withTimeout(5000)");
      expect(spec).not.toContain("toBeVisible(50)");
      expect(spec).not.toContain("waitFor(element(by.id('submitButton'))).toBeVisible().withTimeout(5000)");
    }
  });

  it('keeps Detox backend and AI endpoints configurable per platform', () => {
    const detoxConfig = read('.detoxrc.js');
    const packageJson = read('package.json');
    const mobileRun = read('scripts/runtime/mobile-run.mjs');
    const mobileEnv = read('scripts/runtime/mobile-env.mjs');

    expect(detoxConfig).toContain('process.env.E2E_IOS_API_URL');
    expect(detoxConfig).toContain('process.env.E2E_ANDROID_API_URL');
    expect(detoxConfig).toContain('process.env.E2E_IOS_AI_URL');
    expect(detoxConfig).toContain('process.env.E2E_ANDROID_AI_URL');
    expect(detoxConfig).toContain("const IOS_API_URL = process.env.E2E_IOS_API_URL || 'http://localhost:3000';");
    expect(detoxConfig).toContain("const IOS_AI_URL = process.env.E2E_IOS_AI_URL || 'http://localhost:3001/api/ai';");
    expect(detoxConfig).not.toContain('process.env.E2E_IOS_API_URL || process.env.TBOT_API_URL');
    expect(detoxConfig).not.toContain('process.env.E2E_IOS_AI_URL || process.env.TBOT_AI_URL');
    expect(detoxConfig).toContain("const ANDROID_API_URL = process.env.E2E_ANDROID_API_URL || 'http://10.0.2.2:3000';");
    expect(detoxConfig).toContain("const ANDROID_AI_URL = process.env.E2E_ANDROID_AI_URL || 'http://10.0.2.2:3001/api/ai';");
    expect(detoxConfig).toContain('TBOT_AI_URL=${ANDROID_AI_URL}');
    expect(detoxConfig).not.toContain('cd android && TBOT_API_URL=http://localhost:3000 TBOT_AI_URL=http://localhost:3001/api/ai');
    expect(detoxConfig).toContain('SIMULATION_MODE=true');
    expect(detoxConfig).toContain('EXPO_PUBLIC_VOICE_TEST_HARNESS=true');
    expect(detoxConfig).toContain('process.env.E2E_ENABLE_VOICE_TEST_HARNESS');
    expect(detoxConfig).toContain("require('./metro.config.js')");
    expect(detoxConfig).toContain('const IS_ANDROID_CONFIGURATION');
    expect(detoxConfig).toContain('const METRO_API_URL = IS_ANDROID_CONFIGURATION ? ANDROID_API_URL : IOS_API_URL;');
    expect(detoxConfig).toContain('process.env.TBOT_API_URL = METRO_API_URL');
    expect(detoxConfig).toContain('process.env.TBOT_AI_URL = METRO_AI_URL');
    expect(detoxConfig.indexOf('process.env.TBOT_API_URL = METRO_API_URL')).toBeLessThan(detoxConfig.indexOf("const metroConfig = require('./metro.config.js')"));
    expect(detoxConfig).toContain('-Pe2eBundleDebug=true');
    expect(detoxConfig).toContain('./gradlew :app:assembleDebug :app:assembleAndroidTest');
    expect(detoxConfig).not.toContain('./gradlew assembleDebug assembleAndroidTest');
    expect(detoxConfig).toContain('FORCE_BUNDLING=1');
    expect(detoxConfig).toContain('generic/platform=iOS Simulator');
    expect(packageJson).toContain('"detox:build:android": "node scripts/runtime/mobile-run.mjs detox-build-android"');
    expect(packageJson).toContain('"detox:test:android": "node scripts/runtime/mobile-run.mjs detox-test-android"');
    expect(mobileRun).toContain("env: createDetoxEnv('android')");
    expect(mobileEnv).toContain('env.ANDROID_SDK_ROOT = androidSdk');
    expect(mobileEnv).toContain("path.join(androidSdk, 'platform-tools')");
  });

  it('keeps Android Detox runner dependencies on the androidTest classpath', () => {
    const androidRootBuild = read('android/build.gradle');
    const androidBuild = read('android/app/build.gradle');

    expect(androidRootBuild).toContain('node_modules/detox/Detox-android');
    expect(androidBuild).toContain('androidTestImplementation("com.wix:detox:');
    expect(androidBuild).toContain('androidTestImplementation("androidx.test.ext:junit:');
    expect(androidBuild).toContain('androidTestImplementation("androidx.test:rules:');
    expect(androidBuild).toContain('androidTestImplementation("androidx.test:runner:');
    expect(androidBuild).toContain('androidTestImplementation("junit:junit:');
    expect(androidBuild).toContain('testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"');
  });

  it('embeds JavaScript in Android Detox debug APKs without requiring Metro', () => {
    const detoxConfig = read('.detoxrc.js');
    const androidBuild = read('android/app/build.gradle');

    expect(detoxConfig).toContain('-Pe2eBundleDebug=true');
    expect(androidBuild).toContain("def e2eBundleDebug = (findProperty('e2eBundleDebug') ?: false).toBoolean()");
    expect(androidBuild).toContain('debuggableVariants = e2eBundleDebug ? [] : ["debug"]');
  });

  it('patches Expo CLI to keep the streams polyfill out of native bundles', () => {
    const packageJson = read('package.json');
    const packageManifest = JSON.parse(packageJson);
    const patchPath = join(root, 'patches/@expo+cli+55.0.21.patch');

    expect(packageJson).toContain('"postinstall": "patch-package"');
    expect(packageManifest.dependencies?.['patch-package']).toBe('8.0.1');
    expect(packageManifest.devDependencies?.['patch-package']).toBeUndefined();
    expect(existsSync(patchPath)).toBe(true);

    const patch = read('patches/@expo+cli+55.0.21.patch');
    expect(patch).toContain("-            require.resolve('expo/virtual/streams.js')");
    expect(patch).toContain('+            ...virtualModulesPolyfills');
  });

  it('keeps iOS Detox builds signed with a Keychain access group for SecureStore', () => {
    const detoxConfig = read('.detoxrc.js');
    const project = read('ios/TJBotMobile.xcodeproj/project.pbxproj');
    const entitlements = read('ios/TJBotMobile/TJBotMobile.entitlements');

    expect(detoxConfig).not.toContain('CODE_SIGNING_ALLOWED=NO');
    expect(project).toContain('CODE_SIGN_ENTITLEMENTS = TJBotMobile/TJBotMobile.entitlements;');
    expect(entitlements).toContain('application-identifier');
    expect(entitlements).toContain('com.apple.developer.team-identifier');
    expect(entitlements).toContain('keychain-access-groups');
    expect(entitlements).toContain('$(TeamIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER)');
  });

  it('keeps shared iOS debug signing free of personal team and bundle overrides', () => {
    const project = read('ios/TJBotMobile.xcodeproj/project.pbxproj');

    expect(project).toContain('DEVELOPMENT_TEAM = "";');
    expect(project).not.toContain('"PRODUCT_BUNDLE_IDENTIFIER[sdk=iphoneos*]" = com.manhhodinh.tjbot.mobile;');
  });

  it('keeps iOS Release signing automatic without forcing a distribution identity', () => {
    const project = read('ios/TJBotMobile.xcodeproj/project.pbxproj');
    const releaseTarget = project.match(/13B07F951A680F5B00A75B9A \/\* Release \*\/[\s\S]*?\n\t\t};/)?.[0] ?? '';

    expect(releaseTarget).not.toBe('');
    expect(releaseTarget).toContain('CODE_SIGN_STYLE = Automatic;');
    expect(releaseTarget).not.toContain('CODE_SIGN_IDENTITY = "Apple Distribution";');
  });

  it('keeps debug iOS device builds Metro-backed for LAN backend discovery', () => {
    const appDelegate = read('ios/TJBotMobile/AppDelegate.mm');

    expect(appDelegate).toContain('#if DEBUG\n  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];');
    expect(appDelegate).not.toContain('#if DEBUG && TARGET_OS_SIMULATOR');
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
      'supports back navigation',
      'dismisses modal fallback',
      'keeps the native app alive',
    ]) {
      expect(moduleMatrix).toContain(requiredText);
    }
  });
});
