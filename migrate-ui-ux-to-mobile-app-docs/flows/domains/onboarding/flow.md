<!-- HAND-CURATED. -->
# Onboarding Flow

## Happy Path

Splash → Welcome → Intro Demo (4 auto-advancing beats) → Trust → COPPA Consent → Mic Permission → Login → Child Profile → First Lesson Entry.

Returning users skip directly: Splash → Login → First Lesson Entry (if child profile exists).

## COPPA Consent Gate (`onb_coppa`)

Required by sys-16 between `onb_trust` and `onb_mic`. Parent must explicitly tap "I consent" before any child profile is created. Declining returns to `onb_welcome` and persists `onboarding.cursor` for resume on next launch. The consent record (`coppa_consent_id`) is created via `POST /v1/coppa/consent` with idempotency key `(user_id, consent_version)` — versioned so policy revisions create new rows rather than collapsing.

## Resume Cursor

The app persists `onboarding.cursor` (last completed state id) on every state entry. On launch, Splash reads the cursor and resumes from the last completed state rather than restarting from Welcome. Exception: if the cursor is `onb_coppa` with `consent_declined`, the resume returns to `onb_welcome` (declined consent is not resumable mid-flow; the parent must restart).

## Edge Cases

| State | Scenario | Exit |
|---|---|---|
| `onb_coppa` | Parent declines consent | → `onb_welcome`; cursor preserved for later |
| `onb_login_error` | Auth failure / network error | → `onb_login` (retry) or `onb_welcome` (cancel) |
| `onb_mic` | Mic permanently denied (iOS "never ask again") | → OS settings deep-link; not modeled as a separate nav-graph state |
