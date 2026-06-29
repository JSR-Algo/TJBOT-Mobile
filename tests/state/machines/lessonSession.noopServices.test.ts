/**
 * Coverage for the exported `noopLessonSessionServices` stubs.
 *
 * These no-op service implementations are the default network layer used by
 * tests that don't care about real I/O. They are wired into the machine via
 * spread (`{ ...noopLessonSessionServices, ...overrides }`) but the
 * `endSession` / `reconnectSession` stubs are never *invoked* through any
 * driven transition in the other suites, so their bodies stayed uncovered.
 *
 * Invoking them directly here pins the contract: each resolves without
 * throwing and `startSession` yields the canonical test ids.
 */

import { noopLessonSessionServices } from '../../../src/state/machines/lessonSession.machine';

describe('noopLessonSessionServices', () => {
  it('startSession resolves canonical test session ids', async () => {
    await expect(
      noopLessonSessionServices.startSession({ idempotencyKey: 'k' }),
    ).resolves.toEqual({
      sessionId: 'test-session-id',
      deviceSessionId: 'test-device-session-id',
    });
  });

  it('endSession resolves without throwing', async () => {
    await expect(
      noopLessonSessionServices.endSession({
        sessionId: 's',
        reason: 'user_exit',
      }),
    ).resolves.toBeUndefined();
  });

  it('reconnectSession resolves without throwing', async () => {
    await expect(
      noopLessonSessionServices.reconnectSession({ deviceSessionId: 'd' }),
    ).resolves.toBeUndefined();
  });
});
