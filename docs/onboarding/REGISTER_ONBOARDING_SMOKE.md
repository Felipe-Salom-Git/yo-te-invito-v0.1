# Register Onboarding Smoke — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 14 — QA mobile + accesibilidad  
Estado: Aprobado con observaciones menores

## 1. Resumen

Se revisó el flujo `/register` (wizard unificado) en viewports mobile, tablet y desktop. Se aplicaron ajustes responsive y de accesibilidad (overflow, touch targets legales, progreso, labels, foco). **RENTAL** no aparece en el wizard (Slice 8). El bloque **Registro y onboarding por tipo de usuario** queda cerrado para V2 con la observación de build preexistente en métricas referidos productor.

## 2. Entorno

| Campo | Valor |
|---|---|
| Navegador | Chrome DevTools device mode + revisión de código |
| API / web | `pnpm run -w dev` (puertos habituales 3000 / 3001) |
| Documentos legales SIGNUP | Requieren versiones publicadas en admin para `canProceed=true` |
| Usuario E2E | No ejecutado (`E2E_USER_EMAIL` no requerido para este cierre) |
| Limitaciones | Build producción falla por `ProducerReferralMetricsPanel.tsx` (no registro) |

## 3. Rutas revisadas

- `/register` — wizard principal (todos los perfiles)
- `/register/producer`, `/register/gastro`, `/register/hotel` — redirigen a `/register`
- Post-registro: `/me`, `/producer`, `/gastro`, `/hotel`, `/referrer` (fuera de smoke detallado; cubierto en Slice 12)

## 4. Viewports revisados

| Viewport | Resultado | Observaciones |
|---|---|---|
| 360×740 | OK | Sin scroll horizontal; progreso con scroll fino si labels largos |
| 390×844 | OK | CTAs `min-h-11`; card full width |
| 768×1024 | OK | Grid nombre/apellido en 2 columnas desde `sm` |
| 1366×768 | OK | Card `max-w-lg` centrada |

## 5. Perfiles revisados

| Perfil | Resultado | Observaciones |
|---|---|---|
| USER / Comprador | OK | Ciudad + legales + redirect `/me` |
| PRODUCER | OK | displayName + legales + `/producer` |
| GASTRO | OK | 5 campos + legales + `/gastro` |
| HOTEL | OK | URL https + disclaimer + `/hotel` |
| REFERRER | OK | displayName + responsabilidad pagos externos + `/referrer` |
| RENTAL | N/A | No listado en paso Perfil (decisión Slice 8) |

## 6. Checklist mobile

| Ítem | Resultado | Observaciones |
|---|---|---|
| Sin scroll horizontal | OK | `overflow-x-hidden` / `min-w-0` en shell y pasos |
| Contenido no bajo navbar fijo | OK | `scroll-padding-top` global + padding superior shell |
| CTA principal visible (`min-h-11`) | OK | Botones wizard y legales |
| Inputs full width | OK | `w-full min-w-0` |
| Cards de perfil legibles | OK | `break-words` en títulos/descripciones |
| Textos largos sin romper layout | OK | Callouts responsabilidad + legales |
| Legales legibles | OK | Checkboxes área táctil ampliada |
| Links legales tocables | OK | `min-h-10` en enlace «Leer documento» |
| Progress sin desborde crítico | OK | Scroll horizontal suave en pasos 4 |
| Error global visible | OK | `RegisterWizardErrorAlert` |
| Errores por campo | OK | Bajo inputs / Select |
| Padding inferior (teclado) | OK | `pb-[max(6rem,safe-area)]` en shell |

## 7. Checklist accesibilidad

| Ítem | Resultado | Observaciones |
|---|---|---|
| Labels en inputs | OK | `Input` / `Select` con `<label htmlFor>` |
| Errores asociados | OK | `aria-invalid`, `aria-describedby`, `role="alert"` |
| `aria-current="step"` en progreso | OK | Paso activo en indicador |
| Foco al cambiar paso | OK | `contentRef.focus()` en `useEffect` |
| Foco / scroll al primer error | OK | Slice 13 — `focusFirstRegisterError` |
| Perfil: teclado + nombre accesible | OK | `RegisterProfileStep` + `aria-label` por card |
| Botones con texto claro | OK | Estados submitting documentados |
| Contraste textos secundarios | OK | `text-text-muted` en tema actual |
| Links legales descriptivos | OK | «Leer documento completo (abre en pestaña nueva)» |

## 8. Legales

| Caso | Resultado |
|---|---|
| Carga requirements | OK — loader + retry |
| `canProceed=false` | OK — mensaje ámbar + lista docs faltantes |
| Links a `/legal/...` | OK — nueva pestaña |
| Checkboxes + aceptar todos | OK |
| `signupLegalAcceptance` en register | OK — Slice 4 |
| Paso `legal-retry` | OK — cuenta creada, reintento aceptación |

## 9. Errores (Slice 13)

| Caso | Resultado |
|---|---|
| Campos vacíos / Zod | OK — mensajes en español |
| Email duplicado | OK — mensaje específico |
| Legales sin marcar | OK |
| Red / genérico | OK — `mapRegisterApiError` |

## 10. Hallazgos

| Severidad | Hallazgo | Acción |
|---|---|---|
| Baja | Build `web` falla por tipos en `ProducerReferralMetricsPanel.tsx` | Preexistente; fuera del bloque registro |
| Baja | Progreso 4 pasos: labels truncados en 360px | Aceptado; `title` tooltip + scroll fino |
| Info | Teclado virtual puede tapar CTA en algunos Android | Padding inferior shell mitiga |

## 11. Resultado final

**Aprobado con observaciones menores** — Registro usable en mobile/tablet/desktop; accesibilidad básica cumplida; sin bloqueantes de producto para V2.

## 12. Archivos modificados (Slice 14)

- `apps/web/components/auth/register/RegisterWizardShell.tsx`
- `apps/web/components/auth/register/RegisterWizardProgress.tsx`
- `apps/web/components/auth/register/RegisterProfileStep.tsx` (nuevo)
- `apps/web/components/auth/register/Register*Step.tsx` (min-w-0)
- `apps/web/components/auth/register/RegisterResponsibilityCallout.tsx`
- `apps/web/components/auth/RegisterWizard.tsx`
- `apps/web/components/legal/LegalAcceptanceCheckboxList.tsx`
- `apps/web/components/legal/LegalFlowAcceptanceBlock.tsx`
- `apps/web/components/ui/Select.tsx`
- `docs/onboarding/REGISTER_ONBOARDING_SMOKE.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`
