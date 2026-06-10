# V3.1 Etapa 6 — Cierre Scanner PDF y offline

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`

## 1. Objetivo

PDF listado operativo + scanner offline con snapshot, validación local, sync y conflictos.

## 2. Slices ejecutados

| Slice | Entrega |
|-------|---------|
| 6.1 | PDF export API + UI productora/scanner |
| 6.2 | Permisos + `SCANNER_INACTIVE` + smoke permisos |
| 6.3 | `GET .../snapshot` + IndexedDB v2 |
| 6.4 | `scanOffline` + cola pendiente |
| 6.5 | `POST .../offline-validations/sync` |
| 6.6 | Códigos conflicto + `OfflineConflictPanel` |
| 6.7 | `ScannerConnectionStatus` |
| 6.8 | Este documento + checklist |

## 3. PDF

- Permisos: matriz en `V3_1_STAGE_6_TICKET_LIST_PDF_PERMISSIONS.md`
- Sin QR completo; código corto + sufijo parcial
- Audit `TICKET_LIST_EXPORTED`

## 4. Offline

- Storage: IndexedDB `ScannerOfflineDB`
- Validación local sin red; pendiente hasta sync
- `qrPayload` en snapshot (auth scanner) — riesgo dispositivo sin cifrado V1

## 5. Sync

- Idempotencia `offline:{localId}` en `TicketScanLog.deviceId`
- Manual «Sincronizar pendientes»

## 6. Conflictos

Política V1: online gana; `conflict` si ya usada antes del scan offline.

## 7. QA automatizado

| Comando | Estado |
|---------|--------|
| `pnpm --filter shared run build` | OK |
| `pnpm --filter api` nest build | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter scanner run build` | OK |
| `smoke:v31-ticket-list-pdf` | Script listo (requiere BD con tickets) |
| `smoke:v31-ticket-list-pdf-permissions` | Script listo |

## 8. QA manual dispositivo

| Plataforma | Estado |
|------------|--------|
| Android Chrome | Pendiente operador |
| iPhone Safari | Pendiente operador |
| Desktop | Verificado build |

## 9. Riesgos conocidos

- JWT login PWA producción (pendiente Etapa 5)
- Sin cifrado IndexedDB
- Snapshot 48h — revocaciones posteriores requieren re-descarga
- `prisma generate` puede fallar con API dev corriendo (EPERM Windows)

## 10. Pendientes Etapa 7

- Múltiples fechas por evento
- JWT scanner producción
- QA manual móvil en puerta real
- Cifrado opcional snapshot

## Comandos ejecutados

```bash
pnpm --filter shared run build
cd apps/api && npx nest build
pnpm --filter web run build
pnpm --filter scanner run build
```

Migración: `20260610120000_ticket_list_export_audit` (`TICKET_LIST_EXPORTED`).
