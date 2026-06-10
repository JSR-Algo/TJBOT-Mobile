---
entity: wire-protocol-domain-types
domain: 18-wire-protocol
service_owner: Gateway
state_machine: none
api_endpoints:
  - "@no-api"
sequences_referenced_in:
  - "@no-sequence"
retention: "@stateless"
---

# wire-protocol-domain-types

@stateless — This file declares shared enum/type definitions for the TBOT wire protocol. There are **no database tables** in this domain. The `.dbml` file contains `enum` declarations only.

## Business purpose

Canonical shared type vocabulary for the TBOT wire protocol. These enums are cross-referenced by domain DBML files across multiple systems (session lifecycle, safety, billing, device capability, notification channels). Centralizing them here prevents divergence when a value is added to a shared enum.

## Ownership rules

- Owner service: `Gateway` (wire protocol is enforced at the Gateway boundary)
- Writers: platform architect (any change requires review of all referencing domain DBML files)
- Readers: all backend services that serialize/deserialize wire protocol messages

## Declared enums

See `wire-protocol-domain-types.dbml` for the full list and `README.md` for the summary table.

## Lifecycle

- Not applicable — type declarations have no runtime lifecycle.
- Changes to these enums are **breaking changes** if existing values are removed. Additions are safe.

## Related APIs

- Not applicable — these are type declarations, not API endpoints.

## Related sequences

- Not applicable — shared types are referenced by sequences but do not appear as sequence actors.

## Validation rules

- No new `Table` blocks may be added to this file — only `enum` declarations.
- Enum value additions are additive and safe; removals require cross-lane review.

## Edge cases

- DBML does not have an explicit import mechanism. Domain DBML files that reference these types must copy the relevant `enum` declaration inline OR Phase 3 reconciliation ensures the global-erd.dbml concatenation deduplicates them.
