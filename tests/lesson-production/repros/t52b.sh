#!/usr/bin/env bash
# repo: $TBOT_REPRO_REPO_ROOT
#
# T5.2 second pass — the findings other sessions had routed TO T5.2 in
# LESSON_PRODUCTION_PLAN.md §5, plus a hole the first pass left in its own gate.
#
#   1. GATE HOLE — a decorator is not a contract. `CourseLibraryController`
#      keeps @Post/@Get handlers whose entire body is
#      `throw new HttpException(retiredBody(), 410)`. The first-pass gate scanned
#      decorators, so it called `unlock` / `send-to-robot` / `sync-status`
#      "served" and passed. Calling a route that always 410s is exactly as
#      broken as a 404. The gate now classifies retired handlers separately and
#      fails on them; the three dead mobile shims are deleted (no `src/` caller).
#   2. Two registry `reason` strings asserted those same retired routes were
#      "live" — the first pass documented them wrong.
#   3. 15 operations still rejected with a bare `new Error('not implemented')`,
#      which carries no `code` and normalizes to UNKNOWN_ERROR — the first pass
#      only converted the four in parent.api.ts because it audited functions
#      already using the sentinel plus `client.*` calls, and never looked for
#      bare throws.
#   4. `getProgressSummary` RESOLVED a frozen all-zero summary, so a caller
#      could not distinguish "no data yet" from "no backend contract".
#   5. `getReviewQueue` existed in two modules against two different backend
#      surfaces, so one registry row would have justified both. Names are now
#      module-qualified and the gate fails on an ambiguous operation.
#   6. ERROR ENVELOPE — the backend emits `{error:'CODE'}` (a string) from the
#      retired 410 body and from device-assignment's PARENT_TOKEN_REQUIRED,
#      beside a sibling using `{code:'DEVICE_FORBIDDEN'}`. `normalizeError` fell
#      past Shapes 1-3 to the bare-status handler and dropped the code, so a 403
#      read as a generic FORBIDDEN.
#
# Phases and materialization follow repros/t52.sh: `main` first (which carries
# both artifacts after this merge), then the immutable snapshots in
# repros/t52b/. Never references the task branch, so Ship-checklist branch
# deletion cannot break it. The marker check matters — see t52.sh.
set -euo pipefail

REPO="$TBOT_REPRO_REPO_ROOT"
SNAP="$(cd "$(dirname "$0")" && pwd)/t52b"
export TBOT_BACKEND_DIR="${TBOT_BACKEND_DIR:-$TBOT_REPRO_REPO_ROOT}"
[ -f "$TBOT_BACKEND_DIR/openapi.json" ] || {
  echo "FATAL: no backend contract at $TBOT_BACKEND_DIR/openapi.json" >&2; exit 2; }

TEST_REL="tests/api/contract-sync.test.ts"
GATE_REL="scripts/check-api-contract-sync.mjs"

WORKDIR="$(pwd)"
[ -e "$WORKDIR/node_modules" ] || ln -s "${TBOT_REPRO_DEPENDENCY_ROOT:-$REPO}/node_modules" "$WORKDIR/node_modules"

materialize() { # $1=repo-relative path  $2=marker a usable copy must contain
  local rel="$1" marker="$2" name
  name="$(basename "$rel")"
  mkdir -p "$WORKDIR/$(dirname "$rel")"
  if git -C "$REPO" show "main:$rel" > "$WORKDIR/$rel" 2>/dev/null \
     && [ -s "$WORKDIR/$rel" ] && grep -q "$marker" "$WORKDIR/$rel"; then
    return 0
  fi
  rm -f "$WORKDIR/$rel"
  if [ -s "$SNAP/$name" ] && grep -q "$marker" "$SNAP/$name"; then
    cp "$SNAP/$name" "$WORKDIR/$rel"
    return 0
  fi
  echo "FATAL: cannot materialize a usable $rel from main or $SNAP" >&2
  exit 2
}

# Markers are second-pass-specific: the first-pass gate and suite lack them, so
# the pre-fix `main` copy is rejected and the snapshot wins.
materialize "$GATE_REL" 'conditional-module-mirror'
materialize "$TEST_REL" 'the billing surface is not called at all'

echo "── phase A: api:contract-sync:check (retired + ambiguity checks) ──"
node "$WORKDIR/$GATE_REL"

echo "── phase B: contract-sync regressions ──"
cd "$WORKDIR"
exec npx jest --ci --silent "$TEST_REL"
