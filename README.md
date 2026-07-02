# Octopus Agile Tracker

A dashboard for tracking **Octopus Energy Agile** electricity prices and gas
unit rates across UK regions. Built with **React**, **TypeScript**,
**Mantine**, **TanStack Query**, and **Phosphor Icons**.

---

## Features

### Electricity (Agile)

- **Today & Tomorrow** half-hourly rates as a chart or a time-of-day card
  grid (tomorrow's prices publish around 4pm).
- **Tomorrow before 4pm**: a wholesale-derived _estimate_ of tomorrow's rates
  (clearly labelled 🔮 Estimate), computed from the N2EX day-ahead auction and
  the Agile formula. It's a rough guide — typically within a few p/kWh — and is
  replaced automatically by Octopus's ✓ Confirmed rates when they publish.
- **Stats cards**: lowest, highest, average, and the live "right now" price.
- **Cheap windows**: the cheapest contiguous slots for running appliances.
- **Forecast**: multi-day price predictions (3–14 days, configurable) via
  AgilePredict.
- **Standing charge** for your region.

### Gas

- Daily gas unit rate with **today vs tomorrow** comparison and % change.
- **30-day history** chart.
- **Auto-detect your gas tariff** from your Octopus account (API key +
  account number), or enter a product code manually.

### Usage & spend

- **Your actual spend** from half-hourly smart meter data × Agile rates.
- **"Is Agile saving me money?"** — comparison against the current
  Flexible Octopus flat rate for your region.

### Push notifications

- "Tomorrow's rates are out" daily summary (~4pm).
- Plunge pricing alerts when prices go negative.
- "Cheap window starting soon" reminders (1–4h, configurable).
- Powered by a small Hono backend on Vercel (`server/` + `api/index.ts`)
  with subscriptions in Upstash Redis; alerts fire when the cron endpoints
  are triggered (see Deployment notes). See `.env.example` for the required
  env vars (VAPID keys, Redis, `CRON_SECRET`).

### General

- 14 UK regions, remembered between visits.
- Dark/light mode.
- Mobile-friendly and responsive.
- Installable as a PWA with offline display of the last-fetched rates.

## Getting started

```sh
pnpm install
pnpm dev          # frontend (Vite, port 5174)
pnpm dev:server   # notification API (Hono, port 3001) — optional
```

## Scripts

| Script                  | What it does                        |
| ----------------------- | ----------------------------------- |
| `pnpm dev`              | Start the Vite dev server           |
| `pnpm dev:server`       | Start the Hono notification API     |
| `pnpm build`            | Type-check and build for production |
| `pnpm test`             | Run unit tests (Vitest)             |
| `pnpm lint`             | Lint with oxlint                    |
| `pnpm format`           | Format with oxfmt                   |
| `pnpm typecheck:server` | Type-check the server               |
| `pnpm preview`          | Preview the production build        |

## Deployment notes

- One Vercel project serves the SPA and the `/api` function.
- Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `CRON_SECRET`, and the Upstash Redis env vars in Vercel
  (the Upstash Marketplace integration provides the Redis ones).
- No cron is defined in `vercel.json` (`"crons": []`). To make notifications
  fire, trigger the two endpoints in `server/src/routes/cron.ts` —
  `/api/cron/rates-published` (daily, ~4pm UK) and `/api/cron/cheap-window`
  (every 15 min for timely alerts) — with the
  `Authorization: Bearer $CRON_SECRET` header, either from an external
  scheduler or by adding Vercel crons (sub-daily schedules need a paid plan;
  on Hobby, use a daily schedule or an external scheduler).

## Privacy

Your Octopus API key and account number are stored only in your browser's
localStorage and are sent only to the Octopus Energy API. They can be cleared
at any time from Settings.

## Data sources

- [Octopus Energy API](https://developer.octopus.energy/) — rates, standing
  charges, account/tariff detection.
- [AgilePredict](https://agilepredict.com/) — price forecasts (proxied via a
  rewrite in `vercel.json`).
- [Nord Pool](https://www.nordpoolgroup.com/) — N2EX GB day-ahead auction
  prices, used to estimate tomorrow's Agile rates before Octopus publishes them
  (proxied via `vercel.json`; free, no API key). Coefficients are calibrated by
  `scripts/calibrate-agile.ts`.
