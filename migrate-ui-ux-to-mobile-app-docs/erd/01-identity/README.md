# 01-identity — Identity, household, access

**System spec:** `docs/site/software/systems/01-identity-household-access.md`
**Sequences:** `docs/sequences/01-identity/*.sequence.mmd`
**Owning service(s):** `IdentityService`
**Lane:** B (worker-1, Phase 2)
**Status:** pending entity extraction.

## Planned entities (from plan §3 manifest)

| Entity | Role |
|---|---|
| `users` | Authenticated parent / account holder. |
| `households` | Hard-concept FK target for many tables. |
| `household_members` | Membership join (one parent : many children, one household : many parents). |
| `children` | Child profile — COPPA-scoped data. |
| `auth_sessions` | Server-side session record. |
| `refresh_tokens` | Refresh token store. |
| `email_verifications` | Email-verify nonces. |
| `password_reset_tokens` | Password-reset nonces. |
| `mfa_secrets` | TOTP / WebAuthn secrets. |

## COPPA hard-gate

Every entity whose lifecycle touches `children` MUST declare `retention:` in frontmatter (no default, no waiver).
