#!/usr/bin/env bash
# repo: tbot-mobile
# T5.4 prerequisite - retain a persisted child that belongs to a non-first household.
set -euo pipefail

rg -q 'households\.slice\(1\)' src/contexts/HouseholdContext.tsx
if [ ! -e node_modules ]; then
  ln -s ${TBOT_REPRO_DEPENDENCY_ROOT:-$TBOT_REPRO_REPO_ROOT}/node_modules node_modules
fi

PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  npm test -- --runInBand tests/contexts/household-context-race.test.tsx
