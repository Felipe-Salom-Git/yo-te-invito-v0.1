# GastroLocationsList (portal «Mis locales»)

`apps/web/components/gastro/GastroLocationsList.tsx` — `/gastro/local`

## Purpose

Lists every local managed by the account: name, location, status badge, **views of that local**
(G12.1-D), «Ver ficha» (preview modal), «Editar» and share (ACTIVE only).

## Data

- Source: `useGastroActiveLocation().locations` → `GET /gastro/locations`
  (`GastroLocalService.listMyLocations`, schema `gastroLocationSummarySchema`).
- `viewCount` (G12.1-D, additive field): `GastroProfileView` rows of **that** `GastroProfile`,
  one `groupBy(gastroProfileId)` for all managed locals (no N+1). Same source as the dashboard
  `totalViews` (`GastroProfileMetricsService`). Not the account sum, not discount views, not
  publications. Owner / ADMIN visits are not recorded (unchanged, G4.2).
- Label: `formatGastroLocationViews` (`lib/gastro/gastroLocationViews.ts`) → «👁 1.245 visualizaciones».

## Edge cases

- Local without views → `0 visualizaciones`.
- PENDING / REJECTED locals show their (usually 0) count too; views are only recorded for ACTIVE.

Tests: `pnpm --filter api run test:gastro-local-view-count`.
