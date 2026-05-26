# TBOT Mobile Parent Control + Progress Flow Spec

Date: 2026-05-14
System: sys-16 parent mobile application
Scope: Parent gate, parent dashboard, safety/settings, progress summary, history/review
Screens: `ParentGateScreen`, `ParentSummaryScreen`, `ParentTodayScreen`, `ParentHistoryScreen`, `ParentSafetyScreen`, `ParentSettingsScreen`, `ParentLockedOutScreen`, `TodayProgressScreen`, `LessonSummaryScreen`, `WordsPracticedScreen`, `ReviewNeededScreen`, `CelebrationScreen`

## Goal

Parents can control safety, see progress, and understand what happened without being overloaded by raw data. Parent surfaces behave like a control panel, not a game or diagnostic dashboard.

## Non-Goals

- No backend API contract changes.
- No BLE, firmware, or realtime protocol changes.
- No COPPA consent legal copy changes.
- No medical, clinical, or developmental diagnosis language.

## Parent Control IA

1. `ParentGateScreen` protects parent-only controls with server-backed PIN verification.
2. `ParentSummaryScreen` is the parent landing view with one current status, one progress summary, and clear routes to today, history, safety, and settings.
3. `ParentTodayScreen` explains today's activity in parent language: lesson topic, time, speaking turns, words practiced, and next review.
4. `ParentHistoryScreen` shows activity over time with filters for child, date range, and topic when the household has enough data.
5. `ParentSafetyScreen` explains privacy and safety in plain language and links to policy/support.
6. `ParentSettingsScreen` groups parent-editable controls by language, child profile, lesson limits, audio/feedback, privacy, subscription, and support.
7. `ParentLockedOutScreen` explains cooldown, gives a parent-account unlock path, gives help, and returns safely to the play area.

## Progress Summary Hierarchy

Parent-facing summaries should use this order:

1. Safety/device status: ready, paused, offline, locked, or needs attention.
2. Today's learning summary: lesson topic, minutes, lessons, speaking turns.
3. Review action: due words with one direct action, or "No review needed today."
4. Trend: weekly or 30-day activity summarized in words plus simple counts.
5. Detail: practiced words, lesson metadata, retention/privacy note.

Child-facing progress screens may be warmer, but they must not drive parent decisions through streak pressure, prizes, or clinical-sounding scores.

## Safety Settings Matrix

| Area | Parent label | Default behavior | UX rule |
| --- | --- | --- | --- |
| Daily time | Daily lesson time | Standard limit | Show minutes and effect on lessons, not quota jargon. |
| Quiet hours | Quiet hours | Enabled when configured | Explain that voice lessons cannot start during quiet hours. |
| Microphone | Voice practice | On | Explain that voice practice pauses when off. |
| Sound effects | Sound effects | On | Child-facing feedback only; does not affect safety. |
| Haptics | Haptics | On | Local device feedback only. |
| Reminders | Practice reminder | Parent-selected time | Parent controls reminder timing. |
| Analytics | Anonymous usage analytics | Explicit opt-in | No child identity, audio, or transcript implication. |
| Data retention | Summary history | 30 days | State that lesson summaries are retained, not recordings. |
| Content safety | Safe lesson topics | Always on | Do not expose filter/model internals. |
| Account changes | Parent Space only | Always gated | Cannot be changed from child play area. |

## Gate Behavior

- PIN input accepts numeric characters only and caps at the configured PIN length.
- Valid PIN calls parent authentication and navigates to `ParentSummaryScreen`.
- Wrong PIN stays on `ParentGateScreen`, clears no server state, and shows: "Wrong PIN. Try again."
- Rate limit disables PIN entry and confirm action until retry time expires.
- Lockout routes to `ParentLockedOutScreen`.
- Back from the gate returns to `HomeHubScreen` or play area, never to protected parent detail screens.
- Parent-gated routes should not be reachable from child-facing entry points without a valid parent session.

## Locked-Out Behavior

`ParentLockedOutScreen` must show four things:

1. Cooldown: remaining time in plain language.
2. Parent recovery: "Unlock with parent account."
3. Help path: "Get help" or "Contact support."
4. Safe exit: "Back to play area."

The screen should avoid blame. It should say that the lock protects parent controls from child access.

## History And Review

History should support:

- Child filter when household has more than one child.
- Date filter: today, 7 days, 30 days, custom range when available.
- Topic filter: lesson topic or word group.
- Empty state: "No practice in this range."
- Offline state: show last cached update time.

Review needed should always give one clear primary action:

- "Practice {count} words" starts review practice.
- "Maybe later" returns to `HomeHubScreen`.
- If no review is due, the screen should not create urgency.

## Copy Rules

- Use parent language on parent screens: control, review, settings, privacy, summary.
- Use child language on child lesson screens: practice, try, effort, today.
- Avoid diagnosis language: delay, disorder, risk, therapy, assessment, abnormal.
- Avoid raw transcript language. Summaries describe lesson activity, not private conversation content.
- Avoid over-gamification in parent progress. Streaks and stickers can exist on child celebration screens only when secondary to effort.

## Copy EN + VI

| Context | EN | VI |
| --- | --- | --- |
| Parent gate title | Parent Space | Khu vực phụ huynh |
| Parent gate body | Enter your parent PIN to manage safety, settings, and progress. | Nhập mã PIN phụ huynh để quản lý an toàn, cài đặt và tiến độ. |
| Wrong PIN | Wrong PIN. Try again. | Sai mã PIN. Hãy thử lại. |
| Rate limit | Too many attempts. Try again in {seconds} seconds. | Thử quá nhiều lần. Hãy thử lại sau {seconds} giây. |
| Locked out title | Parent Space is locked | Khu vực phụ huynh đang bị khóa |
| Locked out body | This protects parent controls from child access. | Điều này giúp bảo vệ phần kiểm soát của phụ huynh. |
| Unlock action | Unlock with parent account | Mở khóa bằng tài khoản phụ huynh |
| Help action | Get help | Nhận trợ giúp |
| Safe exit | Back to play area | Quay lại khu vực học |
| Parent summary | Mira practiced greetings and feelings for about 8 minutes. | Mira đã luyện chào hỏi và cảm xúc khoảng 8 phút. |
| Today detail | Today: 1 lesson, 8 minutes, 8 speaking turns. | Hôm nay: 1 bài học, 8 phút, 8 lượt nói. |
| Words practiced | Words practiced today | Từ đã luyện hôm nay |
| Review needed | Practice {count} words | Ôn lại {count} từ |
| No review | No review needed today | Hôm nay chưa cần ôn lại |
| No history | No practice in this range. | Không có buổi luyện tập trong khoảng thời gian này. |
| Offline summary | Showing last saved summary from {time}. | Đang hiển thị tóm tắt đã lưu lúc {time}. |
| Celebration | Lesson complete. Nice effort. | Bài học đã hoàn thành. Con đã rất cố gắng. |

## Acceptance Tests

1. Valid parent PIN calls `authenticateParent({ pin })` and navigates to `ParentSummaryScreen`.
2. Wrong parent PIN stays on `ParentGateScreen` and does not navigate to `ParentSummaryScreen`.
3. Rate-limited parent gate disables PIN input and confirm action until retry time expires.
4. Locked parent gate routes to `ParentLockedOutScreen`.
5. Locked-out screen shows cooldown, account unlock, help, and back-to-play actions.
6. Back behavior from locked-out returns to `HomeHubScreen`, not protected parent detail.
7. Child/play entry points route to `ParentGateScreen`, not directly to `ParentSummaryScreen` or settings.
8. Parent summary surfaces one current status, today's summary, review action, history, safety, and settings.
9. Parent history supports child, date range, and topic filtering when relevant.
10. Parent history empty state says no practice exists for the selected range.
11. Offline parent/progress summaries show last cached update time.
12. Parent progress copy contains no diagnosis terms: delay, disorder, risk, therapy, assessment, abnormal.
13. Safety settings explain effect in parent language and do not expose filter, model, or backend internals.
14. Review needed primary CTA starts review practice; secondary CTA returns home.
15. Celebration copy is effort-based and does not require rewards, streaks, or stickers to continue.

## Current Implementation Review Notes

- `ParentGateScreen` already uses server-backed authentication and handles 401, 423, and 429 responses.
- `ParentLockedOutScreen` has account unlock and back-to-play paths, but should add visible cooldown and help path.
- `ParentHistoryScreen` currently shows a 30-day list but lacks child/date/topic filters.
- `ParentSafetyScreen` uses plain language and avoids technical filter details.
- `TodayProgressScreen`, `ReviewNeededScreen`, and `CelebrationScreen` are functional, but parent-facing surfaces should avoid letting stars, streaks, or stickers dominate decision-making.

## Self-Review

- Placeholder scan: no placeholder requirements remain.
- Consistency check: IA, copy, and acceptance tests align with sys-16 parent control-panel principle.
- Scope check: focused on parent and progress flow only; no backend, BLE, legal, or payment scope included.
- Ambiguity check: gate, lockout, history filters, copy constraints, and testable outcomes are explicit.
