# V3.3 G9.0 — Discovery UX final

**Fecha:** 2026-10-23  
**Rama:** `feat/v1-s03-api-foundation`  
**HEAD al auditar:** `a84591a` (`docs(v3.3): close gastro courtesy expansion`)  
**Alcance:** UX, consistencia visual, navegación y multi-local sobre lo ya implementado. Sin dominio nuevo. Sin cambios de accounting ni lifecycle salvo bug demostrado.

Producción congelada. Este documento no autoriza push ni deploy.

---

## 1. Qué ya existe (reutilizar, no duplicar)

| Pieza | Dónde | Uso en G9 |
|---|---|---|
| Web Share + copiar | `apps/web/lib/share/shareUrl.ts`, consumido por `EventActionBar` | Base de “Compartir”. Hoy: `navigator.share` y, si no existe, copia la URL. No hay WhatsApp. El toast de eventos dice “Link copiado”. |
| WhatsApp de contacto | `apps/web/lib/gastro/gallery.ts` (`buildGastroWhatsAppHref`), rentals, hotel, excursiones | Es contacto al local (`wa.me/{teléfono}`), no compartir la ficha. No reutilizarlo para el share de la URL pública. |
| Ficha pública | `GastroPublicDetailContent`, `GastroPublicActionCard`, `GastroLocationCard`, `EventLocationSection compact` (G7.11), `GastroDiscountsSection`, `GastroLocationEditorialSection`, `ContentTagChips` | Reordenar y sumar compartir. El mapa compacto de sidebar ya está. |
| Portal multi-local | `GastroActiveLocationProvider`, `resolveActiveGastroProfileId`, `GastroLocationSelector`, `GastroLocationStatusBadge`, `withCourtesyProfileQuery` | El `profileId` de la URL gana si pertenece a la cuenta. Si la URL no lo trae, cae al primer `ACTIVE` y después al primero. |
| Estados humanos parciales | `GastroLocationStatusBadge` | `PENDING` ya es “Pendiente de aprobación”. `ACTIVE` / `REJECTED` / `SUSPENDED` siguen cortos (“Activo”, “Rechazado”, “Suspendido”). El `<select>` imprime el enum (`(PENDING)`). |
| Cards | `ContentCard` + `getGastroCardVisibleSubcategoryChips` | Chips de subcategoría con tope (móvil 2, desktop 3) y `+N`. Tags vía `ContentTagChips` (máx. 2, hashtag). Primary va primero (`resolveGastroSubcategoryNames`). |
| Empty cortesías | `resolveCourtesyEmptyState` + `GastroCourtesyEmptyState` | Ya explica y ofrece CTA. El wording es “creaste” / “Crear cortesía”. |
| Empty 0 locales | `GastroLocationsList` | Ya dice “Crear mi primer local”. |
| Scanner portal | `ScannerUsersPanel` | Ya muestra usuario, local (`parentDisplayName`) y estado. Tabla con scroll horizontal. |
| Scanner puerta | `DoorScannerClient` | CTAs de cámara y código manual ya existen (G3). El resultado gastro imprime el enum (`VALID`) y `valueLabel` crudo. |
| Descuentos públicos | `PublicGastroLocationsService.listDiscounts` y `PublicGastroDiscountsService` filtran `visibility: 'PUBLIC'` | La ficha no lista `COURTESY_ONLY`. No tocar esa query. |
| Admin local | `admin/gastronomicos/[profileId]/page.tsx` | Descuentos, cortesías (filtro), publicaciones y métricas ya viven en la ficha del local. Settlement “Liquidar” sigue el contrato G7.11 (vertical GASTRO, local preseleccionado). |
| `EmptyState` | `apps/web/components/ui/EmptyState.tsx` | Título, descripción y CTA por href. Reutilizar. |

---

## 2. Inconsistencias que G9 sí cierra

### Compartir (G9.1 / G9.2)

No hay “Compartir” en `/gastro/local` ni en `/gastronomicos/[id]`.

La URL pública canónica es `/gastronomicos/{profileId}`. `tenantId` es opcional en la página (`tenant-demo` por defecto) y **no** debe ir en el enlace compartido. Tampoco se comparte `/gastro/...` ni `/admin/...`.

Mensaje:

```text
Mirá este lugar en Yo Te Invito:
{nombre}
{origin}/gastronomicos/{profileId}
```

Solo locales `ACTIVE` en el portal. La ficha pública (ya publicada) también comparte.

Prioridad: `navigator.share` si existe. Si no: WhatsApp (`wa.me/?text=`) y “Copiar enlace”, con toast “Enlace copiado”. Sin dependencia nueva.

### Ficha pública (G9.3)

Columna principal hoy: descripción → subcategorías → **publicaciones** → descuentos → etiquetas → galería del local. En móvil el sidebar (acciones, horarios, mapa, contacto) queda después, pero los beneficios quedan debajo de las publicaciones.

Objetivo móvil: contenido principal → beneficios → publicaciones → mapa/contacto.  
Objetivo desktop del sidebar: acciones → contacto/horarios → mapa compacto → compartir. El mapa no debe volver a dominar la ficha.

`COURTESY_ONLY` sigue fuera de la ficha. No se cambia el filtro del servicio.

### Multi-local (G9.4)

- 0 locales: el listado ya tiene CTA. El dashboard (`GastroDashboardClient`) sigue armando indicadores y, si no hay payload, dice “Sin datos”.
- 1 local: el selector ya no obliga a elegir y conserva `profileId`. Se mantiene.
- N locales: cambiar A → B funciona mientras `?profileId=` viaja en la URL (G7.11 en valoraciones, G8.9 en descuentos). La navegación del portal (`portalNavConfig` gastro) **no** adjunta `profileId`. Al entrar a `/gastro/descuentos` sin query, `resolveActiveGastroProfileId` vuelve al primer `ACTIVE`. `useGastroDashboard` además puede pegarle al dashboard sin `profileId` (default del API).
- El `<select>` muestra enums. El dashboard imprime `profile.status` en minúsculas.

### Cards (G9.5)

La lógica primary + secondary no se toca. El problema es de superficie: la card tiene alto fijo y `overflow-hidden`, así que 3 chips + 2 tags + título + resumen se cortan. Tags y subcategorías ya se ven distintos (píldora blanca vs hashtag), pero los tags de la card son `<Link>` adentro del `<Link>` de la card.

### Empty states (G9.6)

| Pantalla | Hoy | Falta |
|---|---|---|
| Descuentos del local | “No hay tickets en esta sección.” | Qué falta + “Crear descuento” |
| Cortesías | Buen empty, wording “Crear cortesía” | Alinear a “Solicitar cortesía” |
| Publicaciones | “Sin publicaciones aún…” | CTA “Crear publicación” |
| Scanners | “Sin usuarios scanner”, CTA solo en el header | Empty con “Crear scanner”, scoped al local |
| Valoraciones sin local | “Sin locales”, sin CTA | “Crear mi primer local” |
| Validaciones / liquidaciones | Ya explican la situación | No reescribir |

### Scanner (G9.7)

Estados reales de `gastroDiscountScanStatusSchema`: `VALID`, `ALREADY_USED`, `EXPIRED`, `INVALID`, `INACTIVE`, `NOT_VALID_TODAY`, `LIMIT_REACHED`.

No existen `USED`, `CANCELLED` ni `WRONG_LOCATION` en esa respuesta. G9 etiqueta los estados reales (no el enum en pantalla) y no inventa códigos.

Cortesía: el API ya manda `kind` y el beneficio (G8.5) y `shortCode` del claim (G8.6). La UI igual debe ocultar un `valueLabel` `0%` y no mostrar un QR maestro (no viene en esta respuesta).

El header ya tiene usuario y `parentDisplayName` (“Cuenta:”). Falta decir con claridad usuario scanner, local y sesión. El CTA manual dice “Ingresar código manualmente”; el pedido de G9 es “Ingresar código manual”. No se cambia la validación.

### Admin (G9.8)

La ficha admin del local ya concentra descuentos, filtro de cortesías, publicaciones y métricas, pero no hay saltos que dejen el contexto a la vista. No hay pantalla admin de scanners (viven en el portal del dueño): no se crea una ruta nueva.

`admin/.../descuentos/[discountId]/page.tsx` sigue siendo la página grande (~600 líneas). **DEFER**: no hace falta partirla para el polish de G9.

“Liquidar” permanece como en G7.11/G7.12: vertical GASTRO fija, local preseleccionado, acuerdo visible, settlement no atado al descuento.

### Acciones (G9.9)

Misma intención, labels distintos:

| Intención | Hoy | Wording de G9 |
|---|---|---|
| Alta de local (portal) | “Nuevo local / propuesta” | “Crear local” |
| Alta de descuento | “Nuevo ticket” | “Crear descuento” |
| Alta de cortesía (owner) | “Crear cortesía” | “Solicitar cortesía” |
| Alta de publicación | “Nueva publicación” / botón “Crear” | “Crear publicación” |
| Alta de scanner | “Nuevo scanner” | “Crear scanner” |
| Liquidación | “Generar” ya usado en admin | se conserva |

“Archivar” en publicaciones ya es lifecycle, no “Eliminar”. No se renombran rechazar/aprobar/cancelar de admin.

### Responsive y a11y (G9.10 / G9.11)

- Navbar/drawer del portal gastro deben seguir llevando el local elegido.
- Tabla de scanners: en mobile, cards apiladas (el patrón ya usado en admin de locales), no un sistema nuevo.
- Ficha: sin hover para la información principal.
- A11y acotada: `aria-label` de compartir, no anidar links en la card, labels de formulario que ya existen se respetan, alt de imágenes de publicación que hoy van vacíos cuando hay título.

---

## 3. Fuera de G9 (conservar deferred)

- Reversión `DEBIT_COURTESY`
- Cancelar solicitudes pendientes de descuentos normales
- Studio lifecycle guard en backend
- Refactor del detalle admin de descuento
- Auditar allocations legacy de cortesía financiada en producción
- Upload privado de comprobantes
- Rails secundarios (siguen pendientes por datos)
- Settlement DB seed y escritura DB de agreements
- Concurrencia real de funding / crédito / overpayment
- Scanner HTTP E2E
- Consumo de cortesía en Activity
- `apps/web/lib/categories/subcategoryRailThreshold.test.ts` (vitest) — preexistente, no es de G9

Working tree ajeno al auditar: `packages/shared/src/benefit-settlement-operations.assert.ts` figuraba modificado solo por finales de línea, y `.cursorignore` sin trackear. No forman parte de G9.
