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
> - Gastro descuentos QR / cortesías queda como QA manual + correcciones.
> - Legales publicados; mensajes post-registro / QR mejorados (2026-06-23).
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

### 0.3 Gastro descuentos QR / cortesías — QA + correcciones

**Estado:** ya fue deployado, pero en QA manual surgieron errores a corregir.

- [ ] Documentar errores detectados en QA manual.
- [ ] Corregir errores del flujo de solicitud web de QR/descuento.
- [ ] Corregir errores del flujo de cortesía por email si aplica.
- [ ] Corregir errores de email QR si aplica.
- [ ] Corregir errores en `/me/descuentos` si aplica.
- [ ] Corregir errores de validación en scanner si aplica.
- [ ] Repetir QA manual completa:
  - solicitud web
  - cortesía manual
  - cortesía a seguidores
  - recepción de email
  - visualización en cuenta usuario
  - validación con scanner

**Notas para Cursor:**

- Trabajar solo sobre bugs detectados en QA.
- No rediseñar el sistema completo de descuentos.
- No mezclar con pagos ni facturación.
- Mantener el flujo como QR/cortesía/promoción, no como ticketera.

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

**Estado:** corregido en código 2026-06-24.

- [x] `POST /auth/register` asigna rol según `profileType` (productora → `PRODUCER_OWNER`, no `USER`).
- [x] Login resuelve rol efectivo para cuentas legacy con perfil comercial y `role=USER`.
- [x] Redirect post-login respeta `rolePortalHome` (`PRODUCER_OWNER` → `/producer`).
- [ ] QA manual: productora → verify email → login → `/producer` (no `/me`).

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

### 3.1 QA Gastro QR / cortesías

- [ ] Solicitar QR/descuento desde web.
- [ ] Confirmar mensaje post-solicitud.
- [ ] Confirmar recepción email.
- [ ] Revisar spam/correo no deseado si no llega.
- [ ] Ver QR en `/me/descuentos`.
- [ ] Validar QR con scanner.
- [ ] Probar cortesía manual por email.
- [ ] Probar cortesía a seguidores.

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

1. **Gastro QR / cortesías — documentar bugs QA y corregir.**
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
- Gastro descuentos QR / cortesías ya fue deployado, pero requiere QA manual + corrección de bugs detectados.
- Banners, Ciudad/Explore, Scanner, Multi-fecha, Legales publicados y Footer UX quedan cerrados.
- Pendientes activos: Gastro QR/cortesías (bugs QA), Admin delete seguro para eliminar publicaciones/locales, y nueva pasarela de pagos cuando esté definida.

Trabajar por slices pequeños, sin mega refactors, respetando arquitectura existente:
Frontend: UI → hooks → repositorios → ApiRepository.
Backend: Controller → Zod → Service → Prisma.
No fetch directo en componentes.
No lógica de negocio en controllers.
No duplicar schemas fuera de packages/shared.
```
