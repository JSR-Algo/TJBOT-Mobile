#!/usr/bin/env bash
# repo: tbot-mobile
# T3.4 repro — production recovery must survive persistence/auth return, reject
# terminated authority, and preserve reconnect targets across multiple hops.
set -euo pipefail

CANON="$TBOT_REPRO_REPO_ROOT"
PROBE="tests/features/fallback/t34-gate-probe.test.ts"
CREATED_NODE_MODULES_LINK=0

if [ ! -e node_modules ]; then
  ln -s "${TBOT_REPRO_DEPENDENCY_ROOT:-$CANON}/node_modules" node_modules
  CREATED_NODE_MODULES_LINK=1
fi

cleanup() {
  rm -f "$PROBE"
  if [ "$CREATED_NODE_MODULES_LINK" -eq 1 ] && [ -L node_modules ]; then
    rm -f node_modules
  fi
}
trap cleanup EXIT

mkdir -p "$(dirname "$PROBE")"
cat >"$PROBE" <<'PROBE_EOF'
jest.mock('@/services/storage/secureStore', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { ROUTES } from '@/navigation/routes';
import {
  readRecoveryCheckpoint,
  writeRecoveryCheckpoint,
} from '@/features/fallback/recoveryCheckpointStore';
import { getItem, setItem } from '@/services/storage/secureStore';

const checkpoint = {
  version: 1 as const,
  lessonTitle: 'Greetings',
  progressLabel: '2 of 5',
  resumeTarget: ROUTES.RunningScreen,
  reason: 'network' as const,
  phase: 'listening' as const,
  sessionState: 'active' as const,
  authState: 'authenticated' as const,
  deviceId: 'device-1',
  assignmentId: 'assignment-1',
  sessionId: 'session-1',
  childId: 'child-1',
};

it('persists a production checkpoint that can be restored after process death', async () => {
  (getItem as jest.Mock).mockResolvedValue(JSON.stringify(checkpoint));

  await writeRecoveryCheckpoint(checkpoint);
  expect(setItem).toHaveBeenCalledWith('tbot.lesson-recovery.v1', JSON.stringify(checkpoint));
  await expect(readRecoveryCheckpoint()).resolves.toEqual(checkpoint);
});
PROBE_EOF

npx jest --selectProjects unit --runInBand \
  "$PROBE" \
  tests/features/fallback/recovery-checkpoint-store.test.ts \
  tests/features/fallback/mobile-recovery-matrix.test.tsx \
  tests/navigation/root-navigator.test.tsx
