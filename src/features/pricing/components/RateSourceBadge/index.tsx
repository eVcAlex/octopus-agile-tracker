import { Badge } from '@mantine/core';

export function RateSourceBadge({
  variant,
}: {
  variant: 'estimate' | 'confirmed';
}) {
  return variant === 'estimate' ? (
    <Badge color="violet" variant="light" radius="sm">
      🔮 Estimate
    </Badge>
  ) : (
    <Badge color="green" variant="light" radius="sm">
      ✓ Confirmed
    </Badge>
  );
}
