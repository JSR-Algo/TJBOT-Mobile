# Use Cases — `course-library`

> **Owning lane:** Lane D. **UC count:** 12. UC-CL03 authored by Lane Z (Phase 0.5 dry-run sample). Other 11 bodies filled by Lane D (Phase 1).
>
> Each H2 below corresponds to one UC ID from `reference/use-case-index.json`. Cross-domain edges: see `reference/cross-domain-edges.json`. Backend mapping: see `backend-mapping.md`. Edge cases: see `edge-cases.md`.

---

## UC-CL01 — Browse Library

- **Goal:** Parent browses all available courses (installed, in catalog, locked) and picks one to inspect.
- **Trigger:** Navigation arrives at `cl_library` (`CourseLibraryPage`); typically reached from device-home, rotjtjbot-mgmt storage, or parent settings.
- **Preconditions:** Parent passed UC-PR01 (`[requires] parent-gate : UC_PG_PASS` per `course-library.usecase.puml:46-49`); a Rotjtjbot is paired (`[requires] device-pairing`).
- **Main Flow:**
  1. `CourseLibraryPage` mounts and renders `DvShell title="Course Library"` (`CourseLibraryScreen.jsx:15`).
  2. Page renders sectioned course tiles ("On your Rotjtjbot now" / catalog / etc.) — `CourseLibraryScreen.jsx:9-12`.
  3. Parent taps a course card → navigation transitions to `cl_detail` (UC-CL02) — `CourseLibraryScreen.jsx:24`.
- **Postconditions:** Navigation lands on `cl_detail` for the chosen course.

## UC-CL02 — View Course Detail

- **Goal:** Parent reads detail (LCD preview, lesson + week count, what's inside) before committing to add or unlock.
- **Trigger:** Parent tapped a course card in UC-CL01.
- **Preconditions:** UC-CL01 selected a course.
- **Main Flow:**
  1. `CourseDetailPage` mounts and renders `DvShell title="Course details"` (`CourseDetailScreen.jsx:13`).
  2. Page renders the LCD preview, course summary, and lesson breakdown.
  3. Parent taps "Add to Rotjtjbot" → navigation transitions to `cl_buy` (UC-CL03) — `CourseDetailScreen.jsx:70`.
- **Postconditions:** Parent has decided to add (transitions to UC-CL03) or to go back.
- **Alt Flow:**
  1. Parent taps "Back to library" → returns to `cl_library` (`CourseDetailScreen.jsx:71`).

## UC-CL03 — Buy / Unlock Course

- **Goal:** Parent purchases or subscription-unlocks a course so it can be sent to Rotjtjbot.
- **Trigger:** Parent taps "Add to Rotjtjbot" on `CourseDetailPage` and lands on `BuyCoursePage` (`BuyCourseScreen.jsx`).
- **Preconditions:** Parent has passed UC-PR01 (gate is `[requires]` for course-library entry per `course-library.usecase.puml`); a paired Rotjtjbot exists (UC-DP10 or earlier prereq); the selected course is not already unlocked.
- **Main Flow:**
  1. Parent sees course summary tile (LCD preview, lesson + week count) — `BuyCourseScreen.jsx:23-32`.
  2. Parent picks a plan: "All Courses" (subscription, $8.99/mo) or "Just this course" ($24 one-time) — `BuyCourseScreen.jsx:38-62`.
  3. Parent taps "Confirm & continue" — navigation transitions to `cl_unlock_confirm`.
  4. UC-CL04 (Confirm Unlock with Numeric Code) runs as an `<<include>>` step (4-digit speed-bump via `UnlockConfirmModal`).
  5. On confirm, UC-CL05 (Course Added to Rotjtjbot) runs.
- **Postconditions:** Course is unlocked (client-side state — see KD11); navigation lands on `cl_added`.
- **Alt Flow:**
  1. Parent taps "Not now" → returns to `cl_detail` without unlock.
- **Error Flow:**
  1. Insufficient access → `<<extend>>` to UC-CL12 View Locked Course.
  2. Payment failure → standard payment error edge case (see purchase domain UC-BU07/08/09 for the actual payment provider flow).

## UC-CL04 — Confirm Unlock with Numeric Code

- **Goal:** Parent passes a 4-digit speed-bump (typing the number on screen) so kids cannot add courses by accident. Shared service with parent-gate (alias `UC_PG_UNLOCK`).
- **Trigger:** UC-CL03 reached the "Confirm & continue" step; modal `UnlockConfirmModal` opens.
- **Preconditions:** UC-CL03 selected a plan; the modal target code is shown on screen (prototype: `7351` — `UnlockConfirmModal.jsx:8`).
- **Main Flow:**
  1. `UnlockConfirmModalPage` renders `DvShell title="Quick parent check"` and shows the displayed code (`UnlockConfirmModal.jsx:11-25`).
  2. Parent taps the 4 digits in order on the mini keypad; entered values appear in the slot row (`UnlockConfirmModal.jsx:27-39`).
  3. When all 4 are entered correctly (`vals.join('') === target.join('')` — `UnlockConfirmModal.jsx:10`), the slots turn green; primary CTA enables and Parent taps confirm → navigation transitions to `cl_added` (UC-CL05).
- **Postconditions:** Course is unlocked client-side (KD11 — server-side enforcement deferred); navigation lands on `cl_added`.
- **Alt Flow:**
  1. Parent taps back → returns to `cl_buy` (UC-CL03) without unlock — `UnlockConfirmModal.jsx:11`.
- **Error Flow:**
  1. Wrong code → slots stay red; CTA stays disabled. Parent retries (no lock-out in prototype — KD11).

## UC-CL05 — Course Added to Rotjtjbot

- **Goal:** Confirm to Parent that the course is now bound to Rotjtjbot and offer the immediate "send today's lesson" handoff.
- **Trigger:** UC-CL04 confirm succeeded; navigation arrived at `cl_added` (`CourseAddedPage`).
- **Preconditions:** UC-CL04 confirmed.
- **Main Flow:**
  1. `CourseAddedPage` renders `DvShell title="Added to Rotjtjbot"` (`CourseAddedScreen.jsx:14`).
  2. Page shows celebrating Rotjtjbot + LCD preview tile + "what's loaded" summary.
  3. Parent taps "Send today's lesson now" → navigation transitions to `cl_send` (UC-CL06) — `CourseAddedScreen.jsx:47`.
- **Postconditions:** Course is bound and ready; navigation lands on the send-lesson surface.
- **Alt Flow:**
  1. Parent taps "Back to Rotjtjbot home" → returns to `dv_home` (`CourseAddedScreen.jsx:48`).

## UC-CL06 — Send Lesson to Rotjtjbot

- **Goal:** Parent picks today's lesson from the bound course and pushes it to Rotjtjbot.
- **Trigger:** Parent taps "Send today's lesson now" on UC-CL05, or navigates to `cl_send` from device home.
- **Preconditions:** A course is bound to Rotjtjbot (UC-CL05 completed at some point); Rotjtjbot is online.
- **Main Flow:**
  1. `SendToRotjtjbotPage` renders `DvShell title="Today's lesson"` (`SendToRotjtjbotScreen.jsx:17`) and shows lesson picker rows (`SendToRotjtjbotScreen.jsx:11`).
  2. Parent picks a lesson (state-only `pick` index — `SendToRotjtjbotScreen.jsx:11`).
  3. Parent taps "Send to Rotjtjbot" → app pushes lesson via `course-library.api.js → sendCourseToRotjtjbot` (cross-domain delegate to Rotjtjbot — see cross-domain-edges.json: UC-CL06→ACTOR:Rotjtjbot); navigation transitions to `cl_rotjtjbot_ready` (UC-CL07) — `SendToRotjbotScreen.jsx:54`.
- **Postconditions:** Lesson is queued on Rotjbot; navigation lands on `cl_rotjbot_ready`.

## UC-CL07 — Confirm Rotjbot Ready

- **Goal:** Confirm to Parent the lesson is on Rotjbot and prompt the hand-off to the child.
- **Trigger:** UC-CL06 send completed; navigation arrived at `cl_rotjbot_ready` (`RotjbotReadyPage`).
- **Preconditions:** UC-CL06 succeeded.
- **Main Flow:**
  1. `RotjbotReadyPage` renders `DvShell title="Rotjbot is ready"` (`RotjbotReadyScreen.jsx:11`) with the celebrating Rotjbot.
  2. Parent taps "Hand it to your child" → navigation transitions to `cl_running` (UC-CL08) — `RotjbotReadyScreen.jsx:50`.
- **Postconditions:** Parent handed Rotjbot to the child; navigation lands on the running-lesson surface.
- **Alt Flow:**
  1. Parent taps "Pick a different lesson" → returns to `cl_send` (UC-CL06) — `RotjbotReadyScreen.jsx:51`.

## UC-CL08 — Monitor Lesson Running on Rotjbot

- **Goal:** Parent has a passive surface acknowledging the lesson is now running on Rotjbot, with a path to a live monitor.
- **Trigger:** Parent tapped "Hand it to your child" on UC-CL07; navigation arrived at `cl_running` (`RunningPage`).
- **Preconditions:** UC-CL07 completed; child is interacting with Rotjbot.
- **Main Flow:**
  1. `RunningPage` renders `DvShell title="Lesson is on Rotjbot"` (`RunningScreen.jsx:10`).
  2. Page shows status messaging + Rotjbot illustration.
  3. Parent taps "See what's happening" → navigation transitions to `cl_companion` (UC-CL09) — `RunningScreen.jsx:40`.
- **Postconditions:** Parent has acknowledged the lesson is running; may have transitioned to companion view.
- **Alt Flow:**
  1. Parent taps "Done for now" → returns to `dv_home` (`RunningScreen.jsx:41`).

## UC-CL09 — View Companion

- **Goal:** Parent sees a real-time mirror of what Rotjbot is doing in the lesson (LCD state, current word/phrase) without disturbing the child.
- **Trigger:** Parent tapped "See what's happening" on UC-CL08; navigation arrived at `cl_companion` (`CompanionPage`).
- **Preconditions:** UC-CL08 in progress.
- **Main Flow:**
  1. `CompanionPage` renders `DvShell title="What Rotjbot sees"` (`CompanionScreen.jsx:24`).
  2. Page cycles through `phases` (state-only loop — `CompanionScreen.jsx:11-`) showing the lesson turn states.
  3. Parent watches; may tap back to return to `cl_running` (UC-CL08).
- **Postconditions:** Parent has a live view; on lesson end (real wiring) navigates to UC-CL10.

## UC-CL10 — View Lesson Complete

- **Goal:** Parent sees the lesson-complete summary with what the child practiced and the path to plan tomorrow.
- **Trigger:** Lesson on Rotjbot ended; navigation arrives at `cl_complete` (`CourseCompletePage`).
- **Preconditions:** UC-CL08/CL09 lesson completed.
- **Main Flow:**
  1. `CourseCompletePage` renders `DvShell title="Today's lesson"` (`CourseCompleteScreen.jsx:11`).
  2. Page renders the celebration hero + word-list + minutes practiced.
  3. Parent taps "Plan tomorrow's lesson" → navigation transitions to `cl_send` (UC-CL06) — `CourseCompleteScreen.jsx:64`.
- **Postconditions:** Parent has reviewed today's outcome.
- **Alt Flow:**
  1. Parent taps "Done" → returns to `dv_home` (`CourseCompleteScreen.jsx:65`).

## UC-CL11 — Resync Rotjbot

- **Goal:** Parent resyncs Rotjbot when content state has drifted (Wi-Fi changed, course not delivered, etc.).
- **Trigger:** App detects a sync gap; navigation arrives at `cl_needs_sync` (`NeedsSyncPage`) — typically from UC-CL05/CL06 happy-path branching.
- **Preconditions:** A course is bound to Rotjbot but Rotjbot has not received the latest update.
- **Main Flow:**
  1. `NeedsSyncPage` renders `DvShell title="Rotjbot needs to catch up"` (`NeedsSyncScreen.jsx:13`).
  2. Page lists remediation options (Wi-Fi update — `NeedsSyncScreen.jsx:53`, etc.).
  3. Parent taps "Reconnect Rotjbot now" → app re-attempts sync via `course-library.api.js → getRotjbotSyncStatus`/`sendCourseToRotjbot` (cross-domain delegate to Rotjbot — see cross-domain-edges.json: UC-CL11→ACTOR:Rotjbot); navigation transitions to `cl_added` (UC-CL05) — `NeedsSyncScreen.jsx:63`.
- **Postconditions:** Sync re-attempt is in flight; navigation returns to the bound-course confirmation surface.
- **Alt Flow:**
  1. Parent taps "I'll do it later" → returns to `dv_home` (`NeedsSyncScreen.jsx:64`).

## UC-CL12 — View Locked Course

- **Goal:** Parent sees a locked course with the path to unlock it (typically because a subscription tier or one-time purchase is missing).
- **Trigger:** Parent tapped a locked course tile in UC-CL01, or routed via the `<<extend>> insufficient access` path from UC-CL03.
- **Preconditions:** Parent passed UC-PR01; the selected course is not in the parent's entitlement set.
- **Main Flow:**
  1. `CourseLockedPage` renders `DvShell title="Locked for now"` (`CourseLockedScreen.jsx:14`).
  2. Page shows the locked-course preview + "what's locked" rationale.
  3. Parent taps "Unlock anyway" → navigation transitions to `cl_unlock_confirm` (UC-CL04) — `CourseLockedScreen.jsx:53`.
- **Postconditions:** Parent has acknowledged the lock; may have entered the unlock flow.
- **Alt Flow:**
  1. Parent taps "Back to library" → returns to `cl_library` (UC-CL01) — `CourseLockedScreen.jsx:54`.
