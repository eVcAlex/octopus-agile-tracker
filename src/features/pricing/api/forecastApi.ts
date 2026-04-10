import wretch from 'wretch';
import {
  agilePredictResponseSchema,
  type Region,
  type ForecastPrice,
  type ForecastDay,
  type ForecastData,
} from '../schemas';

const PROXY_BASE = '/proxy/forecast';

function groupByDay(prices: ForecastPrice[]): ForecastDay[] {
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
          : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
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
