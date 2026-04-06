import wretch from 'wretch';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween'; // plugin for range checks
import type {
  OctopusApiResponse,
  OctopusAgileRate,
  ProcessedPriceData,
  DailyPriceData,
  PriceStats,
  OctopusRegion,
} from '../types';

dayjs.extend(isBetween);

const OCTOPUS_API_BASE = 'https://api.octopus.energy/v1/products';
const AGILE_PRODUCT_CODE = 'AGILE-24-10-01';

export class OctopusApiService {
  private region: OctopusRegion;

  constructor(region: OctopusRegion = 'P') {
    this.region = region;
  }

  async fetchAgileRates(
    periodFrom: Date,
    periodTo: Date
  ): Promise<OctopusAgileRate[]> {
    const tariffCode = `E-1R-${AGILE_PRODUCT_CODE}-${this.region}`;
    const baseUrl = `${OCTOPUS_API_BASE}/${AGILE_PRODUCT_CODE}/electricity-tariffs/${tariffCode}/standard-unit-rates/`;

    const params = new URLSearchParams({
      period_from: periodFrom.toISOString(),
      period_to: periodTo.toISOString(),
      page_size: '100',
    });

    try {
      const response = await wretch(`${baseUrl}?${params.toString()}`)
        .get()
        .json<OctopusApiResponse>();

      let allRates = response.results;

      let nextUrl = response.next;
      while (nextUrl) {
        const nextResponse = await wretch(nextUrl)
          .get()
          .json<OctopusApiResponse>();
        allRates = [...allRates, ...nextResponse.results];
        nextUrl = nextResponse.next;
      }

      return allRates.sort(
        (a, b) => dayjs(a.valid_from).unix() - dayjs(b.valid_from).unix()
      );
    } catch (error) {
      console.error('Error fetching Octopus Agile rates:', error);
      return [];
    }
  }

  private processDailyRates(
    rates: OctopusAgileRate[],
    date: Date,
    dayType: 'today' | 'tomorrow'
  ): DailyPriceData {
    const now = dayjs();

    const processedRates: ProcessedPriceData[] = rates.map((rate, index) => {
      const validFrom = dayjs(rate.valid_from);
      const validTo = dayjs(rate.valid_to);

      return {
        id: `${rate.valid_from}-${index}`,
        time: validFrom.format('HH:mm'),
        date: validFrom.format('YYYY-MM-DD'),
        priceExcVat: rate.value_exc_vat,
        priceIncVat: rate.value_inc_vat,
        validFrom: validFrom.toDate(),
        validTo: validTo.toDate(),
        isCurrentPeriod:
          dayType === 'today' && now.isBetween(validFrom, validTo),
        dayType,
      };
    });

    const prices = processedRates
      .map((r) => r.priceIncVat)
      .filter((p) => !isNaN(p));
    const stats: PriceStats = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      average:
        prices.length > 0
          ? prices.reduce((sum, p) => sum + p, 0) / prices.length
          : 0,
      current: processedRates.find((r) => r.isCurrentPeriod)?.priceIncVat,
    };

    return {
      date: dayjs(date).format('YYYY-MM-DD'),
      rates: processedRates,
      stats,
    };
  }

  async getTodayRates(): Promise<DailyPriceData> {
    const today = dayjs();
    const startOfToday = today.startOf('day').toDate();
    const endOfToday = today.endOf('day').toDate();

    const rates = await this.fetchAgileRates(startOfToday, endOfToday);
    return this.processDailyRates(rates, today.toDate(), 'today');
  }

  async getTomorrowRates(): Promise<DailyPriceData> {
    const tomorrow = dayjs().add(1, 'day');
    const startOfTomorrow = tomorrow.startOf('day').toDate();
    const endOfTomorrow = tomorrow.endOf('day').toDate();

    const rates = await this.fetchAgileRates(startOfTomorrow, endOfTomorrow);
    return this.processDailyRates(rates, tomorrow.toDate(), 'tomorrow');
  }

  async getTodayAndTomorrowRates(): Promise<{
    today: DailyPriceData;
    tomorrow: DailyPriceData;
  }> {
    try {
      const [today, tomorrow] = await Promise.all([
        this.getTodayRates(),
        this.getTomorrowRates(),
      ]);
      return { today, tomorrow };
    } catch (error) {
      console.error('Error fetching rates:', error);
      throw error;
    }
  }

  setRegion(region: OctopusRegion): void {
    this.region = region;
  }

  getCurrentRegion(): OctopusRegion {
    return this.region;
  }
}

export const octopusApi = new OctopusApiService();
