# Use Cases — `device-pairing`

> **Owning lane:** Lane D. **UC count:** 14. UC-DP04 authored by Lane Z (Phase 0.5 dry-run sample). Other 13 bodies filled by Lane D (Phase 1).
>
> Each H2 below corresponds to one UC ID from `reference/use-case-index.json`. Cross-domain edges: see `reference/cross-domain-edges.json`. Backend mapping: see `backend-mapping.md`. Edge cases: see `edge-cases.md`.

---

## UC-DP01 — View Device Overview

- **Goal:** Parent reads the marketing/onboarding overview that explains the two-device model (Robot is the child's speaking buddy; phone is for the grown-up) before starting pairing.
- **Trigger:** Navigation arrives at `dv_overview` (`DeviceOverviewPage`).
- **Preconditions:** Parent has passed UC-PR01 (parent gate is `[requires]` for the device-* domain per `device-pairing.usecase.puml`).
- **Main Flow:**
  1. `DeviceOverviewPage` mounts and renders the headline "One product. Two devices." (`DeviceOverviewScreen.jsx:13-15`).
  2. Page lays out the Robot + phone pair illustration and the responsibility chips (`DeviceOverviewScreen.jsx:18-`).
  3. Parent taps "Set up Robot" → navigation transitions to `dv_pair_intro` (UC-DP03) per the `..>` edge `UC_DP_OVERVIEW ..> UC_DP_INTRO` in `device-pairing.usecase.puml:38`.
- **Postconditions:** Navigation lands on `dv_pair_intro`; no auth/state mutation.

## UC-DP02 — Add New Robot

- **Goal:** Parent picks the right pairing path for their situation (new Robot vs. existing Robot that went offline).
- **Trigger:** Tap "Add a Robot" on the device home or overview, landing on `dv_pair_add` (`PairAddPage`).
- **Preconditions:** Parent passed UC-PR01; device-pairing domain is reachable.
- **Main Flow:**
  1. `PairAddPage` shows the two-device explainer + two large action tiles (`PairAddScreen.jsx:7-37`).
  2. Parent taps "I have a new Robot" → `dv_pair_intro` (UC-DP03) — `PairAddScreen.jsx:15`.
  3. UC-DP03 (Power-on Robot Confirm) runs.
- **Postconditions:** Navigation lands on `dv_pair_intro` with the new-robot intent.
- **Alt Flow:**
  1. Parent taps "My Robot is offline" → `dv_pair_offline` (UC-DP12) — `PairAddScreen.jsx:25`.

## UC-DP03 — Power-on Robot Confirm

- **Goal:** Parent confirms Robot is powered on and within range before the app starts a radio scan.
- **Trigger:** Navigation arrives at `dv_pair_intro` from UC-DP02 (Add New Robot) or UC-DP01 (Device Overview).
- **Preconditions:** Robot hardware is on hand; Parent followed UC-DP02 path.
- **Main Flow:**
  1. `PairIntroPage` shows the Robot illustration and a 3-step checklist (plug in / hold top button / place within 1–2 m) — `PairIntroScreen.jsx:9-30`.
  2. Parent presses-and-holds Robot's top button until it chimes (off-app physical step).
  3. Parent taps the primary CTA → navigation transitions to `dv_pair_search` (UC-DP04) per `UC_DP_INTRO ..> UC_DP_SCAN`.
- **Postconditions:** Navigation lands on `dv_pair_search`; the radio scan starts.

## UC-DP04 — Scan for Robot

- **Goal:** App discovers a nearby powered-on Robot over BLE so it can deliver the zero-code claim token locally.
- **Trigger:** Navigation arrives at `dv_pair_search` from UC-DP03 (Power-on Robot Confirm).
- **Preconditions:** Robot is powered on, within 3 meters, and advertising BLE after the user pressed BOOT/setup; user has passed UC-PR01 (parent gate); phone Bluetooth permission and radio are available.
- **Main Flow:**
  1. `PairSearchScreen` verifies the phone is online and initializes BLE.
  2. App scans for allowlisted Robot BLE advertisements and resolves each candidate to a serial, retrying the scan window before timing out so a Robot that starts advertising late after BOOT/setup can still be discovered.
  3. If one Robot is found, the app starts provisioning context and navigates to `dv_pair_found` with `bleDeviceId` preserved.
  4. If multiple Robots are found, the app shows a picker so the parent chooses the right Robot before provisioning context is created.
- **Postconditions:** Navigation lands on `dv_pair_found` with a discovered Robot identifier and BLE device id in flight.
- **Error Flow:**
  1. User taps "I don't see my Robot" → `<<extend>>` to UC-DP11 Pairing Failed Recovery.
  2. BLE unavailable, permission denied, or scan timeout → UC-DP11 Pairing Failed Recovery.
  3. Backend `/claim/available-devices` may report a claimable Robot, but without a BLE scan candidate the app must not enter UC-DP05 because it cannot deliver the claim bootstrap token.

## UC-DP05 — Identify Robot

- **Goal:** Parent confirms the discovered Robot is theirs (signal/battery preview) and starts the default physical-confirm claim.
- **Trigger:** Radio scan from UC-DP04 surfaces a candidate device; navigation arrives at `dv_pair_found`.
- **Preconditions:** UC-DP04 returned at least one candidate; navigation arrived at `dv_pair_found`.
- **Main Flow:**
  1. `PairFoundScreen` renders the candidate card (Robot id, "Ready to pair", signal/battery) using the discovered device context.
  2. Parent visually checks the Robot id matches their own, then taps "This is my Robot".
  3. App calls the physical-confirm claim flow (`/claim/request`), mints a claim bootstrap token, sends that token to the Robot over BluFi, then waits on claim status.
  4. Robot auto-confirms the pending claim after receiving the token from the phone; no parent-typed code is required on the default path.
  5. When claim status confirms ownership, navigation transitions to `dv_pair_rename` (UC-DP13) with the claimed device context.
- **Postconditions:** Robot is claimed to the authenticated user and the app continues to rename/complete setup; the parent did not type a code on the default path.
- **Alt Flow:**
  1. Parent taps "Search again" → re-runs UC-DP04.
  2. Physical-confirm claim fails or times out → the screen shows retry and exposes QR/code fallback (UC-DP06) without showing raw IP, URL, token, OTA, or WebSocket values.

## UC-DP06 — Confirm Pairing Code

- **Goal:** Parent uses QR/code fallback to prove physical possession only when discovery or physical-confirm claim fails.
- **Trigger:** Navigation arrived at `dv_pair_qr_scan` or `dv_pair_code` from the UC-DP05 fallback affordance.
- **Preconditions:** Robot is showing a QR payload or 6-character code on its face; UC-DP05 selected this Robot or the parent is recovering from a failed claim.
- **Main Flow:**
  1. `PairQrScanScreen` attempts to scan the Robot QR payload; parent can choose manual entry when camera scanning is unavailable.
  2. `PairCodeScreen` accepts a 6-character code and keeps the selected Robot context.
  3. Parent taps the primary CTA → navigation transitions to `dv_pair_wifi` (UC-DP07) per `UC_DP_CODE ..> UC_DP_WIFI`.
- **Postconditions:** Navigation lands on `dv_pair_wifi`; pairing-code-confirmed state is set in flight.
- **Error Flow:**
  1. Wrong or expired fallback code → standard validation edge case; form re-asks and keeps the selected Robot context.

## UC-DP07 — Pick Wi-Fi Network

- **Goal:** Parent picks the home Wi-Fi SSID Robot will join.
- **Trigger:** Navigation arrived at `dv_pair_wifi` from UC-DP06.
- **Preconditions:** UC-DP06 succeeded; phone has Wi-Fi visibility (prototype renders a static list, real wiring would scan SSIDs).
- **Main Flow:**
  1. `PairWifiPage` explains "Why Wi-Fi?" and lists nearby networks (`PairWifiScreen.jsx:6-29`).
  2. Parent taps an SSID row → navigation transitions to `dv_pair_wifi_pw` (UC-DP08) — `PairWifiScreen.jsx:21`.
- **Postconditions:** Navigation lands on `dv_pair_wifi_pw` with the selected SSID set in flight.

## UC-DP08 — Enter Wi-Fi Password

- **Goal:** Parent enters the Wi-Fi password so Robot can authenticate to the home network.
- **Trigger:** Navigation arrived at `dv_pair_wifi_pw` from UC-DP07.
- **Preconditions:** UC-DP07 selected an SSID.
- **Main Flow:**
  1. `PairWifiPasswordPage` shows the SSID title, masked password field, and a "Show password" toggle (`PairWifiPasswordScreen.jsx:9-23`).
  2. Parent enters the password (prototype renders dots only).
  3. Parent taps "Connect Robot" → navigation transitions to `dv_pair_connecting` (UC-DP09) — `PairWifiPasswordScreen.jsx:26`.
- **Postconditions:** Navigation lands on `dv_pair_connecting`; the SSID + password is in flight to be sent to Robot.

## UC-DP09 — Connect Robot to Wi-Fi

- **Goal:** App orchestrates Robot's join to the home Wi-Fi and the parent-account login.
- **Trigger:** Navigation arrived at `dv_pair_connecting` from UC-DP08.
- **Preconditions:** UC-DP08 collected an SSID + password; Robot is still in pairing mode.
- **Main Flow:**
  1. `PairConnectingScreen` mounts and sends the Wi-Fi credentials through the active transport without putting the password in navigation params, logs, analytics, or persistent storage.
  2. BLE handoff statuses such as `wifi_credentials_sent` and firmware `STA_CONN_SUCCESS` are provisional local signals only; the app continues polling backend device status/provisioning state.
  3. A new robot must have a backend provisioning/claim attempt before the app sends Wi-Fi credentials. If `/devices/provision/start` cannot create that context, the flow fails closed and routes to UC-DP11; it never falls back to a synthetic offline credential-only path.
  4. The app waits for cloud-authoritative completion (`device_authenticated` / claim-confirmed state and device online status) before the final success screen. Credential-only BluFi is reserved for reconnecting an already-owned device.
- **Postconditions:** Navigation lands on `dv_pair_success` only after backend confirmation proves Robot is online and bound to the account.
- **Error Flow:**
  1. Any sub-stage failure or missing backend confirmation → UC-DP11 Pairing Failed Recovery with the specific failed sub-stage preserved for diagnosis.

## UC-DP10 — Pairing Success

- **Goal:** Confirm to Parent that Robot is paired, online, and the starter course is loaded.
- **Trigger:** UC-DP09 connect-orchestration finished successfully after backend confirmation; navigation arrived at `dv_pair_success`.
- **Preconditions:** UC-DP09 confirmed Robot is online and account-bound through backend-authoritative state.
- **Main Flow:**
  1. `PairSuccessPage` shows the celebrating Robot + 3 reassurance rows (Robot listens & speaks / starter course is loaded / audio is not saved) — `PairSuccessScreen.jsx:11-30`.
  2. Parent taps the primary CTA → navigation transitions to `dv_pair_rename` (UC-DP13) per `UC_DP_OK ..> UC_DP_RENAME`.
- **Postconditions:** Navigation lands on `dv_pair_rename`; pairing handshake is complete.

## UC-DP11 — Pairing Failed Recovery

- **Goal:** Surface diagnosable failure modes and route Parent back to the right sub-step to retry.
- **Trigger:** Any pairing sub-step failed (UC-DP04 timeout, UC-DP09 sub-stage error) or Parent tapped "I don't see my Robot" in UC-DP04.
- **Preconditions:** Pairing flow was in progress.
- **Main Flow:**
  1. `PairFailedPage` shows 4 likely-cause cards (asleep / wrong Wi-Fi pw / too far / low battery), each routing back to the appropriate sub-step (`PairFailedScreen.jsx:21-30`).
  2. Parent taps the card matching their situation → navigation transitions back to that sub-step (`dv_pair_intro`, `dv_pair_wifi_pw`, `dv_pair_search`, etc.).
- **Postconditions:** Navigation lands on the chosen recovery sub-step; pairing in-flight state is preserved where possible.

## UC-DP12 — Pair Offline Mode

- **Goal:** Help Parent reconnect a previously-paired Robot that has gone offline (Wi-Fi changed, password rotated, plug pulled).
- **Trigger:** Parent tapped "My Robot is offline" in UC-DP02; navigation arrived at `dv_pair_offline`.
- **Preconditions:** Robot was previously paired; Parent passed UC-PR01.
- **Main Flow:**
  1. `PairOfflinePage` shows last-seen banner and 3 diagnose-yourself rows (`PairOfflineScreen.jsx:9-29`).
  2. Parent picks a remediation row (e.g., "Update Wi-Fi" → `dv_pair_wifi`) or taps "Reconnect now" → re-enters UC-DP04 — `PairOfflineScreen.jsx:31`.
- **Postconditions:** Navigation lands on the chosen recovery step; Robot binding is preserved (no re-pairing required).

## UC-DP13 — Rename Robot & Pick Buddy

- **Goal:** Parent picks the avatar (buddy) the child will see on Robot's face. The prototype intentionally does not capture the child's name.
- **Trigger:** Navigation arrived at `dv_pair_rename` from UC-DP10 (Pairing Success).
- **Preconditions:** UC-DP10 completed.
- **Main Flow:**
  1. `PairRenamePage` explains the privacy stance ("we don't ask for your child's name or photo") and shows an 8-buddy grid (`PairRenameScreen.jsx:14-30`).
  2. Parent taps a buddy → selection is highlighted (`PairRenameScreen.jsx:21-29`).
  3. Parent taps the primary CTA → navigation transitions to `dv_pair_first` (UC-DP14) per `UC_DP_RENAME ..> UC_DP_FIRST`.
- **Postconditions:** Navigation lands on `dv_pair_first`; selected buddy is in flight to be persisted to Robot's display profile.

## UC-DP14 — Pairing First Lesson

- **Goal:** Hand off Robot to the child for the very first lesson; Parent reads the "place Robot on the table, hand it over" coaching strip.
- **Trigger:** Navigation arrived at `dv_pair_first` from UC-DP13.
- **Preconditions:** UC-DP13 completed; Robot is paired, on Wi-Fi, with a chosen buddy.
- **Main Flow:**
  1. `PairFirstLessonPage` mounts and shows a parent-coaching strip + the friendly Robot illustration (`PairFirstLessonScreen.jsx:13-25`).
  2. Page renders the "what happens next" preview (`PairFirstLessonScreen.jsx:31-`).
  3. Parent physically places Robot on the table and taps "Done" / hands the device to the child → exits the device-pairing domain (see cross-domain-edges.json: UC-DP14→UC-L01).
- **Postconditions:** Pairing flow is fully complete; subsequent navigation is owned by lesson-session (UC-L01) or kid-hub (UC-H01) per the puml `[exit] → kid-hub or course-library` note.
