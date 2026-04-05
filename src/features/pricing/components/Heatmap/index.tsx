import { useEffect, useRef } from 'react';
import { Box, Text, useMantineColorScheme } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';

function getCellColor(slot: ProcessedPriceData): string {
  if (slot.isCurrentPeriod) return '#7c3aed';
  if (slot.priceIncVat <= 0) return '#0f9b8e';
  if (slot.priceIncVat < 10) return '#1a9e4a';
  if (slot.priceIncVat > 25) return '#e03131';
  return '#d08c00';
}

interface HeatmapViewProps {
  data: ProcessedPriceData[];
}

export const HeatmapView = ({ data }: HeatmapViewProps) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && currentRowRef.current) {
      // Scroll so current hour is near the top, with a small gap
      containerRef.current.scrollTop = currentRowRef.current.offsetTop - 48;
    }
  }, [data]);

  // Index slots by hour
  const slotsByHour: Record<number, [ProcessedPriceData | null, ProcessedPriceData | null]> = {};
  for (let h = 0; h < 24; h++) slotsByHour[h] = [null, null];
  for (const slot of data) {
    const [h, m] = slot.time.split(':').map(Number);
    if (h >= 0 && h < 24) slotsByHour[h][m === 0 ? 0 : 1] = slot;
  }

  return (
    <Box
      style={{
        borderRadius: 10,
        border: `1px solid ${dark ? '#2a2a2a' : '#eee'}`,
        overflow: 'hidden',
      }}
    >
      {/* Sticky column headers */}
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 1fr',
          gap: 3,
          padding: '8px 8px 4px',
          background: dark ? '#141414' : '#f8f9fa',
          borderBottom: `1px solid ${dark ? '#2a2a2a' : '#eee'}`,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <Box />
        <Text size="xs" c="dimmed" ta="center" ff="monospace" fw={600} tt="uppercase" style={{ letterSpacing: 0.5 }}>
          :00
        </Text>
        <Text size="xs" c="dimmed" ta="center" ff="monospace" fw={600} tt="uppercase" style={{ letterSpacing: 0.5 }}>
          :30
        </Text>
      </Box>

      {/* Scrollable hour rows */}
      <Box
        ref={containerRef}
        style={{
          maxHeight: '60vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '6px 8px 8px',
        }}
      >
        {Array.from({ length: 24 }, (_, hour) => {
          const [s0, s1] = slotsByHour[hour];
          const isCurrent = s0?.isCurrentPeriod || s1?.isCurrentPeriod;
          return (
            <Box
              key={hour}
              ref={isCurrent ? currentRowRef : undefined}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 1fr',
                gap: 3,
                marginBottom: 3,
              }}
            >
              {/* Hour label */}
              <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
                <Text size="xs" c="dimmed" ff="monospace" lh={1}>
                  {String(hour).padStart(2, '0')}
                </Text>
              </Box>

              {/* :00 and :30 cells */}
              {[s0, s1].map((slot, col) =>
                slot ? (
                  <Box
                    key={col}
                    style={{
                      height: 34,
                      borderRadius: 7,
                      background: getCellColor(slot),
                      opacity: slot.isCurrentPeriod ? 1 : 0.72,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: slot.isCurrentPeriod
                        ? `2px solid ${dark ? '#c4b5fd' : '#fff'}`
                        : '2px solid transparent',
                      boxShadow: slot.isCurrentPeriod ? '0 0 0 1px #7c3aed' : 'none',
                    }}
                  >
                    <Text
                      fw={700}
                      ff="monospace"
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        lineHeight: 1,
                        textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                      }}
                    >
                      {slot.priceIncVat.toFixed(1)}p
                    </Text>
                  </Box>
                ) : (
                  <Box
                    key={col}
                    style={{
                      height: 34,
                      borderRadius: 7,
                      background: dark ? '#1c1c1c' : '#f0f0f0',
                    }}
                  />
                ),
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
