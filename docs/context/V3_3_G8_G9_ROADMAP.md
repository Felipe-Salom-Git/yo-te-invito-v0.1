# V3.3 — Roadmap G8 / G9 (NO IMPLEMENTAR aún)

**Estado:** roadmap only — discovery/implementación **bloqueados** hasta instrucción explícita.  
**Precondición recomendada:** G7.10 cerrado en código (`docs/audits/V3_3_G7_10_QA_FIXES_CLOSING.md`); deploy + QA browser post-deploy a criterio del operador.

```text
G8: NOT STARTED
G9: NOT STARTED
```

---

## Orden general

```text
✅ G1–G7 — Expansión gastro + QA/hardening
✅ G7.10 — QA fixes + onboarding refinement
⏭ G8 — Courtesy Coupons (nueva etapa; empieza con discovery)
⏭ G9 — UX complementaria gastro (polish; no contaminar G8)
```

---

## G8 — Courtesy Coupons

Nueva etapa funcional. **Antes de implementar:** discovery específico (G8.1).

### Concepto

Una cortesía es un cupón consumible que **no** se publica públicamente, pero internamente debe comportarse de forma equivalente a un descuento.

**No confundir:**

| Dominio | Rol |
|---|---|
| **Courtesy Coupon** | Beneficio/cupón para un usuario |
| **CourtesyCreditLedgerEntry** | Contabilidad BARTER del partner |

### Hipótesis de discovery (registrada 2026-10-22)

Ya existe un flujo de cortesías Gastro (migration `20260615120000_gastro_courtesy_discount_claims`):

- `GastroCourtesyCampaign` (por `gastroProfileId`, `discountId` único)
- `GastroDiscount.visibility = COURTESY_ONLY` (fuera de ficha/listados públicos)
- `GastroDiscountClaim.type = COURTESY` + `courtesyCampaignId`
- Portal `/gastro/descuentos/cortesia`, `POST /gastro/discounts/courtesy/send`, email `GASTRO_DISCOUNT_QR_COURTESY`
- `CourtesyCreditLedgerEntry.sourceCourtesyCampaignId` (débito BARTER por campaña financiada, Etapa 9)

El discovery debe partir de **extender esta arquitectura**, no de crear un dominio nuevo, salvo que la auditoría demuestre que no alcanza. `CourtesyGrant` es de tickets y no se mezcla.

Numeración vigente (prompt operador): discovery = **G8.0**; los IDs de abajo son referencia histórica.

### Slices planificados (alto nivel)

| ID | Tema |
|---|---|
| G8.1 | Discovery Courtesy actual (`GastroCourtesy*`, claims, scanner, ledger, discounts) |
| G8.2 | Dominio Courtesy Coupon por `GastroProfile` |
| G8.3 | Lifecycle + approval (alineado a GastroDiscount donde corresponda) |
| G8.4 | `BenefitCommercialAgreement` CURRENT al aprobar |
| G8.5 | Claims + short codes |
| G8.6 | Scanner isolation por local (A valida A, no B) |
| G8.7 | Reusar QR Studio / template engine (no segundo Studio) |
| G8.8 | Short code más corto (con análisis de colisiones + legacy) |
| G8.9 | Código visible en cupón/email/Studio |
| G8.10 | Email approval + contexto commercial agreement |
| G8.11 | Portal GASTRO — Cortesías por local |
| G8.12 | ADMIN — review / agreement / approve |
| G8.13 | Accounting / settlements integration |
| G8.14 | QA isolation / QR / scanner / accounting |

---

## G9 — UX complementaria gastro

Mejoras pequeñas que **no** deben mezclarse con Courtesy Coupon.

| ID | Tema |
|---|---|
| G9.1 | Share local WhatsApp (URL pública canónica) |
| G9.2 | Share general (Web Share API + fallback) |
| G9.3 | Polish mini map / location (post G7.10.7) |
| G9.4 | Scanner UX listado (username / local / status) |
| G9.5 | Cards taxonomy UX (chips overflow) |
| G9.6 | QA / polish final UX gastro |

---

## Reglas de arranque

1. **No** abrir PRs de G8/G9 en el mismo slice que G7.10.
2. G8 **debe** empezar con audit/discovery (G8.1), no con schema speculative.
3. G9 puede correr en paralelo a G8 solo si no toca dominio Courtesy.
