import wretch from 'wretch';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  octopusResponseSchema,
  standingChargeResponseSchema,
  type OctopusRate,
  type Region,
  type ProcessedSlot,
  type PriceStats,
  type DailyPrices,
} from '../schemas';
import {
  PRODUCTS_BASE,
  fetchAllPages,
  currentStandingCharge,
} from './octopusClient';
import {
  completeNextDay,
  electricityTariffCode,
  expandToSlots,
  hasIntradayVariation,
  isAgileProduct,
} from './tariffs';

dayjs.extend(isBetween);

/**
 * Half-hourly unit rates for an arbitrary period on any single-register
 * tariff, sorted ascending. Rate windows of any width are expanded to slots.
 */
export async function fetchRates(
  region: Region,
  product: string,
  from: Date,
  to: Date
): Promise<OctopusRate[]> {
  const tariff = electricityTariffCode(product, region);
  const params = new URLSearchParams({
    period_from: from.toISOString(),
    period_to: to.toISOString(),
    // Octopus accepts up to 1500/page, so 30 days of half-hours (1440) fit in
    // one request instead of 15 sequential pages.
    page_size: '1500',
  });
  const url = `${PRODUCTS_BASE}/${product}/electricity-tariffs/${tariff}/standard-unit-rates/?${params}`;

  const windows = await fetchAllPages(url, octopusResponseSchema);
  return expandToSlots(windows, from, to);
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
  dayType: 'today' | 'tomorrow',
  projected = false
): DailyPrices {
  const processed = processRates(rates, dayType);
  return {
    date: dayjs(date).format('YYYY-MM-DD'),
    rates: processed,
    stats: calcStats(processed),
    ...(projected && { projected }),
  };
}

export async function fetchDailyRates(region: Region, product: string) {
  const today = dayjs();
  const tomorrow = today.add(1, 'day');

  const [todayRates, tomorrowRates] = await Promise.all([
    fetchRates(
      region,
      product,
      today.startOf('day').toDate(),
      today.endOf('day').toDate()
    ),
    fetchRates(
      region,
      product,
      tomorrow.startOf('day').toDate(),
      tomorrow.endOf('day').toDate()
    ),
  ]);

  // Time-of-use tariffs (Go, Cosy…) repeat daily but Octopus may not have
  // listed all of tomorrow yet. Agile is never projected (its prices are the
  // news) and flat/daily tariffs (Tracker) have no pattern to repeat.
  let tomorrowFinal = tomorrowRates;
  let projected = false;
  if (
    !isAgileProduct(product) &&
    hasIntradayVariation(todayRates.map((r) => r.value_inc_vat))
  ) {
    ({ rates: tomorrowFinal, projected } = completeNextDay(
      tomorrowRates,
      todayRates,
      tomorrow.startOf('day').toDate(),
      tomorrow.endOf('day').toDate()
    ));
  }

  return {
    today: buildDailyPrices(todayRates, today.toDate(), 'today'),
    tomorrow: buildDailyPrices(
      tomorrowFinal,
      tomorrow.toDate(),
      'tomorrow',
      projected
    ),
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
  product: string,
  days = 30
): Promise<DailyAverage[]> {
  const to = dayjs().endOf('day');
  const from = to.subtract(days, 'day').startOf('day');
  const rates = await fetchRates(region, product, from.toDate(), to.toDate());
  // Exclude today: it is incomplete and already shown on the Today tab
  const todayStr = dayjs().format('YYYY-MM-DD');
  return aggregateDailyAverages(rates).filter((d) => d.date < todayStr);
}

export async function fetchElecStandingCharge(
  region: Region,
  product: string
): Promise<number | null> {
  const tariff = electricityTariffCode(product, region);
  const url = `${PRODUCTS_BASE}/${product}/electricity-tariffs/${tariff}/standing-charges/?page_size=10`;
  const raw = await wretch(url).get().json();
  const page = standingChargeResponseSchema.parse(raw);
  return currentStandingCharge(page.results);
}
