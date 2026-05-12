# 0007 FSM Backend Contract — what the backend must provide for the wired client stores

Date: 2026-05-12

## Status

Accepted

> **Context:** This ADR is the **P4 exit-gate handoff** per `.omc/plans/flow-system-immediate-fixes.md`. P4 wired the four documented state machines into `src/store/`. This doc enumerates exactly what each store now assumes about the backend — i.e. what the backend services must implement before the app stops being a stub. Each row is grounded in a concrete store file + the state-machine plan + the sequence diagrams authored in P3.

## Files this contract covers

| Client store | FSM section | Sequence(s) |
|---|---|---|
| `src/store/lesson.store.js` | `state-machines-mobile-ux.md` §2.2 LessonSession | `04-realtime/session-start-mobile.sequence.mmd`, `04-realtime/observer-attach.sequence.mmd`, `04-realtime/ws-handshake.sequence.mmd`, `04-realtime/turn-pipeline.sequence.mmd`, `04-realtime/session-close.sequence.mmd`, `04-realtime/barge-in.sequence.mmd`, `04-realtime/provider-failover.sequence.mmd`, `03-device-runtime/offline-fallback.sequence.mmd` |
| `src/store/device.store.js` | §2.3 DevicePairing | `02-device/consumer-provisioning.sequence.mmd`, `02-device/heartbeat.sequence.mmd`, `02-device/decommission.sequence.mmd`, `02-device/transfer.sequence.mmd`, `16-mobile/ble-provisioning.sequence.mmd` |
| `src/store/auth.store.js` | (auth states; not in SM plan) | `01-identity/signup.sequence.mmd`, `01-identity/login.sequence.mmd`, `01-identity/token-refresh.sequence.mmd`, `01-identity/logout.sequence.mmd`, `01-identity/session-revoke.sequence.mmd`, `01-identity/account-delete.sequence.mmd`, `01-identity/password-reset.sequence.mmd`, `01-identity/coppa-consent-record.sequence.mmd` |
| `src/store/parent.store.js` | §2.4 ParentApproval | `07-parent/parent-gate-validate.sequence.mmd`, `07-parent/controls-update.sequence.mmd`, `07-parent/daily-summary-generation.sequence.mmd`, `07-parent/weekly-summary-generation.sequence.mmd` |
| `src/store/subscription.store.js` | §2.7 Subscription | `19-billing/checkout-initiate-mobile.sequence.mmd`, `19-billing/subscription-lifecycle.sequence.mmd`, `19-billing/dunning-past-due.sequence.mmd`, `19-billing/stripe-webhook-processing.sequence.mmd`, `19-billing/entitlement-check-session-start.sequence.mmd`, `06-content/entitlement-grant-mobile.sequence.mmd` |

---

## 1. LessonSession (sys-04)

### What the store does now
- 14 enumerated `STATES` (`IDLE..AUDIO_FAILED`); 8 enumerated `TURN_STATES` for the ACTIVE composite.
- 8 `END_REASONS` from `state-machines-mobile-ux.md` §8.2 ENUM `realtime_session_end_reason`.
- `start()` mints a fresh idempotency-key on every CTA tap (audit §7 + C5); same key flows over the wire on `POST /v1/sessions/start`.
- `retryAudio()` mints a **new** key on AUDIO_FAILED→CONNECTING — never replays a stale key (audit C5).
- Observes server-driven terminal events via `serverEnd(endReason)` — accepts the 6 documented server reasons + the 2 client-side ones (`complete`, `user_exit`).
- ADR-0006 ownership: the store assumes the **robot owns the WS**. In production, the store is driven by **observer-lane events**, not by the local turn pipeline. The `__USE_PHONE_RUNTIME__` build flag exists for trial-without-robot demos only.

### What the backend MUST provide
1. `POST /v1/sessions/start` — accepts `{user_id, child_id, device_id, course_id}` + `Idempotency-Key` header. Returns `{session_id, device_session_id, expires_at}` with one of:
   - 200 happy path
   - 402 `entitlement_check_failed` (subscription expired / not entitled)
   - 409 `device_busy_other_session` (unique partial index violation; another session active on `(user_id, device_id)`)
   - 410 `idempotency_replay_410` with `Retry-With-New-Key: true` for stale keys against non-OPEN sessions
   - 423 `parent_stop_cooldown_active` (cooldown column read; see SM plan §5 row 5)
2. MQTT control-plane push to `device/{device_id}/sessions/start` payload `{session_id, device_session_id}` so the robot opens the realtime WS.
3. Realtime WS `wss://realtime/v1/session/{session_id}` — implemented by `realtime-orchestrator` (sys-04, sole writer of `realtime_sessions`).
4. **Observer WS** `wss://realtime/v1/observer/{session_id}` — multi-subscriber read-only lane. On connect: emit initial state snapshot, then push every observer event (`session.started`, `turn.started`, `turn.completed`, `safety.halt`, `session.reconnecting`, `session.resumed`, `session.end {end_reason}`). Subscriber close does NOT affect the underlying realtime session.
5. Sole-writer rule: `realtime-orchestrator` is the only service that writes to `realtime_sessions`. `safety-svc` emits events; orchestrator transitions. `metering-svc` emits cost ticks; orchestrator decides cap.
6. Heartbeat semantics: first miss → server transitions to `RECONNECTING`; third miss → server emits `session.end reason=disconnect_timeout` (SM plan §4.2).
7. Outbox-or-after-commit ordering: any `session.*` event MUST commit before push (SM plan §8.2 audit C4).
8. CAS on `state_version` for every terminal transition (SM plan §7 race #3).
9. `end_reason` ENUM strictness: returns must come from the 8-value set; client `serverEnd(reason)` ignores unknown reasons (defense-in-depth).

### Open contracts (deferred to follow-up)
- Phone-without-robot demo mode `__USE_PHONE_RUNTIME__`: needs a separate orchestrator entry point OR a flag that allows ParentApp to open the realtime WS directly. Out of scope for v1 backend.

---

## 2. DevicePairing (sys-02)

### What the store does now
- 16 enumerated `PAIRING_STATES`; 5 enumerated `PROV_ERROR_CODES` (E-PROV-001..005).
- Distinct `DEVICE_PRESENCE` enum (`unknown / online / offline`) for post-pair runtime state.
- **`pairingToken` is revoked on every PAIRING_FAILED transition** — `retryFullPairing()` and `retryFromScan()` re-start with `pairingToken: null`. Closes audit gap "missing token revocation on retry" (SM plan §8.3 line item).
- `renameRejected()` is a self-loop on `NAMED` — accumulates `renameRejectCount` for UX backoff; does NOT exit the FSM (matches §2.3 line 169).
- `phoneLostNetwork()` is callable from `AWAITING_ROBOT`, `PROVISIONING`, `CLAIM_PENDING` — drops to `OFFLINE` per §2.3 line 162+166.

### What the backend MUST provide
1. `POST /v1/devices/pairing-token` — issues an opaque `pairing_token` with 10-min TTL (SM plan §8.3 `pairing_attempts.expires_at`).
2. `POST /v1/devices/claim` — verifies token + serial + user; transitions `pairing_attempts.state` from `CLAIM_PENDING → CLAIMED`. Idempotent on `token` UNIQUE.
   - Failure responses: 404 `token_expired`, 409 `serial_collision` (UNIQUE on `devices.serial`), 422 `claim_rejected` with one of E-PROV-004 / E-PROV-005.
3. `PATCH /v1/devices/{id}` — rename submission. 422 with `rename_rejected` on profanity-filter rejection drives the NAMED self-loop.
4. `POST /v1/devices/{id}/finalize` — marks `FIRST_LESSON_READY`; emits domain event `DEVICE_PAIRED`.
5. Token revocation: on a successful claim, `pairing_attempts.state` transitions out of `TOKEN_ISSUED`; on PAIRING_FAILED, the row's token is invalidated server-side as well (defense-in-depth — client already drops it).
6. CAS on `pairing_attempts.state_version`.
7. Partial index `pairing_attempts_expiry (expires_at) WHERE state IN ('TOKEN_ISSUED','PROVISIONING','CLAIM_PENDING')` for the sweeper.

### Open contracts (deferred)
- Sub-flow: BLE provisioning vs Wi-Fi scan — the store treats both as opaque "DEVICE_FOUND" entry. Concrete BLE/MQTT message shapes are sys-02 + sys-16 implementation territory; the client store doesn't care.

---

## 3. AuthSession (sys-01)

### What the store does now
- 6 enumerated `AUTH_STATUSES` (was design-only; now all 6 are live including `expiring`, `expired`, `revoked`).
- `EXPIRY_REFRESH_WINDOW_MS = 60_000`. `shouldRefresh()` selector tells the API client / router when to call `beginRefresh()` for silent renewal.
- `revoke()` sets a one-shot `lastRevocationAt` signal; `consumeRevocationSignal()` lets the router navigate to `onb_login` exactly once per revocation.
- `loginSuccess({user, token, child})` expects `token = {access, refresh, exp}` shape; `exp` in **epoch ms** (not seconds; this is the client convention).

### What the backend MUST provide
1. `POST /v1/auth/login` per existing sequence — returns `{access_token, refresh_token, expires_in (seconds)}`. The client wrapper converts to `exp` ms.
2. `POST /v1/auth/refresh` — accepts a refresh token, returns new access (+ rotated refresh on every call per OAuth refresh-rotation best practice).
3. `POST /v1/auth/logout` — revokes refresh_token + the current `parent_sessions.jti` if any.
4. 401 with `WWW-Authenticate: Bearer error="invalid_token", error_description="session_revoked"` triggers `revoke()` on the client. Other 401s trigger `refreshFailure()`.
5. `POST /v1/identity/coppa-consent` and the COPPA-related flows from P3.A — the store does not yet hold a `consent_required` flag; that lives in the auth payload + UC-O05 navigation gate. The backend should return the parent's outstanding-consent state at login (e.g. `{consents_outstanding: [{version: "v3"}]}`) so the router routes to `onb_coppa` automatically.

### Open contracts (deferred)
- Multi-child session: the `child` field is single-valued. Multi-child profile management is a future ADR (`UC_PROFILE_ADD_CHILD` etc.).
- OAuth (Google / Apple) tokens are exchanged at `IdentityService` — store doesn't differentiate by provider; the JWT comes back identical shape.

---

## 4. ParentApproval (sys-07 + sys-01)

### What the store does now
- 10 enumerated `PARENT_STATES`; 5 enumerated `DASHBOARD_TABS`.
- `SENSITIVE_FRESHNESS_MS = 60_000` per ADR-0005 D6. `isJwtFresh()` selector tells sensitive-action call sites when to force re-PIN.
- `hasValidSession()` checks both `idle_until` and `expires_at` — covers both 15-min idle and 24-h absolute (ADR-0005 D5).
- `authRateLimited({retryAfterMs})` mirrors the audit C6 server order: 429 before lockout precheck before bcrypt before attempt-row insert.
- `receiveApprovalRequest({approvalId})` drives the `COURSE_APPROVAL_PENDING` state for cross-domain unlock flows; `serverApprovalExpired()` mirrors the 5-min server expiry (audit C10).

### What the backend MUST provide
1. `POST /v1/parent/auth` — 4-step order (audit C6): Redis token-bucket per `(user_id, ip_hash)` 10/5min → 429 *without* writing an attempt row; lockout precheck (`parent_lockouts.locked_until > now()`) → 423; bcrypt compare; outcome insert.
2. `POST /v1/parent/lockout/clear` — primary-parent-only action.
3. `POST /v1/parent/approvals` (kind=`course_unlock` etc.) — creates `parent_approvals` row state=PENDING with 5-min expiry. ADR-0005 D7 removes the `UnlockConfirmModal` hardcoded `7351` in favor of this.
4. `POST /v1/parent/approvals/{id}/decide` — 409 on stale state, 410 on expired.
5. Server-side sweeper: `pg_cron` 1-min job transitions `state='PENDING' AND expires_at < now()` to `EXPIRED`; pushes `approval.expired` event over a parent-app WS (or includes in the next sync). The client treats EXPIRED identically to user-cancel.
6. JWT shape: `{jti, issued_at, idle_until, expires_at}` — all epoch ms. `jti` is the row PK in `parent_sessions`.
7. Hot kill path: `parent_sessions_active_by_user_idx (user_id) WHERE expires_at > now()` (audit C8) for the `parent_terminate` lookup.

### Open contracts (deferred)
- Biometric cache for D6 freshness — OS-side biometric unlock decrypts a locally-stored copy of the parent JWT. Future enhancement.
- PIN recovery flow — out of scope for v1; tracked in ADR-0005 follow-ups.

---

## 5. Subscription (sys-19)

### What the store does now
- 7 enumerated `SUB_STATES`. `IDLE` represents the no-subscription baseline; `EXPIRED` is the terminal.
- `syncFromServer(payload)` is the canonical write path — every sub-state read from `GET /v1/billing/subscription` replaces the local snapshot. Optimistic user-driven transitions (`cancelAtPeriodEnd`, `pause`, `resume`) are paired with sync on response.
- `hasActiveEntitlement()` codifies SM plan §2.7 entitlement-coupling: `TRIAL / ACTIVE / PAUSED / PAST_DUE` keep entitlements; `CANCELLED / EXPIRED` do not.
- `canPause()` enforces "one pause per cycle" client-side; server is still authoritative on 409.

### What the backend MUST provide
1. `GET /v1/billing/subscription` — returns the full payload shape consumed by `syncFromServer()`: `{subscriptionId, state, planId, currentPeriodEnd, trialEndsAt?, pausedAt?, pauseResumeDue?, cancelledAt?, pausedThisCycle, paymentMethodLast4?}`.
2. `POST /v1/billing/subscription/cancel` — sets `cancel_at_period_end=true` on Stripe; transitions `subscriptions.state → CANCELLED`. Idempotent on subscription_id. Requires fresh parent JWT < 60s.
3. `POST /v1/billing/subscription/pause` — accepts optional `resume_on` date (≤ 90d). 409 if `pausedThisCycle` already true.
4. `POST /v1/billing/subscription/resume` — clears pause; transitions back to ACTIVE.
5. `POST /v1/billing/payment-method/update` — returns Stripe SetupIntent for UC-BU17 / UC-SUB05 dunning recovery.
6. Stripe webhook handlers (sys-19 sequence `stripe-webhook-processing`) drive: `invoice.payment_failed → PAST_DUE`, retry success → `ACTIVE`, day-7 grace expiry → `CANCELLED`.
7. Auto-cancel sweeper: rows where `pause_resume_due < now()` transition `PAUSED → CANCELLED`.
8. `pausedThisCycle` reset: at every `current_period_end` advancement, server flips the flag back to `false`.

### Open contracts (deferred)
- Invoice history endpoint (UC-INV01) — P5 follow-up.
- Multi-plan / family-tier subscription mutations — not modeled.
- Cross-account subscription transfer — not modeled.

---

## Cross-cutting backend contracts

These apply to all sequences regardless of which store consumes them:

| Contract | Specifying doc |
|---|---|
| Idempotency-key storage (`idempotency_keys` table, 24h TTL, `xmax = 0` first-writer detection) | `state-machines-mobile-ux.md` §7 |
| CAS on `state_version` for every terminal/branchy transition | §5 last row |
| Outbox-or-after-commit for any side-effecting event | §8.2 audit C4 |
| Error envelope: 4xx-business cached for replay; 5xx never cached | §7 idempotency policy |
| Frozen 118-entry actor allow-list for sequence participants | `docs/sequences/_actors.md` |
| Cross-domain FK declared on owner side only; `Ref:` line at bottom of DBML | `docs/erd/CONVENTIONS.md` §3 |

---

## What this contract does NOT promise

- **No UI wiring.** Store transitions are present but no React Native screen reads `useLessonStore.subscribe(...)` yet. Wiring lives in `P3.A/P3.B/P3.D` UI follow-ups (the deferred "Full P3: docs + screens" scope).
- **No backend implementation.** This is a client-side handoff doc. Backend teams own the actual implementation per their sub-repo's `.agent/` boot sequence.
- **No tests.** Jest infra is in devDeps but no `jest.config` is wired. Adding store-level smoke tests is a P5 follow-up; for now, the only verification is the syntax + export-shape check run during P4.

---

## Verification (P4 exit gate)

Run from `tbot-design/`:

```bash
# All four FSM stores parse + export expected symbols
for f in src/store/lesson.store.js src/store/device.store.js src/store/auth.store.js src/store/parent.store.js src/store/subscription.store.js; do
  node --input-type=module -e "import('./${f}').then(m => console.log('${f}', Object.keys(m).filter(k=>k!=='default').join(',')))"
done

# Doc-side validators stay green
node scripts/flows/validate-go-calls.mjs
node scripts/sequences/validate-sequences.mjs
node scripts/erd/validate-erd.mjs
node scripts/usecases/check-index-coverage.mjs
```

Last verified: 2026-05-12. All pass.

## Follow-ups

- **P5.a** — wire P4 stores into the existing screens (`useLessonStore.subscribe` in lesson-session screens, `useParentStore.openGate` in route guards, `useSubscriptionStore.syncFromServer` after every billing API response).
- **P5.b** — jest setup + store smoke tests (each FSM state reachable, each transition guarded).
- **P5.c** — observer WS client + reducer-driven mirror update for ADR-0006 production mode.
- **P5.d** — PIN recovery flow ADR.
- **P5.e** — biometric cache layer ADR (D6 enhancement).
