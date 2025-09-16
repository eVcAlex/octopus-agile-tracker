import { type ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';

interface ProviderProps {
  children: ReactNode;
}

export function Provider({ children }: ProviderProps) {
  return (
    <MantineProvider defaultColorScheme="dark">{children}</MantineProvider>
  );
}
