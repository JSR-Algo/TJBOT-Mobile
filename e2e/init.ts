/**
 * Detox global test hooks.
 *
 * Runs once per test file to (re)launch the app with permissions granted
 * and a fresh delete-cache so auth tokens from previous runs don't leak
 * into this suite.
 */
import { beforeAll, beforeEach } from '@jest/globals';
import { device } from 'detox';
import { launchCleanApp } from './helpers/ui';

beforeAll(async () => {
  await launchCleanApp();
});

beforeEach(async () => {
  await device.reloadReactNative();
});
