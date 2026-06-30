# Yo Te Invito — Checklist Unificada Depurada de Pendientes

> Versión depurada para revisar antes de pasar a Cursor / Antigravity.  
> Estado actualizado según decisiones operativas actuales:
>
> - Getnet se elimina como implementación activa.
> - Por ahora la carga de eventos con ticketera queda deshabilitada para usuarios.
> - Se mantienen formularios internos existentes, pero sin acceso público/usuario hasta nueva pasarela.
> - Facturación y emails de pago quedan pendientes para la nueva implementación de pagos.
> - GEO / Maps se mantiene.
> - Banners, Ciudad/Explore, Scanner y Multi-fecha quedan cerrados.
> - Gastro descuentos QR / cortesías V2 **cerrado en código 2026-06-23**; QA manual staging/prod pendiente (`docs/audits/GASTRO_QR_COURTESIES_AUDIT.md`).
> - Legales publicados; mensajes post-registro / QR mejorados (2026-06-23).
> - **Registro V2 hotfixes (2026-06-24):** rol por `profileType` (`e4f9f1f`), legales comerciales en SIGNUP antes de crear usuario (`b7be41d`). Requiere deploy VPS + `prisma migrate deploy`.
> - Footer público UX cerrado (`772a227` + QA prod).
> - Agregar función Admin para eliminar publicaciones/locales y vaciar base de datos operativamente.

---

## 0. Prioridad inmediata — Pendientes reales

### 0.1 Pagos / ticketera — cambio de estrategia

**Decisión actual:** se elimina Getnet como implementación activa porque se va a cambiar de plataforma de pagos. La nueva plataforma todavía no está definida.

- [ ] Retirar Getnet de la checklist activa de implementación.
- [ ] Mantener pago/ticketera real como bloque futuro hasta definir nueva pasarela.
- [x] En carga de eventos, dejar disponible solo el flujo de publicaciones publicitarias.
- [x] En el botón/opción de “cargar con ticketera”, mostrar cartel **“Próximamente”**.
- [x] Conservar formularios y estructura técnica existente de ticketera, pero impedir acceso del usuario de momento.
- [x] Revisar que el usuario no pueda publicar eventos con ticketera activa por accidente (guard UI + `TICKETING_CREATION_ENABLED`).
- [x] Confirmar que el flujo publicitario sigue funcionando sin tocar ticket types ni checkout.

**Notas para Cursor:**

- No borrar formularios ni modelos existentes.
- No hacer refactor destructivo de checkout/tickets.
- Implementar bloqueo de acceso / feature flag / cartel “Próximamente”.
- Evitar romper eventos ya creados, órdenes históricas, tickets o scanner.

---

### 0.2 GEO / Maps — código completado; pendiente operativo

- [x] GEO / Maps — provincias/localidades desde Georef (`GET /geo/provinces`, `/geo/localities`)
- [x] GEO / Maps — dirección compuesta desde provincia, ciudad y calle/altura (solo geocoding)
- [x] GEO / Maps — localidad manual fallback
- [x] GEO / Maps — fichas públicas sin duplicar ubicación
- [ ] Configurar `GOOGLE_GEOCODING_API_KEY` en API VPS si todavía no quedó listo
- [ ] Confirmar restricción de key por IP en Google Cloud
- [ ] Ejecutar/confirmar migración `GEO_ADDRESS_RESOLVED` si falta en prod
- [ ] Reiniciar servicios luego de configurar
- [ ] QA manual producción: botón Ubicar en el mapa en eventos, gastro, rentals, excursiones

Doc cierre: `docs/audits/GEO_MAPS_STAGE_CLOSING.md`

### 0.3 Gastro descuentos QR / cortesías V2

**Estado:** correcciones V2 implementadas en código 2026-06-23. Doc cierre: `docs/audits/GASTRO_QR_COURTESIES_AUDIT.md`.

- [x] Vencimiento inclusivo hasta fin de día Argentina (`gastro-discount-expiry.ts`).
- [x] Uso único por claim + redención transaccional en scanner.
- [x] ~~Límite 1 cupón gastronómico por día~~ — eliminado en **V2.2** (uso único por claim se mantiene).
- [x] Email QR: CTA principal claim público; secundario «Ver en mi cuenta» si hay cuenta.
- [x] UI `GastroDiscountQrCard` en `/me/descuentos` y `/descuentos/reclamo/[claimId]`.
- [x] Tests: `test:gastro-discount-expiry`, `test:gastro-discount-qr`; `test:gastro-discount-scan` extendido.
- [ ] Deploy VPS + migración `20260615120000_gastro_courtesy_discount_claims` (si no aplicada).
- [ ] QA manual completa (§3.1).

**Bugs QA originales (2026-06):** vencimiento prematuro, email cortesía/CTA, UI QR básica — corregidos en V2.

### 0.3.1 Hotfix roles operativos (2026-06-23)

- [x] Gastro contenido: `GASTRO_OWNER` sin selector global de establecimientos; `ADMIN` conserva selector.
- [x] Scanner: usuarios creados desde panel autorizado con `emailVerified` al crear.
- [x] Copy creación scanner: puede iniciar sesión sin verificar email público.
- [ ] QA manual GASTRO/ADMIN en `/gastro/contenido`.
- [ ] QA manual crear scanner (productora/gastro) + login PWA.

### 0.3.2 Hotfix Admin/Gastro/Scanner operativo (2026-06-23)

- [x] Scanner: validación claim-first; parent `APPROVED`/`ACTIVE`.
- [x] Dashboard admin: draft events + pending gastro discounts.
- [x] Gastro: multi subcategorías + tags en alta/edición admin.
- [x] Excursiones: auth token UX + horarios sanitizados.
- [x] Horarios gastro: sin error crudo `open must be before close`.
- [ ] QA manual (audit `ADMIN_GASTRO_SCANNER_HOTFIX_AUDIT.md`).

### 0.3.3 Gastro Discounts V2.1 — recurrente semanal + admin contador + emails cortesía (2026-06-23)

- [x] Modelo `validityMode` (`DATE_RANGE` | `WEEKLY_RECURRING`) + `validWeekday` (`GastroWeekday`).
- [x] Migración `20260625120000_gastro_discount_weekly_recurrence`.
- [x] Scanner: estado `NOT_VALID_TODAY` + util `isGastroDiscountValidToday`.
- [x] UI gastro: formulario con tipo de validez (fecha vs día semanal).
- [x] Admin dashboard: KPI `gastroDiscountClaimsUsedCount`.
- [x] Admin detalle descuento: `redeemedClaimsCount` / `totalClaimsCount`.
- [x] Emails cortesía: diagnóstico API (`requestedCount`, `failedCount`, `failures[]`, `emailConfigured`); link fallback en template; errores visibles en panel.
- [ ] QA manual: crear descuento recurrente día actual vs otro día; escanear; contador admin; enviar cortesía a email propio en staging/prod.
- [ ] Deploy VPS + `npx prisma migrate deploy` (migración semanal).

### 0.3.4 Gastro Discounts V2.2 — gestión descuentos + sin límite diario (2026-06-23)

- [x] Eliminar límite diario por cuenta/email en scanner (`LIMIT_REACHED` legacy, no devuelto).
- [x] Uso único por QR/claim (`USED`) sin cambios.
- [x] API summary por descuento: `GET /gastro/discounts/:id/summary`, admin `GET /admin/gastro-discount-tickets/:discountId/summary`.
- [x] Activar/desactivar: `PATCH .../status` (`ACTIVE` | `CANCELLED`).
- [x] Panel gastro: detalle clickeable con métricas, tabla/cards de claims, editar, activar/desactivar.
- [x] Admin detalle descuento: métricas finas + claims + estado email por cupón.
- [x] Edición desde `/gastro/descuentos/[id]/editar` con advertencia si hay claims emitidos.
- [ ] QA manual: dos cupones mismo día misma cuenta; desactivar/reactivar; editar con claims; emails cortesía en detalle.

### 0.3.5 Admin Deep Delete — eliminación profunda con preflight (2026-06-23)

- [x] Auditoría `ADMIN_DEEP_DELETE_AUDIT.md`
- [x] Schemas shared `admin-deep-delete.ts`
- [x] API `GET/DELETE /admin/deep-delete/:entityType/:entityId`
- [x] Modal `AdminDeepDeleteModal` + `AdminDeepDeleteButton`
- [x] Integrado: usuarios, gastro, eventos, rentals, excursiones, productoras
- [x] Migración audit `ADMIN_DEEP_DELETE_EXECUTED` / `ADMIN_DEEP_DELETE_BLOCKED`
- [ ] QA manual: usuario con eventos; local con descuentos/cupones; productora con historial
- [ ] Deploy VPS + `npx prisma migrate deploy` (`20260623140000_admin_deep_delete_audit_actions`)

---


### 0.4 Footer — UX cerrado

**Estado:** refresh layout `772a227` + datos reales prod + QA OK (2026-06-23).

- [x] Revisar footer actual en home, explore, categorías y fichas públicas.
- [x] Corregir problemas visuales o de contenido detectados.
- [x] Confirmar que no aparezca en portales privados.
- [x] Confirmar responsive mobile.
- [x] Confirmar links legales publicados.
- [x] Confirmar datos reales de contacto/redes si ya están definidos.
- [x] QA mobile en dispositivo real si corresponde.

Doc cierre: `docs/audits/PUBLIC_FOOTER_CLOSING_AUDIT.md`

---

### 0.5 Admin — eliminar publicaciones/locales para limpieza de base de datos

**Objetivo:** permitir desde Admin eliminar publicaciones y locales para vaciar o limpiar la base operativamente.

- [ ] Definir alcance de eliminación:
  - eventos/publicaciones
  - locales gastronómicos
  - locales rentals
  - operadores/excursiones
  - hoteles si aplica
- [ ] Agregar acción Admin para eliminar definitivamente cuando sea seguro.
- [ ] Mantener confirmación fuerte antes de eliminar.
- [ ] Mostrar advertencia clara: acción irreversible.
- [ ] Validar dependencias antes de eliminar:
  - tickets
  - órdenes
  - pagos
  - descuentos
  - reviews
  - scanner logs
  - auditoría
- [ ] Si tiene historial sensible, impedir delete físico y sugerir archivar/desactivar.
- [ ] Si es contenido demo o sin historial, permitir eliminación definitiva.
- [ ] Registrar acción en auditoría.
- [ ] Agregar QA manual de eliminación.

**Notas para Cursor:**

- No implementar un `delete` ciego.
- Debe ser seguro, con validación de relaciones.
- Priorizar limpieza de contenido sin romper historial productivo.
- Si existen tickets/órdenes/pagos asociados, bloquear o exigir flujo especial.

---

### 0.6 Mensajes post-registro / QR — aviso de email y spam

**Estado:** legales ya publicados. Pendiente mejorar UX de confirmación.

- [x] Revisar mensaje luego de registrarse.
- [x] Agregar aviso claro: revisar email para confirmación / próximos pasos.
- [x] Agregar aviso: el correo puede llegar a spam o correo no deseado.
- [x] Revisar mensaje luego de solicitar QR/descuento.
- [x] Agregar aviso claro: el QR se enviará por email.
- [x] Agregar aviso: revisar spam si no aparece.
- [x] Aplicar copy consistente con tono Yo Te Invito.
- [ ] Confirmar que el mensaje se muestre en mobile (QA manual).

**Copy sugerido:**

```txt
Te enviamos un email con la confirmación. Revisá tu bandeja de entrada y, si no lo ves en unos minutos, mirá también en Spam o Correo no deseado.
```

Para QR/descuentos:

```txt
Te enviamos el QR por email. Revisá tu bandeja de entrada y, si no aparece, verificá Spam o Correo no deseado.
```

---

### 0.7 Hotfix registro legal SIGNUP

**Estado:** corregido en código 2026-06-23.

- [x] El wizard ya no llama a `/me/legal/requirements` durante registro (evita 401 sin sesión).
- [x] Requirements SIGNUP vía `/public/legal/requirements` + `usePublicLegalRequirements`.
- [x] Aceptación legal en `POST /auth/register` (`signupLegalAcceptance` transaccional).
- [x] Retry legal con sesión explícita + aviso email/spam sin alertas duplicadas.
- [ ] QA manual: registro productora y comprador sin 401 en DevTools.

---

### 0.8 Registro — confirmación de email obligatoria

**Estado:** corregido en código 2026-06-23.

- [x] Registro sin auto-login; redirect a login con aviso email/spam.
- [x] Login bloquea `EMAIL_NOT_VERIFIED` con mensaje claro.
- [x] Email `AUTH_VERIFY_EMAIL` con contenido válido y link a `/verify-email`.
- [ ] QA manual: registro → confirmar email → login.
- [ ] Pendiente futuro: reenvío de email de confirmación desde login.

---

### 0.9 Hotfix registro por perfil comercial

**Estado:** corregido en código 2026-06-24 — commits `2847978` + `e4f9f1f` (`fix(auth): assign role from signup profile type`).

- [x] `POST /auth/register` asigna rol según `profileType` (`mapSignupProfileTypeToRole`; productora → `PRODUCER_OWNER`, no `USER`).
- [x] Rechaza `profileData` sin `profileType` comercial.
- [x] Login resuelve rol efectivo para cuentas legacy con perfil comercial y `role=USER`.
- [x] Redirect post-login respeta `rolePortalHome` (`PRODUCER_OWNER` → `/producer`).
- [x] Smoke: `pnpm --filter api run smoke:auth-register-role`.
- [ ] **Deploy VPS** + QA manual: productora → verify email → login → `/producer` (no `/me`).
- [ ] Cuentas de prueba previas al deploy: `UPDATE "User" SET role='PRODUCER_OWNER' WHERE email='…';`

---

### 0.10 Hotfix legal signup por perfil

**Estado:** corregido en código 2026-06-24 — commit `b7be41d` (`fix(auth): require profile legal terms during signup`).

- [x] Términos comerciales (`producer_terms`, `gastro_terms`, `hotel_terms`, `referrer_terms`) con `isRequiredForSignup=true` (`isRequiredForPortalAccess=false` — no doble prompt en portal).
- [x] `GET /public/legal/requirements?context=SIGNUP&profileType=` devuelve generales + términos del perfil.
- [x] `RegisterWizard` muestra y exige todos los documentos antes de `POST /auth/register` (copy por perfil).
- [x] Backend `assertSignupAcceptanceComplete` — `400 LEGAL_ACCEPTANCE_REQUIRED` si faltan aceptaciones.
- [x] Migración `20260624140000_commercial_profile_signup_legal`.
- [x] Test API: `test-legal-documents` valida SIGNUP PRODUCER incluye `producer_terms`.
- [ ] **Deploy VPS:** `git pull` + `prisma migrate deploy` + rebuild API/web.
- [ ] **Ops:** publicar documentos comerciales en `/admin/legales` (si siguen DRAFT → `canProceed=false` bloquea registro comercial).
- [ ] QA manual: productora → 3 docs en wizard → crear cuenta → verify email → login → `/producer` sin banner/retry de términos comerciales.

---

## 1. Cerrado / no pasar a Cursor como pendiente

Estos bloques quedan fuera de la checklist activa salvo que aparezca un bug nuevo.

### 1.1 Banners editoriales

- [x] Banners terminados.
- [x] No pasar como implementación pendiente.
- [ ] Solo reabrir si aparece bug nuevo en producción.

### 1.2 Ciudad / Explore

- [x] Ciudad / Explore terminado.
- [x] No pasar como implementación pendiente.
- [ ] Solo reabrir si aparece inconsistencia nueva en filtros o resultados.

### 1.3 Scanner

- [x] Scanner terminado.
- [x] No pasar como implementación pendiente.
- [ ] QA puerta real queda opcional según evento real.

### 1.4 Multi-fecha

- [x] Multi-fecha terminado.
- [x] No pasar como implementación pendiente.
- [ ] Solo reabrir si falla un caso real de productora.

### 1.5 Legales

- [x] Legales publicados.
- [x] No pasar como pendiente de publicación legal.
- [x] Mensajes post-registro / QR sobre email y spam (código 2026-06-23; QA manual pendiente).

---

## 2. Bloques futuros — no implementar ahora

### 2.1 Nueva pasarela de pagos

- [ ] Definir nueva plataforma de pagos.
- [ ] Diseñar nuevo flujo de checkout.
- [ ] Definir estados de pago finales.
- [ ] Definir webhooks.
- [ ] Definir reconciliación.
- [ ] Definir emisión automática de tickets.
- [ ] Definir política de reembolsos/cancelaciones.
- [ ] Definir integración con emails y facturación.

**No pasar a Cursor todavía** salvo para ocultar/deshabilitar acceso actual a ticketera.

---

### 2.2 Facturación

**Estado:** queda pendiente hasta definir la nueva pasarela de pagos.

- [ ] Definir proveedor fiscal.
- [ ] Definir datos fiscales requeridos.
- [ ] Definir comprobantes.
- [ ] Definir relación factura ↔ orden ↔ pago.
- [ ] Definir nota de crédito / anulación.
- [ ] Implementar recién después de la nueva pasarela.

---

### 2.3 Emails de pago / facturación

**Estado:** quedan pendientes hasta la nueva implementación de pagos.

- [ ] Email pago pendiente.
- [ ] Email pago aprobado.
- [ ] Email pago rechazado.
- [ ] Email ticket emitido.
- [ ] Email factura emitida.
- [ ] Email error pago/factura/webhook para admin.

---

## 3. QA manual recomendado antes de nuevos slices

### 3.1 QA Gastro QR / cortesías V2

Doc: `docs/audits/GASTRO_QR_COURTESIES_AUDIT.md` § QA manual.

- [ ] Descuento con vencimiento **hoy** — scanner válido; `/me/descuentos` muestra «Disponible».
- [ ] Solicitar QR/descuento desde web (logueado e invitado).
- [ ] Confirmar mensaje post-solicitud + aviso spam.
- [ ] Confirmar email con CTA **Ver mi QR** → `/descuentos/reclamo/...`.
- [ ] Usuario con cuenta: CTA secundario **Ver en mi cuenta**.
- [ ] Ver cupón en `/me/descuentos` (card tipo ticket).
- [ ] Escanear QR — éxito; re-escaneo → «Cupón ya utilizado».
- [ ] Segundo cupón mismo día misma cuenta → límite diario.
- [ ] Cortesía manual por email (con y sin cuenta).
- [ ] Cortesía a seguidores.
- [ ] Mobile: QR legible y scanner lee correctamente.

### 3.2 QA GEO / Maps

- [x] Build shared + api + web (2026-06-23)
- [ ] Provincia dinámica (Georef) en formulario
- [ ] Ciudad dinámica + localidad manual
- [ ] Dirección calle/altura + Ubicar en el mapa
- [ ] Confirmar pin y guardar (evento, gastro, rental, excursión)
- [ ] Ver ficha pública sin duplicar ubicación
- [ ] Mobile

### 3.3 QA Ticketera deshabilitada

- [x] Código: selector Próximamente + guard URL `?mode=ticketed` (2026-06-23).
- [ ] Crear evento publicitario.
- [ ] Confirmar que no pide ticket types.
- [ ] Intentar elegir “cargar con ticketera”.
- [ ] Confirmar cartel “Próximamente”.
- [ ] Confirmar que no se puede acceder al flujo de ticketera desde UI.
- [ ] Confirmar que no se rompe edición de eventos existentes.

### 3.4 QA Footer

- [x] Home.
- [x] Explore.
- [x] Categorías.
- [x] Ficha evento.
- [x] Ficha gastro.
- [x] Ficha rental.
- [x] Ficha excursión.
- [x] Legal.
- [x] Mobile.

### 3.5 QA Admin Delete

- [ ] Eliminar publicación sin historial.
- [ ] Intentar eliminar publicación con dependencias.
- [ ] Eliminar local sin contenido asociado.
- [ ] Intentar eliminar local con publicaciones asociadas.
- [ ] Confirmar auditoría.
- [ ] Confirmar que no queda visible públicamente.
- [ ] Confirmar que no rompe listados admin.

---

## 4. Orden recomendado de ejecución

1. ~~**Gastro QR / cortesías V2** — correcciones en código.~~ ✓ 2026-06-23 (`GASTRO_QR_COURTESIES_AUDIT.md`); QA manual §3.1 pendiente.
2. ~~**Deshabilitar ticketera para usuarios + cartel “Próximamente”.**~~ ✓ 2026-06-23
3. **GEO / Maps — cerrar configuración y QA.**
4. ~~**Mensajes post-registro / QR con aviso de email y spam.**~~ ✓ 2026-06-23
5. ~~**Footer — corrección UX.**~~ ✓ cerrado (`772a227` + QA prod)
6. ~~**Admin delete seguro para limpieza de publicaciones/locales.**~~ ✓ 2026-06-23 (`docs/audits/ADMIN_USER_DELETE_AUDIT.md`)
7. **Nueva pasarela de pagos — solo cuando esté definida.**
8. **Facturación + emails de pago — después de nueva pasarela.**

---

## 5. Prompt corto para Cursor — estado del backlog

```md
Estamos depurando pendientes del proyecto Yo Te Invito.

Decisiones actuales:
- Getnet se elimina como implementación activa porque se va a cambiar de plataforma de pagos.
- La nueva pasarela todavía no está definida.
- Por ahora, la carga de eventos debe permitir solo publicaciones publicitarias.
- La opción “cargar con ticketera” debe quedar visible o accesible solo como “Próximamente”, sin permitir avanzar al usuario.
- No borrar formularios/modelos existentes de ticketera; conservar estructura para futura pasarela.
- Facturación y emails de pago quedan pendientes hasta la nueva pasarela.
- GEO / Maps se mantiene.
- Gastro descuentos QR / cortesías V2 cerrado en código 2026-06-23; QA manual staging/prod pendiente (`GASTRO_QR_COURTESIES_AUDIT.md`).
- Banners, Ciudad/Explore, Scanner, Multi-fecha, Legales publicados y Footer UX quedan cerrados.
- Pendientes activos: QA gastro QR V2, Admin delete locales/publicaciones, nueva pasarela de pagos.

Trabajar por slices pequeños, sin mega refactors, respetando arquitectura existente:
Frontend: UI → hooks → repositorios → ApiRepository.
Backend: Controller → Zod → Service → Prisma.
No fetch directo en componentes.
No lógica de negocio en controllers.
No duplicar schemas fuera de packages/shared.
```
