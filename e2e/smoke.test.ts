/**
 * Smoke E2E: cold-start → Login → staging creds → MainTabs + Home visible.
 *
 * Guards the single most critical user flow (can I actually log in on a real
 * device?). Uses testIDs, not text, so translation or copy changes do not
 * break the test.
 *
 * Required env:
 *   E2E_STAGING_EMAIL     — staging test account email
 *   E2E_STAGING_PASSWORD  — staging test account password
 * Falls back to documented defaults so `jest --listTests` and a local dry-run
 * don't fail before auth is attempted.
 */
import { describe, it, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import './init';
import {
  completeAgeGateIfVisible,
  completeFirstRunIntroIfVisible,
  dismissSavePasswordPromptIfVisible,
  ensureLoginScreen,
  tapIdAfterScroll,
} from './helpers/ui';
import { assertLocalBackendReady, seedOnboardedAccount, stopLocalMockBackend } from './helpers/localServices';

const STAGING_EMAIL = process.env.E2E_STAGING_EMAIL ?? 'qa+e2e@tbot.local';
const STAGING_PASSWORD = process.env.E2E_STAGING_PASSWORD ?? 'ChangeMe-E2E-2026';

describe('smoke: login → main tabs', () => {
  beforeAll(async () => {
    await assertLocalBackendReady();
    await seedOnboardedAccount(STAGING_EMAIL, STAGING_PASSWORD);
  });

  afterAll(async () => {
    await stopLocalMockBackend();
  });

  beforeEach(async () => {
    await ensureLoginScreen({ reset: true });
    await completeAgeGateIfVisible(100);
    await completeFirstRunIntroIfVisible(100);
  });

  it('cold-starts on the Login screen', async () => {
    await waitFor(element(by.id('loginScreenScroll')))
      .toBeVisible()
      .withTimeout(30000);

    await detoxExpect(element(by.id('emailInput'))).toBeVisible();
    await detoxExpect(element(by.id('passwordInput'))).toBeVisible();
    await detoxExpect(element(by.id('submitButton'))).toBeVisible();
  });

  it('signs in with staging creds and lands on the Home tab', async () => {
    await element(by.id('authModeTab_login')).tap();
    await waitFor(element(by.id('confirmPasswordInput')))
      .not.toBeVisible()
      .withTimeout(5000);
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await element(by.id('passwordInput')).typeText(STAGING_PASSWORD);
    try {
      await element(by.id('passwordInput')).tapReturnKey();
    } catch {
      // iOS secure fields do not always expose a return key in Detox.
    }
    try {
      await tapIdAfterScroll('submitButton', 'loginScreenScroll');
    } catch {
      await element(by.id('appRoot')).swipe('up', 'fast', 0.45);
      await waitFor(element(by.id('submitButton'))).toExist().withTimeout(5000);
      await element(by.id('submitButton')).tap();
    }
    await dismissSavePasswordPromptIfVisible();

    await waitFor(element(by.id('homeTab')))
      .toBeVisible()
      .withTimeout(30000);

    await detoxExpect(element(by.id('homeTab'))).toBeVisible();
  });
});
