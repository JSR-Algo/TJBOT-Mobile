# 06-content — Content + personalization

**System spec:** `docs/site/software/systems/06-content-and-personalization.md`
**Sequences:** `docs/sequences/06-content/*.sequence.mmd`
**Owning service(s):** `ContentService`, `SummaryService`, `DecayScheduler`, `ModerationWorker`
**Lane:** E (worker-4, Phase 2)
**Status:** pending entity extraction.

## Planned entities (from plan §3 manifest)

| Entity | Role |
|---|---|
| `courses` | Top-level course unit. |
| `levels` | Level inside a course. |
| `units` | Unit inside a level. |
| `lessons` | Lesson inside a unit. |
| `activities` | Activity inside a lesson. |
| `words` | Word taxonomy. |
| `topics` | Content topic taxonomy (NOT `safety_topics`). |
| `topic_decay_state` | Per-child decay state. |
| `content_personalization_snapshots` | Personalisation snapshot. |
| `daily_summaries` | Daily summary outputs. |

## Stateless service annotations

- `@stateless: SummaryService` — read-side renderer of summary rows.
- `@stateless: DecayScheduler` — cron scheduler; writes `topic_decay_state`.
- `@stateless: DecayWorker` — runs the decay job.
- `@stateless: ModerationWorker` — moderates content + media; writes rows owned by other lanes.
- `@stateless: InvalidationWorker` — content cache invalidation; no own entity.
