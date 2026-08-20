import {
  logParentProgressDiagnostic,
  setParentProgressDiagnosticsEnabledForTest,
} from '@/services/observability/parentProgressDiagnostics';

describe('parent progress diagnostics', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  const originalEnabled = process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS;
  const originalUntil = process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL;

  beforeEach(() => {
    info.mockClear();
    setParentProgressDiagnosticsEnabledForTest(null);
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS = originalEnabled;
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL = originalUntil;
  });

  afterAll(() => {
    setParentProgressDiagnosticsEnabledForTest(null);
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS = originalEnabled;
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL = originalUntil;
    info.mockRestore();
  });

  it('requires both opt-in and a future expiry before emitting release diagnostics', () => {
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS = 'true';
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL = undefined;

    logParentProgressDiagnostic({ source: 'ws', decision: 'receive', childId: 'child-secret', revision: '8', stepId: 'secret step with spaces' });
    expect(info).not.toHaveBeenCalled();

    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL = String(Date.now() + 60_000);
    logParentProgressDiagnostic({ source: 'ws', decision: 'receive', childId: 'child-secret', revision: '8', stepId: 'secret step with spaces' });

    expect(info).toHaveBeenCalledWith('parent_progress_diag', expect.objectContaining({
      source: 'ws',
      decision: 'receive',
      childKey: expect.stringMatching(/^child_[a-z0-9]+$/),
      revision: '8',
      stepId: expect.stringMatching(/^step_[a-z0-9]+$/),
    }));
    expect(JSON.stringify(info.mock.calls)).not.toContain('child-secret');
    expect(JSON.stringify(info.mock.calls)).not.toContain('secret step with spaces');
  });
});
