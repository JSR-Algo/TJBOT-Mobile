# TEMPORARY: Direct-to-Telegram diagnostics — REMOVAL CHECKLIST

> **This is a debugging aid. It MUST be removed before any production / App Store
> build.** It sends raw warn+error diagnostics straight from the device to a
> Telegram chat, bypassing the backend, so we can capture the exact cause of the
> iPad login "Check your internet connection" failure (and any other transport
> failure the normal backend relay can't report — the catch-22 where the error
> report dies on the same broken transport it's describing).

## Why it exists

`src/services/observability/diagnosticRelay.ts` POSTs reports to
`${API_BASE_URL}/dev/diagnostic-report`, which forwards to Telegram **server-side**.
That path cannot report "backend unreachable" — the report fails the same way.
This temporary layer talks **directly** to `api.telegram.org` from the device.

## What it captures (fine-grained)

- Every diagnostic entry of severity `warn` **or** `error` (network transport
  failures are logged as `warn`, so error-only would miss them).
- A dedicated `api.transport_failure` **error** entry enriched with the raw axios
  `code` (`ECONNABORTED` = timeout vs `ERR_NETWORK` = could-not-connect),
  raw message, `cause`, method, url, `baseURL`, and configured `timeoutMs` —
  the signals that distinguish a 30s timeout from an instant DNS/TLS/refused
  failure.
- Secrets are redacted upstream by `diagnosticLog` (API keys, Bearer tokens,
  emails, password/secret/token values) before anything is sent.

## How to enable (debug builds only)

In the gitignored `.env`:

```
EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM=1
EXPO_PUBLIC_DIAG_TELEGRAM_BOT_TOKEN=<bot token from @BotFather>
EXPO_PUBLIC_DIAG_TELEGRAM_CHAT_ID=<your chat / group / channel id>
```

No-op unless the flag is `1` **and** both token and chat id are non-empty.
Then rebuild (env values are embedded in the JS bundle at build time).

## Files added / changed by this layer

| File | Change | Removal action |
|---|---|---|
| `src/services/observability/directTelegramRelay.ts` | **NEW** — the direct relay | Delete the file |
| `src/services/observability/installDiagnosticErrorRelay.ts` | import + `installDirectTelegramRelay()` / `uninstallDirectTelegramRelay()` calls (marked `TEMPORARY`) | Remove the import and the two marked calls |
| `src/services/http/createAuthenticatedAxios.ts` | added `diagnosticLog` import + the `if (status === undefined) { … transport_failure … }` block (marked `TEMPORARY DIAGNOSTICS`) | Remove the marked block; drop `diagnosticLog` from the import if now unused |
| `.env` | 3 `EXPO_PUBLIC_DIAG_*` vars (gitignored) | Delete the 3 vars |
| `.env.example` | documented 3 `EXPO_PUBLIC_DIAG_*` vars (flag defaults to `0`) | Delete the documented block |

## Removal checklist

- [ ] Delete `src/services/observability/directTelegramRelay.ts`
- [ ] In `installDiagnosticErrorRelay.ts`: remove the `directTelegramRelay` import
      and the `installDirectTelegramRelay()` / `uninstallDirectTelegramRelay()` calls
- [ ] In `createAuthenticatedAxios.ts`: remove the `TEMPORARY DIAGNOSTICS`
      `if (status === undefined)` block; if `diagnosticLog` is no longer used,
      revert the import back to `import { logApiFailure } from '../observability/diagnosticLog';`
- [ ] Remove the 3 `EXPO_PUBLIC_DIAG_*` lines from `.env` and `.env.example`
- [ ] Delete this file
- [ ] `npx tsc --noEmit` and `npm run lint` clean
- [ ] `grep -rn "DIAG_DIRECT_TO_TELEGRAM\|directTelegramRelay\|transport_failure" src .env*`
      returns nothing
