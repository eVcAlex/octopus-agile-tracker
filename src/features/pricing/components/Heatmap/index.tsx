import { useEffect, useRef } from 'react';
import { Text } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';
import { getPriceColor } from '../../utils';
import { HEATMAP } from '../../constants';
import styles from './Heatmap.module.scss';

interface HeatmapViewProps {
  data: ProcessedPriceData[];
}

export const HeatmapView = ({ data }: HeatmapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && currentRowRef.current) {
      containerRef.current.scrollTop = currentRowRef.current.offsetTop - 48;
    }
  }, [data]);

  // Index slots by hour
  const slotsByHour = new Map<number, [ProcessedPriceData | null, ProcessedPriceData | null]>();
  for (let h = 0; h < HEATMAP.HOURS; h++) slotsByHour.set(h, [null, null]);
  for (const slot of data) {
    const [h, m] = slot.time.split(':').map(Number);
    const pair = slotsByHour.get(h);
    if (pair) pair[m === 0 ? 0 : 1] = slot;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div />
        <Text size="xs" c="dimmed" ta="center" ff="monospace" fw={600} tt="uppercase" style={{ letterSpacing: 0.5 }}>
          :00
        </Text>
        <Text size="xs" c="dimmed" ta="center" ff="monospace" fw={600} tt="uppercase" style={{ letterSpacing: 0.5 }}>
          :30
        </Text>
      </div>

      <div ref={containerRef} className={styles.scrollArea}>
        {Array.from({ length: HEATMAP.HOURS }, (_, hour) => {
          const [s0, s1] = slotsByHour.get(hour)!;
          const isCurrent = s0?.isCurrentPeriod || s1?.isCurrentPeriod;

          return (
            <div key={hour} ref={isCurrent ? currentRowRef : undefined} className={styles.row}>
              <div className={styles.hourLabel}>
                <Text size="xs" c="dimmed" ff="monospace" lh={1}>
                  {String(hour).padStart(2, '0')}
                </Text>
              </div>

              {[s0, s1].map((slot, col) =>
                slot ? (
                  <div
                    key={col}
                    className={`${styles.cell} ${slot.isCurrentPeriod ? styles.current : ''}`}
                    style={{ background: getPriceColor(slot.priceIncVat, slot.isCurrentPeriod) }}
                  >
                    <Text fw={700} ff="monospace" className={styles.cellPrice}>
                      {slot.priceIncVat.toFixed(1)}p
                    </Text>
                  </div>
                ) : (
                  <div key={col} className={styles.cellEmpty} />
                ),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
