# Preferencias, favoritos y notificaciones — Portal usuario

## Fuentes de datos V1

| Concepto | Persistencia |
|----------|----------------|
| Categorías / subcategorías favoritas | `User.preferences` JSON (`favoriteCategories`, `favoriteSubcategoryIds`) |
| Notificaciones globales | `User.preferences` JSON (web/email/reminders/favorites/expected flags) |
| Favoritos por publicación | **`UserFavorite`** |
| Eventos esperados | **`UserExpectedEvent`** |
| Recordatorio 24 h por ticket | `User.preferences.ticketReminderOverrides` + global `ticketReminder24hEnabled` |

Los arrays legacy `favoriteEventIds` y `expectedEventIds` quedan **deprecados**; migración one-shot a tablas nuevas (ver propuesta Prisma).

## UserFavorite

### Tipos de entidad (`FavoriteEntityType`)

| Valor | Referencia `entityId` |
|-------|------------------------|
| `event` | `Event.id` |
| `gastro` | `GastroProfile.id` o evento gastro público (resolver en servicio) |
| `rental` | `Event.id` (`category=rental`) |
| `excursion` | `Event.id` (`category=excursion`) |
| `hotel` | `HotelProfile.id` o evento hotel |
| `discount` | `GastroDiscount.id` |

### Provider asociado (`FavoriteProviderType` + `providerId`)

| Provider | Uso |
|----------|-----|
| `producer` | `ProducerProfile.id` |
| `gastro` | `GastroProfile.id` |
| `hotel` | `HotelProfile.id` |
| `excursion_operator` | `ExcursionOperator.id` |
| `rental_location` | `RentalLocation.id` |
| `platform` | Tenant-level (opcional) |

Al crear favorito desde ficha pública, el servicio **resuelve** provider desde el evento/perfil.

### Notificaciones por ítem

- `webNotificationsEnabled` — default **true** al crear.
- `emailNotificationsEnabled` — default según preferencia global del usuario.

## UserExpectedEvent

- `userId` + `eventId` (único por par).
- Misma pareja de flags web/email por ítem (defaults activos).
- Distinto de favorito: intención de seguir ventas/cambios del evento.

## Notificaciones globales (UI en `/me/preferences`)

| Flag | Default V1 |
|------|------------|
| `webNotificationsEnabled` | true |
| `emailNotificationsEnabled` | true |
| `ticketReminder24hEnabled` | true |
| `favoriteEntityNotificationsEnabled` | true |
| `expectedEventNotificationsEnabled` | true |

## Envío real (V2 — implementado)

- **Cron** cada 15 min: recordatorio 24 h (tickets), favoritos y esperados en ventana configurable.
- **In-app:** `UserNotification` + `/me/notifications`.
- **Email:** Resend vía `EmailQueueService`; log idempotente en `NotificationDeliveryLog`.

Guía operativa: `docs/guides/USER_PORTAL_NOTIFICATIONS.md`

## UI pública existente

`EventEngagementRow` debe migrar de PATCH `favoriteEventIds` / `expectedEventIds` a:

- `POST /me/favorites`
- `POST /me/expected-events`

En slice frontend posterior a backend.
