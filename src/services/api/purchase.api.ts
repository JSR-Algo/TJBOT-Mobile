import client from '../http/client';
import { attachRequestIdHeader } from '../http/idempotency';
import {
  FeatureSubscriptionDisabledError,
  isSubscriptionFeatureEnabled,
} from '../../config/feature-flags';
import { backendContractUnavailable } from './undocumented-api-routes';

export const BACKEND_CONTRACT_UNAVAILABLE_CODE = 'BACKEND_CONTRACT_UNAVAILABLE' as const;

export class BackendContractUnavailableError extends Error {
  readonly code = BACKEND_CONTRACT_UNAVAILABLE_CODE;
  constructor(operation: string) {
    super(`BACKEND_CONTRACT_UNAVAILABLE: ${operation} has no documented backend contract`);
    this.name = 'BackendContractUnavailableError';
  }
}

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

interface RawOrder {
  id: string;
  status: Order['status'];
  product_id?: string;
  productId?: string;
  total_cents?: number;
  totalCents?: number;
  receipt_email?: string | null;
  receiptEmail?: string | null;
}

interface RawShippingStatus {
  order_id?: string;
  orderId?: string;
  status: string;
  estimated_delivery?: string | null;
  estimatedDelivery?: string | null;
  tracking_number?: string | null;
  trackingNumber?: string | null;
}

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

function mapBillingPlan(raw: {
  id: string;
  name: string;
  amount_cents: number;
  currency: string;
  interval?: string | null;
  trial_days?: number | null;
}): BillingPlan {
  return {
    id: raw.id,
    name: raw.name,
    amountCents: raw.amount_cents,
    currency: raw.currency,
    interval: raw.interval ?? null,
    trialDays: raw.trial_days ?? null,
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

function mapOrder(raw: RawOrder): Order {
  return {
    id: raw.id,
    status: raw.status,
    productId: raw.product_id ?? raw.productId ?? '',
    totalCents: raw.total_cents ?? raw.totalCents ?? 0,
    receiptEmail: raw.receipt_email ?? raw.receiptEmail ?? null,
  };
}

function mapShippingStatus(raw: RawShippingStatus): ShippingStatus {
  return {
    orderId: raw.order_id ?? raw.orderId ?? '',
    status: raw.status,
    estimatedDelivery: raw.estimated_delivery ?? raw.estimatedDelivery ?? null,
    trackingNumber: raw.tracking_number ?? raw.trackingNumber ?? null,
  };
}

export async function createOrder(_params: OrderParams): Promise<Order> {
  backendContractUnavailable(`createOrder:${_params.productId}:${_params.quantity}`);
}

export async function getOrder(orderId: string): Promise<Order> {
  const response = await client.get(`/orders/${orderId}`);
  return mapOrder(unwrap<RawOrder>(response));
}

export async function processPayment(_params: PaymentParams): Promise<{ success: boolean }> {
  backendContractUnavailable(`processPayment:${_params.orderId}`);
}

export async function getShippingStatus(orderId: string): Promise<ShippingStatus> {
  const response = await client.get(`/orders/${orderId}/shipping`);
  return mapShippingStatus(unwrap<RawShippingStatus>(response));
}

export async function activateRobot(activationCode: string, requestId?: string): Promise<void> {
  const payload = { activation_code: activationCode };
  const headers = requestId ? attachRequestIdHeader({}, requestId) : undefined;
  if (headers) {
    await client.post('/devices/activate', payload, { headers });
  } else {
    await client.post('/devices/activate', payload);
  }
}

export async function createCheckoutSession(
  payload: CheckoutSessionPayload,
  requestId?: string,
): Promise<CheckoutSessionResponse> {
  assertSubscriptionEnabled('createCheckoutSession');
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post('/billing/checkout-session', payload, options);
  return mapCheckoutSessionResponse(unwrap<Parameters<typeof mapCheckoutSessionResponse>[0]>(response));
}

export async function listBillingPlans(): Promise<BillingPlan[]> {
  const response = await client.get('/billing/plans');
  const raw = unwrap<Parameters<typeof mapBillingPlan>[0][]>(response);
  return raw.map(mapBillingPlan);
}

export async function getCurrentBillingPlan(): Promise<BillingPlan | null> {
  const response = await client.get('/billing/plan');
  const raw = unwrap<Parameters<typeof mapBillingPlan>[0] | null>(response);
  return raw ? mapBillingPlan(raw) : null;
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const response = await client.get('/billing/subscription');
  const raw = unwrap<Parameters<typeof mapSubscription>[0] | null>(response);
  return raw ? mapSubscription(raw) : null;
}

export async function getBillingProviderStatus(): Promise<BillingProviderStatus> {
  backendContractUnavailable('getBillingProviderStatus');
}

export async function getInvoicePdf(invoiceId: string): Promise<InvoicePdf> {
  const response = await client.get(`/billing/invoices/${invoiceId}/pdf`);
  const headers = (response as { headers?: Record<string, string> }).headers ?? {};
  const url = headers.location ?? headers.Location ?? '';
  return { invoiceId, url };
}

export async function subscribeToPlan(planId: string, requestId?: string): Promise<CheckoutSessionResponse> {
  assertSubscriptionEnabled('subscribeToPlan');
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post('/billing/subscription', { plan_id: planId }, options);
  return mapCheckoutSessionResponse(unwrap<Parameters<typeof mapCheckoutSessionResponse>[0]>(response));
}

export async function pauseSubscription(requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('pauseSubscription');
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post('/billing/subscription/pause', {}, options);
  return mapSubscription(unwrap<Parameters<typeof mapSubscription>[0]>(response));
}

export async function resumeSubscription(requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('resumeSubscription');
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post('/billing/subscription/resume', {}, options);
  return mapSubscription(unwrap<Parameters<typeof mapSubscription>[0]>(response));
}

export async function cancelSubscription(requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('cancelSubscription');
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post('/billing/subscription/cancel', {}, options);
  return mapSubscription(unwrap<Parameters<typeof mapSubscription>[0]>(response));
}

export async function reactivateSubscription(requestId?: string): Promise<Subscription> {
  assertSubscriptionEnabled('reactivateSubscription');
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post('/billing/subscription/reactivate', {}, options);
  return mapSubscription(unwrap<Parameters<typeof mapSubscription>[0]>(response));
}

export async function cancelOrder(orderId: string, requestId?: string): Promise<CancelOrderResult> {
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post(`/orders/${orderId}/cancel`, {}, options);
  const raw = unwrap<{ order_id?: string; orderId?: string; state: string; cancelled_at?: string; cancelledAt?: string }>(response);
  return {
    orderId: raw.order_id ?? raw.orderId ?? orderId,
    state: raw.state,
    cancelledAt: raw.cancelled_at ?? raw.cancelledAt ?? '',
  };
}

export async function requestReturn(
  orderId: string,
  reason: string,
  notes: string,
  requestId?: string,
): Promise<RefundRequestResult> {
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post(`/orders/${orderId}/return`, { reason, notes }, options);
  const raw = unwrap<{
    request_id?: string;
    requestId?: string;
    state: string;
    expected_decision_by?: string | null;
    expectedDecisionBy?: string | null;
  }>(response);
  return {
    requestId: raw.request_id ?? raw.requestId ?? '',
    state: raw.state,
    expectedDecisionBy: raw.expected_decision_by ?? raw.expectedDecisionBy ?? null,
  };
}
