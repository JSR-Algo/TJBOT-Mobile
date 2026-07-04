/**
 * Boot-time wiring for diagnostic capture: API failures, voice FSM errors,
 * global JS faults. Idempotent — safe to call on every App mount.
 */
import { useVoiceAssistantStore } from '@/state/voiceAssistantStore';
import {
  diagnosticLog,
  getDiagnosticSessionHeader,
  logVoiceEvent,
} from './diagnosticLog';

let installed = false;
let voiceUnsub: (() => void) | null = null;
let prevVoiceError: string | null = null;
let prevVoiceState: string | null = null;

function installGlobalErrorHandler(): void {
  if (typeof ErrorUtils === 'undefined') return;
  const prior = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const message = error instanceof Error ? error.message : String(error);
    diagnosticLog({
      severity: 'error',
      category: 'runtime',
      event: isFatal ? 'fatal_js' : 'js_error',
      message,
      detail: {
        isFatal: Boolean(isFatal),
        name: error instanceof Error ? error.name : 'unknown',
      },
    });
    prior?.(error, isFatal);
  });
}

function installVoiceStoreWatcher(): void {
  voiceUnsub?.();
  prevVoiceError = useVoiceAssistantStore.getState().error;
  prevVoiceState = useVoiceAssistantStore.getState().state;

  voiceUnsub = useVoiceAssistantStore.subscribe((state) => {
    if (state.error !== prevVoiceError) {
      if (state.error) {
        logVoiceEvent('voice_error_set', state.error, {
          state: state.state,
        }, 'error');
      }
      prevVoiceError = state.error;
    }

    if (state.state !== prevVoiceState) {
      if (
        state.state === 'ERROR_RECOVERABLE' ||
        state.state === 'ERROR_FATAL' ||
        state.state === 'RECONNECTING'
      ) {
        logVoiceEvent('voice_state', `FSM → ${state.state}`, {
          error: state.error,
        }, state.state.startsWith('ERROR') ? 'error' : 'warn');
      }
      prevVoiceState = state.state;
    }
  });
}

export function installDiagnosticHooks(): () => void {
  if (installed) {
    return () => uninstallDiagnosticHooks();
  }
  installed = true;

  const header = getDiagnosticSessionHeader();
  diagnosticLog({
    severity: 'info',
    category: 'app',
    event: 'boot',
    message: 'Diagnostic log started',
    detail: header,
  });

  installGlobalErrorHandler();
  installVoiceStoreWatcher();

  return uninstallDiagnosticHooks;
}

export function uninstallDiagnosticHooks(): void {
  voiceUnsub?.();
  voiceUnsub = null;
  installed = false;
}

/** Test helper */
export function __resetDiagnosticHooksForTests(): void {
  uninstallDiagnosticHooks();
  prevVoiceError = null;
  prevVoiceState = null;
}
