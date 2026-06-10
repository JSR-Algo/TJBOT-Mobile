# 0011 ChildProfile Multi-Child Management

Date: 2026-05-12

## Status

Accepted

> **2026-05-12 P11 ERD reconciliation:** This ADR proposes a `child_profiles` table with status enum `('active', 'suspended', 'deleted')`. The existing ERD already has `docs/erd/01-identity/children.dbml` with status enum `('active', 'archived', 'scheduled_for_deletion', 'deleted')` covering the same concept with finer granularity. Adopting the existing table:
> - ADR "active" → existing `status='active'`
> - ADR "suspended" → existing `status='archived'`
> - ADR "deleted (terminal)" → existing `status='deleted'` (via intermediate `status='scheduled_for_deletion'` during the 30-day retention window per D6)
>
> The existing `children` table is COPPA-scoped per sys-01 conventions and already declares the retention sweep ownership at sys-14. No migration needed; ADR commitments D1–D10 apply against `children` with the status vocabulary mapped above. UC bodies + sequences authored in P11 use the existing table + status names.

## Context

The mobile-design prototype was built assuming a single child per account. `auth.store` has one `child` field. UC-A08 (Set Up Child Profile) appears as a one-shot onboarding step. Every screen that reads child data assumes `child` is non-null and singular.

The audit (2026-05-12) flagged ~40 missing business UCs including:

- `UC_PROFILE_ADD_CHILD`
- `UC_PROFILE_SWITCH_CHILD`
- `UC_PROFILE_REMOVE_CHILD`

These are not edge cases — many TBot households have multiple kids of different ages and proficiency levels. A 6-year-old's lesson is not appropriate for an 8-year-old, and vice versa. Sharing one child profile across siblings poisons the progress tracking, COPPA consent record, and lesson personalization that the rest of the system depends on.

Constraints surfaced during P5–P9 and the audit:

- COPPA consent (ADR-0005 + P3.A) is recorded per `(user_id, policy_version)`, but the linked `children` table FK is per-child-row. So each child needs an independent `coppa_consents` row OR a shared row covering all children of the same parent — the audit-relevant question is whether re-consent is required per child.
- Entitlements (P3.C — Order, Subscription) are typically per-account, but lesson-session progress is per-child. The boundary matters.
- ADR-0010 (this batch) introduces primary + secondary parents. Each parent can see + manage all children in the household.
- The "active child" pattern is well-established in similar products (Netflix Kids, Khan Academy Kids): an explicit selector when launching the kid surface; bottom-of-screen indicator showing current active child.

## Decision

**Each household supports an unlimited number of `child_profiles`. The parent app exposes a child selector when more than one exists. Lesson runtime, progress, and entitlements bind to a specific `active_child_id` set per device. COPPA consent is per-child, granted once at child creation.**

Concrete commitments:

| # | Commitment |
|---|---|
| D1 | `child_profiles` table: `id uuid PK`, `household_id uuid NOT NULL`, `coppa_consent_id uuid NOT NULL REFERENCES coppa_consents(id)`, `display_name varchar(64) NOT NULL`, `birth_year int NOT NULL`, `language_target varchar(8) NOT NULL`, `buddy_id varchar(32)`, `status child_profile_status NOT NULL DEFAULT 'active'`, `created_at`, `updated_at`, `deleted_at timestamptz NULL`. `child_profile_status ENUM = ('active', 'suspended', 'deleted')`. |
| D2 | Per-child COPPA consent is REQUIRED. Adding a 2nd child requires a fresh COPPA consent flow (UC-O05). Skipping or reusing prior consent for a new child is not permitted — each child's `coppa_consent_id` is its own row in `coppa_consents`, pointing at the same parent's `user_id` + the current `policy_version`. |
| D3 | One child is the "active child" per device at any time. Stored client-side in `auth.store.activeChildId`; persisted to AsyncStorage so app restart preserves selection. New API call `POST /v1/profile/active-child` notifies server for analytics + entitlement enforcement (server uses active_child_id for cost-cap scoping). |
| D4 | Active-child selector UI: shown when household has > 1 child. `home_hub_idle` displays "Playing as: [Name] ▼" — tap opens bottom sheet with all active children + "Add a child" CTA. The selector is also accessible from `parent_settings → Children`. |
| D5 | Add-child flow: any household parent (primary OR secondary) can add — gated only by the per-child COPPA consent (UC-O05). New child rows include `created_by_user_id` for audit. |
| D6 | Suspend vs Delete: suspending a child (`child_profile.suspend`) sets `status='suspended'` and hides the child from selector + kid surface, but keeps the data intact. Deletion (`child_profile.delete`) is **primary-parent-only per ADR-0010 D5**, sets `deleted_at`, and triggers the 30-day retention pipeline (sequence: `14-retention/account-deletion-pipeline` adapted for child-only scope). |
| D7 | Per-child lesson history: `realtime_sessions.child_id` already exists (per `state-machines-mobile-ux.md` §8.2). Today it's unused; this ADR makes it the canonical join. Progress, words-practiced, and lesson summaries (sys-11 + UC-P03) all filter by `child_id`. |
| D8 | Entitlements are account-level, not per-child. A subscription unlocks content for ALL children in the household. Content packs purchased one-off via UC-CL03 unlock for the household. No per-child paywalls — protects family equity, simplifies billing. |
| D9 | Daily limits + safety filters apply per-child. Cost cap ($0.12 / day per ADR existing) is independently tracked per `child_id`. Per-child screen-time limits configured by primary parent. |
| D10 | UC-O04 (First Lesson Entry) and UC-O05 (COPPA Consent) become **per-child onboarding** instead of one-shot. The first child runs through them at signup; subsequent children run a slimmer version (`UC_PROFILE_ADD_CHILD`) that skips reusable parts (parent identity, payment method) and only collects per-child fields. |

## Drivers

In priority order:

1. **Closes 3 audit-flagged missing UCs** (UC_PROFILE_ADD_CHILD / SWITCH / REMOVE) — these are not edge cases for the target market.
2. **Lesson personalization integrity.** Mixing 2 kids' progress on one profile breaks the SRS / curriculum-pacing logic the lesson-session backend is designed around.
3. **COPPA per-child consent.** Each child is a separate consenting subject under COPPA; we can't legally bundle.
4. **Cost-cap correctness.** Per-child cost tracking prevents a single child from exhausting the daily envelope and starving sibling lessons.
5. **Family-economic fairness.** D8 (entitlements are household-level) means a 2-child family doesn't pay double — protects subscription value and product fairness.

## Alternatives Considered

1. **Per-child paywall ("upgrade to family plan").** REJECTED. (a) Strongly anti-family; (b) industry trends are toward family-bundle pricing; (c) creates a sibling-fairness problem; (d) revenue gain is marginal vs. CSAT loss.

2. **One profile, "child mode" switch.** REJECTED. (a) Conflates curricula; (b) COPPA records become unauditable per child; (c) progress data is uninterpretable.

3. **N completely separate accounts (one per child).** REJECTED. (a) Each child needs a payment method? No; (b) parent has to log in/out per child — awful UX; (c) loses the household notion entirely.

4. **Cap at 4 children per household.** PARTIAL REJECTION (kept as soft-cap). 4 is a reasonable upper bound; we'll enforce a 10-child hard cap (catches abuse) and surface "Most families have 1-4 kids" copy in the add-child flow.

5. **Server-tracked active-child (no client-side).** REJECTED. Adds a network round-trip on every app start to know who's playing. Local-first + server-sync (D3) is the right pattern.

6. **Per-child subscription / cost-cap.** REJECTED for v1. Adds complexity to billing without obvious user value. Could be a future "premium-tier" feature.

## Consequences

### Positive

- **Closes 3 missing-UC anomalies** from audit (P3 plus this ADR).
- **Lesson personalization works correctly** for the first time in multi-kid households — each child's pacing is independent.
- **COPPA audit trail per child** — each consent maps to one named subject.
- **Family fairness** — one subscription serves the whole household. Strong product story.
- **Cost / safety isolation** — one kid hitting cost-cap doesn't kill other kids' lessons.
- **Reuses existing entities** (`realtime_sessions.child_id`, `coppa_consents.user_id` already point at parent — child needs its own row). Migration is additive.

### Negative

- **One new table + ENUM.** `child_profiles` adds a meaningful row count per household but is bounded.
- **Active-child UI is a new surface** — selector sheet + per-child personalization screen + bottom-of-home indicator. Reasonable scope; touches `home_hub_idle` + `parent_settings` + onboarding-resumed.
- **Per-child COPPA consent flow on every add** = friction for households adding their 2nd or 3rd child. Mitigated by the per-child slim flow (D10) being shorter than first-child onboarding.
- **Lesson SRS data migration** — for households with one existing child today, the migration creates one `child_profiles` row from `users` data. For households with one "shared" child today (where parents are using one profile for two kids — likely common), we cannot retroactively split data; surface a "Set up sibling profiles" copy.
- **Cost-cap UX surface** — per-child caps need a per-child read-out in `parent_settings → Children → [name]`.

### Neutral

- ChildProfile state machine joins the SM plan as §2.8: `active → suspended → deleted` plus the 30-day retention path.
- `auth.store.child` becomes `auth.store.activeChild`; legacy field aliased for backward compat in the migration commit.
- ADR-0010 (primary-parent) is the gating ADR for `child_profile.delete`; this ADR depends on it.
- New screens: `AddChildScreen`, `SwitchChildScreen` (or use a bottom-sheet), `ParentChildrenScreen` (children list under settings).

## Implementation Pointers (informational, not part of the ADR commitment)

| Layer | Change |
|---|---|
| `docs/erd/01-identity/child_profiles.dbml` | NEW per D1. |
| `docs/erd/01-identity/coppa_consents.dbml` (existing) | Already supports per-`(user_id, version)` UNIQUE — no change. Each child's consent is a separate row that shares user_id + version. |
| `state-machines-mobile-ux.md` | Add §2.8 ChildProfile FSM. |
| `docs/architecture/use-case-diagram.md` | Add UC-A15 Add Child Profile, UC-A16 Switch Active Child, UC-A17 Suspend Child Profile, UC-A18 Delete Child Profile. |
| `docs/usecases/domains/auth/use-cases.md` | Bodies for UC-A15..UC-A18. |
| `docs/usecases/domains/auth/{backend-mapping,edge-cases}.md` | Add rows for the 4 new UCs. |
| `docs/sequences/01-identity/child-add.sequence.mmd` | NEW. ParentApp → IdentityService → coppa_consents + child_profiles inserts. |
| `docs/sequences/01-identity/child-switch.sequence.mmd` | NEW. ParentApp → IdentityService → analytics emit. Lightweight. |
| `docs/sequences/01-identity/child-delete.sequence.mmd` | NEW. Primary-only; triggers retention pipeline scoped to child_id. |
| `src/store/auth.store.js` | Add `activeChildId` + `children[]` (kept locally for selector); selectors `getActiveChild()`, `canAddChild()`. |
| `src/features/auth/screens/AddChildScreen.tsx` | NEW. Slim per-child onboarding (D10). |
| `src/features/auth/screens/SwitchChildScreen.tsx` OR bottom-sheet | NEW. Per D4. |
| `src/features/parent/screens/ParentChildrenScreen.tsx` | NEW. Lists children under `parent_settings`. |
| `src/features/home/screens/HomeHubScreen.tsx` | Add active-child chip + tap-to-switch when household has > 1 child. |
| `docs/usecases/domains/onboarding/use-cases.md` (UC-O04, UC-O05) | Note the per-child re-run path. |

## Verification

After implementation:

- Unit: `child_profiles.dbml` lints; FK to `coppa_consents` resolves.
- Integration: Add 2nd child → UC-O05 consent flow runs → new `coppa_consents` + `child_profiles` rows linked; both visible in selector.
- Integration: Switch active child → `realtime_sessions` from that point forward bind to the new `child_id`; prior session-history filter is correct.
- Integration: Secondary parent attempts `child_profile.delete` → 403 with `requires_role=primary` (per ADR-0010 D5).
- Integration: Subscription cancel does not delete children (entitlement is decoupled from profile lifecycle).
- COPPA review: each child has its own `coppa_consents` row; deletion of one child does NOT affect the other's consent or progress.
- UX: child selector appears only when N > 1; single-child households never see the selector chip.

## Follow-ups

- **Per-child screen-time limits** — separate ADR if we go beyond the daily cost-cap.
- **Cross-household child sharing** — divorce scenarios where one child is co-parented across two TBot households. Out of scope for v1; future ADR.
- **Child-initiated rename** — let the kid pick their own buddy name within sandbox limits. Future UX research.
- **Sibling cooperative play** — two kids on one robot doing collaborative lessons. Out of scope; product-decision driven.
- **Per-child notification settings** — primary parent gets one daily summary; secondary can opt in per child. Future ADR.
