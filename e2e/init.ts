/**
 * Detox global test hooks.
 *
 * Runs once per test file to (re)launch the app with permissions granted
 * and a fresh delete-cache so auth tokens from previous runs don't leak
 * into this suite.
 */
import { beforeAll, beforeEach } from '@jest/globals';
import { device } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: {
      notifications: 'YES',
      microphone: 'YES',
    },
  });
});

beforeEach(async () => {
  await device.reloadReactNative();
});
