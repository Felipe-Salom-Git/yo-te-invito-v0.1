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

_Pendiente fuera de alcance del bloque navbar: navbar contextual en portales (reducir chrome). Footer público completo: cerrado — ver § Footer público completo y `PUBLIC_FOOTER_SMOKE.md`._

## Footer público completo

- [x] Slice 1 Footer público completo: auditoría y arquitectura inicial (`docs/audits/PUBLIC_FOOTER_AUDIT.md`, 2026-05-24).
- [x] Slice 2 Footer público: visibilidad por ruta (`footerVisibility.ts`, `RouteAwareFooter`), config base (`footerPublicConfig.ts`), sin doble pie en `/categorias` y `/legal/*` (2026-05-24).
- [x] Slice 3 Footer público: `GET /public/platform-config`, `usePublicPlatformConfig`, footer sin `/admin/config` (2026-05-24).
- [x] Slice 4 Footer público completo dark premium (`components/footer/*`, 2026-05-24).
- [x] Rutas públicas `/legal/*` con contenido desde API (Slice Legal Admin 5).
- [x] Agregar enlaces legales en footer: términos, privacidad, compra/cancelación/reembolso y verticales (Slice Legal Admin 7).
- [x] Diseñar footer público completo para home, explore, categorías y fichas públicas (Slice 4).
- [x] Agregar enlaces por vertical: eventos, gastronomía, rentals, excursiones y hoteles próximamente (Slice 4).
- [x] Agregar acceso a soporte/contacto (API pública + footer; datos reales vía `/admin/contactos` — Slice 3).
- [x] Agregar redes sociales (placeholders + merge API; datos reales pendientes — Slice 4).
- [x] Agregar bloque institucional breve: qué es Yo Te Invito (Slice 4).
- [x] Agregar accesos rápidos a Explorar, Categorías y Portal de usuario (Slice 4).
- [x] Agregar copy de confianza (tickets/QR/legales; sin promesa pagos reales — Slice 4).
- [x] Revisar consistencia visual con branding dark premium (Slice 4).
- [x] Revisar footer responsive mobile (Slice 5 — `PUBLIC_FOOTER_SMOKE.md`).
- [x] Verificar que no duplique información crítica del navbar (Slice 4).
- [x] Slice 5 Footer público: responsive, accesibilidad, smoke y cierre de bloque (2026-05-24).

_Footer público completo — bloque V2 cerrado. Smoke: `docs/audits/PUBLIC_FOOTER_SMOKE.md`._

### Footer — datos reales pendientes (post-bloque)

- [ ] Reemplazar Instagram real de Yo Te Invito.
- [ ] Reemplazar contacto real de Yo Te Invito (email/tel en `/admin/contactos`).
- [ ] Reemplazar web/red social real del equipo desarrollador.
- [ ] Publicar documentos legales reales en `/admin/legales` si aún están en borrador.
- [ ] QA mobile en dispositivo físico (opcional; guía en `PUBLIC_FOOTER_SMOKE.md`).

## Legal y responsabilidades por perfil

- [x] Infra backend documentos legales (Slice Legal Admin 2–3): modelos, lectura, draft/publish versionado, audit, seed — ver `docs/audits/LEGAL_ADMIN_AUDIT.md`
- [x] Panel admin `/admin/legales` (Slice Legal Admin 4): listado, edición metadata/borrador, publicación, historial versiones
- [x] Cargar borradores legales iniciales en Admin Legales desde `docs/legal/` (`seed:legal-content`; Slice Legal Content 1).
- [x] Layout portales ampliado + listado admin Legales V2 (`PORTAL_BODY_CLASS`, tabla original con scroll en contenedor).
- [x] Agregar links legales en footer, registro, checkout y portales (Slice Legal Admin 7).
- [x] Backend aceptación legal por versión (`/me/legal/*`, Slice 6).
- [x] Registrar versión de términos aceptada por cada usuario en flujos UI checkout/registro autenticados (`POST /me/legal/accept`); checkout invitado: checkbox + declaración (sin persistencia hasta cuenta).
- [x] Agregar aclaraciones productor ↔ referido en documentos base y UI (Slice Legal Content 2; borradores vía `seed:legal-content --force`).
- [ ] Publicar versión aprobada — términos y condiciones generales.
- [ ] Publicar versión aprobada — política de privacidad.
- [ ] Publicar versión aprobada — política de compra, cancelación y reembolso.
- [ ] Publicar versión aprobada — condiciones para productores/productoras.
- [ ] Publicar versión aprobada — condiciones para gastronómicos.
- [ ] Publicar versión aprobada — condiciones para rentals/proveedores de equipos.
- [ ] Publicar versión aprobada — condiciones para hoteles.
- [ ] Publicar versión aprobada — condiciones para referidos.
- [ ] Publicar versión aprobada — condiciones de transferencia de tickets.
- [ ] Confirmar publicación de aclaraciones legales productor ↔ referido (requiere publicar versiones aprobadas en admin).
- [ ] Publicar procedimiento interno de soporte (borrador importado; `INTERNAL`, no público).

## Registro y onboarding por tipo de usuario

- [x] Agregar aceptación obligatoria de términos generales (Slice Legal Admin 7 — según flags publicados).
- [x] Agregar aceptación obligatoria de términos específicos según tipo de perfil (portal: `PORTAL_ACCESS`; signup según `isRequiredForSignup`).
- [x] Agregar links a condiciones legales desde cada formulario (registro, checkout, footer, portales — Slice 7).
- [x] Auditar flujo actual de registro con elección de perfil. Auditoría: `docs/audits/REGISTER_ONBOARDING_AUDIT.md`
- [x] Pulir formulario de registro para usuario comprador (`docs/onboarding/REGISTER_BUYER_WIZARD_BASE.md`, Slice 5).
- [x] Pulir formulario de registro para productora / productor (`docs/onboarding/REGISTER_PRODUCER_FORM.md`, Slice 6).
- [x] Pulir formulario de registro para gastronómico (`docs/onboarding/REGISTER_GASTRO_FORM.md`, Slice 7).
- [x] Pulir formulario de registro para rental / proveedor de equipos. Nota: V2 no incluye signup rental; resuelto como decisión producto + flujo admin + CTA contacto público (`docs/onboarding/REGISTER_RENTAL_DECISION.md`, Slice 8).
- [x] Pulir formulario de registro para hotel (`docs/onboarding/REGISTER_HOTEL_FORM.md`, Slice 9).
- [x] Fixes registro: email duplicado + hotel provincia/ciudad (`docs/onboarding/REGISTER_FORM_FIXES_EMAIL_HOTEL_LOCATION.md`, Slice 12.5).
- [x] Registro gastro: select provincia/ciudad dependiente (`docs/onboarding/REGISTER_GASTRO_LOCATION_SELECT.md`, Slice 12.6).
- [x] Pulir formulario de registro para referido (`docs/onboarding/REGISTER_REFERRER_FORM.md`, Slice 10).
- [x] Definir campos obligatorios y opcionales por tipo de perfil. Matriz: `docs/onboarding/PROFILE_FIELDS_MATRIX.md`
- [x] Agregar textos claros de responsabilidad por tipo de usuario (`docs/onboarding/PROFILE_RESPONSIBILITY_COPY.md`, Slice 11 — copy UX centralizado; redacción legal publicada sigue pendiente).
- [x] Registrar versión aceptada de términos y fecha de aceptación (SIGNUP transaccional + retry; ver `docs/onboarding/LEGAL_SIGNUP_HARDENING.md`). Nota: términos solo `PORTAL_ACCESS` / checkout guest siguen fuera de este cierre.
- [x] Agregar estado visual de completitud del registro/onboarding cuando aplique (`docs/onboarding/PROFILE_COMPLETION_ONBOARDING.md`, Slice 12).
- [x] Revisar mensajes de error y validaciones visibles (`docs/onboarding/REGISTER_ERROR_VALIDATION_UX.md`, Slice 13).
- [x] Revisar UX mobile de registro completo (`docs/onboarding/REGISTER_ONBOARDING_SMOKE.md`, Slice 14).

> **Bloque Registro y onboarding por tipo de usuario cerrado (V2)** — ver `docs/onboarding/REGISTER_ONBOARDING_SMOKE.md` y slices 1–14 + 12.5–12.6 en `docs/onboarding/`.

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

- [x] Contratar VPS.
- [x] Configurar dominio.
- [x] Configurar PostgreSQL producción.
- [x] Configurar Redis producción.
- [x] Configurar variables de entorno producción.
- [x] Ejecutar migraciones Prisma en producción.
- [x] Crear/restaurar usuario admin real.
- [x] Ejecutar seed de subcategorías.
- [ ] Configurar backups automáticos.
- [ ] Configurar logs/monitoreo.
- [ ] Configurar rate limiting y hardening.

> **Nota (Infra 2B — Mayo 2026):** Ejecutada en VPS DonWeb con dominio **`yoteinvito.club`** (IP `179.43.124.145`, Ubuntu 24.04). Stack: systemd (`yti-api`, `yti-web`, `yti-scanner`), Nginx, Certbot, PostgreSQL y Redis locales, repo en `/opt/yoteinvito`. Migraciones con `npx prisma migrate deploy` (no `pnpm db:migrate`). Seeds: `seed:subcategories`, `seed:legal-documents` + publicación legal **bootstrap temporal** para desbloquear registro admin. Admin maestro operativo (`felipe.e.salom@gmail.com`). Provider **`DEMO`** activo; Getnet no habilitado.
>
> **Pendiente cierre operativo:** backups, hardening fino, rotación de secretos expuestos en sesión de deploy, monitoreo/rate limiting, smoke E2E desde dominio real, reemplazo de legales bootstrap por versiones aprobadas en `/admin/legales`. Detalle: [`docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`](../deploy/DONWEB_PRODUCTION_RUNBOOK.md) § Ejecución real.

## Google Cloud — Maps y Storage

- [ ] Crear proyecto Google Cloud del cliente para Yo Te Invito.
- [ ] Activar billing en Google Cloud.
- [ ] Configurar presupuesto/alertas de gasto.
- [ ] Agregar colaborador técnico con rol suficiente para configuración inicial.
- [ ] Definir ambientes: producción y staging.
- [ ] Habilitar Google Maps Platform.
- [ ] Habilitar Maps JavaScript API.
- [ ] Habilitar Places API / Places API New si se usa autocomplete.
- [ ] Habilitar Geocoding API si se convierten direcciones en coordenadas.
- [ ] Habilitar Maps Embed API solo si se usan mapas embebidos simples.
- [ ] Crear API Key pública para frontend.
- [ ] Restringir API Key pública por dominio/referrer.
- [ ] Restringir API Key pública solo a las APIs necesarias.
- [ ] Definir si habrá key separada para staging.
- [ ] Documentar variables de entorno Google Maps.
- [ ] Integrar autocomplete de direcciones donde corresponda.
- [ ] Guardar dirección legible + lat/lng en eventos, gastro, rentals, hoteles y productoras cuando aplique.
- [ ] Mostrar botón “Ver ubicación” o mapa en fichas públicas con coordenadas reales.
- [ ] Mantener fallback manual si Google Maps no está configurado o falla.
- [ ] Revisar privacidad si se usa ubicación actual del usuario.
- [ ] Smoke test: autocomplete, guardado de dirección, mapa público y botón de ubicación.

### Google Cloud Storage

- [ ] Confirmar Google Cloud Storage como proveedor de storage V2.
- [ ] Crear bucket de producción.
- [ ] Crear bucket de staging si corresponde.
- [ ] Definir región del bucket.
- [ ] Definir estructura de carpetas: eventos, productoras, gastro, rentals, hoteles, tickets, facturas, sistema.
- [ ] Crear Service Account para backend.
- [ ] Asignar permisos mínimos sobre buckets del proyecto.
- [ ] Configurar credenciales seguras para backend.
- [ ] Definir estrategia de archivos públicos vs privados.
- [ ] Definir URLs públicas para imágenes.
- [ ] Definir URLs firmadas para archivos privados si aplica.
- [ ] Configurar CORS del bucket.
- [ ] Implementar upload real de imágenes.
- [ ] Reemplazar data-URL por URLs de storage.
- [ ] Configurar límites de peso/formato.
- [ ] Configurar cleanup de imágenes huérfanas.
- [ ] Configurar `next/image` con dominios remotos de Google Cloud Storage.
- [ ] Evaluar Cloud CDN o dominio `cdn.yoteinvito.com` si crece el tráfico.
- [ ] Smoke test: subir imagen, mostrar imagen pública, borrar/reemplazar imagen y validar fallback.

## Google Analytics 4

- [ ] Crear propiedad Google Analytics 4 para Yo Te Invito.
- [ ] Crear Web Data Stream para el dominio definitivo.
- [ ] Obtener Measurement ID (`G-XXXXXXXXXX`).
- [ ] Definir si se usará GA4 directo o Google Tag Manager.
- [ ] Documentar variable `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- [ ] Integrar GA4 en Next.js App Router.
- [ ] Registrar page views en navegación cliente.
- [ ] Definir eventos personalizados principales.
- [ ] Medir vistas de fichas públicas.
- [ ] Medir clicks en cards públicas.
- [ ] Medir búsquedas en explore.
- [ ] Medir filtros aplicados en explore.
- [ ] Medir contacto por WhatsApp.
- [ ] Medir agregar a favoritos / follow / evento esperado.
- [ ] Medir inicio de checkout.
- [ ] Medir compra completada cuando exista pago real.
- [ ] Medir registro completado por tipo de perfil.
- [ ] Medir errores críticos de checkout/pago cuando corresponda.
- [ ] Configurar conversiones principales en GA4.
- [ ] Excluir tráfico interno/admin si corresponde.
- [ ] Revisar consentimiento/cookies antes de activar tracking completo.
- [ ] Configurar Consent Mode si se implementa banner de consentimiento.
- [ ] Smoke test: page view, evento custom y conversión en GA4 DebugView.

## Google Search Console y SEO técnico

- [ ] Crear propiedad de Google Search Console para el dominio definitivo.
- [ ] Verificar dominio mediante DNS TXT.
- [ ] Enviar sitemap público.
- [ ] Validar robots.txt.
- [ ] Revisar indexación de home, explore, categorías y fichas públicas.
- [ ] Validar que portales privados, checkout privado, órdenes, tickets y admin no se indexen.
- [ ] Revisar errores de cobertura/indexación.
- [ ] Revisar Core Web Vitals cuando haya tráfico real.
- [ ] Revisar rich results cuando se agregue JSON-LD.
- [ ] Documentar procedimiento de revisión SEO post-deploy.

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

## SEO, GEO y metadata social

- [ ] Agregar favicon / ícono de pestaña con la marca Yo Te Invito.
- [ ] Agregar app icons para mobile/PWA cuando corresponda.
- [ ] Configurar title template global: `Yo Te Invito | ...`.
- [ ] Configurar metadata base global de la plataforma.
- [ ] Agregar SEO metadata por ficha pública.
- [ ] Agregar SEO metadata por categoría.
- [ ] Agregar SEO metadata para home, explore y gateway de categorías.
- [ ] Agregar canonical URLs para páginas públicas indexables.
- [ ] Agregar metadata Open Graph global.
- [ ] Agregar metadata Twitter/X Card global.
- [ ] Agregar Open Graph dinámico para eventos: imagen de cabecera, título, descripción, ciudad y fecha.
- [ ] Agregar Open Graph dinámico para gastronomía: imagen de cabecera, título, descripción, ciudad y tipo de local.
- [ ] Agregar Open Graph dinámico para rentals: imagen de cabecera, título, descripción, ciudad, local y subcategoría.
- [ ] Agregar Open Graph dinámico para excursiones: imagen de cabecera, título, descripción, ciudad y fecha/temporada si aplica.
- [ ] Agregar Open Graph dinámico para hoteles: imagen de cabecera o galería principal, título, descripción y ciudad.
- [ ] Agregar Open Graph dinámico para productoras: logo/imagen de perfil, nombre, descripción y ciudad/base operativa si aplica.
- [ ] Definir fallback Open Graph cuando una ficha no tenga imagen: logo Yo Te Invito o imagen institucional.
- [ ] Validar que al compartir links se vea título, descripción e imagen correcta.
- [ ] Agregar JSON-LD / structured data para eventos.
- [ ] Agregar JSON-LD / structured data para gastronomía/locales.
- [ ] Agregar JSON-LD / structured data para rentals/productos de alquiler.
- [ ] Agregar JSON-LD / structured data para excursiones.
- [ ] Agregar JSON-LD / structured data para hoteles.
- [ ] Agregar JSON-LD / structured data para productoras/organizaciones.
- [ ] Agregar structured data de reviews/rating donde corresponda y sea válido.
- [ ] Revisar GEO/localización para ciudad preferida y descubrimiento.
- [ ] Agregar metadata contextual por ciudad cuando aplique.
- [ ] Mejorar URLs públicas para que sean legibles cuando sea posible: slug + id o slug estable.
- [ ] Generar sitemap público.
- [ ] Generar robots.txt.
- [ ] Definir qué rutas públicas se indexan y cuáles no.
- [ ] Evitar indexar portales privados, checkout privado, órdenes, tickets y admin.
- [ ] Mejorar contenido visible para SEO/GEO: títulos claros, descripciones completas, ubicación, categoría, fechas, precios desde, productor/local y preguntas frecuentes cuando aplique.
- [ ] Agregar contenido semántico útil para IA/GEO en fichas públicas: resumen, ubicación, categoría, horarios, condiciones y datos clave.
- [ ] Evaluar archivo `llms.txt` o equivalente informativo para orientar crawlers/IA, sin depender de él como garantía.
- [ ] Documentar estrategia GEO/AEO: contenido claro, datos estructurados, fuentes internas consistentes y páginas públicas bien enlazadas.
- [ ] Configurar `next/image` con dominios remotos cuando haya storage.
- [ ] Validar metadata con herramientas de preview social y rich results.

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


