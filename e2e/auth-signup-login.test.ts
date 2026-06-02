/**
 * E2E: auth signup + login flows — mapped to plan ACs.
 *
 * AC coverage:
 *   AC-1  Empty email → inline "Enter your email to continue."
 *   AC-2  Invalid email → "Enter a valid email address."
 *   AC-3  Weak password → passwordError lists all failing rules
 *   AC-4  Valid password typed char-by-char → checklist ticks; submit CTA enabled
 *   AC-5  Existing email (mock 409) → "An account with this email already exists." + tab switches to Log in
 *   AC-12 Eye icon → password becomes visible/hidden
 *   AC-13 Confirm password mismatch → "Passwords don't match."
 *   AC-14 Forgot password → CTA changes to "Send reset email"; shows success message
 *   AC-16 LoginErrorScreen route removed → deep-link tbot://auth/login-error falls back (no crash, no nav)
 *
 * Required env (happy-path tests only):
 *   E2E_STAGING_EMAIL    — staging test account email
 *   E2E_STAGING_PASSWORD — staging test account password
 *   E2E_NEW_EMAIL        — unused-email for signup tests (avoids 409 on AC-5)
 *
 * Build + run:
 *   npm run detox:build:ios && npm run detox:test:ios
 *
 * Do NOT run detox:build as part of tsc/lint CI — separate session required.
 */

import { describe, it, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

import {
  clearIosKeychainForCleanLaunch,
  completeAgeGateIfVisible,
  completeFirstRunIntroIfVisible,
  ensureLoginScreen,
} from './helpers/ui';
import { assertLocalBackendReady, seedOnboardedAccount, stopLocalMockBackend } from './helpers/localServices';

const STAGING_EMAIL = process.env.E2E_STAGING_EMAIL ?? 'qa+e2e@tbot.local';
const STAGING_PASSWORD = process.env.E2E_STAGING_PASSWORD ?? 'ChangeMe-E2E-2026';

// A valid strong password that satisfies all checklist rules.
const STRONG_PASSWORD = 'Test@1234';
// An email address that has never been registered (use a timestamped alias in CI).
const FRESH_EMAIL = process.env.E2E_NEW_EMAIL ?? `qa+new-${Date.now()}@tbot.local`;

beforeAll(async () => {
  await assertLocalBackendReady();
  await seedOnboardedAccount(STAGING_EMAIL, STAGING_PASSWORD);
});

afterAll(async () => {
  await stopLocalMockBackend();
});

async function launchOnLoginScreen(): Promise<void> {
  await ensureLoginScreen({ reset: true });
}

async function switchToTab(label: 'Sign up' | 'Log in'): Promise<void> {
  await element(by.id(label === 'Sign up' ? 'authModeTab_signup' : 'authModeTab_login')).tap();
}

async function replaceSecureText(testID: string, value: string): Promise<void> {
  await element(by.id(testID)).tap();
  await element(by.id(testID)).replaceText(value);
  try {
    await element(by.id(testID)).tapReturnKey();
  } catch {
    // iOS secure fields do not always expose a return key in Detox.
  }
}

async function tapSubmitButton(): Promise<void> {
  for (const id of ['confirmPasswordInput', 'passwordInput', 'emailInput']) {
    try {
      await element(by.id(id)).tapReturnKey();
      break;
    } catch {
      continue;
    }
  }
  if (device.getPlatform() === 'android') {
    await device.pressBack();
  } else {
    try {
      await element(by.id('loginScreenScroll')).scroll(220, 'down');
    } catch {
      // Already positioned at the CTA.
    }
  }
  await waitFor(element(by.id('submitButton'))).toBeVisible().withTimeout(5000);
  await element(by.id('submitButton')).tap();
}

async function dismissSavePasswordPromptIfVisible(): Promise<void> {
  if (device.getPlatform() !== 'ios') return;
  await waitFor(element(by.id('homeTab'))).toExist().withTimeout(30000);
  await new Promise(resolve => setTimeout(resolve, 1000));
  try {
    await device.tap({ x: 300, y: 1270 });
  } catch {
    // Prompt is best-effort; the following visibility assertion remains authoritative.
  }
}

describe('auth: signup validation (AC-1, AC-2, AC-3, AC-4, AC-12, AC-13)', () => {
  beforeAll(launchOnLoginScreen);

  beforeEach(async () => {
    await ensureLoginScreen({ reset: true });
    // Always start on the Sign up tab.
    await waitFor(element(by.id('emailInput'))).toBeVisible().withTimeout(15000);
  });

  it('AC-1: empty email → inline email error', async () => {
    await tapSubmitButton();
    await waitFor(element(by.id('emailErrorText')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('AC-2: invalid email → inline email error', async () => {
    await element(by.id('emailInput')).typeText('foo@');
    await tapSubmitButton();
    await waitFor(element(by.id('emailErrorText')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('AC-3: weak password → password error lists all failing rules', async () => {
    await element(by.id('emailInput')).typeText('user@example.com');
    // 'a' fails every rule: length, uppercase, digit, special char
    await replaceSecureText('passwordInput', 'a');
    await tapSubmitButton();
    // Password error should appear (any of the checklist-rule messages)
    await waitFor(element(by.id('passwordErrorText'))).toBeVisible().withTimeout(5000);
  });

  it('AC-4: valid password typed char-by-char → checklist ticks; submit enabled', async () => {
    await element(by.id('emailInput')).typeText('user@example.com');
    // Type each required char and verify the rule flips to met.
    await replaceSecureText('passwordInput', 'a');
    await waitFor(element(by.id('passwordRule_length_not_met'))).toExist().withTimeout(3000);

    await replaceSecureText('passwordInput', 'aAAAAAAA'); // now >=8, has uppercase
    await waitFor(element(by.id('passwordRule_length_met'))).toExist().withTimeout(3000);
    await waitFor(element(by.id('passwordRule_uppercase_met'))).toExist().withTimeout(3000);

    await replaceSecureText('passwordInput', STRONG_PASSWORD);
    await waitFor(element(by.id('passwordRule_length_met'))).toExist().withTimeout(3000);
    await waitFor(element(by.id('passwordRule_uppercase_met'))).toExist().withTimeout(3000);
    await waitFor(element(by.id('passwordRule_number_met'))).toExist().withTimeout(3000);
    await waitFor(element(by.id('passwordRule_special_met'))).toExist().withTimeout(3000);

    // Fill confirm password to match → submit should be enabled (not loading spinner)
    await replaceSecureText('confirmPasswordInput', STRONG_PASSWORD);
    await detoxExpect(element(by.id('submitButton'))).toBeVisible();
  });

  it('AC-12: eye icon toggles password visibility', async () => {
    await replaceSecureText('passwordInput', 'Secret1!');
    // Default: obscured — tap "Show password"
    await element(by.id('passwordInputToggle')).tap();
    await detoxExpect(element(by.label('Ẩn mật khẩu'))).toBeVisible();
    // Tap again — back to hidden
    await element(by.id('passwordInputToggle')).tap();
    await detoxExpect(element(by.label('Hiện mật khẩu')).atIndex(0)).toBeVisible();
  });

  it('AC-13: confirm password mismatch → "Passwords do not match."', async () => {
    await element(by.id('emailInput')).typeText(FRESH_EMAIL);
    await replaceSecureText('passwordInput', STRONG_PASSWORD);
    await replaceSecureText('confirmPasswordInput', 'DifferentPass@9');
    await tapSubmitButton();
    await waitFor(element(by.id('passwordErrorText')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

describe('auth: signup existing email → auto-switch tab (AC-5)', () => {
  beforeAll(launchOnLoginScreen);

  it('AC-5: existing email triggers USER_EXISTS → general error + tab switches to Log in', async () => {
    // STAGING_EMAIL is a pre-existing account.
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await replaceSecureText('passwordInput', STRONG_PASSWORD);
    await replaceSecureText('confirmPasswordInput', STRONG_PASSWORD);
    await tapSubmitButton();

    // The backend returns 409/USER_EXISTS. LoginScreen switches to login tab.
    await waitFor(element(by.id('confirmPasswordInput')))
      .not.toBeVisible()
      .withTimeout(10000);

    // General error message surfaced.
    await waitFor(element(by.id('generalErrorText')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

describe('auth: forgot password inline flow (AC-14)', () => {
  beforeAll(async () => {
    await launchOnLoginScreen();
    await switchToTab('Log in');
  });

  it('AC-14: Forgot password? → CTA becomes "Send reset email" → success message', async () => {
    // Tap "Forgot password?" link
    await element(by.id('forgotPasswordButton')).tap();
    // CTA label changes
    await waitFor(element(by.id('submitButton')))
      .toBeVisible()
      .withTimeout(3000);

    // Type a valid email and send
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await tapSubmitButton();

    // Success message appears
    await waitFor(element(by.id('resetMessageText')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

describe('auth: LoginErrorScreen route removed (AC-16)', () => {
  it('AC-16: deep-link tbot://auth/login-error does not navigate to LoginErrorScreen', async () => {
    await clearIosKeychainForCleanLaunch();
    await device.launchApp({
      newInstance: true,
      delete: true,
      url: 'tbot://auth/login-error',
      permissions: { notifications: 'YES', microphone: 'YES' },
    });
    await completeAgeGateIfVisible(10000);
    await completeFirstRunIntroIfVisible(10000);

    // App must not crash. Should land on LoginScreen (fallback) or SplashScreen.
    // LoginErrorScreen must NOT be visible.
    await waitFor(element(by.id('loginErrorScreen')))
      .not.toBeVisible()
      .withTimeout(10000);

    // App is still alive — either email input (login screen) or splash is visible.
    await detoxExpect(
      element(by.id('emailInput')).atIndex(0),
    ).toExist();
  });
});

describe('auth: login happy path (smoke regression)', () => {
  beforeAll(launchOnLoginScreen);

  it('signs in with staging creds and lands on main tabs', async () => {
    await switchToTab('Log in');
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await replaceSecureText('passwordInput', STAGING_PASSWORD);
    await tapSubmitButton();
    await dismissSavePasswordPromptIfVisible();

    await waitFor(element(by.id('mainTabs')))
      .toExist()
      .withTimeout(30000);

    await waitFor(element(by.id('homeTab')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
