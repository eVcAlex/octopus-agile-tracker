import { useState } from 'react';
import { Modal, Stack, Text, Select, Button } from '@mantine/core';
import { MapPin } from 'phosphor-react';
import { REGIONS, REGION_LABELS, type Region } from '../../schemas';

const regionOptions = REGIONS.map((code) => ({
  value: code,
  label: REGION_LABELS[code],
}));

export function RegionPickerModal({
  opened,
  onSelect,
}: {
  opened: boolean;
  onSelect: (r: Region) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      title="Welcome to Octopus Tracker"
      centered
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      aria-label="Select your electricity region"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select your electricity region to see accurate Octopus prices.
        </Text>
        <Select
          label="Your region"
          placeholder="Select your region..."
          data={regionOptions}
          value={selected}
          onChange={setSelected}
          leftSection={<MapPin size={16} />}
          searchable
          aria-required
        />
        <Button
          color="violet"
          fullWidth
          disabled={!selected}
          onClick={() => selected && onSelect(selected as Region)}
        >
          Get started
        </Button>
      </Stack>
    </Modal>
  );
}
