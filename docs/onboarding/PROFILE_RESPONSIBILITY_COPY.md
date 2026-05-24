# Profile Responsibility Copy — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 11 — Textos de responsabilidad  
Estado: Implementado

## 1. Resumen

Se centralizaron los textos UX de **responsabilidad por perfil** en `apps/web/components/auth/register/register-wizard-responsibility-copy.ts`, con presentación consistente vía `RegisterResponsibilityCallout`. El objetivo es evitar copy disperso en `register-wizard-copy.ts` y componentes sueltos, sin confundirlos con documentos legales publicados.

## 2. Alcance

- Textos de **orientación UX**, no términos legales definitivos.
- No reemplazan `terms_general`, `privacy_policy`, ni verticales `PORTAL_ACCESS`.
- No agregan bloqueos legales ni checkboxes.
- Rental: sin wizard; copy en CTA público de contacto.

## 3. Copy por perfil

| Perfil | Texto (resumen) | Dónde aparece | Observación |
|---|---|---|---|
| `USER` | Revisar evento, condiciones y políticas antes de comprar | `RegisterBuyerStep` | Variante `subtle` (liviano) |
| `PRODUCER` | Info de eventos, precios, condiciones, disponibilidad, atención | `RegisterProducerStep` | Card informativa |
| `GASTRO` | Info del local, promos y condiciones actualizadas | `RegisterGastroStep`, `/cuenta/solicitar-gastro` | Misma fuente |
| `HOTEL` | Ficha actualizada; sin reservas/pagos en plataforma | `RegisterHotelStep` | Reemplaza disclaimer amber duplicado |
| `REFERRER` | Acuerdos/comisiones registradas; pagos no garantizados | `RegisterReferrerStep` | Sin lenguaje de saldo/retiro automático |
| `RENTAL_CONTACT` | Alta operativa; sin portal autogestión | `RentalProviderContactCta` (vía `publicCopy`) | No en `/register` |

Textos completos en código: `PROFILE_RESPONSIBILITY_COPY`.

## 4. Relación con documentos legales

| Contexto | Qué aplica |
|---|---|
| **SIGNUP** | Términos generales + privacidad (`signupLegalAcceptance`) en paso Legales |
| **PORTAL_ACCESS** | Verticales por perfil (`producer_terms`, `referrer_terms`, etc.) — sin cambios en este slice |
| **Responsabilidad UX** | Callout informativo en paso de datos del perfil; **no** duplicado bajo checkboxes legales |

## 5. Archivos modificados

- `apps/web/components/auth/register/register-wizard-responsibility-copy.ts` (nuevo)
- `apps/web/components/auth/register/RegisterResponsibilityCallout.tsx` (nuevo)
- `apps/web/components/auth/register/register-wizard-copy.ts` (eliminados `responsibility` / `disclaimer` duplicados)
- `apps/web/components/auth/register/RegisterBuyerStep.tsx`
- `apps/web/components/auth/register/RegisterProducerStep.tsx`
- `apps/web/components/auth/register/RegisterGastroStep.tsx`
- `apps/web/components/auth/register/RegisterHotelStep.tsx`
- `apps/web/components/auth/register/RegisterReferrerStep.tsx`
- `apps/web/app/(portal)/cuenta/solicitar-gastro/page.tsx`
- `apps/web/lib/rentals/publicCopy.ts`
- `apps/web/components/rentals/RentalProviderContactCta.tsx`
- `docs/onboarding/PROFILE_RESPONSIBILITY_COPY.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 6. Verificación

```bash
pnpm --filter web run build
```

Error preexistente no relacionado: `ProducerReferralMetricsPanel.tsx` (`ProducerReferralMetricsByEvent`).

### Smoke manual

| # | Caso | Esperado |
|---|------|----------|
| 1 | `/register` — cada perfil | Texto de responsabilidad visible en paso de datos |
| 2 | Legales | Sin duplicar responsabilidad bajo documentos |
| 3 | Referido | Sin promesa de pago garantizado |
| 4 | Hotel | Sin promesa de reservas |
| 5 | Rental | No en wizard; nota en CTA público |
| 6 | Mobile básico | Callouts legibles |

## 7. Pendientes futuros

- Redacción legal profesional centralizada (contenido en `docs/legal/`, publicación admin).
- Migrar avisos hardcoded de referidos/checkout a documentos publicados (fuera de este slice).
- Bloqueos `PORTAL_ACCESS` por vertical cuando producto lo defina.
- Completitud visual onboarding y revisión global de errores/mobile (ítems checklist siguientes).
