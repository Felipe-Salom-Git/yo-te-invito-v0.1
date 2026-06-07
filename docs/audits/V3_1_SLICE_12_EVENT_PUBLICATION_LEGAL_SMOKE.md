# V3.1 Slice 12 — Event publication legal (Caso B)

**Fecha:** 2026-06-14  
**Decisión:** **Modo informativo** — sin bloqueo backend.

## Estado de legales verificado

- `producer_terms` existe en seed pero queda en **DRAFT** hasta publicación manual en `/admin/legales`.
- No existe contexto `EVENT_PUBLICATION` en Prisma/shared.
- `UserLegalAcceptance` no tiene `eventId` — migración pendiente para Caso A.

## Implementado (Caso B)

- `ProducerEventPublicationLegalNotice` en paso 3 del wizard productora.
- Link a `/legal/productores`.
- Microcopy sobre aceptación futura; sin checkbox obligatorio.
- **Sin** validación en `PATCH /producer/events` al pasar a `PENDING`.

## Caso A pendiente (cuando `producer_terms` esté PUBLISHED)

1. Migración: `LegalAcceptanceContext.EVENT_PUBLICATION`, `eventId` en `UserLegalAcceptance`, flag `isRequiredForEventPublication`.
2. Backend: validar en `producer-events-crud.service` al `DRAFT → PENDING`.
3. Frontend: checkbox obligatorio + `POST /me/legal/accept`.

## QA manual

| Escenario | Esperado |
|-----------|----------|
| Enviar a revisión sin aceptar | Funciona (Caso B) |
| Aviso legal visible paso 3 | Sí |
| Signup/checkout legal | Sin regresión |
