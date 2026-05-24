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

- [x] Pulir UI pública de reviews.
- [x] Pulir perfil público de comentarista.
- [x] Pulir filtros de reviews.
- [x] Pulir cola admin de disputas.
- [x] Definir notificaciones/email para disputas.
- [x] Evaluar reporting/export de reviews y disputas.

## Gastro y Hoteles

_Bloque cerrado Slice 9 (QA 2026-05-22): alcance documentado, checklist y smokes/scripts gastro; hoteles Próximamente._

- [x] Definir alcance real de Gastro para V2 (**parcial operativo**: discovery, ficha, contenido, QR/scanner, dashboard, reviews/follows/alertas; fuera: storage CDN, `smoke:gastro-discounts` npm, unificar legacy discounts).
- [x] Definir alcance real de Hoteles para V2 (**Próximamente** — Slice 8 hardening; sin gateway ni subcategorías activas).
- [x] Emitir QR descuentos con payload v1 (`buildGastroDiscountQrPayload`, claim + aprobación admin).
- [x] Scanner/QR descuentos gastro: `POST /scanner/gastro-discounts/validate` + PWA `apps/scanner` (Slice 5); QA `test:gastro-discount-qr` + `test:gastro-discount-scan` OK.
- [x] Dashboard gastro + resumen validaciones (`/gastro`, `/gastro/validaciones`, Slice 6).
- [x] Gastro reviews/follows/alertas descuento (Slice 7 — `GASTRO_FOLLOWS_NOTIFICATIONS.md`).
- [x] Si Gastro sale en V2, cerrar persistencia real de contenido (`GastroContent`, portal `/gastro/contenido`, ficha pública).
- [x] Pulir ficha pública gastro `/restaurants/[id]` (local real, descuentos, reviews V2, follow; sin compra de entradas).
- [x] Si Hoteles sale en V2, cerrar edición de ficha desde `/hotel` (Slice 10 opcional: `PATCH /hotel/me`, `/hotel/editar`, completitud + preview).
- [x] Ficha pública liviana `/hoteles/[id]` (Slice 11 opcional: API pública hotel, contacto real, reviews; sin booking).
- [x] E2E mínimo hotel (`e2e/hotel.spec.ts`, Slice 12 — skip sin `E2E_HOTEL_*`).
- [x] Si Hoteles no sale, mantenerlo como “Próximamente” (Slice 8: `/hoteles`, `/hoteles/[id]`, `/hotel`, explore `?category=hotel`, admin tab).

## Referidos

_Doc e implementación V2: `docs/referrals/REFERRALS_V2.md`. QA Slice 8: `smoke:referrals`, tests util `test:referral-*`._

- [x] Definir reglas definitivas de comisiones (Slice 1 doc — % o fijo por entrada; comisión generada; pago externo).
- [x] Pulir flujo productor ↔ referido (propuesta → aceptación → acuerdo → link; portales `/producer/referrals`, evento referrals, `/referrer`).
- [x] Pulir métricas de referidos (Slice 7 — KPIs productor/referido por acuerdo y evento).
- [x] Cálculo comisión generada por venta atribuida (Slice 3 — hook pago PAID, idempotente).
- [x] Liquidación manual V2 (Slice 6 — solicitud de pago + registro `mark-paid`; **sin automatizar transferencias**). Definición: *Liquidación manual y externa a la plataforma. Yo Te Invito registra acuerdos, atribuciones, comisiones generadas y solicitudes de pago, pero no administra ni garantiza pagos.*
- [x] Copy/disclaimer y glosario UX en portales (§10 `REFERRALS_V2.md`; sin lenguaje de saldo/retiro/payout en UI V2).

## Navbar y navegación responsive

_Bloque cerrado 2026-05-23 — Slices 1–10; auditoría `docs/audits/NAVBAR_RESPONSIVE_AUDIT.md`; smoke `docs/audits/NAVBAR_RESPONSIVE_SMOKE.md`._

- [x] Auditar navbar actual en desktop, tablet y mobile.
- [x] Definir estructura final del navbar público.
- [x] Convertir el botón “Eventos” en botón compacto tipo home/casita.
- [x] Mantener acceso principal a Explorar.
- [x] Agregar selector simple de ciudad visible en navbar.
- [x] Agrupar ciudades por provincia en el selector.
- [x] Mostrar solo ciudades con contenido cargado para la categoría/vista actual (heurística vía `events.search` + catálogo; sin endpoint dedicado de ciudades).
- [x] Mantener botón de Carro visible.
- [x] Mostrar badge de cantidad de ítems en el Carro cuando corresponda.
- [x] Pulir menú de login / usuario.
- [x] Simplificar menú de usuario: Inicio del portal, Mis tickets, Mi cuenta y Cerrar sesión.
- [x] Crear menú mobile desplegable desde esquina derecha.
- [x] Mover navegación de portales a menú mobile contextual.
- [x] Mantener sidebar de portales en desktop.
- [x] Adaptar navegación mobile para `/me`, `/producer`, `/admin`, `/gastro`, `/hotel` y `/referrer`.
- [x] Evitar que el navbar tape contenido o genere scroll horizontal (`overflow-x-clip`, `scroll-padding-top`).
- [x] Revisar comportamiento sticky/fixed en mobile.
- [x] Revisar accesibilidad: foco, teclado, aria-labels y cierre al tocar fuera.
- [x] Smoke visual en home, explore, categorías, detalle, checkout y portales (revisión código + guía manual; ver smoke doc).

_Pendiente fuera de alcance del bloque: navbar contextual en portales (reducir chrome); footer público completo (bloque aparte)._

## Footer público completo

- [ ] Diseñar footer público completo para home, explore, categorías y fichas públicas.
- [ ] Agregar enlaces legales: términos, privacidad, compra/cancelación/reembolso.
- [ ] Agregar enlaces por vertical: eventos, gastronomía, rentals, excursiones y hoteles próximamente.
- [ ] Agregar acceso a soporte/contacto.
- [ ] Agregar redes sociales.
- [ ] Agregar bloque institucional breve: qué es Yo Te Invito.
- [ ] Agregar accesos rápidos a Explorar, Categorías y Portal de usuario.
- [ ] Agregar copy de confianza para compra segura, tickets digitales y soporte.
- [ ] Revisar consistencia visual con branding dark premium.
- [ ] Revisar footer responsive mobile.
- [ ] Verificar que no duplique información crítica del navbar.

## Legal y responsabilidades por perfil

- [ ] Redactar términos y condiciones generales de la plataforma.
- [ ] Redactar política de privacidad.
- [ ] Redactar política de compra, cancelación y reembolso.
- [ ] Redactar condiciones para productores/productoras.
- [ ] Redactar condiciones para gastronómicos.
- [ ] Redactar condiciones para rentals/proveedores de equipos.
- [ ] Redactar condiciones para hoteles.
- [ ] Redactar condiciones para referidos.
- [ ] Redactar condiciones de transferencia de tickets.
- [ ] Aclarar responsabilidad de la plataforma en acuerdos productor ↔ referido.
- [ ] Aclarar que la plataforma no interviene en pagos externos entre productor y referido si la liquidación es manual.
- [ ] Aclarar alcance de la plataforma como portal de comunicación entre partes cuando aplique.
- [ ] Agregar links legales en footer, registro, checkout y portales.
- [ ] Registrar versión de términos aceptada por cada usuario.
- [ ] Preparar procedimiento interno de soporte.

## Registro y onboarding por tipo de usuario

- [ ] Auditar flujo actual de registro con elección de perfil.
- [ ] Pulir formulario de registro para usuario comprador.
- [ ] Pulir formulario de registro para productora / productor.
- [ ] Pulir formulario de registro para gastronómico.
- [ ] Pulir formulario de registro para rental / proveedor de equipos.
- [ ] Pulir formulario de registro para hotel.
- [ ] Pulir formulario de registro para referido.
- [ ] Definir campos obligatorios y opcionales por tipo de perfil.
- [ ] Agregar aceptación obligatoria de términos generales.
- [ ] Agregar aceptación obligatoria de términos específicos según tipo de perfil.
- [ ] Agregar textos claros de responsabilidad por tipo de usuario.
- [ ] Agregar links a condiciones legales desde cada formulario.
- [ ] Registrar versión aceptada de términos y fecha de aceptación.
- [ ] Agregar estado visual de completitud del registro/onboarding cuando aplique.
- [ ] Revisar mensajes de error y validaciones visibles.
- [ ] Revisar UX mobile de registro completo.

## QA responsive global

- [ ] Hacer responsive polish general.
- [ ] Revisar mobile de home, explore, detalle, checkout y portales.
- [ ] Revisar navbar responsive en mobile real.
- [ ] Revisar footer responsive en mobile real.
- [ ] Revisar home pública en mobile real.
- [ ] Revisar gateway/categorías en mobile real.
- [ ] Revisar explore en mobile real.
- [ ] Revisar fichas públicas de eventos en mobile real.
- [ ] Revisar fichas públicas de gastronomía en mobile real.
- [ ] Revisar fichas públicas de rentals en mobile real.
- [ ] Revisar fichas públicas de excursiones en mobile real.
- [ ] Revisar fichas públicas de hoteles en mobile real.
- [ ] Revisar checkout en mobile real.
- [ ] Revisar portal usuario `/me/*` en mobile real.
- [ ] Revisar portal productor en mobile real.
- [ ] Revisar portal admin en mobile real.
- [ ] Revisar portal gastro en mobile real.
- [ ] Revisar portal hotel en mobile real.
- [ ] Revisar portal referido en mobile real.
- [ ] Validar que no haya scroll horizontal accidental.
- [ ] Validar que modales, menús y dropdowns cierren correctamente.
- [ ] Validar accesibilidad básica: foco, teclado, aria-labels y contraste.

## SEO y GEO

- [ ] Agregar SEO metadata por ficha pública.
- [ ] Agregar SEO por categoría.
- [ ] Revisar GEO/localización para ciudad preferida y descubrimiento.
- [ ] Configurar `next/image` con dominios remotos cuando haya storage.

## Sistema de emails transaccionales y operativos

- [ ] Auditar sistema actual de notificaciones in-app/email/push.
- [ ] Definir matriz completa de emails por portal y tipo de evento.
- [ ] Crear templates base de email con branding Yo Te Invito.
- [ ] Definir layout común de email: header, contenido, CTA, soporte y footer legal.
- [ ] Email de bienvenida para usuario comprador.
- [ ] Email de bienvenida para productora.
- [ ] Email de bienvenida para gastronómico.
- [ ] Email de bienvenida para rental.
- [ ] Email de bienvenida para hotel.
- [ ] Email de bienvenida para referido.
- [ ] Email de orden creada / pago pendiente.
- [ ] Email de pago aprobado.
- [ ] Email de ticket emitido con ticket adjunto o link al ticket.
- [ ] Email de evento próximo / recordatorio.
- [ ] Email de transferencia de ticket recibida.
- [ ] Email de transferencia de ticket aceptada/rechazada/cancelada.
- [ ] Email de evento aprobado para productora.
- [ ] Email de evento rechazado para productora.
- [ ] Email de nueva reseña recibida.
- [ ] Email de respuesta oficial a reseña.
- [ ] Email de disputa de reseña creada o actualizada.
- [ ] Email de referido asociado a productora.
- [ ] Email de propuesta productor ↔ referido.
- [ ] Email de actualización de comisión/reporte de referido.
- [ ] Email de alerta crítica para admins.
- [ ] Email de nuevo evento pendiente para admins.
- [ ] Email de error operativo crítico: pago, factura, webhook o scanner.
- [ ] Panel/preferencias para activar o desactivar emails no críticos.
- [ ] Mantener emails críticos siempre activos cuando sean necesarios por operación/legal.
- [ ] Registrar logs de entrega de emails y reintentos.
- [ ] Definir estrategia de reintentos ante fallo del proveedor de email.
- [ ] Smoke test de emails principales.

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

## Pagos reales y checkout productivo

- [ ] Elegir proveedor de pago real.
- [ ] Definir flujo final de checkout productivo.
- [ ] Implementar checkout real manteniendo pago demo solo en staging/dev.
- [ ] Implementar webhooks del proveedor de pago.
- [ ] Reconciliar pagos con órdenes/tickets.
- [ ] Asegurar idempotencia ante webhooks repetidos.
- [ ] Definir estados finales de pago: pendiente, aprobado, rechazado, cancelado, expirado, reembolsado.
- [ ] Emitir tickets automáticamente cuando el pago sea aprobado.
- [ ] Evitar doble emisión de tickets ante reintentos o webhooks duplicados.
- [ ] Mostrar estado de pago en detalle de orden.
- [ ] Mostrar errores claros si el pago falla o queda pendiente.
- [ ] Definir política de reembolsos.
- [ ] Definir comportamiento ante cancelación de evento.
- [ ] Registrar eventos críticos de pago en auditoría/admin.
- [ ] Notificar al comprador cuando el pago sea aprobado, rechazado o quede pendiente.
- [ ] Notificar a admin ante errores críticos de webhook o reconciliación.
- [ ] Smoke test checkout real: orden → pago → webhook → tickets.

## Facturación automática

- [ ] Definir proveedor / integración de facturación electrónica.
- [ ] Definir datos fiscales requeridos para compradores.
- [ ] Agregar datos fiscales opcionales/obligatorios en checkout según corresponda.
- [ ] Validar datos fiscales antes de emitir factura.
- [ ] Generar factura automáticamente cuando el pago sea aprobado.
- [ ] Asociar factura a Order / Payment.
- [ ] Guardar número, tipo, estado y URL/archivo de la factura.
- [ ] Enviar factura por email junto al ticket o en email separado.
- [ ] Mostrar factura descargable en detalle de orden `/me/orders/[orderId]`.
- [ ] Mostrar factura descargable para admins.
- [ ] Registrar estado de facturación: pendiente, emitida, fallida, anulada.
- [ ] Manejar reintentos si falla la emisión.
- [ ] Notificar a admin si una factura falla.
- [ ] Definir comportamiento ante reembolso/cancelación: nota de crédito o anulación.
- [ ] Registrar eventos de facturación en auditoría.
- [ ] Documentar variables de entorno y credenciales del proveedor fiscal.
- [ ] Smoke test pago aprobado → factura emitida → ticket enviado.

## Checkout final: ticket + factura + email

- [ ] Al aprobarse el pago, emitir tickets reales.
- [ ] Al aprobarse el pago, emitir factura correspondiente.
- [ ] Enviar email al comprador con resumen de compra.
- [ ] Adjuntar o enlazar tickets comprados.
- [ ] Adjuntar o enlazar factura.
- [ ] Guardar historial completo en la orden.
- [ ] Mostrar en `/me/orders/[orderId]` tickets, factura y estado de pago.
- [ ] Mostrar en `/me/tickets` los tickets emitidos inmediatamente después del pago aprobado.
- [ ] Asegurar idempotencia para evitar doble ticket o doble factura.
- [ ] Notificar a admin si falla la emisión de ticket o factura.
- [ ] Probar flujo completo comprador: checkout → pago aprobado → email → ticket → factura.
- [ ] Probar flujo de error: pago aprobado pero factura fallida.
- [ ] Probar flujo de error: pago aprobado pero email fallido.

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



