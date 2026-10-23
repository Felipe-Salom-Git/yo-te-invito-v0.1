# V3.3 G8.1 + G8.2 — Hardening y lifecycle de cortesías (closing)

**Fecha:** 2026-10-23  
**Rama:** `feat/v1-s03-api-foundation`  
**Discovery:** [`V3_3_G8_COURTESY_DISCOVERY.md`](./V3_3_G8_COURTESY_DISCOVERY.md)  
**Push / deploy / migrations:** **NO / NO / NINGUNA**  
**G8.3+:** NOT STARTED

| Slice | Commit |
|---|---|
| G8.1 Hardening + scope/local | `9c87348` |
| G8.2 Lifecycle | `d2143f7` |

---

## Decisiones D1–D5 (aprobadas por el operador)

| ID | Decisión | Estado |
|---|---|---|
| **D1** | Cortesía **financiada con Courtesy Credit** (`DEBIT_COURTESY` + `sourceCourtesyCampaignId`) → **NO elegible** para settlement (ni CASH, ni BARTER, ni genera crédito). Cortesía **no financiada** → puede ser elegible según acuerdo y allocations normales | **Solo documentada.** Se implementa en **G8.11**. G8.1/G8.2 **no** tocan elegibilidad ni introducen comportamiento contrario |
| **D2** | GASTRO_OWNER **no** gasta Courtesy Credit; solo ADMIN financia | Verificado por test (403 `BENEFIT_CREDIT_FUNDING_ADMIN_ONLY`); sin ampliar permisos del ledger |
| **D3** | Cortesía de owner: `PENDING_REVIEW` → claims retenidos → admin review → agreement CURRENT → approve → activar/entregar. Admin puede crear `ACTIVE`. **Legacy ACTIVE no se invalida** | G8.3 (no iniciado). G8.1/G8.2 no alteran el lifecycle de creación |
| **D4** | ShortCode: 6 caracteres, alfabeto actual, unicidad global; luego retry `P2002` con tope razonable; compatibilidad legacy | G8.6 |
| **D5** | Reutilizar `GastroDiscountTemplate` + `DiscountTemplateRenderer`; texto dinámico `courtesyLabel` (o `benefitLabel` si es claramente mejor, sin renombrar campos canónicos); en `COURTESY_ONLY` nunca renderizar `0%` | G8.7 |

---

## G8.1 — Hardening + scope/local

| Hallazgo discovery | Corrección |
|---|---|
| B1 selector de local ignorado | `/gastro/descuentos/cortesia` usa el local activo (`?profileId=` vía `useGastroActiveLocation` + `GastroLocationSelector`). Nunca el default implícito de la API. Locales no `ACTIVE` o ajenos no pueden enviar. Reset de resultado/preview al cambiar de local. `profileId` se conserva en los links (volver, "Enviar cortesías") |
| B2 `coerce.boolean` | Preview usa `parseQueryBoolean` (`"false"` → `false`). Antes `?sendToFollowers=false` se leía como `true` |
| B6 ventana de fechas | `validFrom <= validTo` (`isCourtesyValidityRangeValid`), 400 si no |
| B7 `publicEventId` (admin) | **Verificado:** `GastroDiscount.eventId` es `String` requerido y la ruta admin usaba `profile.publicEventId!` → error Prisma. Guard 400 claro |
| B8 origen | Cortesía de ADMIN ⇒ `createdByOrigin = ADMIN`; siempre `createdByUserId` |
| U1 visibilidad | `visibility` + `courtesyCampaign{id,title,discountLabel}` en la respuesta del portal; badge «Cortesía» y filtro Todos / Descuentos / Cortesías en `/gastro/descuentos` |

Scope: todo el envío queda acotado por `tenantId` + `gastroProfileId` (membership por perfil para owner; perfil `ACTIVE` del tenant para admin).

## G8.2 — Lifecycle

| Regla | Implementación |
|---|---|
| 🔴 **Cortesía nunca obtiene `qrToken` / master QR** | `updateDiscountStatus` ya no lo genera para `COURTESY_ONLY` (`shouldGenerateMasterQr`); el descuento público conserva exactamente su comportamiento |
| Cancelada = terminal | Reactivar una cortesía cancelada → 400 `GASTRO_COURTESY_CANCELLED_TERMINAL` (portal y admin). UI sin «Activar» |
| Cancelar campaña ⇒ claims | En la **misma transacción** se pasan a `CANCELLED` los claims `ACTIVE` (`type COURTESY`, scope tenant + discount). `USED` queda `USED` (historial). Aplica a cancelar desde portal y desde admin. Audit con `cancelledClaims` |
| Inmutable tras el envío | `PATCH /gastro/discounts/:id` sobre `COURTESY_ONLY` → 400 `GASTRO_COURTESY_IMMUTABLE` (type, value, visibility, validez **y** texto: evita drift con la campaña). UI sin «Editar» |
| Edición pendiente legacy | `approvePendingEdit` de una cortesía ya no cambia `type/value/validez`; el título se refleja en la campaña. Edición admin directa también sincroniza el título |
| Defensa en profundidad del scanner | La ruta de **QR a nivel descuento** (claimless, ilimitada) devuelve `INVALID` para `COURTESY_ONLY` **aunque una fila legacy tenga `qrToken`** |
| Sin exposición | Respuesta del portal nunca expone `qrToken`/`qrPayload` de una cortesía; `sendQrEmail` admin las rechaza |
| Ruido | No se envía «Descuento vencido» por cortesías; contadores/alertas de descuentos (dashboard y perfil) cuentan solo `PUBLIC`. Los contadores de **validaciones** siguen incluyendo canjes de cortesía |
| Fix colateral | En el dashboard, el conteo de «vencidos» usaba un `OR` que **pisaba** el scope por local de `discountWhere`; ahora usa `AND` |

### Hallazgos inciertos de G8.0 — resueltos

| Hallazgo | Resultado |
|---|---|
| `PATCH discounts/:id` duplicado en `gastro.controller.ts` | **Confirmado estáticamente:** hay dos `@Patch('discounts/:id')` en el mismo controller (portal y legacy). Express/Nest atiende con el **primero declarado** (portal), por lo que el legacy está sombreado y no es alcanzable. **No se eliminó** (fuera de alcance); se le agregó guard `GASTRO_COURTESY_IMMUTABLE` por defensa en profundidad. *No hay test HTTP de runtime que lo pruebe*, la conclusión es por semántica de ruteo |
| Guarda `publicEventId` en ruta admin | **Confirmado y corregido** (G8.1, ver arriba) |

---

## Qué NO cambió

- Elegibilidad de settlement (F1/F2 del discovery siguen vigentes: hoy un canje de cortesía es facturable). Se resuelve en **G8.11** según D1.
- Aprobación/agreement de cortesías, entrega, shortCode, Studio, emails, portal de campañas, admin.
- `DEBIT_COURTESY` sigue sin ser reversible (F5, G8.11). Cancelar una campaña financiada **no** devuelve el crédito.
- Campañas legacy `ACTIVE`: no se invalidan. Una legacy con `qrToken` queda sin QR general utilizable (scanner lo cierra).
- **Migrations: ninguna.**

## Tests

| Comando | Resultado |
|---|---|
| `test:gastro-courtesy-hardening` (nuevo, 18 checks: publicEventId, fechas, origen, scope A/B y tenant, D2) | **PASS** |
| `test:gastro-courtesy-lifecycle` (nuevo, 48 checks: reactivación sin master QR, cancel→claims, scope, inmutabilidad, scanner, admin) | **PASS** |
| `gastro-courtesy-lifecycle.assert` (shared; `parseQueryBoolean`, ventana, helpers) | **PASS** |
| `courtesy-scope.assert` (web; local activo, `profileId`, filtro) | **PASS** |
| `test:gastro-cross-profile-isolation` | **PASS** (exit 0) |
| `test:courtesy-credit-ledger` / `test:gastro-courtesy-credit-funding` | **PASS** |
| `test:benefit-settlement-operations` / `-admin-ui` (regresión) | **PASS** |

Los tests de comportamiento usan **Prisma falso** (sin PostgreSQL): validan la lógica y el scoping de las queries, **no** filas reales. **DB integration: NO EJECUTADO.**

## Builds

| Target | Resultado |
|---|---|
| shared / api / scanner | **PASS** |
| web `next build` | **PASS** (ECONNREFUSED en SSG sin API local: conocido) |
| web `tsc --noEmit` standalone | **PREEXISTING FAIL** — solo `vitest` en `subcategoryRailThreshold.test.ts` |

## QA manual pendiente (browser, solo con aprobación de deploy)

- [ ] Multi-local: elegir local B en `/gastro/descuentos/cortesia` y verificar que la cortesía queda en B
- [ ] Preview con «seguidores» destildado no suma seguidores
- [ ] `/gastro/descuentos`: badge «Cortesía» y filtro
- [ ] Detalle de cortesía: sin «Editar»; cancelar → claims no canjeables en `/me` y en el scanner
- [ ] Cortesía cancelada no ofrece «Activar»
- [ ] Escanear QR de claim válido (canjea) y QR general de una cortesía legacy (INVALID)

## Riesgos / pendientes

- Cortesías ya enviadas a producción siguen siendo facturables hasta G8.11 (decisión D1).
- La edición queda bloqueada por completo en cortesías: el flujo corrector es cancelar + reenviar (hasta que G8.3 defina revisión).
- El scanner todavía muestra el valor `0%` en el resultado de una cortesía (`valueLabel`): corresponde a **G8.5**; el Studio/render a **G8.7**.
