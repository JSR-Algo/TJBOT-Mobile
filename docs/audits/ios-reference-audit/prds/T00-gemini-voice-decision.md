# T00: Gemini Live voice ship/remove decision

## Status
Registry status: BLOCKED | Priority: P0 | Blast radius: HIGH

## Problem
The Gemini Live voice path creates a mutually-exclusive fork in the task registry: T17/T20/T21 ship Gemini, while T18/T19 remove it. No single decision task forces the fleet to pick one branch, which will lead to planning deadlock.

Source: `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/tasks/registry-validation.md`, section "The Gemini fork is not gated" (lines 63–71). The validation report explicitly recommends adding a meta/decision task (e.g., `T00-gemini-voice-decision`) with two outcomes, making T17/T20/T21 conditional on `SHIP_GEMINI` and T18/T19 conditional on `REMOVE_GEMINI`, and marking T17–T21 as `BLOCKED` until the decision is recorded and communicated.

Source: `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/tasks/registry.json`, T00 entry (lines 6–36). The registry already encodes this task as `BLOCKED`, `coordination_required: true`, with acceptance criteria that require a recorded decision and legal/product/safety sign-off before T17–T21 are unblocked.

## Scope
### In scope
- This PRD and decision record only.
- Updating the T00 registry status to `COMPLETED` once a decision is recorded.
- Communicating the decision to owners of T17–T21.
- Updating `tasks/registry-validation.md` to reflect that the Gemini fork is now gated, if desired.

### Out of scope
- No source code changes.
- No deletion or wiring of Gemini components, hooks, native modules, or feature flags (owned by T17–T21).
- No package.json dependency changes (owned by T18/T19).
- No iOS/Android native build changes.

## Proposed solution
1. Schedule a decision meeting with Product, Legal, and Safety.
2. Evaluate the Gemini Live voice path against:
   - COPPA/children’s-privacy compliance
   - Backend voice-budget and latency constraints
   - Alpha roadmap priorities and resourcing
   - Fallback plan if Gemini is removed (T21 alternative voice path, if any)
3. Record the outcome as exactly one of:
   - `SHIP_GEMINI`
   - `REMOVE_GEMINI`
4. Capture sign-off names/roles and date in this PRD’s Decision Checklist.
5. Update `tasks/registry.json`:
   - Set T00 `status` to `COMPLETED`.
   - Unblock the chosen branch:
     - If `SHIP_GEMINI`: set T17/T20/T21 `status` from `BLOCKED` to `NOT_STARTED`.
     - If `REMOVE_GEMINI`: set T18/T19 `status` from `BLOCKED` to `NOT_STARTED`.
6. Notify the fleet that T00 is closed and the downstream branch is unblocked.

## Acceptance criteria
- Decision outcome is recorded as `SHIP_GEMINI` or `REMOVE_GEMINI`.
- Legal, product, and safety sign-off is captured for the chosen direction.
- T17–T21 are unblocked only after the decision is recorded and communicated.

## Dependencies
None. T00 is the fleet-wide gate for the Gemini fork.

## Exclusions / anti-overlap
- T17, T20, T21 must NOT start while this decision is `BLOCKED`/`UNDECIDED`.
- T18, T19 must NOT start while this decision is `BLOCKED`/`UNDECIDED`.
- Do not attempt to implement both branches in parallel.

## Verification test plan
- Test file: none (`task.verification.test_file` is `null` for this meta/decision task).
- What it proves: This task is verified by the Decision Checklist below, not by an automated test.
- How to run it: Review the completed checklist and confirm the registry status change.
- Expected state before fix: `UNDECIDED`; T17–T21 remain `BLOCKED`.
- Expected state after fix: `DECIDED`; one branch (T17/T20/T21 or T18/T19) is unblocked.

## Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Decision stalls and blocks the entire audit fleet | Schedule the decision meeting within 48 hours; escalate to PM if sign-off is delayed. |
| Decision is recorded informally and later reversed | Capture sign-off in writing in this PRD and update the registry JSON as the single source of truth. |
| Both branches start implementation in parallel | Treat T00 as a hard gate; do not move T17–T21 out of `BLOCKED` until T00 is `COMPLETED`. |
| Legal/Safety reject Gemini after engineering work begins | Do not begin T17/T20/T21 implementation until sign-off is complete. |

## Coordination notes
- **Who must be consulted:** Product owner, Legal counsel, Safety/Trust & Safety lead, Mobile engineering lead, Backend/AI services lead.
- **What contract must be confirmed:**
  - If `SHIP_GEMINI`: confirm backend voice-budget/latency contract and native-module maintenance ownership.
  - If `REMOVE_GEMINI`: confirm there is no external commitment to Gemini features and that the fallback voice path (if any) is sufficient for alpha.

## Implementation hints
- The authoritative registry is at `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/tasks/registry.json`.
- The validation rationale is at `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/tasks/registry-validation.md` lines 63–71.
- Downstream task details:
  - Ship branch: T17 (`wire-gemini-conversation-screen`), T20, T21.
  - Remove branch: T18 (`delete-orphaned-gemini-js`), T19 (`remove-gemini-native-modules`).

---

# Decision Checklist

Use this checklist to verify T00 is complete. All items must be checked before any downstream task leaves `BLOCKED`.

- [ ] Decision meeting held with Product, Legal, and Safety.
- [ ] Outcome recorded: `SHIP_GEMINI` ___ or `REMOVE_GEMINI` ___ (check one).
- [ ] Legal sign-off: name _________________ date ________
- [ ] Product sign-off: name _________________ date ________
- [ ] Safety sign-off: name _________________ date ________
- [ ] `tasks/registry.json` updated:
  - [ ] T00 `status` set to `COMPLETED`.
  - [ ] Chosen branch tasks moved from `BLOCKED` to `NOT_STARTED`.
  - [ ] Rejected branch tasks remain `BLOCKED` or marked `WONT_FIX`.
- [ ] Decision communicated to mobile engineering fleet (Slack/email/standup).
- [ ] This PRD committed/updated in the audit docs folder.
