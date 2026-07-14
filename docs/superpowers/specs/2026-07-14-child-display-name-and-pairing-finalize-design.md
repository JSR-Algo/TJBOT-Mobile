# Child Display Name and Pairing Finalize Design

## Goal

Allow a parent to optionally edit the child's display name on the "Your child's buddy" screen. Saving with an empty field uses a buddy-based suggested name. The pairing completion path must remain retryable without creating duplicate child profiles.

## User Experience

- Add a text field labelled "Child's display name (optional)" below the buddy selection.
- Prefill the field with the localized buddy-based suggestion shown in the greeting preview.
- If the parent has not edited the field, changing the buddy updates the suggestion.
- Once the parent enters a custom value, changing the buddy does not overwrite it.
- Clearing the field is allowed. On save, whitespace-only input falls back to the current buddy suggestion.
- The greeting preview shows the effective value that will be saved.
- Preserve the existing age-range and starting-level requirements.

## Data Flow

1. `ChildProfileScreen` owns the raw display-name input and whether the parent has edited it.
2. A pure helper trims and collapses whitespace, applies the existing backend-compatible length limit, and returns the buddy suggestion when the input is empty.
3. `saveOnboardingChildProfile` receives the effective display name instead of the hard-coded `<buddy> friend` value.
4. If child creation succeeds but pairing finalization fails, the screen retains the created child and retries only finalization on the next save.

No BLE UUID, characteristic, provisioning payload, or robot Wi-Fi payload changes are included.

## Pairing Failure Diagnosis

The phone error and robot error must be traced independently across these boundaries:

- child profile API response;
- provisioning completion API response;
- Android navigation state;
- robot UART state after claim confirmation.

The implementation will only change pairing behavior when a reproducible failure identifies a concrete cause. Existing retry behavior remains the baseline.

The robot currently reports fragmented internal SRAM and repeated heartbeat task allocation failures after provisioning. Firmware work, if required, will be limited to preventing repeated task allocation or reducing the required internal-memory block without weakening heartbeat authentication.

## Error Handling

- Child creation errors remain on the screen with the existing user-facing mapping.
- Pairing finalization errors remain on the screen and allow a retry.
- Retry must not create another child profile.
- The save button remains guarded against concurrent submissions.

## Tests

- Custom child display name is trimmed and sent to child creation.
- Empty or whitespace-only input uses the current buddy suggestion.
- Changing buddy updates an untouched suggestion.
- Changing buddy preserves a custom name.
- Greeting preview uses the effective saved name.
- A finalization retry reuses the already-created child.
- Physical Android verification confirms the editable field and successful navigation.
- UART verification confirms the robot remains connected and heartbeat continues after saving.

## Out of Scope

- Collecting a legal name, birth date, photo, or other child identity data.
- Renaming the robot itself.
- Changing BLE provisioning contracts.
- Removing `MAC_IN_USE` protection for devices that already have an issued device secret.
