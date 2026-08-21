#!/usr/bin/env bash
# repo: tbot-mobile
# T3.1 repro — the mobile course browse → send-to-robot flow's error edges.
#
# Session 2 scope (what this repro proves): conflict recovery must fire on
# ROBOT_BUSY — what an occupied device actually returns via the single-slot index
# ux_one_active_assignment_per_device — and not only on ASSIGNMENT_CONFLICT; a
# conflict must never render the generic unknown-error copy and must refresh
# state; an offline robot must never be assigned to; two taps in one frame must
# issue one assignment; and every network failure in the flow must offer a retry
# that refetches.
#
# Session 1 (merged as 97f21cc8, gate VERIFIED) covered the retired-410 reconnect
# via tests/features/needs-sync-live-preload.test.tsx. That file is deliberately
# NOT listed below: it already exists and passes on this repro's base, so
# including it would let the gate's RED phase go green-on-base and be REJECTED as
# tautological. It stays locked by the normal suite (npm test / test:screens).
#
# RED on base (the file below does not exist there), GREEN on the fix branch.
set -euo pipefail

CANON="$TBOT_REPRO_REPO_ROOT"
[ -e node_modules ] || ln -s "${TBOT_REPRO_DEPENDENCY_ROOT:-$CANON}/node_modules" node_modules

# --maxWorkers=2 --testTimeout: these suites blow through jest's 5000 ms default
# when the host is contended (see the T0.4/T6.5 load-robustness finding). A
# 2026-08-06 gate run was defeated in BOTH phases by it — the RED phase went red
# because a merged, passing test flaked at 19.8 s rather than because the bug
# reproduced. A false RED is exactly the unearned-VERIFIED failure mode the T0.4
# protocol exists to prevent, so the timeout is pinned here and in-file
# (jest.setTimeout(30_000)) rather than left to the machine's mood.
npx jest --maxWorkers=2 --testTimeout=30000 \
  tests/features/course-flow-error-edges.test.tsx
