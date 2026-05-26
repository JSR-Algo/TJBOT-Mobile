# 0008 Parent PIN Recovery — Email Magic Link

Date: 2026-05-12

## Status

Accepted

## Context

ADR-0005 (Parent-Gate Security Model) commits to a server-validated 4-digit parent PIN with 5-attempt lockout (15-min cooldown). The plan acknowledged but explicitly deferred the "PIN recovery flow" as a follow-up: parents who forget their PIN today can either wait out the lockout (still wrong PIN after) or contact support (no automated path). For a child-safety product where the parent surface gates COPPA-revocation, controls, purchases, subscription cancellation, and account deletion, having no self-service recovery is a hard product gap.

Specific requirements observed during P5–P9:

- `ParentLockedOutScreen` (P6) currently shows "PIN recovery will be available in a future update" — a UX placeholder that needs a backing flow.
- `parent.store` exposes `clearLockout()` as a server action but no client-side recovery initiator.
- The `parent_pins` table (`state-machines-mobile-ux.md` §8.4) stores only a bcrypt hash; there is no "PIN reminder" path. A reset is the only mechanism.
- Recovery must work even when the parent is in `GATE_LOCKED_OUT` — the lockout protects against brute force on the PIN itself, not against legitimate account-recovery via a separate identity proof.
- Recovery must NOT bypass the COPPA / parent-identity contract: whatever proof we accept for recovery has to be at least as strong as the PIN flow that authorized the original `parent_pins` row.

The deferred multi-parent question (ADR-0010, also landing in this batch) interacts here: in a 2-parent household, "primary parent" can clear the secondary's lockout out-of-band, but both still need a self-service path when both forget the PIN simultaneously OR when there's no second parent on the account.

## Decision

**Adopt email magic-link as the canonical PIN recovery mechanism.** The parent's verified registered email is the recovery proof.

Concrete commitments:

| # | Commitment |
|---|---|
| D1 | "Forgot PIN?" CTA on `ParentGateScreen` + `ParentLockedOutScreen` opens the recovery flow, **callable even during a 15-min `GATE_LOCKED_OUT` window**. (Lockout protects the PIN — not the recovery channel.) |
| D2 | Recovery flow: `POST /v1/parent/pin/recovery/request` with `{user_id, email_hint}` → server (a) verifies email matches the bound `users.email`; (b) creates a `pin_recovery_tokens` row with 32-byte random `token`, `expires_at = now() + 15 min`, `used_at = null`; (c) emails a one-tap link `tbot://parent/pin-reset?token=…` via SES. Rate-limited 1/hour per `(user_id, ip)`. |
| D3 | Magic-link landing: `tbot://parent/pin-reset?token=…` opens `ParentPinResetScreen` (new). Server-validate the token via `POST /v1/parent/pin/recovery/validate` → 200 if valid + unused + unexpired; 410 if used / expired; 404 if not found. |
| D4 | New PIN entry: 4-digit + confirm-4-digit input. Submit via `POST /v1/parent/pin/recovery/complete` with `{token, new_pin}` → server (a) bcrypt-hashes new PIN; (b) writes `parent_pins.bcrypt_hash` + bumps `updated_at`; (c) marks `pin_recovery_tokens.used_at = now()` (one-shot); (d) clears any active `parent_lockouts` row for the user; (e) revokes all active `parent_sessions` for the user (forces re-PIN on every device). |
| D5 | Token entropy: 32 bytes random → base64url (43 chars). One-shot via `used_at`. TTL 15 minutes. Server rejects expired even if technically unused. |
| D6 | Email throttle: 1 recovery request per `(user_id, IP-prefix /24)` per hour. After 3 throttled rejections, escalate to "Contact support" CTA. |
| D7 | Audit: every step (`request_sent` / `token_validated` / `pin_reset_completed` / `pin_recovery_failed`) writes a row to `audit_logs` per `docs/erd/_shared/audit_logs.dbml`. Visible to primary parent in `parent_settings → Safety & Privacy`. |
| D8 | Deep-link routing: the `tbot://parent/pin-reset?token=…` path is added to `src/app/navigation/linking.ts` PATH_TO_ROUTE map; bypasses the normal parent_gate redirect since the user does not have a valid session yet. Token-bearing route is signed-out-friendly. |
| D9 | Race condition (D5 + D6 in ADR-0005): a successful PIN reset invalidates the prior `parent_pins.bcrypt_hash` immediately. Any in-flight `POST /v1/parent/auth` with the OLD PIN that hits the server after the reset returns 401, NOT 5xx. |
| D10 | UX copy: never reveal whether the email is registered. Response is always 202 ("If that email is on file, we sent a link") regardless of `users.email` match, to prevent enumeration. |

## Drivers

In priority order:

1. **Self-service recovery is table stakes** — children can't help, partners might be unavailable, and support-ticket SLAs are 24-48h. Parents lock themselves out at higher rates than typical SaaS because the PIN is rarely typed.
2. **Account-bound, not device-bound** — recovery must work from a fresh install (e.g., new phone after old one broke) where the magic link is the only thing tying device → account.
3. **Email is already the verified identity** — `users.email` is verified during signup (UC-A02). Reusing it avoids introducing a second identity factor.
4. **Audit + revocation are first-class** — every reset is logged and revokes all prior parent_sessions, so a stolen PIN or compromised device can be remediated by a real parent triggering the same flow.
5. **Anti-enumeration** — the 202 envelope per D10 prevents an attacker from harvesting email validity.

## Alternatives Considered

1. **SMS OTP recovery.** REJECTED. (a) Adds a new identity factor we don't currently verify; (b) SIM-swap attacks are well-documented; (c) requires phone number on file that we don't collect at signup; (d) cost per recovery message is non-trivial.

2. **Security questions ("first pet's name").** REJECTED. (a) Notoriously weak (knowable via social engineering); (b) UX hostile; (c) requires N more onboarding fields; (d) industry consensus is moving away.

3. **Primary-parent override only (no self-service).** REJECTED in isolation but **complementary** per ADR-0010. Primary-parent override works for 2-parent households but is insufficient as the sole mechanism — primary parents themselves still need a path.

4. **Device-bound biometric override.** REJECTED as recovery mechanism. Biometric is great for ergonomics (ADR-0009) but device-loss invalidates it. For recovery, account-bound proof (email) wins.

5. **Full account-recovery flow (password reset → PIN reset).** REJECTED as the primary path because parent-side login uses the same email/password as the parent-app login itself. If the parent forgot password too, the email magic link is already the canonical recovery for that. Conflating PIN + password recovery into one flow muddies the audit log and confuses the parent ("which thing did I reset?"). Keep them separate; both flows independently use the email-magic-link primitive.

6. **In-app "Verify with parent's other device" push.** REJECTED as the primary path. Same multi-device complexity as ADR-0006 D2 deferred — requires a real multi-device session inventory and push-to-parent-device protocol that doesn't exist yet. Revisit as a future enhancement.

7. **No recovery at all; route to support.** REJECTED. Already what's deployed; the audit explicitly flags this as the gap. Support is fine as a fallback after 3 throttled attempts (D6), not as the only path.

## Consequences

### Positive

- **Closes ADR-0005 D4 follow-up.** Primary-parent unlock is now the social path; magic-link is the self-service path. Both coexist.
- **No new identity factor.** Reuses verified email; no SMS / phone-number collection / security-question UX.
- **One-shot tokens + audit + session revocation** make stolen-link replay or post-hoc tampering visible and remediable.
- **Anti-enumeration** (D10) closes a common signup-flow information leak.
- **Deep-link route bypasses parent_gate cleanly** (D8) — UX makes sense for someone who can't pass the gate they're trying to recover.

### Negative

- **Email delivery is on the critical path.** SES blacklist, parent's email-provider greylist, parent-side filter rules — any of these can stall recovery for minutes-to-hours. Mitigated by D6 throttle + support escalation copy.
- **Email compromise = PIN recovery.** A parent whose email is compromised can have their PIN reset. This is the same threat model as every email-bound auth system; mitigated by D7 audit + the fact that compromising email also compromises the parent's primary account login (same threat surface).
- **One new screen + one new deep-link path.** Adds to the route table.
- **Rate-limit + token TTL tuning is empirical.** 1/hour + 15-min TTL are starting points; need adjustment after observing real recovery flows.

### Neutral

- `pin_recovery_tokens` is a new table (small; rows soft-expire via TTL). DBML entity goes to `docs/erd/01-identity/pin_recovery_tokens.dbml` in a follow-up ERD pass.
- `ParentPinResetScreen` is a new RN screen. Wired into RootNavigator + routes.ts in the same change as the screen authoring.
- Sequence diagram `01-identity/pin-recovery.sequence.mmd` documents the 3-step token lifecycle (request → validate → complete) and the all-sessions revoke side effect.

## Implementation Pointers (informational, not part of the ADR commitment)

| Layer | Change |
|---|---|
| `docs/sequences/01-identity/pin-recovery.sequence.mmd` | NEW. ParentApp → Gateway → IdentityService → SES + PostgreSQL. surface=`mobile`. Three messages: `recovery_request`, `recovery_validate`, `recovery_complete`. Includes the all-sessions revoke fan-out. |
| `docs/erd/01-identity/pin_recovery_tokens.dbml` | NEW. Columns: `token varchar(64) PK`, `user_id uuid`, `expires_at`, `used_at TIMESTAMPTZ NULL`, `created_at`, `ip_prefix inet`. Index on `(user_id, created_at DESC)` for throttle queries. |
| `docs/architecture/use-case-diagram.md` | Add UC-A14 Reset Parent PIN under AUTH section. |
| `docs/usecases/domains/auth/use-cases.md` | Body for UC-A14. |
| `docs/usecases/domains/auth/{backend-mapping,edge-cases}.md` | Add UC-A14 rows. |
| `src/features/auth/screens/ParentPinResetScreen.tsx` | NEW. 4-digit + confirm input; submits via `auth.api.ts` stub. |
| `src/app/navigation/routes.ts` + `RootNavigator.tsx` | Register `ParentPinResetScreen`. |
| `src/app/navigation/linking.ts` | Add `tbot://parent/pin-reset?token=…` → `ParentPinResetScreen` (token via query param). Bypass parent_gate redirect (D8). |
| `src/features/parent/screens/ParentGateScreen.tsx` | Add "Forgot PIN?" link below the keypad → routes to `ParentPinResetScreen` via inline `Linking.openURL('tbot://parent/pin-recovery-request')` OR direct nav to a new request screen. |
| `src/features/parent/screens/ParentLockedOutScreen.tsx` | Replace "PIN recovery will be available in a future update" copy with active CTA. |

## Verification

After implementation:

- Unit: token generation produces 43-char base64url; rejected after `used_at` set; rejected after `expires_at`.
- Integration: 1-hour throttle blocks 2nd request from same IP; 4th request bumps to "contact support" copy.
- Integration: successful reset revokes all `parent_sessions` (next protected call from any device → 401).
- Integration: in-flight `POST /v1/parent/auth` with old PIN against a reset account → 401 (D9 race).
- COPPA review: every recovery event is in `audit_logs` with `actor_type='parent'` + `event_type='parent.pin.recovery.completed'`.
- Anti-enumeration: `POST /v1/parent/pin/recovery/request` returns 202 for unknown emails (D10).

## Follow-ups

- **Empty-state copy** for `parent_settings → Safety & Privacy` showing recovery audit-log entries.
- **Primary-parent override** path (per ADR-0010): in a 2-parent household, the primary parent has a `POST /v1/parent/lockout/clear` button that does not require a fresh magic-link cycle.
- **SMS fallback** if email delivery rate becomes a real product issue. Future ADR.
- **Hardware-key recovery** (FIDO2) for high-trust households. Future ADR.
- **Recovery analytics**: track how often parents enter the recovery flow vs. successfully complete it; if completion < 80%, revisit the UX.
