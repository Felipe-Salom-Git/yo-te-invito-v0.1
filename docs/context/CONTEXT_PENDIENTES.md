# CONTEXT_PENDIENTES.md — Checklist de seguimiento

Lista viva de **pendientes y mejoras**. Marcá con `[x]` lo completado.

**Convención:** `- [ ]` pendiente · `- [x]` hecho

## Perfiles y registro (2026-05)

- [x] Registro con elección de perfil + formulario específico (`POST /auth/register` con `profileType` / `profileData`)
- [x] Perfiles comerciales activos al crear (sin cola admin de perfiles)
- [x] Admin: ocultar «Perfiles pendientes» (`/admin/perfiles` redirige a `/admin`)
- [x] Script test user: `pnpm --filter api run user:restore-master` (`felipe.e.salom@gmail.com`) — rol `ADMIN` + memberships portales; **cerrar sesión y volver a entrar** para refrescar JWT
- [x] Portal `/admin/*` protegido en web (`ProfileProtectedLayout`, rol `ADMIN`); acceso desde `/profiles`, navbar «Administración» y URL directa
- [ ] Deprecar/eliminar endpoints legacy `RoleApplication` y `/admin/applications` (opcional)
- [ ] UI preferencias `notifyProducerEventStatus` en portal (backend ya soporta; default `true`)

---

## A. Infraestructura y backend

- [ ] Ejecutar migraciones Prisma en cada entorno (`prisma migrate deploy`) y `prisma generate` tras cambios de schema (incl. `20260608120000_producer_event_status_notifications` — kinds `EVENT_APPROVED_BY_ADMIN` / `EVENT_REJECTED_BY_ADMIN`)
- [ ] Confirmar cliente Prisma alineado con DB (hotel, inbox, **RentalLocation**, opening hours JSON, etc.)
- [ ] Rate limiting y hardening en producción
- [x] Variables Web Push documentadas (`USER_PORTAL.md`, `AI_ENTRYPOINT.md`, `BACKEND_CONTEXT.md`)
- [ ] Variables de entorno documentadas por app (resto de apps/servicios)

---

## B. Pagos y producción

- [ ] Integrar proveedor de pago real (hoy: demo confirm)
- [ ] Webhooks / reconciliación de pagos
- [ ] Política de reembolsos y revocación en flujo real

---

## C. Vertical hotel

- [ ] Usuario hotel de prueba en Prisma (registro manual; sin `demo:seed`)
- [ ] Edición de ficha desde portal `/hotel`
- [x] Portal `/hotel/valoraciones` — listado + réplica (`POST /hotel/reviews/:id/reply`)
- [ ] E2E: apply → admin aprueba → home carrusel `hotel`

---

## D. Gastro

- [ ] Scanner PWA: payload `yti:gastro-discount|…` y validación API
- [ ] Persistencia real de contenido gastro (stubs → Prisma)
- [ ] Storage para imágenes (salir de data-URL)
- [x] Portal `/gastro/valoraciones` — listado + réplica (`POST /gastro/reviews/:id/reply`)

---

## E. Rentals (Equipos y Rentals)

- [x] Admin: locales + productos por local, horarios estructurados, imágenes header/galería
- [x] Detalle público: hero con cover, galería miniaturas + modal, tarjetas local/WhatsApp (sin layout evento)
- [ ] WhatsApp: número real por local o config (hoy hardcoded demo)
- [ ] Subcategorías rental en explore/home si el producto lo prioriza

---

## F. Admin y operaciones

- [ ] Cola de eventos pendientes visible en dashboard
- [ ] Google Maps autocomplete (opcional; hoy OSM embed)
- [ ] Auditoría con filtros útiles en UI

---

## G. Frontend — UX y calidad

- [x] Compresión JPEG al subir galería/header (`RentalProductImagesForm` + `lib/image-compress.ts`) — evita error Zod `galleryUrls` > 2M chars
- [x] Empty / loading / error consistentes en portal `/me/*` (QueryError, EmptyState, skeletons)
- [ ] Empty / loading / error consistentes (resto del sitio)
- [ ] `next/image` + dominios remotos
- [ ] SEO metadata por ficha pública
- [ ] Sidebar móvil para portales
- [ ] Accesibilidad en modales
- [ ] Tema claro (opcional)

---

## H. Home y descubrimiento

- [x] Pantalla editorial post-splash / gateway (`/`, `/categorias`, grilla 2×2, copy Bariloche, footer home/explore — Slice 5)
- [x] Páginas `/categoria/[category]` + carruseles cruzados (`CrossCategoryRails`, Slice 6)
- [x] Home global: carruseles por `rankingScore` («más recomendados» / «mejor puntuados») vía `GET /public/events/recommended` + `useCategoryCarousels`
- [x] Landing por categoría: mismos carruseles en `/categoria/[category]`
- [x] Tabs de categoría en hero anónimo (Path A — 4 categorías sin hotel; `HOME_DISCOVERY_TABS`)
- [x] `fromPrice` / `producerName` en listados API (`GET /public/events*`, schema `EventSummary`)
- [x] Regla eventos vencidos en discovery público (`event-public-visibility.util.ts` + `PublicEventsService.publicWhere`)
- [x] `/explore` con filtros URL y metadata en cards (Slice 3)
- [x] Trending por `viewCount` (Slice 7)
- [ ] “Guardar para después” persistido
- [ ] Smoke E2E Playwright del flujo discovery (manual OK; automatizado pendiente)

---

## I. Tickets y Canvas

- [x] Render del ticket comprador desde `TicketTemplate` (`BuyerTicketVisual`, `/me/tickets/[ticketId]`)
- [x] QR comprador production-ready (mín. 200px, quiet zone, `yti:v1:` sin transformar)
- [x] Impresión ticket (`@media print`, metadatos, estado visible en print)
- [x] Compatibilidad scanner documentada + smoke `qrPayload` / `TRANSFER_PENDING` rechazado
- [ ] Validación final en staging con dispositivo físico (papel + lector en puerta)

---

## J. Referidos y documentación

- [x] Marketplace reventa eliminado — solo transferencia personal (`20260605120000_remove_resale_marketplace`)
- [ ] Comisiones referidores — reglas definitivas
- [x] Unificar docs context (`PROJECT_CONTEXT`, `FRONTEND_CONTEXT`, `BACKEND_CONTEXT` sin sufijos V1/V2/V3)
- [ ] Mantener este archivo al cerrar slices

---

## K. Productoras / Proveedores (portal + reseñas)

- [x] Perfil productor por bloques: API `GET/POST/PATCH /producer/profile`, rutas `/producer/profile/*` (create, identity, images, contact)
- [x] Slice 8: hub `/producer/profile` con completitud (frontend), preview pública liviana, bloques con estado, formularios pulidos; ficha `/producers/[id|slug]` sin cambios de contrato
- [x] Ficha pública productor (`/producers/[id|slug]`) y reseñas públicas de eventos
- [x] Portal: `/producer/comments` — reseñas de eventos + solicitud de revisión (disputa) vía inbox
- [x] Admin: cola `/admin/review-disputes` para resolver disputas de reseñas
- [x] Reseñas B2B (`CommercialRelationshipReview`): API + UI portal (valoración comercial privada)
- [x] Reviews V2 base: aspectos 1–10 por categoría, estados moderación, ranking/reputación servicios, `POST /me/reviews`, `GET /public/reviews*`, perfil `/users/[userId]` (ver `docs/reviews/REVIEWS_V2.md`)
- [x] UI pública: listados con desglose aspectos vía `listPublicV2` en fichas detalle (eventos, gastro, rental, excursión, hotel)
- [x] Carruseles «más recomendados» / «mejor puntuados» por `rankingScore` en landing por categoría y home global
- [x] Portal productora: aspectos, réplica, filtros 1–10 en `/producer/comments`
- [x] Slice 1: dashboard productor hub (`/producer`) — KPIs, engagement, alertas evento, próximos eventos (sin bloque accesos rápidos; navegación en sidebar)
- [x] Slice 2: métricas interacción — `viewCount` Event/ProducerProfile, `GET /producer/dashboard/metrics`, `POST /public/events|producers/.../view`
- [x] Slice 3: gestión eventos productor por estado — tabs, búsqueda, cards, empty states (`/producer/events`)
- [x] Slice 4: creación/edición eventos productor — formulario por bloques, validaciones visibles, preview, post-guardado (`/producer/events/new`, `/edit`, CTAs en detalle `?welcome=1` / `?saved=1`)
- [x] Slice 5: ticket types / tandas productor — cards resumen, timeline de tandas, ayuda UX, validaciones estructuradas, Ticket Studio link (`TicketTypesEditor` en detalle evento)
- [x] Slice 6: cortesías productor — `ProducerCourtesiesPageClient`, modos CONSUMES_BATCH / FREE_CAPACITY, listado otorgamientos, sin localStorage/fetch directo (`/producer/events/[eventId]/courtesies`)
- [x] Slice 7: referidos productor — ayuda UX, copy link con feedback, tabs mobile, evento refactor (`/producer/referrals`, `/producer/events/[eventId]/referrals`); aviso comisiones pendientes (sin inventar reglas)
- [x] Slice 8: perfil productor hub — completitud calculada en frontend (`producer-profile-completeness.ts`), checklist, preview liviana, bloques con badge, formularios con intro/ayuda; estado real `profile.status` (sin `publicVisibility` inventado); **slug único auto** desde `displayName` (`producer-profile-slug.util.ts`, sufijos `-2` si colisión)
- [x] Slice 9: comentarios productor — resumen con pendientes/disputas (API), filtros (respuesta, disputa OPEN, estado público, orden), cards/modales pulidos; `ManagedReviewsCommentsPage` parametrizado (gastro/hotel sin regresión)
- [x] Slice 10: notificaciones productor por estado de evento — `EVENT_APPROVED_BY_ADMIN` / `EVENT_REJECTED_BY_ADMIN`, hook en `AdminEventsService`, `ProducerEventStatusNotificationsService`, alertas en `/producer` vía `/me/notifications`
- [x] Trending real (`viewCount` + `rankingScore` en `GET /public/events/trending`; sin `recentScore` en schema — Slice 7)
- [x] Réplica gastro/hotel/admin por rutas dedicadas (`/gastro|hotel|admin/reviews/:id/reply`)
- [x] Formularios B2B con 4 aspectos comerciales (productora ↔ referido)
- [x] Smoke tests Reviews V2 — `pnpm --filter api run smoke:reviews` + guía `docs/guides/SMOKE_TESTS_GUIDE.md`
- [x] Perfil público comentarista `/users/[userId]` + badge reputación
- [x] Auth: JWT huérfano si usuario borrado → 401 en guard + `me.service` (logout/login; no spam `NotFoundError`)
- [ ] Moderación avanzada / notificaciones email para disputas (si aplica)
- [ ] Export o reporting de disputas y reseñas comerciales

_(Trending con `viewCount`: ver ítem Slice 2 arriba en § K.)_

---

## L. Portal usuario final (`/me/*`)

- [x] Etapa 0–1: docs + shared schemas + propuesta Prisma
- [x] Migración Prisma `20260601120000_user_portal_v1` (`UserCart`, `UserFavorite`, `UserExpectedEvent`, `TicketTransferOffer`, `TicketStatus` transfer)
- [x] Script migración `pnpm --filter api run migrate:user-portal-preferences` (dry-run / `--confirm`)
- [x] Backend: dashboard, cart, favorites, expected, activity, account, transfer offers; scanner rechaza `TRANSFER_PENDING`/`TRANSFERRED`
- [x] Backend: verificación manual / smoke script portal
- [x] Frontend: repos/hooks `mePortal`, `UserPortalLayout` `/me`, redirects `/cuenta/*` → `/me/*`
- [x] Carrito API para usuarios autenticados (evento + navbar); invitados siguen con `CartContext`
- [x] `EventEngagementRow` → `/me/favorites` y `/me/expected-events`
- [x] Migrar checkout público: `/checkout` → `/me/cart` si hay sesión; carrito API al agregar; `?orderId=` en checkout por evento
- [x] Detalle ticket portal (`/me/tickets/:id`) + transferencia V1 (crear/cancelar/aceptar)
- [x] Smoke tests API: `pnpm --filter api run smoke:user-portal` — ver `docs/guides/SMOKE_TESTS_GUIDE.md`
- [x] V2: notificaciones reales (cron 24h, email Resend, bandeja `/me/notifications`)
- [x] V2.1.3: push Web/Mobile base (`UserPushSubscription`, `/me/push-subscriptions`, `push-sw.js`, panel `/me/notifications`)
- [x] V2.1.2: reorden UX portal (inicio alertas/recomendados, Mi Carro, preferencias intereses/productoras/ciudad)
- [x] V2.1.4: alertas inteligentes — preferencias push, `deliver()` + canal `PUSH`, transferencias, reviews cron, CTA inicio
- [x] V2.1.4: hook publicación → seguidores productora (`EventPublicationAlertsService` + `FOLLOWED_PRODUCER_NEW_EVENT`)
- [x] V2.1.4: matching ciudad/categoría/subcategoría (`FAVORITE_INTEREST_NEW_CONTENT` + throttling simple por hora)
- [x] UI: preferencias de alertas push en desplegable (`InterestsDisclosure` en `/me/notifications`)
- [x] V2.2: ticket comprador + QR + impresión (`BuyerTicketVisual`, `DefaultBuyerTicket`, `@media print`, smoke `qrPayload`)
- [x] Seguir locales gastro (`UserGastroFollow`, `/me/gastro-follows`, `MePreferencesGastro`, `GastroFollowButton`)
- [x] V2: seguir productoras + recomendaciones (`UserProducerFollow`, `/me/producer-follows`, `/me/recommendations`)
- [x] Etapa 3 portal: pulido transferencia (email receptor, rechazo, cron expiración, textos legales)

---

## M. Scripts developer — auditoría npm (2026)

- [x] **A** Renombres: `seed:subcategories`, `user:restore-master`, `db:reset-dangerous`, `smoke:api`, `smoke:reviews` + `docs/dev/SCRIPTS.md`
- [x] **B** Smokes/E2E sin `@demo.local`; variables `SMOKE_*` / `E2E_*` obligatorias
- [x] **C** `user:inspect`, `user:test-login`, `debug:gastro-discounts`, `debug:admin-api`; scripts legacy fusionados/eliminados
- [x] **D** Cleanup post-smoke + `smoke:cleanup`; usuarios `*@smoke.yo-te-invito.test`; marcador `[smoke-test]` en reviews
- [x] **E** Context docs alineados (`AI_ENTRYPOINT`, `PROJECT_*`, `BACKEND_*`, `FRONTEND_*`, § M)
- [x] **Limpieza documental** `docs/guides/` → vigentes + `docs/legacy/guides/` + `DEVELOPER_SCRIPTS_GUIDE.md` + `SMOKE_TESTS_GUIDE.md`

---

## N. Usuario estándar + limpieza demo (2026-05)

- [x] Portal `/me/*` como hub único; redirects `/cuenta/*` → `/me/*`
- [x] Carrito API + checkout autenticado; `EventEngagementRow` en API
- [x] Transferencia personal V1 (`TicketTransferOffer`); sin marketplace reventa
- [x] Notificaciones `/me/notifications` + cron + push Web/Mobile (V2.1.3–V2.1.4); follows `/me/producer-follows`
- [x] Eliminados: `demo:seed*`, `demo:load`, LocalDB web, `/dev/seed`, `/reventa`, módulo `resale` API
- [x] Eliminados: Next.js `app/api/auth/*` y `app/api/admin/*` (solo NestJS)
- [x] Scripts: `user:*`, `smoke:*` con cleanup; `db:cleanup-content`, `db:reset-dangerous`
- [x] Context + guías developer alineados (`§ M`, `§ N`, `DEVELOPER_USERS.md`)

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `AI_ENTRYPOINT.md` | Índice IA + dev/QA rápido |
| `PROJECT_CONTEXT.md` | Visión + monorepo |
| `BACKEND_CONTEXT.md` | API + Prisma + scripts |
| `FRONTEND_CONTEXT.md` | Web + rentals UI + E2E |
| `FRONTEND_DEMO_NOTES.md` | Histórico demo |
| `guides/DEVELOPER_SCRIPTS_GUIDE.md` | Manual comandos npm |
| `guides/SMOKE_TESTS_GUIDE.md` | Smokes + E2E |
| `guides/README.md` | Índice guías vigentes |
| `docs/dev/SCRIPTS.md` | Referencia técnica IA |
| `legacy/guides/` | Histórico archivado |
| `docs/guides/DEMO_REMOVAL.md` | Regla pago demo / no datos demo |
| `docs/reviews/REVIEWS_V2.md` | Comentarios y valoraciones V2 |
| `docs/user/USER_PORTAL.md` | Portal usuario + push (V2.1.3–V2.1.4) + ticket (V2.2) |
| `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` | Checklist operativo V2 → producción |
| `docs/user/USER_PORTAL_PRISMA_PROPOSAL.md` | Diff modelo (pre-migrate) |

