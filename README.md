# Octopus Agile Tracker

A dashboard for tracking **Octopus Energy Agile** electricity prices and gas
unit rates across UK regions. Built with **React**, **TypeScript**,
**Mantine**, **TanStack Query**, and **Phosphor Icons**.

---

## Features

### Electricity (Agile)

- **Today & Tomorrow** half-hourly rates with chart, heatmap grid, and table
  views (tomorrow's prices publish around 4pm).
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

### General

- 14 UK regions, remembered between visits.
- Dark/light mode.
- Mobile-friendly and responsive.
- Installable as a PWA with offline display of the last-fetched rates.

## Getting started

```sh
pnpm install
pnpm dev
```

## Scripts

| Script         | What it does                        |
| -------------- | ----------------------------------- |
| `pnpm dev`     | Start the Vite dev server           |
| `pnpm build`   | Type-check and build for production |
| `pnpm test`    | Run unit tests (Vitest)             |
| `pnpm lint`    | Lint with oxlint                    |
| `pnpm format`  | Format with oxfmt                   |
| `pnpm preview` | Preview the production build        |

## Privacy

Your Octopus API key and account number are stored only in your browser's
localStorage and are sent only to the Octopus Energy API. They can be cleared
at any time from Settings.

## Data sources

- [Octopus Energy API](https://developer.octopus.energy/) — rates, standing
  charges, account/tariff detection.
- [AgilePredict](https://agilepredict.com/) — price forecasts (proxied via a
  rewrite in `vercel.json`).
