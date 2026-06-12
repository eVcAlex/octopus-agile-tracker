import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './app.scss';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  queryClient,
  queryPersister,
  PERSIST_MAX_AGE,
} from './lib/query-client';
import { theme } from './theme';
import { PricingDashboard } from './features/pricing/components/Dashboard';

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE }}
    >
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <ModalsProvider>
          <Notifications position="top-right" />
          <PricingDashboard />
        </ModalsProvider>
      </MantineProvider>
    </PersistQueryClientProvider>
  );
}
