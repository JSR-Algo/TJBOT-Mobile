#!/usr/bin/env bash
# repo: tbot-mobile
# T0.3 repro — the checked-in generated src/__env__.ts must not carry production
# service URLs. RED on base (onrender.com baked in), GREEN on the fix branch.
# Runs inside a detached gate worktree, so borrow the canonical repo's node_modules.
set -euo pipefail

CANON="$TBOT_REPRO_REPO_ROOT"
[ -e node_modules ] || ln -s "${TBOT_REPRO_DEPENDENCY_ROOT:-$CANON}/node_modules" node_modules

npx jest tests/config/env.test.ts
