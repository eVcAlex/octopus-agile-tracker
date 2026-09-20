import wretch from 'wretch';
import {
  octopusResponseSchema,
  type OctopusRate,
  type Region,
} from '../schemas.js';
import { ukDayBounds } from './ukTime.js';

const API_BASE = 'https://api.octopus.energy/v1/products';
const PRODUCT = 'AGILE-24-10-01';

export async function fetchRates(
  region: Region,
  from: Date,
  to: Date
): Promise<OctopusRate[]> {
  const tariff = `E-1R-${PRODUCT}-${region}`;
  const params = new URLSearchParams({
    period_from: from.toISOString(),
    period_to: to.toISOString(),
    page_size: '100',
  });

  let all: OctopusRate[] = [];
  let nextUrl: string | null =
    `${API_BASE}/${PRODUCT}/electricity-tariffs/${tariff}/standard-unit-rates/?${params}`;

  while (nextUrl) {
    const raw: unknown = await wretch(nextUrl).get().json();
    const page = octopusResponseSchema.parse(raw);
    all = [...all, ...page.results];
    nextUrl = page.next;
  }

  return all.sort(
    (a, b) =>
      new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime()
  );
}

export function fetchTomorrowRates(region: Region): Promise<OctopusRate[]> {
  const { from, to } = ukDayBounds(1);
  return fetchRates(region, from, to);
}

export function fetchTodayRates(region: Region): Promise<OctopusRate[]> {
  const { from, to } = ukDayBounds(0);
  return fetchRates(region, from, to);
}
