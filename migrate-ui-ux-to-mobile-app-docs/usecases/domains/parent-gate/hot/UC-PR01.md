# Hot UC — `UC-PR01 Pass Parent Gate`

> Hot dossier per Phase 1.5 backfill. Owning lane: C. Promoted via §6.2 Criterion 2 (target of ≥3 cross-domain edges per `reference/cross-domain-edges.json`).

## Identity

- **ID:** UC-PR01
- **Title:** Pass Parent Gate
- **Domain:** `parent-gate`
- **Owning Lane:** C
- **Hot criteria met:** **Criterion 2** (6 incoming cross-domain edges — the shared service that gates every parent-only surface)

## Status

- **Index status:** `defined`
- **Backend status:** `BACKEND_NOT_DESIGNED`. Speed-bump only — KD4 says NOT real RBAC. Backend cannot make this a real auth boundary without a server-side parent-role attribute.

## Detailed flow

1. Mount `ParentGatePage` — generates random 3-digit number (`ParentGateScreen.jsx:7`).
2. Render: number on screen + numeric input field + "Back to play" affordance.
3. User types number. On match (`ParentGateScreen.jsx:11`), 280ms timer fires `go('parent_summary')` (or back-link target depending on which UC initiated the gate).
4. On mismatch: input stays, no error message — user can keep typing until correct.
5. On "Back to play": `go('home_hub_idle')`.

State: stateless component-local React state — no store mutation.

## Why hot — incoming edges (6)

UC-PR01 is the **shared service** for all parent-mode entry. Every parent-only domain edges through it:

- UC-H08 (kid-hub "Enter Parent Space")
- UC-PR02 (parent-summary entry)
- UC-CL01 (course-library Browse)
- UC-DP01 (device-pairing Overview)
- UC-RM01 (robot-mgmt My Robot)
- UC-F07 (fallback safety redirect requires confirmation)

**Implication:** one shared screen, six callers. Any UX or behavior change to the gate has 6-domain blast radius. Coordinate via PR comment to Lane C.

**Sibling edge:** UC-CL03 includes UC-CL04 which is the 4-digit unlock variant (`UC_PG_UNLOCK`, the second parent-gate puml entry). UC-PR01 covers the 3-digit speed bump only — UC-CL04 is a different intent (transactional confirm, not access gate) and lives in course-library.

## Cross-domain edges

- Incoming: 6 `requires` edges.
- Outgoing: none — UC-PR01 hands control back to whoever invoked it (variable target). Currently the prototype hard-codes `go('parent_summary')`, which means edges from UC-CL01/UC-DP01/UC-RM01 would not return to their actual caller. Flagged.

## Open questions

- **Return target indirection:** ParentGatePage hard-codes `go('parent_summary')` on success. Six callers assume the gate returns to *their* destination. Currently only the UC-H08 path is correct; UC-CL01/UC-DP01/UC-RM01 callers would need to set a return-target before invoking, or the gate needs a "next" parameter.
- **Speed-bump rotation:** 3-digit random number resets per mount. If parent fails one, screen stays open with the same target — there's no rate limiting. Acceptable for a non-RBAC speed bump.
- **KD4 escalation:** plan says "treat as parent-mode toggle, not security control." When backend lands, decide whether to keep the gate as UX or replace with real `Parent` role + token claim. Tracked under `BACKLOG-PARENT-RBAC-DECISION` (proposed).

## Carry-forward

- Proposed backlog entry: `BACKLOG-UC-PR01-RETURN-TARGET` (owner: Lane C, target: TBD; action: parameterize the gate's success target so all 6 callers route correctly).
- Proposed backlog entry: `BACKLOG-PARENT-RBAC-DECISION` (owner: Lane C + future backend lane, target: TBD; action: decide whether to replace speed-bump with real role-based auth).
