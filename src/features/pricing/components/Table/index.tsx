import { Table, Badge, Flex, Text } from '@chakra-ui/react';
import type { ProcessedPriceData } from '../../types';

interface PricingTableProps {
  data: ProcessedPriceData[];
  loading?: boolean;
}

export function PricingTable({ data, loading = false }: PricingTableProps) {
  if (loading) {
    return (
      <Text textAlign="center" py={8}>
        Loading...
      </Text>
    );
  }

  if (!data || data.length === 0) {
    return <Text textAlign="center">No pricing data available</Text>;
  }

  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>TIME</Table.ColumnHeader>
          <Table.ColumnHeader>PRICE (INC VAT)</Table.ColumnHeader>
          <Table.ColumnHeader>PRICE (EXC VAT)</Table.ColumnHeader>
          <Table.ColumnHeader>STATUS</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {data.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>
              <Text fontFamily="monospace" fontSize="sm">
                {item.time}
              </Text>
            </Table.Cell>

            <Table.Cell>
              <Flex align="center" gap={2}>
                <Text fontFamily="monospace" fontWeight="semibold">
                  {item.priceIncVat.toFixed(2)}p
                </Text>
                {item.priceIncVat < 0 && (
                  <Badge colorScheme="green">FREE</Badge>
                )}
                {item.priceIncVat > 25 && <Badge colorScheme="red">HIGH</Badge>}
                {item.priceIncVat >= 0 && item.priceIncVat < 10 && (
                  <Badge colorScheme="green" variant="subtle">
                    LOW
                  </Badge>
                )}
              </Flex>
            </Table.Cell>

            <Table.Cell>
              <Text fontFamily="monospace" fontSize="sm" color="gray.500">
                {item.priceExcVat.toFixed(2)}p
              </Text>
            </Table.Cell>

            <Table.Cell>
              {item.isCurrentPeriod && (
                <Badge colorScheme="blue">CURRENT</Badge>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
