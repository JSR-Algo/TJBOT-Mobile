# Use Case — Modular Diagrams

Domain-chunked use case diagrams for the `tbot-design` JSX prototype.
One `.puml` file per bounded context. Render with PlantUML CLI or VS Code PlantUML extension.

## Files

| File | Domain | Primary actor | LOC budget |
|---|---|---|---|
| `00-overview.puml` | Actors + boundaries + cross-domain edges | All | small |
| `auth.usecase.puml` | Identity & session lifecycle | Guest, AuthUser | small |
| `onboarding.usecase.puml` | Pre-account intro & permissions | Guest | small |
| `kid-hub.usecase.puml` | Daily entry surface for child | Child | small |
| `course-browse.usecase.puml` | Read-only course tree (kid) | Child | small |
| `lesson-session.usecase.puml` | Voice activity loop + in-session recovery | Child, Voice | medium |
| `progress.usecase.puml` | Post-session retrospectives | Child | small |
| `parent-gate.usecase.puml` | Speed-bump gate (shared service) | Child→Parent | small |
| `parent-summary.usecase.puml` | Parent dashboards | Parent | small |
| `course-library.usecase.puml` | Commerce + send-to-robot | Parent, Robot | medium |
| `purchase.usecase.puml` | Hardware + subscription funnel | Parent, Pay, Robot | medium |
| `device-pairing.usecase.puml` | One-time provisioning | Parent, Robot, Wi-Fi | medium |
| `robot-mgmt.usecase.puml` | Post-pair diagnostics | Parent, Robot | small |
| `fallback-shell.usecase.puml` | App-level error & safety surfaces | All | small |

## Cross-Domain Relation Map

```text
onboarding   → auth          (login step inside onboarding flow)
auth         → kid-hub       (on success → home)
kid-hub      → parent-gate   (Enter Parent Space)
kid-hub      → lesson-session (Start Today's Lesson)
kid-hub      → course-browse (Open Course / Review)
kid-hub      → progress      (Open Today's Progress)

course-browse → lesson-session (Start Lesson / Mission / Review)

lesson-session → progress     (Lesson Complete → Lesson Summary)
lesson-session → kid-hub      (Confirm Exit)

progress     → lesson-session (Review Needed → re-enter)

parent-gate  ← parent-summary (gate include)
parent-gate  ← course-library (gate include + UC_PG_UNLOCK)
parent-gate  ← purchase       (UC_PG_UNLOCK on activation)
parent-gate  ← device-pairing (gate include)
parent-gate  ← robot-mgmt     (gate include)

parent-summary → robot-mgmt   (Settings → Robot software / mic test)
course-library → device-pairing (requires robot paired)
course-library → robot-mgmt   (Needs Sync → Update Wi-Fi)

purchase     → course-library (Add First Course → cl_added)
purchase     → device-pairing (NOT direct in code; activation precedes pairing in narrative)

robot-mgmt   → course-library (Storage → Browse Library)

fallback-shell → lesson-session (Resume Lesson, Reconnecting Overlay)
fallback-shell → kid-hub      (Back home from any error)
```

## Shared services / actors

- `parent-gate` is **shared** by every parent-only domain (5 importers).
- `Robot Device` actor is shared by: course-library, purchase, device-pairing, robot-mgmt, lesson-session (indirect via voice).
- `Realtime Voice Service` is unique to lesson-session.
- `Payment Provider` is unique to purchase.
- `Wi-Fi Network` is unique to device-pairing.
- `src/services/http/idempotency.js` is shared by purchase / course-library / device-pairing on commit operations.

## How AI agents should consume these files

| Task | File(s) to load |
|---|---|
| Reasoning about a new commerce feature | `course-library.usecase.puml` + `purchase.usecase.puml` + `parent-gate.usecase.puml` |
| Touching the voice loop | `lesson-session.usecase.puml` only (recovery is contained) |
| Working on parent-only flow | `parent-gate.usecase.puml` + the target domain file |
| First-time orientation | `00-overview.puml` only |
| Cross-domain refactor | `00-overview.puml` + this README cross-reference table |

## Conventions

- Use case IDs follow `UC_<DOMAIN>_<NAME>` (e.g. `UC_LSN_START`, `UC_CL_BUY`).
- `<<UNDEFINED>>` stereotype = use case present in store/API but **no UI trigger** in source.
- `<<service>>` = shared cross-domain capability (currently only `parent-gate`).
- `<<external>>` actors are out-of-process systems.
- `[entry]` / `[exit]` notes mark cross-domain handoff points.
- `<<delegate>>` edges go to external actors; `<<include>>` and `<<extend>>` stay within or across internal use cases.
- Items marked `NOT CONFIRMED IN SOURCE` are referenced but not implemented in the JSX prototype.
