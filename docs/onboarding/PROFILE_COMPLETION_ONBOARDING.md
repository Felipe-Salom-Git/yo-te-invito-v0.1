# Profile Completion Onboarding — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 12 — Completitud/onboarding post-registro  
Estado: Implementado

## 1. Resumen

Se agregó guía visual de **próximos pasos** post-registro en portales (`/me`, `/producer`, `/gastro`, `/hotel`, `/referrer`) mediante componentes reutilizables y funciones de completitud en `apps/web/lib/onboarding/`. El signup sigue pidiendo datos mínimos; el portal indica qué falta sin bloquear el uso general.

## 2. Principio signup vs portal

| Fase | Qué pide | Objetivo |
|---|---|---|
| **Signup** | Mínimo por perfil (`displayName`, etc.) | Crear cuenta y perfil base |
| **Portal** | Checklist de enriquecimiento | Orientar sin obligar |

## 3. Completitud por perfil

| Perfil | Dónde aparece | Pasos (resumen) | CTA principal | Bloqueante |
|---|---|---|---|---:|
| **USER** | `/me` | cuenta, ciudad, intereses, seguidos, notificaciones | Completar preferencias → `/me/preferences` | No |
| **PRODUCER** | `/producer` | cuenta, nombre, imágenes, contacto, descripción, primer evento, legales portal | Completar perfil → `/producer/profile` | No |
| **GASTRO** | `/gastro` | cuenta, datos local, dirección/contacto, contenido, descuentos, valoraciones, legales | Completar perfil → `/gastro/contenido` | No |
| **HOTEL** | `/hotel` | cuenta + ítems ficha (nombre, desc, ubicación, contacto, imágenes, amenities) + legales | Completar ficha → `/hotel/editar` | No |
| **REFERRER** | `/referrer` | cuenta, nombre, perfil visible, links, asociaciones, métricas, legales | Completar perfil → `/referrer/configuracion` | No |
| **RENTAL** | — | No aplica signup V2 | Alta operativa + CTA público (Slice 8) | — |

**Notas:**

- Productora en `/producer/profile` conserva `ProducerProfileCompletenessPanel` (detalle por bloques).
- Hotel reutiliza `getHotelProfileCompleteness` vía `getHotelPortalOnboarding`.
- Términos `PORTAL_ACCESS` pendientes aparecen como ítem informativo; el banner `PortalLegalPendingBanner` sigue siendo la vía de aceptación (sin bloqueo nuevo).

## 4. Componentes reutilizables

| Componente | Rol |
|---|---|
| `OnboardingChecklistCard` | Card con progreso, lista ✓/○, CTA |
| `OnboardingCompletionBadge` | Badge `N/M` |
| `MeOnboardingChecklist` | Wrapper datos comprador |
| `ProducerOnboardingChecklist` | Wrapper productora |
| `GastroOnboardingChecklist` | Wrapper gastro (+ `getMyLocal`) |
| `HotelOnboardingChecklist` | Wrapper hotel |
| `ReferrerOnboardingChecklist` | Wrapper referido |

Calculadores: `apps/web/lib/onboarding/*-portal-onboarding.ts`.

## 5. Riesgos / límites

- Completitud **frontend** (no persistida como score en servidor), salvo reutilización de helpers existentes (hotel/producer).
- Gastro: dirección/contacto requiere fetch de `getMyLocal` además del dashboard.
- USER: “notificaciones configuradas” considera toggles activos en preferencias (heurística liviana).
- REFERRER: “métricas disponibles” se marca listo al tener portal (no exige ventas).
- No se creó portal rental de autogestión.

## 6. Archivos modificados

- `apps/web/lib/onboarding/*`
- `apps/web/components/onboarding/*`
- `apps/web/app/(portal)/me/page.tsx`
- `apps/web/components/producer/dashboard/ProducerDashboardClient.tsx`
- `apps/web/components/gastro/dashboard/GastroDashboardClient.tsx`
- `apps/web/app/(portal)/hotel/page.tsx`
- `apps/web/components/referrer/ReferrerPortalPageClient.tsx`
- `docs/onboarding/PROFILE_COMPLETION_ONBOARDING.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 7. Verificación

```bash
pnpm --filter web run build
```

Error preexistente no relacionado: `ProducerReferralMetricsPanel.tsx`.

### Smoke manual

| Perfil | Ruta | Verificar |
|---|---|---|
| USER | `/me` | Card próximos pasos + CTA preferencias |
| PRODUCER | `/producer` | Checklist + no bloquea KPIs |
| GASTRO | `/gastro` | Checklist + alertas operativas coexisten |
| HOTEL | `/hotel` | Sin promesa reservas; CTA editar |
| REFERRER | `/referrer` | Sin datos bancarios; disclaimer legal intacto |
| RENTAL | `/register` | Sin onboarding rental |

## 8. Pendientes

- Revisión global de mensajes de error en registro (slice checklist siguiente).
- UX mobile registro completo (slice checklist siguiente).
- Score de completitud persistido en backend (si producto lo requiere).
- Bloqueos duros `PORTAL_ACCESS` en acciones sensibles (fuera de este slice).
