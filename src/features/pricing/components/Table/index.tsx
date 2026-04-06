import { useEffect, useRef } from 'react';
import { Table, Badge, Text } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';
import { getStatusBadge, getMantinePriceColor, formatPrice, isPast as checkPast } from '../../utils';
import { TABLE } from '../../constants';
import styles from './Table.module.scss';

interface PricingTableProps {
  data: ProcessedPriceData[];
  loading?: boolean;
}

type Row = { type: 'divider' } | { type: 'slot'; item: ProcessedPriceData; isPast: boolean };

export const PricingTable = ({ data, loading = false }: PricingTableProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (containerRef.current && currentRowRef.current) {
      containerRef.current.scrollTop = currentRowRef.current.offsetTop - TABLE.SCROLL_OFFSET;
    }
  }, [data]);

  if (loading) return <Text ta="center" py="xl" c="dimmed" size="sm">Loading...</Text>;
  if (!data?.length) return <Text ta="center" c="dimmed" size="sm">No pricing data available</Text>;

  const rows: Row[] = [];
  for (const item of data) {
    const past = checkPast(item);
    if (item.isCurrentPeriod) rows.push({ type: 'divider' });
    rows.push({ type: 'slot', item, isPast: past });
  }

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.scrollArea}>
        <Table
          highlightOnHover
          styles={{
            thead: { background: 'var(--surface-header)', position: 'sticky', top: 0, zIndex: 1 },
            th: {
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
              color: 'var(--text-subtle)',
              borderBottom: '1px solid var(--surface-border)',
              padding: '10px 16px',
            },
            td: { borderBottom: '1px solid var(--subtle-border)', padding: '9px 16px' },
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
                  <Table.Tr key={`divider-${i}`} className={styles.dividerRow}>
                    <Table.Td colSpan={3}>
                      <Text size="xs" c="violet" fw={600} style={{ letterSpacing: 0.5 }}>&#9654; NOW</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              }

              const { item, isPast } = row;
              const status = getStatusBadge(item.priceIncVat);

              return (
                <Table.Tr
                  key={item.id}
                  ref={item.isCurrentPeriod ? currentRowRef : undefined}
                  className={`${item.isCurrentPeriod ? styles.currentRow : ''} ${isPast ? styles.pastRow : ''}`}
                >
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={item.isCurrentPeriod ? 700 : 400}>
                      {item.time}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600} c={getMantinePriceColor(item.priceIncVat)}>
                      {formatPrice(item.priceIncVat)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <div className={styles.badgeGroup}>
                      {item.isCurrentPeriod && <Badge color="violet" size="sm">NOW</Badge>}
                      {status && <Badge color={status.color} size="sm">{status.label}</Badge>}
                    </div>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
    </div>
  );
};
