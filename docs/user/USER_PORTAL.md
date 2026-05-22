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

## Navegación (menú principal)

```txt
/me                 Inicio (alertas, recomendados, CTA push)
/me/tickets         Mis tickets
/me/cart            Mi Carro
/me/preferences     Preferencias (intereses, productoras, gastro, favoritos, esperados, notificaciones)
/me/activity        Actividad (asistidos, reviews, transfers)
/me/notifications   Bandeja + push en dispositivo + preferencias de alertas (desplegable)
/me/account         Mi cuenta
```

Rutas vivas fuera del menú: `/me/orders`, `/me/recommendations` (redirect → `/me`), `/me/following` (redirect → preferencias productoras).

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
| 13 | Ticket visual + QR desde `TicketTemplate` en `/me/tickets/[ticketId]` (V2.2) | Hecho |
| 14 | Push Web/Mobile + alertas inteligentes (V2.1.3–V2.1.4) | Hecho |
| 15 | UX portal V2.1.2 (inicio, Mi Carro, preferencias) | Hecho |

Detalle ticket (`/me/tickets/[ticketId]`):

- Plantilla del productor si existe (`ticketTemplate` en `GET /me/tickets/:id`); si no, fallback premium.
- QR: payload `yti:v1:…` idéntico al que usa el scanner (solo se genera imagen para pantalla/impresión).
- Botón **Imprimir ticket** — vista de impresión sin menú del portal; QR grande (~72mm).
- Estados **Válido / Usado / Revocado / Transferido / Transferencia pendiente**: mensaje claro; los no válidos no habilitan ingreso.
- Ver [TICKET_CANVAS_STUDIO.md](../tickets/TICKET_CANVAS_STUDIO.md) (QA scanner e impresión).

## Push notifications (V2.1.3–V2.1.4)

Canal **adicional** a la bandeja `/me/notifications` (no la reemplaza).

### Activación

1. Ir a **`/me/notifications`**.
2. Panel **Notificaciones push en este dispositivo** → **Activar notificaciones** (gesto del usuario; el navegador pide permiso).
3. La suscripción se guarda en API (`UserPushSubscription`, un registro por `endpoint`).
4. **Enviar prueba** valida VAPID y el service worker `public/push-sw.js`.

CTA en **Inicio** (`/me`) si el dispositivo aún no está suscripto.

### Preferencias de alertas

En la misma página, sección **Preferencias de alertas** (persistidas en `User.preferences`):

- Eventos próximos, transferencias, calificaciones pendientes
- **Valoraciones en mis locales/eventos** (`notifyManagedReviews`) — nueva reseña, disputas (portales gestionados)
- **Respuestas y moderación de tus reseñas** (`notifyReviewEngagement`) — respuesta oficial, ocultar/restaurar
- Productoras seguidas, categorías/subcategorías favoritas
- Recomendaciones (opcional, desactivado por defecto)
- Master **Alertas push activas** (`pushAlertsEnabled`)

Las push solo se envían si hay suscripción activa, VAPID configurado y el tipo de alerta está habilitado.

### Eventos que disparan push (hoy)

| Evento | Canal in-app | Push |
|--------|----------------|------|
| Cron recordatorio 24h ticket | Sí | Sí (si preferencia) |
| Favorito / evento esperado pronto | Sí | Sí |
| Transferencia recibida (`buyerUserId`) | Sí | Sí |
| Calificación pendiente (cron) | Sí | Sí |
| Notificación interna nueva | Sí | Sí (`notifyUnreadNotifications`) |
| Productora publica evento → seguidores | Sí (`FOLLOWED_PRODUCER_NEW_EVENT`) | Sí (`notifyFollowedProducers`) |
| Local gastro activa descuento → seguidores | Sí (`FOLLOWED_GASTRO_NEW_DISCOUNT`) | Sí (si push global + toggles del follow) |

### Seguir locales gastronómicos

- API: `GET/POST/DELETE/PATCH /me/gastro-follows*` (`UserGastroFollow`).
- UI: tab **Gastro** en `/me/preferences` (`MePreferencesGastro`); botón **Seguir** en ficha `/restaurants/[id]` (`GastroFollowButton`).
- Por local: `webNotificationsEnabled` / `emailNotificationsEnabled` (PATCH `/me/gastro-follows/:id/notifications`).
- Alerta de descuento: ver [GASTRO_FOLLOWS_NOTIFICATIONS.md](../gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md).
| Contenido nuevo por ciudad/categoría/subcategoría | Sí (`FAVORITE_INTEREST_NEW_CONTENT`) | Sí (prefs categoría/subcat/recomendados) |
| Nueva valoración (productor/gastro/hotel) | Sí (`REVIEW_RECEIVED`) | Sí (`notifyManagedReviews`) |
| Respuesta oficial a tu reseña | Sí + email | Sí (`notifyReviewEngagement`) |
| Disputa aceptada/rechazada | Sí + email | Push solo si aceptada |
| Reseña ocultada/restaurada (moderación) | Sí + email | No |

**Disparo:** al pasar a `APPROVED` (admin approve, publicación general, rental/excursion con estado aprobado). No re-dispara si ya estaba aprobado. Sin alertas para `hotel`, borradores, rechazados ni eventos no visibles públicamente.

**Throttling simple:** máximo `SMART_ALERTS_MAX_PER_USER_HOUR` alertas de contenido por usuario por hora (default `5`). Deduplicación: `NotificationDeliveryLog` por `(userId, kind, referenceKey)` en todos los canales.

### Variables de entorno

**API**

```env
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_CONTACT_EMAIL=mailto:soporte@ejemplo.com
```

**Web** (opcional si la clave pública se obtiene solo desde `GET /me/push-subscriptions/config`):

```env
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=
```

Sin VAPID, la API arranca igual; registro de dispositivo OK; envío de prueba y alertas push fallan con mensaje controlado.

### Limitaciones

- HTTPS en producción; localhost según navegador.
- iOS Safari: restricciones (PWA / pantalla de inicio).
- Permiso bloqueado → mensaje en UI; no se puede re-pedir sin configuración del navegador.
- Rotar claves VAPID invalida suscripciones previas.

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
