import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import React from 'react';
import { Alert } from 'react-native';
import { useReactQueryDevTools } from "@dev-plugins/react-query";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: Error | any, query) => {
      if (error.response) {
        Alert.alert(error.response);
        return;
      }
      if (query?.state.data === undefined) {
        Alert.alert(error?.message);
        return;
      }
      if (query?.state.data !== undefined) {
        Alert.alert(error?.message);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: Error | any) => {
      if (error.response) {
        Alert.alert(error?.response);
      }
    },
  }),
});

const QueryProvider = ({ children }: PropsWithChildren<any>) => {
  useReactQueryDevTools(queryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default QueryProvider;