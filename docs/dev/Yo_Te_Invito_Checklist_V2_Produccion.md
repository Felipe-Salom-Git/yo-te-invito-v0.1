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
- [ ] Probar scan completo VALID→USED en entorno dedicado (`pnpm --filter api run test:door-scan` — consume el ticket).

## Portal productor

- [ ] Pulir dashboard productor.
- [ ] Mejorar gestión de eventos por estado.
- [ ] Pulir creación/edición de eventos.
- [ ] Pulir ticket types / tandas.
- [ ] Pulir cortesías.
- [ ] Pulir referidos del productor.
- [ ] Pulir perfil productor por bloques.
- [ ] Pulir comentarios, réplicas y disputas.

## Descubrimiento público

- [ ] Terminar pantalla editorial post-splash.
- [ ] Terminar páginas por categoría.
- [ ] Agregar carruseles cruzados por categoría.
- [ ] Agregar `fromPrice` en cards/listados.
- [ ] Agregar `producerName` en cards/listados.
- [ ] Aplicar regla de eventos vencidos públicamente.
- [ ] Mejorar `/explore`.
- [ ] Revisar home pública con recomendaciones y categorías.

## Rentals / Equipos y Rentals

- [ ] Configurar WhatsApp real por local.
- [ ] Pulir cards públicas de rentals.
- [ ] Integrar subcategorías rental en explore/home.
- [ ] Confirmar que rentals no use imágenes ni textos de alojamientos.
- [ ] Revisar detalle rental final en mobile.

## Admin operativo

- [ ] Mejorar dashboard admin.
- [ ] Agregar cola visible de eventos pendientes.
- [ ] Mejorar filtros de auditoría.
- [ ] Mejorar filtros de usuarios/eventos.
- [ ] Confirmar gestión completa de subcategorías.
- [ ] Mostrar Hoteles como “Próximamente” donde corresponda.

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

