<!-- HAND-CURATED. -->
# Fallback Domain Flow

**Owner lane:** D  
**States:** 10 (4 happy, 6 edge)

## Overview

The Fallback domain captures every recovery surface that the app can route to when a nominal flow breaks. These are not permanent destinations — all states here are designed to unblock the user and return them to a primary flow as quickly as possible.

## Happy-classified states

| State | Purpose |
|---|---|
| `kid_settings` | In-session settings panel accessible to the child. Non-destructive, always reachable. |
| `safety_redirect` | Child was routed away from disallowed content; landing here is intentional and safe. |
| `help_faq` | Static FAQ — always available, no network required. |
| `lesson_resume` | Prompt to continue an interrupted lesson; success path returns to `cl_running`. |

## Edge states

| State | Templates | Trigger |
|---|---|---|
| `mic_missing` | error | Microphone permission denied at OS level; app cannot start a voice session. |
| `network_error` | error, retry | No internet connectivity detected; user shown retry button. |
| `voice_failed` | error | Voice session ended unexpectedly (WebSocket drop, server error); non-retriable without user action. |
| `reconnecting_overlay` | retry | Transient connection blip; auto-retry in progress with countdown UI. |
| `audio_recovery` | error, retry | Audio output device lost mid-session (e.g. headphones unplugged); user can retry or exit. |
| `app_error` | error | Unhandled exception caught at top-level boundary; generic error with restart option. |

## Flow notes

- `reconnecting_overlay` is a non-blocking overlay, not a full-screen state; it sits above the active lesson UI.
- `audio_recovery` and `network_error` both offer retry — auto-retry fires once before surfacing the manual retry button.
- `app_error` is the catch-all of last resort and should only appear after all domain-specific error states have been exhausted.
