# TBOT Design — React Native Migration-Ready Restructure Plan

**Repo:** `tbot-mobile/tbot-design`
**Date:** 2026-05-11
**Author:** omc-plan (Direct mode)
**Reviewer target:** codex
**Goal:** Restructure existing React+Vite prototype into a cross-platform-friendly, design-system-driven layout that can be 1:1 mapped into React Native later — **without converting code or changing UI behavior**.

---

## 0. Current-State Audit (verified facts)

| Area | Observation | Source |
|---|---|---|
| Stack | React 18 + Vite 5 + JSX (no TS) + Zustand 5 | `package.json:18-29` |
| Path alias | `@` → `src` already configured | `vite.config.js:7-9` |
| Entry | `main.jsx` → `App.jsx` (state-machine canvas/proto/nav-map viewer, dev-only) | `src/main.jsx`, `src/App.jsx` |
| Files | 164 `.jsx`, 51 `.js` across `src/` | `find src -name "*.jsx\|*.js"` |
| Features | 12 domains under `src/features/*` each with `<Pages>.jsx`, `index.js`, `states.js`, `components/` | `src/features/` tree |
| Shared UI | `src/shared/ui/*.jsx` (PrimaryCTA, SpeechBubble, CircleBtn, Robot, LCDFace, TBPhone, PageHeader, PageScroll) + `proto-shell.js` re-export barrel | `src/shared/ui/`, `proto-shell.js:1-18` |
| Cross-feature leak | `proto-shell.js` re-exports from `@/features/lesson-session/components/*` (ScreenShell, PulseRing, WaveBars, TopBar, LessonHeader, MicButton) — code comment explicitly flags this as tech debt | `src/shared/ui/proto-shell.js:1-18` |
| Services layer | `services/api/*.api.js` (12 stubs), `services/http/idempotency.js`, `services/websocket/realtime.js` already exist | `src/services/` tree |
| Stores | 6 zustand stores: `auth`, `cart`, `course`, `device`, `lesson`, `purchase` | `src/store/*.store.js` |
| Styling | Global `tokens.css` (CSS variables); inline `style={{}}` everywhere; per-feature `components/styles.js` and `purchase/components/tokens.js` ad-hoc patterns; gender themes via `:root[data-gender]` overrides | `tokens.css`, `device/components/styles.js`, `purchase/components/tokens.js` |
| Web coupling sites | `document.*` injection in `Robot.jsx:12-33` (CSS keyframes), `DesignCanvas.jsx` (devtools only), `ParentSettingsPage.jsx:13-14` (`window.__tbot.getLang/setLang`), `main.jsx:7` (`getElementById`) | grep results |
| Devtools | `src/devtools/{DesignCanvas, IOSDevice, NavMap, TweaksPanel}.jsx` — design canvas / inspector, web-only by intent | `src/devtools/` |
| Design tokens | only as CSS vars in `tokens.css`; no JS/TS token module yet | `tokens.css` |
| Per-screen "Pages" | named `*Page.jsx`, route-level pages live next to components in same feature dir (no `screens/` split) — **rename target: `*Screen.jsx` in `screens/` subdir per §2.4** | feature trees |
| i18n | `src/lib/i18n/i18n.js` + global `window.__tbot` bridge from `i18n.js` (root) loaded via `index.html` script tag | `index.html:11-12`, `src/lib/i18n/i18n.js` |
| Empty scaffolds | `src/config/.gitkeep`, `services/api/.gitkeep`, `services/http/.gitkeep`, `services/websocket/.gitkeep`, `store/.gitkeep` | scaffolding files — deleted in PR-1 once `config/index.js`, `services/storage/`, `services/i18n/` etc. are added |

**Bottom line:** project already 60% of the way to a clean structure. Main gaps are (1) no `design-system/` extraction with token JS module + primitive components, (2) no `screens/` vs `components/` split inside features, (3) inline styles fused to JSX, (4) web-only constructs (DOM, CSS string injection, `window.*`) sprinkled into otherwise portable code, (5) cross-feature import from `shared/ui → features/lesson-session`.

---

## 1. Target Project Structure (Tree)

```
tbot-design/
├── index.html
├── (./tokens.css deleted in PR-1 — see §2.7; public/tokens.css is authoritative)
├── vite.config.js                   # web bundler (untouched)
├── package.json
├── jsconfig.json                    # alias config (extend with new roots)
└── src/
    ├── main.web.jsx                 # renamed from main.jsx — web entry only
    ├── App.jsx                      # devtools shell (canvas/proto/nav-map switcher) — web-only viewer
    │
    ├── app/                         # NEW — routing + composition root (cross-platform)
    │   ├── navigation/
    │   │   ├── routes.js            # route ids (JSDoc types for now, .ts later)
    │   │   ├── ScreenMap.js         # central screen-id → component map (replaces inline mapping in App.jsx)
    │   │   └── route-aliases.js     # extracted from App.jsx:118 (`ROUTE_ALIASES`)
    │   └── providers/
    │       ├── AppProviders.jsx     # composition: ErrorBoundary + i18n + Theme
    │       └── ThemeProvider.jsx    # injects token context (no platform-specific calls)
    │
    ├── design-system/               # NEW — pure UI primitives, ZERO business logic, ZERO API/store imports
    │   ├── tokens/
    │   │   ├── colors.js            # exported from tokens.css values; both consumed via ThemeProvider
    │   │   ├── spacing.js
    │   │   ├── typography.js
    │   │   ├── radii.js
    │   │   ├── shadows.js
    │   │   ├── motion.js            # durations, easings, keyframe descriptors (data only, no CSS strings)
    │   │   └── index.js             # barrel
    │   ├── primitives/              # leaf RN-mappable components
    │   │   ├── Box/                 #   web: <div>, RN: <View>
    │   │   ├── Text/                #   web: <span>, RN: <Text>
    │   │   ├── Pressable/           #   web: <button>, RN: <Pressable>
    │   │   ├── Image/               #   web: <img>, RN: <Image>
    │   │   ├── ScrollContainer/     #   web: scrolling <div>, RN: <ScrollView>
    │   │   ├── Stack/               #   row/column layout helper
    │   │   └── index.js
    │   ├── components/              # design-system composite components (still UI-only)
    │   │   ├── Button/
    │   │   │   ├── Button.jsx
    │   │   │   ├── Button.styles.js # platform-agnostic style descriptors (objects, not CSS strings)
    │   │   │   ├── Button.types.js
    │   │   │   └── index.js
    │   │   ├── PrimaryCTA/          # moved from src/shared/ui/PrimaryCTA.jsx
    │   │   ├── CircleBtn/
    │   │   ├── SpeechBubble/
    │   │   ├── PageHeader/
    │   │   ├── PageScroll/          # wraps ScrollContainer primitive
    │   │   ├── Card/
    │   │   ├── Chip/                # generalized from HomeStateChip/CLChip/PRChip
    │   │   ├── ProgressBar/         # generalized from MiniProgress
    │   │   ├── Robot/               # complex but UI-only — moved from src/shared/ui/Robot.jsx (animation desc data)
    │   │   ├── LCDFace/             # moved from src/shared/ui/LCDFace.jsx
    │   │   ├── PulseRing/           # moved from features/lesson-session/components/PulseRing.jsx
    │   │   ├── WaveBars/            # moved from features/lesson-session/components/WaveBars.jsx
    │   │   └── index.js
    │   ├── icons/                   # NEW — centralize the dozens of inline <svg> currently scattered
    │   │   ├── IconPlay.jsx
    │   │   ├── IconMic.jsx
    │   │   ├── IconCheck.jsx
    │   │   ├── ... (one per inline svg shape)
    │   │   └── index.js
    │   ├── theme/
    │   │   ├── themes.js            # light, gender:girl, gender:boy variants (replaces :root[data-gender=*])
    │   │   ├── useTheme.js          # platform-agnostic hook
    │   │   └── index.js
    │   └── README.md                # design-system contract (no business imports allowed)
    │
    ├── components/                  # cross-feature reusable UI compositions (NOT design-system, NOT feature-specific)
    │   ├── PhoneShell/              # was inline in App.jsx
    │   ├── ScreenShell/             # moved from features/lesson-session/components/ScreenShell.jsx (was shared via proto-shell.js)
    │   ├── TopBar/                  # moved from features/lesson-session/components/TopBar.jsx
    │   ├── LessonHeader/            # moved from features/lesson-session/components/LessonHeader.jsx (used cross-feature)
    │   ├── MicButton/               # moved from features/lesson-session/components/MicButton.jsx (used cross-feature)
    │   ├── ErrorBoundary/           # moved from src/shared/components/ErrorBoundary.jsx
    │   ├── StatusBar/               # extracted iOS-style 9:41/battery overlay from App.jsx:85-93
    │   └── index.js
    │
    ├── features/                    # business domains — UI thin, logic in hooks/services/types
    │   ├── auth/
    │   │   ├── screens/             # NEW split — route-level pages (composition only)
    │   │   │   ├── LoginScreen.jsx       # was LoginPage.jsx
    │   │   │   ├── LoginErrorScreen.jsx  # was LoginErrorPage.jsx
    │   │   │   └── ChildProfileScreen.jsx # was ChildProfilePage.jsx
    │   │   ├── components/          # feature-local UI (subcomponents only used by this feature)
    │   │   ├── hooks/               # NEW — useAuth, useChildProfile (UI-glue logic)
    │   │   ├── services/            # NEW — re-export src/services/api/auth.api.js as feature contract
    │   │   ├── types/               # NEW — User, Child, AuthStatus typedefs
    │   │   ├── states.js            # state-machine catalogue (untouched semantics)
    │   │   └── index.js             # barrel: exports STATES + SCREEN_MAP unchanged
    │   ├── home/                    # same shape as auth/
    │   ├── course/
    │   ├── course-library/
    │   ├── purchase/                # NB: rename existing components/tokens.js → keep but mark as feature-local style tokens (not design-system tokens)
    │   ├── parent/                  # NB: extract window.__tbot.* bridge to features/parent/hooks/useLocale.js → consumes i18n adapter
    │   ├── progress/
    │   ├── device/
    │   ├── device/pairing/          # keep nested sub-feature
    │   ├── robot-mgmt/
    │   ├── lesson-session/          # NB: ScreenShell/TopBar/LessonHeader/MicButton/PulseRing/WaveBars promoted OUT of here (see above)
    │   ├── onboarding/
    │   └── fallback/                # error/network/audio/recovery screens
    │
    ├── hooks/                       # cross-feature hooks (currently shared/hooks/useTweaks.js)
    │   ├── useTweaks.js             # web devtools-only — flagged platform-specific
    │   └── index.js
    │
    ├── services/                    # external boundary (already partially in place)
    │   ├── api/                     # 12 *.api.js stubs (untouched)
    │   ├── http/                    # idempotency.js (untouched)
    │   ├── websocket/               # realtime.js (untouched)
    │   ├── storage/                 # NEW — platform-agnostic key-value adapter (web: localStorage, RN: AsyncStorage)
    │   │   ├── storage.adapter.js   # exports interface; web impl provided
    │   │   └── storage.web.js       # localStorage impl
    │   └── i18n/                    # NEW — adapter wrapping current window.__tbot bridge
    │       ├── i18n.adapter.js
    │       └── i18n.web.js          # delegates to window.__tbot for now (legacy bridge)
    │
    ├── store/                       # zustand domain stores (already in place)
    │   ├── auth.store.js
    │   ├── cart.store.js
    │   ├── course.store.js
    │   ├── device.store.js
    │   ├── lesson.store.js
    │   ├── purchase.store.js
    │   └── index.js                 # NEW barrel
    │
    ├── platform/                    # NEW — web-only quarantine; RN will provide parallel platform/native/
    │   ├── dom-style-injector.js    # extracted from Robot.jsx:12-33 and DesignCanvas.jsx:31-108
    │   ├── window-bridge.js         # extracted window.__tbot usages
    │   └── README.md                # "anything here MUST have an RN equivalent or be devtools-only"
    │
    ├── devtools/                    # web-only viewers (DesignCanvas, IOSDevice, NavMap, TweaksPanel) — kept as-is
    │   ├── DesignCanvas.jsx
    │   ├── IOSDevice.jsx
    │   ├── NavMap.jsx
    │   └── TweaksPanel.jsx
    │
    ├── utils/                       # pure helpers (no platform deps)
    │   └── index.js                 # placeholder
    │
    ├── types/                       # NEW — cross-cutting typedefs (JSDoc for now, .d.ts later)
    │   ├── navigation.types.js
    │   ├── domain.types.js
    │   └── index.js
    │
    ├── config/                      # already scaffolded
    │   ├── env.js                   # NEW — env wrapper (import.meta.env on web, react-native-config on RN)
    │   └── index.js
    │
    └── lib/
        └── i18n/
            └── i18n.js              # legacy adapter kept; now re-exported through services/i18n
```

**Notes on naming:**
- Files keep `.jsx` for the restructure. A later phase will rename `.jsx → .tsx`; this plan does **not** add TypeScript.
- `*Page.jsx` files are **renamed** to `*Screen.jsx` to match the React Native convention; the central screen-id strings in `states.js` (e.g. `home_hub_default`) are unchanged so routing still works.

---

## 2. File Relocation Map

### 2.1 Shared UI → design-system

| From | To | Reason |
|---|---|---|
| `src/shared/ui/PrimaryCTA.jsx` | `src/design-system/components/PrimaryCTA/index.jsx` (+ `.styles.js`) | DS primitive |
| `src/shared/ui/SpeechBubble.jsx` | `src/design-system/components/SpeechBubble/index.jsx` | DS primitive |
| `src/shared/ui/CircleBtn.jsx` | `src/design-system/components/CircleBtn/index.jsx` | DS primitive |
| `src/shared/ui/PageHeader.jsx` | `src/design-system/components/PageHeader/index.jsx` | DS primitive |
| `src/shared/ui/PageScroll.jsx` | `src/design-system/components/PageScroll/index.jsx` | uses ScrollContainer primitive |
| `src/shared/ui/Robot.jsx` | `src/design-system/components/Robot/index.jsx` (+ DOM keyframe injection extracted to `src/platform/dom-style-injector.js`) | DS primitive; web-only side effect quarantined |
| `src/shared/ui/LCDFace.jsx` | `src/design-system/components/LCDFace/index.jsx` | DS primitive |
| `src/shared/ui/TBPhone.jsx` | `src/components/PhoneShell/TBPhone.jsx` | cross-feature composite, not a DS primitive (renders a specific device chrome) |
| `src/shared/ui/proto-shell.js` | **DELETED** — its re-exports are replaced by explicit imports from `@/design-system` and `@/components` | removes cross-feature leak documented in current file's comment block |

### 2.1b Duplicates to delete (verified identical via `diff -q`)

| Duplicate file | Canonical (kept) | Verification |
|---|---|---|
| `src/features/course/components/PageHeader.jsx` | `src/design-system/components/PageHeader/index.jsx` (moved from `shared/ui`) | `diff -q src/shared/ui/PageHeader.jsx src/features/course/components/PageHeader.jsx` → empty |
| `src/features/course/components/PageScroll.jsx` | `src/design-system/components/PageScroll/index.jsx` | `diff -q src/shared/ui/PageScroll.jsx src/features/course/components/PageScroll.jsx` → empty |
| `src/features/lesson-session/components/CircleBtn.jsx` | `src/design-system/components/CircleBtn/index.jsx` | verify via `diff -q` before delete |
| `src/features/lesson-session/components/PrimaryCTA.jsx` | `src/design-system/components/PrimaryCTA/index.jsx` | verify via `diff -q` before delete |
| `src/features/lesson-session/components/SpeechBubble.jsx` | `src/design-system/components/SpeechBubble/index.jsx` | verify via `diff -q` before delete |

Update `course/screens/*.jsx` imports to consume from `@/design-system/components/PageHeader` / `PageScroll`.

### 2.2 Cross-feature components currently inside `lesson-session/components/`

| From | To | Reason |
|---|---|---|
| `src/features/lesson-session/components/ScreenShell.jsx` | `src/components/ScreenShell/index.jsx` | used outside lesson-session (via proto-shell) |
| `src/features/lesson-session/components/PulseRing.jsx` | `src/design-system/components/PulseRing/index.jsx` | pure UI, reusable |
| `src/features/lesson-session/components/WaveBars.jsx` | `src/design-system/components/WaveBars/index.jsx` | pure UI, reusable |
| `src/features/lesson-session/components/TopBar.jsx` | `src/components/TopBar/index.jsx` | cross-feature |
| `src/features/lesson-session/components/LessonHeader.jsx` | `src/components/LessonHeader/index.jsx` | cross-feature |
| `src/features/lesson-session/components/MicButton.jsx` | `src/components/MicButton/index.jsx` | cross-feature |
| `src/features/lesson-session/components/CircleBtn.jsx` | **DELETED** (duplicate of `src/shared/ui/CircleBtn.jsx` — verify identical, then remove) | dedupe |
| `src/features/lesson-session/components/PrimaryCTA.jsx` | **DELETED** (duplicate; canonical lives in `design-system`) | dedupe |
| `src/features/lesson-session/components/SpeechBubble.jsx` | **DELETED** (duplicate) | dedupe |

### 2.2b Cross-feature components currently inside `device/components/` (consumed by `robot-mgmt`)

**Verified leak (two consuming features):**
- 9 files in `src/features/robot-mgmt/*.jsx` (FactoryResetPage, MicTestPage, MyRobotPage, OfflineHelpPage, RobotBatteryPage, RobotFirmwarePage, RobotSoundPage, RobotStoragePage, SpeakerTestPage) import `@/features/device/components/{DvShell,DvRow,DvBigBtn}`.
- 12 files in `src/features/course-library/*.jsx` (BuyCoursePage, CompanionPage, CourseAddedPage, CourseCompletePage, CourseDetailPage, CourseLibraryPage, CourseLockedPage, NeedsSyncPage, RobotReadyPage, RunningPage, SendToRobotPage, UnlockConfirmModal) also import `@/features/device/components/{DvShell,DvRow,DvBigBtn}`.

Total: **21 consumers across 2 features**. Promote out of `device` so AC-3 can pass.

| From | To | Reason |
|---|---|---|
| `src/features/device/components/DvShell.jsx` | `src/components/DeviceShell/index.jsx` | cross-feature composite, used by robot-mgmt |
| `src/features/device/components/DvRow.jsx` | `src/components/DeviceRow/index.jsx` | cross-feature, used by robot-mgmt |
| `src/features/device/components/DvBigBtn.jsx` | `src/components/DeviceBigBtn/index.jsx` | cross-feature, used by robot-mgmt |
| `src/features/device/components/styles.js` (exports `DV` token bag) | `src/components/Device-tokens.js` — cross-component shared tokens. **10 importers**: 3 Dv* files (after move) + 7 `device/*Page.jsx` files (LCDLessonTurnPage, DeviceFirmwarePage, LCDLibraryPage, DeviceLostPage, DeviceHomePage, DeviceOverviewPage, DeviceSessionPage). Codemod all 10 in PR-4b. | required because moved Dv* files would otherwise violate §3 rule 4 by reaching back into `@/features/device/components/styles.js` |

Update every `robot-mgmt/screens/*.jsx` and `device/screens/*.jsx` import to consume from `@/components/Device*`. This is scheduled as **PR-4b** in §6.4.

### 2.2c Cross-feature components currently inside `onboarding/components/` (consumed by `auth`)

**Verified leak:** 3 files in `src/features/auth/` (`LoginPage.jsx`, `LoginErrorPage.jsx`, `ChildProfilePage.jsx`) import `@/features/onboarding/components/OnbShell` (default + named `OB`) and `OnbBigBtn` (default). Detected by the AC-3 awk detector against current code.

| From | To | Reason |
|---|---|---|
| `src/features/onboarding/components/OnbShell.jsx` | `src/components/OnbShell/index.jsx` | cross-feature composite (auth + onboarding); preserve default export AND the named `OB` export |
| `src/features/onboarding/components/OnbBigBtn.jsx` | `src/components/OnbBigBtn/index.jsx` | cross-feature, used by both features |

Update all 3 auth pages and any onboarding internal consumers to import from `@/components/OnbShell` and `@/components/OnbBigBtn`. Scheduled in **PR-4b** in §6.4.

### 2.3 Shared components / hooks

| From | To | Reason |
|---|---|---|
| `src/shared/components/ErrorBoundary.jsx` | `src/components/ErrorBoundary/index.jsx` | app-level composite |
| `src/shared/hooks/useTweaks.js` | `src/hooks/useTweaks.js` | devtools-only hook — uses `window.parent.postMessage` and `window.dispatchEvent`; tagged web-only in AC-7 allowlist |
| `src/shared/utils/` (empty) | **DELETED** | empty |

### 2.4 Feature screens — rename `*Page.jsx → *Screen.jsx` and move into `screens/`

Apply to every feature directory. Examples (full list = all 164 `.jsx` page files):

| From | To |
|---|---|
| `src/features/onboarding/SplashPage.jsx` | `src/features/onboarding/screens/SplashScreen.jsx` |
| `src/features/onboarding/WelcomePage.jsx` | `src/features/onboarding/screens/WelcomeScreen.jsx` |
| `src/features/home/HomeHubPage.jsx` | `src/features/home/screens/HomeHubScreen.jsx` |
| `src/features/lesson-session/GreetingPage.jsx` | `src/features/lesson-session/screens/GreetingScreen.jsx` |
| `src/features/device/pairing/PairIntroPage.jsx` | `src/features/device/pairing/screens/PairIntroScreen.jsx` |
| ... (apply to all 12 features uniformly) | ... |

Each feature's `index.js` barrel keeps the same `STATES` and `SCREEN_MAP` exports; only the imported module paths change.

### 2.5 Feature-local components (no move — only restated as feature-private)

| Stays at | Note |
|---|---|
| `src/features/course-library/components/*` (CL.js, CLChip.jsx, CourseCard.jsx, LCDPreview.jsx, courses.js) | feature-private |
| `src/features/device/components/*` (DvBigBtn, DvRow, DvShell, styles.js) | feature-private; `styles.js` becomes the model for style isolation per feature |
| `src/features/home/components/*` (HomeStateChip, HomeSecondaryButton) | feature-private |
| `src/features/onboarding/components/*` (IntroDots, IntroFrame, OnbBigBtn, OnbShell) | feature-private |
| `src/features/parent/components/*` (PRow, PRowGroup, ParentScroll, palette.js) | feature-private |
| `src/features/purchase/components/*` (tokens.js renamed to `purchase.local-tokens.js` — feature-local style constants, **not** elevated to design-system; renamed to avoid clashing with the `design-system/tokens/` namespace) | feature-private |
| `src/features/lesson-session/components/*` (after extractions in 2.2) — keep CircleBtn-equivalents that are truly lesson-only | feature-private |

### 2.6 Entry & App

| From | To |
|---|---|
| `src/main.jsx` | `src/main.web.jsx` — DOM mounting stays here (web-only) |
| `src/App.jsx` | `src/App.jsx` — keeps role as the devtools viewer (canvas/proto/nav-map switcher). Routing logic for the eventual real app moves to `src/app/navigation/`. |
| `App.jsx:118 ROUTE_ALIASES` | `src/app/navigation/route-aliases.js` |
| `App.jsx` `Frame` block (≈ lines 74-95) | `src/components/StatusBar/index.jsx` + a `ScreenFrame` composite in `src/components/PhoneShell/` |

### 2.7 Tokens

| From | To |
|---|---|
| `./tokens.css` (project root) | **DELETE.** Duplicate of `./public/tokens.css` (verified byte-identical via `diff -q tokens.css public/tokens.css` → empty). Vite serves `public/` at `/` so `index.html:10 <link rel="stylesheet" href="/tokens.css"/>` already resolves from `public/`. |
| `./public/tokens.css` | KEEP as the **authoritative web-only stylesheet** (current source of truth) until JS-token parity verified, then deprecate. `scripts/check-token-parity.mjs` reads this file. |
| (new) `src/design-system/tokens/colors.js` etc. | Mirror values from `./public/tokens.css` so JS code never reads CSS vars directly on cross-platform paths. |
| `:root[data-gender]` overrides in `public/tokens.css` | `src/design-system/theme/themes.js` (returns full token object per theme: `default | girl | boy`) |

### 2.8 Web-only quarantine

| From | To |
|---|---|
| `Robot.jsx:12-33` (`if (typeof document !== 'undefined') document.head.appendChild(...)`) | **Provider-injection pattern** (see §3 exception note). New `design-system/animations/AnimationProvider.jsx` exposes `registerKeyframes(name, descriptor)`. Web app wires it at boot to `platform/dom-style-injector.js`; RN port wires it later to `Animated`/`Reanimated`. `Robot` calls `useAnimations().register(...)` once on mount. Keeps DS pure. |
| `src/platform/dom-style-injector.js` | NEW — wraps `document.head.appendChild(<style>)`; consumed only at app boot (`src/main.web.jsx`) and by devtools |
| `DesignCanvas.jsx:31-108, 156, 211-218` DOM access | stays in devtools — devtools is documented as web-only |
| `ParentSettingsPage.jsx:13-14` (`window.__tbot.getLang/setLang`) | `src/features/parent/hooks/useLocale.js` → calls `src/services/i18n/i18n.adapter.js` |
| `index.html`-loaded `i18n.js` global (24 DOM hits in `src/lib/i18n/i18n.js`) | KEEP `src/lib/i18n/i18n.js` as the legacy web producer (mounted by `<script>` in `index.html`); wrap consumers behind `src/services/i18n/i18n.web.js` adapter. The producer file is tagged web-only in AC-7 allowlist; RN port will provide `services/i18n/i18n.native.js` against an `i18next` instance. |
| `src/hooks/useTweaks.js` | KEEP `window.parent.postMessage` + `window.dispatchEvent` calls (devtools edit-mode bridge); tagged web-only in AC-7 allowlist; RN port will no-op these calls. |

---

## 3. Domain Split Explanation

Existing 12 feature domains are preserved 1:1 — they are already well-shaped. Light refinements:

| Domain | Scope | Why it stays a single feature |
|---|---|---|
| `auth` | Login, login error, child profile selection | One actor lifecycle (signed-out → signed-in → child-picked); shares `auth.store.js` |
| `onboarding` | Splash, welcome, trust, intro listen/speak/celebrate/retry, mic-ask, first lesson entry | First-run only; cohesive narrative arc; no overlap with home |
| `home` | Hub screen with 6 state variants (`daily_available`, `completed_today`, `mic_needed`, `offline`, etc.) | Single screen, multiple states — already implemented as state machine |
| `course` | Level, unit, lesson list, lesson detail, daily mission, review entry | Course taxonomy; lives behind `course.store.js` |
| `course-library` | Browse/buy/sync/run flow for additional courses + companion handling | Library is a distinct purchase+sync surface, not just course browsing — separate store ownership |
| `lesson-session` | Active turn-by-turn voice lesson (22 screens: connecting, greeting, listen, speak, barge-in, retry, gentle, silence, off-topic, etc.) | Real-time session state machine; owns `lesson.store.js`; biggest single domain |
| `progress` | Today, words practiced, lesson summary, review needed, celebration | Read-only reporting surface for the learner |
| `parent` | Parent gate, today, history, summary, safety, settings | Different actor (parent vs child); always behind parent gate |
| `purchase` | Marketing → bundle → shipping → checkout → confirm → activate → first course → arrived | Commerce funnel; owns `cart.store.js` + `purchase.store.js` |
| `device` | Device home/overview/session/firmware/lost + LCD library/turn + `pairing/` sub-feature (13 screens) | Robot-hardware surface; pairing is large enough to be a nested sub-feature |
| `robot-mgmt` | My robot, status, battery, sound, storage, wifi, firmware, mic/speaker test, factory reset, offline help, support | Post-pairing settings & diagnostics — distinct from `device` which is operational/runtime |
| `fallback` | App error, audio recovery, mic missing, network error, reconnecting overlay, safety redirect, voice failed, help-faq, kid settings, lesson resume | Cross-cutting recovery surfaces; lives outside any single feature path |

### `device` vs `robot-mgmt` distinction (called out because reviewers will ask)
- `device` = **operational**: live status, session-in-progress, firmware-in-flight, lost-device escalation, LCD content runtime. Loads from `device.store.js`.
- `robot-mgmt` = **management**: configuration, diagnostics, support, factory reset. Read-mostly + admin actions; no live session dependency.

### `lesson-session` vs `course` distinction
- `course` = **catalog & navigation**: pick a level, unit, lesson; daily mission queue; review entry.
- `lesson-session` = **the live session itself**: connecting, greeting, turn-taking, error recovery, summary. Has its own `lesson.store.js`.

### Cross-feature boundary rules (enforceable later by an eslint import-restriction rule)
1. Features **must not** import from each other. If two features need a component, it goes to `src/components/` or `src/design-system/`.
2. Features **may** import from: `design-system`, `components`, `hooks`, `services`, `store`, `utils`, `types`, `config`.
3. `design-system` **must not** import from anything outside `design-system` (no business, no services, no store). **Single explicit exception:** `design-system/animations/AnimationProvider` may consume a platform-side keyframe registrar via React context — concrete implementation lives in `platform/` but is injected at app boot, never imported directly by DS code.
4. `components` may import from `design-system` only.
5. `services`, `store`, `utils`, `types`, `config` are leaf layers — no UI imports.

---

## 4. Design System Extraction Plan

### 4.1 Tokens (data-only, platform-agnostic)

Mirror `tokens.css` into JS modules. Same values; just exported as objects.

```
src/design-system/tokens/
  colors.js         → exports { cream, coral, sky, mint, sun, plum, ink, paper, danger, bot:{body,eye,cheek,...} }
  spacing.js        → exports { xs:4, sm:8, md:12, lg:16, xl:24, 2xl:32, 3xl:48 }
  typography.js     → exports { fonts:{display, body, kid}, sizes:{hero:44, title:32, body:22, cap:18}, weights:{...} }
  radii.js          → exports { card:28, button:999, chip:18 }
  shadows.js        → exports descriptors compatible with web (boxShadow string) and RN (elevation + shadowColor)
  motion.js         → exports keyframe descriptors as data; CSS injection only happens in web platform layer
  index.js          → barrel
```

**Theme variants** (`themes.js`): `default`, `girl`, `boy` — same shape as `colors.js`. Currently encoded as CSS overrides at `tokens.css:44-72`.

### 4.2 Primitives (the four irreducible RN-mappable atoms + helpers)

| Primitive | Web today | RN target | Purpose |
|---|---|---|---|
| `Box` | `<div>` with style prop | `<View>` | layout container |
| `Text` | `<span>`/`<p>` with style | `<Text>` | text node (RN requires text inside `<Text>`) |
| `Pressable` | `<button>` with style | `<Pressable>` | touch target |
| `Image` | `<img>` | `<Image>` | image element |
| `ScrollContainer` | overflow-scroll `<div>` | `<ScrollView>` | scrollable region |
| `Stack` | flexbox `<div>` | `<View style={{flexDirection}}>` | row/column helper |

Each primitive ships with two implementations: `Box.web.jsx`, `Box.native.jsx` (placeholder for RN port). Vite/Metro will resolve the right one via platform extension when the time comes. **For this restructure phase we only create `.web.jsx`; the `.native.jsx` stubs are deferred.**

### 4.3 Design-system components (composites built from primitives + tokens)

Classification:

| Component | Today's location | DS classification | Why |
|---|---|---|---|
| `PrimaryCTA` | `shared/ui/` | **DS primitive composite** | pure UI, no domain coupling |
| `CircleBtn` | `shared/ui/` + duplicate in `lesson-session/components/` | **DS primitive composite** | dedupe to DS |
| `SpeechBubble` | `shared/ui/` + duplicate in `lesson-session/components/` | **DS primitive composite** | dedupe to DS |
| `PageHeader` | `shared/ui/` | **DS primitive composite** | pure layout |
| `PageScroll` | `shared/ui/` | **DS primitive composite** | wraps ScrollContainer |
| `Robot` | `shared/ui/` | **DS primitive composite (special)** | pure UI but injects CSS keyframes → animation strings go to `motion.js` + web platform shim |
| `LCDFace` | `shared/ui/` | **DS primitive composite** | pure UI render |
| `PulseRing` | `lesson-session/components/` | **DS primitive composite** | pure animation overlay; reusable |
| `WaveBars` | `lesson-session/components/` | **DS primitive composite** | pure audio waveform render |
| `TBPhone` | `shared/ui/` | **App-level composite, NOT DS** | renders a specific device chrome; lives in `src/components/PhoneShell/` |
| `ScreenShell` | `lesson-session/components/` | **App-level composite, NOT DS** | safe-area + layout scaffold reused across features |
| `TopBar` | `lesson-session/components/` | **App-level composite, NOT DS** | composes Pressable + Text; used cross-feature |
| `LessonHeader` | `lesson-session/components/` | **App-level composite, NOT DS** | knows about lesson concept (progress, title), too domain-aware for DS but reusable across `course`, `progress`, `lesson-session` features |
| `MicButton` | `lesson-session/components/` | **App-level composite, NOT DS** | knows about mic state semantics |
| `HomeStateChip` | `home/components/` | **Feature-specific** | knows about home-state vocabulary |
| `CLChip` | `course-library/components/` | **Feature-specific** | course-library specific |
| `PRChip` | `purchase/components/` | **Feature-specific** | (will be unified with Chip primitive in a later phase, not in this plan) |
| `MiniProgress` | `course/components/` | **Feature-specific** (DS will offer generic `ProgressBar`; feature wraps it) |
| `DvBigBtn`, `DvRow`, `DvShell` | `device/components/` | **Feature-specific** | device-screen-specific |
| `OnbBigBtn`, `OnbShell`, `IntroFrame`, `IntroDots` | `onboarding/components/` | **Feature-specific** | onboarding-specific |
| `ParentScroll`, `PRow`, `PRowGroup` | `parent/components/` | **Feature-specific** | parent-section-specific |
| `CourseCard`, `LCDPreview` | `course-library/components/` | **Feature-specific** | catalog-specific |

### 4.4 Icons

All inline `<svg>` blocks (e.g. the four `<svg>`s in `home/HomeHubPage.jsx:33-58`, status bar SVGs in `App.jsx:89-90`, and dozens elsewhere) → `src/design-system/icons/Icon*.jsx`, each a small wrapper that consumes a `size` and `color` prop. **This phase only catalogs the icons and stubs the directory; full extraction of every inline `<svg>` happens in Phase 4 (see migration phasing below) to keep individual PRs reviewable.**

### 4.5 Styles

Replace inline `style={{...}}` literals with style-object exports in a sibling `.styles.js`:

Today:
```jsx
// PrimaryCTA.jsx
<button style={{ width:'100%', minHeight:72, borderRadius:'var(--r-button)', ... }}>
```

After restructure:
```jsx
// PrimaryCTA/Button.styles.js
import { tokens } from '@/design-system/tokens';
export const styles = {
  root: { width: '100%', minHeight: 72, borderRadius: tokens.radii.button, ... }
};

// PrimaryCTA/index.jsx
import { styles } from './Button.styles';
<button style={styles.root}>
```

This change preserves visual output exactly (same property values; CSS-var references resolved at module load) and makes the style descriptors trivially translatable to `StyleSheet.create(...)` in RN.

**Rule:** within `design-system` and `components`, **no `var(--*)` strings inside JS files** — tokens come from `tokens/`. CSS vars remain valid inside `tokens.css` and `index.html` styles (those stay web).

---

## 5. RN Migration Readiness Score

### Scoring rubric (10 categories, 1 point each)

| # | Category | Pass condition |
|---|---|---|
| 1 | Domain-split features | every feature has its own dir, no cross-feature imports (AC-3) |
| 2 | Design-system extracted | `design-system/` exists with tokens + primitives + components; no business imports (AC-4) |
| 3 | Tokens portable | tokens exported as JS modules with parity to CSS source (AC-5) |
| 4 | Screens vs components split | `features/*/screens/` vs `features/*/components/` exclusive (AC-6) |
| 5 | Web coupling quarantined | `document.*` / `window.*` only in allowlisted dirs (AC-7) |
| 6 | API layer centralized | all network calls in `services/api/`, none in UI |
| 7 | State management domain-based | one store per domain in `store/` |
| 8 | No duplicate components | one canonical home per shared name (AC-8) |
| 9 | Styling isolated | no `var(--*)` in JS files inside DS/components; `.styles.js` siblings for primitives |
| 10 | TypeScript-ready | typedef stubs in `types/`; tokens shaped for `.d.ts` later (JSDoc OK; no `.tsx` required) |

### Today (pre-restructure) — **5 / 10**
- ✅ #1 (domain-split, but with leaks: see AC-3, ISSUE-4), ✅ #6 (api/), ✅ #7 (store/)
- partial #5 (web coupling exists but not quarantined), partial #8 (4 known duplicates)
- ❌ #2 (no DS), ❌ #3 (no JS tokens), ❌ #4 (no screens split), ❌ #9 (inline styles + CSS-var strings everywhere), ❌ #10 (no types/)
- **Migration complexity (today):** **HIGH** — RN port would require simultaneous architecture refactor + syntax conversion.

### After this restructure (target) — **9 / 10**
- ✅ #1 through #9 all pass once PR-1 → PR-6 land.
- ❌ #10 deferred to Phase C (TypeScript) — JSDoc stubs only.
- **Migration complexity (after restructure):** **MEDIUM**
  - Phase A (this plan): pure relocations + extractions, ~2-3 days, no UI change risk.
  - Phase B (later, out of scope): replace `<div>`/`<button>` with `Box`/`Pressable` primitives — touches every leaf component but is mechanical.
  - Phase C (later, out of scope): introduce `.tsx`, type the tokens + props.
  - Phase D (later, out of scope): provide `.native.jsx` primitives + Metro config, run an RN shell.

---

## 6. Migration Strategy Notes

### 6.1 1:1 mappable (no refactor when RN comes)
- All `src/services/api/*.api.js` — pure async functions, no DOM.
- All `src/store/*.store.js` — zustand works on RN unchanged.
- `src/services/http/idempotency.js`, `src/services/websocket/realtime.js` — server-side talk only.
- Design-system tokens (`colors.js`, `spacing.js`, `typography.js`, `radii.js`).
- Feature `index.js` barrels + `states.js` state catalogues.
- Component prop shapes, business logic in hooks, JSX trees that already only call primitives.

### 6.2 Will need refactor at RN time (called out so reviewers see them)
- **DOM elements** (`<div>`, `<button>`, `<span>`, `<svg>`, `<img>`) → replaced when primitives are wired. This restructure adds the *seam* (primitives package) but doesn't yet rewrite call sites. Mechanical sed/AST job in Phase B.
- **Inline CSS string values** like `box-shadow: '0 4px 0 rgba(0,0,0,.15)'` → translate to RN style names (`shadowColor`, `shadowOffset`, `elevation`). Plan: encode in `shadows.js` token descriptors so each site reads one token, not a CSS string.
- **CSS keyframe animations** in `Robot.jsx:12-33` and `index.html` styles → migrate to `Animated`/`Reanimated` in RN. Quarantine to `platform/dom-style-injector.js` now; full rewrite later.
- **Gradients** referenced inline (`radial-gradient`, `linear-gradient`) → `react-native-linear-gradient` later. Catalog them via a `Gradient` DS component placeholder.
- **Font loading** via Google Fonts link tag in `index.html` → RN needs font files bundled. Replace at RN time.
- **`window.__tbot.*` i18n bridge** in `ParentSettingsPage.jsx:13-14` → already wrapping behind `services/i18n` adapter in this plan; concrete i18n lib (e.g. `i18next` already used on web, also works on RN) swap is mechanical later.
- **Devtools** (`DesignCanvas`, `IOSDevice`, `NavMap`, `TweaksPanel`) — explicitly web-only. Will not port to RN; RN dev surface uses Flipper/Reactotron + the existing canvas left available via `vite preview`.

### 6.3 Risk areas

| Risk | Mitigation |
|---|---|
| **Breaking imports across 215 files when renaming `Page.jsx → Screen.jsx`** | Do the rename per-feature as 12 atomic commits; each commit updates the feature's own `index.js` barrel so external imports (`@/features/<name>`) never change. App.jsx imports stay identical. |
| **Rename breaks `scripts/flows/` toolchain.** (a) `scripts/flows/lib/repo.mjs:142` regex `/\b([A-Z]\w*Page)\b/` finds zero `XPage` identifiers post-rename; (b) checked-in `nav-graph-data.json` (382 `*Page.jsx` paths) goes stale → `flows:validate` reports `undeclaredTargets`. | **Mitigation (executed inside PR-5):** (1) update `scripts/flows/lib/repo.mjs:142` regex to `(?:Screen\|Page)` alternation during transition (markdown-table escaping shown; **the actual JS regex literal is `/\b([A-Z]\w*(?:Screen|Page))\b/` — no backslash before the pipe**), then narrow to `Screen` after full rename; (2) run `npm run flows:extract` and commit refreshed `nav-graph-data.json` in the same PR as the rename; (3) run `npm run flows:validate` and `npm run flows:fast` as PR-5 gate (AC-13). |
| **Inline style refactor changes visual output by accident** | Style objects must hold exactly the same key-value pairs; **no new dependencies** (per §9), so verify with `git diff --stat` + visual spot-check of the canvas view across all 12 feature groups. (Playwright-based snapshot tests are a follow-up; not in scope for this restructure.) |
| **CSS var → JS token drift** (CSS values change but JS tokens don't, or vice versa) | Add `scripts/check-token-parity.mjs` that diffs `tokens.css` vars vs `design-system/tokens/colors.js` and fails the lint script. Run in `husky` pre-commit. |
| **`proto-shell.js` is imported by ~12 feature files**; removing it breaks them | Migration order: (1) create `design-system` and `components`, (2) update `proto-shell.js` to re-export from new locations (compat layer), (3) codemod all imports off `proto-shell` to direct imports, (4) delete `proto-shell.js`. |
| **`Robot.jsx` injects `<style>` into `document.head` at module load** | Wrap in `platform/dom-style-injector.js`; check `typeof document !== 'undefined'` already in place — that gate stays, function moves. Acceptance: visual unchanged. |
| **Devtools `DesignCanvas` deeply DOM-coupled** | Leave it untouched in `src/devtools/`. Document as "web-only, not part of the RN port." |
| **i18n via `window.__tbot` is a global side-effect** | Adapter pattern (`services/i18n/i18n.adapter.js` with `i18n.web.js` impl) — caller never reads `window`. RN later supplies `i18n.native.js`. |
| **Per-feature `tokens.js` / `palette.js` / `styles.js` files (purchase, parent, device) might confuse vs design-system tokens** | Rename them: `purchase.local-tokens.js`, `parent.palette.js`, `device.styles.js`. Add header comment "feature-local style constants — DO NOT promote to design-system without review." |
| **Two `tokens.css` copies (`./tokens.css` vs `./public/tokens.css`)** confuse token-parity script | Verified byte-identical today via `diff -q`. PR-1 deletes `./tokens.css`; `scripts/check-token-parity.mjs` reads `public/tokens.css` (which Vite serves at `/tokens.css` per `index.html:10`). |
| **`robot-mgmt → device/components/Dv*` AND `course-library → device/components/Dv*` cross-feature imports** (21 files total; see §2.2b) | Promote `DvShell/DvRow/DvBigBtn` to `src/components/Device*/` in PR-4b, before PR-5 rename. Without this, AC-3 fails after restructure. |
| **`auth → onboarding/components/{OnbShell,OnbBigBtn}` cross-feature import** (3 files; see §2.2c) | Promote both components to `src/components/` in PR-4b. Preserve `OnbShell`'s default + named `OB` exports. Without this, AC-3 fails after restructure. |
| **`eslint` not in `package.json`** so AC-12 (`npx eslint src/`) is unrunnable as written | PR-1 adds `eslint` + `@eslint/js` to `devDependencies` as **tooling-only** (not runtime; permitted under §9 since it isn't a runtime dep that ships to users). The rule starts `"warn"`; PR-6 flips to `"error"`. |
| **`scripts/flows/schema/nav-graph.schema.json` may hardcode "Page" terminology** | PR-5 checklist includes auditing all `scripts/flows/schema/*.json` for "Page" string literals and updating to accept "Screen". |
| **Duplicate component files (e.g. `lesson-session/components/PrimaryCTA.jsx` likely a stale copy)** | Before deleting, run a binary diff vs the canonical `shared/ui/PrimaryCTA.jsx`. If diff is non-empty, capture differences in PR description; if identical, delete. |
| **Reviewer pushback on file-rename churn (164 jsx + 51 js)** | Phase the work; each phase is a single, reversible PR. See phasing below. |

### 6.4 Phasing (suggested PR order)

The restructure is one logical change but should land as **7 reviewable PRs** (PR-1 → PR-6 plus PR-4b). Each PR keeps `npm run dev` green, `npm run i18n:check` green, `npm run flows:fast` green, and the canvas view rendering all states identically.

1. **PR-1 — Add scaffolding (no moves):**
   - Create empty dirs: `design-system/{tokens,primitives,components,icons,theme,animations}`, `components/`, `platform/`, `services/{storage,i18n}`, `app/{navigation,providers}`.
   - Add `design-system/README.md` with the contract from §3 (including the AnimationProvider exception).
   - Add `scripts/check-token-parity.mjs` (reads `public/tokens.css` vs `src/design-system/tokens/*.js`).
   - Delete `./tokens.css` (root duplicate); confirm `public/tokens.css` is served unchanged.
   - Add `eslint` + `@eslint/js` to `devDependencies` (tooling-only). Wire `no-restricted-imports` rule enforcing §3 boundaries at severity `"warn"`.
   - **Rename `src/main.jsx → src/main.web.jsx`** and update the only consumer: `index.html:37 <script type="module" src="/src/main.jsx">` → `src="/src/main.web.jsx"`. Gate: `npm run dev` opens at port 5173 with no 404; canvas view renders.

2. **PR-2 — Extract tokens to JS:**
   - Mirror `public/tokens.css` → `design-system/tokens/*.js` (root `./tokens.css` already deleted in PR-1 per §2.7).
   - Add `themes.js` for default/girl/boy.
   - Add `ThemeProvider.jsx` (no consumers yet).
   - No component changes.

3. **PR-3 — Move shared UI into design-system + codemod direct importers:**
   - Relocate `shared/ui/*` → `design-system/components/*` (PrimaryCTA, SpeechBubble, CircleBtn, PageHeader, PageScroll, Robot, LCDFace). `TBPhone.jsx` → `components/PhoneShell/`.
   - Wire `AnimationProvider` (per §3 rule-3 exception) and quarantine `Robot`'s DOM keyframe injection into `platform/dom-style-injector.js`; provider mounted at `src/main.web.jsx` boot.
   - **Codemod 86 direct importers** of `@/shared/ui/*` to the new paths. Distribution today (verified live): `@/shared/ui/Robot` ×46 → `@/design-system/components/Robot`; `@/shared/ui/LCDFace` ×37 → `@/design-system/components/LCDFace`; `@/shared/ui/proto-shell` ×8 (stays — compat shim updated; full removal in PR-6); `@/shared/ui/PrimaryCTA` ×8 → `@/design-system/components/PrimaryCTA`; `@/shared/ui/PageScroll` ×5 → `@/design-system/components/PageScroll`; `@/shared/ui/SpeechBubble` ×3 → `@/design-system/components/SpeechBubble`; `@/shared/ui/PageHeader` ×3 → `@/design-system/components/PageHeader`; `@/shared/ui/CircleBtn` ×3 → `@/design-system/components/CircleBtn`. Move TBPhone callers (if any) to `@/components/PhoneShell/TBPhone`.
   - Update `proto-shell.js` to re-export from new paths (compat shim — only path that still touches `@/shared/ui/` after this PR).
   - **Verification:** `grep -rln '@/shared/ui/' src/ | grep -v 'proto-shell'` returns 0 lines after this PR.
   - Move `ErrorBoundary.jsx` → `components/ErrorBoundary/`; update `src/main.web.jsx` import.
   - Move `useTweaks.js` → `hooks/`; update consumers (devtools).
   - **Course consumer update + duplicate delete:** update the 7 `src/features/course/*Page.jsx` files (CoursePage, DailyMissionPage, LessonDetailPage, LessonListPage, LevelPage, ReviewEntryPage, UnitPage) to import `PageHeader`/`PageScroll` from `@/design-system/components/PageHeader|PageScroll` instead of `./components/PageHeader|PageScroll`. Then delete `src/features/course/components/PageHeader.jsx` and `src/features/course/components/PageScroll.jsx` (verified byte-identical per §2.1b). Verify: `grep -rn 'components/PageHeader\|components/PageScroll' src/features/course/` returns 0 lines after this step.
   - **PR-3 gate:** `npm run dev` opens canvas view; all 12 feature groups render unchanged.

4. **PR-4 — Extract lesson-session shared components:**
   - Move `ScreenShell`, `TopBar`, `LessonHeader`, `MicButton` → `src/components/`.
   - Move `PulseRing`, `WaveBars` → `design-system/components/`.
   - Delete duplicates inside `lesson-session/components/` (use `diff -q` to confirm before each delete; see §2.1b).
   - Update `proto-shell.js` re-exports.

4b. **PR-4b — Promote shared device + onboarding components (resolves cross-feature leaks):**
   - Move `device/components/{DvShell,DvRow,DvBigBtn}.jsx` → `src/components/Device{Shell,Row,BigBtn}/index.jsx` per §2.2b.
   - Update imports in **21 consumer files** (verified via AC-3 detector against current code):
     - 9 `robot-mgmt/*Page.jsx` (FactoryReset, MicTest, MyRobot, OfflineHelp, RobotBattery, RobotFirmware, RobotSound, RobotStorage, SpeakerTest)
     - 12 `course-library/*.jsx` (BuyCourse, Companion, CourseAdded, CourseComplete, CourseDetail, CourseLibrary, CourseLocked, NeedsSync, RobotReady, Running, SendToRobot, UnlockConfirmModal)
     - any `device/*Page.jsx` that also consumed them
   - Verification after this step: `grep "@/features/device/components" src/features/` returns 0 lines.
   - Move `onboarding/components/{OnbShell,OnbBigBtn}.jsx` → `src/components/{OnbShell,OnbBigBtn}/index.jsx` per §2.2c. Preserve `OnbShell`'s default export AND named export `OB`.
   - **Update OnbBigBtn internal import:** `src/components/OnbBigBtn/index.jsx` line 2 currently `import { OB } from './OnbShell'` — after move, change to `import { OB } from '@/components/OnbShell'` (the two files are no longer siblings). Verify: `grep -n "from '\./OnbShell'" src/components/OnbBigBtn/` returns 0 lines.
   - Update imports in 3 `auth/*Page.jsx` files (LoginPage, LoginErrorPage, ChildProfilePage) to `@/components/OnbShell` and `@/components/OnbBigBtn`.
   - Update onboarding's own internal consumers (`onboarding/*Page.jsx`) to import from `@/components/*`.
   - **Promote DV token bag:** move `DV` export from `src/features/device/components/styles.js` to a new `src/components/Device-tokens.js`. Update all 10 consumers:
     - 3 moved Dv* files → `import { DV } from '@/components/Device-tokens'`
     - 7 `device/*Page.jsx` files (LCDLessonTurn, DeviceFirmware, LCDLibrary, DeviceLost, DeviceHome, DeviceOverview, DeviceSession) → `import { DV } from '@/components/Device-tokens'`
     - Delete `src/features/device/components/styles.js` if no remaining consumers.
     - Verification: `grep -rn "components/styles'\|'\./styles'" src/features/device/` returns 0 lines after this step.
   - Gate: `npm run dev` renders robot-mgmt, device, course-library, auth, and onboarding pages unchanged. AC-3 detector returns **0** lines.

5. **PR-5 — Rename pages → screens, per-feature (12 commits within one PR):**
   - **One PR, 12 commits, one per feature** (chosen over 12 separate PRs to keep the toolchain regen atomic — flows + i18n).
   - Per feature commit: rename `*Page.jsx → *Screen.jsx`, move to `screens/`, add `hooks/` + `services/` + `types/` empty dirs, update feature `index.js`.
   - External imports unchanged because they come through `@/features/<name>`.
   - **PR-5 gate checklist (all must pass before merge):**
     - Update `scripts/flows/lib/repo.mjs:142` regex during transition to alternation (markdown shows `(?:Screen\|Page)`; **actual JS regex literal is `/\b([A-Z]\w*(?:Screen|Page))\b/` — pipe unescaped**). PR-6 narrows to Screen-only.
     - Update `scripts/flows/schema/nav-graph.schema.json:21` description from "page component" to "screen component". Verify: `node -e "JSON.parse(require('fs').readFileSync('scripts/flows/schema/nav-graph.schema.json'))"` exits 0.
     - Run `npm run flows:extract`. Commit refreshed `nav-graph-data.json`.
     - Run `npm run flows:validate` — exit 0.
     - Run `npm run flows:fast` — exit 0 (AC-13).
     - Run `npm run i18n:check` — exit 0 (AC-11).
     - `npm run dev` renders all 12 feature groups identically.

6. **PR-6 — Delete `proto-shell.js` + `shared/ui/`; tighten gates:**
   - Codemod all imports of `proto-shell` to direct imports from `design-system` / `components`.
   - Remove `proto-shell.js`.
   - Remove empty `shared/ui/`, `shared/components/`, `shared/hooks/`, `shared/utils/`.
   - Flip eslint `no-restricted-imports` rule from `"warn"` to `"error"`.
   - Narrow `scripts/flows/lib/repo.mjs:142` regex to `/\b([A-Z]\w*Screen)\b/` (drop the Page alternation; no markdown-pipe escaping concern since no alternation remains).
   - Final gate: `npm run dev`, `npm run flows:fast`, `npm run i18n:check`, `npx eslint src/` all exit 0.

After PR-6: structure matches §1; AC-1 through AC-13 all pass.

---

## 7. Acceptance Criteria

Every criterion is testable. Verify in order; do not advance until previous passes.

1. **AC-1 (no behavior change):** After each PR, `git diff --stat` shows only path renames and import-path updates (no semantic JSX or prop changes inside moved files); manual visual spot-check of the canvas view across all 12 feature groups shows no rendering regression. Pixel-perfect snapshot tests are deferred (no new deps per §9).
2. **AC-2 (no broken imports):** `vite build` succeeds with **0** "missing module" warnings.
3. **AC-3 (no cross-feature imports):** the awk-based detector in §8 (portable across `grep`/`ugrep`) returns **0** lines. Cross-feature imports go through `design-system` / `components`.
4. **AC-4 (design-system purity):** `grep -RnE "from ['\"]@/(features|services|store)/" src/design-system/` returns **0** matches. (The `AnimationProvider` consumes `platform/` via React context injected at app boot — no direct import.)
5. **AC-5 (token parity):** `node scripts/check-token-parity.mjs` exits 0 — every `--var` in `public/tokens.css` has a matching entry in `design-system/tokens/*.js`.
6. **AC-6 (screens vs components):** every file under `src/features/*/screens/` is referenced by the feature's `index.js` `SCREEN_MAP`; every file under `src/features/*/components/` is **not** referenced by `SCREEN_MAP`.
7. **AC-7 (web-only quarantine):** `grep -RnE "document\.|window\." src/` returns hits only inside the **web-only allowlist**: `src/devtools/`, `src/platform/`, `src/main.web.jsx`, `src/services/i18n/i18n.web.js`, `src/services/storage/storage.web.js`, `src/lib/i18n/i18n.js`, `src/hooks/useTweaks.js`. Zero hits inside `src/design-system/`, `src/components/`, `src/features/`, `src/store/`, `src/services/api/`, `src/services/http/`, `src/services/websocket/`, `src/utils/`.
8. **AC-8 (no duplicate components):** `find src \( -name 'PrimaryCTA*' -o -name 'CircleBtn*' -o -name 'SpeechBubble*' -o -name 'PageHeader*' -o -name 'PageScroll*' \) -type f` returns exactly one canonical file per name, all under `src/design-system/components/`.
9. **AC-9 (i18n bridge wrapped):** `grep -Rn 'window\.__tbot' src/features/ src/components/ src/design-system/` returns **0** matches. Only `src/services/i18n/i18n.web.js` (consumer adapter) and `src/lib/i18n/i18n.js` (legacy producer) reference `window.__tbot`.
10. **AC-10 (proto-shell removed):** `test ! -f src/shared/ui/proto-shell.js` is true after PR-6.
11. **AC-11 (i18n scripts still pass):** `npm run i18n:check` exits 0 — restructure must not break the existing i18n key-parity gates.
12. **AC-12 (eslint boundaries):** `npx eslint src/` exits 0 after PR-6 (rule promoted from warn to error).
13. **AC-13 (flows toolchain still passes):** `npm run flows:fast` exits 0 and `npm run flows:validate` exits 0 with no `undeclaredTargets`, after PR-5 (and PR-6).

---

## 8. Verification Steps

```bash
# 1. Build
npm install
npm run dev                                                                 # AC-1, AC-2 (manual visual check)
npm run build                                                               # AC-2

# 2. Cross-feature import detector (AC-3) — must print 0 lines.
#    Portable across grep / ugrep (the host shell here uses ugrep, which
#    rejects BRE backreferences in -v). Awk does the cross-feature check.
grep -RHnE "from ['\"]@/features/" src/features/ 2>/dev/null | awk -F: '
{
  path=$1; line=$2;
  rest=""; for(i=3;i<=NF;i++){rest=rest (i>3?":":"") $i}
  n=split(path,P,"/"); src_feat=P[3];
  if(match(rest, /@\/features\/[a-z-]+/)){
    imp=substr(rest, RSTART+11, RLENGTH-11);
    if(imp!=src_feat) print path ":" line ":" rest
  }
}'

# 3. Design-system purity (AC-4) — must print 0 lines
grep -RnE "from ['\"]@/(features|services|store)/" src/design-system/

# 4. Token parity (AC-5)
node scripts/check-token-parity.mjs

# 5. Screens vs components (AC-6)
node scripts/check-screen-map.mjs                                           # new lint script, added in PR-1

# 6. Web-only quarantine (AC-7) — must print 0 lines
grep -RnE "document\.|window\." src/ \
  | grep -vE "^src/(devtools|platform|main\.web\.jsx|services/(i18n|storage)/.*\.web\.js|lib/i18n/i18n\.js|hooks/useTweaks\.js)"

# 7. Duplicate components (AC-8) — must list exactly one path per name, all under design-system/components/
find src \( -name 'PrimaryCTA*' -o -name 'CircleBtn*' -o -name 'SpeechBubble*' \
         -o -name 'PageHeader*'  -o -name 'PageScroll*' \) -type f | sort

# 8. i18n bridge usage in disallowed dirs (AC-9) — must print 0 lines
grep -Rn 'window\.__tbot' src/features/ src/components/ src/design-system/

# 9. proto-shell gone (AC-10)
test ! -f src/shared/ui/proto-shell.js && echo "AC-10 ok"

# 10. i18n key parity (AC-11)
npm run i18n:check

# 11. ESLint boundaries (AC-12) — error severity after PR-6
npx eslint src/

# 12. Flows toolchain (AC-13)
npm run flows:fast
npm run flows:validate
```

---

## 9. What This Plan Does NOT Do (explicit non-goals)

- **No React Native code.** Zero `react-native` imports, zero `View`/`Text`/`StyleSheet`. Only structure + extraction.
- **No TypeScript conversion.** Files stay `.jsx` / `.js`. Type-shape modeled with JSDoc in `types/` for future migration.
- **No UI behavior changes.** Every `onClick`, `onChange`, every visual prop, every animation parameter is preserved byte-for-byte.
- **No business-logic refactor.** No new hooks introduced for logic that doesn't already exist in components; component bodies are moved/renamed only.
- **No API implementation.** `services/api/*.api.js` placeholder stubs stay as stubs.
- **No new runtime dependencies** beyond what `package.json` already declares as `dependencies`. Dev-only tooling additions (`eslint` + `@eslint/js` to satisfy AC-12) are permitted because they don't ship to users; see §6.3 risk register.
- **No port of devtools** to RN. `src/devtools/*` remains web-only.

---

## 10. Out-of-Scope Follow-Ups (file for separate plans)

- Phase B: rewrite leaf JSX to use `<Box>`/`<Text>`/`<Pressable>` instead of `<div>`/`<span>`/`<button>`.
- Phase C: introduce TypeScript (`.tsx`, type tokens, type props).
- Phase D: introduce `.native.jsx` primitives + Metro/Expo + RN shell app at `apps/mobile/`.
- Phase E: monorepo restructure (`apps/web/`, `apps/mobile/`, `packages/design-system/`).
- Phase F: replace `public/tokens.css` entirely with JS-driven theming once Phase B lands (the root `./tokens.css` is already deleted in PR-1 per §2.7).

---

## 11. Reviewer Checklist (for codex)

Boxes intentionally left unchecked — codex marks them.

- [ ] Every user-stated rule (§ "STRICT RULES" 1-10) maps to a section in this plan
- [ ] Tree structure (§1) matches user template — `app/`, `features/`, `components/`, `design-system/`, `hooks/`, `services/`, `store/`, `utils/`, `types/`, `config/` all present
- [ ] Design-system contains tokens + components and no business logic (§4 contract)
- [ ] Features grouped by domain with screens / hooks / services / types (§3 + §1)
- [ ] Screen-vs-component split enforced (§2.4 + AC-6)
- [ ] Styling isolated, no inline scattering left in DS or components (§4.5)
- [ ] All API calls centralized in `services/api/` (verified in §0; no UI-layer fetch)
- [ ] State management domain-based (verified in §0)
- [ ] No web coupling in core logic (§2.8 + §6.2 + AC-7 allowlist)
- [ ] 1:1 RN mapping plan articulated (§6.1 + §6.2)
- [ ] Risk register comprehensive (§6.3) — toolchain risks (flows, eslint, tokens.css duplicate) included
- [ ] Acceptance-criteria shell commands actually verify what they claim (§8 — AC-3 grep is allowlist-style, AC-7 allowlist matches AC-7 text)
- [ ] All ACs map to a single shell command in §8
- [ ] Plan does NOT convert to RN (§9 explicit non-goals)
- [ ] Phased and reviewable (§6.4 — 7 PRs, each leaves dev/i18n/flows green)
- [ ] Cross-feature leak resolved: `robot-mgmt → device/components/Dv*` (9 files, 29 imports — §2.2b + PR-4b)
- [ ] Cross-feature leak resolved: `course-library → device/components/Dv*` (12 files, 26 imports — §2.2b + PR-4b)
- [ ] Cross-feature leak resolved: `auth → onboarding/components/{OnbShell,OnbBigBtn}` (3 files, 6 imports — §2.2c + PR-4b)
- [ ] Known duplicate components catalogued for deletion (§2.1b)
- [ ] `DV` token bag promoted to `src/components/Device-tokens.js` with all 10 consumers updated (§2.2b + PR-4b)
- [ ] 86 `@/shared/ui/*` direct importers codemoded in PR-3 (verified via `grep -rln '@/shared/ui/'` returns only `proto-shell.js` until PR-6)

---

## 12. ADR (Architecture Decision Record)

**Decision:** Refactor to a four-layer cross-platform structure: `design-system` (UI primitives + tokens), `components` (cross-feature composites), `features/<domain>/{screens,components,hooks,services,types}` (business UI), `services|store|hooks|utils|types|config` (leaf layers); web-only side effects quarantined into `platform/` and `devtools/`.

**Drivers:**
- User explicit requirement: RN migration-ready without code conversion.
- Existing assets: `features/`, `services/`, `store/`, `shared/ui/`, zustand, path alias `@` — reuse rather than rewrite.
- Reviewer-visible cleanliness: every leaf component must be 1:1 mappable to RN.

**Alternatives considered:**

1. **Monorepo with `packages/design-system` now.**
   - Pro: cleanest separation; Phase E pre-paid.
   - Con: large yak-shave (pnpm/turbo wiring, vite multi-root, husky paths) for zero RN benefit until Phase D. Rejected for this phase.

2. **Convert to `.tsx` and add full types in same pass.**
   - Pro: gets typing benefit immediately.
   - Con: doubles the diff per file; breaks user rule "ONLY restructure architecture and file organization." Rejected.

3. **Replace `<div>`/`<button>` with `<Box>`/`<Pressable>` primitives in same pass.**
   - Pro: leaf-level mapping done.
   - Con: touches every JSX leaf; high regression risk; user rule "DO NOT change UI behavior" stretched even though props are equivalent. Deferred to Phase B.

4. **Leave proto-shell.js in place as a compat layer permanently.**
   - Pro: zero churn for callers.
   - Con: continues the cross-feature import (its own comment block flags it as tech debt). Rejected.

5. **Keep `Page.jsx` naming (no rename).**
   - Pro: smaller diff; no `scripts/flows/` regex update; no `nav-graph-data.json` regen.
   - Con: (a) user §7 explicitly requires `screens/` directory; (b) `Page` collides with iOS UIPageViewController-style controls (`PageScroll` is a scroll container, not a page); (c) the in-repo identifier `SCREEN_MAP` already aligns with `Screen` not `Page` — rename removes the cognitive mismatch; (d) Expo Router / React Navigation idiomatically name route components `*Screen`. Rejected.

**Why chosen:** Maximizes structural readiness (9/10 per §5 rubric — only #10 TypeScript deferred to Phase C) while satisfying every "DO NOT" constraint (no RN code, no syntax conversion, no behavior change). Phased into **7 reviewable PRs** (PR-1 through PR-6 plus PR-4b) to keep regression risk low and let reviewers reject any single phase without losing the rest.

**Consequences:**
- ~215 files touched (rename + move). Most touches are import-path-only.
- One new gate script (`check-token-parity.mjs`) and one new eslint rule.
- `proto-shell.js` and the `shared/ui` directory go away.
- Devtools and platform quarantine documented as web-only forever (not portable).
- Future Phases B-F have a clean seam to land against.

**Follow-ups:**
- Track Phase B-F as separate `.omc/plans/rn-migration-phase-{b,c,d,e,f}.md` files.
- After PR-6: run a one-shot codemod to remove any unused JSDoc-style imports flagged by eslint.
- (Deferred to Phase B+) Capture before/after Playwright screenshots of all 12 feature groups as a regression artifact in `docs/qa/`. Not part of this restructure — Playwright is a new dependency excluded by §9.

---

## 13. Changelog (this plan)

- 2026-05-11 — Initial Direct-mode plan, generated by `omc-plan` for codex review.
- 2026-05-11 — Critic review (REVISE). Patches P1–P8 + medium fixes applied:
  - P1 (§6.3 + AC-13): added `scripts/flows/` risk row + flows-toolchain acceptance gate.
  - P2 (§8 AC-3): replaced broken awk pipeline with allowlist-style grep.
  - P3 (§2.1b + AC-8): catalogued duplicate `course/components/PageHeader.jsx` and `PageScroll.jsx`; widened AC-8 find expression.
  - P4 (§2.2b + §6.4 PR-4b): added `device/components/Dv*` → `src/components/Device*` promotion to resolve robot-mgmt cross-feature leak.
  - P5 (§2.8 + §7 AC-7 + §8): tagged `src/lib/i18n/i18n.js` and `src/hooks/useTweaks.js` web-only; extended AC-7 allowlist.
  - P6 (§1): renamed planned `routes.ts` → `routes.js` to honor §9 "no TS" rule.
  - P7 (§2.7 + §6.4 PR-1 + AC-5): designated `public/tokens.css` as authoritative; deleted root duplicate.
  - P8 (§6.4 PR-5): added flows regen + nav-graph commit + i18n check as PR-5 gate.
  - Medium fixes: §5 rubric (10 categories); dropped Playwright reference; documented AnimationProvider DS exception in §3; added eslint as dev-only tooling under §9 exception; stripped pre-ticks from §11; ADR alternative-5 strengthened; PR-1 deletes scaffolding `.gitkeep`s.
  - Nits: `purchase.style-tokens.js` → `purchase.local-tokens.js` (namespace clash); §2.6 line range corrected; "legacy" label deferred until parity verified.
- 2026-05-11 — Critic re-review (REVISE). Patches P9–P16 applied:
  - **P9** (§2.2c): added `auth → onboarding/components` leak (3 files importing `OnbShell`+`OnbBigBtn`); promoted to `src/components/{OnbShell,OnbBigBtn}/`; preserved `OnbShell`'s named `OB` export.
  - **P10** (§6.4 PR-4b): fixed mis-referenced files — PR-4b now updates `auth`/`onboarding` imports for OnbShell/OnbBigBtn (the original "device/components/PageHeader" line was wrong; PageHeader/PageScroll work moved to PR-3).
  - **P10-bonus** (§2.2b + §6.4 PR-4b): final-sanity AC-3 run surfaced a third cross-feature edge — `course-library → device/components/Dv*` (12 files, 26 imports). Catalogued in §2.2b and added to PR-4b consumer list; §6.3 risk row updated. Total cross-feature edges: 3 — all resolved by PR-4b: robot-mgmt→device (29), course-library→device (26), auth→onboarding (6).
  - **P11** (§6.4 PR-1): scheduled `main.jsx → main.web.jsx` rename + `index.html:37` script-src update + dev-server smoke gate.
  - **P12** (§6.4 PR-3): added course-page import update (7 files) + delete of `course/components/{PageHeader,PageScroll}.jsx` duplicates.
  - **P13** (§6.3, §6.4 PR-5): added "markdown table-cell escape" note clarifying `(?:Screen\|Page)` is markdown-only; actual JS regex literal is `(?:Screen|Page)` (no backslash).
  - **P14** (§9): amended "no new dependencies" → "no new runtime dependencies; dev tooling (eslint + @eslint/js) permitted" — resolves contradiction with §6.3 + §6.4 PR-1.
  - **P15** (§12): synced ADR "Why chosen" to **9/10** and **7 PRs** (was stale 8.5/10 and 6 PRs).
  - **P16** (§6.4 PR-5): replaced vague schema audit with explicit edit to `scripts/flows/schema/nav-graph.schema.json:21` ("page component" → "screen component") + JSON-parse verification command.
  - Nits: §0 page-naming row notes rename target; §10 Phase F deprecation target updated to `public/tokens.css`; §12 Playwright follow-up tagged Phase B+.
- 2026-05-11 — Critic re-review round 3 (REVISE — execution-simulation gaps only; zero critical). Patches P17–P20 applied:
  - **P17** (§6.4 PR-3): added codemod step for **86 direct `@/shared/ui/*` importers** (Robot ×46, LCDFace ×37, proto-shell ×8, PrimaryCTA ×8, PageScroll ×5, SpeechBubble ×3, PageHeader ×3, CircleBtn ×3 — verified live distribution); proto-shell.js compat shim survives until PR-6.
  - **P18** (§2.2b + §6.4 PR-4b): explicitly promote `DV` token bag from `device/components/styles.js` → `src/components/Device-tokens.js`; codemod all 10 consumers (3 Dv* + 7 device pages); avoids §3 rule-4 violation that would occur if moved Dv* files reached back into features/.
  - **P19** (§6.4 PR-4b): added `OnbBigBtn/index.jsx` internal-import rewrite (`./OnbShell` → `@/components/OnbShell`) since the two files are no longer siblings post-move.
  - **P20** (§11): replaced single cross-feature checklist line with 3 explicit edge rows (robot-mgmt→device 29, course-library→device 26, auth→onboarding 6) + DV-promotion row + 86-importer codemod row.
  - Nits: §1 tree drops stale root `tokens.css` row (deleted in PR-1); PR-2 wording clarified to `public/tokens.css`.
