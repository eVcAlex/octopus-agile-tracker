import wretch from 'wretch';
import dayjs from 'dayjs';
import {
  octopusResponseSchema,
  standingChargeResponseSchema,
  type Region,
  type GasRate,
} from '../schemas';
import {
  PRODUCTS_BASE,
  fetchAllPages,
  isDirectDebit,
  isActiveNow,
  currentStandingCharge,
} from './octopusClient';

function gasTariffCode(region: Region, productCode: string) {
  return `G-1R-${productCode}-${region}`;
}

export async function fetchGasRates(
  region: Region,
  productCode: string
): Promise<GasRate[]> {
  // Fetch 30 days back so today/tomorrow and the 30-day history both have data.
  const from = dayjs().subtract(30, 'day').startOf('day').toDate();
  const tariff = gasTariffCode(region, productCode);
  const params = new URLSearchParams({
    period_from: from.toISOString(),
    // Octopus accepts up to 1500/page — keeps 30 days to a single request.
    page_size: '1500',
  });
  const url = `${PRODUCTS_BASE}/${productCode}/gas-tariffs/${tariff}/standard-unit-rates/?${params}`;

  const raw = await fetchAllPages(url, octopusResponseSchema);

  return raw
    .filter(isDirectDebit)
    .map((r) => ({
      date: dayjs(r.valid_from).format('YYYY-MM-DD'),
      unitRateIncVat: r.value_inc_vat,
      unitRateExcVat: r.value_exc_vat,
      validFrom: new Date(r.valid_from),
      validTo: r.valid_to ? new Date(r.valid_to) : null,
      isCurrent: isActiveNow(r),
    }))
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
}

/**
 * The rate in force at `at`. Rates are validity windows, so this works for any
 * tariff shape: Tracker (one row per day) and fixed/variable (one long row).
 */
export function gasRateAt(rates: GasRate[], at: Date): GasRate | null {
  return (
    rates.find(
      (r) => r.validFrom <= at && (r.validTo === null || r.validTo > at)
    ) ?? null
  );
}

/**
 * One entry per calendar day (newest first, ending today), each carrying the
 * rate in force that day. Lets fixed/variable tariffs chart as a flat line
 * rather than one bar per rate change.
 */
export function dailyGasRates(
  rates: GasRate[],
  days = 30,
  now: Date = new Date()
): GasRate[] {
  const daily: GasRate[] = [];
  for (let i = 0; i < days; i++) {
    const day = dayjs(now).subtract(i, 'day');
    const rate = gasRateAt(rates, day.hour(12).minute(0).toDate());
    // Keep today even before noon, when the day's rate may already be live.
    const effective = rate ?? (i === 0 ? gasRateAt(rates, now) : null);
    if (effective) {
      daily.push({
        ...effective,
        date: day.format('YYYY-MM-DD'),
        isCurrent: i === 0,
      });
    }
  }
  return daily;
}

export async function fetchGasStandingCharge(
  region: Region,
  productCode: string
): Promise<number | null> {
  const tariff = gasTariffCode(region, productCode);
  const url = `${PRODUCTS_BASE}/${productCode}/gas-tariffs/${tariff}/standing-charges/?page_size=10`;
  const raw = await wretch(url).get().json();
  const page = standingChargeResponseSchema.parse(raw);
  return currentStandingCharge(page.results);
}
