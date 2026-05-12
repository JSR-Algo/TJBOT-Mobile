# 07-parent — Parent controls + summary

**System spec:** `docs/site/software/systems/07-parent-controls-summary.md`
**Sequences:** `docs/sequences/07-parent/*.sequence.mmd`
**Owning service(s):** `ControlsService`, `SummaryWorker`
**Lane:** E (worker-4, Phase 2)
**Status:** pending entity extraction.

## Planned entities (from plan §3 manifest)

| Entity | Role |
|---|---|
| `parent_controls` | Per-household controls config. |
| `usage_caps` | Per-child usage caps. |
| `weekly_summaries` | Weekly summary outputs. |
| `parent_notifications_outbox` | Parent-facing notification outbox (do NOT collide with sys-10 `notification_dispatches`). |

## Stateless service annotations

- `@stateless: SummaryWorker` — generates `weekly_summaries` rows; owns no entity beyond those.
