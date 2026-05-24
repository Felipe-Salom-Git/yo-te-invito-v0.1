# Register Hotel Form — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 9 — Hotel  
Estado: Implementado

## 1. Resumen

Se pulió el registro **HOTEL** con paso dedicado `RegisterHotelStep`: solo `displayName` y `websiteUrl`, disclaimer visible sobre ausencia de reservas/pagos, y flujo legal transaccional igual que el resto de perfiles comerciales.

## 2. Alcance Hotel V2

| Aspecto | V2 |
|---|---|
| Ficha pública | Informativa (`/hoteles/[id]`) |
| Portal | Liviano (`/hotel`, `/hotel/editar`) |
| Reservas / booking | **No** |
| Pagos hoteleros | **No** |
| Disponibilidad en tiempo real | **No** |
| Discovery principal | Sigue «Próximamente» (sin cambios en este slice) |

## 3. Flujo de registro hotel

1. **Cuenta** — datos de acceso.
2. **Perfil** — elegir «Hotel».
3. **Hotel** — nombre + sitio web + disclaimer.
4. **Legales** — SIGNUP (`terms_general`, `privacy_policy`).
5. **`POST /auth/register`** + `signIn` → **`/hotel`**.

## 4. Campos signup

| Campo | Requerido en UI | Schema | Persistencia | Observación |
|---|---:|---|---|---|
| `displayName` | ✓ | `hotelProfileSignupSchema` | `HotelProfile.displayName` | |
| `websiteUrl` | ✓ | `httpsUrlSchema` | `HotelProfile.websiteUrl` | Contacto / web oficial |
| `city` | — | opcional en schema | perfil | **No** en UI signup |
| `description` | — | opcional en schema | perfil | **No** en UI signup |
| Legales SIGNUP | ✓ si publicados | `signupLegalAcceptance` | `UserLegalAcceptance` | |

## 5. Datos que quedan para portal

Completar en `/hotel` y `/hotel/editar`:

- Amenities, galería, imágenes
- Dirección, geo, teléfono, email de contacto
- Categoría de estrellas, redes
- `bookingUrl` (enlace externo informativo; la plataforma no procesa reservas)
- Políticas y descripción extendida

## 6. Copy / disclaimer

- Card perfil: ficha informativa; reservas y pagos no disponibles en esta versión.
- Disclaimer destacado (ámbar): no gestión de reservas, disponibilidad ni pagos.
- Hint `websiteUrl`: web, contacto o canal informativo.

## 7. Legal

- Signup: `SIGNUP` general + privacidad vía `signupLegalAcceptance`.
- `hotel_terms`: catálogo; uso futuro en `PORTAL_ACCESS`, **no** movido a signup en este slice.

## 8. Archivos modificados

- `apps/web/components/auth/register/RegisterHotelStep.tsx` (nuevo)
- `apps/web/components/auth/register/register-wizard-copy.ts`
- `apps/web/components/auth/RegisterWizard.tsx`
- `packages/shared/src/schemas/profile-onboarding.ts` (comentario)
- `docs/onboarding/REGISTER_HOTEL_FORM.md`
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
| 1 | `/register` → Hotel | 4 pasos |
| 2 | Campos | Solo nombre + website |
| 3 | Disclaimer | Visible, sin promesa de reservas |
| 4 | Legales + register | `signupLegalAcceptance` |
| 5 | Redirect | `/hotel` |
| 6 | Discovery hoteles | Sin cambios «Próximamente» |

## 10. Pendientes futuros

- Reservas / booking integrado (fuera de V2).
- Publicación `hotel_terms` y bloqueo `PORTAL_ACCESS`.
- Carrusel hoteles en home cuando producto lo defina.
- Completitud visual onboarding hotel.
