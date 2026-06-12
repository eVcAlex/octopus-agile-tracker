import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const TWO_DAYS = 48 * 60 * 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      staleTime: 60_000,
      // Keep cached data long enough to survive offline restarts
      gcTime: TWO_DAYS,
      retry: 2,
    },
  },
});

export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'agile-tracker-query-cache',
});

export const PERSIST_MAX_AGE = TWO_DAYS;
