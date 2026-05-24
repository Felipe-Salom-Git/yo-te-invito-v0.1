# Legal Signup Hardening — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 4 — Hardening legal signup  
Estado: Implementado

## 1. Resumen

Se cerró el riesgo de registro en estado legal ambiguo:

- **Bypass silencioso** cuando el catálogo exige documentos `SIGNUP` pero no hay versión `PUBLISHED`.
- **Usuario creado sin trazabilidad** si fallaba `POST /me/legal/accept` después de `POST /auth/register`.

Solución **híbrida (Opción 3)**:

1. Aceptación `SIGNUP` en la **misma transacción** que la creación de usuario (`signupLegalAcceptance` en register).
2. **Retry** en frontend si, tras registro exitoso, persisten pendientes `SIGNUP` (usuarios legacy o edge cases).

## 2. Flujo anterior

1. `RegisterWizard` → `POST /auth/register` (solo usuario + perfil).
2. `signIn` (NextAuth).
3. Si había checkboxes marcados → `POST /me/legal/accept`.

Riesgos:

- Sin documentos publicados, `required=[]` y `allLegalItemsSelected` devolvía `true` → registro sin checkboxes.
- Si el paso 3 fallaba, el usuario ya existía sin `UserLegalAcceptance`.

## 3. Flujo nuevo

1. En paso legal del wizard: `GET /public/legal/requirements?context=SIGNUP&profileType=…`.
2. Si `canProceed === false` → mensaje de configuración, submit bloqueado.
3. Si `required.length > 0` → checkboxes obligatorios; submit bloqueado hasta selección completa.
4. `POST /auth/register` con `signupLegalAcceptance.documentVersionIds` (cuando aplica).
5. Backend: valida requirements + versiones; en **una transacción** crea user, perfil y `UserLegalAcceptance` (`context: SIGNUP`, IP/UA).
6. `signIn`.
7. Verificación defensiva: `GET /me/legal/requirements?context=SIGNUP` — si queda `pending`, pantalla **legal-retry** + `POST /me/legal/accept`.

## 4. Comportamiento si faltan documentos publicados

`GET /public/legal/requirements` devuelve:

| Campo | Significado |
|---|---|
| `catalogRequiredCount` | Documentos del catálogo con `isRequiredForSignup` aplicables al perfil |
| `required` | Solo versiones `PUBLISHED`, `PUBLIC`, activas |
| `missingRequiredDocuments` | Claves requeridas sin versión publicada (`reason: NO_PUBLISHED_VERSION`) |
| `canProceed` | `false` si hay faltantes sin publicar |

Mensaje UI: *«El registro no está disponible temporalmente porque los documentos legales requeridos aún no fueron publicados…»*

No se publican drafts automáticamente; no se aceptan documentos `INTERNAL` ni no publicados.

## 5. Comportamiento si falla aceptación

| Escenario | Comportamiento |
|---|---|
| Validación legal en register | **Rollback** — no se crea usuario |
| Register OK + pendientes tras login | Pantalla **legal-retry**, botón reintentar `POST /me/legal/accept` |
| IDs de versión inválidos/obsoletos | 400 con mensaje de documento actualizado |

## 6. Contratos/API afectados

| Endpoint | Cambio | Compatibilidad | Observaciones |
|---|---|---|---|
| `GET /public/legal/requirements` | +`canProceed`, `missingRequiredDocuments`, `catalogRequiredCount` | Compatible (campos nuevos) | Consumidores antiguos ignoran flags |
| `POST /auth/register` | +`signupLegalAcceptance?` | Compatible (campo opcional) | Obligatorio cuando `required.length > 0` |
| `POST /me/legal/accept` | Sin cambio | — | Retry / legacy |

## 7. Frontend UX

| Estado | UX |
|---|---|
| loading | Loader «Cargando documentos legales…», submit deshabilitado |
| missing published | Banner ámbar, submit bloqueado |
| legal fetch error | Mensaje + «Reintentar carga» |
| acceptance required | Error en bloque legal |
| accept failed (retry) | Paso `legal-retry` + reintentar |
| success | Redirect al portal del perfil |

## 8. Seguridad y trazabilidad

- Solo documentos `visibility: PUBLIC`, `isActive: true`, versión `PUBLISHED`.
- Aceptación por `documentVersionId` + `context: SIGNUP`.
- `acceptedAt` en `UserLegalAcceptance` (default Prisma).
- `ipAddress` / `userAgent` en register transaccional.
- Aislamiento por `tenantId` en validación.

## 9. Riesgos resueltos

- Registro sin checkboxes cuando faltaban docs publicados requeridos.
- Usuario nuevo sin aceptación si fallaba accept post-signup (flujo principal).
- IDs de versión no alineados con requirements actuales en register.

## 10. Riesgos pendientes

- Términos solo `PORTAL_ACCESS` siguen sin bloqueo duro en signup (decisión de producto).
- `CHECKOUT` guest/autenticado: no se endureció `canProceed` en UI (mismo patrón API disponible).
- Contenido legal real pendiente de publicación en admin.
- QA mobile registro completo.
- Pulido visual de formularios por perfil.

## 11. Archivos modificados

**Shared**

- `packages/shared/src/constants/legal-signup.ts`
- `packages/shared/src/schemas/me-legal.ts`
- `packages/shared/src/schemas/user.schema.ts`
- `packages/shared/src/index.ts`

**API**

- `apps/api/src/modules/legal/legal-requirements.util.ts`
- `apps/api/src/modules/legal/legal-signup.service.ts`
- `apps/api/src/modules/legal/legal-documents.service.ts`
- `apps/api/src/modules/legal/legal.module.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.module.ts`

**Web**

- `apps/web/lib/legal/legal-acceptance-validation.ts`
- `apps/web/components/auth/RegisterWizard.tsx`
- `apps/web/components/legal/LegalFlowAcceptanceBlock.tsx`

**Docs**

- `docs/onboarding/LEGAL_SIGNUP_HARDENING.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 12. Verificación

Comandos sugeridos:

```bash
pnpm --filter @yo-te-invito/shared run build
pnpm --filter api run build
pnpm --filter web run build
pnpm --filter api run test:legal-documents   # requiere API + DEV_AUTH_ENABLED
pnpm --filter api run test:me-legal-acceptance
```

Smoke manual mínimo: ver checklist de aceptación del slice (registro bloqueado sin docs publicados; aceptación con versión y fecha; retry; perfiles USER/PRODUCER/GASTRO/HOTEL/REFERRER; sin RENTAL).
