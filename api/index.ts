import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../server/src/app.js';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `https://${host}`);

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val == null) continue;
    if (Array.isArray(val)) val.forEach((v) => headers.append(key, v));
    else headers.set(key, val);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(url.toString(), {
    method: req.method ?? 'GET',
    headers,
    ...(hasBody
      ? { body: req as unknown as ReadableStream, duplex: 'half' }
      : {}),
  } as RequestInit);

  const response = await app.fetch(request);

  res.statusCode = response.status;
  response.headers.forEach((val, key) => res.setHeader(key, val));
  res.end(Buffer.from(await response.arrayBuffer()));
}
