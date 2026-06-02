# 0009 Biometric Cache for Parent JWT Freshness

Date: 2026-05-12

## Status

Accepted

## Context

ADR-0005 D6 commits to a 60-second freshness threshold for sensitive parent actions: every purchase, controls update, child-profile edit, safety override, subscription mutation, and account deletion requires a `parent_session` JWT minted in the last 60 seconds. The motivation is COPPA-grade defense against a child who pockets an unlocked parent phone and tries to spend their parents' money.

The straight implementation (no caching) is awful UX: parents have to re-type their PIN every time they want to:

- buy a course
- pause a subscription
- update a payment method
- approve a child's unlock request
- adjust a safety setting
- view sub-cancel

Three actions in 90 seconds = three PIN entries. In user research this is the single most-likely place we lose engaged parents.

We want a way to "stretch" the 60-second window without weakening the guarantee that **a child holding the phone cannot satisfy the freshness check**. The natural lever is OS biometric:

- iOS: FaceID / TouchID via `LocalAuthentication.framework` → `react-native-keychain` exposes biometric-gated reads.
- Android: `BiometricPrompt` via `androidx.biometric:biometric` → exposed through `expo-local-authentication` or `react-native-biometrics`.

If we can cache the parent_session JWT locally encrypted under a biometric-bound key, then an OS biometric prompt acts as a "freshness refresh" — re-stamps `issued_at` to `now()` without a server round trip. The biometric is device-bound and parent-bound, which is exactly the property we want.

Constraints surfaced during P5–P9 plan reviews:

- Shared family devices DO exist (one parent's phone, but kids use it for play). FaceID on iOS is single-user per device, but Android allows multi-fingerprint enrollment. We can't assume biometric = "this parent".
- Re-stamping `issued_at` is a client-side claim; the server must accept or reject it independently. We can't write to the JWT we previously got from the server.
- The 60-second freshness is the SERVER's rule. The server can't see whether biometric was used. So caching has to extend the trust window the SERVER honors, not the client's view of an immutable JWT.

## Decision

**Bind the parent_session JWT to a biometric-gated Keychain entry. OS biometric unlock is the "refresh primitive" — but the server-side trust extension is achieved via a NEW endpoint `POST /v1/parent/session/refresh-freshness` that the server can rate-limit and audit, not by client-side mutation.**

Concrete commitments:

| # | Commitment |
|---|---|
| D1 | Server-issued `parent_session` JWT is stored in OS biometric Keychain: `react-native-keychain` `setGenericPassword(jti, jwt, { accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET, accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY })`. The JWT cannot leave the device. |
| D2 | New endpoint `POST /v1/parent/session/refresh-freshness` accepts `{jti}` + bearer of the existing parent JWT. Returns `{jti (same), issued_at (new = now()), idle_until (new), expires_at (UNCHANGED)}`. The 24-hour absolute expiry from ADR-0005 D5 is **not** extendable; only the freshness window is. |
| D3 | Client flow before any sensitive action: (a) check `parent.store.isJwtFresh()`; (b) if stale BUT `hasValidSession()` is true, prompt biometric via OS; (c) on biometric success, read the cached JWT from Keychain, call `/refresh-freshness`, write the new claims back to Keychain + parent.store. (d) On biometric failure or absence, fall back to full PIN entry per ADR-0005. |
| D4 | Rate limit on `/refresh-freshness`: 30 calls per parent_session per 24h. A parent who's refreshing more than once every 48 minutes is doing something programmatic; we cap to keep audit volume bounded. |
| D5 | Biometric is a **convenience layer**, never a substitute for PIN. First-time setup of biometric still requires a fresh PIN entry. Disabling biometric is a one-tap toggle in `parent_settings → Safety & Privacy → Biometric unlock`. |
| D6 | Multi-enrollment defense: on each `/refresh-freshness`, the server checks that the user's current `biometric_enrollment_id` (a hash we issued at setup, also stored in Keychain) matches the JWT's `biometric_enrollment_id` claim. If a user adds a new fingerprint, OS-level `BiometryAny` permission revokes our Keychain access automatically (iOS); on Android, we use `setInvalidatedByBiometricEnrollment(true)` on the key. New biometric enrollment → next biometric unlock fails → falls back to PIN. |
| D7 | Audit: `audit_logs` row written on every `/refresh-freshness` call with `event_type='parent.session.freshness_refreshed'`, `payload={biometric_used: true|false, jti}`. Visible to primary parent. |
| D8 | The previously sensitive screen (`UnlockConfirmModal`, `parent_settings → Subscription → Cancel`, etc.) calls a shared helper `requireFreshParentJwt()` that returns a Promise. Helper resolves on: (a) JWT already fresh, OR (b) biometric refresh succeeded. Rejects on biometric failure (host routes to ParentGateScreen). |
| D9 | Biometric is **off by default**. Parents opt in from `parent_settings → Safety & Privacy → Biometric unlock`. Opt-in flow: enter PIN once → biometric prompt to bind → success persists. We do not silently enable biometric. |
| D10 | Server tracks `parent_sessions.biometric_enabled` boolean. Used for analytics on adoption and for forcing biometric setup on hard reset (e.g., parent gets new phone — server can prompt fresh biometric bind on first login). |

## Drivers

In priority order:

1. **UX cost is the single biggest blocker to parents adopting the security model.** Without biometric, the realistic outcome is parents disable the freshness gate via support tickets, or stop using the parent surfaces entirely.
2. **Biometric is the strongest device-bound identity proof we have access to.** FaceID / BiometricPrompt are both hardware-secure-enclave-backed; a child cannot satisfy the prompt with a parent's screenshot or sleeping face (iOS attention detection, Android liveness).
3. **Server stays authoritative.** D2 keeps the server as the trust extender; client never mints fresh `issued_at`. Audit log captures every refresh.
4. **Defense in depth.** D6 (enrollment binding) means a new fingerprint added by a child OR by a thief invalidates the cache. PIN remains the canonical fallback.
5. **Opt-in (D9)** respects parents who don't want biometric on a shared device. Single-parent-device users opt in for the convenience; family-shared-device parents leave it off and pay the PIN tax.

## Alternatives Considered

1. **Lengthen the freshness window to 5 minutes (no biometric).** REJECTED. (a) Compromises ADR-0005 D6's "child-with-pocketed-phone" defense; (b) every UX research session showed 60s was already long enough for a kid to slip in; (c) 5 minutes effectively eliminates the gate's purpose.

2. **Separate biometric-issued token (no PIN coupling).** REJECTED. Would allow biometric-only sensitive actions, bypassing PIN entirely. We want biometric to *refresh* the PIN-anchored trust, not *replace* it. D5 codifies this.

3. **Server-side trust-extension with no biometric (cookie-based).** REJECTED. (a) Trusts the device for the extension; (b) child holding the device gets the extension for free; (c) defeats freshness entirely.

4. **Hardware-key (FIDO2) instead of biometric.** REJECTED in this ADR — too niche for v1, requires parents to carry a YubiKey or equivalent. Reasonable for a future "high-security tier" subscription tier; tracked as a follow-up ADR.

5. **Server pushes a "are you sure?" notification to the parent's other devices.** REJECTED for this round. (a) Requires multi-device parent session inventory we don't have; (b) async UX (wait for push-approve) is heavier than biometric prompt; (c) doesn't help single-device parents.

6. **Just use the OS lock screen (Face/Passcode unlock) for freshness.** REJECTED. (a) Lock-screen unlock is not biometric-bound; (b) on family devices, kids often know the device passcode; (c) iOS / Android don't expose lock-screen identity to apps in a verifiable way.

## Consequences

### Positive

- **PIN entry rate drops from "per sensitive action" to "every 24h or biometric-enrollment-change"** — biggest single UX improvement to ADR-0005.
- **Server retains audit + revocation control** (D2, D7) — the trust extension is observable and rate-limited.
- **Biometric-enrollment-change invalidates the cache** (D6) — protects against a kid adding their fingerprint to dad's phone.
- **Opt-in** (D9) accommodates shared-family-device case where biometric is misleading.
- **Same JWT, same `jti`, same `expires_at`** — no new revocation surface; revoking the underlying parent_session revokes biometric refresh too.

### Negative

- **New endpoint to harden** (`/refresh-freshness`). Rate-limit + audit + JWT-validation per ADR-0005 C6 ordering.
- **Two RN libraries to wire** — `react-native-keychain` + a biometric-prompt lib (one of `expo-local-authentication` / `react-native-biometrics`). Adds native modules to the build.
- **Edge case: biometric briefly fails on cold start** — OS hasn't had a chance to verify the user; recover by retrying the biometric prompt, then falling back to PIN.
- **D6 enrollment-binding adds complexity.** Both platforms expose the relevant primitive (iOS `LAContext.evaluatedPolicyDomainState`, Android `setInvalidatedByBiometricEnrollment`), but the cross-platform abstraction layer needs careful testing.
- **Onboarding adds one screen** (biometric opt-in offer after first PIN entry).

### Neutral

- `auth.store` and `parent.store` get one new selector each (`isBiometricAvailable()`, `requireFresh()`). The actual biometric prompt logic lives in a `services/biometric.ts` adapter, not in the stores.
- `parent_sessions` table gains a `biometric_enabled bool default false` column. Small migration.
- `audit_logs` adds `parent.session.freshness_refreshed` to its `event_type` ENUM.
- Sequence diagram `07-parent/freshness-refresh.sequence.mmd` documents the 3-actor flow (ParentApp + OS + IdentityService).

## Implementation Pointers (informational, not part of the ADR commitment)

| Layer | Change |
|---|---|
| `docs/sequences/07-parent/freshness-refresh.sequence.mmd` | NEW. ParentApp → OS (biometric prompt) → ParentApp → Gateway → IdentityService → PostgreSQL. surface=`mobile`. |
| `docs/erd/01-identity/parent_sessions.dbml` (when authored) | Add `biometric_enabled bool default false`, `biometric_enrollment_id varchar(64) NULL`. |
| `state-machines-mobile-ux.md` §2.4 | Add note: `AUTHENTICATED` carries an internal-not-modeled "biometric-enabled" sub-attribute; doesn't change FSM topology. |
| `src/services/biometric.ts` | NEW. Cross-platform wrapper around `react-native-keychain` + biometric lib. Exposes `unlockBiometric()`, `storeJwt(jwt)`, `clearCache()`. |
| `src/services/api/parent.api.ts` | Add `refreshFreshness({ jti })` stub. |
| `src/store/parent.store.js` | Add `refreshFreshness()` action — wraps biometric.ts call + api call + state update. |
| `src/features/parent/screens/BiometricSetupScreen.tsx` | NEW. Opt-in flow. |
| `src/features/parent/screens/ParentSettingsScreen.tsx` | Add "Biometric unlock" toggle row. |
| `src/features/course-library/UnlockConfirmModal.tsx` | Replace direct `isJwtFresh()` check with `requireFreshParentJwt()` helper that internally tries biometric first. |
| `docs/architecture/use-case-diagram.md` | Add UC-PR08 "Enable Biometric Unlock" under PARENT (gated). |
| `docs/usecases/domains/parent-gate/use-cases.md` | Body for UC-PR08. |

## Verification

After implementation:

- Unit: `biometric.ts` adapter mocks both platforms; tests verify Keychain access flags + enrollment-binding behavior.
- Integration: full sensitive-action loop — opt in biometric → wait 90s → try purchase → biometric prompt → success → purchase proceeds without re-PIN.
- Integration: new biometric enrollment (simulated) → next refresh fails → falls back to PIN screen.
- Integration: server returns 429 on 31st refresh in 24h → client surfaces "Try the PIN this time" toast.
- COPPA review: every refresh event in `audit_logs`; biometric_used flag visible to primary parent.
- UX: parents reach biometric opt-in offer at most once per cold-install lifecycle. Skipping does not nag.

## Follow-ups

- **Hardware-key tier** — separate ADR for high-trust households (YubiKey / FIDO2 platform key on tablets).
- **Cross-device biometric** — when ADR-0010 multi-parent lands, each parent's biometric is independent; refresh-freshness rejects cross-parent attempts.
- **Biometric-fail telemetry** — track failure rate; if > 5%, revisit the prompt UX copy.
- **OS biometric API changes** — iOS 26 / Android 16 may shift the underlying APIs; revisit the adapter every 12 months.
- **Apple Vision Pro / RN-VR surfaces** — biometric semantics differ on visionOS; future ADR if we ship there.
