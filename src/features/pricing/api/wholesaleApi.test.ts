import { describe, it, expect } from 'vitest';
import { selectWholesaleSlots } from './wholesaleApi';

const raw = {
  data: [
    { startTime: '2026-07-02T00:30:00Z', dataProvider: 'N2EXMIDP', settlementDate: '2026-07-02', settlementPeriod: 2, price: 55, volume: 10 },
    { startTime: '2026-07-02T00:00:00Z', dataProvider: 'N2EXMIDP', settlementDate: '2026-07-02', settlementPeriod: 1, price: 60, volume: 10 },
    { startTime: '2026-07-02T00:00:00Z', dataProvider: 'APXMIDP', settlementDate: '2026-07-02', settlementPeriod: 1, price: 99, volume: 10 },
    { startTime: '2026-07-02T01:00:00Z', dataProvider: 'APXMIDP', settlementDate: '2026-07-02', settlementPeriod: 3, price: 40, volume: 10 },
  ],
};

describe('selectWholesaleSlots', () => {
  it('prefers N2EX, falls back to APX, sorts ascending', () => {
    const slots = selectWholesaleSlots(raw);
    expect(slots.map((s) => s.priceGbpMwh)).toEqual([60, 55, 40]);
    expect(slots[0].startTime).toEqual(new Date('2026-07-02T00:00:00Z'));
    expect(slots[2].startTime).toEqual(new Date('2026-07-02T01:00:00Z'));
  });
});
