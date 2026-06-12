export const PRICE_THRESHOLDS = {
  FREE: 0,
  LOW: 10,
  HIGH: 25,
} as const;

export const PRICE_COLORS = {
  free: '#14b8a6',
  low: '#22c55e',
  normal: '#f59e0b',
  high: '#ef4444',
  current: '#7c3aed',
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

export const STAT_GRADIENTS = {
  teal: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
  blue: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  red: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  orange: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  violet: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  yellow: 'linear-gradient(135deg, #ca8a04 0%, #eab308 100%)',
} as const;
