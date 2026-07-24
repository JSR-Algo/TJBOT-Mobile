# TeeBot Mobile MVP — Maestro build and verification tasks

Owner: Mobile, coordinated with Backend and Design/Behavior
Scope: first five approved parent-app pages before the remaining 21-page rollout

## First-five implementation

- [x] Install the canonical authenticated header on every page: Mia/profile,
  language, and Settings; keep Back additive on detail pages.
- [x] Install one floating warm-glass menu with the exact order `Home`,
  `Devices`, `Library`, `Progress`, `Profile`.
- [x] Render only the selected menu illustration in color; render the same four
  inactive illustrations in neutral gray.
- [x] Build Overview / Today command from `/v1/home/hub`.
- [x] Build Live lesson status from `/v1/devices/:deviceId/assignment/current`.
- [x] Build Report detail from `/v1/children/:childId/lesson-progress`.
- [x] Build Course library from `/v1/course-library`.
- [x] Build Course detail from `/v1/course-library/:courseId`.
- [x] Add English and Vietnamese copy for every new control and state.
- [x] Preserve loading, empty, offline/error, locked, and terminal lesson states.

## Backend alignment

- [x] Keep Home data household- and child-scoped.
- [x] Keep live assignment completion authoritative: active assignment followed
  by `null` is the terminal transition.
- [x] Reuse the child lesson-progress feed for report evidence; do not save or
  render audio transcripts.
- [x] Return `language` and `lessonCount` in both course list and detail DTOs.
- [x] Preserve backend `locked`, `isFree`, description, difficulty, age band,
  thumbnail, and lesson-count values in the mobile normalizers.
- [ ] Add acknowledged pause/end assignment mutations before enabling the
  Pause control; the UI deliberately exposes Pause as disabled until that
  authoritative backend contract exists.
- [ ] Replace temporary per-lesson course grouping with authored multi-lesson
  course records when the curriculum catalog migration lands.

## Maestro AI flow

- [x] Assert the shared header controls and global glass menu.
- [x] Capture Overview, Live status, Report detail, Library, and Course detail.
- [x] Assert the five page-specific test IDs and primary actions.
- [x] Run on one fixed iPhone simulator with an authenticated seeded/demo
  household and visually confirm: exactly one colored tab per screenshot.
- [x] Send the five resulting PNGs through the Telegram global tunnel.

Run from `TJBOT-Mobile`:

```bash
~/.maestro/bin/maestro test \
  .maestro/mobile-backend-first-pages/first-five-mvp.yaml
```

Screenshot output:
`output/maestro/first-five/01-overview.png` through
`output/maestro/first-five/05-course-detail.png`.

## Gate before pages 6–21

- [ ] Owner approves all five Telegram screenshots.
- [x] Mobile typecheck and targeted Jest suites pass.
- [x] Backend typecheck and Home/course-library integration suites pass.
- [ ] Source-size and GitNexus changed-scope checks pass.
- [x] No header, tab order, artwork, active-state, or localization drift remains.

The target-owned mobile source files are below the 800-line hard cap (the API
normalizer is 795 lines), but the branch-wide gate remains open: GitNexus sees
hundreds of pre-existing changes outside this five-page slice, and the root
source-size scan reports unrelated legacy growth. Resolve that inherited branch
scope before beginning pages 6–21.
