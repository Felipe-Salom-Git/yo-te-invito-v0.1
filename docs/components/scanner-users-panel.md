# ScannerUsersPanel

`apps/web/components/portal/scanner/ScannerUsersPanel.tsx`

## Purpose

Portal screen to create / activate / reset scanner accounts (`/producer/scanners`, `/gastro/scanners`).

## Inputs

| Prop | Type | Notes |
|------|------|-------|
| `portal` | `producer \| gastro` | API base (`/producer/scanners`, `/gastro/scanners`) |
| `groupByProfile` | `boolean?` | G11.2 — gastro: one section per location |
| `activeProfileId` | `string?` | Dashboard's active local: highlighted («Local activo») and preselected in «Crear scanner» of the header; **never a filter** |

## Gastro (G11.2)

- Shows **all** scanner accounts of the user, grouped by location (`groupScannerAccountsByProfile`,
  `apps/web/lib/scanner/groupScannerAccounts.ts`). Locations come from `GET /gastro/scanners/parent-profiles`;
  locations without scanners still get a section with its own «Crear scanner».
- Order: primary location first, then by name. An account whose location is not in the options keeps its
  own group (never hidden).
- 0 locations → empty state with «Crear local» (`/gastro/local/nuevo`).
- Isolation is server-side: `listForGastro` only returns accounts whose `parentProfileId` is one of the
  user's managed `GastroProfile`s in the same tenant (ADMIN: whole tenant). No API change in G11.2.

## Sub-components

- `ScannerAccountsList` — cards (mobile) / table (`md+`); `showParent=false` inside a location group.
- `ScannerAccountGroups` — location sections + empty states.

Assert: `pnpm --filter api run test:gastro-scanners-grouped`.
