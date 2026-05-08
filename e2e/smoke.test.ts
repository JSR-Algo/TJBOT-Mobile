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
import { describe, it, beforeAll } from '@jest/globals';
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import './init';

const STAGING_EMAIL = process.env.E2E_STAGING_EMAIL ?? 'qa+e2e@tbot.local';
const STAGING_PASSWORD = process.env.E2E_STAGING_PASSWORD ?? 'ChangeMe-E2E-2026';

describe('smoke: login → main tabs', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('cold-starts on the Login screen', async () => {
    await waitFor(element(by.id('loginScreen')))
      .toBeVisible()
      .withTimeout(30000);

    await detoxExpect(element(by.id('emailInput'))).toBeVisible();
    await detoxExpect(element(by.id('passwordInput'))).toBeVisible();
    await detoxExpect(element(by.id('submitButton'))).toBeVisible();
  });

  it('signs in with staging creds and lands on the Home tab', async () => {
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await element(by.id('passwordInput')).typeText(STAGING_PASSWORD);
    await element(by.id('submitButton')).tap();

    await waitFor(element(by.id('mainTabs')))
      .toBeVisible()
      .withTimeout(30000);

    await detoxExpect(element(by.id('homeTab'))).toBeVisible();
  });
});
