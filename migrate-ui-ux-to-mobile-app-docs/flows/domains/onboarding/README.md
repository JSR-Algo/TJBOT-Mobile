<!-- HAND-CURATED. -->
# Onboarding Domain Flow

**Owner lane:** A
**States:** 9 (9 happy, 0 edge)

## Entry / exit

- **Entry:** `onb_splash` — first screen shown on app boot (first-run path).
- **Exit to auth:** `go('onb_login')` — user taps "Get started" after mic permission granted.
- **Exit to home:** returning users bypass onboarding entirely at `onb_splash` and jump to `home_hub_idle`.

## Happy path — First-run intro sequence

The child (or parent) opens the app for the first time. The splash screen detects no saved session and routes into the guided intro:

`onb_splash` → `onb_welcome` → `onb_intro_listen` → `onb_intro_speak` → `onb_intro_retry` → `onb_intro_celebrate` → `onb_trust` → `onb_mic` → `onb_first_lesson`

Steps `onb_intro_listen`, `onb_intro_speak`, `onb_intro_retry`, and `onb_intro_celebrate` all auto-advance via `autoAdvance` timers (2500–3000 ms). No user input is required during this segment; it is a purely animated gameplay demonstration loop.

`onb_intro_retry` is classified **happy** (documented exemption): it represents the robot demonstrating "try again" as part of the intro loop, not a real failure or error-recovery state.

After `onb_mic` the user grants (or is prompted to grant) microphone permission. `onb_first_lesson` is the terminal onboarding screen — a teaser that transitions the user into the auth flow.

## Notes

- No edge states in this domain. All failures (mic denied, network unavailable) are surfaced by other domains (`fallback`).
- `onb_splash` doubles as the returning-user router: if a session token exists the app skips onboarding and goes straight to `home_hub_idle`.
