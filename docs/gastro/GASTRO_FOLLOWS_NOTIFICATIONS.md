# Gastro — Follows y alertas de descuentos

## Follows de usuario

- Modelo: `UserGastroFollow` (web/email por local).
- API: `GET/POST/DELETE/PATCH /me/gastro-follows*`.
- UI: `GastroFollowButton` en ficha pública; `MePreferencesGastro` en `/me/preferences`.
- Sin sesión: CTA «Iniciá sesión para seguir» con `callbackUrl`.

## Notificación: descuento activo

**Kind:** `FOLLOWED_GASTRO_NEW_DISCOUNT`

**Disparador:** cuando un `GastroDiscount` pasa a `ACTIVE` (admin `approve` o activación vía envío QR).

**Servicio:** `GastroFollowDiscountAlertsService.notifyFollowersOfNewActiveDiscount`

**Reglas:**

| Regla | Detalle |
|-------|---------|
| Idempotencia | `referenceKey = gastro-discount-active:{discountId}` por usuario/canal |
| Preferencias local | `UserGastroFollow.webNotificationsEnabled` / `emailNotificationsEnabled` |
| Preferencias globales | `readPortalPreferences` — web/email master |
| Throttling | Máx. `SMART_ALERTS_MAX_PER_USER_HOUR` (default 5) alertas gastro/pro hora |
| Push | Vía `UserNotificationsService.deliver` si push global habilitado |
| Sin spam | No se re-notifica el mismo descuento; approve + sendQr comparten clave |

**Href:** `/descuentos/:id?tenantId=…`

## Reviews V2 (portal gastro)

- `/gastro/valoraciones` → `ManagedReviewsCommentsPage` scope `gastro`.
- API: `GET /gastro/reviews`, `GET /gastro/reviews/summary`, `POST /gastro/reviews/:id/reply`.
- Alertas: `ManagedPortalReviewAlerts` + preferencia `notifyManagedReviews`.

## Smokes sugeridos

```bash
pnpm --filter api run smoke:reviews
pnpm --filter api run smoke:notifications
pnpm e2e:notifications
```
