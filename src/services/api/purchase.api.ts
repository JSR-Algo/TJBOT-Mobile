import client from '../http/client';
import {
  FeatureSubscriptionDisabledError,
  isSubscriptionFeatureEnabled,
} from '../../config/feature-flags';
import { backendContractUnavailable } from './undocumented-api-routes';

// Re-exported, not redefined. This module used to declare its own copy of the
// error class, so `err instanceof BackendContractUnavailableError` was false
// across module boundaries even though `err.code` matched — two nominal types
// behind one code. One class, one shape (T5.2 error-envelope consistency).
export {
  BACKEND_CONTRACT_UNAVAILABLE_CODE,
  BackendContractUnavailableError,
} from './undocumented-api-routes';

export interface OrderParams {
  productId: string;
  quantity: number;
  shippingAddressId: string;
}

export interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'paid' | 'pending_payment' | 'cancelled' | 'refunded';
  productId: string;
  totalCents: number;
  receiptEmail?: string | null;
}

export interface PaymentParams {
  orderId: string;
  paymentMethodToken: string;
}

export interface ShippingStatus {
  orderId: string;
  status: string;
  estimatedDelivery: string | null;
  trackingNumber: string | null;
}

export interface BillingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

export interface CheckoutSessionPayload {
  sku_id: string;
  quantity: number;
  billing_address: BillingAddress;
}

export interface CheckoutSessionResponse {
  orderId: string;
  stripeCheckoutUrl: string | null;
  expiresAt: string | null;
  state: string | null;
}

export interface BillingPlan {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  interval: string | null;
  trialDays: number | null;
}

export interface Subscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface InvoicePdf {
  invoiceId: string;
  url: string;
}

export interface BillingProviderStatus {
  providerAvailable: boolean;
  message: string | null;
}

export interface CancelOrderResult {
  orderId: string;
  state: string;
  cancelledAt: string;
}

export interface RefundRequestResult {
  requestId: string;
  state: string;
  expectedDecisionBy: string | null;
}


// RawShippingStatus and mapShippingStatus went with getShippingStatus's call:
// they described a fulfilment payload the orders module does not produce. The
// ShippingStatus domain type stays for the screen that still renders it.

function unwrap<T>(response: { data: { data?: T } | T }): T {
  const body = response.data as { data?: T } & T;
  return (body && typeof body === 'object' && 'data' in body && body.data !== undefined ? body.data : body) as T;
}

function assertSubscriptionEnabled(operation: string): void {
  if (!isSubscriptionFeatureEnabled()) {
    throw new FeatureSubscriptionDisabledError(operation);
  }
}

export function mapCheckoutSessionResponse(payload: {
  order_id: string;
  stripe_checkout_url?: string | null;
  expires_at?: string | null;
  state?: string | null;
}): CheckoutSessionResponse {
  return {
    orderId: payload.order_id,
    stripeCheckoutUrl: payload.stripe_checkout_url ?? null,
    expiresAt: payload.expires_at ?? null,
    state: payload.state ?? null,
  };
}


function mapSubscription(raw: {
  id: string;
  plan_id: string;
  status: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}): Subscription {
  return {
    id: raw.id,
    planId: raw.plan_id,
    status: raw.status,
    currentPeriodEnd: raw.current_period_end ?? null,
    cancelAtPeriodEnd: raw.cancel_at_period_end ?? false,
  };
}

// Backend `OrderState` (order-state.ts) and mobile `Order['status']` are two
// different vocabularies that overlap on four names. Translate rather than
// cast, so an unmapped backend state can never masquerade as a mobile one.
// States mobile has no name for collapse to `pending` — the neutral
// pre-fulfilment label — which preserves the only live consumer,
// OrderConfirmScreen's `status === 'paid'` gate. Widening the mobile union to
// the real state machine is purchase-feature work, routed as F-T52-05.


// The modular orders module answers with `{ data: { orderId, state,
// stateVersion } }` — `orderId`/`state`, not `id`/`status`. Reading `raw.id`
// left `Order.id` and `Order.status` undefined behind a `string` type, which is
// how OrderConfirmScreen's `status === 'paid'` gate could never fire.
// productId/totalCents/receiptEmail have no field in the contract at all; the
// defaults below are placeholders, also routed as F-T52-05.

export async function createOrder(_params: OrderParams): Promise<Order> {
  backendContractUnavailable(`createOrder:${_params.productId}:${_params.quantity}`);
}

export async function getOrder(_orderId: string): Promise<Order> {
  backendContractUnavailable('getOrder');
}

export async function processPayment(_params: PaymentParams): Promise<{ success: boolean }> {
  backendContractUnavailable(`processPayment:${_params.orderId}`);
}

export async function getShippingStatus(_orderId: string): Promise<ShippingStatus> {
  backendContractUnavailable('getShippingStatus');
}

export async function activateRobot(_activationCode: string): Promise<void> {
  backendContractUnavailable('activateRobot');
}

export async function createCheckoutSession(
  _payload: CheckoutSessionPayload,
  _requestId?: string,
): Promise<CheckoutSessionResponse> {
  assertSubscriptionEnabled('createCheckoutSession');
  backendContractUnavailable('createCheckoutSession');
}

export async function listBillingPlans(): Promise<BillingPlan[]> {
  backendContractUnavailable('listBillingPlans');
}

export async function getCurrentBillingPlan(): Promise<BillingPlan | null> {
  backendContractUnavailable('getCurrentBillingPlan');
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const response = await client.get('/billing/subscription');
  const raw = unwrap<Parameters<typeof mapSubscription>[0] | null>(response);
  return raw ? mapSubscription(raw) : null;
}

export async function getBillingProviderStatus(): Promise<BillingProviderStatus> {
  backendContractUnavailable('getBillingProviderStatus');
}

export async function getInvoicePdf(_invoiceId: string): Promise<InvoicePdf> {
  backendContractUnavailable('getInvoicePdf');
}

export async function subscribeToPlan(_planId: string, _requestId?: string): Promise<CheckoutSessionResponse> {
  assertSubscriptionEnabled('subscribeToPlan');
  backendContractUnavailable('subscribeToPlan');
}

export async function pauseSubscription(_requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('pauseSubscription');
  backendContractUnavailable('pauseSubscription');
}

export async function resumeSubscription(_requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('resumeSubscription');
  backendContractUnavailable('resumeSubscription');
}

export async function cancelSubscription(_requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('cancelSubscription');
  backendContractUnavailable('cancelSubscription');
}

export async function reactivateSubscription(_requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('reactivateSubscription');
  // The modular payments module names this `/billing/reactivate`, not
  // `/billing/subscription/reactivate` — the latter has never been routed.
  backendContractUnavailable('reactivateSubscription');
}

export async function cancelOrder(_orderId: string, _requestId?: string): Promise<CancelOrderResult> {
  backendContractUnavailable('cancelOrder');
}

export async function requestReturn(
  _orderId: string,
  _reason: string,
  _notes: string,
  _requestId?: string,
): Promise<RefundRequestResult> {
  backendContractUnavailable('requestReturn');
}
