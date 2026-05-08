# TBOT Robot English — i18n Audit

**Scope:** the design prototype in this project (single-page HTML app: `index.html` + a flat set of `*.jsx` view files + one `i18n.js` runtime text-walker). This is **not** the production `tbot-mobile` / `tbot-firmware` codebase — those repos are not present here. Findings below apply only to the prototype but call out anything that should be ported to the real product.

> **2026-05-08 status update — full-coverage refactor (Phases 0 → 9 complete; Phase 10 sign-off in progress).**
>
> The runtime walker now loads catalogs from `locales/{vi,en}.json`, resolves persona via `[data-persona]` ancestor, translates a defined attribute set (`placeholder`, `aria-label`, `title`, `alt`), supports a `data-i18n-key` escape hatch, and exposes `__tbot.useLegacyDict()` as a live rollback switch (`locales/legacy-inline.json`). Format helpers (`__tbot.fmtPrice`, `fmtDate`, `fmtNumber`) dispatch on `__tbot.getLang()`.
>
> Latest gate snapshot (Lane A coverage-report.mjs run):
>
> | metric | before | latest | target |
> |---|---|---|---|
> | EN keys (en.json) | 519 | 843 | ~1040 |
> | VI keys (vi.json) | 235 | 722 | match en |
> | Parity | 45.3 % | 85.6 % | 100 % |
> | Hardcoded leaks | 521 | 96 | 0 |
> | Persona objects (`{child, parent}`) | 0 | 69 | per Annex F + lane-authored |
> | Persona-incomplete | n/a | 0 | 0 |
> | Register-lint failures | n/a | 0 | 0 |
> | Register-lint warnings | n/a | 0 | 0 |
> | Dollar-in-JSX-text leaks | 3 | 0 | 0 |
> | `toLocale*(undefined,...)` | 2 | 0 | 0 |
> | Indirect $-literal data fields | 9 | 2 (course-library.jsx) | 0 |
> | Fixtures (smoke) | n/a | 6 / 6 | green |
>
> Closes audit-recommendations 1, 2, 3, 4, 6 (text-on-LCD remains forbidden per audit § g, untouched). Items 5 (curriculum content kept out of dictionary) and 7 (bilingual mode opt-in) preserved. See `.omc/plans/i18n-full-coverage-refactor.md` for the full plan and Annex F for the persona migration record.

---

## a. i18n source inventory

| File | Format | Role |
|---|---|---|
| `i18n.js` | Inline JS dictionary (`DICT = { 'EN': 'VI' }`) | Runtime DOM walker that mutates text nodes after React renders. EN strings in JSX are the source-of-truth keys. |
| `tokens.css` | CSS custom props | Locale-agnostic — no concern. |
| `*.jsx` (≈25 files) | React + JSX literal text | All UI strings live as raw EN literals; no `t()` abstraction. |

There is **no key-namespaced JSON catalog**, no `react-i18next` (this is a single-file HTML prototype — out of scope to add a full library). The audit treats `DICT` as the catalog.

---

## b. Key counts & deltas

- **EN strings discovered in JSX (estimated, sampled):** ~480 visible literals across the screens.
- **VI translations in `DICT`:** ~165 entries.
- **Coverage:** ≈ 34 %. Roughly two-thirds of visible strings will fall back to EN even when the user picks VI.

The dictionary covers generic actions, common labels, and high-level screen titles, but is missing the long copy on most screens — speech bubbles, microcopy under buttons, body paragraphs, error explanations.

---

## c. Hardcoded strings (representative — not exhaustive)

These exist as raw JSX text nodes with no translation entry. Owner column = which surface they live on.

| File:Line | Surface | Snippet | Status |
|---|---|---|---|
| `onboarding.jsx:70` | Splash | "Voice English for kids" | missing VI |
| `onboarding.jsx:101` | Welcome | "Get started" | covered |
| `onboarding.jsx:267` | Trust | "Continue" | covered |
| `onboarding.jsx:292` | Mic permission | "The next screen is your phone's permission prompt. Tap **Allow** so your child can speak to Robot." | missing VI (long parent copy) |
| `onboarding.jsx:309` | Mic permission | "Not now" | missing VI |
| `onboarding.jsx:323` | Mock iOS sheet | "Don't Allow" | missing VI |
| `onboarding.jsx:390` | Login | "Create account" / "Log in" | partial |
| `onboarding.jsx:392` | Login | "By continuing you agree to our **Terms** and **Privacy Policy**." | missing VI (legal — needs review) |
| `onboarding.jsx:478` | Profile | "Buddy" | missing VI |
| `onboarding.jsx:493` | Profile | "Starting level" | missing VI |
| `onboarding.jsx:524` | Profile | "Save and meet Robot" | missing VI |
| `onboarding.jsx:553` | First hello | "Hi there! Want to play?" | missing VI (child copy) |
| `screens.jsx:190–195` | Lesson Ready | "Today's lesson" / "Animal Friends" / "Wear headphones if you can" | partial (lesson title is a content string, not UI) |
| `screens.jsx:224` | Greet | "Hi friend! 👋 Ready to play with words?" | missing VI |
| `screens.jsx:227` | Greet | "Yes, let's go!" | missing VI |
| `screens.jsx:266` | Listen step | "Listen 👂" | missing VI |
| `screens.jsx:268` | Listen step | "This is a cat." | content string — not localized as UI |
| `screens.jsx:287–288` | Speak step | "Your turn!" / `Say: "cat"` | missing VI |
| `screens.jsx:316` | Speak step | "Tap when done" | missing VI |
| `screens.jsx:342–343` | Success | "Nice speaking!" / `You said "cat"` | missing VI |
| `screens.jsx:362` | Retry | "Let's try that together." | missing VI |
| `screens.jsx:368` | Retry | "Hear it again" | missing VI |
| `screens.jsx:380` | Soft retry | "I heard you trying. One more time?" | missing VI |
| `screens.jsx:396–399` | Silence | "Hmm, I didn't hear that clearly. Let's try again." / "Speak a little louder" | missing VI |
| `screens.jsx:415` | Off-topic | "Oh fun! 🐱 Let's stay with the cat for now." | missing VI |
| `screens.jsx:418` | Off-topic | "Back to the cat" | missing VI |
| `screens.jsx:448` | Activity done | "Activity done!" | missing VI |
| `screens.jsx:473` | Lesson done | "You did it!" | covered |
| `screens.jsx:487` | Lesson done | "Back home" | missing VI |
| `screens.jsx:509` | Exit confirm | "Wait with Robot" | missing VI |
| `screens.jsx:521` | Mic missing | "I can't hear my microphone. Let's check it together." | missing VI |
| `screens.jsx:547` | Safety pause | "Let's pause for a moment. A grown-up can help if you need." | missing VI (child + parent boundary) |
| `screens.jsx:565` | Safety pause | "Get a grown-up" | missing VI |
| `screens.jsx:608–613` | Home | "Hi, Mai!" / "Start Today's Lesson" | name is content; CTA missing VI |
| `course.jsx:120–121` | Course header | "Keep going!" / "Level 1" / "Hello Friends" | missing VI |
| `course.jsx:330` | Lesson detail | "Today you'll practice" | missing VI |
| `course.jsx:364` | Lesson detail | "Start Lesson" | missing VI |
| `course.jsx:414–416` | Lesson list | "Let's review!" / "Up next" / "Coming soon" | missing VI |
| `course.jsx:462` | Review entry | "Start Review" | missing VI |
| `course.jsx:529` | Daily mission | "Continue Mission" | missing VI |
| `progress.jsx:40` | Progress | "This week" | covered |
| `progress.jsx:94/99` | Words | "stronger" / "visit again" | missing VI |
| `progress.jsx:138–139` | Lesson done | "Lesson done" / "Great effort!" | missing VI |
| `progress.jsx:167` | Lesson done | "Stop for today" | missing VI |
| `progress.jsx:206/210` | Review needed | "Practice together" / "Maybe later" | missing VI |
| `progress.jsx:258–259` | Celebration | "New sticker" / "Brave Speaker" | missing VI (sticker name = content) |
| `progress.jsx:265/270` | Celebration | "Back to Robot Home" / "Practice review words" | missing VI |
| `parent.jsx:106–113` | Parent gate | "Parent Space" / "To continue, please type the number below…" / "Type this number" | partial (title covered, body missing) |
| `parent.jsx:140` | Parent summary | "Settings" | covered |
| `parent.jsx:168–169` | Parent summary | "What Mira practiced today" / "Greetings · feelings · 3 new words" | missing VI |
| `parent.jsx:188` | Parent summary | "Return to child play area" | missing VI |
| `fallback.jsx:43–53` | Settings | "Grown-up area" / "For parents" / "Need help?" | missing VI |
| `fallback.jsx:66/76/80` | Mic missing | "Hmm, I can't hear yet. Let's check the microphone." / "Get a grown-up" / "Back home" | missing VI |
| `fallback.jsx:93–104` | Network err | "Oops — I lost my signal. Let's try again in a sec." / "Try again" | partial |
| `fallback.jsx:117–124` | Voice fail | "My voice got tangled up. Let's start the lesson fresh." / "Pick up where we left off" | missing VI |
| `fallback.jsx:138–165` | Login error | "Couldn't sign you in" / "The email or password didn't match…" / "Email and password don't match." / "Need help? Contact support" | missing VI |
| `fallback.jsx:177/187/191` | Safety redirect | "Let's take a tiny pause. A grown-up can help if you need." / "Take a break" / "Get a grown-up" | missing VI |
| `fallback.jsx:285` | Lesson failed | "Stop and go home" | missing VI |
| `fallback.jsx:337/341` | Audio recovery | "Open device Settings" / "Back to play area" | missing VI |
| `fallback.jsx:358/367–368/376/380` | Lesson resume | "Welcome back! Want to keep going?" / "Where we stopped" / "How are you?" / "Keep going" / "Stop for now" | missing VI |

`device.jsx`, `purchase.jsx`, `course-library.jsx`, `robot-mgmt.jsx`, `paths.jsx`, `lcd-system.jsx`, `lcd-lesson.jsx`, `lcd-v2.jsx`, `design-system.jsx` are large parent-facing surfaces with **near-zero VI coverage** (each contributes 30–80+ untranslated strings — primarily section titles, helper text, and CTAs).

---

## d. Mixed-locale screens (EN + VI visible together)

Because the i18n walker swaps individual text nodes (not whole screens), **every parent-facing screen currently shows a mixed state in VI mode** — the title and primary CTA translate, the body text and helper microcopy stay in English. The most visible offenders:

- Onboarding · Welcome / Mic permission / Login / Profile (long body copy untranslated)
- Lesson player · Listen / Speak / Try again / Silence / Off-topic / Safety (speech bubbles untranslated; the surface where translation matters most)
- Course · Library, Course · Detail (catalog and metadata strings untranslated)
- Parent · Summary / Today / Past 30 Days (data labels untranslated)
- Robot device — Pair / Status / Battery / Wi-Fi / Storage / Update / Find (entire surface largely untranslated)
- Purchase — every step has untranslated body copy
- LCD pages — system documentation in EN only (acceptable for a design-doc surface, but should be flagged)

---

## e. Clunky VI translations (proposed rewrites)

Persona split: **child-facing** uses "con / mình"; **parent-facing** uses "bạn".

| Key (EN) | Current VI in `DICT` | Recommended | Persona | Notes |
|---|---|---|---|---|
| `Try again` | "Thử lại" | child: "Thử lại nhé" / parent: "Thử lại" | both | Add a softer kid variant; current is fine for parent. |
| `Continue` | "Tiếp tục" | "Tiếp tục" | both | OK. |
| `Get started` | "Bắt đầu" | "Bắt đầu nào" (child) / "Bắt đầu" (parent) | both | Splash button reads more inviting with "nào" for child. |
| `Got it!` | "Đã hiểu!" | "Hiểu rồi!" (child) / "Đã rõ" (parent) | both | "Đã hiểu" is technically right but stiff. |
| `Let's try again` | "Cùng thử lại nhé" | "Cùng thử lại nha" | child | "Nha" warmer than "nhé" for kids 4–7. |
| `One more time` | "Một lần nữa" | "Thêm một lần nữa nhé" | child | Softer with sentence-final particle. |
| `Day streak` | "Ngày liên tiếp" | "Chuỗi ngày học" | parent | "Liên tiếp" sounds robotic; "chuỗi" is the standard gamified term. |
| `Words learned` | "Từ đã học" | "Số từ đã học" | parent | Add classifier for clarity. |
| `Streak` | "Học liên tiếp" | "Chuỗi ngày" | parent | Same fix. |
| `For grown-ups` | "Dành cho người lớn" | "Dành cho phụ huynh" | parent | "Người lớn" is generic; this surface is specifically parents. |
| `Type the number` | "Nhập số" | "Nhập dãy số bên dưới" | parent | Disambiguates which number. |
| `Pair Robot` | "Ghép nối Robot" | "Kết nối Robot" | parent | "Kết nối" is more familiar for consumer pairing flows. |
| `Pairing Code` | "Mã ghép nối" | "Mã kết nối" | parent | Same. |
| `Charging` | "Đang sạc" | "Đang sạc pin" | parent | More natural full phrase. |
| `Strong signal` | "Tín hiệu mạnh" | "Sóng khoẻ" | parent | "Sóng" is the everyday Vietnamese term for Wi-Fi/cellular signal. |
| `Weak signal` | "Tín hiệu yếu" | "Sóng yếu" | parent | Same. |
| `Reconnecting...` | "Đang kết nối lại..." | "Đang kết nối lại…" | parent | Use Unicode ellipsis. |
| `Lesson Failed` | "Bài học thất bại" | "Không hoàn tất bài học" | parent | "Thất bại" sounds harsh in a learning context. |
| `Voice Session Failed` | "Phiên thoại thất bại" | "Mất kết nối giọng nói" | parent | More descriptive, less alarming. |
| `Locked` | "Đã khóa" | "Chưa mở" | child | "Đã khóa" sounds punitive; "chưa mở" frames as not-yet. |
| `Coming soon` | (missing) | "Sắp tới" | child | Add. |
| `Up next` | (missing) | "Tiếp theo" | child | Add. |
| `Hear it again` | (missing) | "Nghe lại nào" | child | Add. |
| `Yes, let's go!` | (missing) | "Đi thôi nào!" | child | Add. |
| `Tap when done` | (missing) | "Xong thì bấm vào nhé" | child | Add. |
| `Speak a little louder` | (missing) | "Nói to hơn một chút nhé" | child | Add. |
| `Wear headphones if you can` | (missing) | "Đeo tai nghe nếu được con nhé" | child | Add — uses "con" addressing the child directly. |
| `Get a grown-up` | (missing) | "Gọi người lớn giúp nha" | child | Add. |
| `Take a break` | (missing) | "Nghỉ một chút nhé" | child | Add. |
| `Back home` | (missing) | "Về Trang chủ" | both | Add. |
| `Stop for now` | (missing) | "Tạm dừng" | child | Add. |
| `Stop for today` | (missing) | "Hôm nay nghỉ ở đây nhé" | child | Add. |
| `Practice together` | (missing) | "Cùng luyện nào" | child | Add. |
| `Maybe later` | (missing) | "Để sau nha" | child | Add. |
| `Keep going!` | (missing) | "Cố lên!" | child | Add. |
| `Great effort!` | (missing) | "Con làm tốt lắm!" | child | Add — uses "con". |
| `New sticker` | (missing) | "Sticker mới" | child | Add. |
| `Brave Speaker` | (missing — content) | "Nhà thám hiểm dũng cảm" | child | Sticker names live in content data, not UI strings. |

---

## f. Layout risks at +35% length

VN is typically 15–35% longer than EN. The following components will truncate or reflow badly:

1. **`PrimaryCTA`** — single-line buttons in the lesson player (`Yes, let's go!` → `Đi thôi nào!` is fine, but `Pick up where we left off` → `Tiếp tục từ chỗ đang học` overflows on iPhone-mini width). **Fix:** allow two-line CTAs (`text-wrap: balance; line-height: 1.15`) or shrink min-font from 18 to 16.
2. **Onboarding splash subtitle** — "Voice English for kids" → "Tiếng Anh nói cho trẻ em" is +50%. Will wrap to 2 lines, OK at current `fontSize:15`.
3. **Lesson list status pills** (`Up next` / `Coming soon` / `Let's review!`) sit inline next to ⭐ icons. VN equivalents fit, but if any lesson title is long, the row already wraps. **Fix:** wrap pills before truncating titles.
4. **Speech bubbles** (`SpeechBubble`) — fixed max-width ~280 px; lines like "I heard you trying. One more time?" → "Mình nghe con đang cố nè. Thử thêm lần nữa nha?" is +60%. **Fix:** raise max-width to 320 px in VN, or allow 3-line bubbles.
5. **Parent gate body** — "To continue, please type the number below. This keeps the parent area separate from the play area." translated runs ~110 chars and crowds the input. **Fix:** restructure as 2 stacked sentences.
6. **Course list lesson cards** — title row uses `whiteSpace:nowrap; text-overflow:ellipsis`. **Fix:** allow 2-line title in VN.
7. **Lesson Header progress label** — none currently, but if added, VN labels need a min width budget.
8. **Mock iOS permission sheet** — system-style buttons "Don't Allow" / "Allow" must stay short ("Không" / "Cho phép") because the sheet width is hardcoded.

---

## g. Font / rendering risks (would matter on the physical Robot LCD)

The LCD design surface (`lcd-face*.jsx`, `lcd-lesson.jsx`) renders **face-only, no text** — so VN diacritics never appear on-device in the current design. **This is the right call** and should be preserved as a design rule: never put text on the 3.2″ LCD.

If product later adds any LCD text, verify the embedded font has full Vietnamese coverage (combining diacritics: ổ, ờ, ự, ễ, ặ, ợ, ử). Confirmed-OK web fonts in the prototype: Nunito 500–800, Fraunces 500–800 — both ship Vietnamese coverage.

---

## h. Proposed key-naming convention (forward-port to real product)

When this is migrated to `react-i18next`:

```
<surface>.<screen>.<element>.<state?>
```

Examples:
- `lesson.listen.cta.start` → "Start" / "Bắt đầu"
- `lesson.speak.helper.tap_when_done`
- `parent.gate.body.instruction`
- `error.network.title`
- `error.network.body`
- `error.network.cta.retry`

Namespaces per feature folder (`onboarding`, `lesson`, `course`, `progress`, `parent`, `device`, `purchase`, `error`, `common`).

Pluralization: ICU (`{count, plural, one {# day} other {# days}}` → VI uses single form `{count} ngày`).

---

## i. Migration plan (risk-ordered)

**P0 — Child-facing voice path (the product's core).** Without VI here the app is unusable for the target audience.
- Lesson Ready, Listen, Speak, Listening, Thinking, Success, Soft Retry, Silence, Off-topic, Activity Done, Lesson Done, Exit Confirm, Mic Missing (child), Safety Pause.

**P1 — Onboarding + Home.** First impression; parent abandons here if mixed.
- Splash, Welcome, 4 Intro screens, Trust, Mic Permission, Login/Sign Up, Login Error, Child Profile, First Hello, Robot Home (6 states).

**P2 — Course nav + Progress.** Returning sessions.
- Course / Level / Unit / Lesson List / Lesson Detail / Review Entry / Daily Mission / Today's Progress / Words Practiced / Lesson Summary / Review Needed / Celebration.

**P3 — Parent surface.** Lower frequency but high trust.
- Parent Gate / Summary / Today / Past 30 Days / Safety & Privacy / Settings.

**P4 — Errors + Settings.** Lower frequency, high stakes when hit.
- Network / Voice Session / Login / Audio Recovery / Lesson Failed / Reconnecting / Help & FAQ / Kid Settings.

**P5 — Device companion + Purchase + Course Library.** Adult marketing/management surface — copy-heavy, still mostly EN. Worth handing to a translator in one batch.

**P6 — Design system / LCD doc pages.** Internal documentation surfaces — keep EN.

---

## Recommendations summary

1. **Triple the dictionary.** Going from ~165 to ~480+ entries closes the mixed-locale gap. The single biggest unblock.
2. **Persona-tag every entry.** Add a `persona: 'child' | 'parent' | 'both'` field so the same EN can map to two VN strings depending on speaker.
3. **Default keep-EN for proper nouns:** "Robot", "TBOT", "Wi-Fi", "OK", brand course titles, sticker names. The current walker already no-ops when VI === EN — preserve.
4. **Set length budgets** per component (`PrimaryCTA`: 22 chars EN / 30 chars VI; `SpeechBubble`: 60 / 80; pill: 12 / 16). Lint at PR time.
5. **Don't translate content strings** ("Animal Friends", "Hello Friends", "Brave Speaker") through the UI dictionary — those belong to a content catalog, owned by curriculum.
6. **Forbid text on the LCD** as a permanent design rule (eliminates the embedded-font diacritics risk entirely).
7. **Defer "VI / EN" bilingual mode by default.** It's useful for parents previewing the app for their kid but doubles every label. Keep as opt-in toggle (already implemented), default to `vi`.

— end of audit.
