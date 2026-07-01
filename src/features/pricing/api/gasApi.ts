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
    page_size: '100',
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
