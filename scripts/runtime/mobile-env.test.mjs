import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { createDetoxEnv, createMobileEnv } from './mobile-env.mjs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const mobileRunSource = fs.readFileSync(new URL('./mobile-run.mjs', import.meta.url), 'utf8');

test('createMobileEnv preserves caller env and prepends discovered runtimes', () => {
  const env = createMobileEnv({
    HOME: process.env.HOME,
    PATH: '/usr/bin',
    NODE_ENV: '',
    JAVA_HOME: process.env.JAVA_HOME,
    ANDROID_HOME: process.env.ANDROID_HOME,
    ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT,
  });

  assert.equal(env.NODE_ENV, 'development');
  assert.match(env.PATH, /\/usr\/bin/);

  if (env.JAVA_HOME) {
    assert.ok(env.PATH.split(path.delimiter).includes(path.join(env.JAVA_HOME, 'bin')));
  }

  if (env.ANDROID_HOME) {
    assert.equal(env.ANDROID_SDK_ROOT, env.ANDROID_HOME);
    assert.ok(env.PATH.split(path.delimiter).includes(path.join(env.ANDROID_HOME, 'platform-tools')));
  }
});

test('Android Detox scripts use the shared mobile runtime environment', () => {
  assert.equal(packageJson.scripts['detox:build:ios'], 'node scripts/runtime/mobile-run.mjs detox-build-ios');
  assert.equal(packageJson.scripts['detox:test:ios'], 'node scripts/runtime/mobile-run.mjs detox-test-ios');
  assert.equal(packageJson.scripts['detox:build:android'], 'node scripts/runtime/mobile-run.mjs detox-build-android');
  assert.equal(packageJson.scripts['detox:test:android'], 'node scripts/runtime/mobile-run.mjs detox-test-android');
});

test('embedded Android builds disable Metro devtools', () => {
  const buildAndroid = mobileRunSource.match(/'build-android':\s*\{[\s\S]*?\n  \},\n  'build-ios'/)?.[0];

  assert.ok(buildAndroid, 'build-android command must exist');
  assert.match(buildAndroid, /'--dev',\s*'false'/);
});

test('createDetoxEnv defaults to isolated local mock ports', () => {
  const ios = createDetoxEnv('ios', { HOME: process.env.HOME, PATH: '/usr/bin' });
  assert.equal(ios.E2E_LOCAL_API_URL, 'http://127.0.0.1:3300');
  assert.equal(ios.E2E_LOCAL_AI_URL, 'http://127.0.0.1:3301/api/ai');
  assert.equal(ios.E2E_IOS_API_URL, 'http://127.0.0.1:3300');
  assert.equal(ios.E2E_IOS_AI_URL, 'http://127.0.0.1:3301/api/ai');

  const android = createDetoxEnv('android', { HOME: process.env.HOME, PATH: '/usr/bin' });
  assert.equal(android.E2E_LOCAL_API_URL, 'http://127.0.0.1:3300');
  assert.equal(android.E2E_LOCAL_AI_URL, 'http://127.0.0.1:3301/api/ai');
  assert.equal(android.E2E_ANDROID_API_URL, 'http://10.0.2.2:3300');
  assert.equal(android.E2E_ANDROID_AI_URL, 'http://10.0.2.2:3301/api/ai');
});
