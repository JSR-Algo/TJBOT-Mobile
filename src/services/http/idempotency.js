// Idempotency utility — addresses BACKEND RISK B2 from user-flow-review.md.
// Generate a stable client request ID on entry to commit-funnel screens
// (purchase checkout, course unlock, course-send-to-robot, etc.) so the
// server can dedup if the user double-taps or re-enters the screen.

let _seq = 0;

function fallbackId() {
  _seq += 1;
  return `req-${Date.now().toString(36)}-${_seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch { /* fallthrough */ }
  }
  return fallbackId();
}

// React hook — generate once per mount, stable across re-renders.
// Use in commit-funnel components: `const reqId = useRequestId();`
import { useRef } from 'react';
export function useRequestId() {
  const ref = useRef(null);
  if (ref.current == null) ref.current = newRequestId();
  return ref.current;
}

// For multi-step funnels (e.g. checkout: cart → payment → confirm), pass the
// same parent ID across steps so the whole transaction is one logical unit
// server-side. Caller stores the ID in their store/state.
export function attachIdempotencyHeader(headers = {}, requestId) {
  return { ...headers, 'Idempotency-Key': requestId };
}
