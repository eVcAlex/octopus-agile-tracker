import wretch from 'wretch';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  octopusResponseSchema,
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
