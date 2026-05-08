# Step 1 — Tooling PR (Path B)

**Scope:** prototype-only. The migration target is the single-page HTML
prototype in this project, not the production `tbot-mobile` repo
(unavailable in this environment).

## Delivered

| Path | Purpose |
|---|---|
| `locales/en.json` | EN catalog. 200 entries. Extracted from inline `DICT` in `i18n.js`. |
| `locales/vi.json` | VI catalog. 200 entries. Same keys; values updated per audit's "VI rewrite" column (persona-aware: parent vs child, sentence-final particles `nhé/nha/nào`). |
| `scripts/i18n/scan-hardcoded.mjs` | Static scanner. Flags JSX text + key attributes whose literal isn't in `en.json` and isn't allowlisted. |
| `scripts/i18n/check-key-parity.mjs` | Diff `keys(en) ⊕ keys(vi)`; reports empty VI values (TODOs). Non-zero exit on delta. |
| `scripts/i18n/pseudo-locale.mjs` | Generates `locales/vi-pseudo.json` (every value wrapped `[ŁĐ … ŁĐ]`). |
| `scripts/i18n/length-stress.mjs` | Generates `locales/vi-stretched.json` (every value padded to 1.35× with VN diacritics). |
| `scripts/i18n/.i18n-allowlist` | Brand / content / proper-noun ignores. |
| `scripts/i18n/README.md` | How to run, how to add a string. |

## DoD status after Step 1

| Item | Status | Note |
|---|---|---|
| 1. Zero hardcoded strings | 🔴 RED | Scanner exists; first run will list ~315 violations as the work backlog for Step 2. |
| 2. Key delta = 0 | 🟢 GREEN | en + vi catalogs created with identical keys. |
| 3. No pseudo-locale leaks | 🟡 NEEDS RUN | Generator built; sweep happens per-bucket. |
| 4. Live language switch | 🟢 GREEN (existing) | Already works in `i18n.js`. |
| 5. Persistence | 🟢 GREEN (existing) | `localStorage.tbot.lang`. |
| 6. Fallback chain vi→en→never key-as-text | 🟢 GREEN (existing) | Walker already falls back to original EN node. |
| 7. Layout integrity at +35% | 🟡 NEEDS RUN | Generator built; sweep happens per-bucket. |
| 8. ICU plural / select | 🔴 RED | Prototype has zero count-bearing strings translated through ICU. Defer to Step 3. |
| 9. Locale formatting (date/number/duration) | 🔴 RED | None present. Defer to Step 3. |
| 10. CI gate | 🟡 PARTIAL | Local one-liner documented; project has no CI. |
| 11. Audit clunky strings rewritten | 🟢 GREEN | Audit's "VI rewrite" column applied to vi.json (e.g. `Streak` → `Chuỗi ngày`, `Pair Robot` → `Kết nối Robot`, `Lesson Failed` → `Không hoàn tất bài học`). |
| 12. Layout risks resolved | 🔴 RED | Defer to Step 2 buckets. |
| 13. Persona tone applied | 🟡 PARTIAL | Catalog now has child-flavored particles for known kid-facing strings; full pass happens in Step 2 P0. |
| 14. Docs sync | 🟡 PARTIAL | `scripts/i18n/README.md` covers contributing flow. Audit-resolved doc happens in Step 4. |

## How to run (local)

```bash
node scripts/i18n/scan-hardcoded.mjs        # backlog list (will exit 1)
node scripts/i18n/check-key-parity.mjs      # should exit 0
node scripts/i18n/pseudo-locale.mjs         # writes locales/vi-pseudo.json
node scripts/i18n/length-stress.mjs         # writes locales/vi-stretched.json
```

The runtime walker in `i18n.js` still loads the inline `DICT` for now —
**Step 2 P0** will cut it over to fetch `locales/{vi,vi-pseudo,vi-stretched}.json`
so the verification locales can be activated from the language switcher.
Doing the cutover now without buckets to test against would risk a stuck
mixed state; deferring keeps the change reviewable.

## Constraints honored

- No machine translation. Every VN string is hand-translated per the audit
  rewrites (Appendix B canonical guide not available in this env — all
  net-new VN copy in Step 2 will be marked `// TODO(style-guide-review)`
  until the guide is provided).
- No legal copy finalized. Legal-sensitive strings (Terms/Privacy in
  `onboarding.jsx`) will be marked `// TODO(legal-review)` in Step 2.
- LCD firmware out of scope. Confirmed: `lcd-*.jsx` files render
  face-only; "no text on the LCD" is upheld as a permanent design rule.
- No `// @ts-ignore`, no `--no-verify`. Not applicable in this codebase
  (no TS, no git hooks) — flagging for honesty.

## Next

Awaiting "go" before opening **P0 — Child-facing voice path** PR.
That bucket covers Lesson Ready, Listen, Speak, Listening, Thinking,
Success, Soft Retry, Silence, Off-topic, Activity Done, Lesson Done,
Exit Confirm, Mic Missing, Safety Pause — ~14 screens, ~80 strings to
translate, layout-risk fixes for `SpeechBubble` and `PrimaryCTA`.
