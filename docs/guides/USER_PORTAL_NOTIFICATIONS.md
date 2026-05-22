# Notificaciones — Portal usuario V2

Envío real de recordatorios y avisos (cron + email Resend + bandeja in-app).

## Migración

```bash
pnpm db:migrate
# migración: 20260603120000_user_notifications
```

## Modelos

| Tabla | Uso |
|-------|-----|
| `UserNotification` | Bandeja in-app (título, cuerpo, enlace, leída/no) |
| `NotificationDeliveryLog` | Idempotencia por `(userId, kind, referenceKey, channel)` |

## Tipos (`NotificationKind`)

| Kind | Cuándo |
|------|--------|
| `TICKET_REMINDER_24H` | ~24 h antes del `Event.startAt` (ticket `VALID` del usuario) |
| `FAVORITE_EVENT_SOON` | Mismo ventana para eventos en `UserFavorite` (`entityType=event`) |
| `EXPECTED_EVENT_SOON` | Mismo ventana para `UserExpectedEvent` |
| `EVENT_APPROVED_BY_ADMIN` | Admin aprueba evento → miembros de la productora (portal productor) |
| `EVENT_REJECTED_BY_ADMIN` | Admin rechaza evento → miembros de la productora (portal productor) |

### Portal productor (moderación admin)

- Disparo: `AdminEventsService.approveEvent` / `rejectEvent` (solo transición real de estado).
- Servicio: `ProducerEventStatusNotificationsService` → `UserNotificationsService.deliver()`.
- Idempotencia: `referenceKey` = `producer-event-status:{eventId}:APPROVED|REJECTED`.
- Destinatarios: `UserProducerMembership` activos + `ProducerProfile.createdByUserId` (fallback `event.producerId`).
- Preferencias: `notifyProducerEventStatus` + `emailNotificationsEnabled` / `pushAlertsEnabled` (ver `user-portal-preferences.util.ts`).
- UI: `ProducerDashboardEventStatusAlerts` en `/producer` (filtra kinds desde `GET /me/notifications`).

## Cron

- Cada **15 min** en producción, **10 min** en `NODE_ENV=development`
- Desactivar: `NOTIFICATIONS_CRON_ENABLED=false`

### Ventana temporal

Por defecto eventos/tickets cuyo inicio cae entre **23 h y 25 h** desde ahora:

| Variable | Default |
|----------|---------|
| `NOTIFICATION_REMINDER_HOURS` | `24` |
| `NOTIFICATION_REMINDER_TOLERANCE_HOURS` | `1` |

Para pruebas locales (evento en 5 minutos):

```env
NOTIFICATION_REMINDER_HOURS=0.1
NOTIFICATION_REMINDER_TOLERANCE_HOURS=0.05
```

## Email

- Usa `EmailQueueService` (BullMQ si `REDIS_URL`, si no envío directo con `EmailService`)
- Requiere `RESEND_API_KEY` + `EMAIL_FROM` para envío real
- Respeta `emailNotificationsEnabled` global y flags por favorito/esperado

## API (usuario)

| Método | Ruta |
|--------|------|
| GET | `/me/notifications` |
| GET | `/me/notifications/unread-count` |
| PATCH | `/me/notifications/:id/read` |
| POST | `/me/notifications/read-all` |

## Admin (disparo manual)

```bash
curl -X POST http://localhost:3001/admin/notifications/run \
  -H "Authorization: Bearer <admin-jwt>"
```

## UI

- Navbar: **Notificaciones** con badge de no leídas
- `/me/notifications` — lista + marcar leídas
- Sidebar portal: enlace Notificaciones

## Smoke

```bash
pnpm --filter api run smoke:notifications
```

## E2E Playwright

```bash
pnpm e2e:notifications
```

Usa `POST /admin/notifications/seed-demo` (sesión ADMIN en BD). Ver [SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md) y [DEMO_REMOVAL.md](./DEMO_REMOVAL.md).

## Referencias

- `docs/user/USER_PREFERENCES_AND_NOTIFICATIONS.md`
- `apps/api/src/modules/notifications/`
