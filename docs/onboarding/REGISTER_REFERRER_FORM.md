# Register Referrer Form — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 10 — Referido  
Estado: Implementado

## 1. Resumen

Se pulió el registro **REFERRER** con paso dedicado `RegisterReferrerStep`: solo `displayName`, disclaimer visible sobre comisiones generadas y pagos externos/manuales, flujo legal transaccional en paso separado, y redirección a `/referrer`.

## 2. Alcance Referidos V2

| Aspecto | V2 |
|---|---|
| Propuesta ↔ aceptación ↔ acuerdo ↔ link | Sí (portales productor/referido) |
| Comisión generada por venta atribuida | Sí (referencia; no custodia) |
| Solicitud de pago | Manual / comunicacional |
| Pago efectivo | **Externo** entre productora y referido |
| Custodia / transferencia automática | **No** |
| Datos bancarios o fiscales en signup | **No** |

## 3. Flujo de registro referido

1. **Cuenta** — datos de acceso.
2. **Perfil** — elegir «Referido».
3. **Referido** — nombre público + disclaimer + hint de portal.
4. **Legales** — SIGNUP (`terms_general`, `privacy_policy`).
5. **`POST /auth/register`** + `signIn` → **`/referrer`**.

## 4. Campos signup

| Campo | Requerido en UI | Schema | Persistencia | Observación |
|---|---:|---|---|---|
| `displayName` | ✓ | `referrerProfileSignupSchema` | `ReferrerProfile.displayName` | Nombre público |
| `bio` | — | opcional en schema | perfil | **No** en UI signup |
| `city` | — | opcional en schema | perfil / cuenta | **No** en UI signup |
| Legales SIGNUP | ✓ si publicados | `signupLegalAcceptance` | `UserLegalAcceptance` | |
| `referrer_terms` | — | catálogo | — | **PORTAL_ACCESS**, no signup |

## 5. Datos que quedan para portal

En `/referrer` y flujos productor (`/producer/referrals`):

- Propuestas, aceptación, acuerdos comerciales
- Links de atribución y métricas
- Comisiones generadas (referencia)
- Solicitudes de pago manual (sin ejecución en plataforma)
- Bio, ciudad, visibilidad, avatar (apply/portal)

## 6. Copy / disclaimer

- Card perfil: acuerdos con productoras; links y métricas en portal (sin promesas de cobro automático).
- Disclaimer (ámbar): registra acuerdos/links/comisiones generadas; no administra ni garantiza pagos; liquidación manual externa.
- Bloque informativo: portal post-registro (asociaciones, links, solicitudes).
- **Evitado:** saldo disponible, retiro garantizado, cobro automático, ganancias garantizadas.

## 7. Legal

- Signup: `SIGNUP` general + privacidad vía `signupLegalAcceptance.documentVersionIds`.
- `referrer_terms`: permanece para `PORTAL_ACCESS`; **no** movido a signup en este slice.

## 8. Archivos modificados

- `apps/web/components/auth/register/RegisterReferrerStep.tsx` (nuevo)
- `apps/web/components/auth/register/register-wizard-copy.ts`
- `apps/web/components/auth/RegisterWizard.tsx`
- `packages/shared/src/schemas/profile-onboarding.ts` (comentario)
- `docs/onboarding/REGISTER_REFERRER_FORM.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 9. Verificación

```bash
pnpm --filter @yo-te-invito/shared run build
pnpm --filter api run build
pnpm --filter web run build
```

Error preexistente no relacionado: `ProducerReferralMetricsPanel.tsx`.

### Smoke manual

| # | Caso | Esperado |
|---|------|----------|
| 1 | `/register` → Referido | 4 pasos (Cuenta → Perfil → Referido → Legales) |
| 2 | Campos | Solo nombre público |
| 3 | Sin bancarios/fiscales | No aparecen |
| 4 | Disclaimer | Visible; sin promesa de pago automático |
| 5 | Legales + register | `signupLegalAcceptance` |
| 6 | Redirect | `/referrer` |
| 7 | Rental | No aparece en wizard |
| 8 | Mobile básico | Layout usable |

## 10. Pendientes futuros

- Estado visual de completitud onboarding referido.
- Mensajes de error / validaciones visibles (revisión global).
- UX mobile registro completo (revisión global).
- Publicación `referrer_terms` y bloqueo `PORTAL_ACCESS`.
- Textos de responsabilidad legal centralizados por tipo (contenido legal, no solo UX).
