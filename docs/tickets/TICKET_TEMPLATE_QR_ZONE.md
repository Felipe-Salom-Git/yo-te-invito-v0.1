# Ticket template — zona QR protegida (V1)

## Alcance

- El **canvas studio** persiste solo metadatos de diseño (`TicketTemplate`). No altera `qrPayload` ni el flujo del scanner.
- El **render comprador** (`TicketTemplateRenderer` en `/me/tickets/[ticketId]`) consume la misma plantilla y coloca el QR en `qrZoneJson` con tamaño mínimo garantizado.

## Reglas (API + editor)

Coordenadas **normalizadas** (0–1), origen arriba-izquierda del canvas.

| Regla | Valor |
|--------|--------|
| Margen mínimo al borde del canvas | `0.04` |
| Ancho mínimo zona QR | `0.18` |
| Alto mínimo zona QR | `0.18` |
| Zona por defecto | `TICKET_TEMPLATE_DEFAULT_QR_ZONE` en `@yo-te-invito/shared` |

La API **rechaza** guardar si:

1. La zona QR sale del rectángulo seguro (con margen).
2. Cualquier elemento del `elementsJson` **intersecta** el rectángulo de la zona QR (el código debe permanecer visible).

No se aceptan elementos de tipo `QR` en `elementsJson` (el QR de emisión no forma parte del JSON de capas).

## Comportamiento esperado en UI

- El recuadro punteado **“Zona QR”** no se puede eliminar; solo mover o redimensionar dentro de los límites (clamp en cliente y validación en servidor).
- Las capas no deben solapar esa zona; si lo hacen, el guardado falla con mensaje claro.

## Referencias de código

- Visión general del estudio: `docs/tickets/TICKET_CANVAS_STUDIO.md`
- Backend: `apps/api/src/modules/producer/producer-ticket-template.service.ts`
- Contratos: `packages/shared/src/schemas/ticket-template.schema.ts`
- Cliente (clamp / intersección): `apps/web/lib/producer/ticket-studio-qr-rules.ts`
