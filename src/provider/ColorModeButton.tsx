import { ActionIcon, useMantineColorScheme, Tooltip } from '@mantine/core';
import { Moon, Sun } from 'phosphor-react';

export const ColorModeButton = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Tooltip
      label={`Switch to ${colorScheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <ActionIcon
        variant="outline"
        color={colorScheme === 'dark' ? 'yellow' : 'blue'}
        onClick={toggleColorScheme}
        size="lg"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
};
