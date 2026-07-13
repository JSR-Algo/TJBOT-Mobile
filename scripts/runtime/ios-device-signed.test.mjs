import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PHYSICAL_DEVICE_DEFAULT_CONFIGURATION,
  assertPhysicalConfiguration,
  getDefaults,
  parseArgs,
} from './ios-device-signed.mjs';

const cleanEnv = {
  // Intentionally omit TBOT_IOS_* so defaults are exercised.
};

test('physical-device default configuration is Release (self-contained, no Metro)', () => {
  assert.equal(PHYSICAL_DEVICE_DEFAULT_CONFIGURATION, 'Release');
  const defaults = getDefaults(cleanEnv);
  assert.equal(defaults.configuration, 'Release');
  assert.equal(defaults.allowMetroDebug, false);
});

test('parseArgs defaults to Release without flags', () => {
  const options = parseArgs([], cleanEnv);
  assert.equal(options.configuration, 'Release');
  assert.equal(options.launch, true);
  assert.equal(options.dryRun, false);
});

test('parseArgs honors explicit Release', () => {
  const options = parseArgs(['--configuration', 'Release', '--no-launch'], cleanEnv);
  assert.equal(options.configuration, 'Release');
  assert.equal(options.launch, false);
});

test('parseArgs refuses bare Debug without Metro opt-in', () => {
  assert.throws(
    () => parseArgs(['--configuration', 'Debug'], cleanEnv),
    /Refusing Debug physical-device install|Connect to Metro|allow-metro-debug/,
  );
});

test('parseArgs allows Debug with --allow-metro-debug', () => {
  const options = parseArgs(
    ['--configuration', 'Debug', '--allow-metro-debug', '--dry-run'],
    cleanEnv,
  );
  assert.equal(options.configuration, 'Debug');
  assert.equal(options.allowMetroDebug, true);
  assert.equal(options.dryRun, true);
});

test('env TBOT_IOS_ALLOW_METRO_DEBUG=1 unlocks Debug', () => {
  const options = parseArgs(['--configuration', 'Debug'], {
    TBOT_IOS_ALLOW_METRO_DEBUG: '1',
  });
  assert.equal(options.configuration, 'Debug');
});

test('env TBOT_IOS_CONFIGURATION=Debug still requires Metro opt-in', () => {
  assert.throws(
    () => parseArgs([], { TBOT_IOS_CONFIGURATION: 'Debug' }),
    /Refusing Debug physical-device install/,
  );
});

test('assertPhysicalConfiguration documents the Metro negative path', () => {
  assert.equal(assertPhysicalConfiguration({ configuration: 'Release' }), 'Release');
  assert.throws(
    () => assertPhysicalConfiguration({ configuration: 'Debug', allowMetroDebug: false }),
    /Metro/,
  );
});
