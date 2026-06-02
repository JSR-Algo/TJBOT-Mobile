# Mobile-Driven API Contract Gap Analysis & Authoring Plan

**Status:** SHIP-READY v5.2 (post-V-10b gate-verification 2026-05-12) — APPROVED-WITH-CAVEATS, all caveats resolved, AI-1/2/3 applied
**Owner:** tbot-design (planner)
**Created:** 2026-05-12
**Revised:** 2026-05-12
**Scope:** tbot-mobile/tbot-design subrepo (authoring) → consumed by tbot-backend
**Mode:** Direct / contract-first authoring
**Plan file:** `.omc/plans/mobile-driven-api-contract-gap-analysis.md`
**Changelog:** Section 24 (revisions applied from Critic findings)

---

## 0. Context Snapshot (verified facts, not assumptions)

| Source | Path | State |
|---|---|---|
| Backend OpenAPI baseline | `/Users/manhhodinh/Documents/TBOT/tbot-backend/openapi.json` | **25 paths, 29 ops, 3 tags** (auth, households, devices). Covers Systems **01 + 02 only**. |
| Realtime spec slice | `/Users/manhhodinh/Documents/TBOT/docs/packages/shared-data/openapi/live-alpha.yaml` | 12K WS-flavored slice |
| System specs | `/Users/manhhodinh/Documents/TBOT/docs/site/software/systems/01..22-*.md` | 22 systems, complete |
| Sequence diagrams | `tbot-design/docs/sequences/{01..22,_cross}/*.sequence.mmd` | **94 files total** (90 per-system + 4 cross-system) as of 2026-05-12 recount, hand-curated, validated by `npm run sequences:fast`. Per-system counts: 01=10, 02=5, 03=5, 04=8, 05=5, 06=6, 07=6, 08=3, 09=3, 10=2, 11=3, 12=4, 13=4, 14=3, 15=1, 16=4, 17=2, 18=2, 19=8, 20=2, 21=2, 22=2. |
| ERD | `tbot-design/docs/erd/{NN-system}/*.dbml` + `_shared/schema.prisma` | DBML per system + global Prisma |
| Actor allow-list | `tbot-design/docs/sequences/_actors.md` | Frozen 2026-05-11, 118 actors |
| Mobile nav graph | `tbot-design/nav-graph-data.json` | 118 UI states, 15 groups, 12 mobile domains |
| Mobile flow domains | `tbot-design/docs/flows/domains/{12 dirs}/` | `calls.generated.json` all `count:0, calls:[]` — **placeholder, never populated** |
| Domain meta | `tbot-design/src/features/*/domain.meta.json` | Keys: `id, owner_lane, flow, edge_cases`. **No endpoint fields.** |

**Implication:** Backend exists for ~9% of system surface area (2/22). Mobile prototype has zero UI→endpoint linkage. This is greenfield contract authoring for 20 systems, brownfield reconciliation for 2.

**Known drift to address as side-effect of this plan:**
- `tbot-design/CLAUDE.md` references `docs/sequences/AGENTS.md` but file does not exist. Plan creates both `docs/sequences/AGENTS.md` (S0a) and `docs/api/AGENTS.md` (S0a).
- Per-system Prisma vs DBML source-of-truth: ERD lives in **both** `_shared/schema.prisma` and per-system `*.dbml`. Plan resolves: **DBML files are authoritative for per-system entity definitions; `schema.prisma` is the merged/emitted output via `scripts/erd/dbml-to-prisma.mjs`**. The schema-vs-OpenAPI validator consumes DBML (see Section 5/AC-3, R-3).

---

## 1. Requirements Summary

Produce hand-authored OpenAPI 3.1 contracts for every backend endpoint the **mobile app actually calls**, derived by walking the 12 mobile flow domains (118 UI states), cross-validated against the 22 system specs + 78 sequence diagrams + ERD, and reconciled with the 29 operations already in `tbot-backend/openapi.json`.

Outputs:

1. **UI→endpoint trace table** — every mobile state that performs a backend call mapped to method+path+system.
2. **Per-domain OpenAPI files** under `tbot-design/docs/api/<domain>/<action>.openapi.yaml` (one responsibility per file).
3. **Shared schemas + errors** under `tbot-design/docs/api/{shared,schemas}/`.
4. **Gap report** — endpoints required by mobile that don't exist in backend yet (the actionable backlog).
5. **Populated `calls.generated.json`** for all 12 mobile domains.
6. **Validator** — `npm run api:validate` that fails on: schema drift vs ERD, missing endpoint referenced by a UI state, missing endpoint referenced by a sequence diagram, unknown actor.

**Non-goals:**
- No backend implementation (NestJS controllers stay tbot-backend's responsibility).
- No UI code changes in this plan (mobile screens already exist).
- No rework of the realtime WebSocket wire contract (System 18 — owned separately by `live-alpha.yaml` + `docs/erd/18-wire-protocol/`).
- No deprecation of `tbot-backend/openapi.json` — it remains the **implementation-state oracle** (what backend currently exposes), reconciled against the hand-authored spec which becomes the **contract authority** (what the contract should be). Divergence is a backend ticket, not a contract change, unless the spec is found wrong via the appeal path (R-4). See R-1 for drift-handling protocol.

---

## 2. Acceptance Criteria (testable)

**Tag legend per Critic review:**
- **[concrete]** = verifiable today against existing files/tools.
- **[S0b-tooling]** = depends on validator scripts produced in stage S0b (Section 18). The validator is a deliverable; the AC asserts the validator's exit code once it exists.
- **[Phase-2]** = deferred to Phase 2 (post-S5). Authored metadata captured now, but not enforced in CI yet.

| # | Criterion | Verification | Tag |
|---|---|---|---|
| AC-1 | Every UI state in `nav-graph-data.json` with `kind: "happy"` has its required backend calls enumerated in the corresponding `docs/flows/domains/<d>/calls.generated.json` | `scripts/api/verify-ui-coverage.mjs` — exit 0 | [S0b-tooling] |
| AC-2 | Every endpoint referenced by any `.sequence.mmd` exists as an OpenAPI operation in `docs/api/` OR `tbot-backend/openapi.json`. Cross-system files under `docs/sequences/_cross/` MUST carry `derived_from:` frontmatter pointing to constituent per-system files; the validator dedupes message lines by `(file_of_origin, method, path)` so `_cross/` files do not double-count. Async messages (sequence `-->>`) MUST be reflected in OpenAPI as `202+Location`, declared `x-callbacks`, or named in `x-side-effects`. | `scripts/api/verify-sequence-coverage.mjs` — exit 0 | [S0b-tooling] |
| AC-3 | Every request/response schema field is type-consistent with the corresponding DBML entity column. **Source of truth: per-system DBML files under `docs/erd/<NN-system>/*.dbml`**; the merged `_shared/schema.prisma` is treated as emitted output. Validator runs in **warn-only mode for the lifetime of this plan (v4 scope cut)** — never promotes to error. Schema-coverage report still generated at `_reports/schema-coverage.md` as a tracking metric, not a gate. | `scripts/api/verify-schema-vs-erd.mjs` — exit 0 (always; warnings to report only) | [S0b-tooling] |
| AC-4 | `docs/api/` validates as OpenAPI 3.1.0 (no lint errors, all `$ref`s resolve from `index.openapi.yaml` aggregator entry point) | `npx @redocly/cli lint docs/api/index.openapi.yaml` — exit 0 | [concrete] |
| AC-5 | Granularity matches mode chosen in P-1 per D-9: **1-op-per-file** (`<action>.openapi.yaml` has exactly one path × method) OR **1-tag-per-file** (`<NN-system>.openapi.yaml` aggregates all ops for that system). Mode declared once in `docs/api/CONVENTIONS.md` and read by the validator. The `index.openapi.yaml` aggregator is the only exception in either mode — it MUST contain only `info`, `servers`, `security`, `tags`, `components` (with `$ref` to shared/schemas), and a `paths:` map whose values are all `$ref`s into per-action OR per-tag files. | `scripts/api/verify-granularity.mjs` (renamed from `verify-one-op-per-file.mjs`) — exit 0 | [S0b-tooling] |
| AC-6 | Every operation has: `operationId`, `summary`, `tags: [<NN-systemId>]`, `security`, `x-system-id`, `x-owner-lane`, `x-idempotent`, `x-sequence-refs` (≥1), `x-pagination: cursor\|offset` (list endpoints only), ≥1 success response, ≥3 error responses (400/401/403 minimum), ≥1 example payload. **Authored-not-enforced fields** (`x-erd-refs`, `x-ui-states`) MUST be present; validator content-checks deferred to Phase 2. Fields dropped from authoring (v4): `x-state-transition`, `x-side-effects`, `x-concurrency`. | `scripts/api/verify-operation-completeness.mjs` — exit 0 (Phase-1 fields only) | [S0b-tooling] |
| AC-7 | Gap report `docs/api/_reports/mobile-gap.md` is generated such that its row set equals `{ op ∈ docs/api/** : op ∉ tbot-backend/openapi.json AND ∃ UI state s ∈ nav-graph-data.json referencing op }`. Set-difference, not arithmetic subtraction. Each row carries: operationId, method, path, system tag, owner lane, recommended priority, referencing UI state IDs. Three spot-check rows manually validated by reviewer. | File exists; row generation script `scripts/api/generate-gap-report.mjs` deterministic; row count auditable from intermediate JSON | [S0b-tooling] |
| AC-8 | All 12 `domain.meta.json` files gain a `backend_calls: string[]` field listing `operationId`s used by that domain. Empty array `[]` permitted for navigation-only domains; field must be present. | `scripts/api/verify-domain-meta-backend-calls.mjs` — exit 0 | [S0b-tooling] |
| AC-9 | All actors named in sequence diagrams remain in the frozen allow-list at `docs/sequences/_actors.md`; no new ones introduced by API authoring. | `npm run sequences:fast` — exit 0 | [concrete] |
| AC-10 | Two authoring-conventions docs exist: `docs/sequences/AGENTS.md` (created by S0a; closes existing CLAUDE.md drift) AND `docs/api/AGENTS.md`. Both must define: lane ownership table, file structure rules, validation commands, naming rules, and section list. "Mirroring" means containing each of those 5 section headers, not prose match. Backend lead has signed off (`_reports/backend-lead-signoff.md` exists with date + signer). | File-existence check + signoff file check | [concrete] |
| AC-11 | CI workflow `.github/workflows/api-validate.yml` runs `npm run api:validate` on PRs touching `docs/api/**`, `docs/sequences/**`, `docs/erd/**`, `nav-graph-data.json`, or `src/features/**/domain.meta.json`. Status check visible on PR. | Workflow file exists; GitHub Actions run logged on test PR | [concrete] |
| AC-12 | For every backend system `NN` that has ≥1 mobile-reachable UI state (per AC-1 trace data), `docs/api/NN-<system>/` contains ≥1 `.openapi.yaml` file. This subsumes the prior coverage check; no separate `verify-mobile-system-coverage.mjs` script needed. | `scripts/api/verify-ui-coverage.mjs` extended to assert per-system non-emptiness; exit 0 | [S0b-tooling] |

**AC tag distribution: 4 concrete, 8 S0b-tooling, 0 broken, 0 Phase-2 (Phase-2 fields embedded in AC-6 description).** All 12 ACs become concrete-and-testable upon S0b validator completion.

---

## 3. File Structure (canonical)

```
tbot-design/
└── docs/
    ├── api/
    │   ├── AGENTS.md                            # authoring rules (mirrors docs/sequences/AGENTS.md)
    │   ├── CONVENTIONS.md                       # naming, vendor extensions, x-* fields
    │   ├── index.openapi.yaml                   # aggregator $refs every per-domain file
    │   │
    │   ├── 01-identity/                         # ONE subdir per backend system (NN matches sequences/ + erd/)
    │   │   ├── login.openapi.yaml
    │   │   ├── signup.openapi.yaml
    │   │   ├── refresh.openapi.yaml
    │   │   ├── logout.openapi.yaml
    │   │   ├── forgot-password.openapi.yaml
    │   │   ├── reset-password.openapi.yaml
    │   │   ├── consent.openapi.yaml
    │   │   ├── household-create.openapi.yaml
    │   │   ├── household-get.openapi.yaml
    │   │   ├── household-invite.openapi.yaml
    │   │   ├── household-join.openapi.yaml
    │   │   ├── child-create.openapi.yaml
    │   │   ├── child-update.openapi.yaml
    │   │   ├── child-delete.openapi.yaml
    │   │   ├── member-remove.openapi.yaml
    │   │   ├── account-get.openapi.yaml
    │   │   ├── account-delete.openapi.yaml
    │   │   └── account-export.openapi.yaml
    │   │
    │   ├── 02-device/                           # ble-code, register, claim, heartbeat, factory-register, list-by-household, get, delete
    │   ├── 03-device-runtime/                   # boot-token, runtime-config-pull, runtime-status-push
    │   ├── 04-realtime/                         # session-start, session-end, session-token, retry-token  (WS messages live in 18-wire-protocol)
    │   ├── 05-safety/                           # safety-check (internal), incident-report (admin), redaction-callback
    │   ├── 06-content/                          # lessons-list, lesson-get, daily-summary-get, personalization-snapshot-get, units-list
    │   ├── 07-parent/                           # controls-get, controls-update, schedule-get, schedule-update, summary-get, audit-feed
    │   ├── 08-config/                           # config-fleet-get (device-callable), config-overrides-list (admin)
    │   ├── 09-ota/                              # ota-manifest-get, ota-eligibility-check, ota-progress-report
    │   ├── 10-notifications/                    # subscriptions-list, subscription-upsert, test-send (admin), unsubscribe
    │   ├── 11-telemetry/                        # event-batch-ingest (device), event-query (admin), cost-summary (admin)
    │   ├── 12-admin/                            # admin/* — gated separately
    │   ├── 13-security/                         # secrets-rotate (internal), audit-event-list (admin)
    │   ├── 14-retention/                        # retention-policy-get, deletion-request-create, deletion-request-status
    │   ├── 15-manufacturing/                    # factory-bind, factory-burn, factory-attest
    │   ├── 16-mobile/                           # ble-pair-init, ble-pair-confirm, app-bootstrap, feature-flags-get
    │   ├── 17-gateway/                          # gateway-health, rate-limit-info  (mostly server-internal; only client-facing here)
    │   ├── 18-wire-protocol/                    # NO REST — pointer file `_see-realtime.md` references live-alpha.yaml + wire-protocol-domain-types.dbml
    │   ├── 19-billing/                          # plans-list, subscription-get, subscription-create, subscription-cancel, invoice-list, billing-portal-link
    │   ├── 20-authoring/                        # authoring/* — admin-only (out of mobile scope)
    │   ├── 21-testing/                          # testing/* — synthetic harness (out of mobile scope)
    │   ├── 22-demo/                             # demo/* — retail mode (out of mobile scope)
    │   │
    │   ├── shared/
    │   │   ├── errors.openapi.yaml              # ErrorResponse, ValidationError, FieldError
    │   │   ├── pagination.openapi.yaml          # Page, PageRequest, Cursor
    │   │   ├── headers.openapi.yaml             # Idempotency-Key, If-Match, X-Request-Id, X-Trace-Id
    │   │   ├── security.openapi.yaml            # parentJwt, deviceMtls, adminJwt, factoryToken
    │   │   └── examples.openapi.yaml            # reusable example payloads
    │   │
    │   ├── schemas/
    │   │   ├── identity/                        # User, Household, Child, Member, Invitation, ConsentRecord
    │   │   ├── device/                          # Device, BleCode, HeartbeatRecord, FactoryRegistration
    │   │   ├── realtime/                        # RealtimeSession, RealtimeToken
    │   │   ├── safety/                          # SafetyCheckRequest, SafetyVerdict, Incident
    │   │   ├── content/                         # Lesson, Unit, DailySummary, PersonalizationSnapshot
    │   │   ├── parent/                          # ParentControls, Schedule, ParentSummary, AuditFeedEntry
    │   │   ├── config/                          # ConfigFleet, ConfigOverride
    │   │   ├── ota/                             # OtaManifest, OtaProgressReport
    │   │   ├── notifications/                   # NotificationSubscription, NotificationTemplate
    │   │   ├── telemetry/                       # TelemetryEvent, TelemetryBatch, CostSummary
    │   │   ├── retention/                       # RetentionPolicy, DeletionRequest
    │   │   ├── billing/                         # Plan, Subscription, Invoice, BillingPortalLink
    │   │   └── primitives/                      # IsoTimestamp, IsoDate, Uuid, Locale, CurrencyCode, Email, PhoneE164
    │   │
    │   └── _reports/
    │       ├── mobile-gap.md                    # UI-required endpoints absent from backend baseline
    │       ├── sequence-coverage.md             # sequence-diagram → endpoint matrix
    │       ├── erd-schema-drift.md              # field-type mismatches vs ERD
    │       └── ui-state-coverage.md             # UI states → endpoint matrix
    │
    └── flows/                                   # UNCHANGED structure — only calls.generated.json gets populated
        └── domains/
            └── <12 dirs>/
                └── calls.generated.json         # NOW populated by scripts/flows/build-call-graph.mjs reading domain.meta.json + nav-graph-data.json
```

### Per-file invariants

- Exactly **one** OpenAPI operation per `.openapi.yaml` (verified by AC-5).
- File name = `<action>.openapi.yaml` in kebab-case, derived from operationId (`createHousehold` → `household-create.openapi.yaml`).
- Every file is independently readable (use `$ref` to `../shared/*` and `../schemas/*` only — never sibling files in the same dir).
- Every file declares `x-owner-lane: <lane>` (see Section 13) so multi-agent execution can shard.

---

## 4. Global API Index (target end-state)

Backend systems → mobile-reachable surfaces. Endpoints already in `tbot-backend/openapi.json` marked **(B)**, others are gap-fill candidates.

| # | System | Mobile-visible endpoints (representative) | Domain (UI) |
|---|---|---|---|
| 01 | Identity / Household / Access | (B) all 18 endpoints from current openapi.json | auth, parent |
| 02 | Device Provisioning & Registry | (B) `POST /v1/devices/ble-code/{sn}`, `POST /v1/devices/register`, `POST /v1/devices/claim`, `POST /v1/devices/heartbeat`, `GET /v1/devices/household/{hid}`, `DELETE /v1/devices/{id}` + new `POST /v1/devices/{id}/unpair` | device, robot-mgmt |
| 03 | Device Runtime | `POST /v1/devices/{id}/runtime/boot-token`, `GET /v1/devices/{id}/runtime/config`, `POST /v1/devices/{id}/runtime/status` | robot-mgmt (read-only on mobile) |
| 04 | Realtime Session Orchestrator | `POST /v1/realtime/sessions`, `DELETE /v1/realtime/sessions/{id}`, `POST /v1/realtime/sessions/{id}/token`, `POST /v1/realtime/sessions/{id}/retry-token` | lesson-session |
| 05 | Safety Pipeline | `POST /v1/safety/incidents` (parent), `GET /v1/safety/incidents/{id}` (parent view) — internal `POST /safety/check` NOT mobile-facing | parent, fallback |
| 06 | Content & Personalization | `GET /v1/lessons`, `GET /v1/lessons/{id}`, `GET /v1/units`, `GET /v1/summaries/daily?date=...`, `GET /v1/personalization/snapshot/{childId}` | course, course-library, home, progress |
| 07 | Parent Controls | `GET/PUT /v1/parent/controls/{childId}`, `GET/PUT /v1/parent/schedule/{childId}`, `GET /v1/parent/summary?range=...`, `GET /v1/parent/audit-feed` | parent |
| 08 | Config Fleet | `GET /v1/config/fleet/{deviceId}` (device-pulled, also visible to mobile for diagnostics) | robot-mgmt (diagnostics tab) |
| 09 | OTA | `GET /v1/ota/manifest?deviceId=...`, `GET /v1/ota/eligibility/{deviceId}`, `POST /v1/ota/progress` | robot-mgmt (firmware tab) |
| 10 | Notifications | `GET /v1/notifications/subscriptions`, `PUT /v1/notifications/subscriptions/{id}`, `POST /v1/notifications/unsubscribe` | parent (notifications settings) |
| 11 | Telemetry / Audit / Cost | `POST /v1/telemetry/events:batch` (device-side; mobile uses for app analytics: `POST /v1/telemetry/app:batch`) | (cross-cutting) |
| 12 | Admin / Support Ops | Out of mobile scope. Documented for completeness. | n/a |
| 13 | Security / Secrets | Out of mobile scope. | n/a |
| 14 | Data Retention / Deletion | `POST /v1/retention/deletion-requests`, `GET /v1/retention/deletion-requests/{id}` (already partially via `/v1/households/{id}/data-export`) | parent (privacy settings) |
| 15 | Manufacturing | Out of mobile scope (factory token only). | n/a |
| 16 | Mobile (BLE + Bootstrap) | `POST /v1/mobile/ble/pair:init`, `POST /v1/mobile/ble/pair:confirm`, `GET /v1/mobile/bootstrap`, `GET /v1/mobile/feature-flags` | onboarding, device |
| 17 | API Gateway | `GET /v1/health`, `GET /v1/gateway/rate-limits/me` (debug) | fallback (diagnostic) |
| 18 | Wire Protocol | **WebSocket only** — see `live-alpha.yaml`. Pointer file in `docs/api/18-wire-protocol/_see-realtime.md`. | lesson-session (WS connection) |
| 19 | Billing & Subscription | `GET /v1/billing/plans`, `GET /v1/billing/subscription`, `POST /v1/billing/subscription` (create checkout session), `DELETE /v1/billing/subscription`, `GET /v1/billing/invoices`, `POST /v1/billing/portal-link` | purchase |
| 20 | Content Authoring | Out of mobile scope. | n/a |
| 21 | Testing Harness | Out of mobile scope. | n/a |
| 22 | Demo / Retail | `POST /v1/demo/session` (kiosk mode), `DELETE /v1/demo/session/{id}` | (demo build only) |

**Mobile-relevant systems:** 01, 02, 03 (read-only), 04, 05 (parent-facing only), 06, 07, 08 (diagnostics), 09 (status), 10, 11 (app analytics slice), 14, 16, 17 (health), 18 (WS), 19, 22 = **16 systems** with mobile surface area.

**Out-of-mobile-scope systems:** 12, 13, 15, 20, 21 = **5 systems** authored only if they have admin-mobile flows (none currently).

Endpoint counts (target end-state, approximate):

| Tag | Operations |
|---|---|
| 01-identity | 18 (B baseline) |
| 02-device | 7 (6 B + 1 gap) |
| 03-device-runtime | 3 (gap) |
| 04-realtime | 4 (gap) |
| 05-safety | 2 mobile-facing (gap) |
| 06-content | 5 (gap) |
| 07-parent | 6 (gap) |
| 08-config | 1 mobile-facing (gap) |
| 09-ota | 3 (gap) |
| 10-notifications | 3 (gap) |
| 11-telemetry | 1 mobile-facing (gap) |
| 14-retention | 2 (gap, some overlap with B) |
| 16-mobile | 4 (gap) |
| 17-gateway | 2 (gap) |
| 19-billing | 6 (gap) |
| 22-demo | 2 (gap, demo build) |
| **Total target** | **~69 operations** (vs 29 baseline = **~40 new operations**) |

### 4.1 `index.openapi.yaml` aggregator semantics

The aggregator is the **only** file that resolves the spec into a complete OpenAPI document. Strict contents:

```yaml
openapi: 3.1.0
info:
  title: TBOT Mobile API
  version: 0.2.0
servers:
  - { url: https://api.tbot.ai, description: production }
  - { url: https://api.stage.tbot.ai, description: staging }
security:
  - parentJwt: []
tags:
  - { name: 01-identity, description: "..." }
  - { name: 02-device, description: "..." }
  # ... one per system
paths:
  /v1/auth/login: { $ref: "./01-identity/login.openapi.yaml#/paths/~1v1~1auth~1login" }
  # ... one $ref per (path, method); ordered by system then operationId
components:
  securitySchemes:
    $ref: "./shared/security.openapi.yaml#/components/securitySchemes"
  responses:
    $ref: "./shared/errors.openapi.yaml#/components/responses"
  parameters:
    $ref: "./shared/headers.openapi.yaml#/components/parameters"
```

**Bundling**: `npm run api:bundle` produces `docs/api/_built/openapi.json` via `@redocly/cli bundle`. This is the only file consumed by `openapi-diff` against `tbot-backend/openapi.json` (V-13) and by Prism mock-server (R-11). The aggregator MUST NOT contain inline path definitions, schemas, or examples.

**`_built/` artifact policy (NEW-MINOR-2 freshness story):**

- `docs/api/_built/` is **gitignored** (entry added in S0a). The bundle is a build output, not source.
- `npm run api:bundle` regenerates `_built/openapi.json` deterministically; CI verifies determinism by re-running on each PR and comparing hashes.
- `npm run api:bundle:watch` (added in S0a) regenerates on file save during local development; mobile devs running Prism (`prism mock docs/api/_built/openapi.json --port 4010`) get fresh schemas automatically.
- `npm run prebuild` hook regenerates the bundle before any consumer step (tests, lint, mock server) to prevent stale-mock contract drift.
- Bundle freshness reported by `scripts/api/bundle.mjs` exit code; if source files are newer than `_built/openapi.json`, CI fails with `bundle stale; run npm run api:bundle`.
- Mobile-dev environment `dev-mock` points to `http://localhost:4010`; switching to `dev-staging` or `production` is a per-environment config knob, not a build-time concern.

### 4.2 Alternatives Considered (formal record)

Decisions baked into Sections 3–5 that were NOT consensus-mode evaluated but should be on the record:

| # | Alternative | Why rejected |
|---|---|---|
| ALT-1 | **Backend NestJS decorators as source-of-truth** (status quo): backend emits OpenAPI, mobile consumes. | Inverts who-owns-contract. With 20/22 systems unimplemented, backend cannot emit a spec for what doesn't exist. Hand-authored spec is forward-driving; NestJS-emitted is backward-describing. Reconciliation handled in R-1 + appeal path in R-4 lets backend push back. |
| ALT-2 | **Single bundled `openapi.yaml`** (one file, all ops inline) | Merge-conflict hell with 4 parallel authors + ~69 ops. Diff readability collapses. Rejected. |
| ALT-3 | **One file per tag** (`01-identity.yaml` with 18 ops) | Better than ALT-2 but still serialized per-lane. Multi-author within a lane still conflicts. Rejected in favor of 1-op-per-file (AC-5) which makes per-PR ownership atomic. |
| ALT-4 | **Offset+totalEstimate pagination** | Defensible for parent dashboards (bounded sets) and would match backend's likely default. Rejected because parent audit feed + telemetry slices can grow large and cursor avoids the consistency-under-write problem. Tagged [ADR-needed] in Section 22 — decision is reversible if audit data stays small. |
| ALT-5 | **GraphQL** (instead of REST) | Solves over-/under-fetching but trades caching, observability, idempotency tooling maturity. The mobile flows are coarse-grained CRUD + 1 WS stream — GraphQL gain marginal. Out of scope (Section 19 #7). |
| ALT-6 | **gRPC** for mobile↔backend | Cross-platform mobile tooling (RN, Swift, Kotlin) less mature than REST + JSON. Rejected. |
| ALT-7 | **`x-erd-refs`, `x-state-transition`, `x-side-effects` enforced from day 1** | Tooling effort 1-2 weeks each. Demoted to Phase 2 (Section 5 + AC-6). Fields authored, not enforced. |
| ALT-8 | **Schema-vs-Prisma instead of Schema-vs-DBML** | Prisma is emitted from DBML (per `scripts/erd/dbml-to-prisma.mjs`); validating against emitted form would mask drift in the source. Rejected — DBML is source-of-truth (declared in Section 0 implication block). |
| ALT-9 | **Mandatory `Idempotency-Key` on all `POST`s including replays of inherently-idempotent ops** (auth/login, heartbeat) | Over-restrictive; auth/login replay is desirable (forms re-submit). Loosened in Section 10: "required only on POST that creates a resource OR triggers external side-effect (Stripe, OTA, email)". |
| ALT-10 | **Stub-controller hybrid** (raised by third-Critic-pass steelman): backend implements stub NestJS controllers (return `501 Not Implemented` + decorated DTOs) for the 20 unimplemented systems; emits OpenAPI from those; tbot-design proposes changes via PR against backend. | **Promoted from rejected-by-default to Option B in §18.0 pre-S0a prerequisite.** Backend lead decision in P-1 picks Option A (this plan) OR Option B (stub-hybrid, spawn separate plan) OR Option C (status quo, gap-report only). Plan no longer presumes A. |

---

## 5. OpenAPI Authoring Spec (per-operation invariants)

Every `<action>.openapi.yaml` MUST be a fragment of the form:

```yaml
# docs/api/04-realtime/session-start.openapi.yaml
openapi: 3.1.0
info:
  title: TBOT Mobile API
  version: 0.2.0
paths:
  /v1/realtime/sessions:
    post:
      operationId: startRealtimeSession
      summary: Start a realtime voice session for a child
      description: |
        Creates a realtime session record and returns a short-lived WSS token
        the device will use to connect to wss://realtime.tbot.ai/v1/session.
        Idempotent on Idempotency-Key.
      tags: [04-realtime]
      x-system-id: sys-04
      x-owner-lane: realtime
      x-idempotent: true
      x-sequence-refs: ["docs/sequences/04-realtime/session-start-mobile.sequence.mmd"]
      x-erd-refs: ["docs/erd/04-realtime/realtime_sessions.dbml"]
      x-ui-states: ["lesson_session_starting"]
      x-state-transition: "RealtimeSession: REQUESTED -> READY"   # authored-not-enforced; validator V-15 deferred to Phase 2
      # NOTE: x-side-effects, x-concurrency intentionally absent per v4/v5 scope cut.
      # Side effects narrated in description above.
      # Concurrency rule (single-writer per child) documented in Section 10.
      security:
        - parentJwt: []
      parameters:
        - $ref: "../shared/headers.openapi.yaml#/components/parameters/IdempotencyKey"
        - $ref: "../shared/headers.openapi.yaml#/components/parameters/XRequestId"
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "../schemas/realtime/RealtimeSessionStartRequest.yaml" }
            example: { $ref: "../shared/examples.openapi.yaml#/examples/RealtimeSessionStartRequest" }
      responses:
        "201":
          description: Session created
          headers:
            ETag: { schema: { type: string }, description: Optimistic-lock token }
          content:
            application/json:
              schema: { $ref: "../schemas/realtime/RealtimeSessionStartResponse.yaml" }
        "400": { $ref: "../shared/errors.openapi.yaml#/components/responses/ValidationError" }
        "401": { $ref: "../shared/errors.openapi.yaml#/components/responses/Unauthorized" }
        "403": { $ref: "../shared/errors.openapi.yaml#/components/responses/Forbidden" }
        "409": { $ref: "../shared/errors.openapi.yaml#/components/responses/Conflict" }
        "429": { $ref: "../shared/errors.openapi.yaml#/components/responses/RateLimited" }
        "503": { $ref: "../shared/errors.openapi.yaml#/components/responses/SafetyBlocked" }
```

### Vendor extensions

**Phase-1 fields** (enforced by AC-6, must be present and well-formed):

| Extension | Purpose |
|---|---|
| `x-system-id` | Backend system ownership (`sys-01..sys-22`) |
| `x-owner-lane` | Multi-agent shard key (see Section 13) |
| `x-idempotent` | `true`/`false` — drives client retry policy |
| `x-sequence-refs` | Cross-link to `.sequence.mmd` file(s); ≥1 — drives AC-2 (sequence-coverage validator) |

**Phase-1 fields, authored-not-enforced** (validator is Phase 2, but field is mandatory now — cheap insurance against silent drift):

| Extension | Purpose | Authored from | Validator deferral note |
|---|---|---|---|
| `x-erd-refs` | Cross-link to `.dbml` file(s) | Author cites the DBML file(s) the request/response schemas derive from | Validator V-17 (Phase 2) does file-existence check + field-name parity. Parser exists at `scripts/erd/dbml-to-prisma.mjs`. |
| `x-ui-states` | Array of nav-graph state IDs that call this op | Author cites state IDs from `nav-graph-data.json` that trigger the op | Validator extends `verify-ui-coverage.mjs` (already Phase-1) — promotion is trivial once Phase-1 AC-1 stable. |
| `x-state-transition` (v5: restored per Critic-v4 M-1) | Op→state-machine traceability. Format: `"<Entity>: <FromState> -> <ToState>"`, single step. Empty string for non-mutating ops. | Author reads §6 lifecycle table, picks the entity + transition row. | Validator V-15 (Phase 2) would parse the string + verify against DBML enums + sequence diagrams. **Re-added as authored-not-enforced because field cost is ~30 sec/op while drift cost is silent state-machine violations.** §5 originally dropped both field AND validator; v5 keeps field (cheap), still drops validator (expensive). |

**Optional documentation fields** (author at will; no validator ever):

| Extension | Purpose |
|---|---|
| `x-authz` | Structured authorization rule (Section 9) — improves readability; runtime enforcement is server-side, not validator-side. |
| `x-related-systems` | Cross-system tagging for traceability. |

**Fields DROPPED from authoring (v5 final state):**

| Extension | Why dropped |
|---|---|
| ~~`x-side-effects`~~ | Requires uniform `Note over X: emit Y` grammar across 94 hand-written sequence files. Plan does NOT undertake that normalization. Side-effects narrated in `description:` field instead. |
| ~~`x-concurrency`~~ | Validator V-18 blocked on backend ETag emission which is not on roadmap. Concurrency policy documented in Section 10 as a class-level rule (which endpoints require `If-Match`), not per-op metadata. |

v5 cut history: v4 originally dropped 3 fields (`x-state-transition`, `x-side-effects`, `x-concurrency`); Critic-v4 M-1 flagged that `x-state-transition` dropped too aggressively (~30 sec author cost vs silent state-machine drift cost). v5 restored it as authored-not-enforced in the table above. Net: **3 Phase-1-authored extensions** (`x-erd-refs`, `x-ui-states`, `x-state-transition`), **2 dropped** (`x-side-effects`, `x-concurrency`), **2 optional documentation** (`x-authz`, `x-related-systems`).

---

## 6. State-Machine Alignment

State machines live in **two** locations the spec must align with:

1. **Mobile UI states** — `nav-graph-data.json` (118 states, group + kind). The mobile state is what triggers a call; the call doesn't drive UI state machines.
2. **Backend domain state machines** — derived from ERD (`.dbml` enums on entities) and sequence diagrams. Example: `RealtimeSession.status` enum in `docs/erd/04-realtime/realtime_sessions.dbml`.

### Field authored, validator deferred (v5 update)

`x-state-transition` is **authored as Phase-1 metadata** on every mutating operation (§5 table). Validator V-15 deferred to Phase 2 — DBML enum parser + sequence-diagram state-extraction grammar is 1+ week build, low value while state-machine bugs are not recurring.

**v5 added: lifecycle-table drift detector (M-3 fix).** New Phase-1 validator `scripts/api/verify-lifecycle-table-coverage.mjs` (S0b deliverable) reads `.dbml` files via `parseDbml()` from `scripts/erd/lib/parse-dbml.mjs`, extracts every `*_status` enum, and asserts each value appears in the lifecycle table below. Validator is small (<1d to build).

**Walk rules (AI-2, per V-10b gate check `.omc/p1-meeting/dbml-to-prisma-ast-stability.md`):**
- Walk only `docs/erd/<NN-system>/*.dbml`.
- Skip `docs/erd/templates/` (demo content; e.g. `example_entity_status`).
- Skip `docs/erd/_global/global-erd.dbml` (mirrors per-system files; would double-count).
- Skip `docs/erd/_shared/*.dbml` for `*_status` extraction (shared infrastructure tables; their statuses authored alongside other systems).

**Dedup + divergence (AI-3):** group `*_status` enums by name. If the same name appears in multiple per-system DBML files with **different** `values` sets, fail with error class `ENUM-DIVERGENCE` listing both source files and the value-set diff (this catches accidental copy-paste-drift between system files).

**Concrete failure modes V-10b catches:**
- ERD adds a new state (e.g. `subscriptions.status` gains `PAUSED`) → table is stale → CI fails.
- Two files declare conflicting `device_status` enum values → `ENUM-DIVERGENCE` error.
- Table lists a state (e.g. `incidents.status: OPEN`) that no DBML enum contains → CI fails as `LIFECYCLE-PHANTOM` warning.

### Lifecycle inventory to capture (one row per entity with a status field):

> **AI-1 illustrative-placeholder note** (per V-10b gate check, see `.omc/p1-meeting/dbml-to-prisma-ast-stability.md`): the values below were authored from convention at plan-write time and **all 7 spot-checked entries drift from actual DBML**. The table is refreshed during S0a as an explicit deliverable: walk `docs/erd/<NN-system>/*.dbml` via `parseDbml()`, extract every `*_status` enum + values, write the refreshed table into `docs/api/AGENTS.md`. After S0a, V-10b CI keeps it accurate.

| Entity | States (illustrative — to be refreshed from DBML in S0a) | Owning operations |
|---|---|---|
| `users.status` | PENDING, ACTIVE, SUSPENDED, DELETED *(actual DBML: active, disabled, scheduled_for_deletion, deleted)* | signup, consent, account-delete |
| `households.status` | ACTIVE, ARCHIVED *(actual DBML: active, locked, scheduled_for_deletion, deleted)* | household-create, household-archive (gap) |
| `household_invitations.status` | PENDING, ACCEPTED, EXPIRED, REVOKED | household-invite, household-join, household-invite-revoke (gap) |
| `devices.status` | UNCLAIMED, CLAIMED, BOUND, DEACTIVATED *(actual DBML: factory_new, provisioning, active, offline, decommissioned, quarantined)* | ble-code, register, claim, device-delete |
| `sessions.status` | REQUESTED, READY, ACTIVE, ENDING, ENDED, FAILED *(actual DBML: connecting, open, turn_active, turn_complete, reconnecting, closing, closed)* | session-start, session-token, session-end |
| `subscriptions.status` | TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED *(actual DBML: trialing, active, past_due, canceled, expired)* | subscription-create, subscription-cancel, webhook-driven transitions |
| `ota_assignments.status` | PENDING, IN_PROGRESS, SUCCESS, FAILED, ROLLED_BACK *(actual DBML on `ota_assignments`, not `ota_deployments`: offered, downloading, downloaded, flashing, verifying, success, failed, rollback, skipped)* | ota-progress |
| `deletion_requests.status` | REQUESTED, IN_PROGRESS, COMPLETED, REJECTED *(actual DBML: pending, grace_period, cancelled, executing, completed, failed)* | deletion-request-create, deletion-request-status |
| `incidents.status` | OPEN, INVESTIGATING, RESOLVED, CLOSED | safety-incident-create, safety-incident-update |

This table is **hand-maintained** in `docs/api/AGENTS.md` (v4: no longer auto-derived — `x-state-transition` was dropped). Authors consult this table when designing mutation operations to ensure their op's effect on entity state is consistent with the sequence diagrams. V-10b validator (S0b deliverable) keeps the table honest against DBML.

---

## 7. Sequence Diagram Alignment

Each operation MUST declare `x-sequence-refs`. Validator `scripts/api/verify-sequence-coverage.mjs`:

1. Parse every `.sequence.mmd` under `docs/sequences/`.
2. **Cross-file deduplication**: Files under `docs/sequences/_cross/` MUST carry `derived_from: [<list of per-system files>]` frontmatter. The validator tags every extracted `(method, path)` with `source_file`; for cross files, the validator skips emission if the same `(source_file_of_derived_from, method, path)` triple has already been counted from the per-system file. Per-system files are source-of-truth; `_cross/` is narrative.
3. **Grammar (R-5 hard error, not warning)**: every `<Actor>->>+<Service>:` or `<Actor>->>+<Service>` arrow-message line whose body starts with one of `GET | POST | PUT | PATCH | DELETE ` MUST match `^(GET|POST|PUT|PATCH|DELETE) /v1/[a-zA-Z0-9/{}_:.-]+$`. Non-HTTP messages (WS frames, queue events, internal calls) MUST start with `WS ` or `EVENT ` or `INTERNAL ` prefix to be skipped. **Lines violating grammar fail the validator** with a precise file:line pointer. (Sequences lane will run a one-time grammar pass during S0a to normalize existing lines.)
4. Build set `S = { (method, path) seen in sequences (deduped) }`.
5. Build set `O = { (method, path) declared in docs/api/ + tbot-backend/openapi.json }`.
6. Report:
   - `S − O` = sequence-implied operations missing from spec (FAIL).
   - `O − S` = operations with no sequence diagram (WARN — acceptable for trivial CRUD; must be justified in `_reports/sequence-coverage.md`).

**Async operations** (sequence diagrams use `-->>` for replies, `Note over ... : async`) MUST be reflected in the OpenAPI as either:

- A response with status `202` and a `Location: /v1/.../jobs/{jobId}` header for polling, OR
- A documented webhook in `x-callbacks`.

**Side effects:** documented in the operation's `description:` field as prose (e.g. "Emits `audit_log:realtime.session.start` and `metrics:realtime.session.requested`"). v4 dropped the `x-side-effects` structured field per scope cut — no validator extraction from sequence `Note over` blocks, no normalization of `Note over` syntax.

---

## 8. Error Contract Design

Single `ErrorResponse` schema in `docs/api/shared/errors.openapi.yaml`:

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message, requestId]
          properties:
            code: { type: string, description: "Machine-readable, dot-namespaced", example: "auth.invalid_credentials" }
            message: { type: string, description: "Human-readable, English; localizable via i18n keys" }
            messageKey: { type: string, description: "i18n key matching tbot-design/i18n.js entries", nullable: true }
            requestId: { type: string, format: uuid }
            traceId: { type: string, nullable: true }
            details:
              type: array
              nullable: true
              items: { $ref: "#/components/schemas/FieldError" }
            retryAfterSec: { type: integer, nullable: true, description: "Present on 429 and 503" }
    FieldError:
      type: object
      required: [field, code]
      properties:
        field: { type: string, description: "JSONPointer", example: "/email" }
        code:  { type: string, example: "format.invalid_email" }
        message: { type: string, nullable: true }
```

### Canonical HTTP-status → semantic-code mapping

| HTTP | Semantic prefix | When | Retryable |
|---|---|---|---|
| 400 | `validation.*`, `request.*` | Client schema/payload error | No |
| 401 | `auth.*` | Missing/invalid/expired token | No (re-auth) |
| 403 | `permission.*`, `coppa.*`, `parental.*` | Authenticated but not allowed | No |
| 404 | `not_found.*` | Resource missing | No |
| 409 | `conflict.*`, `state.*`, `idempotency.*` | State conflict, optimistic-lock fail, duplicate idempotency-key with different body | Maybe (after refetch) |
| 410 | `deleted.*` | Resource permanently gone (post-retention) | No |
| 412 | `precondition.*` | `If-Match` ETag mismatch | Yes (after refetch) |
| 422 | `business.*` | Business-rule failure (e.g., child age below threshold) | No |
| 423 | `locked.*` | Resource locked (e.g., parent-gate active) | Yes (after lock release) |
| 429 | `rate_limit.*` | Throttled; honor `retryAfterSec` | Yes (with backoff) |
| 451 | `legal.*`, `region_blocked.*` | Region/legal restriction | No |
| 500 | `internal.*` | Unexpected server error | Yes (with jitter) |
| 502 | `upstream.*` | Upstream dependency failure | Yes |
| 503 | `unavailable.*`, `safety.blocked.*` | Service unavailable / safety-blocked | Yes |
| 504 | `timeout.*` | Upstream timeout | Yes |

All mobile error UIs (`docs/flows/edge-cases/{error,retry,timeout,unauthorized,validation}.flow.mmd`) get their handler logic from this table — no per-endpoint custom error code negotiation.

**Idempotency-Key conflict (POST replayed with different body):** ALWAYS `409 conflict.idempotency_key_mismatch` with `details: [{field: "/", code: "idempotency.body_changed"}]`.

---

## 9. Authorization Model

Four security schemes live in `docs/api/shared/security.openapi.yaml`:

| Scheme | Type | Subject | Lifetime |
|---|---|---|---|
| `parentJwt` | `http bearer` (JWT) | Parent user; claims include `sub`, `householdId`, `roles[]`, `consent.coppa`, `mfa.verified` | 15 min access + refresh |
| `deviceMtls` | `mutualTLS` | Device cert chained to TBOT factory CA; CN = serialNumber | Cert lifetime (rotated via OTA) |
| `adminJwt` | `http bearer` (JWT) | Admin user with SSO + IP allow-list | 60 min |
| `factoryToken` | `apiKey in header X-Factory-Token` | Factory line tooling | Static (rotated quarterly) |

### Per-operation policy matrix (codified in `x-authz`)

Example:

```yaml
x-authz:
  scheme: parentJwt
  roles: [household.member]
  ownership: { resource: child, field: childId, claim: householdId, via: household_members }
  parental_gate: required          # PIN re-prompt within last 5 min
  mfa: optional
  coppa_consent: required           # operation involves child data
```

### Authorization rule classes (all enforced server-side; documented per operation)

1. **Public** — health, plans-list, plans-detail. No `security` declared.
2. **Authenticated (any household member)** — household-get, account-get, summary read.
3. **Owner-only** — parent-controls-update, billing operations. `roles: [household.owner]`.
4. **Resource-ownership** — child-update, realtime-session-start. `ownership.resource: child`.
5. **Parental-gate required** — destructive (delete child, cancel subscription, reset password). `parental_gate: required`.
6. **MFA required** — change auth credentials, change billing plan. `mfa: required`.
7. **COPPA consent required** — any operation reading/writing child PII. `coppa_consent: required`.
8. **Device-only** — heartbeat, runtime/config, telemetry/events:batch. `scheme: deviceMtls`.
9. **Factory-only** — `factory-register`, `factory-bind`. `scheme: factoryToken`.
10. **Admin-only** — `/v1/admin/**`. `scheme: adminJwt`.

Decision ADR: `docs/decisions/0005-parent-gate-security-model.md` already exists with `## Status: Accepted` — confirm it is the authority and link every `parental_gate: required` op to it. **Status caveat (2026-05-12)**: file is on disk but currently git-untracked; S0a deliverable list commits it. Plan Section 9 references assume the file lands in main before lane-parent (S3) authors operations against `parental_gate: required`.

---

## 10. Idempotency & Concurrency

### Idempotency

| Method | Idempotent by spec? | Idempotency-Key required? |
|---|---|---|
| GET / HEAD | Yes | No |
| PUT / DELETE | Yes (target state) | Optional |
| POST that creates a resource | No (must be made idempotent) | **Required** (HTTP 400 `request.idempotency_key_missing` if absent) |
| POST that triggers an external side-effect (Stripe checkout, OTA, email) | No | **Required** |
| POST acting on a resource (`/v1/auth/login`, `/v1/devices/{id}/heartbeat`) | Often inherently idempotent | Recommended |

`Idempotency-Key` header: UUIDv4, mobile-generated, scoped per (user, endpoint), persisted server-side for 24h with `(key, body_hash, response)`. Replay with same key + same body → return cached response. Replay with same key + different body → `409 conflict.idempotency_key_mismatch`.

### Concurrency

- **Optimistic locking** for mutable resources: GET responses include `ETag`; PUT/DELETE/PATCH require `If-Match: <etag>` → returns `412 precondition.etag_mismatch` on conflict.
- **Operations that require ETag-based optimistic locking** (documented in `docs/api/CONVENTIONS.md` as a class-level list, not per-op metadata per v4 cut): household-update, child-update, parent-controls-update, schedule-update, subscription-update. Authors writing these ops MUST include `If-Match` in `parameters` and `412 precondition.etag_mismatch` in responses.
- **Operations with single-writer enforcement** (also class-list in CONVENTIONS.md): realtime-session-start (only one ACTIVE session per child).
- **Outbox semantics:** every mutation that emits an event must mention the outbox topic in the operation's `description:` field (v4 drops the structured `x-side-effects` extension; prose description is the contract). The outbox guarantees at-least-once; consumers MUST be idempotent on `eventId`.

---

## 11. Pagination / Filter / Sort

**Two pagination styles, chosen per endpoint** (v4 update per Critic-v3 challenge on D-2). Each endpoint MUST declare exactly one in its `x-pagination` extension.

| Style | When | Mobile UX fit |
|---|---|---|
| **Cursor** (default for unbounded growth) | Telemetry events, audit feed (`/v1/parent/audit-feed`), gap-report-driven lists, anything where dataset can exceed ~500 items or has concurrent writers | Infinite-scroll, "load more"; jump-to-page disabled |
| **Offset + totalEstimate** (for bounded household-scoped CRUD) | `/v1/households/{id}/children`, `/v1/households/{id}/devices`, `/v1/households/{id}/members`, `/v1/parent/schedule/{childId}/*`, `/v1/billing/invoices` (per household), `/v1/notifications/subscriptions` (per user) | "Showing 1–25 of 47", jump-to-page, react-window range queries |

Rationale: bounded household-scoped collections rarely exceed dozens of items and have no concurrent writers (single parent edits at a time). Cursor's consistency-under-write advantage is wasted; offset's UX wins (pagination chrome, totals, jump-to-page) are real. Cursor stays default for anything where bound is not provable or writers are concurrent.

The Phase-1 validator `verify-operation-completeness.mjs` enforces that every list endpoint declares `x-pagination: cursor` OR `x-pagination: offset` — never both, never neither. Per-endpoint choice documented in `docs/api/CONVENTIONS.md`.

### 11.1 Pagination migration (v5: per Critic-v4 M-2)

Choice is not forever. When a `x-pagination: offset` endpoint crosses **either** of these thresholds, it MUST migrate to cursor:

| Trigger | Signal |
|---|---|
| p95 list size > 500 items | `_reports/pagination-size.md` (generated weekly from production telemetry once ingest is live) |
| Endpoint gains concurrent writers (e.g. multiple-parent household with simultaneous schedule edits) | Backend signals via spec-PR with `pagination-migration` label |

**Migration mechanics**: offset → cursor is a **breaking response-schema change** (`page.offset/total` → `page.nextCursor`). Follow §12.1:
- **Path A (preferred)**: dual-publish — old offset response remains, new cursor endpoint added at `?paginate=cursor` query flag; mobile clients migrate one screen at a time; offset removed after 6-month deprecation window.
- **Path B (only if Path A infeasible)**: new endpoint under `/v2/`, old `/v1/` deprecated.

Endpoint-specific migration plans recorded in `docs/api/_reports/pagination-migrations.md`. The reverse direction (cursor → offset) is non-breaking (add `?paginate=offset` flag, offset is opt-in) and does not need Path A/B.

### Cursor schema

```yaml
# docs/api/shared/pagination.openapi.yaml
components:
  parameters:
    Cursor:
      name: cursor
      in: query
      schema: { type: string, nullable: true }
    Limit:
      name: limit
      in: query
      schema: { type: integer, minimum: 1, maximum: 100, default: 25 }
    Sort:
      name: sort
      in: query
      description: "Comma-separated list of fields, prefix '-' for DESC"
      schema: { type: string, example: "-createdAt,name" }
  schemas:
    Page:
      type: object
      required: [items, page]
      properties:
        items: { type: array, items: { type: object } }   # override per endpoint
        page:
          type: object
          required: [limit]
          properties:
            limit: { type: integer }
            nextCursor: { type: string, nullable: true }
            prevCursor: { type: string, nullable: true }
            totalEstimate: { type: integer, nullable: true, description: "Optional, only for small bounded sets" }
```

### Offset schema (bounded household-scoped CRUD)

```yaml
components:
  parameters:
    Offset:
      name: offset
      in: query
      schema: { type: integer, minimum: 0, default: 0 }
    Limit:    # reused from cursor block; min=1, max=100, default=25
      $ref: "#/components/parameters/Limit"
    Sort:
      $ref: "#/components/parameters/Sort"
  schemas:
    OffsetPage:
      type: object
      required: [items, page]
      properties:
        items: { type: array, items: { type: object } }
        page:
          type: object
          required: [offset, limit, total]
          properties:
            offset: { type: integer }
            limit: { type: integer }
            total: { type: integer, description: "Exact total for bounded sets" }
```

### Filtering

- Whitelist per endpoint via query params (no generic `?filter=...` DSL — too easy to misuse and abuse).
- Date ranges: `from`, `to` (ISO 8601, inclusive).
- Enums: repeated query params (`?status=ACTIVE&status=TRIAL`).
- Free text: `q` (server-side prefix or trigram match; documented per endpoint).

### Sort

- Whitelisted fields per endpoint, declared in `description` of `sort` parameter.
- Default sort is documented per endpoint (no implicit defaults).

---

## 12. Versioning

| Rule | Value |
|---|---|
| URL versioning | `/v1/...` (matches current `tbot-backend/openapi.json`) |
| Breaking change → | `/v2/...` introduced alongside `/v1/`; `/v1/` deprecated with `Deprecation: true` + `Sunset: <RFC 7231 date>` headers |
| Non-breaking change | Add fields (nullable), add new operations, add new query params (with safe defaults) |
| Breaking change definition | Remove/rename fields, change types, change required-ness from optional→required, change response shape, change enum values, tighten validation, change semantics |
| Deprecation window | ≥6 months between deprecation and removal for any mobile-facing op |
| `x-deprecated-replaced-by` | Vendor extension naming successor operationId |

Mobile client behavior:

- `Bootstrap` op (`GET /v1/mobile/bootstrap`) returns `minClientVersion`, `recommendedClientVersion`, `apiVersion`. Mobile app refuses to start if `app.version < minClientVersion`.
- Deprecation warnings surfaced via `Sunset` response header → app emits telemetry but does not nag user until <30 days from sunset.

### 12.1 In-version rename policy (D-5, D-6 mechanics)

This plan permits **rename within `/v1/`** as long as backend has zero external consumers, OR the backend agrees to **dual-publish** (both old and new paths/operationIds resolve to the same handler) during a deprecation window. Two paths:

**Path A — Rename within `/v1/` (default, used when no breaking impact)**
1. New path/operationId becomes the canonical entry in `docs/api/**`.
2. Old path/operationId added to a `docs/api/_deprecations.yaml` index listing `{ deprecated: <old>, replaced_by: <new>, deprecated_in: 0.2.0, removal_target: 0.3.0 }`.
3. Backend dual-publishes for ≥6 months (matches versioning row "Deprecation window"); both endpoints return the same response; old endpoint adds `Deprecation: true` + `Sunset` headers.
4. After Sunset date passes AND `_reports/deprecation-traffic.md` shows zero hits to the old path for 30 consecutive days, old path is removed.
5. Decision recorded in the relevant ADR (D-5 or D-6 ADR).

**Path B — Introduce `/v2/` (only when consumers exist and dual-publish is infeasible)**
1. New file tree `docs/api/_v2/<NN-system>/...` mirrors `docs/api/<NN-system>/...` for changed paths only; unchanged paths are NOT duplicated and continue to live in `/v1/`.
2. Mobile bootstrap exposes `apiVersion: "v1"` or `"v2"` (chosen by client capability declaration sent in `X-Client-Version` header; server resolves per op).
3. `/v1/` and `/v2/` deployable independently; backend can stub `/v2/` ops as `501 Not Implemented` initially.
4. Deprecation of `/v1/` only when ≥95% mobile traffic moves to `/v2/`, tracked in `_reports/version-migration.md`.

**Default for D-5/D-6 ADR resolution**: Path A unless the ADR explicitly concludes "external consumers exist + dual-publish refused" — in which case Path B. Plan presumes Path A; Section 15.1 renames proceed in `/v1/` and S1 entry gate is unblocked once D-5/D-6 ADRs confirm Path A.

---

## 13. Multi-Agent Execution Model

### Owner lanes (mirrors `docs/sequences/AGENTS.md` lane convention)

| Lane | Systems | Files owned | Conflict surface |
|---|---|---|---|
| `lane-identity` | 01 | `docs/api/01-identity/**`, schemas `identity/`, `parent/` (partial) | Touches: shared `security.openapi.yaml` for `parentJwt` |
| `lane-device` | 02, 03, 16 (BLE), 17 (health) | `docs/api/{02-device,03-device-runtime,16-mobile,17-gateway}/**`, schemas `device/` | Touches: `security.openapi.yaml` for `deviceMtls` |
| `lane-realtime` | 04 | `docs/api/04-realtime/**`, schemas `realtime/` | Cross-links to `live-alpha.yaml` (WS) — read-only |
| `lane-safety` | 05 | `docs/api/05-safety/**`, schemas `safety/` | Touches errors `safety.blocked.*` codes |
| `lane-content` | 06 | `docs/api/06-content/**`, schemas `content/` | Heavy schema reuse; serialized first |
| `lane-parent` | 07, 14 (retention) | `docs/api/{07-parent,14-retention}/**`, schemas `parent/`, `retention/` | Cross-links to identity for `household` |
| `lane-config-ota` | 08, 09 | `docs/api/{08-config,09-ota}/**`, schemas `config/`, `ota/` | Device-facing; minimal overlap |
| `lane-notifications` | 10 | `docs/api/10-notifications/**`, schemas `notifications/` | Isolated |
| `lane-telemetry` | 11 | `docs/api/11-telemetry/**`, schemas `telemetry/` | Isolated |
| `lane-billing` | 19, 22 (demo) | `docs/api/{19-billing,22-demo}/**`, schemas `billing/` | Isolated |
| `lane-shared` | — | `docs/api/{shared,schemas/primitives,index}/**`, AGENTS.md, CONVENTIONS.md, validator scripts | **AUTHORED FIRST; all lanes block on it** |

### Implementation order (staged)

| Stage | Lane(s) | Deliverable | Blocks |
|---|---|---|---|
| S0 | lane-shared | `docs/api/shared/**`, `schemas/primitives/**`, `AGENTS.md`, `CONVENTIONS.md`, `index.openapi.yaml`, all validator scripts, CI workflow | Everything |
| S1 | lane-identity | Migrate existing 18 ops from `tbot-backend/openapi.json` into `docs/api/01-identity/**` 1-op-per-file; populate `auth/parent` mobile domain `calls.generated.json` | Lane-parent (uses Household refs) |
| S2 | lane-device, lane-content (parallel) | New 02/03/16/17 ops + 06 ops; populate `device, robot-mgmt, course, course-library, home, progress` `calls.generated.json` | Lane-realtime (consumes realtime session refs from device) |
| S3 | lane-realtime, lane-safety, lane-parent (parallel) | 04, 05, 07, 14 ops; populate `lesson-session, parent` `calls.generated.json` | Lane-billing (purchase flow can depend on parent controls for child consent) |
| S4 | lane-billing, lane-notifications, lane-telemetry, lane-config-ota (parallel) | 08, 09, 10, 11, 19, 22 ops; populate `purchase, fallback` `calls.generated.json` | None |
| S5 | lane-shared (closeout) | Run all validators, write `_reports/*.md`, freeze `_actors.md` (no changes expected), generate `index.openapi.yaml` aggregator, deduplicate $refs | n/a |

### Conflict prevention

> **v5 applicability note (per Critic-v4 Minor-1):** All conflict-prevention rules below — CODEOWNERS sharding, branch naming, merge-frozen `shared/`, PR-per-stage policy — apply **only when ≥2 authors execute concurrently** (S2-S4 in 2-author or 4-author staffing bands per §18.2). For 1-author execution, these are dead ceremony with overhead; skip them. The author still commits 1-op-per-PR for change-history clarity, but parallel-author rituals are off.

1. **One PR per stage** (not per file). PR title format: `api(SN-lane): <stage>`.
2. **No two PRs simultaneously touch `shared/` or `schemas/primitives/`** (lane-shared sequential).
3. **All cross-domain `$ref`s use absolute paths from `docs/api/`** to make rename costs visible in diff.
4. **`scripts/api/verify-no-orphan-schemas.mjs`** catches schemas defined but unreferenced (cleanup) and references to missing schemas (broken merges).
5. **Pre-commit hook** runs `npx @redocly/cli lint` on staged `.openapi.yaml` files (fast).
6. **Branch naming:** `api/<lane-name>/<short-desc>` — enables `CODEOWNERS` shard-by-prefix.

### CODEOWNERS (proposed addition)

```
# .github/CODEOWNERS
/docs/api/01-identity/    @tbot-team/lane-identity
/docs/api/02-device/      @tbot-team/lane-device
/docs/api/03-device-runtime/  @tbot-team/lane-device
/docs/api/04-realtime/    @tbot-team/lane-realtime
/docs/api/05-safety/      @tbot-team/lane-safety
/docs/api/06-content/     @tbot-team/lane-content
/docs/api/07-parent/      @tbot-team/lane-parent
/docs/api/08-config/      @tbot-team/lane-config-ota
/docs/api/09-ota/         @tbot-team/lane-config-ota
/docs/api/10-notifications/  @tbot-team/lane-notifications
/docs/api/11-telemetry/   @tbot-team/lane-telemetry
/docs/api/14-retention/   @tbot-team/lane-parent
/docs/api/16-mobile/      @tbot-team/lane-device
/docs/api/17-gateway/     @tbot-team/lane-device
/docs/api/19-billing/     @tbot-team/lane-billing
/docs/api/22-demo/        @tbot-team/lane-billing
/docs/api/shared/         @tbot-team/lane-shared
/docs/api/schemas/primitives/  @tbot-team/lane-shared
```

---

## 14. Implementation Readiness Review

| Domain (lane) | Status | Rationale |
|---|---|---|
| lane-shared | **READY FOR IMPLEMENTATION** | All inputs available (error taxonomy, security model from ADR-0005, pagination scheme is industry standard, ERD primitives present). |
| lane-identity | **READY FOR IMPLEMENTATION** | Migration only; 18 ops already exist in `tbot-backend/openapi.json` + **10** sequence diagrams in `docs/sequences/01-identity/`. |
| lane-device | **READY FOR IMPLEMENTATION** | 6 ops baseline + 5 sequence diagrams `02-device/` + 5 in `03-device-runtime/` + 4 in `16-mobile/`. BLE pairing sequences fully defined. |
| lane-realtime | **READY FOR IMPLEMENTATION** | **8** sequence diagrams `04-realtime/` (barge-in, coppa-retention, observer-attach, provider-failover, session-close, session-start-mobile, turn-pipeline, ws-handshake) + `live-alpha.yaml` for WS slice + ERD for `realtime_sessions` table. |
| lane-content | **READY FOR IMPLEMENTATION** | **6** sequence diagrams + 4 DBML files in `06-content/`. |
| lane-parent | **READY FOR IMPLEMENTATION** | **6** sequence diagrams `07-parent/` + ADR-0005 parent-gate. Retention 3 sequence diagrams `14-retention/`. |
| lane-notifications | **READY FOR IMPLEMENTATION** | 2 sequence diagrams + System 10 spec. |
| lane-telemetry | **NEEDS CLARIFICATION** (mobile slice only) | 3 sequence diagrams; mobile-app analytics slice (`POST /v1/telemetry/app:batch`) implied but not modeled in sequences. **Block**: PM decision on whether mobile app analytics use this endpoint or a third-party SDK (Segment, Amplitude). See Section 20. |
| lane-config-ota | **READY FOR IMPLEMENTATION** | 3 sequence diagrams config + 3 OTA + ERD. |
| lane-billing | **NEEDS CLARIFICATION** (gates S4 entry) | **8** sequence diagrams in `19-billing/` define Stripe-style flows, but mobile app store policy likely mandates IAP-only for digital goods sold inside the app. **Block**: confirm App Store / Play Store compliance with PM before S4. **Resolution paths**: (a) Stripe-only with web-checkout deep-link from app; (b) IAP-only with `POST /v1/billing/receipts/{apple,google}` receipt-validation endpoints; (c) hybrid (Stripe for parent web, IAP for in-app upgrades). Each path changes the spec materially. See R-9 (now relocated to Section 20 as a gate). |
| lane-safety | **NEEDS CLARIFICATION** (gates S3 entry) | System 05 spec defines internal safety-check; **5** sequence diagrams cover input-filter, output-filter, fallback-selection, generation-pipeline, policy-publish — **all internal/backend-only**. No parent-UI incident-report sequence. **Block**: write 1 new sequence diagram `docs/sequences/05-safety/parent-incident-report.sequence.mmd` before authoring `lane-safety` contracts. Estimated 0.5 day; counted in S3 sequence lane. |
| lane-demo (22) | **MISSING REQUIREMENTS** | Demo/kiosk mode mobile build is mentioned in `22-demo-retail-mode.md` but no UI states in `nav-graph-data.json` carry a demo group. Decision: defer until demo build is in scope. |

---

## 15. Clean-Architecture Recommendations

Based on inspection of the existing `tbot-backend/openapi.json`:

### 15.1 Endpoint simplifications

| Current | Issue | Recommended |
|---|---|---|
| `POST /v1/devices/ble-code/{serialNumber}` | Mixes URL-level identifier (serial) with action (issue code). Awkward to discover. | `POST /v1/devices/{serialNumber}/ble-codes` (collection-style) or `POST /v1/devices/ble-codes { serialNumber }` |
| `GET /v1/devices/household/{householdId}` | Nests devices under household via path segment "household" — redundant. | `GET /v1/households/{householdId}/devices` (consistent with `/households/{id}/children`) |
| `GET /v1/households/{id}/data-export` + `GET /v1/households/{id}/data-export/{jobId}` | Singular noun used for both list and item. | `POST /v1/households/{id}/data-exports`, `GET /v1/households/{id}/data-exports/{jobId}` |
| `POST /v1/auth/forgot-password` + `POST /v1/auth/reset-password` | Verb-style endpoints. | Keep — auth flows are convention-driven and OAuth2-style verbs are widely understood. **No change.** |

### 15.2 Domain boundary fixes

- `POST /v1/auth/consent` currently in `auth` tag but consent is a child-data concern (System 01 + COPPA, System 07 parent controls). **Recommendation:** keep under `auth` for legal-flow simplicity but cross-link `x-system-id: sys-01` AND add `x-related-systems: [sys-07]` for traceability.
- `POST /v1/devices/factory-register` is mobile-invisible. **Recommendation:** move to a separate file with `x-owner-lane: lane-manufacturing` and exclude from mobile bootstrap discovery.

### 15.3 Schema normalization

- Backend currently inlines a lot of schemas. **Recommendation:** every nominal type (User, Household, Child, Device, etc.) goes in `schemas/<domain>/<Type>.yaml`. Operations $ref-only.
- Primitive types (`Email`, `PhoneE164`, `Uuid`, `IsoTimestamp`, `Locale`, `CurrencyCode`, `Amount`) live in `schemas/primitives/` so all downstream schemas reuse them.

### 15.4 Naming improvements

- `operationId` convention: `<verb><Object>` camelCase, no prepositions. Examples: `createHousehold`, `listHouseholds`, `getHouseholdById`, `deleteHousehold`, `inviteHouseholdMember`, `acceptHouseholdInvitation`, `startRealtimeSession`, `endRealtimeSession`, `getRealtimeSessionToken`.
- Tags use system-id form: `01-identity`, `02-device`, ... — sorts naturally and matches sequences/ERD dir names.

### 15.5 Anti-patterns to remove

| Anti-pattern | Why bad | Fix |
|---|---|---|
| Endpoints that return different shapes based on `?include=...` flags | Untestable contract | Use distinct endpoints (`/v1/lessons/{id}` vs `/v1/lessons/{id}/with-personalization`) or always return the union schema. |
| Endpoints that double as both create and update via verb selection | Hidden semantics | Separate POST (create) from PUT (full replace) from PATCH (partial). |
| `GET` requests that mutate state (e.g., "view marks notification read") | Violates HTTP semantics; caches/proxies break it | Always a separate `POST /v1/notifications/{id}/read`. |
| Generic `error: "Bad request"` strings | Useless for client UX | Always `error.code` from the canonical taxonomy (Section 8). |
| Embedding business-rule narratives inside `description` | Drifts from real logic | Put rules in linked `.sequence.mmd` + ERD constraints; OpenAPI `description` only summarizes. |

---

## 16. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Hand-authored spec drifts from auto-generated `tbot-backend/openapi.json` | High | High | CI job runs `openapi-diff` between hand-authored aggregator (`docs/api/_built/openapi.json` via `npm run api:bundle`) and backend export. Hand-authored is **contract authority**; backend export is **implementation-state oracle**. Drift logged in `_reports/backend-drift.md` per-operation. Resolution policy: spec wins by default → backend ticket filed. Backend can appeal via spec-PR with rationale (R-4 path). Non-blocking until 100% of mobile-facing ops are spec'd; promotes to PR-blocking afterward. |
| R-2 | `calls.generated.json` files diverge from spec if regenerator script breaks | Medium | Medium | Regenerator script `scripts/flows/build-call-graph.mjs` reads OpenAPI files + `nav-graph-data.json` + new `domain.meta.json.backend_calls` field; AC-1 enforces parity; script is deterministic and committed |
| R-3 | Schema-vs-ERD validator (AC-3) is hard to write correctly | Medium | High | Three-phase rollout: **(a)** name+presence parity (warn-only) from S0b; **(b)** type+nullability parity (warn) once parser stable; **(c)** **promote to error when schema-coverage ≥80%**, measured as `(fields_validated / fields_in_schemas)` and logged daily to `_reports/schema-coverage.md`. Promotion gate recorded in CHANGELOG with reviewer signoff. Validator reuses `scripts/erd/dbml-to-prisma.mjs` AST output where possible. |
| R-4 | Backend team rejects hand-authored spec as authority | Low (politically) | Critical | **Concrete artifact**: `docs/api/_reports/backend-lead-signoff.md` checked in by end of S0b containing: (a) backend lead name + date, (b) statement of acknowledged contract-first model, (c) list of any objections raised + resolution. Without this file, S1 cannot start. **Appeal path**: backend team raises spec-PR labelled `contract-appeal` with rationale; resolved within 5 working days by joint mobile+backend review; minutes attached to `_reports/contract-appeals/<YYYY-MM-DD>-<short>.md`. **Rollback** (if backend permanently refuses): plan downgraded to "documentation overlay" mode — `docs/api/` becomes mobile's expected-contract documentation, backend export remains authority, gap report becomes mobile's prioritization input rather than backend's mandate. See Section 23 rollback plan. |
| R-5 | Sequence diagrams have inconsistent `METHOD PATH` notation | High | Medium | **Promoted to hard error** in `scripts/api/verify-sequence-coverage.mjs` (Section 7 step 3). S0a includes a one-time normalization pass over existing 90 sequence files to bring all arrow-message lines into the grammar `^(GET\|POST\|PUT\|PATCH\|DELETE\|WS\|EVENT\|INTERNAL) /v1/...$`. **Migration safety (NEW-MINOR-3)**: before the pass, snapshot `npm run sequences:fast` full output to `_reports/sequence-normalization-baseline.txt`; after the pass, re-run and diff to `_reports/sequence-normalization-diff.md`. Acceptance: zero changes to non-arrow lines (Mermaid participants, notes, alt/opt/par blocks, return arrows); only arrow-message bodies may change. Any non-arrow diff blocks merge until reviewer signs off. Sequence lane co-owns the cleanup. Estimated 1-1.5 days, performed during S0a (lane-shared). |
| R-6 | Mobile UI states added without populating `backend_calls` | High | Low | Pre-commit hook + AC-8 reject `domain.meta.json` saves that don't include `backend_calls` field (even if `[]` for navigation-only screens) |
| R-7 | Idempotency keys collide across users | Low | High | Server-side key namespacing: stored as `(user_id, key)`, not raw `key`; documented in CONVENTIONS.md |
| R-8 | Optimistic-locking adoption is inconsistent (some PUTs require `If-Match`, others don't) | Medium | Medium | `docs/api/CONVENTIONS.md` ships the class-list of operations requiring ETag-based locking (Section 10). Authors consult the list. Runtime ETag emission is a backend prerequisite tracked in `_reports/backend-drift.md`. No per-op `x-concurrency` field (v4 cut). |
| R-9 | (RELOCATED) IAP-vs-Stripe billing model uncertainty — see Section 20 (Open Questions, gate-block on S4 entry). Risk-table slot intentionally left as redirect to avoid double-tracking. | — | — | Resolved at S4 entry, not by ongoing mitigation. |
| R-10 | Frozen actor allow-list (`_actors.md`) blocks adding new actors implied by API authoring | Low | Low | Spec authoring should rarely introduce new actors; if needed, follow the `_actors.md` amendment flow (separate PR, justification). Spec PRs that introduce new actors must include `_actors.md` change in same diff. |
| R-11 | Mock-server bridge missing — mobile screens exist but cannot exercise endpoints during authoring | Medium | Medium | S0a deliverable: stand up Prism mock server (`@stoplight/prism-cli`) consuming `docs/api/_built/openapi.json` at `http://localhost:4010`. Mobile dev config points to mock URL in `dev-mock` environment. Examples in operations (AC-6) drive mock responses. Tracked in `docs/api/_reports/mock-server-readiness.md`. |

---

## 17. Verification Steps (Implementation Acceptance)

Stage gates run in sequence; each must pass before the next stage begins.

**Phase 1 (this plan, enforced by CI):**

| Step | Command | Pass criteria | Phase |
|---|---|---|---|
| V-1 | `npx @redocly/cli lint docs/api/_built/openapi.json` | Exit 0, zero errors | 1 |
| V-2 | `npm run api:bundle` (Redocly bundle into `_built/openapi.json`) | Exit 0 | 1 |
| V-3 | `npm run api:validate` (wraps V-4..V-10) | Exit 0 | 1 |
| V-4 | `node scripts/api/verify-one-op-per-file.mjs` | Exit 0 | 1 |
| V-5 | `node scripts/api/verify-operation-completeness.mjs` (Phase-1 fields only — see Section 5) | Exit 0 | 1 |
| V-6 | `node scripts/api/verify-sequence-coverage.mjs` (with grammar enforcement per Section 7, `_cross/` dedup) | Exit 0, missing-ops list empty | 1 |
| V-7 | `node scripts/api/verify-ui-coverage.mjs` (also asserts per-system non-emptiness per AC-12) | Exit 0 | 1 |
| V-8 | `node scripts/api/verify-domain-meta-backend-calls.mjs` | Exit 0 | 1 |
| V-9 | `node scripts/api/generate-gap-report.mjs` (set-difference per AC-7) | `_reports/mobile-gap.md` regenerated deterministically | 1 |
| V-10 | `node scripts/api/verify-schema-vs-erd.mjs` (DBML-source per D-7; warn-only-forever per v4 cut) | Exit 0 always; warnings to `_reports/schema-coverage.md` | 1 |
| V-10b | `node scripts/api/verify-lifecycle-table-coverage.mjs` (v5 new per M-3 — reads DBML `*.status` enums via `parseDbml()`, asserts each value appears in §6 lifecycle table). **AI-2**: walks only `docs/erd/<NN-system>/*.dbml`; skips `docs/erd/{templates,_global,_shared}/` (templates are demo content; `_global/global-erd.dbml` mirrors per-system files and would double-count). **AI-3**: if same-name enum has different `values` sets across files, fail with error class `ENUM-DIVERGENCE` listing both source files and value-set diff. | Exit 0 (fails if ERD enum value missing from table OR if same-name enum has divergent values across files) | 1 |
| V-11 | `npm run sequences:fast` | Exit 0 (no actor allow-list violations) | 1 |
| V-12 | `openapi-diff tbot-backend/openapi.json docs/api/_built/openapi.json` | Differences itemized in `_reports/backend-drift.md` (non-blocking until 100% mobile-facing ops spec'd, then PR-blocking per R-1) | 1 |
| V-13 | (Mobile sanity) `npm test` in tbot-design + `npm run flows:validate` | Exit 0 | 1 |
| V-14 | `prism mock docs/api/_built/openapi.json --port 4010` (smoke-start; no need for traffic in CI) | Process exits 0 within 10 s on `--validate-only` flag | 1 |

**Phase 2 (deferred; only 2 validators carry over, per v4 scope cut):**

> **Scope note:** Phase 2 is a **separate follow-on plan**, not in scope here. v4 cut V-15, V-16, V-18 entirely (the fields they would have validated were dropped from authoring). Only V-17 and V-19 carry forward as authored-not-enforced fields ship a validator within ~12 months. Placeholder `.omc/plans/api-contract-phase-2.md` created in S5 closeout.

| Step | Command | Pass criteria | Reason for deferral |
|---|---|---|---|
| V-17 | `node scripts/api/verify-erd-refs.mjs` | Exit 0 | Cross-link verification of `x-erd-refs` to existing `.dbml` files (parser reuses `scripts/erd/dbml-to-prisma.mjs`) |
| V-19 | `node scripts/api/verify-ui-states-promotion.mjs` (extends Phase-1 V-7) | Exit 0 | Promotes `x-ui-states` from authored-not-enforced to validated-content (every state ID in field exists in `nav-graph-data.json`) |

V-15/V-16/V-18 deleted; their fields are no longer authored.

CI workflow `.github/workflows/api-validate.yml`:

```yaml
name: api-validate
on:
  pull_request:
    paths:
      - "docs/api/**"
      - "docs/sequences/**"
      - "docs/erd/**"
      - "nav-graph-data.json"
      - "src/features/**/domain.meta.json"
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run api:bundle      # V-2 (produces _built/openapi.json)
      - run: npm run api:lint        # V-1
      - run: npm run api:validate    # V-3..V-10 wrapped
      - run: npm run sequences:fast  # V-11
      - run: npx openapi-diff tbot-backend/openapi.json docs/api/_built/openapi.json --fail-on incompatible || true   # V-12 (non-blocking until promotion)
```

---

## 18. Stage Plan (operational, time-boxed)

### 18.0 Pre-S0a prerequisite (HARD GATE — do not start S0a until this passes)

**Per third-Critic-pass biggest hidden assumption**: everything from S1 onward gates on `_reports/backend-lead-signoff.md`. If backend lead won't sign, ~22d of S0a-S5 work lands in documentation-overlay mode (Section 23) with authority never accepted. Plan now treats this as a pre-stage, not a parallel S0a deliverable.

**Step P-1 — Backend authority negotiation (1 calendar week max):**

**Pre-meeting deliverables (v5, per Critic-v4 Minor-3): all three Option drafts must exist as committed skeleton plans BEFORE the meeting**, so backend lead picking B or C does not mean 1-2 weeks more drafting before any work begins:
- Option A draft = **this plan** (already exists, v5).
- Option B skeleton = `.omc/plans/api-contract-stub-controller-hybrid.md` (1-page outline: scope, key decisions, stage table, owner, ~10d estimate). Authored as part of P-1 prep, not after.
- Option C skeleton = `.omc/plans/mobile-driven-endpoint-requirements.md` (1-page outline: produce §0 + §1 + §4 + §7 gap-report contents only, ~5d).

If skeletons B and C do not exist by meeting day, P-1 fails and the meeting is rescheduled with skeleton drafts as the gate. This forces real "neutral choice architecture" rather than de-facto-A-because-it's-the-only-thing-written.

1. **1-hour scoping meeting** with backend lead. Agenda:
   - Walk through this plan's §1, §4.2 ALT-1, §22 D-1, §23 Rollback Plan.
   - Walk through Option B + Option C skeleton drafts.
   - Present three options:
     - **Option A — Hand-author contract authority (this plan as written).** tbot-design owns spec, backend conforms via R-1 drift handling.
     - **Option B — Stub-controller hybrid (Section 4.2 ALT-10).** Backend implements stub NestJS controllers (return `501 Not Implemented` + decorated DTOs) for the 20 unimplemented systems; emits OpenAPI from those; tbot-design proposes changes via PR against backend. Single source of truth stays code-grounded.
     - **Option C — Status quo (backend remains source-of-truth).** No contract authority shift. tbot-design produces only the **gap report + mobile-driven endpoint requirements list** as input to backend's roadmap. Plan reduces to ~5d gap-analysis-only effort.
   - Decide. Document outcome at `_reports/backend-authority-decision.md`.

2. **Outcome routing:**
   - **Option A chosen → proceed to S0a as written.** Backend lead signs `_reports/backend-lead-signoff.md` at end of meeting or within 1 working day; otherwise treat as Option C.
   - **Option B chosen → spawn parallel plan `_omc/plans/api-contract-stub-controller-hybrid.md`** that adapts S1-S5 to author-stubs-in-backend-repo workflow. This plan is shelved (`status: superseded`).
   - **Option C chosen → spawn lightweight plan `_omc/plans/mobile-driven-endpoint-requirements.md`** producing just §0 + §1 + §4 + §7 gap-report contents (~5d). This plan is shelved.

**Step P-2 — UI flow stability check (concurrent with P-1):**

Read `nav-graph-data.json` and confirm with mobile-UX lead that the 118 UI states + 12 mobile domains are **frozen for the duration of S0a-S5** (no nav-graph changes during ~22-28 working days). If churn is expected, plan adds a maintenance step at each stage end to re-run `verify-ui-coverage.mjs` and patch `calls.generated.json` deltas. Document outcome at `_reports/ui-stability-pledge.md`.

**P-1 + P-2 gate: BOTH must produce committed artifact files before any S0a work begins.**

If P-1 takes >5 working days or P-2 finds high UI churn (>10% state-set change expected), plan re-baselines or pivots. The plan does NOT proceed-and-hope.

### 18.1 Stage table

| Stage | Duration (single author) | Duration (multi author) | Owner(s) | Output | Entry gate |
|---|---|---|---|---|---|
| **P** (pre-S0a prerequisite) | 1-5 working days (mostly calendar wait) | same | planner + backend lead + mobile-UX lead | `_reports/backend-authority-decision.md`, `_reports/backend-lead-signoff.md` (if Option A), `_reports/ui-stability-pledge.md` | — |
| **S0a** (lane-shared artifacts) | 3 d | 3 d (1 author — not parallel-decomposable) | `docs/api/{shared,schemas/primitives}/**`, `docs/api/index.openapi.yaml` skeleton, `docs/api/AGENTS.md` (includes §6 lifecycle table), `docs/api/CONVENTIONS.md`, `docs/sequences/AGENTS.md` (closes CLAUDE.md drift), Redocly lint config, `_built/` artifact policy + `api:bundle:watch` script (R-11), Prism mock-server setup (R-11), sequence-grammar normalization pass over 94 files with pre/post `sequences:fast` snapshot diff (R-5), commit existing uncommitted ADRs (0005/0006/0007) if still untracked at S0a start, **(v5 final, per Critic-v5) verify `scripts/erd/dbml-to-prisma.mjs` AST output is stable + parseable (gate for V-10b lifecycle-coverage validator scope in S0b)** — if unstable, S0b drops V-10b and §6 table drift detection downgrades to manual review | P-1+P-2 complete |
| **S0b** (validators, Phase-1 only) | 3-4 d | 3-4 d (1 author) | 7 `scripts/api/verify-*.mjs` validators (granularity, operation-completeness, sequence-coverage, ui-coverage, domain-meta-backend-calls, **schema-vs-ERD warn-only/never-promote**, **lifecycle-table-coverage** — v5 new per M-3), `scripts/api/generate-gap-report.mjs`, `scripts/api/bundle.mjs`, `npm run api:validate` wrapper, `.github/workflows/api-validate.yml` | S0a complete |
| **S0c** (single consolidated ADR) | 1 d | 1 d (1 author + reviewers, async) | **1 combined ADR committed**: `docs/decisions/0008-api-contract-authoring-conventions.md` covering D-1 (contract authority), D-3 (ETag/optimistic locking), D-5 (operationId naming), D-6 (`/v1/` path renames Path-A-default), D-7 (DBML as ERD source of truth). Single ADR with five `## Decision N` subsections cuts ~2d of context-switching from prior 5-ADR plan. Format follows existing repo convention. | S0b complete; `_reports/backend-lead-signoff.md` from P-1 already committed |
| **S1** (lane-identity migration) | 2-3 d | 2-3 d (1 author) | 18 ops migrated 1-op-per-file (or per-tag-aggregate if executor count ≤2; see §22 D-9); `auth/parent` mobile-domain `calls.generated.json` populated; gap-report row for `lane-identity` empty (pure migration) | S0c complete |
| **S2** (lane-device + lane-content) | 6-8 d sequential | 3-4 d (2 authors) | ~20 ops new; `device, robot-mgmt, course, course-library, home, progress` `calls.generated.json` populated | S1 complete |
| **S3** (lane-realtime + lane-safety + lane-parent) | 9-12 d sequential | 3-4 d (3 authors + sequence-lane) | ~15 ops new; **safety lane writes** `docs/sequences/05-safety/parent-incident-report.sequence.mmd` first (~0.5 d). `lesson-session, parent` `calls.generated.json` populated | S2 complete; safety sequence file written; Q-5 pagination ADR accepted |
| **S4** (lane-billing + lane-notifications + lane-telemetry + lane-config-ota) | 12-20 d sequential | 3-5 d (4 authors) | ~16 ops new; `purchase, fallback` `calls.generated.json` populated | **GATE**: Q-1 (IAP/Stripe) + Q-2 (telemetry routing) ADRs committed |
| **S5** (closeout) | 2-3 d | 2-3 d (lane-shared) | All Phase-1 validators green, `_reports/*.md` final, `index.openapi.yaml` aggregator complete, backend-drift report baselined, Phase-2 placeholder `.omc/plans/api-contract-phase-2.md` committed for `x-erd-refs` + `x-ui-states` follow-on (only 2 fields, not 6 — see §5 scope cut) | S4 complete |
### 18.2 Total schedule by staffing model

| Staffing | Total | Critical-path lanes |
|---|---|---|
| **1 author (sequential)** | **38-55 working days** (~2-3 calendar months) | All lanes serialized. Single-author is the floor scenario per third-Critic-pass. |
| **2 authors** (S2/S3/S4 paired) | **24-34 working days** | One author leads, second floats across S2-S4 |
| **4 authors (peak parallelism, S2/S3/S4)** | **20-26 working days** | Headline best-case. Requires 4 qualified authors available concurrently during S2-S4 (~12-15 days span). |

**Realistic floor for stakeholder communication: assume 2 authors.** Plan owner field at top of plan ("tbot-design (planner)") is currently singular; staffing commitment is the variable that moves this schedule by 2x.

If only 1 author available, recommend pivot to Option C (gap-report only, ~5d) or sequence S1+S0c-only first → ship lane-identity migration alone → reassess.

**Notes:**
- S0a → S0b → S0c sequenced (not parallel). S0b validators consume S0a artifacts; S0c ADR consolidates 5 decisions in one doc to cut context-switching cost.
- S0a-c cannot be compressed by adding authors — single-owner ensures internal consistency of conventions doc + validator semantics + ADR cross-references. **For 1-2 author teams, this is unchanged. For 4-author teams, S0 is still single-owner; parallelism only buys time during S2-S4.**
- S2/S3/S4 parallelism assumes lane-shared remains stable (no breaking changes to `shared/errors.openapi.yaml`, `schemas/primitives/`, or validator semantics during those stages). Stability is enforced by tagging `shared/` as merge-frozen between S0b and S5 except for additive changes signed off by lane-shared owner.
- If lane-billing or lane-safety gate fails to resolve in time, those lanes slip to a follow-on stage; remaining lanes proceed in parallel without them.
- **Headline 22-28d → revised to 20-26d (4-author) / 24-34d (2-author) / 38-55d (1-author) after v4 scope cuts.** Scope cuts: 5 ADRs → 1 combined ADR (-2d), schema-vs-ERD validator dropped to warn-only-forever (-1d), 4 Phase-2 vendor extensions dropped from authoring (cognitive cost reduction, no schedule impact).

---

## 19. Out of Scope (explicit non-goals)

1. **Backend NestJS implementation** — owned by tbot-backend; this plan produces specs only.
2. **Mobile UI changes** — screens already exist; this plan only populates `calls.generated.json` and adds `backend_calls` to `domain.meta.json`.
3. **WebSocket wire contract rewrite** — System 18 stays owned by `live-alpha.yaml` + `docs/erd/18-wire-protocol/`; we only cross-link.
4. **Auto-generation of TypeScript/Swift/Kotlin SDKs** — future phase, depends on this spec being stable.
5. **OpenAPI 4.0 migration** — stay on 3.1.0 for tooling maturity.
6. **GraphQL alternative** — explicit decision: REST + WS only. See Section 4.2 ALT-5.
7. **gRPC** — see Section 4.2 ALT-6.

*(Mock server / Prism setup moved IN scope per R-11; previously a non-goal.)*

---

## 20. Open Questions (with gate assignments)

Each question is labelled with the stage it must be resolved before. Failure to resolve by gate triggers either lane slip or ADR-deferred (decision documented in Section 22 with default behavior).

| Q | Question | Gate | Decision artifact | Default if unresolved |
|---|---|---|---|---|
| Q-1 | **IAP vs Stripe for billing**: app store policy review needed. Resolution paths: Stripe-only with web deep-link / IAP-only with receipt-validation / hybrid. Note: existing sequence files `19-billing/checkout-initiate-mobile.sequence.mmd`, `stripe-webhook-processing.sequence.mmd`, `subscription-lifecycle.sequence.mmd`, `dunning-past-due.sequence.mmd`, `entitlement-check-session-start.sequence.mmd` model Stripe today (per ADR-0007). | Before **S4** | New ADR `docs/decisions/0013-billing-payment-method.md` | lane-billing slips to follow-on stage; other S4 lanes proceed |
| Q-2 | **Telemetry mobile slice**: do mobile-app analytics flow through `POST /v1/telemetry/app:batch` (separate from device batch) or through a 3rd-party SDK (Segment/Amplitude)? System 11 spec is device-focused. | Before **S4** | New ADR `docs/decisions/0014-mobile-app-telemetry-routing.md` | lane-telemetry authors only the device-side ingest endpoint; mobile-app analytics deferred |
| Q-3 | **Realtime session parent-gate granularity**: does session start require parent-gate every time, or only first-time-per-day per child? ADR-0005 covers the gate primitive but not frequency policy. | Before **S3** | Update ADR-0005 with frequency-policy addendum, OR new ADR `docs/decisions/0015-parent-gate-frequency.md` | Default to every-time (most restrictive); revisit post-S5 |
| Q-4 | **Demo/kiosk mode mobile build** in scope? Currently deferred. Adding `lane-demo` would require ~2 ops + UI states. | Before this plan exits **S5** | Yes/no decision in plan changelog | Out of scope (Section 19); revisit in follow-on plan |
| Q-5 | **cursor-vs-offset pagination** (Section 22 D-2 [ADR-needed]): cursor chosen by default; if parent dashboards stay bounded (≤500 audit entries per household), offset+totalEstimate may be friendlier. | Before **S3** (lane-parent) | New ADR `docs/decisions/0016-list-pagination-strategy.md` | Keep cursor default; revisit only if a concrete UX requirement emerges |

---

## 21. References

- Existing OpenAPI baseline: `tbot-backend/openapi.json` (29 ops)
- Realtime slice: `docs/packages/shared-data/openapi/live-alpha.yaml`
- Backend system contracts: `tbot-backend/.agent/SYSTEM_CONTRACTS.md`
- API reference (deprecating): `docs/site/development/api-reference.md`
- 22 system specs: `docs/site/software/systems/01..22-*.md`
- **94 sequence diagrams** (as of 2026-05-12 recount): `tbot-design/docs/sequences/{01..22}/*.sequence.mmd` (90) + `_cross/` (4)
- ERD: `tbot-design/docs/erd/{01..22,_shared}/`
- Actor allow-list: `tbot-design/docs/sequences/_actors.md`
- Mobile nav graph: `tbot-design/nav-graph-data.json`
- Mobile flow domains: `tbot-design/docs/flows/domains/<12 dirs>/`
- ADRs: `tbot-design/docs/decisions/{0001..0006}.md` (ADR-0005 = parent-gate security model)
- Related plans: `tbot-design/.omc/plans/backend-sequence-spec-design.md`, `erd-22-systems-design.md`, `erd-backend-implementation-tickets.md`

---

## 22. Embedded Decisions (decisions baked into the plan that warrant ADRs)

Each decision below is currently embedded in plan prose without an explicit ADR. Tagged `[ADR-needed]` if the decision should be formally recorded before relevant stage begins, or `[ADR-deferred]` if the default can hold until a concrete UX/business signal forces a revisit.

| # | Decision | Embedded in | Tag | Rationale for default | Cost to reverse |
|---|---|---|---|---|---|
| D-1 | **Hand-authored spec is contract authority; backend export is implementation-state oracle.** | Section 1 non-goals, R-1, R-4 | **[ADR-needed]** before S1 | Inverts current "code generates spec" model. Backend team needs explicit acceptance. | High — requires re-platforming if rejected. Rollback plan in Section 23. |
| D-2 | **Split pagination: cursor for unbounded feeds, offset+total for bounded household-scoped CRUD** (v4 update per Critic-v3 challenge — was cursor-default-for-everything). | Section 11 | **[ADR-deferred]** — D-2 absorbed into combined ADR 0008-api-contract-authoring-conventions.md (S0c) | Bounded sets get UX wins (jump-to-page, totals); unbounded sets get consistency-under-write. Per-op `x-pagination: cursor\|offset` declared by author; CONVENTIONS.md lists which paths use which. | Low — both schemas shipped in `shared/pagination.openapi.yaml` from S0a. |
| D-3 | **ETag-on-every-mutable-GET + If-Match required for PUT/PATCH/DELETE on those resources.** | Section 10 | **[ADR-needed]** before S2 | Optimistic locking prevents lost-update bugs in concurrent parent edits. Backend must emit ETags (not currently). | Medium — backend prerequisite; if not done, validator stays warn-only (R-8). |
| D-4 | **`Idempotency-Key` mandatory only on POST-create or POST-with-external-side-effect.** | Section 10 (post-revision), Section 4.2 ALT-9 | **[ADR-deferred]** | Loosened from "all POSTs" per Critic ALT-9. Inherently-idempotent POSTs (login, heartbeat) exempt. | Low — can tighten later; tightening is non-breaking if clients already send the header. |
| D-5 | **operationId renames within `/v1/` are PERMITTED** (e.g., `getHouseholdsById` aligned with `<verb><Object>` convention from Section 15.4). | Section 15.4, Section 15.1 | **[ADR-needed]** before S1 | Backend client code (if any) consuming by `operationId` would break. Mobile is not yet integrated; backend client codegen status unclear. | Medium — depends on backend client consumers. If renamed-only-spec-side and backend keeps current names, mismatch shows up in R-1 drift report. |
| D-6 | **Path renames within `/v1/`** (Section 15.1: `/v1/devices/household/{id}` → `/v1/households/{id}/devices`, etc.) | Section 15.1 | **[ADR-needed]** before S1 | Breaking for any existing API consumer. Need confirmation no consumers exist OR that backend will dual-publish during deprecation. | High — if breaking, requires `/v2/` introduction (Section 12) instead. |
| D-7 | **DBML files are source-of-truth for entities; `schema.prisma` is emitted output.** | Section 0 implication block, Section 4.2 ALT-8 | **[ADR-needed]** before S0b validator design | Validates against author-edited substrate, not generated artifact. | Low — reversible if Prisma proves richer (e.g., for indexes); validator can swap source. |
| D-8 | **Vendor-extension scope cut (v4): kept `x-erd-refs` + `x-ui-states` as authored-not-enforced; dropped `x-state-transition`, `x-side-effects`, `x-concurrency` entirely.** `x-authz` remains as optional documentation. | Section 5, Section 6, Section 7, Section 10 | **[ADR-deferred]** | v4 matches Critic-v3 prediction "2/6 ship, 4 never ship" by authoring only the 2; cognitive cost on every op file reduced. | Low — fields can be re-introduced later if recurring bug emerges. |
| D-9 | **Granularity is conditional on author count (v4 update per Critic-v3 challenge):** 1-op-per-file when ≥3 authors execute concurrently; per-tag aggregate (e.g. `01-identity.yaml` with 18 ops) when ≤2 authors. Decision recorded once at end of P-1 based on actual staffing. AC-5 validator parameterized on this mode. | Section 3, Section 4.2 ALT-3, decided in P-1 prerequisite | **[ADR-deferred]** — captured in 0008-api-contract-authoring-conventions.md | Per-PR atomic ownership matters when 4 authors hit same file; with 1-2 authors, file-system noise from 69 separate files costs more than it saves. | Low — files can be merged or split later via aggregator script; both representations bundle to the same `_built/openapi.json`. |
| D-10 | **Cross-system narratives are derived (not authoritative).** `_cross/` files MUST declare `derived_from:`; validator dedupes via that frontmatter. | Section 7, CLAUDE.md existing convention | **[ADR-deferred]** | Matches existing tbot-design CLAUDE.md statement. Just made enforceable. | Low. |
| D-11 | **REST + WebSocket only, no GraphQL/gRPC.** | Section 19, Section 4.2 ALT-5/ALT-6 | **[ADR-deferred]** | Mobile flows are coarse-grained CRUD; gain marginal. | Medium — adding GraphQL later is additive; replacing is hard. |

**ADR-creation in S0c (v4 scope cut)**: instead of 5 separate ADRs, **1 combined ADR** at `docs/decisions/0008-api-contract-authoring-conventions.md` with 5 `## Decision N` subsections covering D-1 (contract authority), D-3 (ETag/optimistic locking), D-5 (operationId naming convention), D-6 (`/v1/` path renames, Path-A-default), D-7 (DBML as ERD source-of-truth). Single ADR reviewed once cuts ~2d context-switching cost vs sequential 5 ADRs. Without ADR-0008 committed, S1 entry gate fails. D-2 (pagination split) absorbed; D-9 (granularity) absorbed.

**v5 — ADR amendment semantics (per Critic-v4 Minor-2)**: individual decisions inside ADR-0008 are amendable via follow-on ADRs that supersede only one sub-decision. Convention: new ADR header `Supersedes: 0008#decision-N` (e.g., `Supersedes: 0008#decision-3` for the ETag/optimistic-locking decision). The follow-on ADR replaces only that subsection; the rest of 0008 stays canonical. This avoids re-opening + re-approving the whole combined ADR when one decision is revisited.

**Convention note (Critic-v5)**: this anchor-fragment syntax (`#decision-N`) is a **new convention being introduced by ADR-0008 itself**. Existing repo ADRs (0001-0007) use only prose-form supersession (e.g., `Superseded by 0003-...md`); no precedent for sub-decision-level supersession exists. ADR-0008's own `## Decision 1` section should explicitly establish the `Supersedes: 0008#decision-N` anchor convention so future ADR authors know it's available. Note this in `docs/decisions/README.md` as well.

**ADR-0005 status note**: `docs/decisions/0005-parent-gate-security-model.md` is on disk with header `## Status: Accepted` but as of 2026-05-12 the file is git-untracked (uncommitted; see `git status`). S0a deliverable list must include "commit ADRs 0005/0006/0007" if those files remain uncommitted, otherwise plan Section 9 references an authority that exists only locally. Q-3 (parent-gate frequency, Section 20) cannot land an addendum to ADR-0005 unless the base ADR is committed first.

---

## 23. Rollback Plan (if backend rejects spec authority)

If R-4 escalates to permanent backend rejection — e.g., backend team determines auto-generation from decorators is non-negotiable for compliance/audit reasons — this plan degrades to **Documentation Overlay Mode** without complete loss of work:

| Element | Authoritative mode (planned) | Documentation Overlay Mode (rollback) |
|---|---|---|
| `docs/api/**` | Contract authority; backend conforms | Mobile's expected-contract documentation; advisory |
| `tbot-backend/openapi.json` | Implementation-state oracle | Restored as authority |
| Gap report `_reports/mobile-gap.md` | Backend backlog | Mobile prioritization input (what mobile needs prebuilt before integration) |
| `npm run api:validate` | CI-blocking | Advisory only; emits comparison-report to PRs |
| `domain.meta.json.backend_calls` field | OperationIds from spec | OperationIds from backend export |
| Mock-server (Prism) | Drives mobile dev | Unchanged — still drives mobile dev |
| Phase-2 validators | Eventually promoted | Permanently advisory |
| Schema-vs-ERD validator | Promoted to error at 80% | Stays warn-only |

**Rollback trigger** (one of):

(a) **Appeal rejection threshold**: 3 cumulative formal `contract-appeal` PRs rejected, subject to ALL of:
- **Quorum**: each rejection must be signed by ≥2 of {backend lead, mobile lead, staff engineer designated as neutral arbiter}. Single-reviewer rejections do not count.
- **Cycle-time floor**: ≥10 working days between consecutive appeal rejections (prevents same-day stampeding).
- **Aggregation window**: rejections counted only if they fall within a rolling **90-working-day window**. Older rejections age out and do not contribute.
- **Substantive grounds**: each rejection must cite a specific spec section or contract clause; "general objection" does not count.

(b) **Signoff refusal**: Backend lead refuses to sign `_reports/backend-lead-signoff.md` after 2 revision rounds. Each revision round must include written feedback in `_reports/contract-appeals/<YYYY-MM-DD>-signoff-round-N.md`. Refusal without written feedback does not trigger rollback (mobile lead may escalate to staff-engineer arbiter instead).

(c) **Mutual agreement**: mobile lead + backend lead jointly file a `_reports/rollback-decision.md` signalling planned mode change. This path skips the appeal mechanics entirely and is the recommended graceful exit.

Triggers (a) and (b) protect against unilateral rejection or stampeding; trigger (c) is the deliberate path.

**Rollback procedure** (≤2 working days):

1. Update Section 1, R-1, R-4 to mark mode = "Documentation Overlay".
2. Flip CI `api-validate` from blocking to advisory.
3. Update `docs/api/AGENTS.md` and `docs/sequences/AGENTS.md` with mode note.
4. Convert spec drift entries from "backend ticket" to "mobile integration prerequisite".
5. No code or spec content is discarded — only the authority semantics change.

**Cost of rollback**: ~0.5 d engineering + signoff communication. All authored artifacts retain mobile value.

---

## 24. Changelog (revisions applied; newest first)

### v5.2 — 2026-05-12 — Post-V-10b gate verification + AI-1/2/3 plan hygiene

V-10b gate check (per Critic-v5 §S0a deliverable) ran successfully — `scripts/erd/dbml-to-prisma.mjs` confirmed clean, deterministic, AST-consumable. V-10b validator scope KEPT. Report at `.omc/p1-meeting/dbml-to-prisma-ast-stability.md`.

**Bonus finding:** plan §6 lifecycle table is **stale on 7 of 7 spot-checked entries** vs actual DBML. The table was authored from convention (`PENDING/ACTIVE/SUSPENDED`-style) but actual DBML uses snake_case (`active, disabled, scheduled_for_deletion`). V-10b would have caught this on first CI run — vindicates the M-3 architecture.

**AI-1/2/3 applied:**
- **AI-1 §6**: lifecycle table entries marked illustrative-placeholder; refreshed-from-DBML during S0a. Inline `*(actual DBML: ...)*` annotations show current drift for visibility.
- **AI-2 §17 V-10b**: walk-rules specified — skip `templates/`, `_global/`, `_shared/` subdirs; walk only `<NN-system>/*.dbml`.
- **AI-3 §17 V-10b**: `ENUM-DIVERGENCE` error class for same-name enums with different value-sets across files; `LIFECYCLE-PHANTOM` warning for table-listed states not in any DBML.

### v5.1 — 2026-05-12 — Post-fifth-Critic final shipping fixes

Fifth Critic pass returned **APPROVED-WITH-CAVEATS** → "Ship after fixing X" with two 30-min doc-hygiene fixes. Both applied:

- **§22 ADR amendment convention note**: explicit acknowledgment that `Supersedes: 0008#decision-N` anchor-fragment syntax is **new to the repo** (existing ADRs 0001-0007 use prose-form supersession only). ADR-0008's own `## Decision 1` should establish the convention; `docs/decisions/README.md` should note it.
- **§18.1 S0a deliverable: verify `scripts/erd/dbml-to-prisma.mjs` AST stability** as gate for V-10b validator scope. If parser output unstable, S0b drops V-10b and lifecycle-table drift detection downgrades to manual review.

**Status: SHIP-READY.** All 5 critic passes addressed. No remaining blockers. Execution begins with P-1 backend-lead meeting.

### v5 — 2026-05-12 — Post-fourth-Critic targeted patches

Fourth Critic pass returned **APPROVED-WITH-CAVEATS** with 3 MAJOR + 3 MINOR — "one more round, 30-60 min." All applied:

**MAJOR fixes:**
- [M-1] **`x-state-transition` re-added as authored-not-enforced** in §5 Phase-1 metadata table. Critic-v4 caught that field-deletion (v4) over-corrected — validator deletion was right, field deletion was not. Field cost ~30 sec/op; drift cost is silent state-machine violations. Validator V-15 stays Phase-2.
- [M-2] **§11.1 pagination migration section added** (per Critic-v4 M-2). Offset→cursor breaking-change path defined: triggered by p95 size >500 OR concurrent writers; follows §12.1 Path A (dual-publish with `?paginate=cursor` flag) or Path B (`/v2/`); reverse direction (cursor→offset) is non-breaking. Reports at `_reports/pagination-migrations.md`.
- [M-3] **Lifecycle-table drift detector added.** New Phase-1 validator `scripts/api/verify-lifecycle-table-coverage.mjs` reads DBML `*.status` enums + asserts each value appears in §6 lifecycle table. <1d build, reuses `scripts/erd/dbml-to-prisma.mjs` AST. S0b validator count: 6 → 7.

**MINOR fixes:**
- [Mi-1] **§13 conflict-prevention rules scoped to ≥2 authors.** CODEOWNERS, branch-naming, merge-frozen, PR-per-stage all marked as "applies when ≥2 authors concurrently"; skipped under 1-author execution.
- [Mi-2] **ADR-0008 amendment semantics specified in §22.** Individual decisions amendable via follow-on ADR with header `Supersedes: 0008#decision-N` — replaces only that subsection, not the whole combined ADR.
- [Mi-3] **§18.0 P-1 pre-meeting deliverables.** Option B + Option C skeleton plans (`api-contract-stub-controller-hybrid.md`, `mobile-driven-endpoint-requirements.md`) MUST exist as 1-page skeletons before backend-lead meeting. Prevents "de-facto A because nothing else is written" outcome.

**Final v5 state:**
- Phase-1 authored vendor extensions: 4 enforced (`x-system-id`, `x-owner-lane`, `x-idempotent`, `x-sequence-refs`) + 3 authored-not-enforced (`x-erd-refs`, `x-ui-states`, `x-state-transition`) + 2 optional (`x-authz`, `x-related-systems`).
- S0b validators: 7 Phase-1 + bundle + workflow.
- Phase-2 validators deferred: V-15, V-17, V-19 (3 validators for 3 authored-not-enforced fields).
- Schedule unchanged from v4: 20-26d (4 authors) / 24-34d (2 authors) / 38-55d (1 author).

### v4 — 2026-05-12 — Post-third-Critic substantive review

Third Critic pass returned **APPROVED-WITH-CAVEATS** with 5 substantive challenges + 1 prerequisite recommendation. All applied:

**[C-1] Pre-S0a prerequisite (Section 18.0) — biggest hidden assumption fix.** 1-hour scoping meeting with backend lead BEFORE any scaffolding. Three options on the table: A (this plan as-written), B (stub-controller hybrid — backend writes 501-stub controllers, emits OpenAPI, mobile proposes via PR), C (status quo, gap-report only ~5d). Plan no longer presumes A. P-1 + P-2 (UI stability) gate S0a entry. Outcome documented at `_reports/backend-authority-decision.md`.

**[C-2] Phase-2 trap cleanup (Section 5).** Critic-v3 predicted 2/6 deferred extensions ship within 12 months, 4 never ship. v4 matches that:
- Kept: `x-erd-refs`, `x-ui-states` (authored-not-enforced; V-17, V-19 in Phase 2)
- Dropped from authoring entirely: `x-state-transition`, `x-side-effects`, `x-concurrency`
- `x-authz` remains as optional documentation.

State transitions documented in Section 6 lifecycle table (hand-maintained). Side effects narrated in operation `description:`. Concurrency policy = class-level list in CONVENTIONS.md.

**[C-3] Single-author timeline disclosure (Section 18.2).** Three staffing models:
- 1 author: **38-55d** (~2-3 calendar months)
- 2 authors: **24-34d**
- 4 authors: **20-26d** (headline best-case)

Plan owner field at top is singular; staffing commitment is the schedule variable that moves this 2x. Stakeholder communication should default to 2-author band.

**[C-4] D-2 pagination split (Section 11).** Cursor for unbounded feeds (telemetry, audit-feed, gap-report). Offset+total for bounded household-scoped CRUD (children, devices, schedules, invoices). Per-op `x-pagination` declaration; both schemas ship in `shared/pagination.openapi.yaml`.

**[C-5] D-9 granularity conditional on author count (Section 22).** 1-op-per-file when ≥3 authors; per-tag aggregate (`01-identity.yaml` with 18 ops) when ≤2 authors. Decision made once at P-1 based on actual staffing. AC-5 validator parameterized on mode declared in CONVENTIONS.md.

**[C-6] Stub-controller hybrid (Section 4.2 ALT-10).** Promoted from rejected-by-default to one of three options in pre-S0a P-1 meeting.

**Scope cuts (Critic's "50%-scope" suggestion partially adopted):**
- 5 separate ADRs (S0c) → **1 combined ADR** at `0008-api-contract-authoring-conventions.md` with 5 `## Decision N` subsections. S0c drops from 2-3d to 1d.
- Schema-vs-ERD validator: **warn-only forever** (v4 scope cut; was warn→error at 80% trigger). AC-3 always exit-0; warnings reported, not blocking.
- 4 Phase-2 validators (V-15/V-16/V-18) deleted; only V-17/V-19 remain.

**Updated headline schedule: 20-26d (4 authors) / 24-34d (2 authors) / 38-55d (1 author).** v3 was 22-28d single-band.

### v3.1 — 2026-05-12 — Post-Verifier numeric recount

Verifier-pass (substituting for Critic during API overload) flagged stale sequence count:
- §0 sequence total: 90 → **94** (+4 since v2; 01-identity 9→10, 19-billing 5→8).
- §0 per-system table updated with new counts.
- §14 lane-identity sequence count 9 → 10.
- §14 lane-billing sequence count 5 → 8.
- §21 References updated to 94.

All other v3 claims VERIFIED with line-evidence (see Section 24 v3 block below).

### v3 — 2026-05-12 — Post-second-Critic Review

Critic verdict: **REVISE** (close to ACCEPT) — 5/6 v1 MAJORs fixed, 1 PARTIAL, 3 NEW-MAJORs + 3 NEW-MINORs. All applied:

**NEW-MAJOR fixes:**
- [N-1] **Section 12.1 added** — `/v1/` in-version rename mechanics (Path A dual-publish default, Path B `/v2/` introduction). Resolves D-6 contradiction; D-6 default = Path A.
- [N-2] **Section 23 rollback trigger hardened** — added (a) quorum (≥2 reviewers), cycle-time floor (≥10 working days), aggregation window (90-day rolling), substantive grounds; (b) signoff refusal with feedback artifact; (c) mutual-agreement graceful path.
- [N-3] **S0c stage added** (2-3d, 1 author) dedicated to 5 ADR authoring before S1. Total schedule revised to **22-28d**. ADR numbers shifted to 0008-0012 (existing 0006/0007 already taken on disk).

**NEW-MINOR fixes:**
- [N-4] Section 17 Phase-2 scope note: "separate follow-on plan, not in scope here".
- [N-5] Section 4.1 expanded with `_built/` artifact policy: gitignored, `api:bundle:watch`, `prebuild` hook, CI staleness check, dev-mock environment routing.
- [N-6] R-5 normalization-pass migration safety: pre/post `sequences:fast` snapshot diff, zero-non-arrow-changes acceptance gate.

**Additional:**
- ADR-0005 status caveat noted in Section 9 + Section 22 — file Accepted on disk but git-untracked at plan-write time. S0a commits all uncommitted ADRs (0005/0006/0007) as part of opening housekeeping.
- Section 20 Q-1..Q-5 ADR numbers bumped to 0013-0016 (0006-0012 reserved or taken).
- Section 18 total: 18-22d → 22-28d (Critic's realistic floor adopted explicitly).

### v2 — 2026-05-12 — Post-Critic Review

Critic verdict: **REVISE** with 6 MAJOR + several MINOR + missing items. All applied:

**MAJOR fixes:**
- [M-1] **AC-7 set-difference formula**: replaced arithmetic subtraction with `{ op ∈ docs/api/** : op ∉ backend baseline AND ∃ UI state referencing op }`.
- [M-2] **S0 re-baseline**: split into S0a (2d artifacts) + S0b (3-4d validators), total ~18-22d (was 14d), entry gates added per stage.
- [M-3] **Section 4.2 "Alternatives Considered"** added: 9 alternatives (ALT-1..ALT-9) with rejection rationale (backend-NestJS-as-source, file granularity, cursor vs offset, GraphQL, gRPC, Phase-2 enforcement, schema source, idempotency strictness).
- [M-4] **Phase-2 demotion**: `x-state-transition`, `x-side-effects`, `x-erd-refs`, `x-ui-states`, `x-concurrency`, `x-authz` are now authored metadata in Phase 1, not validator-enforced. Phase-1 enforcement reduced to `x-system-id`, `x-owner-lane`, `x-idempotent`, `x-sequence-refs`.
- [M-5] **Refreshed counts + Section 22 "Embedded Decisions"**: 11 decisions tagged [ADR-needed]/[ADR-deferred]. 78 → 90 sequence files. Per-system counts inventoried. `05-safety` clarified (5 internal-only diagrams, parent-incident-report file still needed).
- [M-6] **Risk-mitigation hardening**: R-3 now has 80% schema-coverage promotion gate; R-4 has `_reports/backend-lead-signoff.md` artifact + appeal-PR path + rollback (Section 23); R-5 promoted from warn to hard error with S0a normalization pass; R-9 relocated to Section 20 gate to remove double-tracking.

**MINOR fixes:**
- Section 1 + R-1 framing reconciled (contract authority vs implementation-state oracle, single phrasing).
- Section 4.1 `index.openapi.yaml` aggregator semantics explicitly specified (only `info/servers/security/tags/components/paths-as-$ref`).
- Section 7 `_cross/` dedup via `derived_from:` frontmatter formalized.
- Section 14 lane-content/realtime/parent corrected counts; safety-lane clarified "5 internal diagrams, none parent-UI".
- Section 19 mock-server moved IN scope (R-11); was non-goal #5.
- AC-12 redundancy with AC-1 collapsed (extends `verify-ui-coverage.mjs` instead of separate script).
- Section 0 added DBML-as-source-of-truth declaration + CLAUDE.md AGENTS.md drift note.
- AC tag column added: 4 concrete, 8 S0b-tooling, 0 broken.

**Missing items added:**
- R-11 mock-server bridge (Prism) for mobile during authoring.
- Section 23 rollback plan if backend rejects spec authority.
- D-1..D-11 embedded decisions register (Section 22).
- `docs/sequences/AGENTS.md` creation in S0a to close CLAUDE.md drift.
- 5 new ADRs scheduled (D-1, D-3, D-5, D-6, D-7) as S1 entry gate.

### v1 — 2026-05-12 — Initial draft

Initial plan produced after mobile-driven gap-analysis scope selection.
