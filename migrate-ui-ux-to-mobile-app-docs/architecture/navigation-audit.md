# Navigation Audit & Cleanup Report

**Generated**: 2026-05-12
**Branch**: `fix/detox-auth-onboarding-specs` @ post-migration head

## Summary

| Metric | Count |
|---|---|
| Total screen files (`src/features/*/screens/*.tsx`) | 120 |
| Routes registered in navigators | 130 |
| Route types declared in `RootStackParamList` | 125 |
| Routes in `MainTabParamList` (separate tab params) | 5 |
| Orphan screen files (file with no registration) | **0** |
| Dead route declarations removed in this audit | **17** |
| Final type-safety: `npx tsc --noEmit` | **0 errors** |

## 1. Screen Inventory

All 120 screen files live under `src/features/*/screens/` organized by domain:

| Domain | Screens | Navigator |
|---|---|---|
| auth | 3 (Login/LoginError/ChildProfile) | AuthStack |
| onboarding | 9 (Splash/Welcome/MicAsk/Trust/Intro×4/FirstLesson) | OnboardingStack |
| fallback | 9 (NetworkError/AppError/MicMissing/VoiceFailed/AudioRecovery/SafetyRedirect/HelpFaq/KidSettings/LessonResume) | ModalStack |
| home | 1 (HomeHub) | MainTabs (Home tab) |
| course | 7 (Course/Level/Unit/LessonList/LessonDetail/ReviewEntry/DailyMission) | ModalStack |
| course-library | 11 (CourseLibrary/CourseDetail/BuyCourse/CourseAdded/CourseComplete/CourseLocked/NeedsSync/SendToRobot/RobotReady/Running/Companion) | ModalStack |
| lesson-session | 24 (Connecting/Greeting/LessonReady/RobotListening/UserSpeaking/RobotSpeaking/Thinking/ActivityIntro/ActivityDone/Success/LessonDone/ExitConfirm/Retry/Silence/Bargein/Gentle/Offtopic/Safety/CostCapped/ParentStopped/TimedOut/AudioError/AbandonedDisconnect/Reconnecting) | ModalStack |
| progress | 5 (TodayProgress/WordsPracticed/LessonSummary/ReviewNeeded/Celebration) | ModalStack |
| parent | 7 (ParentGate/ParentSummary/ParentToday/ParentHistory/ParentSafety/ParentSettings/ParentLockedOut) | ModalStack |
| device | 7 main (DeviceHome/DeviceOverview/DeviceFirmware/DeviceSession/DeviceLost/LCDLessonTurn/LCDLibrary) + 13 pairing (PairIntro/Search/Found/Connecting/Code/Add/Rename/Wifi/WifiPassword/Offline/Failed/Success/FirstLesson) | ModalStack |
| purchase | 12 (PurchaseIntro/HowItWorks/Bundle/Included/Checkout/OrderConfirm/Shipping/Arrived/Activate/FirstCourse/Privacy/Subscriptions) | ModalStack |
| robot-mgmt | 12 (MyRobot/RobotStatus/RobotBattery/RobotStorage/RobotFirmware/RobotWifi/RobotSound/MicTest/SpeakerTest/FactoryReset/OfflineHelp/Support) | ModalStack |

**Classification (per route registration)**:
- Linked: 120/120 screens ✅
- Partially linked: 0
- Orphaned screen files: 0
- Duplicate registrations: 0
- Invalid: 0

## 2. Navigation Flow Analysis

```mermaid
flowchart TD
    Boot([App launch]) --> AuthGate{AuthContext<br/>isAuthenticated?}

    AuthGate -- "false" --> AuthStack
    AuthGate -- "true" --> ModalStack

    subgraph AuthStack
        LoginScreen --> LoginErrorScreen
        LoginErrorScreen --> ChildProfileScreen
        ChildProfileScreen --> IntroListenScreen
    end

    LoginScreen -.useAuth.login success.-> HomeHubScreen

    subgraph OnboardingStack [OnboardingStack reachable from features]
        SplashScreen -- "auto 1.7s" --> WelcomeScreen
        WelcomeScreen --> IntroListenScreen
        IntroListenScreen --> IntroSpeakScreen
        IntroSpeakScreen --> IntroRetryScreen
        IntroRetryScreen --> IntroCelebrateScreen
        IntroCelebrateScreen --> TrustScreen
        TrustScreen --> MicAskScreen
        MicAskScreen --> FirstLessonEntryScreen
        FirstLessonEntryScreen --> LessonReadyScreen
    end

    subgraph ModalStack
        HomeHubScreen --> MainTabs

        subgraph MainTabs
            Home[HomeHubScreen]
            Devices[DeviceHomeScreen]
            Activity[ActivityStub TODO PR-future]
            Progress[TodayProgressScreen]
            Profile[ParentSummaryScreen]
        end

        HomeHubScreen --> CourseScreen
        HomeHubScreen --> CourseLibraryScreen
        HomeHubScreen --> ReviewNeededScreen
        HomeHubScreen --> TodayProgressScreen
        HomeHubScreen --> ParentGateScreen
        HomeHubScreen --> ParentSettingsScreen

        CourseLibraryScreen --> CourseDetailScreen
        CourseDetailScreen --> BuyCourseScreen
        BuyCourseScreen --> CheckoutScreen
        CheckoutScreen --> OrderConfirmScreen
        OrderConfirmScreen --> ShippingScreen
        ShippingScreen --> ArrivedScreen
        ArrivedScreen --> ActivateScreen
        ActivateScreen --> FirstCourseScreen

        LessonReadyScreen --> ConnectingScreen
        ConnectingScreen --> GreetingScreen
        GreetingScreen --> RobotListeningScreen
        RobotListeningScreen --> UserSpeakingScreen
        UserSpeakingScreen --> ThinkingScreen
        ThinkingScreen --> RobotSpeakingScreen
        RobotSpeakingScreen --> SuccessScreen
        SuccessScreen --> LessonDoneScreen

        PairIntroScreen --> PairSearchScreen
        PairSearchScreen --> PairFoundScreen
        PairFoundScreen --> PairCodeScreen
        PairCodeScreen --> PairConnectingScreen
        PairConnectingScreen --> PairSuccessScreen
        PairConnectingScreen --> PairFailedScreen

        ParentGateScreen --> ParentSummaryScreen
        ParentSummaryScreen --> ParentSettingsScreen
        ParentSettingsScreen --> ParentSafetyScreen
        ParentSettingsScreen --> ParentHistoryScreen

        MyRobotScreen --> RobotStatusScreen
        RobotStatusScreen --> RobotBatteryScreen
        RobotStatusScreen --> RobotStorageScreen
        RobotStatusScreen --> RobotFirmwareScreen
    end

    subgraph ModalGroup [Modal presentation]
        UnlockConfirmScreen
        ReconnectingOverlay
    end

    LessonResumeScreen -.fallback.-> ModalGroup
    CourseLockedScreen -.gate.-> UnlockConfirmScreen
```

### Observed flow patterns

- **Auth gate**: `src/app/RootNavigator.tsx` switches between AuthStack and ModalStack based on `useAuth().isAuthenticated`. TODO(PR-future): add `isOnboarded` second-level gate so first-time authenticated users see OnboardingStack before MainTabs.
- **MainTabs as ModalStack root**: `<Stack.Screen name="HomeHubScreen" component={MainTabs} />`. Tabs swap their content; pushing on ModalStack overlays tabs.
- **State-machine-driven nav**: lesson-session screens use FSM (`states.ts`) for transitions — many screens never have a literal `navigation.navigate('XScreen')` caller because navigation is computed from FSM state.
- **Variable-name nav**: IntroFrame passes `next` as a prop; screens like IntroSpeakScreen, IntroRetryScreen are reached via `navigation.navigate(next)` not literal name.

### Broken flows / dead-ends

| Symptom | Root cause | Status |
|---|---|---|
| Activity tab shows stub `<View />` | No tbot-design Activity feature exists | Documented `TODO(POST-PR7-ACTIVITY-TAB)`. Defer. |
| Social-auth Google/Apple buttons navigate to `ChildProfileScreen` without auth | OAuth providers not wired | Documented `TODO(POST-PR5-SOCIAL-AUTH)`. |
| COPPA consent missing in flow | Production CoppaConsentScreen retired per drop-old-UI directive | Documented `TODO(POST-PR5-COPPA-RE-IMPLEMENTATION)`. **Blocks under-13 onboarding (regulatory).** |
| Parent-setup screens (Household/AddChild/Interest/DeviceSetup/VoiceTest) missing | Retired per drop-old-UI directive | Documented `TODO(POST-PR5-PARENT-ONBOARDING-RE-IMPLEMENTATION)`. |

### Circular flows / back behavior

- LoginScreen ↔ LoginErrorScreen ↔ ChildProfileScreen — closed within AuthStack. No leak into ModalStack pre-auth.
- TrustScreen → MicAskScreen → "Not now" → LoginScreen (cross-stack escape). Documented; consider replacing with proper escape.
- IntroFrame Skip → TrustScreen (consistent across all 4 Intro screens).

## 3. Final Navigation Architecture

```
src/app/
  RootNavigator.tsx          — auth-gate + provider wrap
  AppProviders.tsx           — QueryProvider + ThemeProvider + AuthProvider
  navigation/
    AuthStack.tsx            — 3 screens (Login/LoginError/ChildProfile)
    OnboardingStack.tsx      — 9 screens (Splash/Welcome/Intro×4/Trust/MicAsk/FirstLesson)
    MainTabs.tsx             — 5 tabs (Home/Devices/Activity/Progress/Profile)
    ModalStack.tsx           — 113 stack screens + 2 modal-group screens, hosts MainTabs as root screen
    routes.ts                — RootStackParamList (125 routes) + MainTabParamList (5 tabs)
    linking.ts               — deep-link config (carried from tbot-design)
  screens/
    ListenScreen.tsx         — alias → @/features/lesson-session/screens/RobotListeningScreen
    SpeakScreen.tsx          — alias → @/features/lesson-session/screens/UserSpeakingScreen
    DevicePairWifiScreen.tsx — alias → @/features/device/pairing/screens/PairWifiScreen
  providers/
    AppProviders.tsx
    QueryProvider.tsx
    ThemeProvider.tsx
```

### Navigator responsibilities

| Navigator | Domain | Initial route | Reachable when |
|---|---|---|---|
| AuthStack | Unauthenticated parent | LoginScreen | `!isAuthenticated` |
| OnboardingStack | Kid intro flow | SplashScreen | First-launch (TODO: needs `isOnboarded` gate) |
| MainTabs | Authenticated daily UX | Home tab | `isAuthenticated` |
| ModalStack | Domain detail screens + modal overlays | HomeHubScreen → MainTabs | `isAuthenticated`, mounted by RootNavigator |

### Why no separate AppNavigator/OrderNavigator/PaymentNavigator

The prompt template's example (auth/main/orders/payment) describes a generic SaaS flow. **TBOT is a kids' robot learning app**, not an order-fulfillment app. The actual business domains are: auth, kid-onboarding, learning (course + lesson-session), device pairing, parent oversight, robot management, purchase, fallback. These map to the navigators above. There is no separate Order/Payment lifecycle — purchase is a 12-screen flow inside ModalStack, not its own navigator.

## 4. Route Normalization

All 125 stack routes follow `<NounVerb>Screen` convention (e.g. `LessonDetailScreen`, `PairWifiPasswordScreen`). Tab names are bare (Home/Devices/Activity/Progress/Profile) by React Navigation convention.

**Bad patterns absent**: no `Page1`, `ScreenTest`, `NewPage`. Names are semantic.

### Removed in this audit (17 dead aliases)

These were transitional aliases added in PR5 for backward-compatibility with retired production screens. Now that production screens are deleted (PR7), the aliases are dead. Removed from `RootStackParamList`:

| Removed alias | Reason |
|---|---|
| AddChild, HouseholdCreate, InterestSetup, DeviceSetupIntro, VoiceTest, CoppaConsent | Production onboarding retired (PR5) |
| Signup, ForgotPassword, Coppa, Login, Welcome | Production auth retired (PR5) |
| DeviceDetail, DeviceSetup, NotificationPrefs, ParentControls | Production main-app retired (PR7) |
| GeminiConversation | Production Gemini screen retired (PR6) |
| RobotDemo | Production demo screen retired (PR7) |

## 5. Auth Flow Review

| Screen | Protection | Notes |
|---|---|---|
| LoginScreen, LoginErrorScreen, ChildProfileScreen | Guest-only | AuthStack renders only when `!isAuthenticated`. After login, `navigation.replace('HomeHubScreen')` → enters ModalStack/MainTabs. |
| OnboardingStack screens | Currently rendered as part of ModalStack | Reached from WelcomeScreen → IntroListenScreen path. Not gated by `isOnboarded` yet. |
| MainTabs + ModalStack screens | Protected | Rendered only when `isAuthenticated`. |
| Session expiration | Handled at HTTP layer | `src/services/http/client.ts:37` `onAuthInvalidated` callback fires on 401 + refresh failure → `AuthContext.logout()` → AuthStack remounts. |
| Logout | Reset behavior | `useAuth().logout()` clears tokens via SecureStore + calls `onAuthInvalidated`. RootNavigator switches stack on next render. |

## 6. State Machine Alignment

Feature `states.ts` files (one per `src/features/*/`) define FSMs. Navigation transitions are driven by these states in lesson-session, device-pairing, purchase, parent-gate flows. The FSMs are documented in `migrate-ui-ux-to-mobile-app-docs/erd/_global/state-machine-alignment.md`.

Known invariants:
- **Lesson-session FSM**: Connecting → Greeting → LessonReady → (Listening/Speaking/Thinking loop) → Success → LessonDone. No screen accessible mid-FSM-violation.
- **Pairing FSM**: PairIntro → PairSearch → PairFound → PairCode → PairConnecting → (PairSuccess | PairFailed). No bypass.
- **ParentGate FSM**: ParentGate → (correct PIN) → ParentSummary | (3 fails) → ParentLockedOut.
- **Purchase FSM**: PurchaseIntro → Bundle → Included → Checkout → OrderConfirm → Shipping → Arrived → Activate → FirstCourse.

## 7. Back Stack & Modal Review

- **Modal group**: `<Stack.Group screenOptions={{ presentation: 'modal' }}>` hosts UnlockConfirmScreen + ReconnectingOverlay. Dismiss = `navigation.goBack()`.
- **MainTabs as Stack root**: pushing on ModalStack from a tab adds to the outer stack, NOT the tab's inner state — back behaves correctly.
- **Replacement rules**: LoginScreen uses `navigation.replace('HomeHubScreen')` on success (no back to login from authenticated state).
- **Reset on logout**: `RootNavigator` swaps subtree (AuthStack vs ModalStack) when auth state changes. Navigation state isn't `reset()`-ed manually; React Navigation handles unmount cleanup.

## 8. Multi-Agent Ownership

| Lane | Files (write surface) | Routes owned |
|---|---|---|
| auth | `src/features/auth/`, `src/app/navigation/AuthStack.tsx` | LoginScreen, LoginErrorScreen, ChildProfileScreen |
| onboarding | `src/features/onboarding/`, `src/app/navigation/OnboardingStack.tsx` | Splash/Welcome/Intro×4/Trust/MicAsk/FirstLesson |
| learning | `src/features/{course,course-library,lesson-session,home}/` | 7+11+24+1 = 43 routes |
| device | `src/features/device/`, `src/app/screens/DevicePairWifiScreen.tsx` | 7 device + 13 pairing |
| parent | `src/features/parent/` | 7 parent screens |
| progress | `src/features/progress/` | 5 progress screens |
| purchase | `src/features/purchase/` | 12 purchase screens |
| robot-mgmt | `src/features/robot-mgmt/` | 12 robot-mgmt screens |
| fallback | `src/features/fallback/` | 9 fallback + ReconnectingOverlay |
| nav-infra | `src/app/navigation/{ModalStack,MainTabs,routes,linking}.tsx`, `src/app/RootNavigator.tsx` | structural — DO NOT cross-lane edit |

No two lanes write the same file. Conflicts surface only in `routes.ts` (single owner: nav-infra) and `ModalStack.tsx` (registers all domain screens; cross-lane PRs queue serially through nav-infra reviewer).

## 9. React Native Implementation Plan

**Stack**: React Navigation v7 (`@react-navigation/native-stack` + `@react-navigation/bottom-tabs`). TypeScript path alias `@/*` → `./src/*` via `tsconfig.json` + `babel-plugin-module-resolver`.

**Hierarchy** (already implemented):
```
NavigationContainer
└── RootNavigator (auth-gated)
    ├── AuthStack (Stack.Navigator)
    └── ModalStack (Stack.Navigator)
        ├── Stack.Screen name="HomeHubScreen" component={MainTabs}
        │   └── Tab.Navigator (5 tabs)
        ├── ... (108 domain screens)
        └── Stack.Group screenOptions={presentation:'modal'}
            └── UnlockConfirmScreen, ReconnectingOverlay
```

**Type safety**:
- `RootStackParamList` exported from `routes.ts`
- Each screen typed via `NativeStackScreenProps<RootStackParamList, 'XScreen'>`
- Tab screens use `MainTabParamList` + `BottomTabScreenProps`
- `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` for hook access

**Deep linking**: `src/app/navigation/linking.ts` carries the deep-link prefix + per-route patterns from tbot-design. Tested via `scripts/check-route-coverage.mjs`.

## 10. Cleanup Report

### Removed in this session

- 17 dead route-alias declarations from `src/app/navigation/routes.ts` (legacy production-screen names retired in PR5–PR7)

### Removed in prior PRs (PR1–PR8)

- All production `src/screens/` (~40 screens: dashboard, activity, controls, device, profile, robot-demo, gemini, auth, onboarding)
- `tbot-design/` entire subdirectory (after all content was promoted)
- `src/navigation/` old navigators (after `src/app/navigation/` superseded)
- Dual `.js`+`.ts` state files in 5 features (`.ts` won)

### Renamed routes

None in this audit — all 125 stack routes preserve their PR3-established names for deep-link stability.

### Removed placeholder flows

- `StubScreen` registrations in `ModalStack.tsx`: 0 remain (all replaced with real components across PR5–PR7)

## 11. Implementation Readiness

| Domain | Status | Notes |
|---|---|---|
| auth (LoginScreen + LoginError + ChildProfile) | **READY** | wired to useAuth + production AuthContext; runtime-verified |
| onboarding (kid-intro flow) | **READY** | full 9-screen flow; linear progression |
| learning (home/course/course-library/lesson-session) | **READY** | FSM-driven; 43 screens; UnlockConfirmModal modal wired |
| device + pairing | **NEEDS MINOR FIXES** | BLE wiring still TBD per PR7 docs; screens present; FSM exists |
| parent | **READY** | ParentGate + ParentSummary cluster wired |
| progress | **READY** | 5 screens; reached from Home/ParentSummary |
| purchase | **NEEDS MINOR FIXES** | 12-screen flow registered; payment provider integration is TODO |
| robot-mgmt | **READY** | 12 screens registered |
| fallback | **READY** | 9 fallback screens wired in ModalStack |
| Activity tab | **NEEDS MAJOR REFACTOR** | currently a stub; no tbot-design feature exists |
| OnboardingStack auth-gate | **NEEDS MINOR FIXES** | `isOnboarded` boolean missing in AuthContext; OnboardingStack reachable but not auto-routed |
| COPPA consent integration | **NEEDS MAJOR REFACTOR** | regulatory blocker; production version retired without tbot-design replacement |
| Parent setup (Household/AddChild/InterestSetup/DeviceSetupIntro/VoiceTest) | **NEEDS MAJOR REFACTOR** | retired without replacement |
| Signup / ForgotPassword / non-social auth | **NEEDS MAJOR REFACTOR** | retired without replacement |
| Social OAuth wiring | **NEEDS MINOR FIXES** | buttons exist; provider integration TBD |

## 12. Files modified by this audit

- `src/app/navigation/routes.ts` — removed 17 dead alias declarations (lines 25–43 in pre-audit)
- `migrate-ui-ux-to-mobile-app-docs/architecture/navigation-audit.md` — this document
