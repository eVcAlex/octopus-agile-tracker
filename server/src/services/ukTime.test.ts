import { describe, it, expect } from 'vitest';
import { ukDateString, ukDayBounds } from './ukTime.js';

const iso = (d: Date) => d.toISOString();

describe('ukDayBounds', () => {
  it('starts the UK day at 23:00 UTC in summer', () => {
    const { from, to } = ukDayBounds(0, new Date('2026-09-19T12:00:00Z'));
    expect(iso(from)).toBe('2026-09-18T23:00:00.000Z');
    expect(iso(to)).toBe('2026-09-19T23:00:00.000Z');
  });

  it('starts the UK day at 00:00 UTC in winter', () => {
    const { from, to } = ukDayBounds(0, new Date('2026-12-19T12:00:00Z'));
    expect(iso(from)).toBe('2026-12-19T00:00:00.000Z');
    expect(iso(to)).toBe('2026-12-20T00:00:00.000Z');
  });

  it('moves to the next UK day at UK midnight, not UTC midnight', () => {
    // 23:30 UTC is 00:30 on the 20th in the UK during summer.
    const { from } = ukDayBounds(0, new Date('2026-09-19T23:30:00Z'));
    expect(iso(from)).toBe('2026-09-19T23:00:00.000Z');
  });

  it('offsets to tomorrow', () => {
    const { from, to } = ukDayBounds(1, new Date('2026-09-19T12:00:00Z'));
    expect(iso(from)).toBe('2026-09-19T23:00:00.000Z');
    expect(iso(to)).toBe('2026-09-20T23:00:00.000Z');
  });

  it('gives a 23 hour day when the clocks go forward', () => {
    const { from, to } = ukDayBounds(0, new Date('2026-03-29T12:00:00Z'));
    expect(iso(from)).toBe('2026-03-29T00:00:00.000Z');
    expect((to.getTime() - from.getTime()) / 3_600_000).toBe(23);
  });

  it('gives a 25 hour day when the clocks go back', () => {
    const { from, to } = ukDayBounds(0, new Date('2026-10-25T12:00:00Z'));
    expect(iso(from)).toBe('2026-10-24T23:00:00.000Z');
    expect((to.getTime() - from.getTime()) / 3_600_000).toBe(25);
  });
});

describe('ukDateString', () => {
  it('uses the UK date, not the UTC date', () => {
    expect(ukDateString(new Date('2026-09-19T23:00:00Z'))).toBe('2026-09-20');
    expect(ukDateString(new Date('2026-12-19T23:00:00Z'))).toBe('2026-12-19');
  });
});
