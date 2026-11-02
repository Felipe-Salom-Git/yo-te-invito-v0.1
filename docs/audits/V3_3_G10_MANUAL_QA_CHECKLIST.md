# V3.3 G10 — Checklist de QA manual (post-deploy)

**Cuándo:** después del paso 18 del runbook [`V3_3_G10_PRODUCTION_DEPLOY.md`](../runbooks/V3_3_G10_PRODUCTION_DEPLOY.md), con el backfill confirmado e integridad OK.  
**Alcance:** G10.A + B + C + D (+ E). Marcar solo lo recorrido de verdad en el navegador. Usar un local de prueba o datos reales con cuidado: **registrar pagos y asignar validaciones son operaciones reales** (ver «Datos de prueba»).

**Rutas:** ADMIN `/admin/gastronomicos/:profileId/descuentos/:discountId` (secciones «Contrato comercial», «Métricas económicas», «Liquidar validaciones», «Pagos»), `/admin/liquidaciones`, `/admin/liquidaciones/:id`, `/admin/liquidaciones/acuerdos`, `/admin/liquidaciones/acuerdos/nuevo` · GASTRO `/gastro/descuentos/:id` («Contrato y liquidaciones») · Scanner `https://scanner.yoteinvito.club`.

## Datos de prueba

- Preferir un **local de prueba** del tenant de producción con dos descuentos (A y B) y usos reales de prueba (claims escaneados). Si se usa un local real, coordinar con el operador antes de asignar o registrar pagos.
- Toda reversa es append-only: una prueba deja historial visible (es lo esperado).
- Anotar IDs de descuento, liquidación y transferencias probadas.

---

## 1. ADMIN — Contratos

- [ ] Descuento A sin contrato: estado «Sin contrato», alerta «⚠ Sin contrato comercial vigente…», botón «Aprobar» bloqueado con enlace a «Contrato comercial».
- [ ] **Crear contrato A**: valor $5.000, ARS, multiplicador, «Desde» hoy, sin «Hasta» ⇒ estado «Vigente», origen «cargado por administración».
- [ ] **Crear contrato B** (mismo local) con **valor distinto** ($7.500) ⇒ cada descuento muestra solo su contrato.
- [ ] **Reemplazar A** («Cambiar contrato») ⇒ la fila anterior se cierra el día anterior, la nueva queda Vigente; historial con 2 filas; los términos de la fila vieja no cambian.
- [ ] **Cerrar contrato** con fecha fin ⇒ «Vencido» después de esa fecha; historial intacto.
- [ ] Historial: orden, valores, vigencias y autor correctos.
- [ ] Descuento migrado por backfill: origen «copiado del contrato del local (migración)».
- [ ] Contrato **legacy** del local: «Contrato del local (legacy) · solo lectura», sin acciones. En `/admin/liquidaciones/acuerdos` con Alcance = Legacy: badge **Legacy** + «Solo lectura».
- [ ] `/admin/liquidaciones/acuerdos/nuevo` GASTRO: no se puede enviar sin elegir Local → Descuento. ACTIVITY: operador + términos, igual que antes.

## 2. ADMIN — Approval

- [ ] Descuento A **con** contrato vigente ⇒ «Aprobar» PASS; email de aprobación con «contrato comercial de este descuento» y sus líneas.
- [ ] Descuento B **sin** contrato ⇒ aprobar bloqueado («Este descuento no tiene un contrato comercial vigente.»), aunque el local tenga contrato legacy.
- [ ] Reactivar un descuento cancelado sin contrato ⇒ bloqueado; con contrato ⇒ PASS.
- [ ] Alta on-behalf con términos ⇒ nace ACTIVE con su contrato; términos con «Desde» futuro ⇒ error claro.

## 3. ADMIN — Resumen económico («Métricas económicas»)

- [ ] **Contrato**: vigente, valor, multiplicador, vigencia; sin contrato ⇒ enlace «Cargar contrato del descuento».
- [ ] **Validaciones**: totales, facturables, liquidadas, pendientes, pendientes sin contrato.
- [ ] **CASH generado / pagado / pendiente** + badge de precisión (EXACT; SETTLEMENT_LEVEL solo con pagos legacy sin atribución en una liquidación donde el descuento debe CASH, con el texto «…no prorratea esos pagos»).
- [ ] **CANJE**: usos, base, crédito generado; «El crédito pertenece al saldo general del local.» + «Saldo general del local».
- [ ] **Liquidaciones**: período, estado, CASH del descuento vs totales de la liquidación, badges «Incluye otros descuentos» / «Pagos sin atribuir», link a `/admin/liquidaciones/:id`.
- [ ] **Pagos**: fecha, monto, referencia, período, estado, quién registró / revirtió, notas, comprobante.
- [ ] **Historial**: contratos, asignaciones, crédito, pagos, reversiones con actor.

## 4. ADMIN — CASH

- [ ] «Liquidar validaciones»: pendientes agrupadas por período; **selección explícita** de validaciones.
- [ ] **Asignar a CASH** (modal «Liquidar como: CASH») ⇒ CASH generado sube; **no** aparece ningún pago.
- [ ] **Registrar pago parcial** (p. ej. $30.000 de $50.000): solo aparecen períodos con saldo; el máximo = saldo CASH del descuento ⇒ pagado $30.000 / pendiente $20.000, EXACT.
- [ ] **Registrar pago final** ($20.000) ⇒ pendiente $0.
- [ ] **Sobrepago bloqueado**: $1 extra ⇒ error de sobrepago del descuento; nada se registra.
- [ ] **Revertir pago**: modal con motivo obligatorio ⇒ pago «Revertido», pendiente vuelve; la fila sigue visible.
- [ ] `/admin/liquidaciones/:id` GASTRO: columnas Descuento / Local; pago nuevo con badge **EXACT**; el formulario exige elegir descuento.

## 5. ADMIN — CANJE

- [ ] Seleccionar validaciones ⇒ **Asignar a CANJE** (modal con crédito estimado).
- [ ] Base y **crédito generado** suben (base × multiplicador); el saldo general del local sube.
- [ ] **No** se crea ninguna transferencia CASH; no existe «pago CANJE».
- [ ] Reintentar la misma selección ⇒ rechazada (no pendiente); sin crédito duplicado.

## 6. GASTRO (dueño del local)

- [ ] `/gastro/descuentos/:id` → «Contrato y liquidaciones»: contrato **read-only** (valor, canje, vigencia), sin botones de edición.
- [ ] Métricas: validaciones, CASH generado / pagado / pendiente, canje base y crédito.
- [ ] Liquidaciones (período, estado) y pagos (fecha, monto, referencia).
- [ ] **No** ve: notas internas, actores (quién registró / revirtió), comprobante (`proofUrl`), acciones financieras (asignar, registrar, revertir), links de admin.
- [ ] Sin contrato: texto «Este descuento todavía no tiene un contrato comercial cargado…».

## 7. Cortesías

- [ ] **Financiada**: sin contrato requerido («No requiere contrato»), bloque «no facturable»; sus validaciones no aparecen como asignables (ni CASH ni CANJE) ni como «sin contrato»; email «Cortesía financiada con canje: no facturable».
- [ ] **No financiada**: exige contrato propio para aprobar; con contrato es facturable (aparece en «Liquidar validaciones» con su valor).

## 8. Multi-descuento (mismo local)

Descuento A $5.000 y B $7.500 en el mismo local y período:

- [ ] **Contrato**: cada detalle muestra solo el suyo.
- [ ] **Pricing**: validaciones de A valuadas a $5.000, de B a $7.500.
- [ ] **Métricas**: ningún detalle muestra la suma de ambos.
- [ ] **CASH**: un pago de A no reduce el pendiente de B; A no puede usar el saldo de B (sobrepago).
- [ ] **CANJE**: base y crédito por descuento.
- [ ] **Pagos**: cada pago aparece solo en el descuento atribuido; en la liquidación, columna Descuento correcta.

## 9. Multi-local (mismo usuario GASTRO con Local A y Local B)

- [ ] El selector de local muestra solo los propios; el detalle de un descuento de A no muestra datos de B.
- [ ] Abrir por URL un descuento del otro local ⇒ error (sin datos).
- [ ] ADMIN: URL con local B + descuento de A ⇒ 404.

## 10. Legacy

- [ ] Contratos legacy visibles **solo lectura** (detalle del descuento y `/admin/liquidaciones/acuerdos`).
- [ ] Los 5 descuentos sin cobertura del A0: alerta «Sin contrato comercial vigente», validaciones pendientes como «Sin contrato vigente para la fecha de validación» (deshabilitadas). **No** hay precios inventados.
- [ ] Transfer GASTRO legacy (si existiera): «Pago legacy sin atribución» + badge **SETTLEMENT_LEVEL**, sin descuento inferido.
- [ ] Cargar el contrato de uno de esos descuentos ⇒ sus pendientes pasan a valuadas y asignables.

## 11. Mobile (ADMIN y GASTRO, ~375 px)

- [ ] Detalle de descuento: secciones legibles, sin scroll horizontal de página.
- [ ] Cards económicas (contrato, validaciones, CASH, CANJE) apiladas.
- [ ] Tablas (pendientes por período, liquidaciones, pagos, historial) con scroll propio.
- [ ] Modales (asignar CASH / CANJE, registrar pago, revertir pago, contrato) usables y con botones visibles.
- [ ] Registrar pago y revertir pago completables desde el teléfono.

## 12. Scanner (regresión — G10 no modificó el scanner)

- [ ] `VALID`: claim activo de un descuento ACTIVE / APPROVED.
- [ ] `ALREADY_USED`: segundo escaneo del mismo claim.
- [ ] `EXPIRED`: cupón vencido o descuento fuera de vigencia («Hasta» pasado).
- [ ] `INVALID`: token incorrecto o QR malformado.
- [ ] `INACTIVE`: descuento cancelado (o todavía no habilitado: «Desde» futuro) o cupón cancelado.
- [ ] `NOT_VALID_TODAY`: descuento con día de semana distinto al de hoy.
- [ ] `LIMIT_REACHED`: el backend ya no lo emite (sin límite diario desde `ffa333f`); verificar que dos cupones distintos del mismo usuario el mismo día dan `VALID` + `VALID`.
- [ ] Un descuento **sin contrato** sigue escaneándose normalmente (el contrato afecta liquidación, no validación).

## 13. Integridad y cierre

- [ ] `GET /admin/benefit-reporting/integrity` (o `pnpm --filter api run benefit-settlements:audit-integrity` en el VPS) sin `AGREEMENT_SCOPE_MISMATCH`, `DISCOUNT_CASH_OVERPAYMENT`, `TRANSFER_DISCOUNT_SCOPE_MISMATCH`, `FUNDED_COURTESY_ALLOCATED` después de las pruebas.
- [ ] ACTIVITY: acuerdos, liquidación y transferencias como antes (sin campo descuento).

## Registro

```text
Fecha / operador:
Local(es) de prueba:
Descuentos A / B:
Liquidación probada:
Transfers creadas / revertidas:
Bloqueantes encontrados:
Resultado:  PASS / FAIL
```
