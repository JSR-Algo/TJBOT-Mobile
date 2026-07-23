# App Review Resubmission Design

Date: 2026-07-23  
Task: `adhoc-2026-07-23-app-review-resubmit`  
Owner: TJBot-mobile (`sys-16`)

## Context

Apple rejected iOS version 1.0 build 7 because the reviewer could not locate
account deletion, the Age Rating metadata claims parental controls that were not
found, and App Review needs details about analytics, advertising, data sharing,
and other data collection.

The shipped mobile code already contains a complete account-deletion request
flow under `Parent Settings -> Account privacy`. It authenticates with the
account password and schedules deletion with the existing 30-day grace period.
The release fix therefore focuses on discoverability and reviewer evidence,
without changing the backend contract or deletion policy.

## Selected Approach

Expose an explicit `Delete account` row in the existing Privacy group of Parent
Settings. The row navigates to the existing `ParentAccountPrivacyScreen`, where
the destructive action, password confirmation, subscription guard, deletion
status, and cancellation behavior remain unchanged.

Keep the existing `Account privacy` support entry so data export remains easy to
find. Do not duplicate deletion logic or add a new route.

## User Flow

1. The reviewer signs in with the review account.
2. The reviewer opens Profile and enters Parent Settings.
3. In the visible Privacy section, the reviewer taps `Delete account`.
4. The app opens Account Privacy and displays the deletion controls.
5. The reviewer can enter the confirmation phrase and password to initiate the
   existing 30-day deletion flow.

## Release Changes

- Add a localized and accessible `Delete account` navigation row to the Privacy
  group in `ParentSettingsScreen`.
- Add a focused test that fails when the row is absent or does not navigate to
  `ParentAccountPrivacyScreen`.
- Increment the iOS build number from 7 to 8; keep marketing version 1.0.0.
- Build and install the shared React Native app on the connected Android device
  to record the deletion journey on physical hardware.
- Archive and upload iOS build 8 through the existing signing setup.

## App Store Connect Updates

- Set Age Rating `Parental Controls` to `None`, because the app uses a protected
  parent area but does not claim an Apple-defined parental-control mechanism.
- Reply that the app has no third-party advertising. Describe PostHog and Sentry
  only according to their actual production configuration and privacy choices;
  do not claim that no data is collected until the runtime configuration is
  verified.
- State whether data is shared with service providers, why it is processed, and
  where it is stored based on the verified production configuration.
- Attach or reference the physical-device recording and provide the exact iOS
  navigation path to account deletion.

## Error Handling

The existing Account Privacy screen remains authoritative. It blocks deletion
while subscription status is loading, when an active subscription must be
cancelled, or when entitlement status cannot be verified. API errors remain
visible to the parent and no destructive action is simulated locally.

## Testing

- RED: focused Parent Settings test cannot find the explicit deletion entry.
- GREEN: the row renders with an accessible label and navigates to the existing
  account-privacy route.
- Run focused tests, full unit tests, typecheck, lint, integration tests, route
  checks, and repository documentation validators.
- Verify Android physical-device navigation and produce a screen recording.
- Verify the iOS archive reports build 8 before upload.

## Non-Goals

- No backend endpoint or deletion-policy changes.
- No changes to COPPA consent text.
- No new navigation route or state machine.
- No removal of the 30-day grace period.
