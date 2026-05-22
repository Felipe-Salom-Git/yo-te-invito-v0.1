# Yo Te Invito — Checklist V2 → Producción

## Portal usuario / comprador

- [x] Pulir portal usuario `/me/*`.
- [x] Pulir detalle de orden `/me/orders/[orderId]`.
- [x] Reordenar UX del portal usuario: Inicio, Mi Carro y Preferencias.
- [x] Mover productoras seguidas dentro de Preferencias/Favoritos.
- [x] Agregar ciudad preferida en registro y cuenta.
- [x] Agregar categorías y subcategorías favoritas con checks.
- [x] Mostrar recomendaciones en el inicio `/me`.
- [x] Mostrar alertas importantes en el inicio `/me`.
- [x] Implementar push notifications mobile/web.
- [x] Conectar push notifications con alertas inteligentes.
- [x] Hook publicación evento → seguidores productora (`EventPublicationAlertsService`).
- [x] Matching ciudad/categoría/subcategoría con throttling simple (`SMART_ALERTS_MAX_PER_USER_HOUR`).

## Tickets y scanner

- [x] Renderizar ticket final comprador usando `TicketTemplate`.
- [x] Fallback premium de ticket si no hay template (`DefaultBuyerTicket`).
- [x] QR visible, escaneable e imprimible (mín. 200px, ECC M, quiet zone).
- [x] Botón/vista de impresión de ticket (`@media print`).
- [x] Smoke: `qrPayload` `yti:v1:` + scanner rechaza `TRANSFER_PENDING` (`smoke:user-portal`).
- [x] Estados visuales en ticket (overlay + banner en impresión).
- [ ] Validación final en staging con dispositivo físico (papel + lector en acceso).
- [X] Probar scan completo VALID→USED en entorno dedicado (`pnpm --filter api run test:door-scan` — consume el ticket).

## Portal productor

- [x] Pulir dashboard productor.
- [x] Agregar métricas de interacción por evento: vistas, favoritos y esperados.
- [x] Agregar métricas acumuladas de productora: vistas de eventos, favoritos/esperados de eventos, vistas de perfil y seguidores de productora.
- [x] Mejorar gestión de eventos por estado.
- [x] Pulir creación/edición de eventos.
- [x] Pulir ticket types / tandas.
- [x] Pulir cortesías.
- [x] Pulir referidos del productor.
- [x] Pulir perfil productor por bloques.
- [x] Pulir comentarios, réplicas y disputas.
- [x] Notificaciones in-app/email/push para evento aprobado por admin.
- [x] Notificaciones in-app/email/push para evento rechazado por admin.
- [x] Alertas de estado de evento visibles en dashboard productor.

## Descubrimiento público

- [x] Terminar pantalla editorial post-splash (grilla 2×2, copy, `/` + `/categorias`, footer home/explore, sin hotel).
- [x] Terminar páginas por categoría (hero, editorial, subcategorías, carruseles, Ver más → explore).
- [x] Agregar carruseles cruzados por categoría (3 rails sin categoría actual ni hotel, Ver más → `/categoria/*`).
- [x] Agregar `fromPrice` en cards/listados (API `EventSummary`; UI `ContentCard`/`PriceBadge`).
- [x] Agregar `producerName` en cards/listados (API `EventSummary`; UI `ProducerMeta`).
- [x] Aplicar regla de eventos vencidos públicamente (`mergePublicEventVisibility` en list/search/trending/recommended/detail; tests `test:event-visibility`).
- [x] Mejorar `/explore` (filtros URL, subcategoría, metadata en cards, estados loading/empty/error).
- [x] Revisar home pública con recomendaciones y categorías (4 categorías, sin hotel en discovery, Ver más, metadata cards).
- [x] Trending real (`viewCount` / ranking en `GET /public/events/trending`; carril «Lo más visto»).

## Rentals / Equipos y Rentals

- [x] Configurar WhatsApp real por local.
- [x] Pulir cards públicas de rentals.
- [x] Integrar subcategorías rental en explore/home.
- [x] Confirmar que rentals no use imágenes ni textos de alojamientos.
- [x] Revisar detalle rental final en mobile.

## Admin operativo

_Bloque cerrado (Slices 1–5): dashboard, cola pendientes, eventos/usuarios/auditoría con filtros, subcategorías admin, hoteles Próximamente._

- [x] Mejorar dashboard admin (`/admin`, `AdminDashboardClient`, KPIs reales vía `GET /admin/dashboard`).
- [x] Agregar cola visible de eventos pendientes (cola en dashboard + CTA «Revisar» → `/admin/productoras/:id`).
- [x] Mejorar filtros de auditoría (`/admin/auditoria`, filtros backend-first en `GET /admin/audit-logs`).
- [x] Mejorar filtros de eventos admin (`/admin/eventos`, búsqueda, estado, categoría, ciudad, tabs, API paginada).
- [x] Mejorar filtros de usuarios/eventos admin (usuarios: `/admin/usuarios`; eventos: Slice 2).
- [x] Confirmar gestión completa de subcategorías (`/admin/categorias`, CRUD event/gastro/rental/excursion, editar nombre, orden, activar/desactivar, banners).
- [x] Mostrar Hoteles como “Próximamente” donde corresponda (dashboard verticales + tab Hoteles en `/admin/categorias`).

## Reviews, reputación y moderación

- [ ] Pulir UI pública de reviews.
- [ ] Pulir perfil público de comentarista.
- [ ] Pulir filtros de reviews.
- [ ] Pulir cola admin de disputas.
- [ ] Definir notificaciones/email para disputas.
- [ ] Evaluar reporting/export de reviews y disputas.

## Gastro y Hoteles

- [ ] Definir alcance real de Gastro para V2.
- [ ] Definir alcance real de Hoteles para V2.
- [ ] Si Gastro sale en V2, cerrar scanner/QR de descuentos.
- [ ] Si Gastro sale en V2, cerrar persistencia real de contenido.
- [ ] Si Hoteles sale en V2, cerrar edición de ficha desde `/hotel`.
- [ ] Si Hoteles no sale, mantenerlo como “Próximamente”.

## Referidos

- [ ] Definir reglas definitivas de comisiones.
- [ ] Pulir flujo productor ↔ referido.
- [ ] Pulir métricas de referidos.
- [ ] Definir si la liquidación será manual o automática en V2.

## Responsive, SEO y GEO

- [ ] Hacer responsive polish general.
- [ ] Revisar mobile de home, explore, detalle, checkout y portales.
- [ ] Agregar SEO metadata por ficha pública.
- [ ] Agregar SEO por categoría.
- [ ] Revisar GEO/localización para ciudad preferida y descubrimiento.
- [ ] Configurar `next/image` con dominios remotos cuando haya storage.

## Producción técnica

- [ ] Contratar VPS.
- [ ] Configurar dominio.
- [ ] Configurar PostgreSQL producción.
- [ ] Configurar Redis producción.
- [ ] Configurar variables de entorno producción.
- [ ] Ejecutar migraciones Prisma en producción.
- [ ] Crear/restaurar usuario admin real.
- [ ] Ejecutar seed de subcategorías.
- [ ] Configurar backups automáticos.
- [ ] Configurar logs/monitoreo.
- [ ] Configurar rate limiting y hardening.

## Storage

- [ ] Contratar/configurar AWS S3 o equivalente.
- [ ] Implementar upload real de imágenes.
- [ ] Reemplazar data-URL por URLs de storage.
- [ ] Configurar límites de peso/formato.
- [ ] Configurar cleanup de imágenes huérfanas.

## Pagos reales

- [ ] Elegir proveedor de pago.
- [ ] Implementar checkout real.
- [ ] Implementar webhooks.
- [ ] Reconciliar pagos con órdenes/tickets.
- [ ] Definir política de reembolsos.
- [ ] Mantener pago demo solo para staging/dev.

## QA final

- [ ] Ejecutar smoke `user-portal`.
- [ ] Ejecutar smoke `reviews`.
- [ ] Ejecutar smoke `notifications`.
- [ ] Ejecutar smoke `producer-follows`.
- [ ] Ejecutar E2E portal.
- [ ] Ejecutar E2E checkout.
- [ ] Ejecutar E2E notifications.
- [ ] Probar flujo comprador completo.
- [ ] Probar flujo productor completo.
- [ ] Probar flujo admin completo.
- [ ] Probar scanner real.
- [ ] Probar mobile real.
- [ ] Hacer limpieza de datos de prueba antes de producción.

## Legal / operación

- [ ] Agregar términos y condiciones.
- [ ] Agregar política de privacidad.
- [ ] Agregar política de compra/cancelación/reembolso.
- [ ] Agregar condiciones para productores/proveedores.
- [ ] Agregar condiciones de transferencia de tickets.
- [ ] Preparar procedimiento interno de soporte.

