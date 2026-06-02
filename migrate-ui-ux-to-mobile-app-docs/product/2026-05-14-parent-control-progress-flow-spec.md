# TBOT Mobile Parent Control + Progress Flow Spec

Date: 2026-05-14
System: sys-16 parent mobile application
Scope: Parent dashboard, safety/settings, progress summary, history/review
Screens: `ParentSummaryScreen`, `ParentTodayScreen`, `ParentHistoryScreen`, `ParentSafetyScreen`, `ParentSettingsScreen`, `TodayProgressScreen`, `LessonSummaryScreen`, `WordsPracticedScreen`, `ReviewNeededScreen`, `CelebrationScreen`. Legacy PIN screens may remain registered for backend compatibility but are not primary mobile entry points.

## Goal

Parents can control safety, see progress, and understand what happened without being overloaded by raw data. Parent surfaces behave like a control panel, not a game or diagnostic dashboard.

## Non-Goals

- No backend API contract changes.
- No BLE, firmware, or realtime protocol changes.
- No COPPA consent legal copy changes.
- No medical, clinical, or developmental diagnosis language.

## Parent Control IA

1. `ParentSummaryScreen` is the parent landing view with one current status, one progress summary, and clear routes to today, history, safety, and settings.
2. `ParentTodayScreen` explains today's activity in parent language: lesson topic, time, speaking turns, words practiced, and next review.
3. `ParentHistoryScreen` shows activity over time with filters for child, date range, and topic when the household has enough data.
4. `ParentSafetyScreen` explains privacy and safety in plain language and links to policy/support.
5. `ParentSettingsScreen` groups parent-editable controls by language, child profile, lesson limits, audio/feedback, privacy, subscription, and support.
6. Parent entry points open parent surfaces directly because this mobile app is parent-operated.

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
| Account changes | Parent Space only | Parent account required | Cannot be changed from child play area. |

## Parent Entry Behavior

- Home/profile parent entry opens `ParentSummaryScreen` directly.
- The Home settings icon opens `ParentSettingsScreen` directly.
- Parent detail screens do not redirect through `ParentGateScreen`.
- Backend parent PIN endpoints may remain available for compatibility, but mobile UX does not require parents to know or enter a PIN.

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
| Parent space title | Parent Space | Khu vực phụ huynh |
| Parent settings entry | Settings | Cài đặt |
| Parent summary | Mira practiced greetings and feelings for about 8 minutes. | Mira đã luyện chào hỏi và cảm xúc khoảng 8 phút. |
| Today detail | Today: 1 lesson, 8 minutes, 8 speaking turns. | Hôm nay: 1 bài học, 8 phút, 8 lượt nói. |
| Words practiced | Words practiced today | Từ đã luyện hôm nay |
| Review needed | Practice {count} words | Ôn lại {count} từ |
| No review | No review needed today | Hôm nay chưa cần ôn lại |
| No history | No practice in this range. | Không có buổi luyện tập trong khoảng thời gian này. |
| Offline summary | Showing last saved summary from {time}. | Đang hiển thị tóm tắt đã lưu lúc {time}. |
| Celebration | Lesson complete. Nice effort. | Bài học đã hoàn thành. Con đã rất cố gắng. |

## Acceptance Tests

1. Home/profile parent entry routes directly to `ParentSummaryScreen`.
2. Home settings entry routes directly to `ParentSettingsScreen`.
3. Parent detail screens do not redirect to `ParentGateScreen` when no parent PIN session exists.
4. Parent summary surfaces one current status, today's summary, review action, history, safety, and settings.
5. Parent history supports child, date range, and topic filtering when relevant.
6. Parent history empty state says no practice exists for the selected range.
7. Offline parent/progress summaries show last cached update time.
8. Parent progress copy contains no diagnosis terms: delay, disorder, risk, therapy, assessment, abnormal.
9. Safety settings explain effect in parent language and do not expose filter, model, or backend internals.
10. Review needed primary CTA starts review practice; secondary CTA returns home.
11. Celebration copy is effort-based and does not require rewards, streaks, or stickers to continue.

## Current Implementation Review Notes

- Mobile parent entry now bypasses `ParentGateScreen`; backend PIN routes are compatibility-only unless a future child-operated mode reintroduces them.
- `ParentHistoryScreen` currently shows a 30-day list but lacks child/date/topic filters.
- `ParentSafetyScreen` uses plain language and avoids technical filter details.
- `TodayProgressScreen`, `ReviewNeededScreen`, and `CelebrationScreen` are functional, but parent-facing surfaces should avoid letting stars, streaks, or stickers dominate decision-making.

## Self-Review

- Placeholder scan: no placeholder requirements remain.
- Consistency check: IA, copy, and acceptance tests align with sys-16 parent control-panel principle.
- Scope check: focused on parent and progress flow only; no backend, BLE, legal, or payment scope included.
- Ambiguity check: gate, lockout, history filters, copy constraints, and testable outcomes are explicit.
