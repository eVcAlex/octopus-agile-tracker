import { useEffect, useRef } from 'react';
import { Table, Badge, Text, Box, useMantineColorScheme } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';

interface PricingTableProps {
  data: ProcessedPriceData[];
  loading?: boolean;
}

type Row = { type: 'divider' } | { type: 'slot'; item: ProcessedPriceData; isPast: boolean };

function getStatus(p: number): { label: string; color: string } | null {
  if (p <= 0) return { label: 'FREE', color: 'teal' };
  if (p < 10) return { label: 'LOW', color: 'green' };
  if (p > 25) return { label: 'HIGH', color: 'red' };
  return null;
}

export const PricingTable = ({ data, loading = false }: PricingTableProps) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (containerRef.current && currentRowRef.current) {
      // Offset accounts for: sticky thead (~36px) + divider row (~24px) + breathing room
      containerRef.current.scrollTop = currentRowRef.current.offsetTop - 80;
    }
  }, [data]);

  if (loading)
    return <Text ta="center" py="xl" c="dimmed" size="sm">Loading...</Text>;
  if (!data || data.length === 0)
    return <Text ta="center" c="dimmed" size="sm">No pricing data available</Text>;

  const now = new Date();

  const rows: Row[] = [];
  for (const item of data) {
    const isPast = !item.isCurrentPeriod && item.validTo < now;
    if (item.isCurrentPeriod) rows.push({ type: 'divider' });
    rows.push({ type: 'slot', item, isPast });
  }

  return (
    <Box style={{ borderRadius: 10, border: `1px solid ${dark ? '#2a2a2a' : '#eee'}`, overflow: 'hidden' }}>
      <Box ref={containerRef} style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <Table
          highlightOnHover
          styles={{
            thead: { background: dark ? '#141414' : '#f8f9fa', position: 'sticky', top: 0, zIndex: 1 },
            th: {
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
              color: dark ? '#666' : '#868e96',
              borderBottom: `1px solid ${dark ? '#2a2a2a' : '#eee'}`,
              padding: '10px 16px',
            },
            td: { borderBottom: `1px solid ${dark ? '#1f1f1f' : '#f1f3f5'}`, padding: '9px 16px' },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Time</Table.Th>
              <Table.Th>Price (inc. VAT)</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row, i) => {
              if (row.type === 'divider') {
                return (
                  <Table.Tr key={`divider-${i}`} style={{ pointerEvents: 'none' }}>
                    <Table.Td
                      colSpan={3}
                      style={{
                        padding: '3px 16px',
                        background: dark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
                        borderTop: '1px solid rgba(124,58,237,0.4)',
                        borderBottom: 'none',
                      }}
                    >
                      <Text size="xs" c="violet" fw={600} style={{ letterSpacing: 0.5 }}>▶ NOW</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              }

              const { item, isPast } = row;
              const status = getStatus(item.priceIncVat);
              const priceColor = item.priceIncVat < 0 ? 'teal' : item.priceIncVat > 25 ? 'red' : undefined;

              return (
                <Table.Tr
                  key={item.id}
                  ref={item.isCurrentPeriod ? currentRowRef : undefined}
                  style={{
                    background: item.isCurrentPeriod
                      ? dark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)'
                      : undefined,
                    opacity: isPast ? 0.35 : 1,
                  }}
                >
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={item.isCurrentPeriod ? 700 : 400}>
                      {item.time}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600} c={priceColor}>
                      {item.priceIncVat.toFixed(2)}p
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
                      {item.isCurrentPeriod && <Badge color="violet" variant="light" size="sm">NOW</Badge>}
                      {status && <Badge color={status.color} variant="light" size="sm">{status.label}</Badge>}
                    </div>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Box>
  );
};
