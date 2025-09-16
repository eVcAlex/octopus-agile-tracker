export interface OctopusAgileRate {
  value_exc_vat: number;
  value_inc_vat: number;
  valid_from: string;
  valid_to: string;
  payment_method: string | null;
}

export interface OctopusApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: OctopusAgileRate[];
}

export interface ProcessedPriceData {
  id: string;
  time: string;
  date: string;
  priceExcVat: number;
  priceIncVat: number;
  validFrom: Date;
  validTo: Date;
  isCurrentPeriod: boolean;
  dayType: "today" | "tomorrow";
}

export interface PriceStats {
  min: number;
  max: number;
  average: number;
  current?: number;
}

export interface DailyPriceData {
  date: string;
  rates: ProcessedPriceData[];
  stats: PriceStats;
}

export const OctopusRegion = {
  EASTERN_ENGLAND: "A",
  EAST_MIDLANDS: "B",
  LONDON: "C",
  MERSEYSIDE_NORTH_WALES: "D",
  WEST_MIDLANDS: "E",
  NORTH_EASTERN_ENGLAND: "F",
  NORTH_WESTERN_ENGLAND: "G",
  SOUTHERN_ENGLAND: "H",
  SOUTH_EASTERN_ENGLAND: "J",
  SOUTH_WESTERN_ENGLAND: "K",
  YORKSHIRE: "L",
  SOUTH_WALES: "M",
  SCOTLAND: "N",
  SOUTH_SCOTLAND: "P",
} as const;

export type OctopusRegion = (typeof OctopusRegion)[keyof typeof OctopusRegion];
