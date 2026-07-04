import axios from 'axios';
import { Config } from '@/config';
import {
  formatDiagnosticExport,
  getDiagnosticSessionHeader,
  type DiagnosticEntry,
} from './diagnosticLog';
import { captureDiagnosticScreenshot } from './diagnosticScreenshot';
// TEMPORARY DIAGNOSTICS FALLBACK — remove before production (docs/TEMP-DIAGNOSTICS-REMOVAL.md).
import { sendTextToTelegram } from './directTelegramRelay';

export type DiagnosticRelayResult = {
  ok: boolean;
  sent?: boolean;
  skipped?: string;
  error?: string;
};

export type DiagnosticRelayOptions = {
  trigger: string;
  entry?: DiagnosticEntry;
  includeScreenshot?: boolean;
  screenshotBase64?: string;
  screenshotMime?: string;
};

export async function sendDiagnosticReport(
  options: DiagnosticRelayOptions,
): Promise<DiagnosticRelayResult> {
  let screenshotBase64 = options.screenshotBase64;
  let screenshotMime = options.screenshotMime;

  if (options.includeScreenshot && !screenshotBase64) {
    const shot = await captureDiagnosticScreenshot();
    if (shot) {
      screenshotBase64 = shot.base64;
      screenshotMime = shot.mime;
    }
  }

  const url = `${Config.API_BASE_URL}/dev/diagnostic-report`;
  const token = (process.env.EXPO_PUBLIC_DIAGNOSTIC_REPORT_TOKEN as string | undefined)?.trim();
  const headers = token ? { 'x-diagnostic-token': token } : undefined;

  try {
    const res = await axios.post(
      url,
      {
        log: formatDiagnosticExport(),
        trigger: options.trigger,
        entry_id: options.entry?.id,
        screenshot_base64: screenshotBase64,
        screenshot_mime: screenshotMime,
        device: getDiagnosticSessionHeader(),
      },
      { headers, timeout: 25_000 },
    );
    return {
      ok: true,
      sent: Boolean(res.data?.sent),
      skipped: typeof res.data?.skipped === 'string' ? res.data.skipped : undefined,
    };
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message ?? err.message
        : err instanceof Error
          ? err.message
          : String(err);

    // TEMPORARY DIAGNOSTICS FALLBACK — remove before production.
    // The backend relay endpoint (/dev/diagnostic-report) is NOT deployed, so the
    // POST above fails 404 and the manual "Send diagnostic" button would never
    // deliver. When the backend is unreachable (no response / 404 / 5xx), relay the
    // full, already-redacted diagnostic export DIRECTLY to Telegram so the report
    // still reaches us. No-op in production: sendTextToTelegram is gated by
    // EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM, so this returns the original error there.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const axiosCode = axios.isAxiosError(err) ? err.code : undefined;
    const backendUnreachable =
      status === undefined // no HTTP response at all = transport failure (DNS/TLS/timeout)
      || status === 404
      || status === 502
      || status === 503
      || status === 504;

    if (backendUnreachable) {
      const header = getDiagnosticSessionHeader();
      const preamble =
        '📋 DIAGNOSTIC REPORT (direct fallback — backend relay unavailable)\n'
        + `trigger: ${options.trigger}\n`
        + `backend: ${status ?? axiosCode ?? 'unreachable'} · ${url}\n`
        + (options.entry
          ? `error: ${options.entry.category}.${options.entry.event} — ${options.entry.message}\n`
          : '')
        + (screenshotBase64 ? 'screenshot: captured (text-only fallback, not attached)\n' : '')
        + `app: ${header.appVersion ?? '?'} (build ${header.build ?? '?'})\n`
        + '—\n\n';
      const delivered = await sendTextToTelegram(preamble + formatDiagnosticExport());
      if (delivered) {
        return { ok: true, sent: true, skipped: 'backend_unavailable_relayed_via_direct_telegram' };
      }
    }

    return { ok: false, error: message };
  }
}