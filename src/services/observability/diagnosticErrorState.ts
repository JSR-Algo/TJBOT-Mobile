import type { DiagnosticEntry } from './diagnosticLog';

export type PendingDiagnosticError = {
  entry: DiagnosticEntry;
  relayStatus: 'idle' | 'sending' | 'sent' | 'failed';
  relayError?: string;
};

let pending: PendingDiagnosticError | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener fault */
    }
  });
}

export function getPendingDiagnosticError(): PendingDiagnosticError | null {
  return pending;
}

export function setPendingDiagnosticError(
  entry: DiagnosticEntry,
  relayStatus: PendingDiagnosticError['relayStatus'] = 'idle',
  relayError?: string,
): void {
  pending = { entry, relayStatus, relayError };
  notify();
}

export function updatePendingDiagnosticRelay(
  relayStatus: PendingDiagnosticError['relayStatus'],
  relayError?: string,
): void {
  if (!pending) return;
  pending = { ...pending, relayStatus, relayError };
  notify();
}

export function clearPendingDiagnosticError(): void {
  pending = null;
  notify();
}

export function subscribePendingDiagnosticError(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper */
export function __resetDiagnosticErrorStateForTests(): void {
  pending = null;
  listeners.clear();
}