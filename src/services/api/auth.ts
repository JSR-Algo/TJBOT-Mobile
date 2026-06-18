import client from '../http/client';
import { attachRequestIdHeader } from '../http/idempotency';
import { setTokens, clearTokens } from '../http/tokens';
import { AuthTokens, User } from '../../types';

function postWithRequestId(
  url: string,
  data: unknown,
  requestId: string | undefined,
): Promise<{ data: unknown }> {
  const headers = requestId ? attachRequestIdHeader({}, requestId) : undefined;
  if (headers) {
    return client.post(url, data, { headers });
  }
  return client.post(url, data);
}

function unwrapResponseData<T>(responseData: unknown): T {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData &&
    (responseData as Record<string, unknown>).data !== undefined
  ) {
    return (responseData as Record<string, unknown>).data as T;
  }
  return responseData as T;
}

// Contract breadcrumb: paired with backend/src/identity/auth.controller.ts SignupDto; verified by backend/tests/identity.integration.spec.ts and original-app/TJBOT-Mobile/tests/api/auth-api.test.ts. Update both when this shape changes.
export async function signup(
  name: string,
  email: string,
  password: string,
  requestId?: string,
): Promise<AuthTokens & { user?: User }> {
  const response = await postWithRequestId('/auth/signup', { name, email, password }, requestId);
  const data = unwrapResponseData<AuthTokens & { user?: User }>(response.data);
  // Signup returns access_token only; chain login so consent/child APIs get a refresh token.
  if (data.access_token && !data.refresh_token) {
    return login(email, password, requestId);
  }
  if (data.access_token) {
    await setTokens(data.access_token, data.refresh_token ?? '');
  }
  return data;
}

export async function login(
  email: string,
  password: string,
  requestId?: string,
): Promise<AuthTokens & { user: User }> {
  const response = await postWithRequestId('/auth/login', { email, password }, requestId);
  const data = unwrapResponseData<AuthTokens & { user: User }>(response.data);
  if (data.access_token) {
    await setTokens(data.access_token, data.refresh_token);
  }
  return data;
}

export async function refresh(requestId?: string): Promise<AuthTokens> {
  const response = await postWithRequestId('/auth/refresh', {}, requestId);
  return unwrapResponseData<AuthTokens>(response.data);
}

export async function logout(requestId?: string): Promise<void> {
  try {
    await postWithRequestId('/auth/logout', {}, requestId);
  } finally {
    await clearTokens();
  }
}

export async function forgotPassword(email: string, requestId?: string): Promise<void> {
  await postWithRequestId('/auth/forgot-password', { email }, requestId);
}

export async function sendConsent(stripeToken?: string, requestId?: string): Promise<void> {
  await postWithRequestId('/auth/consent', {
    ...(stripeToken ? { stripe_token: stripeToken } : {}),
    consent_given: true,
    timestamp: new Date().toISOString(),
  }, requestId);
}
