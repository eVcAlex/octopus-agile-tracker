import wretch from 'wretch';
import dayjs from 'dayjs';
import {
  agilePredictResponseSchema,
  type Region,
  type ForecastPrice,
  type ForecastDay,
  type ForecastData,
  type DailyPrices,
} from '../schemas';
import { calcStats } from './octopusApi';

const PROXY_BASE = '/proxy/forecast';

/**
 * The forecast without tomorrow's day. The Tomorrow tab always covers
 * tomorrow (estimate or forecast fallback), so the Forecast tab shouldn't
 * duplicate it.
 */
export function withoutTomorrow(
  forecast: ForecastData | null
): ForecastData | null {
  if (!forecast) return null;
  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
  return {
    ...forecast,
    days: forecast.days.filter((d) => d.date !== tomorrowStr),
  };
}

/**
 * Tomorrow's AgilePredict day shaped as DailyPrices, so the Tomorrow tab can
 * fall back to the ML forecast before the day-ahead auction clears (~midday).
 * Returns null when the forecast doesn't cover tomorrow.
 */
export function tomorrowForecastAsDailyPrices(
  forecast: ForecastData | null
): DailyPrices | null {
  if (!forecast) return null;
  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const day = forecast.days.find((d) => d.date === tomorrowStr);
  if (!day || !day.slots.length) return null;

  const rates = day.slots.map((p, i) => {
    const from = new Date(p.date_time);
    return {
      id: `fc-${p.date_time}-${i}`,
      time: dayjs(from).format('HH:mm'),
      date: day.date,
      priceExcVat: p.agile_pred / 1.05,
      priceIncVat: p.agile_pred,
      validFrom: from,
      validTo: new Date(from.getTime() + 30 * 60_000),
      isCurrentPeriod: false,
      dayType: 'tomorrow' as const,
    };
  });

  return { date: day.date, rates, stats: calcStats(rates) };
}

export function groupByDay(prices: ForecastPrice[]): ForecastDay[] {
  const byDate = new Map<string, ForecastPrice[]>();

  for (const p of prices) {
    const date = p.date_time.slice(0, 10);
    const bucket = byDate.get(date);
    if (bucket) bucket.push(p);
    else byDate.set(date, [p]);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([date]) => {
      const d = new Date(date + 'T00:00:00');
      return Math.round((d.getTime() - today.getTime()) / 86_400_000) >= 1;
    })
    .map(([date, slots]) => {
      const d = new Date(date + 'T00:00:00');
      const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      const label =
        diff === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
      return { date, label, slots };
    });
}

export async function fetchForecast(region: Region): Promise<ForecastData> {
  const raw = await wretch(`${PROXY_BASE}/${region}`).get().json();
  const data = agilePredictResponseSchema.parse(raw);

  if (!data.length || !data[0].prices.length) {
    throw new Error('No forecast data available');
  }

  const forecast = data[0];
  return {
    createdAt: forecast.created_at,
    region,
    days: groupByDay(forecast.prices),
  };
}
