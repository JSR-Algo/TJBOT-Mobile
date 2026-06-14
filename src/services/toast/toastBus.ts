/**
 * Imperative toast bus.
 *
 * Bridges non-React modules (the HTTP client / error layer) to the React
 * <ToastProvider />. The provider registers its `show` function here on mount;
 * any module can then raise a transient toast without holding a React context.
 *
 * This is the transport/transient half of the app's 2-mode error pattern (see
 * components/Toast.tsx): field validation stays inline via <ErrorMessage />,
 * while network/5xx/session-expiry/offline errors surface here as toasts so no
 * request can ever fail silently.
 */
import type { ToastOptions } from '../../components/Toast';

type ToastHandler = (opts: ToastOptions) => void;

let handler: ToastHandler | null = null;

// Lightweight dedup: when several requests fail at once (e.g. a screen fires 3
// calls and the backend is unreachable) we don't want three identical toasts.
let lastKey = '';
let lastAt = 0;
const DEDUP_WINDOW_MS = 4000;

/**
 * Called by <ToastProvider /> to (de)register the live `show` function.
 * Pass `null` on unmount.
 */
export function registerToastHandler(fn: ToastHandler | null): void {
  handler = fn;
}

/**
 * Raise a toast from anywhere. No-ops safely if the provider isn't mounted yet
 * (e.g. an error during the very first render) and suppresses duplicate
 * messages fired within a short window.
 */
export function emitToast(opts: ToastOptions): void {
  if (!handler) return;
  const key = `${opts.severity ?? 'error'}:${opts.text}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < DEDUP_WINDOW_MS) return;
  lastKey = key;
  lastAt = now;
  handler(opts);
}
