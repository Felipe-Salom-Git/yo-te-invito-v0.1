# V3.1 Etapa 12 — Slice 12.2 — Admin archivar/restaurar hoteles

## Estrategia baja lógica

- `HotelProfile.status`: `ACTIVE` → `SUSPENDED` (archivar), `SUSPENDED` → `ACTIVE` (restaurar).
- Sin delete físico; reseñas y datos preservados.
- Evento público vinculado (`publicEventId`): `APPROVED` ↔ `PAUSED` vía sync en lifecycle.
- Público: `PublicHotelLocationsService` ya filtra `status: ACTIVE`.

## Endpoints

- `GET /admin/hotel-profiles`
- `POST /admin/hotel-profiles/:id/suspend`
- `POST /admin/hotel-profiles/:id/activate`
- Audit: `HOTEL_PROFILE_SUSPENDED`, `HOTEL_PROFILE_ACTIVATED`

## UI Admin

- `/admin/hoteles` — listado + Archivar/Restaurar con `AdminArchiveConfirmModal`.
- Nav admin + dashboard operativo.

## QA

| Caso | Estado |
|------|--------|
| Admin archiva hotel activo | Manual |
| Público no muestra archivado | Por filtro `ACTIVE` |
| Admin restaura | Manual |
| No admin no puede | Guards `Role.ADMIN` |
| Auditoría | Manual en `/admin/auditoria` |
| Próximamente hoteles discovery | Sin cambio |

## Comandos

- `pnpm --filter shared run build` — PASS
- `pnpm --filter api` nest build — PASS (prisma generate bloqueado por dev server — migración aplicar en deploy)
- `pnpm --filter web run build` — PASS
