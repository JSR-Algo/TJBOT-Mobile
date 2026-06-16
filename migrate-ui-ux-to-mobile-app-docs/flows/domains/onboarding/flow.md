<!-- HAND-CURATED. -->
# Onboarding Flow

## Happy Path

Splash → Welcome → Intro Demo (4 auto-advancing beats) → Trust → Login → Parent Consent → Child Profile → Mic Permission → First Lesson Entry.

Returning users skip directly: Splash → Login → First Lesson Entry (if child profile exists).

## COPPA Consent Gate (`onb_coppa`)

Required by sys-16 after parent login and before `onb_child`. Parent must type their name, check the consent box, and tap "Sign and continue" before any child profile is created. Declining or failing to submit keeps the parent on `ParentConsentScreen`. The consent record is created through the authenticated `POST /v1/auth/consent` endpoint.

## Resume Cursor

The app persists `onboarding.cursor` (last completed state id) on every state entry. On launch, Splash reads the cursor and resumes from the last completed state rather than restarting from Welcome. If consent has not been recorded, the authenticated onboarding stack opens at `ParentConsentScreen`.

## Edge Cases

| State | Scenario | Exit |
|---|---|---|
| `onb_coppa` | Parent does not accept consent or submission fails | stay on `ParentConsentScreen` with inline retry copy |
| `onb_login_error` | Auth failure / network error | → `onb_login` (retry) or `onb_welcome` (cancel) |
| `onb_mic` | Mic permanently denied (iOS "never ask again") | → OS settings deep-link; not modeled as a separate nav-graph state |
