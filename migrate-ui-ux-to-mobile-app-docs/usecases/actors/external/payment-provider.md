# External Actor — Payment Provider

**Type:** External system.

**Source evidence:** Apple Pay + Visa rows in `src/features/purchase/CheckoutPage.jsx`. Stub `processPayment()` in `src/services/api/purchase.api.js`.

**Provider identity:** **NOT CONFIRMED IN SOURCE** (KD9). Could be Stripe, Adyen, Apple Pay direct, etc.

**Used by domains:** `purchase` only.

## Delegation edges

UC-BU08 — Pay with Apple Pay, UC-BU09 — Pay with Card (tjtjboth `kind: "delegate"`).
