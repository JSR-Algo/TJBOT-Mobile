import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { createMobileEnv } from './mobile-env.mjs';

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
