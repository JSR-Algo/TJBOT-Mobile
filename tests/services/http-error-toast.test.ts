/**
 * Silent-failure feedback contract.
 *
 * Verifies the Phase-1 fix: transport-level + server-fault errors raise a global
 * toast (so no request fails silently), while 4xx validation/credential errors
 * stay inline (handled by each screen's <ErrorMessage />). Also covers the
 * imperative toast bus the HTTP layer uses to reach the React <ToastProvider />.
 */
import { registerToastHandler, emitToast } from '../../src/services/toast/toastBus';
import { maybeToastTransportError } from '../../src/services/http/client';
import type { ToastOptions } from '../../src/components/Toast';

describe('silent-failure feedback', () => {
  let calls: ToastOptions[];

  beforeEach(() => {
    calls = [];
    registerToastHandler((opts) => calls.push(opts));
  });

  afterEach(() => {
    registerToastHandler(null);
  });

  describe('toast bus', () => {
    it('forwards emitted toasts to the registered handler', () => {
      emitToast({ severity: 'info', text: 'bus-forward-unique' });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ severity: 'info', text: 'bus-forward-unique' });
    });

    it('dedups an identical message fired twice in quick succession', () => {
      emitToast({ severity: 'error', text: 'bus-dedup-unique' });
      emitToast({ severity: 'error', text: 'bus-dedup-unique' });
      expect(calls).toHaveLength(1);
    });

    it('no-ops safely when no handler is registered', () => {
      registerToastHandler(null);
      expect(() => emitToast({ text: 'bus-nohandler-unique' })).not.toThrow();
    });
  });

  describe('maybeToastTransportError', () => {
    it('toasts a network/transport failure', () => {
      maybeToastTransportError({
        code: 'NETWORK_ERROR',
        message: 'Check your internet connection and try again.',
      });
      expect(calls).toHaveLength(1);
      expect(calls[0].severity).toBe('error');
      expect(calls[0].text).toContain('internet connection');
    });

    it('toasts a 5xx server fault and appends a short Error ID', () => {
      maybeToastTransportError({
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our end. Please try again.',
        status: 500,
        traceId: 'abcdef1234567890',
      });
      expect(calls).toHaveLength(1);
      expect(calls[0].text).toContain('Error ID: abcdef12');
    });

    it('does NOT toast 4xx validation/credential errors (those stay inline)', () => {
      maybeToastTransportError({
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
        status: 401,
      });
      maybeToastTransportError({
        code: 'VALIDATION_ERROR',
        message: 'Please check the information you entered.',
        status: 400,
      });
      expect(calls).toHaveLength(0);
    });
  });
});
