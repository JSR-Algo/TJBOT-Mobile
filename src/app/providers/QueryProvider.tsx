import React from 'react';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { captureError } from '@/services/observability/sentry';

type Props = { children: React.ReactNode };

function isClientError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const status = (error as Record<string, unknown>).status;
  if (typeof status === 'number') return status >= 400 && status < 500;
  const response = (error as Record<string, unknown>).response;
  if (response != null && typeof response === 'object') {
    const responseStatus = (response as Record<string, unknown>).status;
    if (typeof responseStatus === 'number') return responseStatus >= 400 && responseStatus < 500;
  }
  return false;
}

function hasExpectedQueryErrorCode(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const code = (error as Record<string, unknown>).code;
  return (
    code === 'INVALID_CREDENTIALS' ||
    code === 'NETWORK_ERROR' ||
    code === 'RATE_LIMIT_EXCEEDED' ||
    code === 'SERVICE_UNAVAILABLE' ||
    code === 'GATEWAY_TIMEOUT'
  );
}

function isExpectedQueryError(error: unknown): boolean {
  if (isClientError(error) || hasExpectedQueryErrorCode(error)) return true;
  if (error instanceof Error && error.message === 'No refresh token') return true;
  return false;
}

function describeQueryError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error != null && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const code = typeof record.code === 'string' ? record.code : undefined;
    const status = typeof record.status === 'number' ? record.status : undefined;
    return [code, status].filter(Boolean).join(':') || 'object';
  }
  return String(error);
}

function routeQueryError(error: unknown, kind: 'query' | 'mutation'): void {
  const expected = isExpectedQueryError(error);
  if (__DEV__) {
    const log = expected ? console.info : console.error;
    log('[QueryProvider] %s %s:', kind, expected ? 'handled error' : 'unexpected error', describeQueryError(error));
  }
  // Skip capture for expected screen-level API/auth/network states; callers own
  // the visible fallback. Unexpected failures still go to Sentry and dev logs.
  if (expected) return;
  captureError(error);
}

function defaultRetry(failureCount: number, error: unknown): boolean {
  // Do not retry client errors (4xx). Retry network/server errors up to 3 times.
  if (isClientError(error)) return false;
  return failureCount < 3;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => routeQueryError(error, 'query'),
  }),
  mutationCache: new MutationCache({
    onError: (error) => routeQueryError(error, 'mutation'),
  }),
  defaultOptions: {
    queries: {
      networkMode: 'online',
      gcTime: process.env.NODE_ENV === 'test' ? 0 : undefined,
      retry: defaultRetry,
    },
    mutations: {
      networkMode: 'online',
      retry: (failureCount, error) => {
        if (isClientError(error)) return false;
        return failureCount < 2;
      },
    },
  },
});

export function QueryProvider({ children }: Props): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
