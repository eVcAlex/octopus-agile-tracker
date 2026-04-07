import wretch from 'wretch';
import type { OctopusRegion } from '../types';

const AGILE_PREDICT_BASE = '/api/forecast';

export interface ForecastPrice {
  date_time: string;
  agile_pred: number;
  agile_low: number;
  agile_high: number;
}

interface AgilePredict {
  name: string;
  created_at: string;
  prices: ForecastPrice[];
}

export interface ForecastDay {
  date: string;
  label: string;
  slots: ForecastPrice[];
}

export interface ForecastData {
  createdAt: string;
  region: OctopusRegion;
  days: ForecastDay[];
}

function groupByDay(prices: ForecastPrice[]): ForecastDay[] {
  const dayMap = new Map<string, ForecastPrice[]>();

  for (const p of prices) {
    const date = p.date_time.slice(0, 10); // YYYY-MM-DD
    const existing = dayMap.get(date);
    if (existing) {
      existing.push(p);
    } else {
      dayMap.set(date, [p]);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([date]) => {
      const d = new Date(date + 'T00:00:00');
      const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
      return diffDays >= 2; // Skip today & tomorrow — they have actual rates
    })
    .map(([date, slots]) => {
      const d = new Date(date + 'T00:00:00');
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      return { date, label, slots };
    });
}

export async function fetchForecast(region: OctopusRegion): Promise<ForecastData> {
  const data = await wretch(`${AGILE_PREDICT_BASE}/${region}/?format=json`)
    .get()
    .json<AgilePredict[]>();

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
