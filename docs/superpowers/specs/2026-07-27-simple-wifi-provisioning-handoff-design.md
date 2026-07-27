# Simple Wi-Fi Provisioning Handoff Design

## Problem

After Android sends Wi-Fi credentials over BLE, the robot intentionally drops BLE while joining the network and may return to its initializing display. `PairConnectingScreen` currently treats the BLE handoff as an intermediate state and remains visible until the backend reports `device_authenticated`. If that report is delayed, the app appears frozen at “Waiting for robot authentication.”

## Approved Experience

The mobile flow separates local delivery from backend completion:

1. Send the pairing code, bootstrap data, and Wi-Fi credentials over BLE.
2. For the code-based flow, when BLE returns `wifi_credentials_sent`, persist the pending pairing context and navigate immediately to `PairRenameScreen`.
3. Let the parent choose the robot name and buddy while the robot reconnects and authenticates.
4. When the parent saves, call the strict backend completion endpoint.
5. If completion returns `DEVICE_AUTH_NOT_VERIFIED` or `PROVISIONING_ATTEMPT_NOT_READY`, retry with a bounded delay because these states are expected while the robot initializes.
6. If the retry window expires, remain on the rename screen and allow another save attempt. Do not display an indefinite spinner and do not incorrectly declare the robot paired.

## Safety Boundaries

- `wifi_credentials_sent` means only that the local handoff completed; it is not final pairing success.
- The backend remains authoritative. `completeDeviceProvisioning` must succeed (or return an existing idempotent-success code) before local pairing state is marked complete.
- BLE delivery-unknown errors keep the existing backend reconciliation path because credentials may or may not have reached the robot.
- Zero-code claims keep the existing claim-confirmation wait because the parent must still approve the connection physically on the robot.
- Credential-only Wi-Fi reconnect keeps its existing online check and Device Home navigation.
- Retry only the two backend “authentication not ready” codes. Ownership, device mismatch, child profile, network, and other errors remain terminal for that save attempt.

## Verification

- A code-based BLE handoff navigates to rename without polling `getProvisioningAttemptStatus`; zero-code claims still poll claim confirmation.
- Finalization retries backend completion after an authentication-not-ready response and succeeds once the robot authenticates.
- Finalization stops after a bounded number of attempts and surfaces a typed retryable timeout.
- Existing credential-only reconnect, delivery-unknown reconciliation, idempotent completion, and secret-redaction tests continue to pass.
