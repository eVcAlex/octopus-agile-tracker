export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const region = url.searchParams.get('region');

  if (!region) {
    return new Response(JSON.stringify({ error: 'Missing region parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(
    `https://prices.fly.dev/api/${encodeURIComponent(region)}/?format=json`,
  );

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: 'Upstream API error' }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await upstream.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=900, stale-while-revalidate=300',
    },
  });
}
