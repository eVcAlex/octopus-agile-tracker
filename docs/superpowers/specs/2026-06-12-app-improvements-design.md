# Octopus Agile Tracker — App Improvements Design

**Date:** 2026-06-12
**Status:** Approved

## Overview

Seven improvements to the tracker, plus a tooling migration. The app stays a
Vite + React + Mantine SPA at the repo root; a small Hono backend is added
solely for push notifications, following the WorldCup26 server conventions.

## Architecture

- Frontend remains at the repo root (no monorepo restructure).
- New `server/src/` Hono app (`app.ts`, `routes/`, `services/`, `middleware/`)
  mirroring WorldCup26: zod schemas, wretch, Vitest tests alongside sources.
- `api/index.ts` Vercel function entry using the same Node `IncomingMessage` →
  `Request` adapter as WorldCup26.
- One Vercel project serves the static SPA and the `api/` function; filesystem
  and api matches take priority over the existing catch-all rewrite.
- The server never sees Octopus credentials. Consumption data is fetched
  client-side with the API key already stored in localStorage (same pattern as
  the existing `accountApi.ts`).
- Package manager: pnpm.

## Features

### 1. Tooling migration

- ESLint → **oxlint** (`.oxlintrc.json`, react/react-hooks rules enabled);
  remove all eslint packages and `eslint.config.js`; `lint` script becomes
  `oxlint`.
- Prettier → **oxfmt**; remove prettier; add `format` script. One-off
  reformat commit expected (oxfmt output differs slightly from Prettier).
- **Vitest** for unit tests. Initial coverage: `processRates`, `calcStats`,
  forecast day-grouping, and the new cheap-window finder, including DST edge
  cases (23/25-hour days).

### 2. PWA

- `vite-plugin-pwa`: web manifest, icons, service worker.
- Offline display of last-fetched rates: persist the React Query cache to
  localStorage and add workbox runtime caching for the Octopus API.

### 3. Cheap windows

- Wire up the orphaned `CheapWindows` component.
- Pure util that finds the cheapest contiguous 1/2/3/4-hour windows for today
  and tomorrow; displayed on the electricity view. Unit tested.

### 4. Historical trends

- "Past 30 days" view using the public rates API (no backend): daily average
  trend line + monthly heatmap.

### 5. Consumption / spend tracking

- New "Usage" tab, client-side via stored API key.
- Half-hourly consumption × Agile rate = actual daily/weekly spend.
- "Is Agile saving me money?" comparison vs the region's Flexible Octopus
  flat rate.
- Electricity tariff auto-detect extends the existing account fetch.

### 6. Push notifications (the backend)

- Subscriptions stored in Upstash Redis (Vercel Marketplace).
- `web-push` with VAPID keys (env vars via Vercel).
- Vercel crons:
  - ~4pm UK: "tomorrow's rates published" alert.
  - Plunge pricing alert (negative prices detected).
  - Every 15 min: "cheap window starting soon" per subscription preferences
    (region + window length).
- Frontend: Notifications section in the settings drawer with per-alert
  toggles and a subscribe flow through the service worker.

### 7. Hygiene

- README rewrite (currently says Chakra UI; missing gas/forecast/heatmap).
- Standing charges shown for both fuels.
- Settings note that credentials live in the browser + "clear credentials"
  button.

## Out of scope

- Outgoing Agile (export) view — skipped for now; architecture should not
  preclude adding it later.
- Storing Octopus credentials server-side.

## Build order

1. Tooling (oxlint, oxfmt, Vitest, tests)
2. Hygiene (README, credentials UX, standing charges)
3. PWA
4. Cheap windows
5. Trends
6. Consumption
7. Push backend + notification UI

Each phase ships independently; the cheap-window util built in phase 4 is
reused by the push reminder cron in phase 7.
