# Yo Te Invito — Checklist V2.2 Pendientes hacia Producción

> Versión limpia de pendientes posteriores al cierre de Google Cloud / Storage / SEO / Maps.  
> Esta checklist no incluye tareas de Front/UX V3 ni rediseños futuros.

---

## 1. Pagos reales y checkout productivo

> **Implementación Getnet (código):** slices A–G — [GETNET_CLOSING_AUDIT.md](../payments/GETNET_CLOSING_AUDIT.md). Activación prod: [GETNET_ACTIVATION_CHECKLIST.md](../payments/GETNET_ACTIVATION_CHECKLIST.md), smoke: [GETNET_PRODUCTION_SMOKE.md](../payments/GETNET_PRODUCTION_SMOKE.md). **No** marcar go-live hasta smokes en VPS.

### Definición proveedor y flujo

- [x] Elegir proveedor de pago real — **Getnet** (integración en repo).
- [x] Confirmar si el proveedor elegido será Getnet u otro — **Getnet**.
- [ ] Definir flujo final de checkout productivo.
- [ ] Definir estados finales de pago:
  - pendiente
  - aprobado
  - rechazado
  - cancelado
  - expirado
  - reembolsado
- [ ] Definir comportamiento ante pago pendiente.
- [ ] Definir comportamiento ante pago rechazado.
- [ ] Definir comportamiento ante pago expirado.
- [ ] Definir política de reembolsos.
- [ ] Definir comportamiento ante cancelación de evento.

### Implementación checkout real

- [x] Implementar checkout real — Getnet + demo (`POST …/payments`).
- [ ] Mantener pago demo solo en desarrollo/staging — **política operativa** (botón aún visible en UI dev).
- [x] Implementar webhooks del proveedor de pago — `POST /public/payments/getnet/webhook`.
- [x] Reconciliar pagos con órdenes/tickets — `GetnetReconciliationService` + script batch.
- [x] Asegurar idempotencia ante webhooks repetidos.
- [x] Evitar doble emisión de tickets ante reintentos o webhooks duplicados — `OrderFulfillmentService`.
- [x] Mostrar estado de pago en detalle de orden — `/me/orders/[orderId]`, `/checkout/return`.
- [x] Mostrar errores claros si el pago falla o queda pendiente — return flow Slice D.

### Tickets y auditoría de pagos

- [x] Emitir tickets automáticamente cuando el pago sea aprobado — fulfill unificado.
- [x] Registrar eventos críticos de pago en auditoría/admin — `PAYMENT_*` + `/admin/pagos` (migración `20260601140000_audit_payment_actions`).
- [ ] Notificar al comprador cuando el pago sea aprobado, rechazado o quede pendiente — email confirmación en aprobado (legacy); **sin** emails por estado pendiente/rechazado dedicados.
- [x] Notificar a admin ante errores críticos de webhook o reconciliación — alertas operativas.
- [ ] Smoke test checkout real en **producción** (manual):
  - orden
  - pago
  - webhook
  - emisión de tickets  
  → [GETNET_PRODUCTION_SMOKE.md](../payments/GETNET_PRODUCTION_SMOKE.md)

---

## 2. Facturación automática

### Definición fiscal

- [ ] Definir proveedor/integración de facturación electrónica.
- [ ] Definir datos fiscales requeridos para compradores.
- [ ] Definir si los datos fiscales serán obligatorios u opcionales según tipo de comprobante.
- [ ] Documentar variables de entorno y credenciales del proveedor fiscal.

### Checkout + factura

- [ ] Agregar datos fiscales en checkout según corresponda.
- [ ] Validar datos fiscales antes de emitir factura.
- [ ] Generar factura automáticamente cuando el pago sea aprobado.
- [ ] Asociar factura a Order / Payment.
- [ ] Guardar número, tipo, estado y URL/archivo de la factura.
- [ ] Registrar estado de facturación:
  - pendiente
  - emitida
  - fallida
  - anulada

### Entrega y visualización

- [ ] Enviar factura por email junto al ticket o en email separado.
- [ ] Mostrar factura descargable en detalle de orden `/me/orders/[orderId]`.
- [ ] Mostrar factura descargable para admins.
- [ ] Manejar reintentos si falla la emisión.
- [ ] Notificar a admin si una factura falla.
- [ ] Definir comportamiento ante reembolso/cancelación:
  - nota de crédito
  - anulación
- [ ] Registrar eventos de facturación en auditoría.
- [ ] Smoke test:
  - pago aprobado
  - factura emitida
  - ticket enviado

---

## 3. Checkout final: ticket + factura + email

- [ ] Al aprobarse el pago, emitir tickets reales.
- [ ] Al aprobarse el pago, emitir factura correspondiente.
- [ ] Enviar email al comprador con resumen de compra.
- [ ] Adjuntar o enlazar tickets comprados.
- [ ] Adjuntar o enlazar factura.
- [ ] Guardar historial completo en la orden.
- [ ] Mostrar en `/me/orders/[orderId]`:
  - tickets
  - factura
  - estado de pago
- [ ] Mostrar en `/me/tickets` los tickets emitidos inmediatamente después del pago aprobado.
- [ ] Asegurar idempotencia para evitar doble ticket o doble factura.
- [ ] Notificar a admin si falla la emisión de ticket o factura.
- [ ] Probar flujo completo comprador:
  - checkout
  - pago aprobado
  - email
  - ticket
  - factura
- [ ] Probar flujo de error:
  - pago aprobado pero factura fallida
- [ ] Probar flujo de error:
  - pago aprobado pero email fallido

---

## 4. Sistema de emails transaccionales y operativos

> **Bloque emails cerrado — PROD OK (2026-06):** [`docs/emails/EMAILS_CLOSING_AUDIT.md`](../emails/EMAILS_CLOSING_AUDIT.md) §0 (SMTP VPS, `/health`, smokes, manuales). **Pendiente otro bloque:** checkout real, pago pendiente/rechazado, factura, webhooks, migración legacy checkout/payouts al registry.

### Auditoría y arquitectura

- [x] Auditar sistema actual de notificaciones in-app/email/push.
- [x] Definir matriz de emails por portal (`EMAIL_MATRIX.md`; 38 IDs en registry).
- [x] Crear templates base de email con branding Yo Te Invito (layout + registry).
- [x] Definir layout común de email (header, contenido, CTA, soporte, footer legal).
- [ ] Registrar logs de entrega de emails y reintentos (`EmailOutboundLog` — post-bloque).
- [ ] Definir estrategia de reintentos ante fallo del proveedor de email (BullMQ explícito).
- [ ] Definir preferencias UI para emails no críticos (granular en portal).
- [x] Mantener emails críticos operativos vía callers existentes + `MAIL_OPERATIONS_TO`.

### Emails de bienvenida

- [x] Email de bienvenida para usuario comprador (`AUTH_WELCOME_BUYER`).
- [x] Email de bienvenida para productora (`AUTH_WELCOME_PRODUCER`).
- [x] Email de bienvenida para gastronómico (`AUTH_WELCOME_GASTRO`).
- [ ] Email de bienvenida para rental (perfil rental no en registro V2).
- [x] Email de bienvenida para hotel (`AUTH_WELCOME_HOTEL`).
- [x] Email de bienvenida para referido (`AUTH_WELCOME_REFERRER`).

### Emails comprador / tickets

- [ ] Email de orden creada / pago pendiente — **bloque pagos/checkout**.
- [ ] Email de pago aprobado (registry) — hoy legacy `renderOrderConfirmationEmail`; **bloque pagos**.
- [ ] Email de ticket emitido con ticket adjunto o link al ticket — **bloque checkout**.
- [x] Email de evento próximo / recordatorio (`EVENT_REMINDER_24H`).
- [x] Email de transferencia de ticket recibida.
- [x] Email de transferencia de ticket aceptada/rechazada/cancelada.

### Emails productora / reviews / disputas

- [x] Email de evento aprobado para productora.
- [x] Email de evento rechazado para productora.
- [x] Email de nueva reseña recibida.
- [x] Email de respuesta oficial a reseña.
- [x] Email de disputa de reseña creada o actualizada (created/accepted/rejected + moderación).

### Emails referidos

- [x] Email de referido asociado a productora.
- [x] Email de propuesta productor ↔ referido.
- [x] Email de actualización de comisión/reporte de referido (comisión + solicitudes pago).

### Emails admin / operación

- [x] Email de alerta crítica para admins (`ADMIN_CRITICAL_ALERT` + servicio).
- [x] Email de nuevo evento pendiente para admins.
- [ ] Email de error operativo crítico **pago / factura / webhook** — **bloque pagos/facturación**.
- [x] Email fallo entrega / storage GCS (`ADMIN_EMAIL_DELIVERY_FAILED`, `ADMIN_STORAGE_UPLOAD_FAILED`).
- [ ] Email error scanner crítico con caller automático (`ADMIN_SCANNER_CRITICAL_ERROR` listo, sin hook).
- [x] Smoke test de emails principales (`smoke:email`, `smoke:email-template`; local + VPS por familias).
- [x] Producción: `MAIL_PROVIDER=smtp` DonWeb, API `/health` OK, pruebas manuales OK (password SMTP solo en servidor, rotada).

---

## 5. Legal y publicaciones finales

> La infraestructura legal ya está implementada. Lo pendiente es publicar versiones aprobadas reales desde Admin.

- [ ] Publicar versión aprobada — términos y condiciones generales.
- [ ] Publicar versión aprobada — política de privacidad.
- [ ] Publicar versión aprobada — política de compra, cancelación y reembolso.
- [ ] Publicar versión aprobada — condiciones para productores/productoras.
- [ ] Publicar versión aprobada — condiciones para gastronómicos.
- [ ] Publicar versión aprobada — condiciones para rentals/proveedores de equipos.
- [ ] Publicar versión aprobada — condiciones para hoteles.
- [ ] Publicar versión aprobada — condiciones para referidos.
- [ ] Publicar versión aprobada — condiciones de transferencia de tickets.
- [ ] Confirmar publicación de aclaraciones legales productor ↔ referido.
- [ ] Publicar procedimiento interno de soporte.
  - Documento `INTERNAL`
  - No público

---

## 6. Producción técnica / hardening pendiente

### Logs, monitoreo y seguridad fina

- [ ] Configurar logs/monitoreo.
- [ ] Definir monitoreo mínimo de:
  - API
  - Web
  - Scanner
  - PostgreSQL
  - Redis
  - backups
  - espacio en disco
- [ ] Configurar alertas operativas mínimas.
- [ ] Configurar rate limiting fino en Nginx/Nest.
- [ ] Revisar bind interno de apps a `127.0.0.1`.
- [ ] Revisar hardening de Nginx.
- [ ] Revisar servicios innecesarios expuestos.
- [ ] Revisar postfix/snmpd si corresponde.
- [ ] Smoke E2E dominio real:
  - checkout
  - scanner
  - portales críticos

### Tickets y scanner físico

- [ ] Validación final en staging/entorno dedicado con dispositivo físico.
- [ ] Probar ticket impreso en papel.
- [ ] Probar lector real en acceso.
- [ ] Confirmar flujo completo:
  - VALID
  - USED
  - rechazo de duplicado

---

## 7. Storage — operación legacy no bloqueante

> Storage V2 está cerrado funcionalmente. Estos puntos son operaciones controladas sobre datos legacy.

- [ ] Ejecutar `storage:audit-data-urls` en modo read-only.
- [ ] Revisar reporte de data-URLs legacy.
- [ ] Definir si se migran data-URLs existentes a GCS.
- [ ] Ejecutar migración legacy por lotes solo con backup previo.
- [ ] Ejecutar `storage:audit-orphans` en modo read-only.
- [ ] Revisar posibles falsos positivos.
- [ ] Ejecutar cleanup de huérfanos solo después de revisión manual.
- [ ] Evaluar CDN futuro `cdn.yoteinvito.club`.
- [ ] Ampliar signed URLs para archivos privados `private/*`.

---

## 8. Google Cloud / Search Console / Maps — operación no bloqueante

### Google Cloud

- [ ] Configurar budget alerts GCP:
  - 50%
  - 80%
  - 100%
- [ ] Revisión mensual de consumo Google Cloud / Maps.

### Google Search Console

- [ ] Esperar procesamiento del sitemap en GSC.
- [ ] Reinspeccionar URLs clave en GSC:
  - `/home`
  - `/explore`
  - `/categorias`
  - una ficha evento
  - una ficha rental
  - una ficha legal
- [ ] Revisar cobertura/indexación cuando haya datos.
- [ ] Revisar Core Web Vitals cuando haya tráfico real.
- [ ] Ejecutar Rich Results Test post-deploy.

### Maps

- [ ] Backfill legacy `googlePlaceId/province`.
- [ ] Definir si productoras tendrán sede exacta con mapa.
- [ ] Unificar `ARGENTINA_PROVINCES` en shared.
- [ ] Revisar privacidad si se usa ubicación actual del usuario.
  - No implementado actualmente.

---

## 9. SEO, GEO y metadata social — mejoras futuras

> El SEO técnico base está cerrado. Este bloque contiene mejoras de contenido, GEO y validación.

### Metadata y contenido

- [ ] Agregar SEO metadata por categoría si falta cobertura completa.
- [ ] Agregar SEO metadata para home, explore y gateway de categorías si se decide mejorar copy.
- [ ] Definir fallback Open Graph dedicado cuando una ficha no tenga imagen.
- [ ] Validar previews sociales:
  - título
  - descripción
  - imagen
- [ ] Mejorar contenido visible para SEO/GEO:
  - títulos claros
  - descripciones completas
  - ubicación
  - categoría
  - fechas
  - precios desde
  - productor/local
  - preguntas frecuentes cuando aplique
- [ ] Agregar contenido semántico útil para IA/GEO en fichas públicas:
  - resumen
  - ubicación
  - categoría
  - horarios
  - condiciones
  - datos clave

### GEO / IA / structured data

- [ ] Revisar GEO/localización para ciudad preferida y descubrimiento.
- [ ] Agregar metadata contextual por ciudad cuando aplique.
- [ ] Agregar structured data de reviews/rating donde corresponda y sea válido.
- [ ] Mejorar URLs públicas para que sean legibles cuando sea posible:
  - slug + id
  - slug estable
- [ ] Evaluar archivo `llms.txt` o equivalente informativo.
- [ ] Documentar estrategia GEO/AEO:
  - contenido claro
  - datos estructurados
  - fuentes internas consistentes
  - páginas públicas bien enlazadas
- [ ] Validar metadata con herramientas de preview social y rich results.

---

## 10. Footer — datos reales pendientes

> El footer público está cerrado funcionalmente. Quedan datos reales de operación/comunicación.

- [ ] Reemplazar Instagram real de Yo Te Invito.
- [ ] Reemplazar contacto real de Yo Te Invito:
  - email
  - teléfono
  - `/admin/contactos`
- [ ] Reemplazar web/red social real del equipo desarrollador.
- [ ] Publicar documentos legales reales en `/admin/legales` si aún están en borrador.
- [ ] QA mobile en dispositivo físico del footer.
  - Opcional
  - Guía en `PUBLIC_FOOTER_SMOKE.md`

---

## 11. Google Analytics 4

- [ ] Crear propiedad Google Analytics 4 para Yo Te Invito.
- [ ] Crear Web Data Stream para el dominio definitivo.
- [ ] Obtener Measurement ID `G-XXXXXXXXXX`.
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
- [ ] Smoke test:
  - page view
  - evento custom
  - conversión en GA4 DebugView

---

## 12. QA final de producción

### Smokes técnicos

- [ ] Ejecutar smoke `user-portal`.
- [ ] Ejecutar smoke `reviews`.
- [ ] Ejecutar smoke `notifications`.
- [ ] Ejecutar smoke `producer-follows`.
- [ ] Ejecutar E2E portal.
- [ ] Ejecutar E2E checkout.
- [ ] Ejecutar E2E notifications.

### Flujos manuales críticos

- [ ] Probar flujo comprador completo.
- [ ] Probar flujo productor completo.
- [ ] Probar flujo admin completo.
- [ ] Probar scanner real.
- [ ] Probar mobile real en flujos críticos.
- [ ] Hacer limpieza de datos de prueba antes de producción.

### QA responsive operativo

> No incluye rediseño Front/UX futuro. Solo verificación funcional en dispositivos reales.

- [ ] Revisar mobile de home.
- [ ] Revisar mobile de explore.
- [ ] Revisar mobile de detalle público.
- [ ] Revisar mobile de checkout.
- [ ] Revisar mobile de portales principales.
- [ ] Revisar navbar responsive en mobile real.
- [ ] Revisar footer responsive en mobile real.
- [ ] Validar que no haya scroll horizontal accidental.
- [ ] Validar que modales, menús y dropdowns cierren correctamente.
- [ ] Validar accesibilidad básica:
  - foco
  - teclado
  - aria-labels
  - contraste

---

# Orden recomendado de ejecución V2.2

## Prioridad 1 — Núcleo comercial

- [ ] Pagos reales y checkout productivo.
- [ ] Facturación automática.
- [ ] Checkout final: ticket + factura + email.

## Prioridad 2 — Comunicación operativa

- [ ] Sistema de emails transaccionales y operativos.
- [ ] Legales finales publicados.

## Prioridad 3 — Producción técnica

- [ ] Logs/monitoreo.
- [ ] Rate limiting/hardening fino.
- [ ] Scanner físico.
- [ ] QA final de producción.

## Prioridad 4 — Operación y crecimiento

- [ ] Storage legacy.
- [ ] GSC seguimiento.
- [ ] GA4.
- [ ] SEO/GEO mejoras futuras.
- [ ] CDN/signed URLs.
