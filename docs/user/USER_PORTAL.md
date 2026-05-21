# Portal Usuario Final — V1

Portal unificado para usuarios registrados (`Role.USER` y cualquier rol que use el área personal de compra).

## Decisiones de producto (aprobadas)

| Tema | Decisión |
|------|----------|
| Rutas | Hub en **`/me/*`**. **`/cuenta/*` → redirects temporales** (no alias permanente). |
| Favoritos | Tabla **`UserFavorite`** (multi-entidad + provider + notif por ítem). No ampliar `preferences.favoriteEventIds`. |
| Esperados | Tabla **`UserExpectedEvent`** (+ notif por ítem). No ampliar `preferences.expectedEventIds`. |
| Carrito | **`UserCart` / `UserCartItem`** en API/BD. Sin `CartContext` / localStorage en el portal. |
| Órdenes | `Order` desde **`PENDING_PAYMENT`**; el carrito no es una orden hasta checkout. |
| Transferencia V1 | **`TicketTransferOffer`**; QR nuevo para receptor; original bloqueado → invalidado al completar; reactivable si se cancela antes. |
| Transferencia personal | `TicketTransferOffer` — ver [TICKET_TRANSFER.md](./TICKET_TRANSFER.md). Sin marketplace ni pagos entre usuarios. |

## Navegación V1

```txt
/me                 Dashboard
/me/tickets         Mis tickets
/me/cart            Carrito + pagos pendientes
/me/preferences     Preferencias (categorías, subcategorías, notificaciones globales)
/me/activity        Actividad (asistidos, reviews, transfers)
/me/account         Mi cuenta
```

Subsecciones en preferencias (tabs o anchors):

- Favoritos → datos desde `GET /me/favorites`
- Eventos esperados → `GET /me/expected-events`

## Redirects temporales `/cuenta/*`

| Legacy | Destino |
|--------|---------|
| `/cuenta` | `/me` |
| `/cuenta/preferencias` | `/me/preferences` |
| `/cuenta/favoritos` | `/me/preferences?tab=favorites` |
| `/cuenta/eventos-esperados` | `/me/preferences?tab=expected` |
| `/cuenta/eventos-asistidos` | `/me/activity?tab=attended` |
| `/cuenta/configuracion` | `/me/account` |
| `/cuenta/solicitar-productor` | `/cuenta/solicitar-productor` (mantener hasta mover a `/me/account/apply-producer` o similar) |
| `/cuenta/solicitar-gastro` | idem |
| `/cuenta/solicitar-hotel` | idem |
| `/cuenta/solicitar-referrer` | idem |

Las rutas de **solicitud de rol** pueden quedar fuera del layout portal unificado en V1; documentar en slice posterior.

## Arquitectura

```
UI → hooks (TanStack Query) → UsersRepo / MePortalRepo → ApiRepository → /me/*
```

- Sin `fetch` en componentes.
- Schemas en `packages/shared` (`user-portal.ts`, `ticket-transfer-offer.ts`).
- Prisma: ver [USER_PORTAL_PRISMA_PROPOSAL.md](./USER_PORTAL_PRISMA_PROPOSAL.md).

## Etapas de implementación

| # | Entrega | Estado |
|---|---------|--------|
| 0 | Docs + propuesta Prisma | Hecho |
| 1 | Shared schemas | Hecho |
| 2 | Migración Prisma + script datos legacy | Hecho |
| 3 | Backend services + controllers | Hecho |
| 4 | Repos + query hooks | Hecho |
| 5 | `UserPortalLayout` + redirects `/cuenta` | Hecho |
| 6 | Detalle ticket + transferencia V1 UI | Hecho |
| 7 | Checkout API unificado (auth → `/me/cart`) | Hecho |
| 8 | Smoke API `smoke:user-portal` | Hecho |
| 9 | E2E Playwright `pnpm e2e:portal` | Hecho |
| 10 | Notificaciones V2 (cron, email, in-app) | Hecho |
| 11 | Seguir productoras + recomendaciones | Hecho |
| 12 | Pulido transferencia personal (email receptor, textos legales) | Hecho |

## Pruebas

- **API:** `pnpm --filter api run smoke:user-portal` — ver [SMOKE_TESTS_GUIDE.md](../guides/SMOKE_TESTS_GUIDE.md)
- **Notificaciones:** `pnpm --filter api run smoke:notifications` — ver [USER_PORTAL_NOTIFICATIONS.md](../guides/USER_PORTAL_NOTIFICATIONS.md)
- **Seguir productoras:** `pnpm --filter api run smoke:producer-follows`
- **E2E UI:** `pnpm e2e:portal` — ver [SMOKE_TESTS_GUIDE.md](../guides/SMOKE_TESTS_GUIDE.md)

## Referencias

- [USER_PORTAL_PRISMA_PROPOSAL.md](./USER_PORTAL_PRISMA_PROPOSAL.md)
- [TICKET_TRANSFER.md](./TICKET_TRANSFER.md)
- [USER_PREFERENCES_AND_NOTIFICATIONS.md](./USER_PREFERENCES_AND_NOTIFICATIONS.md)
- `docs/context/CONTEXT_PENDIENTES.md` § L
