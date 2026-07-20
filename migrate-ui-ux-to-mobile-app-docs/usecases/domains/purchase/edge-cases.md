# Edge Cases — `purchase`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-BU01

- **n/a**: Rotjtjbot overview is static content — no async call, no user input, no state mutation (view-only, no-async).

## UC-BU02

- **n/a**: How it works is static illustrated content — no async call, no user input, no state mutation (view-only, no-async).

## UC-BU03

- **n/a**: What's included is static list content — no async call, no user input, no state mutation (view-only, no-async).

## UC-BU04

- **validation**: Parent must select a bundle before "Next" is enabled; attempting to proceed without selection must show an inline prompt.
- **cancel**: Parent can navigate back to UC-BU03 without losing previous discovery funnel progress.

## UC-BU05

- **validation**: Parent must select a subscription plan before "Next" is enabled; no plan selected must show an inline prompt.
- **cancel**: Parent can navigate back to UC-BU04; previously selected bundle must be preserved in store.

## UC-BU06

- **validation**: "I agree" checkbox must be checked before "Proceed to checkout" is enabled; unchecked state must keep the CTA disabled with an accessible label.
- **cancel**: Parent can navigate back to UC-BU05 without losing bundle/subscription selections.

## UC-BU07

- **error**: `createOrder` failure must show a non-blaming error message with a retry CTA; `paymentStatus` must remain `'idle'` until order creation succeeds.
- **timeout**: `createOrder` request exceeding SLO must surface a retry affordance; idempotency key must be re-used on retry to prevent duplicate orders.
- **retry**: Retry of `createOrder` must use the same idempotency key (from `http/idempotency.js`) to ensure exactly-once order creation.
- **validation**: Order total must be confirmed on-screen before payment options are shown; mismatch between expected and server-returned total must block payment.

## UC-BU08

- **cancel**: Parent dismissing the Apple Pay sheet must return to `CheckoutPage` with `paymentStatus` still `'pending'`; order must remain valid for retry.
- **error**: Apple Pay provider failure or device not enrolled must surface a fallback prompt offering card payment (UC-BU09).
- **unauthorized**: Apple Pay authorisation denial (biometric fail) must allow retry within the same sheet before falling back to card.

## UC-BU09

- **validation**: Card number, expiry, and CVV must all pass client-side format checks before "Pay" is enabled; field-level errors must be shown on blur.
- **error**: Card declined must show a non-technical decline message with options to re-enter card details or try Apple Pay.
- **timeout**: `processPayment` request exceeding SLO must surface a retry CTA; payment must not be double-charged on retry (idempotency enforced server-side).
- **retry**: Parent must be able to re-enter card details and retry payment without creating a new order.

## UC-BU10

- **error**: `getOrder` failure must show a "We couldn't load your order details" message with a retry CTA; payment is already confirmed so the failure is informational, not blocking.
- **timeout**: Request exceeding SLO must surface a retry affordance; "Track my order" CTA must remain enabled regardless.
- **n/a**: No user-input validation required on this confirmation screen (view-only post-payment state).

## UC-BU11

- **error**: `getShippingStatus` failure must show a "Tracking unavailable" state; the order confirmation details must still be accessible.
- **timeout**: Request exceeding SLO must surface a retry CTA without navigating away.
- **retry**: Parent must be able to manually refresh shipping status; polling interval must not cause duplicate requests.

## UC-BU12

- **n/a**: Arrival confirmation is a single-step, no-async screen — parent taps "Start setup" with no server call on this screen (single-step, no-async).

## UC-BU13

- **validation**: Activation code must match expected format (alphanumeric, 6–8 chars) before submit is enabled; malformed input must show inline error.
- **error**: Invalid or already-used activation code must show a specific error (not a generic one) so parent knows to check the printed code.
- **timeout**: `activateRotjtjbot` request exceeding SLO must surface a retry CTA; rotjtjbot must not be activated twice on retry (server-side idempotency required).
- **retry**: Parent must be able to retry activation code entry without restarting the purchase flow.

## UC-BU14

- **error**: Course-add failure (delegated to course-library) must surface an error with a retry CTA; rotjtjbot remains activated even if first-course add fails.
- **cancel**: Parent can skip first-course add and navigate to home or course-library independently; skip must not break the activated-rotjtjbot state.
- **validation**: Parent must select a course before "Add to rotjtjbot" is enabled; no selection must show an inline prompt.

## UC-BU15

- **unauthorized**: Stale parent JWT must force re-PIN per ADR-0005 D6 before cancel POST is sent.
- **error**: `already_shipped` 409 must redirect parent to UC-BU16 return flow with explainer; never silently swallow.
- **timeout**: Stripe void > 5s must continue async; client polls order status rather than blocking the UI.
- **retry**: 5xx must exp-backoff; user-tap retry must be allowed once after grace window.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`, `docs/flows/edge-cases/retry.flow.mmd`

## UC-BU16

- **unauthorized**: Stale parent JWT must force re-PIN.
- **validation**: Outside 30-day window 410 must show clear "Return window closed (returned by YYYY-MM-DD)"; suggest support contact.
- **error**: Admin queue back-pressure must surface "We received your request — reply within 48h"; client must not depend on instant decision.
- **cancel**: Parent can withdraw pending refund request via separate flow (P5 follow-up); current scope is one-shot submit.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/cancel.flow.mmd`

## UC-BU17

- **unauthorized**: Re-auth required if parent JWT stale.
- **validation**: Stripe SetupIntent card-declined must surface card-specific error (`card_declined`, `insufficient_funds`, `incorrect_cvc`) from Stripe; never generic "payment failed".
- **error**: Grace expired 410 must navigate to UC-SUB04 not-eligible path; cannot retry once subscription terminated.
- **retry**: Card declined must allow retry with different card; never auto-retry the same card.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/retry.flow.mmd`

## UC-SUB01

- **error**: Stripe read-through cache miss + Stripe-unreachable must show stale local snapshot with "Last updated YYYY-MM-DD HH:MM" disclaimer rather than blank.
- **timeout**: GET > 3s must show stale snapshot + spinner; never block the entire settings screen.
- **n/a**: View-only, no mutable state — cancel does not apply (view-only).

> Ref: `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`

## UC-SUB02

- **unauthorized**: Stale parent JWT must force re-PIN.
- **cancel**: Confirm sheet allows back-out; no Stripe call sent on cancel.
- **error**: `already_cancelled` 409 idempotent must show "Already scheduled to cancel on YYYY-MM-DD" toast and refresh sub state.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`

## UC-SUB03

- **unauthorized**: Stale parent JWT must force re-PIN.
- **validation**: `resume_on` > 90d must surface client-side input error before submission; never let server 422 surface as generic error.
- **error**: `pause_already_used_this_cycle` 409 must show "Already paused once this cycle; you can resume or cancel" with two CTAs.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`

## UC-SUB04

- **error**: Network failure on resume must allow retry; partial state (PAUSED but server resumed) must reconcile via syncFromServer on retry.
- **n/a**: Resume is single-step, no user-input validation — request-and-await pattern only.

> Ref: `docs/flows/edge-cases/error.flow.mmd`

## UC-SUB05

- **unauthorized**: Stale parent JWT must force re-PIN before payment-method-update.
- **error**: Stripe SetupIntent confirm failure must allow alternate card entry; never lock into one declined method.
- **timeout**: Stripe-side processing > 10s must show "Still processing — we'll email you" then sync result async via webhook.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`

## UC-INV01

- **error**: Stripe API unreachable must show local DB rows only with "Some older invoices unavailable" disclaimer; never blank the list.
- **timeout**: PDF generation > 5s must offer email-me-the-link fallback instead of in-app preview.
- **n/a**: Read-only paginated list — no mutation, no validation needed (view-only paginated read).

> Ref: `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`
