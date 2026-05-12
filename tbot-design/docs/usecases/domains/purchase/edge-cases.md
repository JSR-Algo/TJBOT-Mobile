# Edge Cases — `purchase`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-BU01

- **n/a**: Robot overview is static content — no async call, no user input, no state mutation (view-only, no-async).

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
- **timeout**: `activateRobot` request exceeding SLO must surface a retry CTA; robot must not be activated twice on retry (server-side idempotency required).
- **retry**: Parent must be able to retry activation code entry without restarting the purchase flow.

## UC-BU14

- **error**: Course-add failure (delegated to course-library) must surface an error with a retry CTA; robot remains activated even if first-course add fails.
- **cancel**: Parent can skip first-course add and navigate to home or course-library independently; skip must not break the activated-robot state.
- **validation**: Parent must select a course before "Add to robot" is enabled; no selection must show an inline prompt.
