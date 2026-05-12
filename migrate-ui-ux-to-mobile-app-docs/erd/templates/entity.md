---
entity: example_entity
domain: 00-template
service_owner: ExampleService
state_machine: none
api_endpoints:
  - GET /v1/example
  - POST /v1/example
sequences_referenced_in:
  - docs/sequences/00-template/example.sequence.mmd
retention: hard
---

# example_entity

Replace this file when authoring a new entity. **Do not delete the frontmatter.** The validator (`scripts/erd/validate-erd.mjs`) checks for the four required keys: `entity`, `domain`, `service_owner`, `retention`.

Allowed values:

- `domain`: `<NN>-<system>` matching the folder (e.g. `01-identity`) or `_shared`.
- `service_owner`: a name from `docs/sequences/_actors.md` (TBot backend service block).
- `state_machine`: a path to a state-machine doc, the literal string `none`, or `@inline` if the transitions are documented in the body below.
- `api_endpoints`: list of REST/RPC paths that CRUD this entity. `[]` allowed only with `@no-api` annotation.
- `sequences_referenced_in`: list of `.sequence.mmd` paths referencing this entity. Empty list requires `@no-sequence`.
- `retention`: one of `hard`, `soft`, `coppa-180d`, `gdpr-30d`, `coppa-on-deletion`, or an explicit duration like `90d`.

Stateless / pre-sequence helpers may add the annotation lines `@stateless` or `@no-sequence` to the frontmatter to waive the corresponding WARN rules.

## Business purpose

One to three sentences explaining what this entity represents in product terms. No implementation detail.

## Ownership rules

- Owner service: `ExampleService`
- Writers: list every service / worker that mutates the table.
- Readers: list every service / worker / consumer surface that reads it.

## Lifecycle

- Create: when, by what trigger.
- Update: list events that mutate it.
- Delete: hard / soft / archived. If soft, reference the retention sweep.
- State machine: pointer to the relevant doc, or describe transitions inline if `state_machine: @inline`.

## Related APIs

- `POST /...` — create
- `GET /...` — read
- `PATCH /...` — partial update
- `DELETE /...` — delete

## Related sequences

- `docs/sequences/<NN>-<system>/<flow>.sequence.mmd` — describes <what>

## Validation rules

- Enumerate column-level validation (length, range, regex, FK existence) that the service enforces beyond DB constraints.

## Edge cases

- Retry / idempotency.
- Cancellation handling.
- Soft-delete + hard-delete interaction.
- Cross-domain consistency model (sync, eventually consistent, replicated via outbox).
