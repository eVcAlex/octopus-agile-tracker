import wretch from 'wretch';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  octopusResponseSchema,
  standingChargeResponseSchema,
  type StandingCharge,
  type OctopusRate,
  type Region,
  type ProcessedSlot,
  type PriceStats,
  type DailyPrices,
} from '../schemas';

dayjs.extend(isBetween);

const API_BASE = 'https://api.octopus.energy/v1/products';
const PRODUCT = 'AGILE-24-10-01';

function tariffCode(region: Region) {
  return `E-1R-${PRODUCT}-${region}`;
}

async function fetchRates(
  region: Region,
  from: Date,
  to: Date
): Promise<OctopusRate[]> {
  const tariff = tariffCode(region);
  const url = `${API_BASE}/${PRODUCT}/electricity-tariffs/${tariff}/standard-unit-rates/`;
  const params = new URLSearchParams({
    period_from: from.toISOString(),
    period_to: to.toISOString(),
    page_size: '100',
  });

  let allRates: OctopusRate[] = [];
  let nextUrl: string | null = `${url}?${params}`;

  while (nextUrl) {
    const raw = await wretch(nextUrl).get().json();
    const page = octopusResponseSchema.parse(raw);
    allRates = [...allRates, ...page.results];
    nextUrl = page.next;
  }

  return allRates.sort(
    (a, b) => dayjs(a.valid_from).unix() - dayjs(b.valid_from).unix()
  );
}

/** Raw Agile rates for an arbitrary period (used by Usage spend calc) */
export async function fetchRawRates(
  region: Region,
  from: Date,
  to: Date
): Promise<OctopusRate[]> {
  return fetchRates(region, from, to);
}

export function processRates(
  rates: OctopusRate[],
  dayType: 'today' | 'tomorrow'
): ProcessedSlot[] {
  const now = dayjs();
  return rates.map((rate, i) => {
    const from = dayjs(rate.valid_from);
    const to = dayjs(rate.valid_to);
    return {
      id: `${rate.valid_from}-${i}`,
      time: from.format('HH:mm'),
      date: from.format('YYYY-MM-DD'),
      priceExcVat: rate.value_exc_vat,
      priceIncVat: rate.value_inc_vat,
      validFrom: from.toDate(),
      validTo: to.toDate(),
      isCurrentPeriod: dayType === 'today' && now.isBetween(from, to),
      dayType,
    };
  });
}

export function calcStats(rates: ProcessedSlot[]): PriceStats {
  const prices = rates.map((r) => r.priceIncVat).filter((p) => !isNaN(p));
  return {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    average: prices.length
      ? prices.reduce((s, p) => s + p, 0) / prices.length
      : 0,
    current: rates.find((r) => r.isCurrentPeriod)?.priceIncVat,
  };
}

function buildDailyPrices(
  rates: OctopusRate[],
  date: Date,
  dayType: 'today' | 'tomorrow'
): DailyPrices {
  const processed = processRates(rates, dayType);
  return {
    date: dayjs(date).format('YYYY-MM-DD'),
    rates: processed,
    stats: calcStats(processed),
  };
}

export async function fetchDailyRates(region: Region) {
  const today = dayjs();
  const tomorrow = today.add(1, 'day');

  const [todayRates, tomorrowRates] = await Promise.all([
    fetchRates(
      region,
      today.startOf('day').toDate(),
      today.endOf('day').toDate()
    ),
    fetchRates(
      region,
      tomorrow.startOf('day').toDate(),
      tomorrow.endOf('day').toDate()
    ),
  ]);

  return {
    today: buildDailyPrices(todayRates, today.toDate(), 'today'),
    tomorrow: buildDailyPrices(tomorrowRates, tomorrow.toDate(), 'tomorrow'),
  };
}

export interface DailyAverage {
  date: string;
  min: number;
  max: number;
  average: number;
}

export function aggregateDailyAverages(rates: OctopusRate[]): DailyAverage[] {
  const byDate = new Map<string, number[]>();
  for (const r of rates) {
    const date = dayjs(r.valid_from).format('YYYY-MM-DD');
    const bucket = byDate.get(date);
    if (bucket) bucket.push(r.value_inc_vat);
    else byDate.set(date, [r.value_inc_vat]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, prices]) => ({
      date,
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((s, p) => s + p, 0) / prices.length,
    }));
}

export async function fetchHistory(
  region: Region,
  days = 30
): Promise<DailyAverage[]> {
  const to = dayjs().endOf('day');
  const from = to.subtract(days, 'day').startOf('day');
  const rates = await fetchRates(region, from.toDate(), to.toDate());
  // Exclude today: it is incomplete and already shown on the Today tab
  const todayStr = dayjs().format('YYYY-MM-DD');
  return aggregateDailyAverages(rates).filter((d) => d.date < todayStr);
}

export function currentStandingCharge(
  results: StandingCharge[]
): number | null {
  const now = new Date();
  const current = results
    .filter(
      (r) => r.payment_method === 'DIRECT_DEBIT' || r.payment_method == null
    )
    .find(
      (r) =>
        new Date(r.valid_from) <= now &&
        (r.valid_to === null || new Date(r.valid_to) > now)
    );
  return current?.value_inc_vat ?? null;
}

export async function fetchElecStandingCharge(
  region: Region
): Promise<number | null> {
  const tariff = tariffCode(region);
  const url = `${API_BASE}/${PRODUCT}/electricity-tariffs/${tariff}/standing-charges/?page_size=10`;
  const raw = await wretch(url).get().json();
  const page = standingChargeResponseSchema.parse(raw);
  return currentStandingCharge(page.results);
}
