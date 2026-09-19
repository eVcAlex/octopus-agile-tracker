import { Anchor, Stack, Text } from '@mantine/core';

const link = { target: '_blank', rel: 'noreferrer noopener' } as const;

export function Footer() {
  return (
    <Stack component="footer" gap={4} align="center" mt="xl" pt="md" pb="sm">
      <Text size="xs" c="dimmed" ta="center">
        Unofficial — not affiliated with Octopus Energy. Prices are indicative;
        your Octopus account is the source of truth for what you're billed.
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        Data:{' '}
        <Anchor size="xs" href="https://developer.octopus.energy/" {...link}>
          Octopus Energy API
        </Anchor>
        {' · '}
        <Anchor size="xs" href="https://agilepredict.com/" {...link}>
          AgilePredict
        </Anchor>
        {' · '}
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
