# CONTEXT_PENDIENTES.md — Checklist de seguimiento

Lista viva de **pendientes y mejoras**. Marcá con `[x]` lo completado.

**Convención:** `- [ ]` pendiente · `- [x]` hecho

## Perfiles y registro (2026-05)

- [x] Registro con elección de perfil + formulario específico (`POST /auth/register` con `profileType` / `profileData`)
- [x] Perfiles comerciales activos al crear (sin cola admin de perfiles)
- [x] Admin: ocultar «Perfiles pendientes» (`/admin/perfiles` redirige a `/admin`)
- [x] Script test user: `pnpm --filter api run demo:enable-test-user-profiles` (`felipe.e.salom@gmail.com`)
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

- [ ] Usuario demo `hotel@demo.local` en Prisma si aplica
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

- [ ] Reventa E2E si se prioriza
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
- [x] Smoke tests Reviews V2 — `pnpm --filter api run smoke:reviews-v2` + guía `docs/guides/REVIEWS_V2_SMOKE_TESTS.md`
- [x] Perfil público comentarista `/users/[userId]` + badge reputación
- [x] Auth: JWT huérfano tras `demo:seed` → 401 en guard + `me.service` (logout/login; no spam `NotFoundError`)
- [ ] Trending real (`viewCount` / `recentScore` en ranking)
- [ ] Moderación avanzada / notificaciones email para disputas (si aplica)
- [ ] Export o reporting de disputas y reseñas comerciales

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `AI_ENTRYPOINT.md` | Índice IA |
| `PROJECT_CONTEXT.md` | Visión + monorepo |
| `BACKEND_CONTEXT.md` | API + Prisma + scripts |
| `FRONTEND_CONTEXT.md` | Web + rentals UI |
| `FRONTEND_DEMO_NOTES.md` | Histórico demo |
| `docs/reviews/REVIEWS_V2.md` | Comentarios y valoraciones V2 |

