# Register Gastro Form — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 7 — Gastronómico  
Estado: Implementado

## 1. Resumen

Se pulió el registro **GASTRO** con paso dedicado `RegisterGastroStep` (4 pasos: cuenta → perfil → local → legales), validación con `gastroProfileSignupSchema`, sin lat/lng ni campos de portal en signup. Se alineó copy y campos mínimos en `/cuenta/solicitar-gastro`.

## 2. Flujo de registro gastronómico

1. **Cuenta** — datos de acceso.
2. **Perfil** — elegir «Gastronómico».
3. **Local** — `displayName`, `contactEmail`, `location` (provincia, ciudad, dirección).
4. **Legales** — SIGNUP transaccional.
5. **`POST /auth/register`** + `signIn` → **`/gastro`**.

## 3. Campos de signup

| Campo | Requerido | Schema | Persistencia | Observación |
|---|---:|---|---|---|
| `displayName` | ✓ | `gastroProfileSignupSchema` | `GastroProfile.displayName` | |
| `contactEmail` | ✓ | idem | `GastroProfile.contactEmail` | Default email de cuenta |
| `location.province` | ✓ | `gastroProfileLocationSchema` | `province` | Sin lat/lng |
| `location.city` | ✓ | idem | `city` + `User.preferences` vía `account.city` |
| `location.address` | ✓ | idem | `address` | Mapa en portal |
| `summary` | — | opcional en schema | — | **No** en UI signup |
| Legales SIGNUP | ✓ si publicados | `signupLegalAcceptance` | `UserLegalAcceptance` | |

## 4. Datos que quedan para portal

- Coordenadas / mapa (`geoLat`, `geoLng`)
- Horarios de apertura
- Imágenes, galería, logo
- Descuentos y QR
- Contenido editorial
- Redes y contacto extendido
- Validaciones admin de descuentos

Edición completa: `gastroLocalCreateSchema` y flujos en `/gastro`.

## 5. Register vs solicitar-gastro

| Aspecto | `/register` (GASTRO) | `/cuenta/solicitar-gastro` |
|---|---|---|
| Campos mínimos | ✓ mismos 5 campos | ✓ mismos 5 campos |
| Validación | `gastroProfileSignupSchema` | `gastroProfileApplySchema` (incluye opcionales) |
| `summary` / `legalName` | No en UI | Opcionales en `<details>` |
| lat/lng | No | No |
| Copy | `REGISTER_WIZARD_COPY.gastro` | Mismo copy base |

## 6. Legal

- `canProceed`, `missingRequiredDocuments`, bloqueo de submit.
- `signupLegalAcceptance.documentVersionIds` en register.
- Sin `POST /me/legal/accept` en flujo feliz.
- Términos gastro específicos siguen en `PORTAL_ACCESS`.

## 7. Copy y responsabilidad UX

- Card: *«Mostrá tu local, publicá contenido, ofrecé descuentos y recibí valoraciones de clientes.»*
- Hint mapa: completar ubicación precisa en portal.
- Bloque portal + responsabilidad sobre info, promos y descuentos.

## 8. Archivos modificados

- `apps/web/components/auth/register/RegisterGastroStep.tsx` (nuevo)
- `apps/web/components/auth/register/register-wizard-copy.ts`
- `apps/web/components/auth/RegisterWizard.tsx`
- `apps/web/app/(portal)/cuenta/solicitar-gastro/page.tsx`
- `docs/onboarding/REGISTER_GASTRO_FORM.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 9. Verificación

```bash
pnpm --filter @yo-te-invito/shared run build
pnpm --filter api run build
pnpm --filter web run build   # error preexistente ProducerReferralMetricsPanel.tsx
```

### Smoke manual

| # | Caso | Esperado |
|---|------|----------|
| 1 | Register → Gastronómico | 4 pasos, sin resumen |
| 2 | Campos | displayName, contactEmail, provincia, ciudad, dirección |
| 3 | Sin lat/lng / horarios / imágenes | ✓ |
| 4 | Legales + register | `signupLegalAcceptance` |
| 5 | Redirect | `/gastro` |
| 6 | solicitar-gastro | Mismos campos mínimos + opcionales colapsados |

## 10. Pendientes

- Pulido HOTEL / REFERRER (slices siguientes).
- Textos legales definitivos por perfil.
- Completitud visual onboarding.
- QA mobile final.
