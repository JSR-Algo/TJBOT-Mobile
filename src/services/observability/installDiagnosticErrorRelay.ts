import { isInvestorDemoEnabled } from '@/config/investorDemo';
import { subscribeDiagnosticErrors, type DiagnosticEntry } from './diagnosticLog';
import { sendDiagnosticReport } from './diagnosticRelay';
// TEMPORARY DIAGNOSTICS LAYER — remove before production (docs/TEMP-DIAGNOSTICS-REMOVAL.md).
import { installDirectTelegramRelay, uninstallDirectTelegramRelay } from './directTelegramRelay';
import {
  getPendingDiagnosticError,
  setPendingDiagnosticError,
  updatePendingDiagnosticRelay,
} from './diagnosticErrorState';

let installed = false;
let unsub: (() => void) | null = null;
let lastAutoSentAt = 0;
const AUTO_COOLDOWN_MS = 20_000;

async function relayError(entry: DiagnosticEntry, trigger: string): Promise<void> {
  setPendingDiagnosticError(entry, 'sending');
  const result = await sendDiagnosticReport({
    trigger,
    entry,
    includeScreenshot: true,
  });
  if (result.ok && result.sent !== false) {
    updatePendingDiagnosticRelay('sent');
    return;
  }
  updatePendingDiagnosticRelay('failed', result.error ?? result.skipped ?? 'relay_failed');
}

function onDiagnosticError(entry: DiagnosticEntry): void {
  if (
    isInvestorDemoEnabled()
    && (entry.event === 'robot_companion_error' || entry.event === 'voice_error_set')
  ) {
    return;
  }

  setPendingDiagnosticError(entry, 'idle');

  const now = Date.now();
  if (now - lastAutoSentAt < AUTO_COOLDOWN_MS) return;
  lastAutoSentAt = now;

  void relayError(entry, 'error_auto');
}

export function installDiagnosticErrorRelay(): () => void {
  if (process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY !== '1') {
    return () => undefined;
  }
  if (installed) return uninstallDiagnosticErrorRelay;
  installed = true;
  unsub = subscribeDiagnosticErrors(onDiagnosticError);
  // TEMPORARY: also mirror warn+error entries DIRECTLY to Telegram so that
  // backend-unreachable failures (which the backend relay above cannot report)
  // still surface the exact cause. No-op unless EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM=1
  // with a token + chat id. Remove before production — docs/TEMP-DIAGNOSTICS-REMOVAL.md.
  installDirectTelegramRelay();
  return uninstallDiagnosticErrorRelay;
}

export function uninstallDiagnosticErrorRelay(): void {
  unsub?.();
  unsub = null;
  installed = false;
  // TEMPORARY DIAGNOSTICS LAYER — remove before production.
  uninstallDirectTelegramRelay();
}

export async function sendPendingDiagnosticManually(): Promise<void> {
  const pending = getPendingDiagnosticError();
  if (!pending) return;
  await relayError(pending.entry, 'error_manual');
}

/** Test helper */
export function __resetDiagnosticErrorRelayForTests(): void {
  uninstallDiagnosticErrorRelay();
  lastAutoSentAt = 0;
}