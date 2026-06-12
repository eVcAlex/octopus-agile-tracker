import { describe, it, expect } from 'vitest';
import {
  getPriceLevel,
  getPriceColor,
  getStatusBadge,
  formatPrice,
  formatDuration,
} from './utils';
import { PRICE_COLORS } from './constants';

describe('getPriceLevel', () => {
  it('classifies free at or below 0p', () => {
    expect(getPriceLevel(0)).toBe('free');
    expect(getPriceLevel(-2.5)).toBe('free');
  });

  it('classifies low below 10p', () => {
    expect(getPriceLevel(0.01)).toBe('low');
    expect(getPriceLevel(9.99)).toBe('low');
  });

  it('classifies normal between 10p and 25p inclusive', () => {
    expect(getPriceLevel(10)).toBe('normal');
    expect(getPriceLevel(25)).toBe('normal');
  });

  it('classifies high above 25p', () => {
    expect(getPriceLevel(25.01)).toBe('high');
  });
});

describe('getPriceColor', () => {
  it('returns the current-period colour regardless of price', () => {
    expect(getPriceColor(50, true)).toBe(PRICE_COLORS.current);
  });

  it('returns the level colour otherwise', () => {
    expect(getPriceColor(50)).toBe(PRICE_COLORS.high);
    expect(getPriceColor(-1)).toBe(PRICE_COLORS.free);
  });
});

describe('getStatusBadge', () => {
  it('returns badges for free, low and high', () => {
    expect(getStatusBadge(-1)).toEqual({ label: 'FREE', color: 'teal' });
    expect(getStatusBadge(5)).toEqual({ label: 'LOW', color: 'green' });
    expect(getStatusBadge(30)).toEqual({ label: 'HIGH', color: 'red' });
  });

  it('returns null for normal prices', () => {
    expect(getStatusBadge(15)).toBeNull();
  });
});

describe('formatPrice', () => {
  it('formats to two decimal places with a p suffix', () => {
    expect(formatPrice(12.345)).toBe('12.35p');
    expect(formatPrice(-1.5)).toBe('-1.50p');
  });
});

describe('formatDuration', () => {
  it('formats sub-hour durations in minutes', () => {
    expect(formatDuration(0.5)).toBe('30m');
  });

  it('formats whole hours without minutes', () => {
    expect(formatDuration(2)).toBe('2h');
  });

  it('formats mixed durations', () => {
    expect(formatDuration(2.5)).toBe('2h 30m');
  });
});
