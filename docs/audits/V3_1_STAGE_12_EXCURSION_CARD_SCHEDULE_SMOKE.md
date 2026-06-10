# V3.1 Etapa 12 — Slice 12.3 — Horario en cards excursiones

## Decisión visual

Una línea de metadata en cards de excursión, prioridad:

1. Duración + horario de salida (`duration · Salida HH`)
2. Solo duración
3. Solo salida
4. Días disponibles
5. Notas cortas (≤48 chars)
6. Fallback operador / CTA

Helper: `getExcursionCardScheduleLine` en `contentCardPresentation.ts`.

## Backend

- `eventSummarySchema` + `listSummarySelect` incluyen campos `excursion*`.
- `mapPublicListSummary` expone `durationText`, `departureTime`, `availableDaysText`, `scheduleNotes` en list/search/trending.

## Componentes

- `ContentCard`, `ExpandedContentCardOverlay`, `getContentCardMetaLine`.

## Comandos

- `pnpm --filter web run build` — PASS
