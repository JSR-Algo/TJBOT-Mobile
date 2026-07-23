# App Review Resubmission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make account deletion immediately discoverable, produce physical-device evidence, upload iOS build 8, correct App Store metadata, and resubmit the rejected submission.

**Architecture:** Keep the existing `ParentAccountPrivacyScreen` and deletion API unchanged. Add one explicit navigation entry in the existing Parent Settings Privacy group, lock it with a focused React Native test, then perform release-only versioning, device evidence, upload, and App Store Connect actions.

**Tech Stack:** React Native 0.83, TypeScript, React Navigation 7, Jest with Testing Library, Gradle/ADB, Xcode, Safari/App Store Connect.

---

## File Map

- Modify: `tests/e2e/parent-settings.test.tsx` — verify the explicit deletion entry and route.
- Modify: `src/features/parent/screens/ParentSettingsScreen.tsx` — expose the existing deletion flow in the visible Privacy group.
- Modify: `app.json` — set the Expo iOS build number to 8.
- Modify: `ios/TJBotMobile.xcodeproj/project.pbxproj` — set both native build configurations to build 8.
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/2026-07-23-adhoc-app-review-resubmit.md` — record validation, device-video, archive, upload, and App Review evidence.
- Preserve: `src/__env__.ts` — existing user-owned generated change; do not stage, rewrite, or revert it.

### Task 1: Add a failing discoverability test

**Files:**
- Modify: `tests/e2e/parent-settings.test.tsx`
- Test: `tests/e2e/parent-settings.test.tsx`

- [ ] **Step 1: Add the focused test immediately after `opens account privacy controls from settings`**

```tsx
  it('opens account deletion from the visible privacy section', async () => {
    const screen = await renderParentSettings();

    fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentAccountPrivacyScreen);
  });
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand tests/e2e/parent-settings.test.tsx -t "opens account deletion from the visible privacy section"
```

Expected: FAIL because Parent Settings has no button with accessible name `Delete account`.

- [ ] **Step 3: Commit only the failing test**

```bash
git add tests/e2e/parent-settings.test.tsx
git commit -m "test(parent): require visible account deletion entry" -m "Refs: adhoc-2026-07-23-app-review-resubmit"
```

### Task 2: Expose the existing deletion flow

**Files:**
- Modify: `src/features/parent/screens/ParentSettingsScreen.tsx`
- Test: `tests/e2e/parent-settings.test.tsx`

- [ ] **Step 1: Insert the deletion entry in the Privacy group**

Add this block after the `Safety & Privacy details` touchable and before `Delete child's data`:

```tsx
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Delete account')}
          onPress={() => navigation.navigate(ROUTES.ParentAccountPrivacyScreen)}
          activeOpacity={0.7}
        >
          <PRow icon="🗑" label="Delete account" danger chevron />
        </TouchableOpacity>
```

Do not remove `Account privacy` from the Support group because it also exposes account export.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
npm test -- --runInBand tests/e2e/parent-settings.test.tsx -t "opens account deletion from the visible privacy section"
```

Expected: PASS and navigation called with `ROUTES.ParentAccountPrivacyScreen`.

- [ ] **Step 3: Run the complete Parent Settings test file**

Run:

```bash
npm test -- --runInBand tests/e2e/parent-settings.test.tsx
```

Expected: all tests in the file pass, including the existing account-deletion scheduling tests.

- [ ] **Step 4: Commit the minimal UI implementation**

```bash
git add src/features/parent/screens/ParentSettingsScreen.tsx
git commit -m "fix(parent): expose account deletion in privacy settings" -m "Refs: adhoc-2026-07-23-app-review-resubmit"
```

### Task 3: Increment the iOS build number

**Files:**
- Modify: `app.json`
- Modify: `ios/TJBotMobile.xcodeproj/project.pbxproj`

- [ ] **Step 1: Change Expo build number**

In `app.json`, replace:

```json
"buildNumber": "7"
```

with:

```json
"buildNumber": "8"
```

- [ ] **Step 2: Change both native Xcode build configurations**

In `ios/TJBotMobile.xcodeproj/project.pbxproj`, replace both occurrences of:

```text
CURRENT_PROJECT_VERSION = 7;
```

with:

```text
CURRENT_PROJECT_VERSION = 8;
```

Keep `MARKETING_VERSION = 1.0.0` unchanged.

- [ ] **Step 3: Verify all version sources agree**

Run:

```bash
rg -n 'buildNumber|CURRENT_PROJECT_VERSION|MARKETING_VERSION' app.json ios/TJBotMobile.xcodeproj/project.pbxproj
```

Expected: Expo build 8, both Xcode configurations build 8, marketing version 1.0.0.

- [ ] **Step 4: Commit release versioning**

```bash
git add app.json ios/TJBotMobile.xcodeproj/project.pbxproj
git commit -m "chore(ios): bump App Store build to 8" -m "Refs: adhoc-2026-07-23-app-review-resubmit"
```

### Task 4: Validate the mobile change

**Files:**
- No production file changes.

- [ ] **Step 1: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: both exit 0 with no errors.

- [ ] **Step 2: Run unit and integration tests**

```bash
npm test
npm run test:integration
```

Expected: non-zero test counts and all suites pass.

- [ ] **Step 3: Run repository validators**

```bash
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: each exits 0 and each documentation validator reports a non-zero file count.

- [ ] **Step 4: Confirm the user-owned environment file is untouched**

```bash
git status --short
git diff -- src/__env__.ts
```

Expected: `src/__env__.ts` may remain modified, but none of this task's commits include it.

### Task 5: Build on Android hardware and record reviewer evidence

**Files:**
- Create outside Git staging: `build/review-evidence/tjbot-account-deletion-android.mp4`

- [ ] **Step 1: Confirm the connected device**

```bash
$HOME/Library/Android/sdk/platform-tools/adb devices -l
```

Expected: device `efc5314f`, model `2312DRA50C`, state `device`.

- [ ] **Step 2: Install the current debug build**

```bash
cd android
./gradlew app:installDebug
cd ..
$HOME/Library/Android/sdk/platform-tools/adb shell monkey -p com.TJBotmobile -c android.intent.category.LAUNCHER 1
```

Expected: Gradle reports `BUILD SUCCESSFUL` and TJBot opens on the phone.

- [ ] **Step 3: Start physical-device screen recording**

```bash
mkdir -p build/review-evidence
$HOME/Library/Android/sdk/platform-tools/adb shell screenrecord --bit-rate 8000000 /sdcard/tjbot-account-deletion-android.mp4
```

While recording, perform this exact journey:

```text
Sign in -> Profile -> Parent Settings -> Delete account ->
show confirmation phrase field -> show password field -> show Request deletion button
```

Do not submit a real deletion request for the shared App Review account. Stop recording with `Ctrl-C` after the full UI path is visible.

- [ ] **Step 4: Pull and inspect the video**

```bash
$HOME/Library/Android/sdk/platform-tools/adb pull /sdcard/tjbot-account-deletion-android.mp4 build/review-evidence/tjbot-account-deletion-android.mp4
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 build/review-evidence/tjbot-account-deletion-android.mp4
```

Expected: non-zero duration and file size; video clearly shows the complete navigation path without exposing the password.

### Task 6: Archive and upload iOS build 8

**Files:**
- Create outside Git staging: `build/ios/TJBotMobile-1.0.0-8.xcarchive`

- [ ] **Step 1: Verify workspace signing settings**

```bash
xcodebuild -workspace ios/TJBotMobile.xcworkspace -scheme TJBotMobile -configuration Release -showBuildSettings | rg 'PRODUCT_BUNDLE_IDENTIFIER|DEVELOPMENT_TEAM|CURRENT_PROJECT_VERSION|MARKETING_VERSION|CODE_SIGN_STYLE'
```

Expected: configured development team, automatic or valid manual signing, build 8, version 1.0.0.

- [ ] **Step 2: Create the release archive**

```bash
mkdir -p build/ios
xcodebuild -workspace ios/TJBotMobile.xcworkspace -scheme TJBotMobile -configuration Release -destination 'generic/platform=iOS' -archivePath "$PWD/build/ios/TJBotMobile-1.0.0-8.xcarchive" clean archive
```

Expected: `** ARCHIVE SUCCEEDED **` and the archive exists at the specified path.

- [ ] **Step 3: Validate archive metadata**

```bash
/usr/libexec/PlistBuddy -c 'Print :ApplicationProperties:CFBundleShortVersionString' build/ios/TJBotMobile-1.0.0-8.xcarchive/Info.plist
/usr/libexec/PlistBuddy -c 'Print :ApplicationProperties:CFBundleVersion' build/ios/TJBotMobile-1.0.0-8.xcarchive/Info.plist
```

Expected: version `1.0.0`, build `8`.

- [ ] **Step 4: Upload through Xcode Organizer**

Open the archive in Xcode Organizer, choose `Distribute App -> App Store Connect -> Upload`, retain automatic signing, and complete validation/upload. This external upload is explicitly authorized by the user's request to resubmit.

Expected: Xcode displays upload success for TJBOT version 1.0.0 build 8.

### Task 7: Correct App Store metadata and reply to App Review

**Files:**
- No repository file changes; Safari/App Store Connect only.

- [ ] **Step 1: Update Age Rating**

In App Store Connect, open `App Information -> Age Rating`, edit In-App Controls, and set `Parental Controls` to `None`. Save the questionnaire.

Expected: the Age Rating no longer claims an Apple-defined parental-control mechanism.

- [ ] **Step 2: Select build 8 for version 1.0**

After processing completes, open iOS version 1.0, replace build 7 with build 8, and save.

Expected: version page lists `1.0.0 (8)`.

- [ ] **Step 3: Add reviewer navigation notes**

Add this text to App Review Notes:

```text
Account deletion is available inside the app at:
Profile -> Parent Settings -> Delete account.

The user enters the confirmation phrase and account password, then taps Request deletion. The request starts a 30-day grace period before permanent deletion. The attached physical-device recording demonstrates the full navigation path and deletion controls.
```

- [ ] **Step 4: Attach the physical-device video**

Upload `build/review-evidence/tjbot-account-deletion-android.mp4` to the App Review Information attachment area. If App Store Connect rejects the video format or size, compress it locally without changing the visible journey, then upload the compressed MP4.

- [ ] **Step 5: Reply to Apple's Guideline 2.1 questions**

Send this verified response:

```text
Hello App Review Team,

Thank you for the review.

1. Third-party analytics: The submitted production configuration does not initialize PostHog or Sentry because no production API key or DSN is configured. Therefore, this build does not send analytics or crash-report data to those services. The app also disables analytics for the child role by design.

2. Third-party advertising: The app contains no advertising and includes no advertising SDK or ad network integration.

3. Third-party sharing: Account, child-profile, device, course, and learning-progress data are sent only to the TJBOT backend to provide the app's requested features. During an AI voice lesson, audio is processed in real time by the TJBOT service and Google's AI processing service only after explicit parental consent. Audio recordings are not retained.

4. Other collection: The app collects the parent account information, child profile and learning preferences, paired-device identifiers/status, course assignments, and learning progress required to provide account, robot setup, lesson, and parent-progress features. This data is not used for third-party advertising or tracking.

Account deletion is available at Profile -> Parent Settings -> Delete account. Build 8 makes this entry directly visible in the Privacy section. The attached physical-device recording demonstrates the complete path to the deletion controls.

We also corrected the Age Rating selection for Parental Controls to None.

Thank you.
```

- [ ] **Step 6: Resubmit build 8**

Click `Resubmit to App Review` only after build 8 is selected, Age Rating is saved, notes and video are attached, and the reply is visible in Messages.

Expected: submission status changes from Rejected to Waiting for Review.

### Task 8: Record release evidence

**Files:**
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/2026-07-23-adhoc-app-review-resubmit.md`

- [ ] **Step 1: Write the evidence record**

The record must include:

```markdown
# AD-HOC: App Review Resubmission

Date: 2026-07-23
Owner: TJBot-mobile / sys-16
Task: adhoc-2026-07-23-app-review-resubmit

## Acceptance Criteria

- Account deletion is directly discoverable from Parent Settings Privacy.
- iOS archive metadata is version 1.0.0 build 8.
- Physical-device video demonstrates the account-deletion controls.
- App Store metadata and Guideline 2.1 response are corrected.
- Submission returns to Waiting for Review.

## Evidence

Record each validation command, exit code, key output, Android video path and duration, Xcode upload confirmation, selected build, Age Rating value, App Review reply timestamp, and final submission status.

## Scope and Drift

- Backend API contract unchanged.
- COPPA consent text unchanged.
- No new route or state machine.
- Existing user modification in src/__env__.ts preserved and excluded from task commits.
```

- [ ] **Step 2: Run final diff checks**

```bash
git diff --check
git status --short
git log --oneline -6
```

Expected: no whitespace errors; only intended task files plus the preserved `src/__env__.ts` user change appear.

- [ ] **Step 3: Commit the evidence record**

```bash
git add migrate-ui-ux-to-mobile-app-docs/qa/2026-07-23-adhoc-app-review-resubmit.md
git commit -m "docs(app-review): record build 8 resubmission evidence" -m "Refs: adhoc-2026-07-23-app-review-resubmit"
```
