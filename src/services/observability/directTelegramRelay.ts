/**
 * TEMPORARY DIAGNOSTICS LAYER — REMOVE BEFORE PRODUCTION RELEASE.
 * Tracking + removal checklist: docs/TEMP-DIAGNOSTICS-REMOVAL.md
 *
 * Why this exists
 * ---------------
 * The normal diagnostic relay (diagnosticRelay.ts) POSTs to the app backend at
 * `${API_BASE_URL}/dev/diagnostic-report`, which then forwards to Telegram. That
 * path CANNOT report "the backend is unreachable" failures — the report dies on
 * the same broken transport it is trying to describe (catch-22). This relay talks
 * DIRECTLY to api.telegram.org from the device, so backend-unreachable / timeout /
 * TLS / DNS failures still surface the exact cause to the user's Telegram tunnel.
 *
 * Scope / safety
 * --------------
 *  - Forwards severity `warn` + `error` (network transport failures are logged as
 *    `warn`, NOT `error` — see diagnosticLog.logApiFailure — so error-only would
 *    miss the very failures we are chasing).
 *  - Gated by EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM === '1'. When the flag is unset
 *    (production) OR the bot token / chat id are blank, install is a no-op.
 *  - Loop-safe: posts via raw fetch (never the app axios client, so the axios
 *    interceptor cannot re-log it) and swallows its OWN failures without calling
 *    diagnosticLog (so a failed send can never generate a new entry to forward).
 *  - Idempotent: each diagnostic entry id is sent at most once.
 *  - Redaction is already applied upstream by diagnosticLog (API keys, Bearer
 *    tokens, emails, password/secret/token values), so payloads are pre-sanitised.
 */
import {
  getDiagnosticEntries,
  getDiagnosticSessionHeader,
  subscribeDiagnosticLog,
  type DiagnosticEntry,
  type DiagnosticSeverity,
} from './diagnosticLog';

const ENABLED = process.env.EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM === '1';
const BOT_TOKEN = process.env.EXPO_PUBLIC_DIAG_TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.EXPO_PUBLIC_DIAG_TELEGRAM_CHAT_ID?.trim();

const FORWARD: ReadonlySet<DiagnosticSeverity> = new Set<DiagnosticSeverity>(['warn', 'error']);
const MAX_CHARS = 3800; // Telegram hard limit is 4096; leave margin for safety.

let installed = false;
let unsubscribe: (() => void) | null = null;
let flushing = false;
const sentIds = new Set<string>();

function formatEntry(entry: DiagnosticEntry): string {
  const header = getDiagnosticSessionHeader();
  const icon = entry.severity === 'error' ? '🔴' : '🟠';
  const hasDetail = entry.detail !== undefined && Object.keys(entry.detail).length > 0;
  const detailBlock = hasDetail ? `\ndetail:\n${JSON.stringify(entry.detail, null, 2)}` : '';
  const text =
    `${icon} ${entry.severity.toUpperCase()} · ${entry.category}.${entry.event}\n` +
    `${entry.message}${detailBlock}\n` +
    `—\napi: ${header.apiBase ?? '?'}\n` +
    `app: ${header.appVersion ?? '?'} (build ${header.build ?? '?'})\n` +
    `at: ${entry.at}`;
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n…[truncated]` : text;
}

// Raw fetch DIRECT to Telegram — deliberately bypasses the app axios client so the
// response interceptor cannot observe (and re-log) this request. Throws on a
// network failure OR a non-2xx Telegram response; every caller wraps this in a
// try/catch and swallows (a dropped diagnostic is acceptable, but re-logging the
// failure would feed the relay its own error forever).
async function postToTelegram(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    throw new Error(`Telegram sendMessage HTTP ${res.status}`);
  }
}

async function flush(): Promise<void> {
  if (flushing) {
    return;
  }
  flushing = true;
  try {
    for (const entry of getDiagnosticEntries()) {
      if (sentIds.has(entry.id)) {
        continue;
      }
      sentIds.add(entry.id);
      if (!FORWARD.has(entry.severity)) {
        continue;
      }
      try {
        await postToTelegram(formatEntry(entry));
      } catch {
        // [BYPASS] Swallow our own transport failure. Re-logging here would feed
        // the relay its own error forever. Visible failure semantics: a dropped
        // diagnostic is acceptable; an infinite loop is not.
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * Subscribe the direct relay. No-op unless explicitly enabled with a token + chat.
 * Returns an uninstall function.
 */
export function installDirectTelegramRelay(): () => void {
  if (!ENABLED || !BOT_TOKEN || !CHAT_ID || installed) {
    return () => {};
  }
  installed = true;
  // Mark entries that already exist at install time as seen, so we only forward
  // NEW problems that happen from now on (not the historical buffer).
  for (const entry of getDiagnosticEntries()) {
    sentIds.add(entry.id);
  }
  unsubscribe = subscribeDiagnosticLog(() => {
    void flush();
  });
  return uninstallDirectTelegramRelay;
}

export function uninstallDirectTelegramRelay(): void {
  unsubscribe?.();
  unsubscribe = null;
  installed = false;
  sentIds.clear();
}

/**
 * Post arbitrary diagnostic text DIRECTLY to Telegram, split into chunks that fit
 * under Telegram's per-message limit. This is the fallback used by the manual
 * "Send diagnostic" path (diagnosticRelay.sendDiagnosticReport) when the backend
 * relay endpoint is unreachable — without it the button always failed on the
 * backend 404 and no report ever reached us.
 *
 * Gating mirrors installDirectTelegramRelay: a no-op (returns false) unless
 * EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM=1 with a bot token + chat id, so production
 * is unaffected. Returns true if at least one chunk was delivered. Never throws —
 * swallows per-chunk failures so it can never feed the diagnostic log its own
 * transport error.
 */
export async function sendTextToTelegram(text: string): Promise<boolean> {
  if (!ENABLED || !BOT_TOKEN || !CHAT_ID) {
    return false;
  }
  let delivered = false;
  for (const chunk of chunkForTelegram(text)) {
    try {
      await postToTelegram(chunk);
      delivered = true;
    } catch {
      // Swallow — a later chunk may still land, and re-logging would loop.
    }
  }
  return delivered;
}

/**
 * Split text into Telegram-sized chunks, preferring line boundaries. A single
 * line longer than the limit is hard-split so nothing is silently dropped.
 */
function chunkForTelegram(text: string): string[] {
  if (text.length <= MAX_CHARS) {
    return [text];
  }
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (line.length > MAX_CHARS) {
      if (current) {
        chunks.push(current.trimEnd());
        current = '';
      }
      for (let i = 0; i < line.length; i += MAX_CHARS) {
        chunks.push(line.slice(i, i + MAX_CHARS));
      }
      continue;
    }
    if ((current + line + '\n').length > MAX_CHARS) {
      if (current) {
        chunks.push(current.trimEnd());
      }
      current = `${line}\n`;
    } else {
      current += `${line}\n`;
    }
  }
  if (current.trim()) {
    chunks.push(current.trimEnd());
  }
  return chunks;
}
