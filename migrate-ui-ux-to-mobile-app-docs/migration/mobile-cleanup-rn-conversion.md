# TBOT Design — Mobile Cleanup + RN Conversion (Working Reference)

**Repo:** `tbot-mobile/tbot-design` · **Baseline:** Phase A `418774b` on `new-design`
**Status:** Working reference for an AI executor. Not a contract — adapt as facts change.
**Scope:** **Prototype only** (user-confirmed). Output feeds a future fresh `tbot-mobile/apps/mobile/` worktree (Phase E).
**Constraints:** Bare React Native (not Expo) · mobile only · no real backend wiring · visual parity required.

> **History:** Four prior critic rounds (see `.omc/research/` for v1) revealed the plan as a contract was too brittle — each patch wave introduced new factual errors faster than verification could catch them. This rewrite is the tight working reference focused on the AI conversion recipe (§5) and verified inventory (§2-3). The 9-PR sequence and ADR alternatives were dropped per the critic-recommended "Option A".

---

## 1. Verified state (re-run before executing)

| Fact | Value | How to re-verify |
|---|---|---|
| Source files | 167 .jsx, 0 .tsx | `find src -name '*.jsx' \| wc -l` |
| Screens | 115 in `src/features/*/screens/*Screen.jsx` | `find src/features -path '*/screens/*Screen.jsx' \| wc -l` |
| API services | 10 stub files, 53 functions | `ls src/services/api/*.api.js \| wc -l` |
| Zustand stores | 6 (auth, cart, course, device, lesson, purchase) | `ls src/store/*.store.js` |
| Inline styles | 138 feature files with `style={{...}}` | `grep -rl 'style={{' src/features/ \| wc -l` |
| DOM nodes to replace | ~1,515 (`1,286 <div>` + `~153 button/span/img` + `76 <svg>`) | `grep -rc '<div\|<svg' src/features/` |
| `go()` call sites | 268 | `grep -rE "\bgo\([\"']" src/features/ \| wc -l` |
| Robot CSS keyframes | 15 in `Robot/index.jsx` | `grep -c '@keyframes' src/design-system/components/Robot/index.jsx` |
| Locales | `locales/en.json`, `locales/vi.json`, `locales/bundle.js` at project root (NOT in `public/`) | `ls locales/` |
| nav-graph states | 128 in `nav-graph-data.json`; 6 are phantoms (state-IDs with no backing file) | `jq '.states \| length' nav-graph-data.json` |

**Phantoms (state-id → expected screen-path):**
- `onb_coppa` → `onboarding/screens/CoppaGateScreen.jsx` (never built)
- `parent_locked_out` → `parent/screens/ParentLockedOutScreen.jsx`
- `abandoned_disconnect`, `cost_capped`, `parent_stopped`, `timed_out` → `lesson-session/screens/<Name>Screen.jsx`

---

## 2. Target structure

```
tbot-design/
├── index.js                      Metro entry — AppRegistry.registerComponent('TBotApp', () => App)
├── App.tsx                       <AppProviders><NavigationContainer><RootNavigator/></NavigationContainer></AppProviders>
├── ios/                          from `npx @react-native-community/cli init`
├── android/                      from `npx @react-native-community/cli init`
├── babel.config.js               module-resolver alias @/ → src/; reanimated plugin LAST
├── metro.config.js               default; module-resolver in babel handles alias
├── tsconfig.json                 strict, skipLibCheck, paths.@/*: ["src/*"], moduleResolution: "bundler", jsx: "react-jsx"
├── package.json                  bare RN deps; "dev": "react-native start"
├── eslint.config.js              @react-native/eslint-config@^0.74 + no-restricted-imports
└── src/
    ├── app/                      navigation root + providers
    │   ├── RootNavigator.tsx     typed stack with 117 entries
    │   ├── providers/
    │   │   ├── AppProviders.tsx  Theme + i18n + Query + ErrorBoundary + SafeAreaProvider
    │   │   ├── ThemeProvider.tsx
    │   │   └── QueryProvider.tsx
    │   └── navigation/
    │       ├── routes.ts         RootStackParamList types
    │       └── linking.ts        deep-link config
    ├── design-system/            UI primitives + tokens (sealed — no business imports)
    │   ├── tokens/               .ts modules (colors, spacing, typography, radii, shadows, motion)
    │   ├── primitives/           Box, Text, Pressable, Image, Stack, Spacer
    │   ├── components/           Button, Chip, Card, Input, ProgressBar, SpeechBubble, PulseRing,
    │   │                         WaveBars, Robot, LCDFace, PrimaryCTA, CircleBtn, PageHeader, PageScroll
    │   ├── icons/                one .tsx per icon, react-native-svg-based
    │   └── theme/                themes.ts (default/girl/boy), useTheme.ts
    ├── components/               cross-feature composites (imports only design-system)
    │   ├── Screen/               unified shell (replaces OnbShell/DeviceShell/ScreenShell/PageScroll/ParentScroll)
    │   ├── PhoneShell/           kept for devtools-style screen previews if any
    │   ├── TopBar, LessonHeader, MicButton, ErrorBoundary
    │   ├── DeviceShell, DeviceRow, DeviceBigBtn, Device-tokens.ts   (DV)
    │   └── OnbShell, OnbBigBtn                                       (OB)
    ├── features/<domain>/        12 domains
    │   ├── screens/              *Screen.tsx — composition only
    │   ├── components/           feature-private subcomponents
    │   ├── hooks/                useXxx — owns state + TanStack queries
    │   ├── services/             feature-shaped wrappers around services/api/<domain>
    │   ├── types/                domain entities + ScreenParams
    │   ├── states.ts             STATES catalogue
    │   └── index.ts              barrel
    ├── hooks/                    cross-feature: useLocale, usePermissions, useNetwork
    ├── services/
    │   ├── api/                  10 typed .api.ts + 1 new support.api.ts = 11
    │   ├── http/                 client.ts, idempotency.ts, errors.ts
    │   ├── websocket/            realtime.ts, events.ts (typed)
    │   ├── storage/              storage.ts — AsyncStorage adapter, API in §6
    │   └── i18n/
    │       ├── i18n.ts           i18next instance
    │       ├── resources.ts      static imports of ./locales/*.json
    │       └── locales/          en.json, vi.json (moved from project root in B2)
    ├── store/                    6 zustand stores (.ts)
    ├── utils/, types/, config/

# DELETED
src/App.jsx, src/main.web.jsx, src/devtools/, src/hooks/useTweaks.js,
src/platform/dom-style-injector.js, src/design-system/animations/AnimationProvider.jsx,
src/services/i18n/langBridge.web.js, src/lib/, index.html, vite.config.js, public/, jsconfig.json,
locales/ (root — moved to src/services/i18n/locales/)
```

---

## 3. Screen inventory (115 + 2 modal/overlay = 117 nav surfaces)

| Feature | Screens | Notes |
|---|---|---|
| auth | 3 | LoginScreen, LoginErrorScreen, ChildProfileScreen |
| onboarding | 9 | Splash, Welcome, Trust, IntroListen/Speak/Celebrate/Retry, MicAsk, FirstLessonEntry |
| home | 1 | HomeHubScreen with **6 server-driven variants** (`home_hub_{daily,done,greet,idle,mic,offline}`) — 1 file, 6 routed state-IDs |
| course | 7 | Course, Level, Unit, LessonList, LessonDetail, DailyMission, ReviewEntry |
| course-library | 11 + 1 modal | + `UnlockConfirmModal.tsx` at feature root, `presentation: 'modal'` |
| lesson-session | 20 | Connecting, Greeting, Listen, Speak, BargeIn, Retry, Gentle, Silence, Offtopic, ActivityIntro/Done, LessonReady/Done, Audio{Error,Recovery}, GreetingResponse, ExitConfirm, ... |
| progress | 5 | Today, WordsPracticed, LessonSummary, ReviewNeeded, Celebration |
| parent | 6 | Gate, Today, History, Summary, Safety, Settings |
| purchase | 12 | Intro, HowItWorks, Included, Bundle, Shipping, Checkout, OrderConfirm, Activate, Arrived, FirstCourse, Privacy, Subscriptions |
| device | 7 | DeviceHome, DeviceOverview, DeviceSession, DeviceFirmware, DeviceLost, LCDLessonTurn, LCDLibrary |
| device/pairing | 13 | PairIntro, PairAdd, PairSearch, PairFound, PairConnecting, PairCode, PairRename, PairFirstLesson, PairOffline, PairFailed, ... |
| robot-mgmt | 12 | MyRobot, Status, Battery, Sound, Storage, Wifi, Firmware, MicTest, SpeakerTest, FactoryReset, OfflineHelp, Support |
| fallback | 9 + 1 overlay | + `ReconnectingOverlay.tsx` at feature root, `presentation: 'transparentModal'` |

**6 phantom states cleaned in conversion**: 5 get minimal stub `<Screen><Text>{state-id}</Text></Screen>` files (4 lesson-session edge-states + `parent_locked_out`); 1 deletes the state-id from `onboarding/states.ts` (`onb_coppa` — never built, no inbound `go()` edges).

---

## 4. Backend mapping (10 services → 11 with `support.api.ts`)

| Domain | Stub functions (today) | New endpoints needed |
|---|---|---|
| auth | login, logout, getChildProfile, saveChildProfile | + requestPasswordReset, refreshSession, verifyParentGate |
| home | getHomeHub, getDailyState | + dismissDailyNudge |
| course | getCourse, getLevel, getUnit, listLessons, getLesson, getDailyMission, getReviewQueue | OK |
| course-library | listLibrary, getCourseDetail, purchaseCourse, markComplete, getCompanion, confirmUnlock | + requestSync, pushCourseToDevice (own in `device.api`) |
| lesson-session | startSession, endSession, sendUtterance + WS channel | + getTurn, reportError, recoverSession, resumeSession, getCurrentSession |
| progress | getTodayProgress, getWordsPracticed, getLessonSummary, getReviewNeeded | OK |
| parent | getParentSummary, getParentToday, getParentHistory | + verifyParentGate, getSafetySettings, updateSafetySettings, getSettings, updateSettings |
| purchase | createOrder, getOrder, processPayment | + listBundles, estimateShipping, activateDevice, listSubscriptions, cancelSubscription, startTrial |
| device | pairDevice, getDeviceStatus, getFirmwareVersion | + confirmPairing, cancelPairing, renameDevice, reportLost, requestFirmwareUpdate, requestSync, pushCourseToDevice |
| robot-mgmt | getRobotStatus, getBattery, getStorage | + 9 endpoints (sound, firmware, wifi, mic/speaker test, factory reset, support) |
| support (NEW) | — | listFaq, openSupportTicket (powers `HelpFaqScreen`, `SupportScreen`) |

**Boundary decisions to flag in code review:**
- Canonical order creation lives in `purchase.api.ts:createOrder`. `course-library` calls into it via a feature-service wrapper.
- Canonical "push course to device" lives in `device.api.ts:pushCourseToDevice`.
- Parent-gate PIN MUST be server-verified — never trust client-side check.

---

## 5. AI conversion recipe (the deliverable)

For each `*Screen.jsx` file, an AI agent (Claude/Cursor) follows this 8-step recipe.

### Step 1 — Rename
`mv X<Name>Page.jsx X<Name>Screen.tsx` (mostly already done in Phase A — verify). Move into `features/<domain>/screens/`.

### Step 2 — Add screen-prop type
```ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, '<Name>Screen'>;

export default function <Name>Screen({ navigation, route }: Props) { /* ... */ }
```

### Step 3 — Replace web primitives (mechanical AST rules)
| Web | RN |
|---|---|
| `<div ...>` | `<Box ...>` (wraps RN `<View>`) |
| `<span ...>` / `<p ...>` | `<Text ...>` |
| `<button onClick={fn}>` | `<Pressable onPress={fn}>` |
| `<img src={s}>` | `<Image source={{ uri: s }}>` |
| `<input>` | `<TextInput>` |
| `<textarea>` | `<TextInput multiline />` |
| `<a href={x}>` | `<Pressable onPress={() => Linking.openURL(x)}>` |
| inline `<svg>...</svg>` | replace with existing `design-system/icons/<IconName />` — add to catalog if missing |
| `cursor: 'pointer'`, `:hover` | drop (RN has no hover) |
| `transition: ...` | drop, port to `Animated`/`Reanimated` |

### Step 4 — Box prop API (PICK ONE — flat props)
```tsx
<Box flex={1} padding={16} backgroundColor="paper" justifyContent="center" alignItems="center" />
```
Box accepts flat layout/spacing/color props (Restyle-style). NOT an `sx` wrapper. Token-aware: `padding={16}` maps to `tokens.spacing[16]` when 16 is a token key; otherwise raw DIPs.

### Step 5 — Style sidecars
- Move every `style={{...}}` literal into a sibling `<Name>Screen.styles.ts`:
```ts
import { StyleSheet } from 'react-native';
import { tokens } from '@/design-system/tokens';
export const styles = StyleSheet.create({
  root: { flex: 1, padding: tokens.spacing[16], backgroundColor: tokens.colors.paper },
});
```
- Replace `'var(--coral)'` strings with `tokens.colors.coral` (typed).
- Replace `padding: '12px 16px'` with `paddingVertical: 12, paddingHorizontal: 16`.
- Drop `boxShadow: '0 4px ...'` strings — use `tokens.shadows.card` descriptor.

### Step 6 — Extract state-config and data fetching to a hook
If the screen has a `cfg = { state1: {...}, state2: {...} }` block (e.g. `HomeHubScreen`'s 80-line config), move to `features/<domain>/hooks/use<Name>State.ts` that returns the typed slice:
```ts
import { useQuery } from '@tanstack/react-query';
import { getHomeHub } from '@/services/api/home.api';
export function useHomeState() {
  const { data, isLoading } = useQuery({ queryKey: ['home','hub'], queryFn: getHomeHub });
  return { variant: data?.variant ?? 'idle', data, isLoading };
}
```
The screen renders only:
```tsx
const { variant, data, isLoading } = useHomeState();
if (isLoading) return <Box flex={1} justifyContent="center" alignItems="center"><Text>Loading…</Text></Box>;
return <HomeHubView variant={variant} data={data} onStart={() => navigation.navigate('LessonReadyScreen')} />;
```

### Step 7 — Replace `go()` with typed navigation
`go('lesson_ready')` → `navigation.navigate('LessonReadyScreen')`. Delete the `go` prop entirely. Route params come from `route.params` (typed via `NativeStackScreenProps<...>`).

### Step 8 — Verify
- `npx tsc --noEmit <path>` exits 0
- The screen renders in iOS Simulator with no red box
- `grep -E "\\bgo\\(['\"]" <file>` returns 0 lines

### Common pitfalls
| Bug | Why | Right answer |
|---|---|---|
| Text directly in `<View>` | RN requires text inside `<Text>` | Wrap in `<Text>` |
| `flex: '1 1 auto'` shorthand | RN doesn't parse CSS shorthand | `flex: 1` |
| `padding: '12px'` strings | RN expects numbers (DIPs) | `padding: 12` |
| Hardcoded hex colors | Bypasses theme | `tokens.colors.<name>` |
| Reading `tweaks.<x>` prop | Devtools API removed | Use `route.params` or constants |
| Inline `<svg>` | RN needs `react-native-svg` | Use `design-system/icons/<IconName />` |
| `fetch()` in screen | Violates separation | Move to a hook |

---

## 6. Storage adapter API (`src/services/storage/storage.ts`)

```ts
export type Locale = 'en' | 'vi';

export const storage = {
  get(key: string): Promise<string | null>,
  set(key: string, value: string): Promise<void>,
  remove(key: string): Promise<void>,
  getLocale(): Promise<Locale | null>,
  setLocale(locale: Locale): Promise<void>,
};
```
Backed by `@react-native-async-storage/async-storage`. Used by `auth.store` + `device.store` rehydration on boot.

---

## 7. Architecture rules

1. **Feature isolation.** Features must not import from each other. Cross-feature components live in `components/` or `design-system/components/`. Enforced by ESLint `no-restricted-imports`.
2. **Design-system purity.** `design-system/` does not import from `features/`, `services/`, `store/`, `hooks/`. AnimationProvider web shim is deleted; RN uses Reanimated directly.
3. **Component import chain.** `components/` imports only from `design-system/` (+ react-native).
4. **Screen role.** `features/<domain>/screens/*Screen.tsx` renders + dispatches navigation only. No API calls, no business logic, no store writes beyond setting form state.
5. **Hook role.** `features/<domain>/hooks/use<Name>.ts` owns state + TanStack Query/Mutation + zustand selectors. Imports from `services/`, `store/`, feature types.
6. **API rule.** All network calls in `services/api/<domain>.api.ts`, typed in & out against `features/<domain>/types/`. No retries inside services (TanStack Query handles retry).
7. **State buckets**: server-data → TanStack Query; mutations → TanStack Mutation; cross-screen domain → zustand; ephemeral form → `useState`; cross-cutting → React Context.

---

## 8. Acceptance criteria (8, all executable)

```bash
WD=/Users/manhhodinh/Documents/TBOT/tbot-mobile/tbot-design
cd "$WD"

# AC-1 — All .jsx renamed to .tsx (zero .jsx remaining)
test "$(find src -name '*.jsx' | wc -l)" -eq 0

# AC-2 — DOM primitives removed from features/components
grep -rE '<(div|span|button|img|input|textarea|a|svg)\b[^A-Za-z]' src/features src/components 2>/dev/null
# expect: 0 lines

# AC-3 — No CSS-var strings in JS
grep -rE 'var\(--' src/features src/components src/design-system 2>/dev/null
# expect: 0 lines

# AC-4 — No `go(...)` prop calls remain
grep -rE "\bgo\([\"'][a-z_]+" src/features/ 2>/dev/null
# expect: 0 lines

# AC-5 — TypeScript clean
npx tsc --noEmit
# expect: exit 0

# AC-6 — Boots on iOS Simulator AND Android emulator (manual, with screenshot)
npx react-native run-ios
npx react-native run-android
# expect: no red box; screenshots saved to docs/qa/

# AC-7 — Cross-feature isolation (carried from Phase A)
grep -RHnE "from ['\"]@/features/" src/features/ 2>/dev/null | awk -F: '{path=$1;rest="";for(i=3;i<=NF;i++){rest=rest (i>3?":":"") $i};split(path,P,"/");src=P[3];if(match(rest,/@\/features\/[a-z-]+/)){imp=substr(rest,RSTART+11,RLENGTH-11);if(imp!=src)print}}'
# expect: 0 lines

# AC-8 — Flows toolchain regenerates clean after rename
npm run flows:fast && npm run flows:validate
# expect: both exit 0; nav-graph-data.json file paths end in .tsx
```

---

## 9. Known issues / explicit gaps (acknowledged, not blocking)

| Gap | Resolution |
|---|---|
| `react-native@0.74` strict-pins `react@18.2.0` exact — current `package.json` has `react@^18.3.1` | Pin `react: "18.2.0"` exact + add `overrides` block in B1 step |
| `@react-native/eslint-config@^0.74` (NOT `@latest` — `@latest` is 0.85.x) | Use `^0.74` |
| Three additional `.jsx` walker hardcodes in `scripts/flows/lib/repo.mjs:136,194,200` + regex in `nav-graph.schema.json:22` | Patch all 4 in the same commit that updates `extract-go-calls.mjs:66` walker |
| Walker accepts mixed `.jsx`/`.tsx` during mid-conversion | matcher: `p => p.endsWith('.tsx') \|\| p.endsWith('.jsx')`; tighten to `.tsx`-only at end |
| iOS deployment target | Use RN 0.74's `min_ios_version_supported` Podfile helper — don't hardcode |
| CocoaPods install | Run `cd ios && pod install` after every native dep change. Pin CocoaPods ≥1.13, Ruby ≥3.2, Node ≥18.18 |
| Mic permission | iOS: `NSMicrophoneUsageDescription` in `Info.plist`. Android: `RECORD_AUDIO` in `AndroidManifest.xml`. Required before any onboarding mic flow boots. |
| Hermes / Flipper | Hermes on (RN 0.74 default). Flipper deprecated — use Reactotron + React DevTools standalone. |
| Native modules (BLE, Stripe, Voice, OTA) | Out of scope — stubs only. Real wiring lives in the future production worktree (Phase E+). |
| Visual baseline capture | Optional. If desired: micro-patch `App.jsx` for `?screen=` URL param, run Puppeteer over `src/features/*/states.js` STATES arrays, write `docs/qa/baseline/<feature>/<state-id>.png`, commit before stripping Vite. |

---

## 10. Execution order (informal, no PR contract)

Follow this order; deviate where needed. Each step should leave the project bootable.

1. **Capture baseline** (optional) — if visual diff matters, micro-patch App.jsx for `?screen=` param + Puppeteer-screenshot all 115 states before next step.
2. **Toolchain bootstrap** — scaffold `ios/` + `android/` via `npx @react-native-community/cli init <scratch> --version 0.74` and copy out. Pin `react: "18.2.0"` exact. Add deps: `@react-navigation/native@^6`, `native-stack@^6`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg`, `react-native-reanimated@^3`, `@tanstack/react-query@^5`, `i18next`, `react-i18next`, `i18next-resources-to-backend`, `@react-native-async-storage/async-storage`. Remove `vite`, `@vitejs/plugin-react`, `@mermaid-js/mermaid-cli`. Add devDeps `typescript@^5.3`, `@react-native/eslint-config@^0.74`, `jest`, `@testing-library/react-native`, `@types/jest`, `babel-jest`. Add `tsconfig.json` with skipLibCheck/strict/paths. Delete `jsconfig.json`. Patch `babel.config.js` (reanimated plugin LAST). Run `cd ios && pod install`. Patch `Info.plist` + `AndroidManifest.xml` mic permission strings.
3. **Wipe web** — delete devtools/, App.jsx, main.web.jsx, index.html, vite.config.js, public/, lib/i18n/, langBridge.web.js, dom-style-injector.js, AnimationProvider.jsx. Move `locales/*` to `src/services/i18n/locales/`. Replace `i18n:check` chain (drop walker-smoke; fix scan-hardcoded to walk `src/features/**/*.{jsx,tsx}`). Stub `App.tsx` renders `<Text>boot</Text>`. `npx react-native start && npx react-native run-ios` shows "boot".
4. **DS primitives + token .ts + DS components .tsx** — Box, Text, Pressable, Image, Stack, Spacer. Convert design-system/* `.jsx → .tsx`. Robot uses Reanimated worklets (not DOM injection).
5. **Cross-feature `components/` .tsx** — Screen composite + ErrorBoundary + Device* + Onb* + TopBar/LessonHeader/MicButton.
6. **Per-feature waves** — apply §5 recipe to each feature, easiest first: auth → fallback → home → progress → parent → course → course-library → purchase → robot-mgmt → device → device/pairing → onboarding → lesson-session. Patch all 4 `.jsx` walker hardcodes (extract-go-calls.mjs:66 + lib/repo.mjs:136,194,200 + nav-graph.schema.json:22) in the first wave. Rename `UnlockConfirmModal.jsx` + `ReconnectingOverlay.jsx` in their waves. Create 5 phantom-state stub screens; delete `onb_coppa` state-id. Regen `nav-graph-data.json` after the last wave.
7. **Backend types + RootNavigator** — type all 10 `api.js → api.ts` against `features/<domain>/types/`. Add `support.api.ts`. Resolve order/purchase + device/course-library boundary overlaps. Build `RootNavigator.tsx` with typed `RootStackParamList` (115 screens + 2 modal/overlay = 117 entries).
8. **Final cleanup** — remove `proto-shell` ghosts, flip ESLint to error, run all 8 ACs.

---

## 11. Changelog

- 2026-05-11 v1 (1011 lines) — comprehensive plan with 9 PRs + 20 ACs + 4 critic rounds. Each round caught new factual errors; pattern did not converge.
- 2026-05-11 **v2 (this file)** — drastically simplified per critic round-4 recommendation. Kept: verified inventory (§1-3), backend mapping (§4), AI recipe (§5), architecture rules (§7), executable ACs (§8). Dropped: 9-PR contract, ADR alternatives, exhaustive risk register, per-section reviewer checklist. R4 critical fixes incorporated inline: `react: "18.2.0"` pin (was `^18.3.1`), `@react-native/eslint-config@^0.74` (was `@latest`), 4 .jsx walker hardcodes (was 1), Box flat-prop API (was sx), `Locale` type defined, locales actual path (was `public/locales/`), walker line 66 (was 67), `min_ios_version_supported` helper (don't assert value).
