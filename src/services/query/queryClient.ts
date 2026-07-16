import { QueryClient } from '@tanstack/react-query';

export const appQueryClient = new QueryClient({
  defaultOptions: __DEV__ && process.env.NODE_ENV === 'test'
    ? { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } }
    : undefined,
});
