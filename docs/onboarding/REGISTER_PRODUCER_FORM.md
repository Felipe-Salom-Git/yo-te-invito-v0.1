# Register Producer Form — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 6 — Productora / productor  
Estado: Implementado

## 1. Resumen

Se pulió el registro **PRODUCER** con el mismo patrón de 4 pasos que el comprador:

- Paso dedicado `RegisterProducerStep` (solo `displayName`).
- Copy de card, ayuda y responsabilidad UX (no legal).
- Legales en paso separado con register transaccional.
- Redirect a `/producer` tras alta.

No se duplica `/producer/profile` ni se piden imágenes, redes, slug ni descripción extensa en signup.

## 2. Flujo de registro productor

1. **Cuenta** — nombre, apellido, email, contraseña.
2. **Perfil** — elegir «Productora».
3. **Productora** — `displayName` + bloques informativos.
4. **Legales** — SIGNUP (`canProceed`, checkboxes, `signupLegalAcceptance`).
5. **`POST /auth/register`** — user + `ProducerProfile` + aceptaciones en transacción.
6. **`signIn`** — credenciales.
7. **Redirect** — `/producer` (sin `?welcome=1`; no existe en home productor).

## 3. Campos de signup

| Campo | Requerido | Schema | Persistencia | Observación |
|---|---:|---|---|---|
| `firstName` | ✓ | `authRegisterRequestSchema` | `User.firstName` | Paso cuenta |
| `lastName` | ✓ | idem | `User.lastName` | Paso cuenta |
| `email` | ✓ | idem | `User.email` | Paso cuenta |
| `password` | ✓ | idem | `User.passwordHash` | Paso cuenta |
| `displayName` | ✓ | `producerProfileSignupSchema` | `ProducerProfile.displayName` | Único campo perfil en signup |
| `city` | — | opcional en schema | `User.preferences` / perfil | **No** en UI signup |
| `description` | — | opcional en schema | perfil | **No** en UI signup |
| Legales SIGNUP | ✓ si publicados | `signupLegalAcceptance` | `UserLegalAcceptance` | Transaccional |

## 4. Datos enviados al portal

Completar después en `/producer/profile` (y secciones del portal):

- Descripción corta/larga, imágenes, logo, banner
- Redes y contacto público
- Slug manual, ubicación fina
- Datos comerciales extendidos
- Términos verticales `PORTAL_ACCESS` (banner portal, no signup)

## 5. Copy y responsabilidad UX

- Card perfil: *«Publicá eventos, gestioná entradas, revisá métricas y administrá tu perfil comercial.»*
- Paso productora: título, hint del nombre, placeholder «Horizonte Producciones».
- Bloque portal: completar perfil y crear eventos después del registro.
- Responsabilidad: información publicada sobre eventos, precios y disponibilidad (aclara UX, no reemplaza términos).

## 6. Legal

- Requirements `SIGNUP` con `canProceed` / `missingRequiredDocuments`.
- Submit envía `signupLegalAcceptance.documentVersionIds`.
- Sin `POST /me/legal/accept` en flujo feliz.
- `legal-retry` compartido con otros perfiles si aplica.
- Términos de productora siguen en `PORTAL_ACCESS`.

## 7. Archivos modificados

- `apps/web/components/auth/register/RegisterProducerStep.tsx` (nuevo)
- `apps/web/components/auth/register/register-wizard-copy.ts`
- `apps/web/components/auth/RegisterWizard.tsx`
- `packages/shared/src/schemas/profile-onboarding.ts` (comentario)
- `docs/onboarding/REGISTER_PRODUCER_FORM.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 8. Verificación

```bash
pnpm --filter @yo-te-invito/shared run build
pnpm --filter api run build
pnpm --filter web run build   # falla preexistente ProducerReferralMetricsPanel.tsx
```

### Smoke manual (entorno local)

| # | Caso | Esperado |
|---|------|----------|
| 1 | `/register` → Productora | 4 pasos en progreso |
| 2 | Solo `displayName` en paso productora | Sin ciudad ni descripción |
| 3 | Legales | Carga, bloqueo `!canProceed`, checkboxes |
| 4 | Register | Body con `profileData.displayName` + `signupLegalAcceptance` |
| 5 | Post-registro | signIn → `/producer` |
| 6 | Sin Rental | ✓ |

## 9. Pendientes

- Pulido GASTRO / HOTEL / REFERRER (slices siguientes).
- Textos legales definitivos y responsabilidad por perfil (contenido).
- Completitud visual onboarding en portal.
- QA mobile final del registro completo.
