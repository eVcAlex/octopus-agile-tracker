import { Text } from '@mantine/core';
import type { ProcessedSlot } from '../../schemas';
import {
  getPriceColor,
  getStatusBadge,
  formatPrice,
  isPast,
} from '../../utils';
import { useScrollToCurrent } from '../../hooks/use-scroll-to-current';
import styles from './PeriodList.module.scss';

interface Period {
  key: string;
  label: string;
  from: number; // inclusive hour
  to: number; // exclusive hour
  peak?: boolean;
}

// Time-of-day bands (inspired by agile-rates.uk's grouped rate cards).
const PERIODS: Period[] = [
  { key: 'overnight', label: 'Overnight', from: 0, to: 6 },
  { key: 'morning', label: 'Morning', from: 6, to: 12 },
  { key: 'afternoon', label: 'Afternoon', from: 12, to: 16 },
  { key: 'peak', label: 'Peak window', from: 16, to: 19, peak: true },
  { key: 'evening', label: 'Evening', from: 19, to: 24 },
];

function hourOf(slot: ProcessedSlot): number {
  return Number(slot.time.slice(0, 2));
}

function tierLabel(price: number): string {
  return getStatusBadge(price)?.label ?? 'Standard';
}

export function PeriodList({ data }: { data: ProcessedSlot[] }) {
  const { containerRef, currentRef } = useScrollToCurrent([data]);

  return (
    <div ref={containerRef} className={styles.wrapper}>
      {PERIODS.map((period) => {
        const slots = data.filter((s) => {
          const h = hourOf(s);
          return h >= period.from && h < period.to;
        });
        if (!slots.length) return null;

        return (
          <section key={period.key} className={styles.period}>
            <div className={styles.periodHeader}>
              <Text
                size="xs"
                fw={700}
                tt="uppercase"
                lts={0.8}
                className={period.peak ? styles.peakLabel : styles.periodLabel}
              >
                {period.peak && <span className={styles.peakDot} />}
                {period.label}
              </Text>
              <Text size="xs" c="dimmed" className={styles.mono}>
                {String(period.from).padStart(2, '0')}:00–
                {String(period.to).padStart(2, '0')}:00
              </Text>
            </div>

            <div className={styles.grid}>
              {slots.map((slot) => {
                const color = getPriceColor(slot.priceIncVat);
                return (
                  <div
                    key={slot.id}
                    ref={slot.isCurrentPeriod ? currentRef : undefined}
                    className={`${styles.card} ${slot.isCurrentPeriod ? styles.current : ''} ${isPast(slot) ? styles.past : ''}`}
                  >
                    <div className={styles.cardTop}>
                      <Text size="xs" c="dimmed" className={styles.mono}>
                        {slot.time}
                      </Text>
                      {slot.isCurrentPeriod && (
                        <span className={styles.now}>NOW</span>
                      )}
                    </div>
                    <Text fw={800} className={styles.price} style={{ color }}>
                      {formatPrice(slot.priceIncVat)}
                    </Text>
                    <Text size="xs" className={styles.tier} style={{ color }}>
                      {tierLabel(slot.priceIncVat)}
                    </Text>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
