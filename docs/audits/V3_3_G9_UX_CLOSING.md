# V3.3 G9 — Cierre UX final

**Fecha:** 2026-10-23  
**Rama:** `feat/v1-s03-api-foundation`  
**HEAD inicial:** `a84591a`  
**HEAD de código:** `43e59d5` (este documento es el commit siguiente)

Producción congelada. **No push. No deploy.** QA manual global queda para después de este cierre.

Discovery: [`V3_3_G9_UX_DISCOVERY.md`](./V3_3_G9_UX_DISCOVERY.md).

---

## Qué se cerró

| Slice | Resultado |
|---|---|
| G9.0 Discovery | PASS — `631b80c` |
| G9.1 Compartir local | PASS — URL pública `/gastronomicos/{id}`, sin `tenantId`, sin rutas de portal/admin. Solo locales `ACTIVE` en `/gastro/local`. La ficha pública también comparte. |
| G9.2 Web Share + fallback | PASS — `navigator.share` si existe; si no, WhatsApp (`wa.me/?text=`) y “Copiar enlace” con toast “Enlace copiado”. Reutiliza `shareUrl`. Sin dependencia nueva. `f53d7c2` |
| G9.3 Ficha pública | PASS — columna: descripción, galería, subcategorías, etiquetas, descuentos, publicaciones. Sidebar: acciones, contacto, horarios, mapa compacto, compartir. `COURTESY_ONLY` sigue filtrado en el servicio público (`visibility: 'PUBLIC'`). `468a864` |
| G9.4 Multi-local | PASS — 0 locales: CTA “Crear mi primer local” en dashboard y valoraciones. 1 local: sin selector redundante, `profileId` se conserva. N locales: la URL gana; si falta, se recuerda el local elegido (sessionStorage) antes de caer al primer `ACTIVE`. Nav, accesos y onboarding arrastran `profileId`. Estados: Pendiente de aprobación, Local activo, Solicitud rechazada, Local suspendido. `25e79e6` |
| G9.5 Cards | PASS — dos chips (principal con borde sólido, secundaria punteada) y `+N`. Con subcategorías, una sola etiqueta y sin link anidado. La lógica primary + secondary no cambió. `371fb92` |
| G9.6 Empty states | PASS — descuentos, cortesías, publicaciones, scanners y valoraciones dicen qué falta y ofrecen el CTA del dominio. |
| G9.7 Scanner | PASS — usuario, local y sesión activa. Resultados con los estados reales (`VALID`, `ALREADY_USED`, `EXPIRED`, `INVALID`, `INACTIVE`, `NOT_VALID_TODAY`, `LIMIT_REACHED`). No existen `USED`, `CANCELLED` ni `WRONG_LOCATION` en esa respuesta. Cortesía: beneficio, shortCode, nunca `0%`, sin QR maestro. CTAs de cámara y código manual se mantienen. El listado del portal filtra por el local elegido y en mobile usa cards. `bc2c0a1` |
| G9.8 Admin | PASS — desde el local: anclas a métricas, publicaciones, descuentos y cortesías. Settlement “Liquidar” no se tocó (sigue G7.11/G7.12). Detalle admin de descuento (~607 líneas) **DEFER**. `3d0feb8` |
| G9.9 Labels | PASS — Crear local, Crear descuento, Solicitar cortesía, Crear publicación, Crear scanner. Archivar sigue siendo archivar. `79f2836` |
| G9.10 Responsive | PASS — drawer del portal gastro conserva el local; scanners en cards bajo `md`; ficha sin depender de hover para el contenido. No hay sistema nuevo de breakpoints. |
| G9.11 A11y | PASS — labels de compartir, estado del local, cierre de menú ya existente, tags de la card sin link anidado, alt de imágenes de publicación y de descuento. No es una auditoría WCAG. |
| G9.12 Regresión | PASS — ver abajo |
| G9.13 Builds | PASS — ver abajo. Web `tsc` suelto PREEXISTING |
| G9.14 Docs | este documento |

Fix de build: `43e59d5` — el drawer mobile usa el query string para marcar Descuentos vs Cortesías.

---

## Regresión

Suites (exit 0):

```text
test:gastro-location-share
test:gastro-active-profile
test:gastro-card-chips
test:gastro-empty-states
test:gastro-scan-presentation
test:gastro-cross-profile-isolation
test:gastro-courtesy-portal
test:gastro-courtesy-scanner
test:admin-gastro-courtesy
test:gastro-courtesy-approval
test:gastro-courtesy-accounting   (DB integration: PASS)
test:benefit-settlement-operations (DB integration: NO EJECUTADO — sin seed, igual que G7.12/G8)
```

No hubo bug de `profileId`, `tenantId`, `visibility`, lifecycle ni elegibilidad de settlement. El único cambio de API es el texto «Crear local» en el mensaje de alta duplicada.

---

## Builds

| Target | Resultado |
|---|---|
| shared (`tsc`) | PASS |
| api (`prisma generate && nest build`) | PASS |
| web (`next build`) | PASS. Durante el SSG hubo `ECONNREFUSED` al API local; las 117 páginas igual se generaron y el exit code fue 0. |
| scanner (`next build`) | PASS |
| web `tsc --noEmit` | PREEXISTING — solo `lib/categories/subcategoryRailThreshold.test.ts` (`Cannot find module 'vitest'`) |

Migrations nuevas: **ninguna**.

---

## Deferred que se conservan

- Reversión `DEBIT_COURTESY`
- Cancelar solicitudes pendientes de descuentos normales
- Studio lifecycle guard en backend
- Refactor del detalle admin de descuento (~607 líneas)
- Auditar allocations legacy de cortesía financiada en producción
- Upload privado de comprobantes
- Rails secundarios (faltan datos)
- Settlement DB seed
- Escritura DB del agreement en el script de agreements
- Concurrencia real de funding / crédito / overpayment
- Scanner HTTP E2E
- Consumo de cortesía en Activity
- QA manual global (recién ahora el código está listo para hacerlo)

---

## Working tree

`.cursorignore` sigue sin trackear. No forma parte de G9.
