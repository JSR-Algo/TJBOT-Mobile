# MASTER PROMPT — Cleanup: keep mobile flow only, drop everything else

Drop this whole file into a fresh AI session pointed at the TJBot design prototype. The goal is **mobile-only, flow-only** — strip every artifact that isn't a phone screen on the canonical user journey. No web pages, no LCD/firmware docs, no design-system swatch pages, no exploratory variants, no orphan/legacy frames.

---

## 0. CONTEXT (read first)

You are a Senior Product Designer + Frontend Engineer working on the TJBot Robot English mobile app prototype. The project is a single-page HTML app that mounts React 18 + Babel-standalone over `*.jsx` view files; iPhone bezel via `ios-frame.jsx`; design tokens in `tokens.css`; runtime i18n in `i18n.js`; static gates in `scripts/i18n/*.mjs`.

You will be asked to delete a lot. **Do not refactor, restyle, or "improve" anything that survives.** This is a pruning task, not a redesign task.

Run prototype:
```bash
python3 -m http.server 8765
# → http://localhost:8765/?view=canvas   (audit)
# → http://localhost:8765/?view=proto    (run)
```

---

## 1. SCOPE — what stays, what goes

### KEEP (mobile flow, child + parent surfaces of the iPhone app)

The 11 mobile-screen registries and only the IDs that lie on the canonical journey:

| Group | Files | Keep these IDs (canonical flow only) |
|---|---|---|
| Onboarding | `onboarding.jsx` | `onb_splash` · `onb_welcome` · `onb_mic_perm` · `onb_login` · `onb_profile` · `onb_first_hello` |
| Home | `home.jsx` | `home` · `home_today_done` · `home_no_mic` |
| Lesson Player | `screens.jsx` | `lesson_ready` · `connecting` · `robot_speaking` · `robot_listening` · `user_speaking` · `thinking` · `success` · `gentle` · `retry` · `silence` · `offtopic` · `bargein` · `activity_done` · `lesson_done` · `safety` · `exit_confirm` |
| Course | `course.jsx` | `course_overview` · `level_overview` · `unit_detail` · `lesson_list` · `lesson_detail` · `daily_mission` |
| Progress | `progress.jsx` | `today_progress` · `words_practiced` · `lesson_summary` · `review_needed` · `celebration` |
| Parent | `parent.jsx` | `parent_gate` · `parent_summary` · `parent_today` · `parent_30days` · `parent_safety` · `parent_settings` |
| Fallback | `fallback.jsx` | `fb_mic` · `fb_network` · `fb_voice` · `fb_login` · `fb_safety` · `fb_audio_recovery` · `fb_lesson_failed` · `fb_lesson_resume` |
| Device | `device.jsx` | `dv_home` · `dv_pair` · `dv_status` · `dv_battery` · `dv_wifi` · `dv_storage` · `dv_update` · `dv_find` |
| Course Library | `course-library.jsx` | `cl_browse` · `cl_detail` · `cl_purchase` · `cl_install` |
| Purchase | `purchase.jsx` | `pr_bundle` · `pr_checkout` · `pr_confirm` · `pr_subscribe` · `pr_plan` |
| Robot Mgmt | `robot-mgmt.jsx` | `rm_admin` · `rm_support` · `rm_sound` · `rm_sync` |

KEEP support files: `index.html` · `tokens.css` · `i18n.js` · `ios-frame.jsx` · `tweaks-panel.jsx` · `design-canvas.jsx` · `tb-components.jsx` (only the components actually imported by the surviving screens) · `robot.jsx` (only the parts the surviving screens render) · `locales/{en,vi}.json` · `scripts/i18n/*` · `uploads/` (assets the surviving screens reference).

### DELETE (everything else)

1. **All non-mobile artifacts** —
   - Any `web-*`, `desktop-*`, `landing-*`, `web.html`, `desktop.html` (none expected, but verify with `ls`)
   - Any starter-component files not used by surviving screens (`macos_window.jsx`, `browser_window.jsx`, `android_frame.jsx`, `deck_stage.js`, etc.)
   - `vn-features.jsx` (exploratory dual-theme exploration; merged into runtime via `i18n.js` + `tokens.css`)

2. **All LCD / firmware doc surfaces** —
   - `lcd-face.jsx` · `lcd-face-v2.jsx` · `lcd-lesson.jsx` · `lcd-system.jsx` · `lcd-v2.jsx`
   - Their entries in `index.html`'s view selector (`LCD Faces`, `LCD Lesson`, `LCD v2 ★`) and in any `*_STATES`/`*_SCREEN_MAP`
   - The "VN ★" view if it was hosting these. If `VN ★` is the canonical Vietnamese-language showcase pointing at real mobile screens, KEEP it; if it's a separate variant deck, DELETE it.

3. **Design-system / docs pages** — if they are not part of the user flow, delete them:
   - `design-system.jsx` (swatch + type-spec page)
   - `paths.jsx` (route documentation page)
   - The "Design System" view button in `index.html`
   The component definitions stay only if surviving screens import them.

4. **Orphan screens, dead variants, debug states** — anything not in the KEEP list above:
   - In each `*_STATES` array, remove every entry not on the keep list.
   - In each `*_SCREEN_MAP`, remove the matching entries.
   - In each `.jsx` file, delete the now-unused `function S_*` definitions.
   - In each file, delete dead helper components only that file used.

5. **Tweaks unrelated to the flow** — if `index.html`'s tweaks panel has knobs for LCD style, accent picker, intensity, etc., remove them. Keep only:
   - `view` (canvas / proto)
   - Anything still wired to a surviving screen

6. **Audit / planning markdown that is no longer load-bearing** —
   - `i18n-audit.md` (now superseded by code)
   - `docs/i18n/STEP-*-PR.md` (now committed)
   - Any `notes.md`, `plan.md`, `scratch.md`
   Keep only `scripts/i18n/README.md` and one top-level `README.md` you may write per §4.

7. **Uploads / assets nobody imports** — `grep -r "uploads/<file>" *.jsx index.html`; if the file has zero references, delete it.

8. **Backup/duplicate files** — `*.bak`, `* copy.jsx`, `*-old.jsx`, `*-v1.jsx`, anything ending `.draft.*`.

---

## 2. CANONICAL FLOW (use this as the keep-or-delete rule)

A screen survives only if it sits on one of these paths. Anything else is exploration:

```
Cold start →
  onb_splash → onb_welcome → onb_mic_perm → onb_login → onb_profile → onb_first_hello → home

Daily use →
  home → lesson_ready → connecting → robot_speaking → robot_listening → user_speaking
       → thinking → success → activity_done → lesson_done → celebration → home

Recovery →
  any → fb_mic | fb_network | fb_voice | fb_audio_recovery → home

Parent →
  home → parent_gate → parent_summary → (parent_today | parent_30days | parent_safety | parent_settings)

Course management →
  home → course_overview → level_overview → unit_detail → lesson_list → lesson_detail
       → cl_browse → cl_detail → cl_purchase → cl_install

Hardware →
  parent_settings → dv_home → (dv_pair | dv_status | dv_battery | dv_wifi | dv_storage | dv_update | dv_find)
                  → rm_admin | rm_support | rm_sound | rm_sync

Buy flow →
  pr_bundle → pr_checkout → pr_confirm → pr_subscribe → pr_plan
```

Anything off these paths = DELETE.

---

## 3. PROCEDURE (in this order, no improvising)

1. **Inventory.** `ls *.jsx`, `ls uploads/`, `ls scripts/`, `ls docs/`. Print a table: file → on keep list? → action (KEEP / DELETE / TRIM).

2. **Trim screen registries first** (`*_STATES` + `*_SCREEN_MAP`). Then delete the now-unused `function S_*` blocks. Then delete dead helpers in the same file (the ones whose only callers were the deleted screens).

3. **Delete files** marked DELETE. Use `delete_file` tool with full paths.

4. **Update `index.html`:** remove view-selector buttons for any deleted view; remove `<script>` tags for any deleted `.jsx`; remove tweak knobs for deleted features. Verify the page still loads with no console errors.

5. **Update `i18n.js` allowlist** if any string was tied to a deleted feature, drop the key from `locales/{en,vi}.json` and `scripts/i18n/.i18n-allowlist`. Run:
   ```bash
   node scripts/i18n/check-key-parity.mjs   # must exit 0
   node scripts/i18n/scan-hardcoded.mjs     # must exit 0 or list only known TODOs
   ```

6. **Visual verify.** Open `?view=canvas`. Walk every section. Open `?view=proto`. Click every Jump-to. No empty frames, no errors, no "undefined component."

7. **Reconcile flow.** Every `go(target)` in surviving code points to a surviving ID. Any `go('xyz')` whose `xyz` was deleted: replace with the closest surviving target (often `home`) or remove the button.

8. **Final inventory.** Re-print the file table after deletions. Count surviving screens per group. Match the KEEP table exactly.

---

## 4. DEFINITION OF DONE

- File count drops materially (LCD, design-system docs, paths, vn-features, orphan variants gone).
- Every surviving screen renders cleanly in canvas + proto views.
- Every surviving screen sits on a path in §2.
- Every `go()` target exists.
- All four i18n gates exit 0 (or only the two that exist in this project, whichever applies).
- One short `CHANGELOG.md` at project root: bullet list of what was deleted, with reason ("not on canonical flow," "LCD doc surface — out of mobile scope," etc.). No long prose.
- No console errors on first load of `index.html`.

---

## 5. RULES (do not break)

- **Only delete. Do not redesign.** No "while I'm here, let me also fix the spacing on Home." If a surviving screen has a bug, log it in `CHANGELOG.md` under "Known issues — defer," do not touch.
- **Do not move files between folders.** Cleanup, not restructure.
- **Do not rename surviving screens.** Their IDs are referenced from many places.
- **Do not invent new screens.** If a path in §2 references an ID that doesn't currently exist, log it under "Missing on canonical flow — defer," do not create.
- **Single PR.** One commit (or one project snapshot) per execution. No multi-step bargaining; just do the cleanup end-to-end.
- **Stop and ask** if the inventory shows >10 surviving files I didn't list above — there may be a real flow piece I missed. Do not silently delete it.

---

## 6. OUTPUT

Reply with:
1. The inventory table (before).
2. The deletion list with reason per row.
3. The inventory table (after).
4. The contents of `CHANGELOG.md` you wrote.
5. Console output of the two i18n gate scripts.
6. Confirmation that `?view=canvas` and `?view=proto` both load cleanly.

That's it. Do not ask permission to start; the prompt is the permission.
