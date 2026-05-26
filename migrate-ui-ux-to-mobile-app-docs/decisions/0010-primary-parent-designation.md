# 0010 Primary-Parent Designation in a Household

Date: 2026-05-12

## Status

Accepted

> **2026-05-12 P11 ERD reconciliation:** This ADR proposes a `household_parents` table with role enum `('primary', 'secondary')`. The existing ERD already has `docs/erd/01-identity/household_members.dbml` with role enum `('owner', 'manager', 'viewer')` covering the same concept. Adopting the existing table:
> - ADR "primary parent" → existing `role='owner'`
> - ADR "secondary parent" → existing `role='manager'`
> - The `viewer` role is a third tier reserved for future use (mentioned in ADR follow-ups).
>
> No migration needed; ADR commitments D1–D10 apply against `household_members` with the role vocabulary mapped above. UC bodies + sequences authored in P11 use the existing table + role names.

## Context

ADR-0005 D4 introduced the parent-lockout cooldown (15 minutes after 5 failed PIN attempts) and stated the cooldown could be cleared by "primary parent" — but the primary-parent notion was explicitly deferred. ADR-0008 (PIN recovery) similarly references primary-parent override as one path. ADR-0011 (multi-child management, landing in this batch) needs an "owner" role for child-profile delete and account-delete. We can't keep deferring; the absence of a primary-parent designation blocks four downstream flows.

The product reality:

- Many households have two or more adults who legitimately use the parent surface (mom + dad, parent + grandparent, parent + nanny).
- A single shared account with one PIN that everyone knows is the path of least resistance and what almost-all current TBot users do (assumed).
- Some flows MUST be restricted to a single accountable adult — account deletion, child-profile delete, primary-parent transfer, lockout clear-on-behalf-of-other-parent, fraud-related actions.
- "All adults are equal" is unsafe: in divorce / separation scenarios a hostile co-parent could delete a child's progress, cancel a subscription as retaliation, or alter safety settings.
- "Only one parent allowed" is too restrictive: many co-parenting setups depend on shared access.

Constraints surfaced during P5–P9:

- ADR-0005 D5: `parent_sessions` is per-jti, not per-parent. Today the JWT holds `user_id` but does not distinguish which adult is using the device.
- ADR-0011 (this batch) will introduce per-parent profile rows. We need a sub-typing of those rows to identify primary vs secondary.
- COPPA expects a single legally-authorized adult per child profile, even when two adults co-parent. That adult must be auditable.

## Decision

**Every TBot household has exactly one `primary_parent`. Additional adults are `secondary_parent`s, who share the parent surface but cannot perform destructive or ownership-changing actions.**

Concrete commitments:

| # | Commitment |
|---|---|
| D1 | A new table `household_parents(user_id uuid PK, household_id uuid NOT NULL, role parent_role NOT NULL, added_at timestamptz, added_by_user_id uuid)`. `parent_role ENUM = ('primary', 'secondary')`. UNIQUE on `(household_id, role)` WHERE `role = 'primary'` enforces "exactly one primary per household". |
| D2 | At signup, the registering adult is implicitly created as `primary_parent`. There is no "no primary" state — the row is required as part of account creation. |
| D3 | Secondary parents are added via an invite flow: primary parent issues an invite (`POST /v1/household/parents/invite` with `email` + optional `nickname`); server emails a magic link; invitee accepts → joins as `secondary_parent`. Invitations are revocable + auditable. |
| D4 | Each parent has their own `parent_pins` row + their own `parent_sessions` lifecycle. Wrong-PIN attempts are scoped per parent, not per household. (One parent's lockout does not lock the other out.) |
| D5 | Restricted-to-primary actions: `account.delete` (UC-A12), `account.transfer_primary` (new), `child_profile.delete`, `household_parents.invite`, `household_parents.revoke`, `parent_lockout.clear_for_other_parent`, `subscription.cancel` (per Stripe-account-owner contract — only primary holds the payment method). |
| D6 | Shared-by-both actions (any parent can perform): `child_profile.create`, `child_profile.edit`, `controls.update`, `content.entitlements_grant`, `parent.session.refresh-freshness`, `parent.pin.reset` (their own only), `device.pair`, `robot.diagnostics`. These read like "the day-to-day stuff". |
| D7 | Primary transfer is a 2-step, audit-heavy flow: (a) primary initiates `POST /v1/household/transfer-primary` with `to_user_id` (must be existing secondary); (b) target secondary confirms via biometric+PIN (ADR-0009 freshness) within 7 days; (c) on confirm, server flips both rows. If not confirmed in 7 days, request expires. Mirrors how Apple Family / Google Family transfer ownership. |
| D8 | Sole-primary safety: if primary attempts `account.delete` while secondary parents exist, server returns 409 `transfer_primary_first` with the secondary list. Forces explicit thought before sole-decision-maker change. |
| D9 | Audit: every primary-only action writes to `audit_logs` with `event_type='household.<action>'`, `payload={role: 'primary', target_user_id: …}`. Visible to ALL household parents on `parent_settings → Safety & Privacy`. |
| D10 | UX: parent app shows the current parent's role + name in `parent_settings → Account`. Primary-only buttons are visible to secondaries but disabled with explainer copy ("Only the primary parent can do this — ask <primary_name>"). |

## Drivers

In priority order:

1. **Closes four unblocked dependencies.** ADR-0005 D4 lockout clear, ADR-0008 primary override path, ADR-0011 child-profile destroy, account.delete (UC-A12) — all reference primary-parent designation that didn't exist.
2. **Single accountable adult** for COPPA / regulatory / payments. Stripe's payment method binding requires one account owner; "all-parents-equal" doesn't map.
3. **Co-parenting safety.** Divorce / separation scenarios get exit valves (primary transfer, primary-only delete). Hostile co-parent can't unilaterally destroy.
4. **Day-to-day convenience preserved.** D6 keeps the common actions shared — secondary parents aren't second-class for child-management UX.
5. **Auditability** (D9, D10). The role boundary is visible and logged; ambiguity at the household-policy layer is eliminated.

## Alternatives Considered

1. **All-parents-equal (no role).** REJECTED. (a) No model for who pays Stripe; (b) no protection in adversarial co-parent scenarios; (c) no way to bind COPPA consent to a specific adult.

2. **Strict 1-parent-per-account (no multi-parent).** REJECTED. (a) Excludes the majority of two-adult households; (b) forces real-world workarounds (shared password) that defeat the parent-gate security model entirely.

3. **N-level role hierarchy (owner / admin / member / viewer).** REJECTED. (a) Over-engineered for a kids' product; (b) UX cost of role-management UI is steep; (c) hard to explain to non-technical parents. Two levels (primary + secondary) is the floor that works.

4. **Capability-based ACL per action (no roles).** REJECTED. Same UX cost; same over-engineering. Capabilities are nice for backend code organization but a poor user-facing model.

5. **Per-child parent ("each child belongs to one adult").** REJECTED. Conflicts with how families actually work. Both adults often co-manage all kids in the household.

6. **External identity-provider household (Apple Family / Google Family integration).** REJECTED for v1. (a) Adds platform-coupling we don't want; (b) excludes households where adults use different platforms; (c) revisit as a future enhancement.

## Consequences

### Positive

- **Closes 4 deferred items.** ADR-0005 D4, ADR-0008 primary path, ADR-0011 destroy, UC-A12 delete — all now have a defined role contract.
- **Stripe account-owner model is clean.** Primary = payment-method holder = subscription-cancel authority. No race conditions on co-parent cancel.
- **Audit boundary is sharp.** Primary-only actions are easy to identify in `audit_logs`; compliance review (COPPA, future GDPR/CCPA) is straightforward.
- **Day-to-day UX is preserved.** Most actions (D6) are shared; secondary parents don't feel second-class for routine flows.
- **Primary transfer (D7)** unblocks divorce / separation scenarios with a 7-day cooling-off period that prevents impulsive transfers.

### Negative

- **One more table + ENUM + migration.** `household_parents` adds a row per parent. Not big, but it's a new joined-on table for every parent-side read.
- **UX work to surface roles** — primary-only buttons need consistent visual treatment + explainer copy across all 7+ restricted actions (D5).
- **Transfer flow is asynchronous + auditable + cancellable** — non-trivial state machine to model. Could become a future SM entry in `state-machines-mobile-ux.md`.
- **Secondary parent invite flow** is another new email-magic-link surface (like ADR-0008 PIN recovery). Reuses the primitive but adds a different payload.
- **Single-primary-loss risk.** If primary loses their phone, email, AND has no secondary parent, the only path back is support-mediated identity verification. Mitigated by encouraging at-least-one-secondary in onboarding copy.

### Neutral

- New ChildProfile FSM (P5 / ADR-0011 follow-up) references `household_id` from this table.
- `audit_logs.actor_user_id` already exists per P3.E ERD; this ADR adds new event_type values, no schema changes.
- `parent_settings → Account` gains a "Family" subsection showing primary + secondaries + invite button.
- Sequence diagrams `07-parent/household-invite-parent.sequence.mmd` + `07-parent/household-transfer-primary.sequence.mmd` document the two new flows.

## Implementation Pointers (informational, not part of the ADR commitment)

| Layer | Change |
|---|---|
| `docs/sequences/07-parent/household-invite-parent.sequence.mmd` | NEW. ParentApp(primary) → IdentityService → SES → ParentApp(invitee). |
| `docs/sequences/07-parent/household-transfer-primary.sequence.mmd` | NEW. Primary → IdentityService → secondary confirm (biometric+PIN) → role flip. |
| `docs/erd/01-identity/household_parents.dbml` | NEW. PK `user_id`, columns per D1. |
| `docs/erd/01-identity/households.dbml` | NEW (if not yet authored). Owns `household_id`. |
| `state-machines-mobile-ux.md` | Add §2.8 PrimaryTransfer FSM: `IDLE → REQUESTED → CONFIRMED → COMPLETED \| EXPIRED \| CANCELLED`. |
| `src/store/parent.store.js` | Add `role` field + `isPrimary()` selector. |
| `src/services/api/parent.api.ts` | Add `inviteSecondary`, `revokeSecondary`, `transferPrimary` stubs. |
| `src/features/parent/screens/ParentFamilyScreen.tsx` | NEW. List primary + secondaries; primary sees invite + revoke + transfer buttons; secondary sees read-only + leave-household. |
| `src/features/parent/screens/ParentSettingsScreen.tsx` | Add "Family" row → navigates to `ParentFamilyScreen`. |
| All primary-only buttons (UC-A12, UC-SUB02 / cancel, etc.) | Wrap in `<PrimaryGuard>` component that hides / disables for secondaries + shows explainer. |
| `docs/architecture/use-case-diagram.md` | Add UC-PR09 Invite Secondary Parent, UC-PR10 Revoke Secondary Parent, UC-PR11 Transfer Primary, UC-PR12 Leave Household. |
| `docs/usecases/domains/parent-summary/use-cases.md` | Bodies for UC-PR09..UC-PR12. |

## Verification

After implementation:

- Unit: `parent.store` `isPrimary()` reflects server role; updates on role-change push.
- Integration: secondary parent attempts `account.delete` → 403 with `requires_role=primary` envelope; UI shows explainer.
- Integration: primary issues invite → secondary accepts → both appear in `parent_settings → Family`.
- Integration: primary transfer flow — primary initiates, secondary confirms within 7d, role flip succeeds; both roles reflect in next session.
- Integration: primary transfer expires unconfirmed → roles unchanged.
- Audit: every primary-only action visible to both parents in `Safety & Privacy` log.
- COPPA review: `coppa_consents.user_id` points at the primary parent (who legally consented at signup).

## Follow-ups

- **Apple Family / Google Family bridges** — future ADR; for now we manage household membership internally.
- **Grandparent / nanny "viewer" role** — sometimes households want a third tier (can see progress + send approval-decline to primary). Future ADR.
- **Cross-household child sharing** — divorce scenarios where one child is co-parented across two households. Deferred; out of scope.
- **Subscription billing per parent** — some households want each adult on a separate payment method. Future ADR; currently primary is sole payer.
- **Primary-loss recovery** — when primary AND email AND no-secondary all converge. Support-mediated identity proof flow. Future ADR / runbook.
