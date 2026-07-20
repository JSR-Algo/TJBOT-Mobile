# tjbot-mobile — System Contracts

All contracts consumed or produced by the tjbot-mobile app. Violating any
contract without cross-repo approval is a HARD STOP.

---

## 1. HTTP API contract (sys-01 / sys-02 consumer)

### Source of truth

`/Users/manhhodinh/Documents/tjbot/migrate-ui-ux-to-mobile-app-docs/api/openapi.json`
(symlink → `/Users/manhhodinh/Documents/tjbot/docs/site/api/openapi.json`)

tjbot-mobile is a consumer. Never modify openapi.json through the symlink.
If the app needs a new endpoint, escalate to tjbot-backend.

### Axios client

Pre-PR4 location: `src/api/client.ts`
Post-PR4 location: `src/services/http/client.ts`

Critical invariants:
- `baseURL`: resolved from `Config.API_BASE_URL` (env var, never hardcoded)
- `timeout`: 30 000 ms (Render free-tier cold starts can reach 20s; 15s was too tight)
- `Content-Type`: `application/json` on all requests
- Request interceptor: reads `getAccessToken()` from SecureStore, injects
  `Authorization: Bearer <token>` header
- Response interceptor: on 401 with `_retry` not set:
  1. If another refresh is in flight (`isRefreshing()`), enqueue the request
     in `refresh-queue` and await the queue resolution
  2. Otherwise: set `isRefreshing(true)`, call `refreshAuthTokens(BASE_URL)`,
     on success: `processQueue(null, access_token)`, retry original request
  3. On refresh failure: `processQueue(refreshError, null)`, `clearAuthTokens()`,
     call `onAuthInvalidated()` to kick UI back to AuthStack
- `setAuthInvalidatedHandler(handler)` must be called by `AuthContext` or
  `auth.store` on mount; null-safe (handler is best-effort, swallows errors)
- `normalizeError(error)` wraps all non-401 errors before rejection

Do not bypass the refresh queue for any new domain API module. The queue
serializes concurrent token-refresh attempts — removing it causes race conditions.

### Token storage

Pre-PR4 location: `src/api/tokens.ts`
Post-PR4 location: `src/services/http/tokens.ts`

Tokens stored in `expo-secure-store` (iOS Keychain / Android Keystore).
Never store tokens in AsyncStorage — no encryption guarantee.
Key names are contract: do not rename without auditing all callers.

### 9 existing domain API modules (pre-PR4)

Located at `src/api/{auth,account,ai,controls,dashboard,devices,households,learning,notifications}.ts`

11 post-PR4 target modules (tjbot-design layout):
`src/services/api/{auth,account,ai,content,course,device,household,learning,lesson,parent,purchase}.ts`

---

## 2. WebSocket / Realtime protocol (sys-04 consumer)

Post-PR4 location: `src/services/ws/observer.ts`

Protocol: JSON frames over `wss://`. Message shapes defined in:
`migrate-ui-ux-to-mobile-app-docs/sequences/04-realtime/`

tjbot-mobile is a consumer — it reads and emits events as specified in those
sequence diagrams. Do not change message shapes. If a new event type is needed,
escalate to tjbot-backend.

Invariants:
- Connection established only after auth (token available in SecureStore)
- Reconnect with exponential backoff on disconnect
- All lesson-session realtime frames flow through `observer.ts` — do not
  open a second WebSocket connection for lesson-session features

---

## 3. BLE wire protocol (sys-18 consumer)

Location: `src/services/ble/` (post-PR4)

tjbot-mobile consumes the BLE protocol specified in:
`migrate-ui-ux-to-mobile-app-docs/sequences/18-wire-protocol/`

Library: `react-native-ble-plx@3.5.x`

**HARD STOP**: Any change to BLE message schemas, service UUIDs, or
characteristic UUIDs requires escalation to tjbot-firmware AND tjbot-backend.
These values are burned into firmware — changing them unilaterally bricks
paired devices in the field.

Invariants:
- Service UUID and characteristic UUIDs are constants — do not change without firmware coordination
- Pairing flow state machine lives in `src/features/device/pairing/` — changes
  must be reflected in `migrate-ui-ux-to-mobile-app-docs/state-machines/device-pairing.state.mmd`
- BLE operations run on a dedicated queue — never block the JS thread

---

## 4. Authentication and COPPA (sys-01 consumer)

### SecureStore token keys (contract — do not rename)

Defined in `src/api/tokens.ts` (pre-PR4) / `src/services/http/tokens.ts` (post-PR4).
Renaming a key without a migration script logs users out in production.

### COPPA legal text

Files: `src/features/auth/screens/CoppaScreen.tsx` and
       `src/features/onboarding/screens/CoppaConsentScreen.tsx`

These screens contain legally reviewed copy. Do not modify the consent text
without explicit user sign-off. When resolving the collision between tjbot-mobile
and tjbot-design COPPA screens (PR5), run `git log --follow` on tjtjboth files to
identify the most recently legal-reviewed copy and keep that one.

COPPA copy changes are a **cross-repo escalation** — see tjbot-backend and
`docs/site/legal/coppa-*.md`.

### Auth gate

`RootNavigator.tsx` (pre-PR3: `src/navigation/`, post-PR3: `src/app/`)
presents AuthStack when unauthenticated, OnboardingStack when authenticated
but not onboarded, MainTabs otherwise. This gate is driven by `AuthContext`
or `auth.store` — tjtjboth expose `isAuthenticated` and `isOnboarded` booleans.

`setAuthInvalidatedHandler` must be called on mount so the HTTP client can
force navigation to AuthStack on token-refresh failure.

---

## 5. Observability contracts

### Sentry (error tracking)

Init: `src/services/observability/sentry.ts` (post-PR4)
Package: `@sentry/react-native@7.x`

**Required tags on every event:**
- `feature`: the feature slice name (e.g. `lesson-session`, `auth`)
- `screen`: the screen component name (e.g. `LoginScreen`)

Do not capture PII in Sentry breadcrumbs. User ID is allowed (it is
pseudonymous in the system). Raw email/name must not appear in events.

### PostHog (product analytics)

Init: `src/services/observability/posthog.ts` (post-PR4)
Package: `posthog-react-native@3.6.x`

**Event naming convention (contract):**
`<domain>_<verb>_<noun>` in snake_case.

Examples: `auth_login_success`, `lesson_session_started`, `device_pair_completed`

Do not invent new event names without checking PostHog dashboard for conflicts.
Breaking an existing event name drops dashboard panels — treat as a breaking change.

---

## 6. AI (Gemini) contract

Location: `src/services/ai/gemini.ts` (post-PR4)
Package: `@google/genai@1.49.x`

Gemini client is an internal implementation detail of tjbot-mobile.
No cross-repo contract. However:
- AI safety filters live in tjbot-ai-services (sys-05) — tjbot-mobile only
  sends prompts through the backend relay; it does NOT invoke Gemini directly
  in production flow. The local `gemini.ts` is for development + offline fallback.
- Do not add new Gemini invocations that bypass the backend safety relay.

---

## 7. ESLint custom rule (lint contract)

File: `eslint-rules/no-voice-timing-in-shared.js`
Rule ID: `tjbot-voice/no-voice-timing-in-shared`
Severity: `error`

This rule bans FSM-affecting timers, RNLAS imports, and `Platform.OS` branches
in shared voice layers (plan v2 §11.7). Do not disable or weaken this rule.
Do not add `// eslint-disable` comments for this rule without a recorded justification.

---

## 8. TypeScript contract

Config: `tsconfig.json` (extends `expo/tsconfig.base`)

`strict: true` — this is a hard contract. All new code must pass:
- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictPropertyInitialization`

Forbidden suppressions:
- `any` type annotation (use `unknown` + narrowing)
- `@ts-ignore`
- `@ts-expect-error` (unless the underlying platform type is demonstrably wrong
  and a GitHub issue is linked in the same comment)
- `unknown as T` casts without a runtime type guard

---

## 9. Navigation route constants (PR3+ contract)

File: `src/app/navigation/routes.ts`

Route names are constants — not string literals in screen calls. Detox e2e
tests reference these constants. Renaming a route without updating:
1. `routes.ts` constant
2. All Detox test specs that reference the old name
3. `linking.ts` deep-link mapping
...is a breaking change that will fail Detox e2e.
