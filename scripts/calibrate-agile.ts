import { REGIONS } from '../src/features/pricing/schemas';

// Calibrates AGILE-24-10-01 per-region coefficients for the model
//   agile_incVat = base + multiplier * wholesale_pPerKwh + (peak ? peakUplift : 0)
// against the real N2EX day-ahead hourly auction (Nord Pool) and Octopus's
// confirmed rates, pooled over several settled days. Peak = 16:00–19:00
// Europe/London. Run: pnpm tsx scripts/calibrate-agile.ts

const NP = 'https://dataportal-api.nordpoolgroup.com/api/DayAheadPrices';
const OCTO =
  'https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs';

// Settled days to pool (plus their neighbours for hour coverage).
const DAYS = [
  '2026-06-24',
  '2026-06-25',
  '2026-06-26',
  '2026-06-27',
  '2026-06-28',
  '2026-06-29',
];

function londonHour(iso: string): number {
  return +new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace('24', '00');
}

async function hourMap(date: string): Promise<Map<string, number>> {
  const r = (await (
    await fetch(
      `${NP}?date=${date}&market=N2EX_DayAhead&deliveryArea=UK&currency=GBP`,
      { headers: { Accept: 'application/json' } }
    )
  ).json()) as {
    multiAreaEntries: { deliveryStart: string; entryPerArea: { UK: number } }[];
  };
  const m = new Map<string, number>();
  for (const e of r.multiAreaEntries)
    m.set(new Date(e.deliveryStart).toISOString(), e.entryPerArea.UK / 10); // p/kWh
  return m;
}

function fit(rows: { w: number; peak: number; y: number }[]) {
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (const r of rows) {
    const x = [1, r.w, r.peak];
    for (let i = 0; i < 3; i++) {
      b[i] += x[i] * r.y;
      for (let j = 0; j < 3; j++) M[i][j] += x[i] * x[j];
    }
  }
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let k = i + 1; k < 3; k++)
      if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let k = i + 1; k < 3; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j < 3; j++) M[k][j] -= f * M[i][j];
      b[k] -= f * b[i];
    }
  }
  const s = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let t = b[i];
    for (let j = i + 1; j < 3; j++) t -= M[i][j] * s[j];
    s[i] = t / M[i][i];
  }
  return { base: s[0], multiplier: s[1], peakUplift: s[2] };
}

// Pool wholesale across all needed days (+ neighbours for UTC-hour coverage).
const wh = new Map<string, number>();
const allDays = new Set<string>();
for (const d of DAYS) {
  const dt = new Date(d + 'T00:00:00Z');
  for (const off of [-1, 0, 1]) {
    const nd = new Date(dt.getTime() + off * 86_400_000)
      .toISOString()
      .slice(0, 10);
    allDays.add(nd);
  }
}
for (const d of allDays) for (const [k, v] of await hourMap(d)) wh.set(k, v);

const out: Record<string, unknown> = {};
for (const region of REGIONS) {
  const tariff = `E-1R-AGILE-24-10-01-${region}`;
  const rows: { w: number; peak: number; y: number }[] = [];
  for (const day of DAYS) {
    const from = `${day}T00:00:00Z`;
    const to = `${day}T23:59:59Z`;
    const or = (await (
      await fetch(
        `${OCTO}/${tariff}/standard-unit-rates/?period_from=${from}&period_to=${to}&page_size=100`
      )
    ).json()) as { results: { valid_from: string; value_inc_vat: number }[] };
    for (const r of or.results) {
      const dd = new Date(r.valid_from);
      const hk = new Date(
        Date.UTC(
          dd.getUTCFullYear(),
          dd.getUTCMonth(),
          dd.getUTCDate(),
          dd.getUTCHours()
        )
      ).toISOString();
      const w = wh.get(hk);
      if (w === undefined) continue;
      const lh = londonHour(r.valid_from);
      rows.push({ w, peak: lh >= 16 && lh < 19 ? 1 : 0, y: r.value_inc_vat });
    }
  }
  const c = fit(rows);
  let mr = 0;
  for (const r of rows) {
    const pred = c.base + c.multiplier * r.w + r.peak * c.peakUplift;
    mr = Math.max(mr, Math.abs(pred - r.y));
  }
  out[region] = {
    base: Number(c.base.toFixed(3)),
    multiplier: Number(c.multiplier.toFixed(4)),
    peakUplift: Number(c.peakUplift.toFixed(3)),
    n: rows.length,
    maxResidual: Number(mr.toFixed(2)),
  };
}
console.log(JSON.stringify(out, null, 2));
