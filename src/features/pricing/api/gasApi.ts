import wretch from 'wretch';
import dayjs from 'dayjs';
import {
  octopusResponseSchema,
  standingChargeResponseSchema,
  type OctopusRate,
  type Region,
  type GasRate,
} from '../schemas';
import { currentStandingCharge } from './octopusApi';

const API_BASE = 'https://api.octopus.energy/v1/products';

function gasTariffCode(region: Region, productCode: string) {
  return `G-1R-${productCode}-${region}`;
}

async function fetchRates(
  productCode: string,
  region: Region,
  from: Date
): Promise<OctopusRate[]> {
  const tariff = gasTariffCode(region, productCode);
  const url = `${API_BASE}/${productCode}/gas-tariffs/${tariff}/standard-unit-rates/`;
  const params = new URLSearchParams({
    period_from: from.toISOString(),
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

  return allRates;
}

export async function fetchGasRates(
  region: Region,
  productCode: string
): Promise<GasRate[]> {
  // Fetch 30 days back and 2 days ahead so tomorrow's rate shows when published
  const from = dayjs().subtract(30, 'day').startOf('day').toDate();
  const raw = await fetchRates(productCode, region, from);
  const now = new Date();

  return raw
    .filter(
      (r) => r.payment_method === 'DIRECT_DEBIT' || r.payment_method === null
    )
    .map((r) => {
      const validFrom = new Date(r.valid_from);
      const validTo = r.valid_to ? new Date(r.valid_to) : null;
      return {
        date: dayjs(r.valid_from).format('YYYY-MM-DD'),
        unitRateIncVat: r.value_inc_vat,
        unitRateExcVat: r.value_exc_vat,
        validFrom,
        validTo,
        isCurrent: validFrom <= now && (validTo === null || validTo > now),
      };
    })
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
}

export async function fetchGasStandingCharge(
  region: Region,
  productCode: string
): Promise<number | null> {
  const tariff = gasTariffCode(region, productCode);
  const url = `${API_BASE}/${productCode}/gas-tariffs/${tariff}/standing-charges/?page_size=10`;
  const raw = await wretch(url).get().json();
  const page = standingChargeResponseSchema.parse(raw);
  return currentStandingCharge(page.results);
}
