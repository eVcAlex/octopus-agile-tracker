export const PRICE_THRESHOLDS = {
  FREE: 0,
  LOW: 10,
  HIGH: 25,
} as const;

export const PRICE_COLORS = {
  free: 'var(--price-free)',
  low: 'var(--price-low)',
  normal: 'var(--price-normal)',
  high: 'var(--price-high)',
  current: 'var(--price-current)',
} as const;

// Secondary stat-card / gas accents that don't map to a price band.
export const STAT_ACCENTS = {
  blue: 'var(--stat-blue)',
  orange: 'var(--stat-orange)',
  yellow: 'var(--stat-yellow)',
} as const;

export const MANTINE_COLORS: Record<string, string | undefined> = {
  free: 'teal',
  low: 'green',
  normal: undefined,
  high: 'red',
  current: 'violet',
} as const;

export const CHART = {
  HEIGHT: 200,
  Y_AXIS_WIDTH: 36,
  GRID_INTERVAL: 10,
  TIME_LABEL_INTERVAL: 4,
} as const;

export const HEATMAP = {
  CELL_HEIGHT: 34,
  CELL_RADIUS: 7,
  HOURS: 24,
} as const;

export const TABLE = {
  MAX_HEIGHT: '60vh',
  SCROLL_OFFSET: 80,
  PAST_OPACITY: 0.35,
} as const;

export const CHART_LEGEND = [
  { color: PRICE_COLORS.free, label: 'Free (\u22640p)' },
  { color: PRICE_COLORS.low, label: 'Low (<10p)' },
  { color: PRICE_COLORS.normal, label: 'Normal' },
  { color: PRICE_COLORS.high, label: 'High (>25p)' },
] as const;

