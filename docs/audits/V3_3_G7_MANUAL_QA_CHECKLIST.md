# V3.3 G7.3–G7.7 — Manual QA checklist (Gastro expansion)

**Fecha:** 2026-10-22  
**Estado automatizable:** scripts unitarios PASS; DB local smoke PASS (`V3_3_G7_DB_INTEGRATION_STATUS.md`)  
**Estado QA manual humana:** **PENDIENTE** (requiere browser / flujos UI; Postgres ya disponible en local)

Marcá cada ítem al completar. No marcar PASS sin evidencia.

---

## G7.3 — Portal Gastro

- [ ] Usuario Gastro con Local A + Local B activos
- [ ] Crear Local C → status PENDING
- [ ] ADMIN aprueba Local C → ACTIVE; GASTRO ve C en selector
- [ ] Cambiar entre A / B / C (datos, descuentos, contenido cambian)
- [ ] Editar datos del local activo + subcategorías + tags
- [ ] Crear publicaciones GastroContent + galería (`galleryUrls`, fallback `imageUrl`)
- [ ] Confirmar publicación A solo visible en contexto Local A
- [ ] Crear/editar descuento del local activo
- [ ] Scanner del local (si cuenta scanner asociada)
- [ ] Métricas Local A ≠ Local B ≠ Local C (vistas no se suman por owner)
- [ ] Métricas operativas de un descuento solo de ese descuento

---

## G7.4 — Admin

- [ ] Pending profiles approve/reject
- [ ] Active / suspended
- [ ] Isolation profile A vs B en descuentos, contenido, métricas
- [ ] Subcategories / tags edit
- [ ] Publications panel
- [ ] Discount approval
- [ ] **Sin agreement CURRENT → Aprobar disabled + API `BENEFIT_AGREEMENT_NOT_FOUND`**
- [ ] Crear/reemplazar agreement del **local** (copy partner-scoped)
- [ ] Operational metrics (G4) vs Economic metrics (G6) separadas
- [ ] Settlements CASH / BARTER UI

---

## G7.5 — Scanner

- [ ] Scanner A valida Discount A (mismo local) → OK
- [ ] Scanner A intenta Discount B (otro local) → reject
- [ ] QR payload
- [ ] shortCode
- [ ] Online path
- [ ] Offline (si aplica al build actual) — no reestructurar PWA

---

## G7.6 — Público `/gastronomicos/[id]`

- [ ] Hero / description / publications / gallery / discounts
- [ ] Taxonomy + tags
- [ ] Map / reviews (existente)
- [ ] Una visita registra view **solo** en ese `GastroProfile` (no en todos del owner)
- [ ] Owner/ADMIN visit no incrementa (skip engagement)

---

## G7.7 — Accounting

### Caso 1 — 20 validaciones / $5.000 / 10 CASH + 10 BARTER ×2

- [ ] CASH: 10 usos, base $50.000
- [ ] BARTER: 10 usos, base $50.000, credit generated $100.000
- [ ] **Nunca** UI “$150.000 cobrado”

### Caso 2 — Agreement $5.000 → $7.000

- [ ] Allocations históricas conservan $5.000 + multiplier anterior
- [ ] Nuevas allocations usan $7.000

### Caso 3 — Dos descuentos en mismo settlement

- [ ] Bases CASH atribuibles por descuento correctas
- [ ] Transferido del settlement **no** aparece como “transferido del Descuento X”

### Caso 4 — DEBIT_COURTESY posterior

- [ ] Consumo visible como partner-level
- [ ] **No** “crédito consumido por este descuento”

### Semántica G6 (no cambiar)

```text
EXACT discount | SETTLEMENT_LEVEL | PARTNER_LEVEL | NOT_ATTRIBUTABLE
```

---

## Automatizado en este branch (sin browser)

Ver `V3_3_GASTRO_EXPANSION_CLOSING.md` § Tests.
