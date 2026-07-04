# TJBot Mobile — Full RN Redesign Plan (redesign-2026)

> **Goal:** rebuild all 140 screens to the approved north-star vibe (two lanes,
> Garden-Blue child + Wispr-Flow parent), wire the approved TeeBot mascot, then
> ship to the physical iPad. User wants **per-wave preview approval** before the
> next wave lands.
>
> **Design source of truth:** `preview/kit.css` + `preview/north-star.html` +
> `preview/robot-pages.html` (approved). Mascot: `src/assets/mascot/`.
> **Authority:** root `DESIGN.md` (§6–8 lanes), `.agent/` governance, this file.

## Status ladder (update as waves land)

| Wave | Area | Screens | Lane | State |
|---|---|---|---|---|
| 0 | **Foundation** — dual-lane tokens + RobotImage | — | both | 🚧 in progress |
| 0b | Shared RN component kit (hero/cta/card/streak/navpill/bubble/status) | — | both | 📋 |
| 1 | onboarding + auth | 11 + 9 | child | 📋 |
| 2 | home | 1 | child | 📋 |
| 3 | lesson-session + lessonDemo | 24 + 8 | child | 📋 |
| 4 | course + course-library | 7 + 11 | child | 📋 |
| 5 | progress | 5 | child | 📋 |
| 6 | purchase | 12 | mixed | 📋 |
| 7 | device + device/pairing | 22 | child | 📋 |
| 8 | robot-mgmt | 12 | mixed | 📋 |
| 9 | parent | 9 | **parent** | 📋 |
| 10 | fallback | 9 | child | 📋 |
| 11 | cleanup — delete legacy `referenceColors` once all screens migrated | — | — | 📋 |
| 12 | **Build → iPad** (local Xcode) | — | — | 📋 |

## Foundation (Wave 0) — what exists, what's added

The real screen-facing theme is **`src/design-system/referenceTheme.ts`** (not
`tokens/*` or `theme/themes.ts`, which 140 screens do not consume). Wave 0 is
**additive** so the app stays green and each screen opts in during its wave:

- `referenceColors` / `referenceRadii` / `referenceShadow` / `referenceImages` — **legacy child lane, untouched** until a screen migrates.
- **NEW** `gardenColors`, `gardenGradient`, `gardenShadow`, `gardenRadii` — Garden-Blue child lane (kit `.lane-child`).
- **NEW** `parentColors`, `parentRadii`, `parentShadow` — Wispr-Flow parent lane (kit `.lane-parent`).
- **NEW** `src/components/RobotImage.tsx` — `<RobotImage variant="head|body|icon" />` → `src/assets/mascot`.

### kit.css → RN token map

| kit.css var | RN token | value |
|---|---|---|
| `--c-bg` / `--c-bg-2` | `gardenColors.bg` / `.bg2` | `#CFEFF4` / `#BCE7F0` |
| `--c-cream` | `gardenColors.cream` | `#FBF4EA` |
| `--c-coral` (+soft) | `gardenColors.coral` (+`coralSoft`) | `#FF6F61` / `#FFE1DD` |
| `--c-sky` (+soft) | `gardenColors.sky` (+`skySoft`) | `#3FB6C4` / `#DDF7F8` |
| `--c-mint` (+soft) | `gardenColors.mint` (+`mintSoft`) | `#3FB37A` / `#DFF7EA` |
| `--c-sun` (+soft) | `gardenColors.sun` (+`sunSoft`) | `#F7C047` / `#FCEFC9` |
| `--c-plum` | `gardenColors.plum` | `#8B7BE8` |
| `--p-bg` | `parentColors.bg` | `#F5F5F0` |
| `--p-ink` | `parentColors.ink` | `#1C1C1E` |
| `--p-accent` (+soft) | `parentColors.accent` (+`accentSoft`) | `#6B4EFF` / `#EAE6FF` |
| `--p-success/warning/danger` | `parentColors.success/warning/danger` | `#34C759` / `#FF9500` / `#FF3B30` |

### Mascot wiring map (apply per wave, previewed with the screen)

| Today | New |
|---|---|
| `components/RobotIcon.tsx` (`referenceImages.robotHead`) | `<RobotImage variant="head" />` |
| `onboarding/.../OnboardingClayRobot.tsx` (head, shown large) | `<RobotImage variant="body" />` |
| `components/robot/RobotBody.tsx` + `ClayRobotScreen` (drawn) | `<RobotImage variant="body" />` |
| `components/robot/RobotFace.tsx` (drawn live face) | keep drawn for live audio states; `head` for static |
| `🤖` emoji placeholders | `<RobotImage variant="head|body" />` |

## Known prerequisites / named boundaries (not faked)

1. **Garden gradient bg** needs a gradient renderer. Confirm `expo-linear-gradient`
   is installed before Wave 1; if absent, install + native rebuild, OR use the flat
   mid-tone `#C7ECF2` as documented fallback (visible-failure boundary: flat vs gradient).
2. **Fraunces serif** (parent headings) is **not bundled**. Bundle via `expo-font`
   + font files before **Wave 9 (parent)**. Until then parent headings must NOT
   silently fall back — the wave that introduces them bundles the font first.
3. **Physical-iPad signing:** `DEVELOPMENT_TEAM` is empty in
   `ios/TJBotMobile.xcodeproj/project.pbxproj`. Set to **`8U3JS29Q7M`**
   (Apple Development: Thuan Phuoc Le) for `npx expo run:ios --device`.

## Per-wave preview process

1. Rebuild the wave's screens to kit (lane-correct, mascot wired).
2. Preview via **iOS Simulator** (no signing needed) — screenshot each screen.
3. User approves the wave → mark ✅ here → next wave.
4. After all waves: Wave 12 builds to the **physical iPad mini (A17 Pro)** via local Xcode.

## Verification gates (every wave)

`npx tsc --noEmit` · `npm run lint` · `npm run check:token-parity` · `npm test`
(no `any`/`@ts-ignore`; accessibility props on interactive elements; per `.agent/TASK_EXECUTION.md`).

## Diagnostic overlay button (separate, user-requested)

Capture+Telegram infra already exists (`DiagnosticCaptureRoot`, `sendDiagnosticReport`,
backend `/dev/diagnostic-report` → Telegram). Missing only the **always-on floating
button**. Add a `DiagnosticOverlayButton` next to `DiagnosticErrorBanner` in `App.tsx`
calling `sendDiagnosticReport({ trigger: 'manual', includeScreenshot: true })`.
Scheduled alongside Wave 0b (small, ~30 min). Tracked here so it isn't lost.

## Build & Push to iPad — runbook (verified 2026-06-25)

### What's done (in code, verified rendering on iPad-mini simulator)
- **Garden-Blue child reskin** — `referenceColors` → sky/coral/mint/sun kit values;
  `ScreenShell` paints the sky gradient (expo-linear-gradient). All 36 ScreenShell
  child screens adopt it at once. Verified: age-gate renders sky-blue + coral CTA.
- **Mascot wired** — `referenceImages.robotHead` → `tee-head.png` (avatars);
  `OnboardingClayRobot` → `<RobotImage variant="body">` (onboarding/auth/home hero).
- **Parent lane** — `PA` palette (ParentScroll) → Wispr-Flow (off-white, purple
  `#6B4EFF`); updates all 9 `parent/` screens.
- **Avatar fix** — `RobotImage` per-variant fit (icon=cover, head/body=contain) +
  new `Avatar` component; `kit.css` `.avatar`/`.p-ava` no-crop; lane selector fix.

### Two blocking bugs fixed this session
1. **Hermes `require` redbox** (`[runtime not ready]: Property 'require' doesn't exist`).
   Cause: `expo install` reverted the repo's manual patch removing
   `expo/virtual/streams.js` from the polyfill list (its UMD helpers become
   `require()` calls that crash Hermes pre-registry). Fix re-applied in
   `node_modules/@expo/cli/.../withMetroMultiPlatform.js` **and** captured as
   `patches/@expo+cli+55.0.21.patch`.
   **TODO (durability):** add `patch-package` devDep + `"postinstall":"patch-package"`
   so it auto-re-applies on every `npm install`. (Not yet wired — package.json is
   single-owner; do when safe. Until then, re-apply after any reinstall.)
2. **Navigation crash** (`Couldn't find a navigation object`). `DiagnosticErrorBanner`
   called `useNavigation()` outside `NavigationContainer`. Fixed: export
   `navigationRef` from `AppNavigator` and navigate via it (works from root overlays).

### iPad device build — procedure + the ONE blocker
- Signing team set: `DEVELOPMENT_TEAM = 8U3JS29Q7M` (×4 in `project.pbxproj`).
- Device build compiles + pods install fine; signing needs `-allowProvisioningUpdates`.
- **BLOCKER (user action): no Apple ID is signed into Xcode for team 8U3JS29Q7M.**
  Build fails: `No Account for Team "8U3JS29Q7M"`. Xcode can't generate the
  provisioning profile without the authenticated account.
  **Fix (one-time, GUI):** Xcode → Settings → Accounts → + → Apple ID
  (hello@jasonle.net), confirm team 8U3JS29Q7M appears.
- After sign-in, push to the paired iPad mini (A17 Pro, UDID
  `00008130-0019745E02F0001C`):
  ```
  cd original-app/TJBOT-Mobile
  npx expo run:ios --device 00008130-0019745E02F0001C   # Debug (needs Metro running)
  # or standalone (JS embedded, no Metro tether):
  npx expo run:ios --device 00008130-0019745E02F0001C --configuration Release
  ```

### Simulator preview (no signing) — for ongoing wave QA
```
npx expo run:ios --device "iPad mini (A17 Pro)"
xcrun simctl io <sim-udid> screenshot out.png
```
