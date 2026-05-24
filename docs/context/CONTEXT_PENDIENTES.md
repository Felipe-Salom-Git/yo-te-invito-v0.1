# CONTEXT_PENDIENTES.md — Checklist de seguimiento

Lista viva de **pendientes y mejoras**. Marcá con `[x]` lo completado.

**Convención:** `- [ ]` pendiente · `- [x]` hecho

## Perfiles y registro (2026-05)

- [x] Auditar flujo actual de registro con elección de perfil — `docs/audits/REGISTER_ONBOARDING_AUDIT.md` (Slice 1, 2026-05-24)
- [x] Matriz definitiva de campos por tipo de perfil — `docs/onboarding/PROFILE_FIELDS_MATRIX.md` (Slice 2, 2026-05-24; decisión Rental: no wizard V2)
- [x] Registro/onboarding Slice 3: schemas register/apply unificados por perfil — `docs/onboarding/REGISTER_SCHEMA_ALIGNMENT.md` (2026-05-24)
- [x] Registro/onboarding Slice 4: hardening legal signup — `docs/onboarding/LEGAL_SIGNUP_HARDENING.md` (2026-05-24)
- [x] Registro/onboarding Slice 5: wizard base + comprador — `docs/onboarding/REGISTER_BUYER_WIZARD_BASE.md` (2026-05-24)
- [x] Registro/onboarding Slice 6: formulario productora — `docs/onboarding/REGISTER_PRODUCER_FORM.md` (2026-05-24)
- [x] Registro/onboarding Slice 7: formulario gastronómico — `docs/onboarding/REGISTER_GASTRO_FORM.md` (2026-05-24)
- [x] Registro/onboarding Slice 8: rental sin signup V2 — `docs/onboarding/REGISTER_RENTAL_DECISION.md` (2026-05-24)
- [x] Registro/onboarding Slice 9: formulario hotel — `docs/onboarding/REGISTER_HOTEL_FORM.md` (2026-05-24)
- [x] Registro con elección de perfil + formulario específico (`POST /auth/register` con `profileType` / `profileData`)
- [x] Perfiles comerciales activos al crear (sin cola admin de perfiles)
- [x] Admin: ocultar «Perfiles pendientes» (`/admin/perfiles` redirige a `/admin`)
- [x] Script test user: `pnpm --filter api run user:restore-master` (`felipe.e.salom@gmail.com`) — rol `ADMIN` + memberships portales; **cerrar sesión y volver a entrar** para refrescar JWT
- [x] Portal `/admin/*` protegido en web (`ProfileProtectedLayout`, rol `ADMIN`); acceso desde `/profiles` y URL directa
- [x] **Navbar V2** (2026-05): responsive, drawer mobile, ciudad, carro, portales, a11y, smoke — checklist V2 § Navbar cerrado
- [ ] Deprecar/eliminar endpoints legacy `RoleApplication` y `/admin/applications` (opcional)
- [ ] UI preferencias `notifyProducerEventStatus` en portal (backend ya soporta; default `true`)

---

## Legal Admin (documentos administrables) — módulo técnico cerrado

> Referencia operativa: **`docs/legal/LEGAL_ADMIN_MODULE.md`** · QA manual: **`docs/dev/LEGAL_ADMIN_QA_SMOKE.md`** · Smokes: `pnpm --filter api run smoke:legal`

- [x] **Slice 2 (2026-05-24):** modelos Prisma, migración, schemas shared, módulo `legal`, endpoints lectura, seed `seed:legal-documents`
- [x] **Slice 3 (2026-05-24):** `PATCH` metadata, `POST` draft/publish, archivado automático, validación anti-placeholder, `AuditLog` en mutaciones, smoke ampliado `test:legal-documents`
- [x] **Slice 4 (2026-05-24):** UI admin `/admin/legales` (listado, detalle, versiones), `LegalDocumentsRepo`, hooks TanStack Query, nav admin «Legales»
- [x] **Slice 5 (2026-05-24):** páginas públicas `/legal/[slug]` dinámicas (API publicada, metadata, 404 controlado)
- [x] **Slice 6 (2026-05-24):** `GET/POST /me/legal/*`, requirements, aceptación por versión, hooks/componentes reutilizables, `test:me-legal-acceptance`
- [x] **Slice 7 (2026-05-24):** footer legales, registro + `POST /me/legal/accept` post-signup, checkout (`/me/cart`, `/checkout/*`), banner portal comercial, `GET /public/legal/requirements`
- [x] **Slice 8 (2026-05-24):** QA/hardening, `smoke:legal`, `docs/legal/LEGAL_ADMIN_MODULE.md`, smoke manual `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`
- [x] **Slice Legal Content 1 (2026-05-24):** `seed:legal-content` — importa `docs/legal/*.md` como DRAFT (no auto-publish)
- [x] **Legales V2 (2026-05-24):** layout portales ampliado (`PORTAL_BODY_CLASS` `max-w-screen-2xl`, `PortalPageContext` + `PageContainer` sin doble `max-w`); listado `/admin/legales` — tabla administrativa original (`overflow-x-auto`, `min-w-[900px]`, `md:block`) + cards mobile (`md:hidden`)
- [x] **Slice Legal Content 2 (2026-05-24):** aclaraciones productor ↔ referido en `docs/legal/` (`terms_general`, `producer_terms`, `referrer_terms`) + disclaimers UI referidos/productor; actualizar borradores con `seed:legal-content --force` (sin auto-publish)
- [ ] Revisión/aprobación cliente y **publicación** de versiones legales en `/admin/legales`
- [ ] Confirmar publicación de aclaraciones legales productor ↔ referido (tras publish manual en admin)
- [ ] Bloqueos duros portal (publicar evento, descuentos gastro, pago referido, etc.) si faltan términos
- [ ] Migrar disclaimers hardcoded (transferencia, referidos) a documentos publicados

### Registro / legales (checklist V2 — integración)

- [x] Aceptación obligatoria términos generales en registro (`SIGNUP`, docs publicados)
- [x] Links legales en registro, checkout, footer, portales
- [x] Matriz campos signup vs onboarding por perfil — `docs/onboarding/PROFILE_FIELDS_MATRIX.md`
- [x] Schemas register/apply alineados (Slice 3) — `docs/onboarding/REGISTER_SCHEMA_ALIGNMENT.md`
- [x] Hardening legal signup (Slice 4) — `docs/onboarding/LEGAL_SIGNUP_HARDENING.md` (requirements `canProceed`, register transaccional, retry UI)
- [x] Pulir formulario registro comprador / wizard base (Slice 5) — `docs/onboarding/REGISTER_BUYER_WIZARD_BASE.md`
- [x] Pulir formulario registro productora (Slice 6) — `docs/onboarding/REGISTER_PRODUCER_FORM.md`
- [x] Pulir formulario registro gastronómico (Slice 7) — `docs/onboarding/REGISTER_GASTRO_FORM.md`
- [x] Rental / proveedor equipos: sin wizard V2, admin + CTA público (Slice 8) — `docs/onboarding/REGISTER_RENTAL_DECISION.md`
- [x] Pulir formulario registro hotel (Slice 9) — `docs/onboarding/REGISTER_HOTEL_FORM.md`
- [x] Pulir formulario registro referido (Slice 10) — `docs/onboarding/REGISTER_REFERRER_FORM.md`
- [x] Textos de responsabilidad UX por tipo de usuario centralizados (Slice 11) — `docs/onboarding/PROFILE_RESPONSIBILITY_COPY.md`
- [x] Estado visual completitud/onboarding post-registro (Slice 12) — `docs/onboarding/PROFILE_COMPLETION_ONBOARDING.md`
- [x] Mensajes de error y validaciones visibles en registro (Slice 13) — `docs/onboarding/REGISTER_ERROR_VALIDATION_UX.md`
- [x] UX mobile + accesibilidad registro completo (Slice 14) — `docs/onboarding/REGISTER_ONBOARDING_SMOKE.md`
- [x] Fixes registro email duplicado + hotel provincia/ciudad (Slice 12.5) — `docs/onboarding/REGISTER_FORM_FIXES_EMAIL_HOTEL_LOCATION.md`
- [x] Registro gastro: select provincia/ciudad dependiente (Slice 12.6) — `docs/onboarding/REGISTER_GASTRO_LOCATION_SELECT.md`
- [x] **Bloque registro/onboarding por tipo de usuario (V2) cerrado** — slices 1–14 + 12.5–12.6; smoke: `docs/onboarding/REGISTER_ONBOARDING_SMOKE.md`
- [ ] Redacción/publicación legal profesional por vertical (contenido en `docs/legal/`, no solo copy UX)

---

## A. Infraestructura y backend

- [ ] Ejecutar migraciones Prisma en cada entorno (`prisma migrate deploy`) y `prisma generate` tras cambios de schema (incl. `20260524120000_legal_documents`, `20260608120000_producer_event_status_notifications`)
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

**Gastro y Hoteles V2 (2026-05-22):** bloque checklist cerrado — discovery Próximamente, portal editable, ficha pública, E2E mínimo. Pendientes abajo son post-V2.

- [ ] Usuario hotel de prueba en Prisma (registro manual; sin `demo:seed`)
- [x] Edición de ficha desde portal `/hotel` (Slice 10: `GET/PATCH /hotel/me`, `/hotel/editar`; discovery sigue Próximamente)
- [x] Portal `/hotel/valoraciones` — listado + réplica (`POST /hotel/reviews/:id/reply`)
- [x] Hoteles V2 «Próximamente» — rutas públicas y portal sin CTAs de reserva (Slice 8–11: `/hoteles`, `/hoteles/[id]` informativa, portal editable, API pública hotel)
- [x] E2E mínimo hotel (`e2e/hotel.spec.ts`, `E2E_HOTEL_*`, `docs/hotel/HOTEL_E2E.md`) — portal, ficha pública, gateway, admin tab
- [ ] E2E: apply → admin aprueba → home carrusel `hotel` (fuera de V2; discovery sin carrusel hotel)

---

## D. Gastro

**Gastro y Hoteles V2 (2026-05-22):** bloque V2 operativo cerrado (QR, scanner, contenido, ficha, dashboard, reviews/follows). Pendientes: storage, `smoke:gastro-discounts` npm, E2E gastro dedicado.

- [x] Payload QR descuentos v1 (`yti:gastro-discount:v1:discountId:token`) — emisión en claim/aprobación; ver `docs/gastro/GASTRO_DISCOUNT_QR.md`
- [x] Scanner PWA: `POST /scanner/gastro-discounts/validate`, payload v1, `GastroDiscountValidation.claimId` (Slice 5)
- [x] Persistencia real de contenido gastro (`GastroContent` Prisma + `/gastro/events/:eventId/content`; público en ficha `GET /public/gastro-locations*`)
- [x] Ficha pública gastro pulida (`/restaurants/[id]`, `GastroPublicDetailContent`; sin ticketera; redirect `/events/:id` gastro → restaurants)
- [x] Dashboard gastro V2 (`GET /gastro/dashboard`, KPIs reales, alertas, `/gastro/validaciones` con filtros y paginación)
- [x] Gastro + Reviews V2 + follows + alerta `FOLLOWED_GASTRO_NEW_DISCOUNT` (Slice 7 — `docs/gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md`)
- [ ] Storage para imágenes (salir de data-URL)
- [x] Portal `/gastro/valoraciones` — listado + réplica (`POST /gastro/reviews/:id/reply`)

---

## E. Rentals (Equipos y Rentals)

- [x] Admin: locales + productos por local, horarios estructurados, imágenes header/galería
- [x] Detalle público: hero con cover, galería miniaturas + modal, tarjetas local/WhatsApp (sin layout evento)
- [x] WhatsApp: número real por local (`whatsappPhone` en `RentalLocation`, CTA público sin fallback demo)
- [x] Cards públicas discovery: badge «Alquiler», local/subcategoría, sin fecha/entradas (`contentCardPresentation.ts`)
- [x] Subcategorías rental en explore/home/categoría (`seed:subcategories`, filtros explore, `SubcategoryRail`, cards con `subcategoryName`)
- [x] Auditoría anti-alojamiento rentals (`lib/rentals/publicCopy.ts`, gateway Unsplash kayaks, sin 🏠 en hero)
- [x] Detalle público mobile (`RentalProductDetailContent`, `RentalMobileStickyCta`, CTA «Consultar disponibilidad», horario solo en `RentalLocalCard`, galería sin duplicar cover)

---

## F. Admin y operaciones

- [x] Cola de eventos pendientes visible en dashboard (`GET /admin/dashboard`, `AdminPendingEventsQueue` en `/admin`)
- [x] Mejorar filtros de eventos admin (`/admin/eventos`, `GET /admin/events` extendido, filtros URL + tabs)
- [x] Mejorar filtros de usuarios admin (`/admin/usuarios`, `GET /admin/users` extendido, filtros URL + paginación, perfiles en listado)
- [x] Confirmar gestión completa de subcategorías (`/admin/categorias`, CRUD 4 verticales activas, hotel Próximamente, `seed:subcategories` intacto)
- [ ] Google Maps autocomplete (opcional; hoy OSM embed)
- [x] Auditoría con filtros útiles en UI (`/admin/auditoria`, `GET /admin/audit-logs` extendido)

**Bloque Admin Operativo (Slices 1–5, 2026-05):** cerrado — dashboard + cola pendientes, eventos/usuarios/auditoría con filtros API, subcategorías admin, hoteles «Próximamente» en dashboard y categorías. Fuera de bloque: pagos reales, storage, portal productor completo.

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

## H0. Footer público completo (2026-05-24) — bloque cerrado

> Auditoría: `docs/audits/PUBLIC_FOOTER_AUDIT.md` · Smoke: `PUBLIC_FOOTER_SMOKE.md` · Cierre: `PUBLIC_FOOTER_CLOSING_AUDIT.md` · Checklist V2 § Footer público completo

- [x] Slices 1–5: auditoría, visibilidad, API contacto pública, UI dark premium, responsive/a11y
- [x] `GET /public/platform-config` + `usePublicPlatformConfig` (footer sin `/admin/config`)
- [ ] Datos reales: Instagram, contacto institucional, web/red equipo desarrollador (post-bloque)

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
- [x] Comisiones referidores — reglas definitivas (`docs/referrals/REFERRALS_V2.md`)
- [x] Referidos V2 Slice 2 — API propuestas comerciales (`ReferralCommercialProposal` / `Agreement`, rutas producer/referrer)
- [x] Referidos V2 Slice 3 — cálculo comisión generada por orden PAID (`ReferralCommissionService`, hook pagos)
- [x] Referidos V2 Slice 4–7 — portales, solicitud de pago manual, métricas
- [x] Referidos V2 Slice 8 — QA: `smoke:referrals`, `test:referral-proposals|commission|payment-requests`
- [ ] Deprecar flujo legacy `POST /me/commissions/request` y tab comisiones legacy en evento (opcional)
- [x] Unificar docs context (`PROJECT_CONTEXT`, `FRONTEND_CONTEXT`, `BACKEND_CONTEXT` sin sufijos V1/V2/V3)
- [ ] Mantener este archivo al cerrar slices

---

## K. Productoras / Proveedores (portal + reseñas)

**Reviews V2 — reputación y moderación (checklist producción § Reviews):** [x] UI pública, perfil comentarista, filtros, cola admin disputas, notificaciones in-app/email/push, reporte `/admin/reviews` + export CSV. Doc: `docs/reviews/REVIEWS_V2.md`.

- [x] Perfil productor por bloques: API `GET/POST/PATCH /producer/profile`, rutas `/producer/profile/*` (create, identity, images, contact)
- [x] Slice 8: hub `/producer/profile` con completitud (frontend), preview pública liviana, bloques con estado, formularios pulidos; ficha `/producers/[id|slug]` sin cambios de contrato
- [x] Ficha pública productor (`/producers/[id|slug]`) y reseñas públicas de eventos
- [x] Portal: `/producer/comments` — reseñas de eventos + solicitud de revisión (disputa) vía inbox
- [x] Admin: cola `/admin/review-disputes` para resolver disputas de reseñas
- [x] Pulir cola admin disputas: contexto en listado (reseña, autor, entidad, productor, motivo, estado review), filtros `status`/`category`/`q`, confirmaciones en acciones, hide/restore, tabla + cards mobile, auditoría
- [x] Reseñas B2B (`CommercialRelationshipReview`): API + UI portal (valoración comercial privada)
- [x] Reviews V2 base: aspectos 1–10 por categoría, estados moderación, ranking/reputación servicios, `POST /me/reviews`, `GET /public/reviews*`, perfil `/users/[userId]` (ver `docs/reviews/REVIEWS_V2.md`)
- [x] UI pública: listados con desglose aspectos vía `listPublicV2` en fichas detalle (eventos, gastro, rental, excursión, hotel)
- [x] Slice UI pública reviews: jerarquía premium (`ReviewSummary`/`ReviewCard`), empty/loading/error (`ReviewEmptyState`, `ReviewListSkeleton`, `QueryError`), paginación unificada, productora pública y `/users/[userId]` alineados
- [x] Perfil público comentarista `/users/[userId]`: header reputación, stats API (`averageOverallRating`, `categoriesCommented`, `reviewsWithOfficialReplyCount`), 404/empty, hook `useUserPublicReviews`, sin email en display público
- [x] Filtros reviews: API pública `sort`/`replyFilter`/`overallRating`; UI `PublicReviewsFiltersBar` en fichas + perfil; portales managed con URL params; gastro/hotel con respuesta y orden
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
- [x] Notificaciones reviews/disputas: `ReviewNotificationsService`, kinds V2, preferencias `notifyManagedReviews` / `notifyReviewEngagement`, bandeja `/me/notifications`
- [x] Reporting admin reseñas públicas: `GET /admin/reviews/report`, vista `/admin/reviews`, export CSV (máx. 500 filas; sin B2B)

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
| `docs/audits/GASTRO_HOTELES_V2_AUDIT.md` | Auditoría cierre Gastro/Hoteles V2 |
| `docs/audits/PUBLIC_FOOTER_AUDIT.md` | Footer público — bloque cerrado Slices 1–5 (2026-05-24) |
| `docs/audits/PUBLIC_FOOTER_SMOKE.md` | Smoke / QA footer público |
| `docs/audits/PUBLIC_FOOTER_CLOSING_AUDIT.md` | Auditoría de cierre bloque footer (2026-05-24) |
| `docs/hotel/HOTEL_E2E.md` | E2E Playwright vertical hotel |
| `docs/gastro/GASTRO_DISCOUNT_QR.md` | QR descuentos gastro v1 |
| `docs/user/USER_PORTAL_PRISMA_PROPOSAL.md` | Diff modelo (pre-migrate) |

