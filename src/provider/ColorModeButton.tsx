import {
  ActionIcon,
  useMantineColorScheme,
  Tooltip,
} from '@mantine/core';
import { Moon, Sun } from 'phosphor-react';

export const ColorModeButton = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Tooltip
      label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      position="bottom"
    >
      <ActionIcon
        variant="light"
        color={dark ? 'yellow' : 'violet'}
        onClick={toggleColorScheme}
        size="lg"
        radius="md"
      >
        {dark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
      </ActionIcon>
    </Tooltip>
  );
};
