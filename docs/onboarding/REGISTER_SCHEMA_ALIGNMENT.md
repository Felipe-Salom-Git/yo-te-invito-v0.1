# Register Schema Alignment — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 3 — Unificación de schemas register/apply  
Estado: Implementado

Referencias: [`PROFILE_FIELDS_MATRIX.md`](./PROFILE_FIELDS_MATRIX.md), [`REGISTER_ONBOARDING_AUDIT.md`](../audits/REGISTER_ONBOARDING_AUDIT.md).

---

## 1. Resumen

Se centralizó la validación de `profileData` en **`packages/shared/src/schemas/profile-onboarding.ts`**, con schemas **base → signup → apply** por perfil comercial.

- `POST /auth/register` valida `profileData` con **signup schemas** vía `authRegisterRequestSchema.superRefine` + `parseProfileSignupData`.
- `POST /profiles/*/apply` valida con **apply schemas** (misma base, campos extendidos opcionales).
- **GASTRO:** register y apply comparten `gastroProfileBaseSchema` / `gastroProfileToPersistInput`; misma persistencia en `ProfileRegistrationService`.
- **RENTAL:** sigue **fuera** de `registrationProfileTypeSchema` (V2).
- Frontend: ajuste mínimo en `RegisterWizard` (sin lat/lng en signup gastro) y `/cuenta/solicitar-gastro` alineado al mismo payload.

---

## 2. Fuente de verdad

| Archivo | Contenido |
|---------|-----------|
| `packages/shared/src/schemas/profile-onboarding.ts` | Schemas base/signup/apply, parsers, `registrationProfileTypeSchema` |
| `packages/shared/src/schemas/user.schema.ts` | `authRegisterRequestSchema` + re-exports legacy (`profileGastroApplySchema`, etc.) |
| `packages/shared/src/schemas/gastro-locations.ts` | `gastroLocalCreateSchema` — **solo portal** edición completa (`POST /gastro/...`) |

---

## 3. Schemas por perfil

| Perfil | Signup schema | Apply schema | Base schema | Campos requeridos signup | Campos requeridos apply | Observaciones |
|--------|---------------|--------------|-------------|--------------------------|-------------------------|---------------|
| **USER** | — | — | — | cuenta (fuera de `profileData`) | — | `profileData` prohibido |
| **PRODUCER** | `producerProfileSignupSchema` | `producerProfileApplySchema` | `producerProfileBaseSchema` | `displayName` | `displayName` (+ opcionales base) | Apply ⊇ signup |
| **GASTRO** | `gastroProfileSignupSchema` | `gastroProfileApplySchema` | `gastroProfileBaseSchema` | `displayName`, `contactEmail`, `location.{province,city,address}` | Igual + `legalName?`, `contactPhone?` | `lat`/`lng` opcionales; persist sin geo si faltan |
| **HOTEL** | `hotelProfileSignupSchema` | `hotelProfileApplySchema` | `hotelProfileBaseSchema` | `displayName`, `websiteUrl` (https) | Igual + campos hotel extendidos | Signup subset de apply |
| **REFERRER** | `referrerProfileSignupSchema` | `referrerProfileApplySchema` | `referrerProfileBaseSchema` | `displayName` | `displayName` (+ bio, avatar, etc.) | Slug en servidor |
| **RENTAL** | — | — | — | N/A V2 | N/A | Admin-only |

---

## 4. Cambios en auth/register

- `registrationProfileTypeSchema` movido a `profile-onboarding.ts` (re-export en `user.schema.ts`).
- `authRegisterRequestSchema` añade `.superRefine`:
  - `validateAuthRegisterProfilePayload` / `parseProfileSignupData`
  - `profileData` obligatorio si `profileType !== 'USER'`
- `ProfileRegistrationService.createProfileForRegistration` usa `parseProfileSignupData` y switch discriminado por `profileType`.
- Rechazo explícito de tipos no comerciales (incl. futuro `RENTAL` si se agregara al enum sin implementar).

---

## 5. Cambios en profile apply

| Endpoint | Schema pipe | Persistencia |
|----------|-------------|--------------|
| `POST /profiles/producer/apply` | `producerProfileApplySchema` | `ProfileRegistrationService.createProducerFromApply` |
| `POST /profiles/gastro/apply` | `gastroProfileApplySchema` | `createGastroFromApply` → `gastroProfileToPersistInput` |
| `POST /profiles/hotel/apply` | `hotelProfileApplySchema` | `createHotelFromApply` |
| `POST /profiles/referrer/apply` | `referrerProfileApplySchema` | `createReferrerFromApply` (pending + nuevo) |

`ProfilesService` delega en `ProfileRegistrationService` (sin duplicar lógica Prisma). `ProfilesModule` importa `AuthModule`.

---

## 6. Decisión Rental

- **No** está en `registrationProfileTypeSchema`.
- **No** se acepta en signup V2.
- Operación rental: **admin** (`RentalLocation`, productos).
- `rental_terms` reservado para futuro `PORTAL_ACCESS` con perfil `RENTAL`.

---

## 7. Riesgos resueltos

| Riesgo | Estado |
|--------|--------|
| GASTRO register vs apply schemas distintos | Resuelto — misma base + `gastroProfileToPersistInput` |
| Apply gastro sin `contactEmail` / dirección | Resuelto — apply exige mismos mínimos |
| Validación `profileData: unknown` sin control | Resuelto — superRefine + parse en service |
| Duplicación Prisma create en ProfilesService | Resuelto — delegación a `ProfileRegistrationService` |
| Lat/lng obligatorios falsos en signup gastro | Resuelto — opcionales; UI sin campos lat/lng |

---

## 8. Riesgos pendientes

- Hardening legal post-signup (usuario creado si falla accept).
- Bypass signup si no hay documentos publicados.
- Pulido visual wizard / copy por perfil.
- `hotel` signup: URL debe incluir `http(s)://` (sin normalizador en register).
- Tests automatizados dedicados a register/apply (no existían; pendiente).
- Deprecar aliases `profile*ApplySchema` en favor de nombres `*ProfileApplySchema`.
- Unificar `/cuenta/solicitar-productor` con mismos mínimos (apply ya acepta subset).

---

## 9. Archivos modificados

| Archivo |
|---------|
| `packages/shared/src/schemas/profile-onboarding.ts` *(nuevo)* |
| `packages/shared/src/schemas/user.schema.ts` |
| `packages/shared/src/index.ts` |
| `apps/api/src/auth/profile-registration.service.ts` |
| `apps/api/src/modules/profiles/profiles.service.ts` |
| `apps/api/src/modules/profiles/profiles.controller.ts` |
| `apps/api/src/modules/profiles/profiles.module.ts` |
| `apps/web/components/auth/RegisterWizard.tsx` |
| `apps/web/app/(portal)/cuenta/solicitar-gastro/page.tsx` |
| `apps/web/repositories/interfaces.ts` |
| `docs/onboarding/REGISTER_SCHEMA_ALIGNMENT.md` *(este archivo)* |
| `docs/context/CONTEXT_PENDIENTES.md` |
| `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` |

---

## 10. Verificación

### Comandos ejecutados

```bash
pnpm --filter @yo-te-invito/shared run build   # OK
pnpm --filter api run build                    # OK
pnpm --filter api run test:legal-documents     # (ejecutar con API en marcha si aplica)
pnpm --filter api run test:me-legal-acceptance
```

### Web

```bash
cd apps/web && npx tsc --noEmit
```

Errores **preexistentes** no relacionados con este slice (referidos metrics, push types). No se corrigieron en Slice 3.

### Tests auth/register

No hay suite unitaria dedicada; pendiente slice QA.

---

## Smoke manual mínimo (revisión de código)

| # | Caso | Esperado |
|---|------|----------|
| 1 | Register USER sin `profileData` | OK |
| 2 | Register PRODUCER sin `displayName` | 400 VALIDATION_FAILED |
| 3 | Register GASTRO sin `contactEmail` o dirección | 400 |
| 4 | Register GASTRO sin lat/lng | OK (`geoLat`/`geoLng` null) |
| 5 | Register HOTEL sin `websiteUrl` https | 400 |
| 6 | Register REFERRER solo `displayName` | OK |
| 7 | `profileType: RENTAL` | No válido en enum |
| 8 | `/cuenta/solicitar-gastro` con provincia/ciudad/dirección | Mismo contrato que register |
| 9 | Legales SIGNUP post-register | Sin cambios en este slice |
| 10 | Redirect post-registro | Sin cambios |

---

## Smoke futuro derivado de la matriz

Ver [`PROFILE_FIELDS_MATRIX.md`](./PROFILE_FIELDS_MATRIX.md) § Smoke futuro.
