import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { region } = req.query;

  if (!region || typeof region !== 'string') {
    return res.status(400).json({ error: 'Missing region parameter' });
  }

  try {
    const response = await fetch(
      `https://prices.fly.dev/api/${encodeURIComponent(region)}/?format=json`,
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'Failed to fetch forecast data' });
  }
}
