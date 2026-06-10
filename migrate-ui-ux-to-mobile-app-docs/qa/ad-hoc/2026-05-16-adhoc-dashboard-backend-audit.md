# Dashboard/Home Backend Field Audit

Task: `AD-HOC: adhoc-2026-05-16-dashboard-backend-audit`

Backend evidence:
- OpenAPI route coverage includes `/v1/profile/active-child`, `/v1/billing/plan`, `/v1/billing/subscription`, `/v1/notifications/preferences`, `/v1/me/notifications`.
- Canonical OpenAPI `.paths` does not define `/v1/billing/plan` or `/v1/billing/subscription` operations, so plan/subscription response fields remain `BLOCKED` for this audit.
- OpenAPI route coverage does not include live parent/home summary routes.
- `task-s4-parent-dashboard-api` is `NOT_STARTED`, so daily/weekly summary data remains `BLOCKED`.

| field | screen | backend source | response path | loading behavior | empty behavior | stale/offline behavior |
|---|---|---|---|---|---|---|
| active child selector | home screen | `GET /v1/households/:id/children` via `HouseholdContext`; switch uses `POST /v1/profile/active-child` | `data[].id`, `data[].name`; switch `data.active_child_id` | home loading robot while query/context load | zero-child state if no children | home error variant if hub refresh fails; child list remains from context |
| active child name | active child card/home | `HouseholdContext.children` + active child id | selected child `name` | home loading robot | no name prefix when no selected child | uses current context value; no guessed backend field |
| robot/home hub status | home screen | BLOCKED: no live home hub route in OpenAPI | BLOCKED | loading robot | zero-child/unpaired derived only when local context supports it | error state; no route guessed |
| review badge/count | home screen | BLOCKED: no live review-count route in OpenAPI | BLOCKED | no backend badge load | null badge | no guessed count |
| today lessons/minutes | parent today | BLOCKED: parent daily summary API not live | BLOCKED | `Loading today's progress` | BLOCKED | `Today summary unavailable`; no prototype data |
| weekly minutes/lessons/streak/top words | parent dashboard | BLOCKED: parent summary API not live | BLOCKED | `Loading parent summary` | BLOCKED | `Parent summary unavailable`; no prototype data |
| 30-day history | parent history | BLOCKED: parent history API not live | BLOCKED | `Loading history` | BLOCKED | `History unavailable`; no generated fake rows |
| progress summary | daily/weekly summary | BLOCKED: `getProgressSummary` route not documented | BLOCKED | `Loading progress` | normalized empty summary when API is later wired | `Progress offline` for `NETWORK_ERROR`, `Progress unavailable` otherwise |
| notification badge/count | home/dashboard | no rendered badge/count field found | n/a | n/a | n/a | n/a |
| plan name | parent settings subscription | BLOCKED: route coverage lists `/v1/billing/plan`, but canonical OpenAPI `.paths` has no operation/response schema | BLOCKED | `Unavailable` | BLOCKED | `Unavailable`; no guessed plan name |
| subscription status | parent settings subscription | BLOCKED: route coverage lists `/v1/billing/subscription`, but canonical OpenAPI `.paths` has no operation/response schema | BLOCKED | `Unavailable` | BLOCKED | `Unavailable`; no guessed subscription status |

Fix summary:
- Removed prototype child profile/subscription values from parent settings.
- Parent settings marks billing plan/subscription status unavailable until OpenAPI defines response paths.
- Parent today/history screens read API service data and handle loading/empty/error without hardcoded rows.
- Missing backend summary/home routes remain `BLOCKED`.
