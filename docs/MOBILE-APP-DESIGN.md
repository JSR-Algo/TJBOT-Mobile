# TeeBot Parent Mobile Design Contract

Status: canonical for the current 21-page parent-app MVP
Owner: Mobile, with Design and Behavior review
Machine-readable companion: `docs/mobile-app-design.yaml`

This contract turns the approved Today overview into the visual source of truth
for every authenticated TeeBot Parent screen. It supplements the repository
root `DESIGN.md`; where an older mobile reference conflicts with this file, this
file governs the current parent-app redesign.

## 1. Non-negotiable shell

Every authenticated page uses the same shell. A page is not complete when any
of these invariants drift.

### 1.1 Global header

- The header always exposes all four controls: child profile avatar, child name
  (`Mia` in the reference state), language (`EN` or `VI`), and Settings.
- The child avatar and name are one selector pill. Language is a second pill.
  Settings is a circular 44×44 minimum target.
- Controls share one optical center line, one height family, equal vertical
  padding, and equal gaps.
- The group is right-aligned inside the same symmetric screen gutters used by
  the page content. It must never touch or cross the safe-area boundary.
- A back button may appear on detail pages, but it does not replace or remove
  the child, language, or Settings controls.
- Long localized names truncate inside the profile pill; they never push the
  language or Settings controls off-screen.

### 1.2 Global bottom navigation

- Exact order and labels: `Home`, `Devices`, `Library`, `Progress`, `Profile`.
- Exact assets: `src/assets/tab-icons/home.png`, `devices.png`, `library.png`,
  `progress.png`, and `profile.png`.
- The navigation is one floating capsule with symmetric side margins and safe
  space beneath it.
- Material: warm translucent white-to-peach glass gradient, subtle blur, thin
  white upper highlight, quiet border, and soft diffused shadow.
- Selected tab: full-color icon inside a smaller translucent warm glass pill,
  with the strongest label. Never use a square selection tile.
- Inactive tabs use the exact same illustrated assets rendered in neutral gray.
  They never use an alternate line-icon family and never retain competing color.
- Only the selected page's icon is colorful. This is a release-blocking rule.
- Only the active state changes between pages. Geometry, icon size, labels,
  spacing, glass treatment, and elevation remain identical.
- Root and tab-owned pages show the navigation. Full-screen setup, permission,
  authentication, and focused modal workflows may hide it deliberately.

## 2. Symmetry and geometry

- Reference phone canvas: 390×844 logical pixels; support nearby iPhone and
  Android widths without changing the hierarchy.
- Minimum horizontal gutter: 18 px, equal left and right.
- Spacing follows 4, 8, 12, 16, 24, 32, and 48 px increments.
- Minimum touch target: 44×44 px.
- Standard card radius: 22–24 px. Hero radius: 28 px. Pills: fully rounded.
- Cards aligned in one column use the same left edge, right edge, and internal
  padding. Paired metric cards use equal widths and equal gaps.
- The robot is fully contained, never clipped, and optically centered in its
  focal block.

## 3. Visual language

- Parent surfaces are warm, calm, premium, and operational.
- Background: warm off-white with very restrained peach ambient light.
- Cards: white or gentle semantic pastels; avoid heavy borders and hard shadows.
- Primary action: charcoal pill with clear outcome copy.
- Success and connected states: green with a text label, never color alone.
- Robot and course artwork use the approved colorful clay/3D family.
- Do not introduce a different robot, monochrome tab family, generic gradient,
  emoji icon, or arbitrary illustration style.

## 4. Typography and content hierarchy

- One clear page title; supporting copy is quieter and shorter.
- Headlines use strong near-black text. Body and metadata use accessible muted
  gray, not low-contrast decorative gray.
- Every screen presents: current state, primary content, and one best next
  action. Operational screens also expose recovery when blocked.
- All user-facing strings live in English and Vietnamese translation files.

## 5. Approved screen patterns

### Today command

Full TeeBot hero, online state, one ready lesson, one primary Start action, and
concise evidence since yesterday. `Home` is active.

### Live lesson status

Authoritative live state, elapsed time, current word/stage, timeline, and
acknowledged parent controls. Header and `Home` navigation remain unchanged.

### Report detail

Outcome summary, session evidence, word-level results, source/freshness, and one
recommended next action. Header and `Home` navigation remain unchanged.

### Course library

Search, colorful course rows, level and lesson counts, and explicit available or
locked states. The global header remains present. `Library` is active in the
same colorful glass navigation used on Today.

### Course detail

Course artwork, outcome, level, duration, units, vocabulary, child fit, lesson
progress, and one Continue/Start action. The global header remains present.
`Library` is active in the unchanged global navigation.

## 6. Required states and accessibility

- Design healthy, loading, empty, blocked/error, offline, and success states.
- Disabled and locked controls explain why and how to recover.
- Dynamic Type/font scaling must not hide header controls or truncate actions.
- Every icon has an accessible label; status never relies on color alone.
- Respect reduced motion. Haptics and animation supplement visible state.
- Validate contrast in implementation; screenshots alone do not prove WCAG
  compliance.

## 7. Drift-prevention review

For every page capture, compare against the approved Today shell and answer:

1. Are Mia/profile, language, and Settings all visible and aligned?
2. Are horizontal gutters and paired cards symmetrical?
3. Is the exact colorful floating glass navigation present when required?
4. Is only the correct active tab different?
5. Is the approved TeeBot and artwork family used consistently?
6. Are loading, error, offline, locked, and success states covered?
7. Are English and Vietnamese strings present?

Any `no` is a release-blocking design drift.
