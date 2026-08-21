#!/usr/bin/env bash
# repo: $TBOT_REPRO_REPO_ROOT
#
# T5.2 — backend <-> mobile API contract sync.
#
# Ten mobile call sites addressed routes that no Nest controller and no bridged
# modular route has ever served, so each could only 404. Five had an exact
# contract equivalent under a different name; five had no contract at all and
# now fail closed on the BACKEND_CONTRACT_UNAVAILABLE sentinel with a per-route
# justification. `npm run api:contract-sync:check` was a `process.exit(0)` stub
# that reported "no drift detected" without reading a file, so nothing caught it.
#
#   1. GET  /v1/orders/{id}                      -> GET   /v1/billing/orders/{id}
#   2. POST /v1/orders/{id}/cancel               -> POST  /v1/billing/orders/{id}/cancel
#   3. POST /v1/orders/{id}/return               -> POST  /v1/billing/orders/{id}/return-request
#   4. POST /v1/billing/subscription/reactivate  -> POST  /v1/billing/reactivate
#   5. POST /v1/children/{id}/archive            -> PATCH /v1/identity/children/{id} {status:'archived'}
#      (declared in the modular contract but never matched by isBridgeRoute())
#   6. mapOrder read `id`/`status`; the orders module answers `orderId`/`state`,
#      so Order.id and Order.status were undefined behind a `string` type and
#      OrderConfirmScreen's `status === 'paid'` gate could never fire.
#   7. purchase.api.ts and parent.api.ts each declared their own copy of
#      BackendContractUnavailableError, so `instanceof` was false across modules
#      despite an identical `code`.
#
# Two phases, so a green run proves both halves:
#   A. the contract gate itself;
#   B. the jest regressions.
#
# NOTE (post-t52b): the snapshots in repros/t52/ were refreshed to match `main`
# after the T5.2 second pass. They previously held first-pass artifacts, and a
# stale fallback here is dangerous in one specific way — the first-pass gate did
# not know that a handler unconditionally throwing 410 is not a usable route, so
# had the `main` lookup ever failed, this repro would have fallen back to a gate
# that passes where it should fail. Both snapshots now track `main`, which makes
# this repro's phase A equivalent to t52b's: deliberate redundancy, not an
# oversight. The first pass's RED->GREEN evidence is GATE_LOG.md plus
# repros/t52.{red,green}.log, never these snapshots.
#
# Both artifacts are materialized from a ref that outlives this task branch, per
# the repro-vs-branch-deletion rule in LESSON_PRODUCTION_PLAN.md §5: `main`
# first (which carries both after the t52 merge), then the immutable snapshots
# in repros/t52/. This never references `lesson-prod/t52-api-sync`, so branch
# deletion cannot break it, and both gate phases execute byte-identical logic
# against different source — the repro tests the bugs, not the patch.
set -euo pipefail

REPO="$TBOT_REPRO_REPO_ROOT"
SNAP="$(cd "$(dirname "$0")" && pwd)/t52"
# gate.sh builds its throwaway worktree under $TMPDIR, outside the TBOT tree, so
# the gate's sibling-directory walk cannot find the backend from there. Pin it.
export TBOT_BACKEND_DIR="${TBOT_BACKEND_DIR:-$TBOT_REPRO_REPO_ROOT}"
[ -f "$TBOT_BACKEND_DIR/openapi.json" ] || {
  echo "FATAL: no backend contract at $TBOT_BACKEND_DIR/openapi.json" >&2; exit 2; }
TEST_REL="tests/api/contract-sync.test.ts"
GATE_REL="scripts/check-api-contract-sync.mjs"

# gate.sh runs this with pwd = a throwaway worktree; the integration re-gate runs
# it with pwd = the repo checkout. Neither worktree has node_modules of its own.
WORKDIR="$(pwd)"
[ -e "$WORKDIR/node_modules" ] || ln -s "${TBOT_REPRO_DEPENDENCY_ROOT:-$REPO}/node_modules" "$WORKDIR/node_modules"

# $1=repo-relative path  $2=marker that must appear in a usable copy.
# The marker matters: before the t52 merge, `main:scripts/check-api-contract-sync.mjs`
# is the `process.exit(0)` placeholder — non-empty, so a bare emptiness check
# would accept it and phase A would pass vacuously on both sides of the gate.
materialize() {
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

materialize "$GATE_REL" 'x-tbot-modular-route-contract'
materialize "$TEST_REL" 'sample-decode'

echo "── phase A: api:contract-sync:check ──"
# The gate resolves the mobile root from its own location, so it runs in place.
node "$WORKDIR/$GATE_REL"

echo "── phase B: contract-sync regressions ──"
cd "$WORKDIR"
exec npx jest --ci --silent "$TEST_REL"
