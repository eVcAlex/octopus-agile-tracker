import { useState } from 'react';
import { Group, SegmentedControl } from '@mantine/core';
import { ChartBar, SquaresFour } from 'phosphor-react';
import type { DailyPrices } from '../../schemas';
import { hasIntradayVariation } from '../../api/tariffs';
import { PricingStats } from '../Stats';
import { PeriodList } from '../PeriodList';
import { PriceChart } from '../Chart';
import { CheapWindows } from '../CheapWindows';
import { CurrentSlotBanner } from '../CurrentSlotBanner';

type View = 'grid' | 'chart';

export function DaySection({ data }: { data: DailyPrices }) {
  const [view, setView] = useState<View>('chart');

  return (
    <section aria-label="Price visualisation">
      <PricingStats stats={data.stats} />

      <CurrentSlotBanner data={data.rates} />

      {/* "Cheapest window" is meaningless when the whole day costs the same. */}
      {hasIntradayVariation(data.rates.map((r) => r.priceIncVat)) && (
        <CheapWindows data={data.rates} />
      )}

      <Group justify="flex-end" mt="md" mb="md">
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as View)}
          size="sm"
          radius="md"
          withItemsBorders={false}
          aria-label="View type"
          styles={{
            // Inline SVG labels leave descender space below the icon — flex
            // both the label and its inner span so the icon sits centred.
            label: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            innerLabel: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          }}
          data={[
            {
              value: 'chart',
              label: (
                <ChartBar
                  size={17}
                  weight={view === 'chart' ? 'fill' : 'regular'}
                  aria-label="Chart"
                />
              ),
            },
            {
              value: 'grid',
              label: (
                <SquaresFour
                  size={17}
                  weight={view === 'grid' ? 'fill' : 'regular'}
                  aria-label="Grid"
                />
              ),
            },
          ]}
        />
      </Group>

      {view === 'chart' ? (
        <PriceChart data={data.rates} />
      ) : (
        <PeriodList data={data.rates} />
      )}
    </section>
  );
}
