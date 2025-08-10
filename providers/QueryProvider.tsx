import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import React from 'react';
import { Alert } from 'react-native';
import { useReactQueryDevTools } from "@dev-plugins/react-query";

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
  queryCache: new QueryCache({
    onError: (error: Error | any, query) => {
      if (error.response) {
        Alert.alert('Error', error.response);
        return;
      }
      if (query?.state.data === undefined) {
        Alert.alert('Error', error?.message || 'An error occurred');
        return;
      }
      if (query?.state.data !== undefined) {
        Alert.alert('Error', error?.message || 'An error occurred');
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: Error | any) => {
      if (error.response) {
        Alert.alert('Error', error?.response || 'An error occurred');
      }
    },
  }),
});

export function QueryProvider({ children }: PropsWithChildren) {
  // Enable React Query DevTools in development
  useReactQueryDevTools(queryClient);
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;