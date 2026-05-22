# Reviews V2 — Yo Te Invito

Evolución del sistema de valoraciones públicas y comerciales privadas.

## Alcance implementado (V1 slice)

### Público (`Review` + `Event`)

- Escala **1–10**: `overallRating` + `aspectRatings` (JSON) por categoría.
- Estados: `VISIBLE`, `IN_REVIEW`, `HIDDEN`, `REPORT_REJECTED`, `DELETED_BY_USER`.
- Compatibilidad: campo legacy `score` (1–5) y `hiddenFromPublic` sincronizados.
- Réplica: `officialReply` + `replyAuthorType` / fechas.
- Ranking interno: `ReviewRankingService` (bayesiano + bonus volumen); **no expuesto** en API pública de detalle.
- Reputación autor: `ReviewReputationService` → tiers `NEW` … `LOW_RELIABILITY`.

### Endpoints API

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/me/reviews` | Crear review (auth obligatorio) |
| GET | `/public/reviews/summary` | Resumen por `category` + `entityId` |
| GET | `/public/reviews` | Listado V2 + resumen; filtros `sort`, `replyFilter`, `overallRating` |
| GET | `/public/users/:userId/review-profile` | Perfil comentarista (`reviewerTier`, `visibleReviewCount`, `averageOverallRating`, `categoriesCommented`, `reviewsWithOfficialReplyCount`; `displayName` sin email) |
| GET | `/public/users/:userId/reviews` | Reviews visibles del usuario (paginado, embebe `profile`) |
| GET | `/public/events/:id/reviews` | Legacy list (sigue activo) |
| POST | `/events/:eventId/reviews` | Legacy create (guest opcional) |
| POST | `/producer/reviews/:id/reply` | Réplica productora (`PRODUCER`) |
| POST | `/gastro/reviews/:id/reply` | Réplica gastro (`GASTRO_OWNER`) |
| GET | `/gastro/reviews`, `/gastro/reviews/summary` | Listado portal gastro |
| POST | `/hotel/reviews/:id/reply` | Réplica hotel (`HOTEL_OWNER`) |
| GET | `/hotel/reviews`, `/hotel/reviews/summary` | Listado portal hotel |
| POST | `/admin/reviews/:id/reply` | Réplica plataforma (`PLATFORM_ADMIN`) |
| POST | `/producer/reviews/:id/dispute` | Disputa (sin cambios de ruta) |
| POST | `/admin/reviews/:id/hide` | Ocultar directo (admin) |
| POST | `/admin/reviews/:id/restore` | Restaurar |

### Disputas

- Al crear disputa → review `IN_REVIEW`.
- Aceptar → `HIDDEN` + ocultar público + recalcular promedios.
- Rechazar → `REPORT_REJECTED` (sigue visible).

### Cola admin (`/admin/review-disputes`)

- Listado: reseña, autor, evento + categoría, productor, motivo, estado disputa, rating/estado review, fechas.
- Filtros API: `status`, `category`, `q` (evento, productor, mensaje).
- Acciones: marcar en revisión, aceptar, rechazar, resolver; ocultar/restaurar reseña (`POST /admin/reviews/:id/hide|restore`); réplica plataforma si aplica.
- UI: confirmaciones con consecuencias; tabla desktop + cards mobile; enlace a auditoría por disputa.

### Notificaciones (slice 5)

| Kind | Destinatario | Canales |
|------|--------------|---------|
| `REVIEW_RECEIVED` | Productor / gastro / hotel (miembros activos) | IN_APP, email/push si `notifyManagedReviews` |
| `REVIEW_OFFICIAL_REPLY` | Autor de la reseña | IN_APP, email/push si `notifyReviewEngagement` |
| `REVIEW_DISPUTE_*` | Equipo gestionado | IN_APP; email en aceptada/rechazada; push solo aceptada |
| `REVIEW_MODERATION_HIDDEN` / `RESTORED` | Autor | IN_APP, email; sin push |

Entrega idempotente vía `UserNotificationsService.deliver` + `NotificationDeliveryLog`. Fallos email/push no bloquean la acción principal.

### Reporting admin (`/admin/reviews`)

- `GET /admin/reviews/report` — KPIs (públicas/ocultas, disputas abiertas/cerradas), promedio por vertical, señales (baja nota, disputa abierta, ocultadas recientes), entidades con más disputas.
- `GET /admin/reviews/report/export?dataset=problematic|disputes` — CSV (máx. 500 filas; sin email de usuarios ni datos B2B).
- UI: filtros `category`, `days`; enlaces a cola de disputas. Valoraciones comerciales B2B excluidas del scope.

### B2B (`CommercialRelationshipReview`)

- Privado entre productora y referido; no mezclar con reseñas públicas.
- **Productora valora referido** (`targetType=REFERRER`): `referralQuality`, `communication`, `agreementCompliance`, `commercialReliability`.
- **Referido valora productora** (`targetType=PRODUCER`): `commissionPayment`, `communication`, `metricsTransparency`, `professionalTreatment`.
- Escala **1–10** por aspecto; `overallRating` = promedio; `rating` legacy 1–5 derivado.
- UI: `CommercialReviewPanel` en `/producer/referrals` y portal referido.

### Shared (`packages/shared`)

- `review-aspects.ts`, `review-moderation.ts`, `review-ranking.ts`, `reviews.ts`

### Migración

`20260521180000_reviews_v2_public_aspects`

```bash
pnpm db:migrate
pnpm --filter api exec prisma generate
```

## Frontend (slice listPublicV2)

- Hook `usePublicEntityReviews` + query keys `reviewsKeys.publicV2` / `publicV2Entity`
- Componentes: `ReviewAspectBreakdown`, `ReviewReply`, `ReviewCard` (V2), `ReviewSummary` (1–10), `ReviewEmptyState`, `ReviewListSkeleton`, `ReviewPagination`
- `EventReviewsSection` consume resumen + listado V2 (empty/loading/error unificados)
- Fichas: eventos, `PlaceDetailView`, rental, excursión, gastro (`GastroLocationDetailView`), hotel; productora pública (`ProducerRatingSummary`, `ProducerPublicCommentsSection`); perfil `/users/[userId]` (`UserPublicReviewerPage`, stats en `GET /public/users/:id/review-profile` y listado)

## Portal productora (`/producer/comments`)

- Listado V2: `overallRating` /10, aspectos, estado público, réplica, disputa
- Resumen: promedio, distribución 1–10, `unansweredCount`, `openDisputeCount` (API)
- Filtros: respuesta (`replyFilter`), disputa (`OPEN`, etc.), estado público, orden `highest`/`lowest`
- UI: `ManagedReviewsCommentsPage` + `ManagedReviewCard`; modales `ReviewReplyModal` / `ReviewDisputeModal`
- Gastro/hotel: mismo shell sin disputas ni filtros productor; gastro: `/gastro/valoraciones` + `ManagedPortalReviewAlerts` (KPI `unansweredCount` en dashboard)

## Bloque Reviews V2 — cerrado (smoke)

Automatizado: `pnpm --filter api run smoke:reviews` (ver guía; incluye checks de `/me/notifications` para kinds de reviews). Pendiente fuera de alcance: trending `viewCount`.

## Pendiente documentado

- [x] Carruseles «Más recomendados» / «Mejor puntuados» en landing por categoría (`sort=recommended|top_rated`, `GET /public/events/recommended`).
- [x] Home global: carril «Más recomendados» + categorías gastro/hotel/excursión/rental por `rankingScore` (fallback trending/list).
- [ ] `viewCount` / tendencia `recentScore`.
- [x] Réplicas por rol gastro/hotel/admin en rutas dedicadas + portales `/gastro/valoraciones`, `/hotel/valoraciones`.
- [x] Valoraciones B2B con 4 aspectos (1–10) en `/producer/referrals` y portal referido.
- [x] Notificaciones in-app/email/push: nueva valoración, respuesta oficial, disputas, moderación (`ReviewNotificationsService`).

## Smoke tests

Guía completa: [`docs/guides/SMOKE_TESTS_GUIDE.md`](../guides/SMOKE_TESTS_GUIDE.md)

```bash
pnpm --filter api run smoke:reviews
```

Checklist manual resumido: reseña gastro V2, perfil `/users/[userId]`, `/producer/comments` + disputa, réplicas gastro/hotel, carruseles ranking, B2B en `/producer/referrals` (separado de público).
