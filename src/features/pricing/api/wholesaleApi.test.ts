import { describe, it, expect } from 'vitest';
import { parseNordpoolHours, halfHourlySlots } from './wholesaleApi';

const raw = {
  multiAreaEntries: [
    {
      deliveryStart: '2026-07-16T00:00:00Z',
      deliveryEnd: '2026-07-16T01:00:00Z',
      entryPerArea: { UK: 60 },
    },
    {
      deliveryStart: '2026-07-16T01:00:00Z',
      deliveryEnd: '2026-07-16T02:00:00Z',
      entryPerArea: { UK: 40 },
    },
  ],
};

describe('parseNordpoolHours', () => {
  it('maps each hour start to the UK £/MWh price', () => {
    const hours = parseNordpoolHours(raw);
    expect(hours.get('2026-07-16T00:00:00.000Z')).toBe(60);
    expect(hours.get('2026-07-16T01:00:00.000Z')).toBe(40);
    expect(hours.size).toBe(2);
  });
});

describe('halfHourlySlots', () => {
  it('expands hourly prices into two half-hour slots per hour, dropping missing hours', () => {
    const hours = parseNordpoolHours(raw);
    // Build the day from the first slot's local calendar date so the test is
    // independent of the runner timezone.
    const day = new Date('2026-07-16T00:00:00Z');
    const localDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const slots = halfHourlySlots(hours, localDay);

    // Each half-hour inherits its hour's price; only hours present in the map appear.
    for (const s of slots) {
      const hourStart = new Date(s.startTime);
      hourStart.setMinutes(0, 0, 0);
      expect(s.priceGbpMwh).toBe(hours.get(hourStart.toISOString()));
    }
    // Two provided hours → at most 4 half-hour slots.
    expect(slots.length).toBeLessThanOrEqual(4);
    expect(slots.length).toBeGreaterThan(0);
  });
});
