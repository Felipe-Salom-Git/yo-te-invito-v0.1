# Register Buyer Wizard Base — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 5 — Wizard base + comprador  
Estado: Implementado

## 1. Resumen

Se pulió la base del wizard en `/register` y el flujo **USER / comprador**:

- Shell reutilizable con progreso, copy y layout mobile-first (`pb-24`, `min-h-11` en CTAs).
- Pasos separados: cuenta → perfil → datos comprador → legales → registro transaccional.
- Integración Slice 4: `canProceed`, `missingRequiredDocuments`, `signupLegalAcceptance`, `legal-retry`.
- Ciudad preferida en paso comprador (persiste en `User.preferences`).
- Sin intereses en signup (quedan en `/me/preferences`).

## 2. Flujo actual USER

1. **Cuenta** — nombre, apellido, email, contraseña, confirmación.
2. **Perfil** — elegir «Comprador».
3. **Tus datos** — resumen de cuenta + ciudad preferida.
4. **Legales** — checkboxes SIGNUP; bloqueo si `!canProceed` o carga pendiente.
5. **`POST /auth/register`** — con `signupLegalAcceptance.documentVersionIds` cuando hay docs requeridos.
6. **`signIn`** — credenciales (estado UI «Iniciando sesión…»).
7. **Redirect** — `/me` si no hay pendientes legales; si hay, paso `legal-retry`.

## 3. Campos comprador

| Campo | Requerido | Dónde se valida | Persistencia | Observación |
|---|---:|---|---|---|
| `firstName` | ✓ | Zod paso cuenta + API | `User.firstName` | |
| `lastName` | ✓ | Zod paso cuenta + API | `User.lastName` | |
| `email` | ✓ | Zod + API único tenant | `User.email` | Mensaje amigable si conflicto |
| `password` | ✓ | Zod min 6 + API | `User.passwordHash` | |
| `confirmPassword` | ✓ (UI) | Zod refine | — | No se envía al API |
| `city` | ✓ (recom.) | UI paso comprador | `User.preferences` | Default UI Bariloche |
| `profileType` | ✓ | implícito USER | body register | |
| Legales SIGNUP | ✓ si publicados | `validateSignupLegalState` + API transaccional | `UserLegalAcceptance` | |
| `favoriteCategories` | — | — | `/me/preferences` | Fuera de signup |
| `favoriteSubcategoryIds` | — | — | `/me/preferences` | Fuera de signup |

## 4. Integración legal

- **`canProceed`**: deshabilita submit y muestra listado de docs faltantes sin publicar.
- **`missingRequiredDocuments`**: títulos en UI cuando `configBlocked`.
- **`signupLegalAcceptance.documentVersionIds`**: enviado en register; no `POST /me/legal/accept` en flujo feliz.
- **`legal-retry`**: solo si tras login quedan pendientes SIGNUP (legacy / edge).

## 5. Estados de UI

| Estado | Comportamiento | Mensaje |
|---|---|---|
| Carga legal | Loader, submit off | «Cargando documentos legales…» |
| Config bloqueada | Sin checkboxes, submit off | `LEGAL_SIGNUP_USER_MESSAGES.configUnavailable` + lista docs |
| Error red legal | Reintentar carga | `LEGAL_SIGNUP_USER_MESSAGES.loadError` |
| Falta aceptación | Error en bloque | `LEGAL_SIGNUP_USER_MESSAGES.acceptanceRequired` |
| Registrando | CTA deshabilitado | «Creando cuenta…» |
| Sign-in | CTA deshabilitado | «Iniciando sesión…» |
| Email duplicado | Error global | «Este email ya está registrado…» |
| Retry legal | Paso dedicado | `acceptFailedPostRegister` + botón reintentar |
| Éxito | Redirect `/me` | Sin pantalla success intermedia |

## 6. Mobile / accessibility notes

**Revisado**

- Padding `px-4`, `pb-24` para no tapar CTA con chrome del navegador.
- Grid nombre/apellido `grid-cols-1 sm:grid-cols-2`.
- Botones `min-h-11`, cards perfil con `focus-visible`.
- `aria-label` en progreso, `aria-current="step"`, `role="alert"` en errores.
- Labels en `Input` con `aria-invalid` / `aria-describedby`.
- Checkboxes legales con links `target="_blank"` y área táctil amplia.

**Pendiente (otros slices)**

- QA mobile real en dispositivos.
- Pulido formularios comerciales.
- Completitud onboarding visual.
- Copy responsabilidad por perfil.

## 7. Archivos modificados

- `apps/web/components/auth/RegisterWizard.tsx`
- `apps/web/components/auth/register/register-wizard-copy.ts`
- `apps/web/components/auth/register/RegisterWizardProgress.tsx`
- `apps/web/components/auth/register/RegisterWizardShell.tsx`
- `apps/web/components/auth/register/RegisterBuyerStep.tsx`
- `apps/web/components/legal/LegalFlowAcceptanceBlock.tsx`
- `docs/onboarding/REGISTER_BUYER_WIZARD_BASE.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 8. Verificación

```bash
pnpm --filter @yo-te-invito/shared run build   # OK (sin cambios de schema en slice)
pnpm --filter api run build                    # OK (sin cambios API en slice)
pnpm --filter web run build                    # Falla preexistente: ProducerReferralMetricsPanel.tsx (no relacionado)
```

No hay tests E2E dedicados a register; smoke manual documentado abajo.

### Smoke manual (pendiente ejecución en entorno local)

| # | Caso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir `/register` | Wizard con progreso y copy nuevo |
| 2 | Elegir Comprador | 4 pasos en indicador |
| 3 | Completar cuenta + ciudad | Avanza a legales |
| 4 | Legales cargando | Submit off |
| 5 | Sin aceptar términos | No registra |
| 6 | `canProceed=false` | Bloqueo + lista docs |
| 7 | Register OK | Request con `signupLegalAcceptance` |
| 8 | Post-registro | Aceptación en DB con versión/fecha |
| 9 | Sign-in + redirect | `/me` |
| 10 | Sin Rental en lista | ✓ |
| 11 | Mobile viewport | Sin scroll horizontal, CTAs tocables |

## 9. Riesgos pendientes

- Formularios PRODUCER / GASTRO / HOTEL / REFERRER sin pulir (solo se mantuvieron funcionales).
- Copy de responsabilidad por perfil pendiente de contenido legal.
- Estado visual de completitud onboarding no implementado.
- Revisión global de errores y UX mobile final.
- Checkout / `PORTAL_ACCESS` sin cambios en este slice.
