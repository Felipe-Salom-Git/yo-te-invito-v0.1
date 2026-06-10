# V3.1 Etapa 12 — Slice 12.5 — Links relacionados seguros

## Decisión seguridad

No HTML libre en descripciones. Bloque controlado **Links relacionados**:

- `title` + `url` https validada (`relatedLinkItemSchema`, máx. 5).
- `rel="noopener noreferrer"` en público.
- JSON `relatedLinks` en `Event` (excursiones) y `GastroProfile`.

## UI

- `RelatedLinksFormFields` — excursiones admin editar, `GastroLocalForm`.
- `PublicRelatedLinksCard` — ficha excursión y gastro público.

## Migración

- `20260610140000_stage_12_hotel_audit_related_links` — columnas `relatedLinks` + audit hotel.

## Comandos

- `pnpm --filter shared run build` — PASS
- API/web build — PASS
