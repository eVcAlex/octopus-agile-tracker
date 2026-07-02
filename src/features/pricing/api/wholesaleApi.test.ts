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
    // dayStart is an exact instant (UK midnight in production); a UTC hour
    // boundary keeps the test independent of the runner timezone.
    const dayStart = new Date('2026-07-16T00:00:00Z');
    const slots = halfHourlySlots(hours, dayStart);

    // Two provided hours → exactly 4 half-hour slots at :00/:30 offsets.
    expect(slots.length).toBe(4);
    expect(slots.map((s) => s.startTime.toISOString())).toEqual([
      '2026-07-16T00:00:00.000Z',
      '2026-07-16T00:30:00.000Z',
      '2026-07-16T01:00:00.000Z',
      '2026-07-16T01:30:00.000Z',
    ]);
    // Each half-hour inherits its containing hour's price.
    expect(slots.map((s) => s.priceGbpMwh)).toEqual([60, 60, 40, 40]);
  });
});
