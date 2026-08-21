#!/usr/bin/env bash
# repo: tbot-mobile
# regate: skip
set -euo pipefail

probe="tests/_t54_gate_device_fallback.test.ts"
cleanup() { rm -f "$probe"; }
trap cleanup EXIT

cat >"$probe" <<'TS'
describe('T5.4 assignment-only robot fallback', () => {
  it('keeps ordinary child-scoped primary lookup strict', async () => {
    jest.resetModules();
    const get = jest.fn().mockResolvedValue({
      data: [
        { id: 'robot-1', name: 'Robot One', assigned_child_profile_id: 'child-1' },
        { id: 'robot-2', name: 'Robot Two', assigned_child_profile_id: 'child-2' },
      ],
    });
    jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));
    const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

    await expect(getDeviceStatus('primary', 'child-3')).resolves.toMatchObject({ id: '' });
    await expect(getDeviceStatus('primary', 'child-3', { allowBoundChildFallback: true }))
      .resolves.toMatchObject({ id: 'robot-1', assignedChildProfileId: 'child-1' });
  });
});
TS

if [ ! -e node_modules ]; then
  ln -s ${TBOT_REPRO_DEPENDENCY_ROOT:-$TBOT_REPRO_REPO_ROOT}/node_modules node_modules
fi
node \
  node_modules/jest/bin/jest.js "$probe" --runInBand
