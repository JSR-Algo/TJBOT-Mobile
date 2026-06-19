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

function routeQueryError(error: unknown, kind: 'query' | 'mutation'): void {
  if (__DEV__) {
    console.error('[QueryProvider] %s error:', kind, error);
  }
  // Skip logging expected client/configuration errors; still let callers handle them.
  if (isClientError(error)) return;
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
