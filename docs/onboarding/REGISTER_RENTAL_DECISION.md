# Register Rental Decision — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 8 — Rental / proveedor de equipos  
Estado: Implementado

## 1. Resumen

El ítem de checklist «Pulir formulario de registro para rental / proveedor de equipos» queda resuelto **sin** agregar `RENTAL` al wizard: decisión de producto V2 (Opción B), flujo operativo documentado vía admin, y CTA público de contacto institucional.

## 2. Decisión V2

**Opción B — Sin signup rental**

| Aspecto | V2 |
|---|---|
| Wizard `/register` | Sin perfil Rental |
| Alta de comercio | Admin (`RentalLocation` + productos) |
| Intake comercial | Contacto institucional (footer / mailto) |
| Portal proveedor | No existe `/rental` |
| Membership | No existe `UserRentalMembership` |

## 3. Motivos

- No hay modelo de membership ni portal comercial rental.
- El vertical público ya funciona con fichas y catálogo; la operación es back-office.
- `rental_terms` en catálogo legal está pensado para futuro `PORTAL_ACCESS`, no para signup.
- Agregar registro self-service implicaría Prisma, permisos, QA y legal sin diseño cerrado.

## 4. Flujo operativo actual (admin)

1. Admin entra a `/admin/rentals`.
2. **Crear local** (`/admin/rentals/locales/nuevo`): nombre, dirección, WhatsApp, horarios, imágenes de cabecera/galería, subcategoría.
3. **Productos** por local: alta/edición, galería, ficha pública en `/rentals/[id]`.
4. Usuario final consulta disponibilidad vía WhatsApp del local (cuando está configurado).

No se modificó el CRUD admin en este slice; solo copy de contexto en listado admin.

## 5. Copy público agregado/modificado

| Ubicación | Cambio |
|---|---|
| `lib/rentals/publicCopy.ts` | `RENTAL_NOT_ACCOMMODATION_NOTE`, textos CTA proveedor |
| `RentalProviderContactCta` | Bloque «¿Tenés un local de alquiler?» + botón contacto |
| `/categoria/rental` | CTA al final de landing + nota anti-confusión en editorial |
| `/rentals/[id]` | CTA al pie del detalle |
| `CategoryLandingEditorial` | Línea extra solo categoría rental |
| `FooterContactBlock` | `id="footer-support"` para ancla si no hay email |
| `/admin/rentals` | Aclaración alta operativa V2 |

CTA usa `GET /public/platform-config` vía `usePublicPlatformConfig` + `resolveFooterContact` (mismo criterio que footer). Fallback: enlace `/#footer-support` con placeholder institucional existente.

## 6. RegisterWizard

- `PROFILE_CHOICES` solo incluye: USER, PRODUCER, GASTRO, HOTEL, REFERRER.
- `registrationProfileTypeSchema` rechaza `RENTAL` con mensaje explícito.
- Comentario en `register-wizard-copy.ts` documenta exclusión intencional.

## 7. Legal

| Documento | Uso V2 |
|---|---|
| `rental_terms` | Catálogo admin; `appliesToProfiles: ['RENTAL']`, contexto `PORTAL_ACCESS` |
| Signup (`SIGNUP`) | **No** se exige ni muestra `rental_terms` en register |
| Futuro | Si existe perfil/portal rental → aceptación en `PORTAL_ACCESS` |

## 8. Archivos modificados

- `apps/web/lib/rentals/publicCopy.ts`
- `apps/web/components/rentals/RentalProviderContactCta.tsx` (nuevo)
- `apps/web/components/categories/CategoryLandingEditorial.tsx`
- `apps/web/components/categories/CategoryLandingPage.tsx`
- `apps/web/components/rentals/RentalProductDetailContent.tsx`
- `apps/web/components/footer/FooterContactBlock.tsx`
- `apps/web/components/auth/register/register-wizard-copy.ts` (comentario)
- `apps/web/app/(portal)/admin/rentals/page.tsx`
- `docs/onboarding/REGISTER_RENTAL_DECISION.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`

## 9. Verificación

```bash
pnpm --filter web run build
```

Error preexistente no relacionado: `ProducerReferralMetricsPanel.tsx` (tipos referidos).

### Smoke manual

| # | Caso | Esperado |
|---|------|----------|
| 1 | `/register` | Sin card Rental |
| 2 | `/categoria/rental` | Nota equipos ≠ hoteles + CTA contacto |
| 3 | `/rentals/[id]` | CTA contacto al pie |
| 4 | CTA | mailto soporte o `/#footer-support` |
| 5 | `/admin/rentals` | CRUD intacto, copy V2 |
| 6 | Prisma | Sin cambios |

## 10. Pendientes futuros

- `UserRentalMembership` + portal `/rental` (si producto lo define).
- `RENTAL` en `registrationProfileTypeSchema` y wizard.
- Publicación `rental_terms` y bloqueo `PORTAL_ACCESS`.
- Onboarding self-service proveedor rental.
