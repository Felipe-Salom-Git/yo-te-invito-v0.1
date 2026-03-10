# Inventario de endpoints — API Yo Te Invito

Listado detallado por path: ver **tabla §2.5** en [ROADMAP_INTEGRACION_BASE_DE_DATOS.md](../guides/ROADMAP_INTEGRACION_BASE_DE_DATOS.md).

## Base URL y autenticación

- **Base URL:** `http://localhost:3001` (o `NEXT_PUBLIC_API_BASE_URL` en el frontend).
- **Auth:** Header `Authorization: Bearer <token>` (JWT devuelto por `POST /auth/login`). En desarrollo también se acepta `X-Dev-User-Id`.

## Auth (Fase 1.1)

| Método | Path | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Body: `{ email, password, tenantId? }`. Respuesta: `{ token, user }` (user = forma GET /me). |

Contratos en `packages/shared`: `authLoginRequestSchema`, `authLoginResponseSchema`.

## Rutas públicas (sin auth)

- `GET /public/events`, `GET /public/events/search`, `GET /public/events/trending`, `GET /public/events/:id`
- `GET /public/events/:eventId/ticket-types`
- `POST /public/orders`, `GET /public/orders/:orderId`
- `POST /public/payments/:paymentId/demo-confirm` (demo)
- `GET /public/referral/:code`
- `GET /public/events/:id/reviews`

## Rutas protegidas (Bearer o X-Dev-User-Id)

- `GET /me`, `GET /me/tickets`, `GET /me/orders`, `GET /me/preferences`, `PATCH /me/preferences`
- `POST /producer/events`, `PATCH /producer/events/:eventId`, `GET /producer/events/:eventId/tickets`, `GET /producer/events/:eventId/metrics`
- `POST /producer/events/:eventId/ticket-types`, `PATCH /producer/events/:eventId/ticket-types/:id`
- `GET /admin/users`, `POST /admin/users/referrer`, `PATCH /admin/users/:userId/role`
- `POST /admin/events/:eventId/approve`, `POST /admin/tickets/:ticketId/revoke`, `GET /admin/platform/metrics`, etc.
- `POST /scanner/scan`, `GET /scanner/events/:eventId/tickets`
- `POST /events/:eventId/referral-links`, `GET /events/:eventId/referral-links`
- `POST /events/:eventId/reviews`
- `GET /events/:eventId/courtesies`, `POST /events/:eventId/courtesies`, `GET /events/:eventId/ticket-types`
- `POST /tickets/:ticketId/transfer`

Gaps y estado de cada método frente a la interfaz `Repositories` del frontend: ver tabla en el roadmap.
