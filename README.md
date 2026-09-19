# Octopus Agile Tracker

A dashboard for tracking **Octopus Energy** electricity and gas prices across
UK regions — built for **Agile**, but works with any single-rate tariff
(Go, Cosy, Snug, Flux, Tracker, Flexible, fixed…). Built with **React**,
**TypeScript**, **Mantine**, **TanStack Query**, and **Phosphor Icons**.

---

## Features

### Any tariff

- Pick your tariff in **Settings → Tariff** (live list from Octopus), or let
  **Auto-detect** read it — and your region — from your account.
- Every tariff's rate windows (half-hourly, multi-hour bands, daily, fixed) are
  expanded to half-hour slots, so charts, stats and 30-day trends work
  everywhere. Cheapest-window suggestions appear only when the price moves
  during the day.
- Time-of-use tariffs (Go, Cosy…) fill any unpublished part of tomorrow from
  today's pattern, clearly labelled _assumed_.
- Day/night tariffs (e.g. Economy 7) aren't supported yet.

### Electricity (Agile)

Agile-only extras — the wholesale estimate, AgilePredict forecast and push
alerts — appear only when you're on Agile.

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

- Gas unit rate with **today vs tomorrow** comparison and % change. Works with
  daily-changing (Tracker) and fixed/variable tariffs alike.
- **30-day history** chart.
- **Show/hide gas** in Settings — hide it if you don't have gas with Octopus
  (auto-detect hides it for you when your account has no gas tariff).
- **Auto-detect your gas tariff** from your Octopus account (API key +
  account number), or enter a product code manually.

### Usage & spend

- **Your actual spend** from half-hourly smart meter data × your tariff's rates.
- **"Is my tariff saving me money?"** — your usage priced against the current
  Flexible Octopus flat rate for your region, and against Agile, Go, Cosy and
  Tracker including standing charges.

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
- No cron is defined in `vercel.json` (Hobby only allows daily crons), so alerts
  need an external scheduler (e.g. cron-job.org, free). Create **one** job:
  `GET https://<your-domain>/api/cron/tick` every 15 minutes, with the header
  `Authorization: Bearer <CRON_SECRET>`. Each run checks cheap-window alerts,
  and during the UK 15:00–21:00 publish window also checks for tomorrow's rates
  and plunge pricing. Alerts are de-duplicated, so extra runs are harmless and a
  run before the rates are published simply retries 15 minutes later.
- The response says what happened (subscribers found, slots published, why
  nothing was sent), so open the URL with the header in a REST client to debug.
  `/api/cron/rates-published` and `/api/cron/cheap-window` still work
  individually.

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
