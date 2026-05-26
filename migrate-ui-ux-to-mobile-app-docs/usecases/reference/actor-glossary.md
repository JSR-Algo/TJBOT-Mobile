# Actor Glossary — UC ↔ Sequence cross-walk

**Purpose:** Map use-case actors (human-role / consumer-surface abstraction in `docs/usecases/actors/`) to the frozen sequence-diagram participant allow-list in `docs/sequences/_actors.md`. Resolves audit anomalies AN-12 (`GoogleOAuth` / `AppleSignIn` / `WiFiNetwork` absent from sequence allow-list) and AN-13 (`BLEDevice` has no UC counterpart) by giving each side a canonical referent on the other side.

**Source artifact deltas covered:**
- 4 internal actors at `docs/usecases/actors/{child,parent,authenticated-user,guest}.md`
- 7 external actors at `docs/usecases/actors/external/{robot-device,realtime-voice-service,google-oauth,apple-sign-in,payment-provider,device-os,wifi-network}.md`
- 118-entry sequence allow-list at `docs/sequences/_actors.md` (frozen 2026-05-11)

**Status:** authored 2026-05-12 as P1.3 of `.omc/plans/flow-system-immediate-fixes.md`. Static doc — update only when a new UC actor is added or the sequence allow-list is amended.

---

## 1. Abstraction-level reminder

The two artifact families intentionally use different abstraction levels:

| Layer | Naming style | Example |
|---|---|---|
| Use-case actors (`docs/usecases/actors/*.md`) | Human-role / external-system name | `Child`, `Parent`, `Robot Device`, `Google OAuth` |
| Sequence participants (`docs/sequences/_actors.md`) | PascalCase service / client-surface name | `ParentApp`, `Device`, `IdentityService`, `Stripe` |

UC actors model **who wants something**; sequence participants model **what speaks the protocol**. A single UC actor often maps to multiple sequence participants (different lifecycle phases) and vice versa.

---

## 2. Internal actors

| UC actor | Sequence participant(s) | Mapping notes |
|---|---|---|
| **Child** (`actors/child.md`) | `ParentApp` (no dedicated child surface) | Phone-side child interaction is served by the same `ParentApp` mobile-app participant — kid-mode UI but identical transport. There is no distinct `ChildApp` in the allow-list. Server-side distinction (parent vs child session) lives in the auth token claims, not in the participant identity. |
| **Parent** (`actors/parent.md`) | `ParentApp`, `SourceParentApp`, `TargetParentApp` | `ParentApp` is the steady-state surface. `SourceParentApp` + `TargetParentApp` appear only in sys-02 `transfer.sequence.mmd` to disambiguate the two sides of a device-transfer flow. |
| **Authenticated User** (`actors/authenticated-user.md`) | (no direct participant) | Authentication state lives in the JWT, not in a sequence participant. Token-bearing flows are modeled as `ParentApp → Gateway → IdentityService`. |
| **Guest (Unauthenticated)** (`actors/guest.md`) | `ParentApp` (pre-auth state) | Pre-login flows (signup, login, password-reset, OAuth delegations) still use `ParentApp` as the consumer surface; the absence of a token is implicit. |

---

## 3. External actors

| UC actor | Sequence participant(s) | Mapping notes |
|---|---|---|
| **Robot Device** (`actors/external/robot-device.md`) | `BLEDevice` (during pairing) → `Device` (post-claim) | `BLEDevice` is the BLE-exposed surface during sys-02 provisioning; `Device` is the cloud-bound, Wi-Fi-attached surface for all post-claim flows (sys-02..18). Same physical robot, two participant identities to reflect the transport/lifecycle boundary. |
| **Realtime Voice Service** (`actors/external/realtime-voice-service.md`) | `RealtimeService` (orchestrator) + `GoogleLiveFlash` / `GoogleLiveFlashPrimary` / `GoogleLiveFlashFallback` (provider) | UC collapses orchestrator + provider into one external system; sequences split them. `RealtimeService` is the TJBot-owned WS orchestrator (sys-04). `GoogleLiveFlash` is the third-party LLM/voice provider. Provider-failover sequence uses the Primary/Fallback split. |
| **Google OAuth** (`actors/external/google-oauth.md`) | _(no direct participant — proxied through `IdentityService`)_ | Sequence allow-list does NOT include `GoogleOAuth` as a participant. Login flows model OAuth tokens as opaque inputs to `IdentityService.verify*()`. Treat the UC-A04 "Continue with Google" tap as `ParentApp → Gateway → IdentityService` with an OAuth credential payload; the provider hop is implicit. |
| **Apple Sign-In** (`actors/external/apple-sign-in.md`) | _(no direct participant — proxied through `IdentityService`)_ | Identical treatment to Google OAuth. UC-A05 "Continue with Apple" → `ParentApp → Gateway → IdentityService`. |
| **Payment Provider** (`actors/external/payment-provider.md`) | `Stripe` | UC uses generic "Payment Provider" because source code does not confirm provider identity (KD9). Sequence allow-list commits to `Stripe`. Until KD9 is resolved, treat them as the same actor for design purposes; if a future ADR selects a non-Stripe provider, both this glossary and `_actors.md` need updating. |
| **Device OS** (`actors/external/device-os.md`) | `OS` | Exact-match; sequence allow-list line 39 documents `OS — iOS / Android mobile operating system facility (sys-16)`. |
| **Wi-Fi Network** (`actors/external/wifi-network.md`) | _(no direct participant)_ | Wi-Fi provisioning is mediated via `BLEDevice` ↔ `Device` in sequences; the network itself is not modeled as a participant. `MqttBroker` covers post-pair MQTT delivery — different concern. Treat UC-DP08 "Submit Wi-Fi credentials" as a payload to `BLEDevice` rather than a sequence hop to `WifiNetwork`. |

---

## 4. Reverse lookup (sequence participant → UC actor)

For each sequence participant that represents a consumer-surface or external system, the originating UC actor:

| Sequence participant | UC actor referent | Notes |
|---|---|---|
| `ParentApp` | Parent / Child / Guest / Authenticated User | Token state distinguishes; participant is one. |
| `SourceParentApp` / `TargetParentApp` | Parent (in transfer flow) | sys-02 transfer only. |
| `Device` | Robot Device (post-claim) | sys-02..18 cloud-bound surface. |
| `BLEDevice` | Robot Device (during pairing) | sys-02/16 boundary. |
| `OS` | Device OS | Mic perms, push registration, deep-link delivery. |
| `Stripe` | Payment Provider | Pending KD9 resolution. |
| `GoogleLiveFlash` (+ Primary / Fallback) | Realtime Voice Service (provider half) | Orchestrator half is `RealtimeService`. |
| `RealtimeService` | Realtime Voice Service (orchestrator half) | TJBot-owned. |
| `MqttBroker`, `Redis`, `S3`, `CloudFront`, `SES`, `SQS`, `SNS`, `FCM`, `EventBridge`, `Kinesis`, `KMS`, `YubiHSM`, `PagerDuty` | _(no UC actor — infra / fan-out)_ | These are internal infrastructure participants; no end-user UC initiates against them directly. |
| `IdentityService` / `DeviceService` / `BillingService` / `SafetyService` / etc. | _(no UC actor — TJBot backend services)_ | UCs are initiated by `ParentApp` (i.e. Parent / Child / Guest); these services receive RPCs. |
| `AdminConsole` / `AuthoringConsole` / `ReviewerConsole` / `FactoryCLI` / `DemoCLI` / `CI` / `Operator` / `SecurityEngineer*` | _(out of UC scope)_ | Operator/admin tooling lives outside the mobile UC model. |

---

## 5. Gaps + open questions

| Gap | Resolution path |
|---|---|
| `GoogleOAuth` / `AppleSignIn` not in sequence allow-list. | Decision: keep proxy-through-IdentityService pattern OR add explicit participants when modeling token-exchange flows. Tracked in audit AN-12. If added, update `_actors.md` allow-list, this glossary, and the actor files. |
| `WifiNetwork` not in sequence allow-list. | Likely permanent: Wi-Fi credential exchange is BLE-payload, not a sequence hop. Document in `actors/external/wifi-network.md` rather than allow-list. |
| `BLEDevice` has no UC actor of its own. | Permanent: it is a lifecycle variant of Robot Device. This glossary's §3 row is the canonical mapping. Audit AN-13 closed by this doc. |
| Payment provider identity (KD9). | Resolves when commerce ADR is written (P3.C in `.omc/plans/flow-system-immediate-fixes.md`). Update both `payment-provider.md` and `_actors.md` once decided. |
| Realtime provider identity (KD10). | Currently `GoogleLiveFlash` is named in `_actors.md` but `realtime-voice-service.md` says "NOT CONFIRMED IN SOURCE". Either align (rename the UC actor) or document why the divergence is intentional. |

---

## 6. Acceptance criteria (P1.3)

Per `.omc/plans/flow-system-immediate-fixes.md` AC-P1.3:

- [x] Every actor file in `docs/usecases/actors/` referenced once (11 files: 4 internal + 7 external).
- [x] Every `_actors.md` participant for the 7 consumer-surface / external-system rows referenced once: `ParentApp`, `SourceParentApp`, `TargetParentApp`, `Device`, `BLEDevice`, `OS`, `Stripe`, `RealtimeService`, `GoogleLiveFlash` (and variants).
- [x] Purpose linked from `docs/usecases/README.md` (see §11 — added by P1.3).

---

## 7. Maintenance

- Update this file whenever a new UC actor file lands under `docs/usecases/actors/` OR a new consumer-surface participant is added to `docs/sequences/_actors.md`.
- Do not modify `docs/sequences/_actors.md` to add UC-style names — the allow-list is frozen by AC-9 of `scripts/sequences/validate-sequences.mjs` and changes require an explicit allow-list amendment commit.
- This glossary is hand-curated; no generator owns it.
