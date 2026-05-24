# Register Form Fixes — Email duplicado y ubicación hotel

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 12.5 — Fixes registro  
Estado: Implementado

## 1. Resumen

Se corrigieron dos observaciones del QA manual de formularios de registro:

1. **Email duplicado:** el backend rechaza el registro con código estable `EMAIL_ALREADY_EXISTS` (409) y el wizard muestra un mensaje claro en español en el campo email, con enlace a `/login`, sin avanzar ni ejecutar `signIn` ni aceptación legal.
2. **Hotel — ubicación:** el paso hotel usa selects de provincia y ciudad dependiente (catálogo `ARGENTINA_PROVINCES` en `@yo-te-invito/shared`), validado con `hotelProfileSignupSchema.location` y persistido en `HotelProfile.city` / `address` (etiquetas legibles).

## 2. Email duplicado

### Comportamiento anterior

- Backend: `409` con `code: CONFLICT` y mensaje en inglés `Email already in use`.
- Frontend: mensaje mapeado a español, pero como error global del paso legal; no en el campo email.

### Comportamiento nuevo

- Backend: `409 Conflict` con `code: EMAIL_ALREADY_EXISTS` y mensaje `Ya existe una cuenta con este email.`
- Frontend: al fallar `POST /auth/register`, vuelve al paso **Cuenta**, muestra en el campo email:
  - `Ya existe una cuenta con este email. Iniciá sesión o usá otro correo.`
  - enlace **Iniciar sesión** → `/login`
- No se llama a `signIn` ni se registra aceptación legal si el register falla.

### Status/code backend

| Campo | Valor |
|-------|--------|
| HTTP | 409 |
| `code` | `EMAIL_ALREADY_EXISTS` |
| `message` | `Ya existe una cuenta con este email.` |

### Mensaje frontend

`REGISTER_ERROR_MESSAGES.emailDuplicate` en `apps/web/lib/auth/register-error-messages.ts`, con detección vía `isRegisterEmailDuplicateError`.

## 3. Hotel provincia/ciudad

### Campos agregados (signup)

| Campo UI | Schema | Persistencia |
|----------|--------|----------------|
| Provincia (select) | `location.province` (slug) | `HotelProfile.address` (label provincia) |
| Ciudad (select) | `location.city` (slug) | `HotelProfile.city` (label ciudad) |
| Nombre | `displayName` | `displayName` |
| Sitio web | `websiteUrl` | `websiteUrl` |

### Fuente de catálogo

- `packages/shared/src/location/argentina-locations.ts` (reexportado en web desde `@yo-te-invito/shared`)
- UI: `ProvinceCitySelect` en `RegisterHotelStep`

### Comportamiento dependiente

- Al cambiar provincia, la ciudad se resetea (`applyProvinceToLocationValue`).
- Sin provincia: ciudad deshabilitada + hint «Seleccioná una provincia para elegir ciudad».
- Provincia sin ciudades en catálogo: hint «Todavía no hay ciudades disponibles para esta provincia».

### Persistencia

`hotelProfileToPersistInput` (shared) resuelve slugs a etiquetas antes de `createHotelActive`.

## 4. Archivos modificados

| Área | Archivos |
|------|----------|
| Shared | `packages/shared/src/schemas/profile-onboarding.ts`, `location/*`, `constants/auth-register.ts`, `enums/error-codes.ts`, `index.ts` |
| API | `apps/api/src/auth/auth.service.ts`, `profile-registration.service.ts` |
| Web | `RegisterWizard.tsx`, `RegisterHotelStep.tsx`, `register-error-messages.ts`, `ProvinceCitySelect.tsx`, `register-wizard-copy.ts`, `argentina-locations.ts` (reexport) |
| Docs | este archivo, `CONTEXT_PENDIENTES.md`, checklist V2 |

## 5. Verificación

```bash
pnpm --filter @yo-te-invito/shared run build
pnpm --filter api run build
pnpm --filter web run build
```

Smoke manual (ver spec del slice):

- Email duplicado en paso legal → vuelve a cuenta, mensaje en email, sin signIn.
- Hotel: provincia/ciudad, reset al cambiar provincia, submit → `/hotel`.

## 6. Pendientes

- Gastro signup sigue con inputs de texto para provincia/ciudad (no forma parte de 12.5).
- `web build` puede fallar por `ProducerReferralMetricsPanel.tsx` (preexistente, no relacionado).
- Redacción legal publicada por vertical sigue pendiente (fuera de este slice).
