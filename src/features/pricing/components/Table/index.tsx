import { Table, Badge, Flex, Text, Tooltip } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';

interface PricingTableProps {
  data: ProcessedPriceData[];
  loading?: boolean;
}

export const PricingTable = ({ data, loading = false }: PricingTableProps) => {
  if (loading)
    return (
      <Text ta="center" py="xl">
        Loading...
      </Text>
    );
  if (!data || data.length === 0)
    return <Text ta="center">No pricing data available</Text>;

  return (
    <Table highlightOnHover striped>
      <thead>
        <tr>
          <th>Time</th>
          <th>Price (Inc VAT)</th>
          <th>Price (Ex VAT)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => {
          let status: { label: string; color: string } | null = null;
          if (item.priceIncVat < 0) status = { label: 'FREE', color: 'green' };
          else if (item.priceIncVat >= 0 && item.priceIncVat < 10)
            status = { label: 'LOW', color: 'green' };
          else if (item.priceIncVat > 25)
            status = { label: 'HIGH', color: 'red' };

          return (
            <tr key={item.id}>
              <td>
                <Text style={{ fontFamily: 'monospace' }}>{item.time}</Text>
              </td>
              <td>
                <Flex align="center" gap="xs">
                  <Text style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {item.priceIncVat.toFixed(2)}p
                  </Text>
                  {status && (
                    <Tooltip
                      label={`This period is considered ${status.label}`}
                    >
                      <Badge color={status.color}>{status.label}</Badge>
                    </Tooltip>
                  )}
                </Flex>
              </td>
              <td>
                <Text color="dimmed" style={{ fontFamily: 'monospace' }}>
                  {item.priceExcVat.toFixed(2)}p
                </Text>
              </td>
              <td>
                {item.isCurrentPeriod && <Badge color="blue">CURRENT</Badge>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};
