import wretch from 'wretch';
import { z } from 'zod';
import { PRODUCTS_BASE } from './octopusClient';

const productsResponseSchema = z.object({
  next: z.string().nullable(),
  results: z.array(
    z.object({
      code: z.string(),
      direction: z.string().optional(),
      display_name: z.string().optional(),
      is_prepay: z.boolean().optional(),
    })
  ),
});

export interface ElectricityProduct {
  code: string;
  label: string;
}

// Tracker is withdrawn from sale so the live list omits it, but existing
// customers are still on it and it prices daily like any other tariff.
const UNLISTED: ElectricityProduct[] = [
  { code: 'SILVER-25-09-02', label: 'Octopus Tracker' },
];

/** Import electricity products currently available to households. */
export async function fetchElectricityProducts(): Promise<
  ElectricityProduct[]
> {
  const products: ElectricityProduct[] = [];
  const params = new URLSearchParams({
    brand: 'OCTOPUS_ENERGY',
    is_business: 'false',
    available_at: new Date().toISOString(),
    page_size: '100',
  });
  let next: string | null = `${PRODUCTS_BASE}/?${params}`;

  while (next) {
    const raw: unknown = await wretch(next).get().json();
    const page = productsResponseSchema.parse(raw);
    for (const p of page.results) {
      if (p.direction === 'EXPORT' || p.is_prepay) continue;
      products.push({ code: p.code, label: p.display_name ?? p.code });
    }
    next = page.next;
  }

  for (const extra of UNLISTED) {
    if (!products.some((p) => p.code === extra.code)) products.push(extra);
  }
  return products.sort((a, b) => a.label.localeCompare(b.label));
}
