# CONTEXT_PENDIENTES.md — Checklist de seguimiento

Lista viva de **pendientes y mejoras**. Marcá con `[x]` lo completado.

**Convención:** `- [ ]` pendiente · `- [x]` hecho

## Perfiles y registro (2026-05)

- [x] Registro con elección de perfil + formulario específico (`POST /auth/register` con `profileType` / `profileData`)
- [x] Perfiles comerciales activos al crear (sin cola admin de perfiles)
- [x] Admin: ocultar «Perfiles pendientes» (`/admin/perfiles` redirige a `/admin`)
- [x] Script test user: `pnpm --filter api run user:restore-master` (`felipe.e.salom@gmail.com`)
- [ ] Deprecar/eliminar endpoints legacy `RoleApplication` y `/admin/applications` (opcional)

---

## A. Infraestructura y backend

- [ ] Ejecutar migraciones Prisma en cada entorno (`prisma migrate deploy`) y `prisma generate` tras cambios de schema
- [ ] Confirmar cliente Prisma alineado con DB (hotel, inbox, **RentalLocation**, opening hours JSON, etc.)
- [ ] Rate limiting y hardening en producción
- [ ] Variables de entorno documentadas por app

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
- [ ] Empty / loading / error consistentes
- [ ] `next/image` + dominios remotos
- [ ] SEO metadata por ficha pública
- [ ] Sidebar móvil para portales
- [ ] Accesibilidad en modales
- [ ] Tema claro (opcional)

---

## H. Home y descubrimiento

- [x] Home global: carruseles por `rankingScore` («más recomendados» / «mejor puntuados») vía `GET /public/events/recommended` + `useCategoryCarousels`
- [x] Landing por categoría: mismos carruseles en `/categoria/[category]`
- [ ] Tabs de categoría en hero anónimo (Path A en `FRONTEND_CONTEXT.md`)
- [ ] `fromPrice` / `producerName` en listados API
- [ ] “Guardar para después” persistido

---

## I. Tickets y Canvas

- [ ] Render del ticket comprador desde `TicketTemplate`
- [ ] Pruebas impresión / QR en plantillas reales

---

## J. Referidos y documentación

- [x] Marketplace reventa eliminado — solo transferencia personal (`20260605120000_remove_resale_marketplace`)
- [ ] Comisiones referidores — reglas definitivas
- [x] Unificar docs context (`PROJECT_CONTEXT`, `FRONTEND_CONTEXT`, `BACKEND_CONTEXT` sin sufijos V1/V2/V3)
- [ ] Mantener este archivo al cerrar slices

---

## K. Productoras / Proveedores (portal + reseñas)

- [x] Perfil productor por bloques: API `GET/POST/PATCH /producer/profile`, rutas `/producer/profile/*` (create, identity, images, contact)
- [x] Ficha pública productor (`/producers/[id|slug]`) y reseñas públicas de eventos
- [x] Portal: `/producer/comments` — reseñas de eventos + solicitud de revisión (disputa) vía inbox
- [x] Admin: cola `/admin/review-disputes` para resolver disputas de reseñas
- [x] Reseñas B2B (`CommercialRelationshipReview`): API + UI portal (valoración comercial privada)
- [x] Reviews V2 base: aspectos 1–10 por categoría, estados moderación, ranking/reputación servicios, `POST /me/reviews`, `GET /public/reviews*`, perfil `/users/[userId]` (ver `docs/reviews/REVIEWS_V2.md`)
- [x] UI pública: listados con desglose aspectos vía `listPublicV2` en fichas detalle (eventos, gastro, rental, excursión, hotel)
- [x] Carruseles «más recomendados» / «mejor puntuados» por `rankingScore` en landing por categoría y home global
- [x] Portal productora: aspectos, réplica, filtros 1–10 en `/producer/comments`
- [x] Réplica gastro/hotel/admin por rutas dedicadas (`/gastro|hotel|admin/reviews/:id/reply`)
- [x] Formularios B2B con 4 aspectos comerciales (productora ↔ referido)
- [x] Smoke tests Reviews V2 — `pnpm --filter api run smoke:reviews` + guía `docs/guides/SMOKE_TESTS_GUIDE.md`
- [x] Perfil público comentarista `/users/[userId]` + badge reputación
- [x] Auth: JWT huérfano si usuario borrado → 401 en guard + `me.service` (logout/login; no spam `NotFoundError`)
- [ ] Trending real (`viewCount` / `recentScore` en ranking)
- [ ] Moderación avanzada / notificaciones email para disputas (si aplica)
- [ ] Export o reporting de disputas y reseñas comerciales

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
- [x] Notificaciones `/me/notifications` + cron; follows `/me/producer-follows`
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
| `docs/user/USER_PORTAL.md` | Portal usuario final V1 |
| `docs/user/USER_PORTAL_PRISMA_PROPOSAL.md` | Diff modelo (pre-migrate) |

