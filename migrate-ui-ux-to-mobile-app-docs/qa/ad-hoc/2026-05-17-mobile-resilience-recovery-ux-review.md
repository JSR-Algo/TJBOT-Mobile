# Mobile Resilience Recovery UX Review

Date: 2026-05-17
Task: AD-HOC: adhoc-2026-05-17-resilience-recovery-ux-review
Scope: sys-16 mobile fallback/error/recovery screens

## Review Standard

Each recovery screen must answer:

- What happened?
- Is user data/progress safe?
- What should user do next?
- Where is retry?
- Where is help/contact support?
- Is there a safe back path?

Tone rules:

- Parent-facing: clear, calm, non-technical.
- Child-facing: very short, gentle, no pressure.
- No stack trace or raw technical errors.
- Avoid red unless danger or destructive safety issue.
- Offline state must say whether the app retries automatically or the user must act.

## Recovery Map

| Screen | Audience | What happened | Data/progress safe? | Next action | Retry | Help/support | Safe back path | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NetworkError | Child/parent mixed | Internet lost | Not explicit | Try again | Primary CTA | Missing | Back home | Needs data-safe line and auto/manual retry clarity |
| AudioRecovery | Parent | Mic permission off | Voice not stored; progress implied | Open device Settings | Auto-detect after permission change | Missing | Back to play area | Strongest screen; add support path |
| MicMissing | Child | App cannot hear | Missing | Get grown-up | Indirect via settings | Missing | Back home | Good child tone; red/orange reads too alarmed |
| VoiceFailed | Child/parent mixed | Voice session paused/interrupted | Explicit | Resume/start again | Primary CTA | Missing | Back home | Good; reduce red CTA and clarify auto-save |
| SafetyRedirect | Child | Learning pause for safety | Missing | Take break/get grown-up | Not applicable | Parent gate only | Take break | Good tone; missing parent support/escalation path |
| LessonResume | Child | Saved lesson found | Implied by checkpoint | Keep going | Primary CTA | Missing | Stop for now | Good; progress bar hardcoded 60% risk |
| AppError | Parent | App problem | Explicit | Retry or home | Optional reset CTA | Missing | Back home | No stack trace; two primary CTAs and red retry are UX blockers |
| ReconnectingOverlay | Child | App reconnecting | Missing | Wait or stop | Auto-retry implied by attempt count | Routes to FAQ only after max attempts | Stop and go home | Needs explicit auto-retry copy and no hidden failover |
| PairFailed | Parent | Pairing failed | No data loss not needed | Pick reason or retry | Secondary CTA | Missing | Back to intro | Good diagnostics; add "setup not changed" |
| PairOffline | Parent | Robot offline/unreachable | Pending pairing/settings safe not explicit | Reconnect | Primary CTA | Missing | Back to add | Blocker: technical copy leaks implementation |
| ParentLockedOut | Parent | Too many parent-gate attempts | Controls safe implied | Wait or unlock | Unlock with account | Missing | Back to play area | Good security rationale; red error only if action fails |
| CourseLocked | Parent | Course locked by readiness | No data loss not needed | Try prerequisite or unlock | Unlock anyway | Missing | Back library | Good; potential dark pattern if unlock bypass too prominent |
| NeedsSync | Parent | Robot offline; course pending | Explicit-ish | Reconnect now or later | Primary CTA | Missing | I'll do later | Good; needs "app will send automatically" stronger |
| DeviceLost | Parent | User cannot find Robot | No data loss not needed | Make chime | Toggle chime | Missing | Device back | Good; missing failure state if robot offline/chime unavailable |

## Copy Improvements

| Screen | Current issue | EN replacement | VI replacement |
| --- | --- | --- | --- |
| NetworkError | Does not say progress safe or auto/manual retry | "Connection paused. Your place is saved. Tap Try again, or go home and we will keep your lesson ready." | "Kết nối bị ngắt. Chỗ học của con đã được lưu. Nhấn Thử lại, hoặc về trang chính và bài học vẫn sẵn sàng." |
| AudioRecovery | Good but long footer | "Microphone access is off. The mic is used only during speaking practice. No recordings are saved. Open Settings, turn on Microphone, then return here." | "Quyền micro đang tắt. Micro chỉ dùng khi luyện nói. Không lưu bản ghi. Mở Cài đặt, bật Micro, rồi quay lại ứng dụng." |
| MicMissing | Child CTA "Get a grown-up" fine; color too urgent | "I cannot hear yet. Please ask a grown-up to turn on the microphone." | "Mình chưa nghe được. Nhờ người lớn bật micro nhé." |
| VoiceFailed | "Failed" route name ok internally; copy should avoid failure | "Voice paused. Your place is saved. You can keep going now." | "Giọng nói tạm dừng. Chỗ học đã được lưu. Con có thể học tiếp." |
| SafetyRedirect | Good child tone; add parent note outside child view | "Let's pause. A grown-up can help." | "Mình nghỉ một chút nhé. Người lớn có thể giúp con." |
| LessonResume | Good; needs data-safe statement | "Welcome back. We saved your place in {lesson}. Keep going?" | "Chào con quay lại. Bài {lesson} đã được lưu. Học tiếp nhé?" |
| AppError | "The app hit a problem" still app-centric | "Something did not load. Your account and progress are safe. Try again or go home." | "Có phần chưa tải được. Tài khoản và tiến độ vẫn an toàn. Thử lại hoặc về trang chính." |
| ReconnectingOverlay | Auto retry unclear | "Trying to reconnect. Attempt {attempt} of {maxAttempts}. You can wait, or stop and go home." | "Đang kết nối lại. Lần {attempt}/{maxAttempts}. Bạn có thể chờ, hoặc dừng và về trang chính." |
| PairFailed | Good; add no-change assurance | "Pairing did not finish. Your Wi-Fi and account were not changed. Choose what to check, or try again." | "Ghép nối chưa xong. Wi-Fi và tài khoản chưa bị thay đổi. Chọn mục cần kiểm tra hoặc thử lại." |
| PairOffline | Technical copy | "Robot is offline. We cannot check it right now. Plug it in, bring it near your phone, then tap Reconnect now." | "Robot đang ngoại tuyến. Ứng dụng chưa kiểm tra được lúc này. Cắm sạc, đưa Robot gần điện thoại, rồi nhấn Kết nối lại." |
| ParentLockedOut | Good, but support missing | "Parent Space is locked for a short time after several wrong attempts. Controls are still protected. Try later or unlock with your parent account." | "Khu vực phụ huynh tạm khóa sau nhiều lần nhập sai. Cài đặt vẫn được bảo vệ. Thử lại sau hoặc mở bằng tài khoản phụ huynh." |
| CourseLocked | Good but bypass risk | "This course is a little ahead. Start with {starterCourse}, or unlock it if a parent wants to choose now." | "Khóa học này nâng cao hơn một chút. Hãy bắt đầu với {starterCourse}, hoặc phụ huynh có thể mở ngay." |
| NeedsSync | Good; stronger auto-send | "Robot is offline. Your course is saved in the app and will send automatically when Robot is back on Wi-Fi." | "Robot đang ngoại tuyến. Khóa học đã được lưu trong ứng dụng và sẽ tự gửi khi Robot có Wi-Fi lại." |
| DeviceLost | Missing offline failure | "Robot can chime for 30 seconds when it is online. If it does not chime, check power and Wi-Fi." | "Robot có thể phát chuông 30 giây khi đang online. Nếu không nghe chuông, kiểm tra nguồn và Wi-Fi." |

## Missing States

1. Support/contact path is missing on all reviewed screens except indirect FAQ after reconnect exhaustion.
2. Offline auto-retry policy is not consistently visible. Reconnecting has attempts, but NetworkError/PairOffline/NeedsSync do not explain what happens next.
3. Data/progress safety is missing on NetworkError, MicMissing, SafetyRedirect, ReconnectingOverlay, PairFailed, PairOffline, ParentLockedOut, DeviceLost.
4. AppError has no error reference ID for support. It hides stack trace correctly but gives support no handle.
5. PairOffline contains implementation-facing copy: "device telemetry from the pairing contract" at `src/features/device/pairing/screens/PairOfflineScreen.tsx:27`.
6. DeviceLost has no failed-chime/offline branch, even though telemetry can report errors.
7. LessonResume progress fill appears hardcoded, so displayed progress can drift from checkpoint.
8. EN strings are hardcoded in screens; VI copy exists only as recommendations here unless i18n is added.

## UX Blockers

1. `PairOfflineScreen` leaks technical implementation language to parents.
2. Help/contact support is absent from the recovery decision tree.
3. `AppErrorScreen` presents two primary CTAs side by side and uses red for non-danger retry.
4. Several screens use coral/red accents for non-danger states: MicMissing, VoiceFailed, PairFailed, PairOffline, NeedsSync, DeviceLost.
5. Retry mechanics are sometimes implicit: Reconnecting auto-navigates after 2.4s, NetworkError sends user to overlay, NeedsSync says queued but CTA says reconnect now.
6. Accessibility risk: custom `TouchableOpacity` and custom CTA components need confirmed labels/roles across recovery screens.

## Test Cases

1. NetworkError renders data-safe copy, Try again navigates to ReconnectingOverlay with checkpoint, Back home returns HomeHub.
2. ReconnectingOverlay shows attempt count, auto-resumes checkpoint before max attempts, routes to HelpFaq after max attempts, Stop and go home works.
3. AudioRecovery opens device settings, has parent-readable privacy copy, has safe back to MicMissing and play area.
4. MicMissing child copy stays under two short lines and sends parent to AudioRecovery.
5. VoiceFailed with checkpoint routes to LessonResume; without checkpoint routes to ActivityIntro; both show progress-safe copy.
6. AppError never renders `error.message` or stack, reset button appears only when reset exists, Back home works.
7. PairFailed reason cards route to correct recovery steps; Try again returns PairSearch; no setup-changed implication.
8. PairOffline does not contain "telemetry", "contract", "schema", "BLE", or backend words; Reconnect now routes PairSearch.
9. ParentLockedOut failed unlock shows calm retry copy and never reveals auth/backend error text.
10. CourseLocked explains readiness lock, Back library works, Unlock anyway remains secondary unless parent-confirmed.
11. NeedsSync states queued course is saved and auto-sends on Wi-Fi; later path stays available.
12. DeviceLost toggles chime copy; offline telemetry shows check-power/Wi-Fi recovery, not raw error.
13. All reviewed screens expose one clear primary CTA, one safe back path, and one Help/Support affordance.
14. Dynamic type 200%: no CTA/card text overlaps fixed-position bottom CTAs.
15. VoiceOver/TalkBack: all retry, back, help, and support controls have labels and button roles.

## Recommended Fix Order

1. Replace `PairOfflineScreen` technical copy immediately.
2. Add shared support affordance pattern for recovery screens.
3. Normalize retry/offline copy and data-safe copy across all screens.
4. Demote non-danger red accents to purple/blue/neutral; reserve red for safety/destructive states.
5. Add targeted Jest tests for route actions and forbidden technical copy.
6. Add VI i18n keys for recovery copy when the repo's localization layer is ready.
