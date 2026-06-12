import { z } from 'zod';

// ─── Octopus API ───

export const octopusRateSchema = z.object({
  value_exc_vat: z.number(),
  value_inc_vat: z.number(),
  valid_from: z.string(),
  valid_to: z.string(),
  payment_method: z.string().nullable(),
});

export const octopusResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(octopusRateSchema),
});

export type OctopusRate = z.infer<typeof octopusRateSchema>;
export type OctopusResponse = z.infer<typeof octopusResponseSchema>;

// Standing charges share the rate shape but valid_to is null when open-ended
export const standingChargeSchema = z.object({
  value_exc_vat: z.number(),
  value_inc_vat: z.number(),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
  payment_method: z.string().nullable().optional(),
});

export const standingChargeResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(standingChargeSchema),
});

export type StandingCharge = z.infer<typeof standingChargeSchema>;

// ─── AgilePredict Forecast API ───

export const forecastPriceSchema = z.object({
  date_time: z.string(),
  agile_pred: z.number(),
  agile_low: z.number(),
  agile_high: z.number(),
});

export const agilePredictSchema = z.object({
  name: z.string(),
  created_at: z.string(),
  prices: z.array(forecastPriceSchema),
});

export const agilePredictResponseSchema = z.array(agilePredictSchema);

export type ForecastPrice = z.infer<typeof forecastPriceSchema>;
export type AgilePredict = z.infer<typeof agilePredictSchema>;

// ─── Region ───

export const REGIONS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
] as const;
export const regionSchema = z.enum(REGIONS);
export type Region = z.infer<typeof regionSchema>;

export const REGION_LABELS: Record<Region, string> = {
  A: 'Eastern England',
  B: 'East Midlands',
  C: 'London',
  D: 'Merseyside & N. Wales',
  E: 'West Midlands',
  F: 'North East England',
  G: 'North West England',
  H: 'Southern England',
  J: 'South East England',
  K: 'South West England',
  L: 'Yorkshire',
  M: 'South Wales',
  N: 'Scotland',
  P: 'South Scotland',
};

// ─── Processed types ───

export interface ProcessedSlot {
  id: string;
  time: string;
  date: string;
  priceExcVat: number;
  priceIncVat: number;
  validFrom: Date;
  validTo: Date;
  isCurrentPeriod: boolean;
  dayType: 'today' | 'tomorrow';
}

export interface PriceStats {
  min: number;
  max: number;
  average: number;
  current?: number;
}

export interface DailyPrices {
  date: string;
  rates: ProcessedSlot[];
  stats: PriceStats;
}

// ─── Gas ───

export interface GasRate {
  date: string;
  unitRateIncVat: number;
  unitRateExcVat: number;
  validFrom: Date;
  validTo: Date | null;
  isCurrent: boolean;
}

export interface ForecastDay {
  date: string;
  label: string;
  slots: ForecastPrice[];
}

export interface ForecastData {
  createdAt: string;
  region: Region;
  days: ForecastDay[];
}
