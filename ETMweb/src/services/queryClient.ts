import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (count, error) =>
        count < 1 && (!(error instanceof ApiError) || error.status >= 500 || error.status === 0),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
export function clearPrivateQueries() {
  queryClient.removeQueries({
    predicate: (query) => !['public', 'games'].includes(String(query.queryKey[0])),
  });
}
