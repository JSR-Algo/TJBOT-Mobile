# Step 2 · P0 — Child-facing voice path (PR)

**Bucket:** lesson player. The product's core surface — without VN here
the app is unusable for the target audience.

**Screens (14):** Lesson Ready · Connecting · Greet · Listen · Speak ·
Listening · Thinking · Success · Soft Retry · Silence · Off-topic ·
Activity Done · Lesson Done · Exit Confirm · Mic Missing (child) ·
Safety Pause.

## Keys added (20)

All persona-tagged child (con / mình + sentence-final particles
nhé/nha/nào). Audit row → applied:

| EN | VI | Persona note |
|---|---|---|
| Wear headphones if you can | Đeo tai nghe nếu được con nhé | "con" addresses the child |
| Hi friend! 👋 Ready to play with words? | Chào con! 👋 Sẵn sàng chơi với từ chưa? | warmer than "Xin chào!" |
| Yes, let's go! | Đi thôi nào! | particle "nào" — kid energy |
| Listen 👂 | Nghe nào 👂 | particle for kid tone |
| Your turn! | Đến lượt con! | "con" addressing child |
| Tap when done | Xong thì bấm vào nhé | "nhé" softens the imperative |
| Nice speaking! | Nói hay lắm! | natural praise; not a literal "speaking" |
| Let's try that together. | Cùng thử lại nha. | "nha" warmer than "nhé" for ages 4–7 |
| Hear it again | Nghe lại nào | particle |
| I heard you trying. One more time? | Mình nghe con đang cố nè. Thử thêm lần nữa nha? | "nè" colloquial; recognizes effort |
| Hmm, I didn't hear that clearly. Let's try again. | Hmm, mình chưa nghe rõ. Cùng thử lại nha. | Robot owns the miss ("mình chưa nghe") not the child |
| Speak a little louder | Nói to hơn một chút nhé | gentle |
| Oh fun! 🐱 Let's stay with the cat for now. | Vui ghê! 🐱 Mình tập trung vào con mèo trước nha. | redirect without scolding |
| Back to the cat | Về với con mèo nào | playful |
| Activity done! | Xong hoạt động rồi! | celebratory |
| Back home | Về Trang chủ | matches Home label |
| Wait with Robot | Ở lại với Robot | exit-confirm "stay" branch |
| I can't hear my microphone. Let's check it together. | Mình chưa nghe được micro. Cùng kiểm tra nha. | Robot owns the failure |
| Let's pause for a moment. A grown-up can help if you need. | Mình tạm dừng một chút nhé. Có gì con gọi người lớn giúp nha. | safety: gentle, offers parent |
| Get a grown-up | Gọi người lớn giúp nha | not punitive; particle softens |

## Files touched

- `locales/en.json` (+20 keys, +1 section header)
- `locales/vi.json` (+20 keys, +1 section header)

No JSX changes — the runtime DOM walker (`i18n.js`) does exact-match
substitution, so adding catalog entries is sufficient. (In a production
RN repo this would be `t()` calls; not applicable here.)

## DoD status after P0

| Item | Status | Note |
|---|---|---|
| 1. Zero hardcoded | 🟡 partial | P0 complete; ~295 backlog across P1–P5. |
| 2. Key delta = 0 | 🟢 | 220 ↔ 220. `node scripts/i18n/check-key-parity.mjs` exits 0. |
| 3. Pseudo-locale leaks | 🟡 needs run | Generator covers new keys automatically. |
| 4. Live switch | 🟢 | Existing walker; no regression. |
| 5. Persistence | 🟢 | Existing. |
| 6. Fallback | 🟢 | Walker falls back to EN node when key missing. |
| 7. Layout +35% | 🟡 needs run | Two layout-risk areas pre-flagged: `SpeechBubble` (max-width 280px) and `PrimaryCTA` (single-line). Longest new VN string is "Mình tạm dừng một chút nhé. Có gì con gọi người lớn giúp nha." at 64 chars — fits SpeechBubble width but at 3 lines instead of 2. **Action item carried to Step 3:** raise SpeechBubble max-width from 280→320 px under VN, allow 3-line bubbles. |
| 8. ICU plural | 🔴 | No count-bearing strings in P0. |
| 9. Locale formatting | 🔴 | None in P0. |
| 11. Audit clunky strings | 🟢 | All P0 audit rows resolved. |
| 12. Layout risks | 🟡 | Two risks identified, fix queued. |
| 13. Persona tone | 🟢 | All 20 strings child-tagged with rationale (table above). |

## Spot-check sample (10 of 20)

Reviewer: I am the agent; this needs a native-speaker pass before
production. Each line has my rationale; flag any that read robotic to
a Vietnamese ear.

1. "Đi thôi nào!" — natural, energetic; matches kid speech.
2. "Đến lượt con!" — direct, warm; "con" not "bạn" because Robot is the
   adult voice.
3. "Mình nghe con đang cố nè." — colloquial "nè" recognizes effort
   without making the child the failure point.
4. "Cùng thử lại nha." — "nha" warmer than "nhé"; appropriate for 4–7.
5. "Mình chưa nghe rõ." — "chưa" (not yet) > "không" (not at all);
   keeps growth-mindset framing.
6. "Vui ghê! 🐱" — "ghê" colloquial intensifier; child-natural.
7. "Mình tập trung vào con mèo trước nha." — gentle redirect with
   "trước" (for now) so it doesn't feel like rejection.
8. "Xong hoạt động rồi!" — celebratory closure word "rồi".
9. "Mình chưa nghe được micro." — Robot owns the issue, not "your
   microphone is broken"; protects child agency.
10. "Có gì con gọi người lớn giúp nha." — "có gì" (if anything) softens
    so the child doesn't feel forced; particle "nha" closes warmly.

## Open items carried to next bucket

- SpeechBubble width tweak (Step 3 cross-cutting layout pass).
- Native-speaker review of the 20 lines above.
- Pseudo-locale and length-stress sweeps will run as part of Step 4
  full verification (avoid per-bucket sweep churn at 95% context).

## Next: P1 — Onboarding + Home (~13 screens, ~60 strings)

Awaiting **"go"**.
