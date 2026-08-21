#!/usr/bin/env bash
# repo: tbot-mobile
set -euo pipefail

rg -q 'activateAssignmentChild' src/features/course-library/screens/SendToRobotScreen.tsx
if [ ! -e node_modules ]; then
  ln -s ${TBOT_REPRO_DEPENDENCY_ROOT:-$TBOT_REPRO_REPO_ROOT}/node_modules node_modules
fi
  npm test -- --runInBand tests/e2e/course-library-flow.test.tsx
