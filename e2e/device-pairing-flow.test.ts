import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { by, element, waitFor } from 'detox';
import {
  assertLocalBackendReady,
  seedOnboardedAccount,
  stopLocalMockBackend,
} from './helpers/localServices';
import {
  expectFirstVisibleText,
  launchCleanApp,
  loginFromColdStart,
  openRoute,
  openRouteToId,
  tapLabel,
  tapText,
  waitForText,
} from './helpers/ui';

const EMAIL = `detox-pairing-${Date.now()}@test.tbot.io`;
const PASSWORD = 'Pass123@';

describe('device pairing: connect/reconnect entry flow', () => {
  beforeAll(async () => {
    await assertLocalBackendReady();
    await seedOnboardedAccount(EMAIL, PASSWORD);
    await launchCleanApp();
    await loginFromColdStart(EMAIL, PASSWORD);
    await waitFor(element(by.id('homeTab'))).toBeVisible().withTimeout(30000);
  });

  afterAll(async () => {
    await stopLocalMockBackend();
  });

  it('opens the mobile Robot connect and reconnect path without a blank or dead-end screen', async () => {
    await openRouteToId('device/pair-add', 'pairAddScreen');
    await tapLabel('Pair a new Robot');
    await waitForText('Power on your Robot');
    await tapText('My Robot is on');
    await expectFirstVisibleText([
      'Looking for your Robot',
      "Bluetooth can't be used here",
      'Turn on Bluetooth first',
      "We couldn't see Robot nearby",
      "Bluetooth scan didn't start",
    ], 30000);

    await openRoute('device/pair-offline', 'Robot needs a reconnect');
    await tapLabel('Update Wi-Fi for offline Robot');
    await expectFirstVisibleText([
      'Looking for your Robot',
      "Bluetooth can't be used here",
      'Turn on Bluetooth first',
      "We couldn't see Robot nearby",
      "Bluetooth scan didn't start",
    ], 30000);

    await expectFirstVisibleText(['Open Bluetooth settings', 'Try again', 'Search again']);
  }, 180000);
});
