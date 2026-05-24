# Register Error & Validation UX — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 13 — Errores y validaciones visibles  
Estado: Implementado

## 1. Resumen

Se centralizaron mensajes y mapeo de errores del wizard de registro (`mapRegisterApiError`, `REGISTER_ERROR_MESSAGES`), se mejoró la visualización por campo y global (`RegisterWizardErrorAlert`), foco al primer error (`focusFirstRegisterError`), y validación Zod consistente en todos los pasos de perfil (incl. productora con `producerProfileSignupSchema`).

## 2. Categorías de errores cubiertas

| Categoría | Cobertura |
|---|---|
| Cuenta (nombre, email, password) | Zod client + mensajes en español |
| Perfil / tipo | Solo perfiles V2 en UI (sin Rental) |
| Productora / Gastro / Hotel / Referido | Schemas shared + errores por campo |
| Legales SIGNUP | `validateSignupLegalState` + `LEGAL_SIGNUP_USER_MESSAGES` |
| API (409, 400, 401, 5xx) | `mapRegisterApiError` |
| Red | Mensaje de red dedicado |
| Post-registro legal retry | Paso `legal-retry` + reintento |

## 3. Mensajes definidos

| Caso | Mensaje | Dónde aparece |
|---|---|---|
| Email duplicado | Ya existe una cuenta con este email… | Alert global paso legal / registro |
| Password mismatch | Las contraseñas no coinciden | Campo confirmar contraseña |
| Perfil no permitido | Ese tipo de perfil no está disponible… | API → alert global |
| Legales no aceptados | Para crear tu cuenta necesitás aceptar… | Bloque legal + validación pre-submit |
| Docs no publicados | El registro no está disponible temporalmente… | `canProceed=false` / API |
| Carga legal fallida | No pudimos cargar los documentos legales… | `LegalFlowAcceptanceBlock` + retry |
| Versión legal inválida | Uno de los documentos… ya no está disponible | API → alert |
| Error de red | No pudimos completar el registro… | API / fetch |
| Error genérico | No pudimos crear tu cuenta… | 5xx / fallback |
| Ciudad comprador | Elegí tu ciudad preferida | `PreferredCitySelect` |
| Cuenta creada sin sesión | Tu cuenta fue creada. Iniciá sesión… | Redirect login |

Fuente: `apps/web/lib/auth/register-error-messages.ts`, `packages/shared/src/constants/legal-signup.ts`.

## 4. Validaciones por perfil

| Perfil | Campo | Validación visible |
|---|---|---|
| USER | Ciudad | Select + error bajo label |
| PRODUCER | displayName | Input + schema Zod |
| GASTRO | displayName, contactEmail, province, city, address | Inputs + `gastroProfileSignupSchema` |
| HOTEL | displayName, websiteUrl | Inputs + `hotelProfileSignupSchema` (URL https) |
| REFERRER | displayName | Input + `referrerProfileSignupSchema` |
| Cuenta | firstName, lastName, email, password, confirm | Inputs + `accountSchema` |

## 5. Legal errors

- **Cargando:** botón deshabilitado + loader en bloque legal.
- **Fetch error:** mensaje + botón «Reintentar carga».
- **`canProceed=false`:** mensaje ámbar + lista de documentos faltantes (no bloquea navegación previa del wizard).
- **Checkboxes:** `acceptanceRequired` al submit sin selección.
- **`legal-retry`:** cuenta ya creada; paso dedicado para completar aceptación.

## 6. Backend/API errors

- `409` / `Email already in use` → mensaje email duplicado.
- Códigos `LEGAL_SIGNUP_*` → mensajes de `LEGAL_SIGNUP_USER_MESSAGES`.
- `details[]` Nest/Zod → humanización de paths frecuentes (`profileData`, `location`, `websiteUrl`).
- No se muestran `HTTP 500` ni `Error (400)` crudos al usuario.

## 7. Accesibilidad

- Inputs con `aria-invalid` y `aria-describedby` (componente `Input` / `Select`).
- Errores globales en `RegisterWizardErrorAlert` con `role="alert"` y foco programático.
- Tras validación fallida: foco al primer campo inválido o al resumen de error.
- Botones con estados «Creando cuenta…», «Iniciando sesión…», «Reintentar».

## 8. Archivos modificados

- `apps/web/lib/auth/register-error-messages.ts` (nuevo)
- `apps/web/lib/auth/register-validation.ts` (nuevo)
- `apps/web/components/auth/register/RegisterWizardErrorAlert.tsx` (nuevo)
- `apps/web/components/auth/RegisterWizard.tsx`
- `apps/web/components/auth/register/RegisterBuyerStep.tsx`
- `apps/web/components/me/PreferredCitySelect.tsx`
- `apps/web/components/legal/LegalFlowAcceptanceBlock.tsx`
- `packages/shared/src/constants/legal-signup.ts` (copy `configUnavailable`)
- `docs/onboarding/REGISTER_ERROR_VALIDATION_UX.md`
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
| 1 | Submit cuenta vacía | Errores por campo + foco |
| 2 | Email inválido / password corta / mismatch | Mensajes claros |
| 3 | Email duplicado (409) | Mensaje específico |
| 4 | Perfil sin displayName / gastro sin dirección / hotel URL inválida | Error en input |
| 5 | Legales sin marcar | Mensaje aceptación requerida |
| 6 | `canProceed=false` | Mensaje docs no publicados |
| 7 | Fallo carga legal | Reintentar carga |
| 8 | Mobile | Errores legibles, sin scroll roto |

## 10. Pendientes

- UX mobile registro completo (slice checklist siguiente).
- Tests automatizados E2E de registro con matriz de errores.
- Unificar `getErrorMessage` global con `mapRegisterApiError` en otros flujos fuera de registro (opcional).
