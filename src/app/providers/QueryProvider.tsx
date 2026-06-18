import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Props = { children: React.ReactNode };

const queryClient = new QueryClient({
  defaultOptions: __DEV__ && process.env.NODE_ENV === 'test'
    ? { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } }
    : undefined,
});

export function QueryProvider({ children }: Props) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
