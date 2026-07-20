# Use Cases — `device-pairing`

> **Owning lane:** Lane D. **UC count:** 14. UC-DP04 authored by Lane Z (Phase 0.5 dry-run sample). Other 13 bodies filled by Lane D (Phase 1).
>
> Each H2 below corresponds to one UC ID from `reference/use-case-index.json`. Cross-domain edges: see `reference/cross-domain-edges.json`. Backend mapping: see `backend-mapping.md`. Edge cases: see `edge-cases.md`.

---

## UC-DP01 — View Device Overview

- **Goal:** Parent reads the marketing/onboarding overview that explains the two-device model (Rotjtjbot is the child's speaking buddy; phone is for the grown-up) before starting pairing.
- **Trigger:** Navigation arrives at `dv_overview` (`DeviceOverviewPage`).
- **Preconditions:** Parent has passed UC-PR01 (parent gate is `[requires]` for the device-* domain per `device-pairing.usecase.puml`).
- **Main Flow:**
  1. `DeviceOverviewPage` mounts and renders the headline "One product. Two devices." (`DeviceOverviewScreen.jsx:13-15`).
  2. Page lays out the Rotjtjbot + phone pair illustration and the responsibility chips (`DeviceOverviewScreen.jsx:18-`).
  3. Parent taps "Set up Rotjtjbot" → navigation transitions to `dv_pair_intro` (UC-DP03) per the `..>` edge `UC_DP_OVERVIEW ..> UC_DP_INTRO` in `device-pairing.usecase.puml:38`.
- **Postconditions:** Navigation lands on `dv_pair_intro`; no auth/state mutation.

## UC-DP02 — Add New Rotjtjbot

- **Goal:** Parent picks the right pairing path for their situation (new Rotjtjbot vs. existing Rotjtjbot that went offline).
- **Trigger:** Tap "Add a Rotjtjbot" on the device home or overview, landing on `dv_pair_add` (`PairAddPage`).
- **Preconditions:** Parent passed UC-PR01; device-pairing domain is reachable.
- **Main Flow:**
  1. `PairAddPage` shows the two-device explainer + two large action tiles (`PairAddScreen.jsx:7-37`).
  2. Parent taps "I have a new Rotjtjbot" → `dv_pair_intro` (UC-DP03) — `PairAddScreen.jsx:15`.
  3. UC-DP03 (Power-on Rotjtjbot Confirm) runs.
- **Postconditions:** Navigation lands on `dv_pair_intro` with the new-rotjtjbot intent.
- **Alt Flow:**
  1. Parent taps "My Rotjtjbot is offline" → `dv_pair_offline` (UC-DP12) — `PairAddScreen.jsx:25`.

## UC-DP03 — Power-on Rotjtjbot Confirm

- **Goal:** Parent confirms Rotjtjbot is powered on and within range before the app starts a radio scan.
- **Trigger:** Navigation arrives at `dv_pair_intro` from UC-DP02 (Add New Rotjtjbot) or UC-DP01 (Device Overview).
- **Preconditions:** Rotjtjbot hardware is on hand; Parent followed UC-DP02 path.
- **Main Flow:**
  1. `PairIntroPage` shows the Rotjtjbot illustration and a 3-step checklist (plug in / hold top button / place within 1–2 m) — `PairIntroScreen.jsx:9-30`.
  2. Parent presses-and-holds Rotjtjbot's top button until it chimes (off-app physical step).
  3. Parent taps the primary CTA → navigation transitions to `dv_pair_search` (UC-DP04) per `UC_DP_INTRO ..> UC_DP_SCAN`.
- **Postconditions:** Navigation lands on `dv_pair_search`; the radio scan starts.

## UC-DP04 — Scan for Rotjtjbot

- **Goal:** App discovers a nearby powered-on Rotjtjbot for pairing.
- **Trigger:** Navigation arrives at `dv_pair_search` from UC-DP03 (Power-on Rotjtjbot Confirm).
- **Preconditions:** Rotjtjbot is powered on and within 3 meters; user has passed UC-PR01 (parent gate); pairing radio is available on the device (transport — BLE, Wi-Fi probe, etc. — **NOT CONFIRMED IN SOURCE**, KD8).
- **Main Flow:**
  1. `PairSearchPage` mounts and starts a radio scan animation (`PairSearchScreen.jsx:8-14`).
  2. After ~2.4s the scan auto-advances to `dv_pair_found` (`PairSearchScreen.jsx:6` — prototype timer; real wiring would be discovery-event-driven).
  3. UC-DP05 (Identify Rotjtjbot) runs.
- **Postconditions:** Navigation lands on `dv_pair_found` with a discovered Rotjtjbot identifier in flight.
- **Error Flow:**
  1. User taps "I don't see my Rotjtjbot" → `<<extend>>` to UC-DP11 Pairing Failed Recovery (`PairSearchScreen.jsx:18`).
  2. Scan timeout (no device found) → UC-DP11 Pairing Failed Recovery.

## UC-DP05 — Identify Rotjtjbot

- **Goal:** Parent confirms the discovered Rotjtjbot is theirs (signal/battery preview) before committing to pair.
- **Trigger:** Radio scan from UC-DP04 surfaces a candidate device; navigation arrives at `dv_pair_found`.
- **Preconditions:** UC-DP04 returned at least one candidate; navigation arrived at `dv_pair_found`.
- **Main Flow:**
  1. `PairFoundPage` renders the candidate card (Rotjtjbot id, "Ready to pair", signal/battery) — `PairFoundScreen.jsx:11-23`.
  2. Parent visually checks the Rotjtjbot id matches their own (KD8 — id source is unconfirmed in source; prototype hardcodes "ROB-2A8F").
  3. Parent taps "This is my Rotjtjbot" → navigation transitions to `dv_pair_code` (UC-DP06) — `PairFoundScreen.jsx:30`.
- **Postconditions:** Navigation lands on `dv_pair_code` with the candidate Rotjtjbot selected.
- **Alt Flow:**
  1. Parent taps "Search again" → re-runs UC-DP04 — `PairFoundScreen.jsx:31`.

## UC-DP06 — Confirm Pairing Code

- **Goal:** Parent enters the 4-digit code shown on Rotjtjbot's LCD to prove physical possession (anti-theft / wrong-device safeguard).
- **Trigger:** Navigation arrived at `dv_pair_code` from UC-DP05.
- **Preconditions:** Rotjtjbot is showing a 4-digit code on its face; UC-DP05 selected this Rotjtjbot.
- **Main Flow:**
  1. `PairCodePage` shows the on-Rotjtjbot code preview and four digit input slots (`PairCodeScreen.jsx:7-30`).
  2. Parent reads the 4 digits off Rotjtjbot and types them (prototype prefills `4721`).
  3. Parent taps the primary CTA → navigation transitions to `dv_pair_wifi` (UC-DP07) per `UC_DP_CODE ..> UC_DP_WIFI`.
- **Postconditions:** Navigation lands on `dv_pair_wifi`; pairing-code-confirmed state is set in flight.
- **Error Flow:**
  1. Wrong code → standard validation edge case (form re-asks; no path declared in prototype).

## UC-DP07 — Pick Wi-Fi Network

- **Goal:** Parent picks the home Wi-Fi SSID Rotjtjbot will join.
- **Trigger:** Navigation arrived at `dv_pair_wifi` from UC-DP06.
- **Preconditions:** UC-DP06 succeeded; phone has Wi-Fi visibility (prototype renders a static list, real wiring would scan SSIDs).
- **Main Flow:**
  1. `PairWifiPage` explains "Why Wi-Fi?" and lists nearby networks (`PairWifiScreen.jsx:6-29`).
  2. Parent taps an SSID row → navigation transitions to `dv_pair_wifi_pw` (UC-DP08) — `PairWifiScreen.jsx:21`.
- **Postconditions:** Navigation lands on `dv_pair_wifi_pw` with the selected SSID set in flight.

## UC-DP08 — Enter Wi-Fi Password

- **Goal:** Parent enters the Wi-Fi password so Rotjtjbot can authenticate to the home network.
- **Trigger:** Navigation arrived at `dv_pair_wifi_pw` from UC-DP07.
- **Preconditions:** UC-DP07 selected an SSID.
- **Main Flow:**
  1. `PairWifiPasswordPage` shows the SSID title, masked password field, and a "Show password" toggle (`PairWifiPasswordScreen.jsx:9-23`).
  2. Parent enters the password (prototype renders dots only).
  3. Parent taps "Connect Rotjtjbot" → navigation transitions to `dv_pair_connecting` (UC-DP09) — `PairWifiPasswordScreen.jsx:26`.
- **Postconditions:** Navigation lands on `dv_pair_connecting`; the SSID + password is in flight to be sent to Rotjtjbot.

## UC-DP09 — Connect Rotjtjbot to Wi-Fi

- **Goal:** App orchestrates Rotjtjbot's join to the home Wi-Fi and the parent-account login.
- **Trigger:** Navigation arrived at `dv_pair_connecting` from UC-DP08.
- **Preconditions:** UC-DP08 collected an SSID + password; Rotjtjbot is still in pairing mode.
- **Main Flow:**
  1. `PairConnectingPage` mounts and steps through 4 sub-stages: send Wi-Fi to Rotjtjbot → connecting to SSID → logging in to account → loading starter lesson (`PairConnectingScreen.jsx:8-13`).
  2. Each sub-stage advances on a ~900 ms timer in the prototype; real wiring would await Rotjtjbot ack + Wi-Fi DHCP + account login OK (`device.api.js → setDeviceWifi`, plus an unbuilt account-bind call — KD8).
  3. Final step transitions to `dv_pair_success` (UC-DP10) on a ~1.1 s timer.
- **Postconditions:** Navigation lands on `dv_pair_success`; Rotjtjbot is on Wi-Fi and bound to the account.
- **Error Flow:**
  1. Any sub-stage failure → UC-DP11 Pairing Failed Recovery (recovery cards specifically address Wi-Fi password and battery / range — `PairFailedScreen.jsx:21-25`).

## UC-DP10 — Pairing Success

- **Goal:** Confirm to Parent that Rotjtjbot is paired, online, and the starter course is loaded.
- **Trigger:** UC-DP09 connect-orchestration finished successfully; navigation arrived at `dv_pair_success`.
- **Preconditions:** UC-DP09 completed all 4 sub-stages.
- **Main Flow:**
  1. `PairSuccessPage` shows the celebrating Rotjtjbot + 3 reassurance rows (Rotjtjbot listens & speaks / starter course is loaded / audio is not saved) — `PairSuccessScreen.jsx:11-30`.
  2. Parent taps the primary CTA → navigation transitions to `dv_pair_rename` (UC-DP13) per `UC_DP_OK ..> UC_DP_RENAME`.
- **Postconditions:** Navigation lands on `dv_pair_rename`; pairing handshake is complete.

## UC-DP11 — Pairing Failed Recovery

- **Goal:** Surface diagnosable failure modes and route Parent back to the right sub-step to retry.
- **Trigger:** Any pairing sub-step failed (UC-DP04 timeout, UC-DP09 sub-stage error) or Parent tapped "I don't see my Rotjtjbot" in UC-DP04.
- **Preconditions:** Pairing flow was in progress.
- **Main Flow:**
  1. `PairFailedPage` shows 4 likely-cause cards (asleep / wrong Wi-Fi pw / too far / low battery), each routing back to the appropriate sub-step (`PairFailedScreen.jsx:21-30`).
  2. Parent taps the card matching their situation → navigation transitions back to that sub-step (`dv_pair_intro`, `dv_pair_wifi_pw`, `dv_pair_search`, etc.).
- **Postconditions:** Navigation lands on the chosen recovery sub-step; pairing in-flight state is preserved where possible.

## UC-DP12 — Pair Offline Mode

- **Goal:** Help Parent reconnect a previously-paired Rotjtjbot that has gone offline (Wi-Fi changed, password rotated, plug pulled).
- **Trigger:** Parent tapped "My Rotjtjbot is offline" in UC-DP02; navigation arrived at `dv_pair_offline`.
- **Preconditions:** Rotjtjbot was previously paired; Parent passed UC-PR01.
- **Main Flow:**
  1. `PairOfflinePage` shows last-seen banner and 3 diagnose-yourself rows (`PairOfflineScreen.jsx:9-29`).
  2. Parent picks a remediation row (e.g., "Update Wi-Fi" → `dv_pair_wifi`) or taps "Reconnect now" → re-enters UC-DP04 — `PairOfflineScreen.jsx:31`.
- **Postconditions:** Navigation lands on the chosen recovery step; Rotjtjbot binding is preserved (no re-pairing required).

## UC-DP13 — Rename Rotjtjbot & Pick Buddy

- **Goal:** Parent picks the avatar (buddy) the child will see on Rotjtjbot's face. The prototype intentionally does not capture the child's name.
- **Trigger:** Navigation arrived at `dv_pair_rename` from UC-DP10 (Pairing Success).
- **Preconditions:** UC-DP10 completed.
- **Main Flow:**
  1. `PairRenamePage` explains the privacy stance ("we don't ask for your child's name or photo") and shows an 8-buddy grid (`PairRenameScreen.jsx:14-30`).
  2. Parent taps a buddy → selection is highlighted (`PairRenameScreen.jsx:21-29`).
  3. Parent taps the primary CTA → navigation transitions to `dv_pair_first` (UC-DP14) per `UC_DP_RENAME ..> UC_DP_FIRST`.
- **Postconditions:** Navigation lands on `dv_pair_first`; selected buddy is in flight to be persisted to Rotjtjbot's display profile.

## UC-DP14 — Pairing First Lesson

- **Goal:** Hand off Rotjtjbot to the child for the very first lesson; Parent reads the "place Rotjtjbot on the table, hand it over" coaching strip.
- **Trigger:** Navigation arrived at `dv_pair_first` from UC-DP13.
- **Preconditions:** UC-DP13 completed; Rotjtjbot is paired, on Wi-Fi, with a chosen buddy.
- **Main Flow:**
  1. `PairFirstLessonPage` mounts and shows a parent-coaching strip + the friendly Rotjtjbot illustration (`PairFirstLessonScreen.jsx:13-25`).
  2. Page renders the "what happens next" preview (`PairFirstLessonScreen.jsx:31-`).
  3. Parent physically places Rotjtjbot on the table and taps "Done" / hands the device to the child → exits the device-pairing domain (see cross-domain-edges.json: UC-DP14→UC-L01).
- **Postconditions:** Pairing flow is fully complete; subsequent navigation is owned by lesson-session (UC-L01) or kid-hub (UC-H01) per the puml `[exit] → kid-hub or course-library` note.
