# Backend Progress Contract Consumption

Status: accepted
Date: 2026-07-13

The mobile progress and rewards surfaces consume parent-authenticated reward, leaderboard, child-name, and active-child contracts through the existing HTTP client and TanStack Query cache. Backend persistence and policy remain outside sys-16 ownership.

Mobile stores no reward balance and predicts no award. Only idempotent reward-seen acknowledgements may enter the account-and-household scoped offline queue. Child rename, active-child selection, and leaderboard preference mutations require a live server confirmation.

This ADR lives at the validator-required `docs/decisions` location and points to the detailed architectural decisions in `../../decisions/0006-lesson-session-ownership.md` and `../../decisions/0011-multi-child-management.md`.
