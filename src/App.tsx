import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './app.scss';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import { PricingDashboard } from './features/pricing/components/Dashboard';

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications position="top-right" />
        <PricingDashboard />
      </ModalsProvider>
    </MantineProvider>
  );
}
