import { Anchor, Stack, Text } from '@mantine/core';

const link = { target: '_blank', rel: 'noreferrer noopener' } as const;

export function Footer() {
  return (
    <Stack component="footer" gap={4} align="center" mt="xl" pt="md" pb="sm">
      <Text size="xs" c="dimmed" ta="center">
        Unofficial, and not affiliated with Octopus Energy. Prices are a guide,
        so check your Octopus account for what you'll actually be billed.
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        Data from{' '}
        <Anchor size="xs" href="https://developer.octopus.energy/" {...link}>
          Octopus Energy API
        </Anchor>
        {', '}
        <Anchor size="xs" href="https://agilepredict.com/" {...link}>
          AgilePredict
        </Anchor>
        {' and '}
        <Anchor size="xs" href="https://www.nordpoolgroup.com/" {...link}>
          Nord Pool
        </Anchor>
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        © 2026 Alex McGuiness
        {' · '}
        <Anchor size="xs" href="/privacy.html">
          Privacy
        </Anchor>
        {' · '}
        <Anchor
          size="xs"
          href="https://github.com/eVcAlex/octopus-agile-tracker"
          {...link}
        >
          Source
        </Anchor>
      </Text>
    </Stack>
  );
}
