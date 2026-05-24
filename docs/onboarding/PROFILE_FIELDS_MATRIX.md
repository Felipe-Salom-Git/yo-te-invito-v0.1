# Profile Fields Matrix — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 2 — Matriz de campos + decisión Rental  
Estado: Definición

Referencias: [`docs/audits/REGISTER_ONBOARDING_AUDIT.md`](../audits/REGISTER_ONBOARDING_AUDIT.md) (Slice 1), [`docs/legal/LEGAL_ADMIN_MODULE.md`](../legal/LEGAL_ADMIN_MODULE.md).

---

## 1. Resumen ejecutivo

| Tema | Decisión V2 |
|------|-------------|
| **Perfiles en wizard** | Mantener `USER`, `PRODUCER`, `GASTRO`, `HOTEL`, `REFERRER`. |
| **Rental en registro** | **No agregar `RENTAL` al wizard en V2** (Opción B). Operación rental sigue **admin-only** (`RentalLocation` + productos). Intake comercial vía contacto institucional / admin, no self-service. |
| **Criterio signup vs portal** | Signup = cuenta + identidad mínima del perfil + legales `SIGNUP`. Detalle operativo, medios, geo fina, términos verticales y completitud = **portal** (`/me`, `/producer/profile/*`, `/gastro`, `/hotel/editar`, `/referrer`). |
| **Legales** | `SIGNUP`: `terms_general` + `privacy_policy` (si publicados). Verticales: `PORTAL_ACCESS` (banner no bloqueante hoy). Trazabilidad: `UserLegalAcceptance.documentVersionId` + `acceptedAt`. |
| **Unificación flujos** | Objetivo próximo slice: **un solo schema de creación de perfil** por tipo para `/auth/register` y `/profiles/*/apply`. Hoy hay divergencia crítica en **gastro**. |

**Próximos slices recomendados (orden):** ver §11.

---

## 2. Principios de diseño del registro

1. **Mínimo viable en signup** — Solo lo necesario para crear `User` + membership/perfil `ACTIVE` y redirigir al portal correcto.
2. **Completar en el portal** — Identidad pública, contacto, imágenes, horarios, subcategorías y disclaimers operativos viven en onboarding post-login.
3. **No duplicar formularios largos** — El registro no debe replicar `/producer/profile/*`, editor gastro completo ni `/hotel/editar`.
4. **Sin datos fiscales en V2** — Facturación real no está en producción; no pedir CUIT/DNI fiscal en signup.
5. **Sin promesas falsas** — No prometer pagos reales, reservas hotel, booking, liquidación automática de referidos ni disponibilidad garantizada en rentals.
6. **Legales verticales en portal** — Mantener `isRequiredForSignup` solo para documentos transversales; `producer_terms`, `gastro_terms`, etc. en `PORTAL_ACCESS` hasta decisión explícita de endurecer (slice legal).
7. **Trazabilidad SIGNUP** — Toda aceptación en registro debe persistir `documentVersionId` + `acceptedAt`; endurecer fallos en slice posterior.
8. **Mobile-first** — Máximo 3 pasos visibles; evitar lat/lng manuales en signup (mover a portal/mapa).
9. **Un solo camino por perfil** — Deprecar divergencia `/register` vs `/cuenta/solicitar-*` hacia mismos contratos shared.
10. **Rol JWT estable** — Registrantes comerciales permanecen `User.role = USER`; acceso por membership + `availableProfiles`.

---

## 3. Perfiles soportados

| Perfil | Disponible en wizard hoy | Recomendación V2 | Portal destino | Observación |
|--------|--------------------------:|------------------|----------------|-------------|
| **USER** | Sí | Mantener | `/me` | Comprador; preferencias en `/me/preferences` |
| **PRODUCER** | Sí | Mantener | `/producer` → `/producer/profile` | Slug auto en portal, no en signup |
| **GASTRO** | Sí | Mantener (reducir campos signup en slice UX) | `/gastro` | `publicEventId` se sincroniza en portal |
| **HOTEL** | Sí | Mantener (ajustar copy) | `/hotel` → `/hotel/editar` | Discovery Próximamente; ficha informativa sin reservas |
| **REFERRER** | Sí | Mantener | `/referrer` | Slug/handle en servidor; pagos externos |
| **RENTAL** | No | **No en wizard V2** | N/A (admin `/admin/rentals`) | Vertical pública activa; sin membership ni portal comercial |

**Perfiles que NO deben existir en registro V2**

| Perfil / rol | Motivo |
|--------------|--------|
| `RENTAL` / proveedor equipos | Sin modelo `UserRentalMembership`, sin portal `/rental`, CRUD solo admin |
| `ADMIN`, `SCANNER` | Solo provisión interna / scripts |
| Legacy `RoleApplication` | Deprecar; no nuevo onboarding vía `POST /auth/apply-role` |

---

## 4. Decisión Rental

### 4.1 Estado actual

| Pieza | Estado |
|-------|--------|
| Discovery público | Activo (`category: rental`, `/rentals/[id]`, CTA WhatsApp) |
| Datos | `RentalLocation` + productos `Event` (`rentalLocationId`) |
| Portal comercial proveedor | **No existe** |
| Registro / membership | **No existe** `RENTAL` en `registrationProfileTypeSchema` ni wizard |
| Legal | `rental_terms` (`appliesToProfiles: ['RENTAL']`, `PORTAL_ACCESS`) sin perfil registrable |
| Alta operativa | Admin: `/admin/rentals/locales/*` (rol `ADMIN`) |

### 4.2 Opciones evaluadas

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A — `RENTAL` en wizard** | Registro self-service + perfil proveedor | Alineado con vertical y `rental_terms` | Requiere Prisma membership, portal, permisos, QA amplio; hoy no hay diseño |
| **B — No wizard (admin-only)** | Sin registro rental; admin carga locales | Coherente con implementación actual; bajo riesgo | Checklist «formulario rental» queda como proceso admin, no signup |
| **C — Intención sin operación** | Card «Proveedor rental» → contacto / cola | Captura demanda comercial sin portal | Requiere UI + flujo inbox; puede frustrar si no hay respuesta |

### 4.3 Decisión recomendada para V2

**Opción B — No agregar `RENTAL` al wizard en V2.**

**Justificación**

1. No hay entidad de perfil de usuario vinculada a `RentalLocation` (locales no tienen `createdByUserId` de proveedor en flujo self-service).
2. Agregar Opción A sin portal obligaría a prometer un panel que no existe o a redirigir a `/admin` (incorrecto).
3. La vertical ya funciona con operación **curada por admin**, coherente con control de calidad y anti-alojamiento.
4. `rental_terms` sigue aplicando cuando exista un contexto `PORTAL_ACCESS` con perfil `RENTAL` (futuro) o se documenta aceptación en proceso contractual offline.

**Puente comercial (sin implementar en este slice)**

- Copy público: «¿Tenés un local de alquiler de equipos? Escribinos» → `GET /public/platform-config` (footer/contacto).
- Checklist ítem «Pulir formulario de registro para rental» → **reinterpretar** como: documentar proceso admin + copy anti-confusión hotel/rental; **no** formulario `/register` hasta slice «Portal rental» o Opción C explícita.

**Roadmap sugerido (post-V2)**

| Fase | Alcance |
|------|---------|
| V2.1 opcional | Opción C: tile informativo en paso 2 o footer (sin `profileType` RENTAL) |
| V3 | Opción A: `UserRentalMembership`, portal `/rental` o extensión gastro-like, `RENTAL` en register |

### 4.4 Copy mínimo recomendado (cuando se implemente UI)

- Título: «Equipos y rentals» (no «Hotel» ni «Alojamiento»).
- Cuerpo: «Los locales de alquiler son dados de alta por el equipo de Yo Te Invito. Consultá disponibilidad por WhatsApp en cada ficha.»
- CTA proveedor: «Quiero sumar mi local» → contacto / formulario futuro, **no** signup con promesa de panel.

### 4.5 Impacto en próximos slices

- **Slice «Pulir rental»** del checklist → admin + copy público, no wizard.
- **Schemas:** no agregar `RENTAL` a `registrationProfileTypeSchema` hasta diseño de membership.
- **Legal:** publicar `rental_terms`; uso en `PORTAL_ACCESS` cuando exista perfil.

---

## 5. Matriz de campos por perfil

**Leyenda columnas**

| Columna | Significado |
|---------|-------------|
| **Signup req/opt** | Recomendación V2 para `/register` |
| **Onboarding portal** | Dónde completar después del alta |
| **Persistencia hoy** | Qué guarda el código actual |
| **Δ próximo slice** | Cambio documentado, sin implementar |

---

### 5.1 USER / Comprador

| Campo | Signup req | Signup opt | Onboarding portal | Persistencia actual | Validación hoy | Comentario |
|-------|:----------:|:----------:|-------------------|---------------------|----------------|------------|
| `firstName` | ✓ | | — | `User.firstName` | Zod signup + API | Paso 1 wizard |
| `lastName` | ✓ | | — | `User.lastName` | Zod signup + API | Paso 1 wizard |
| `email` | ✓ | | — | `User.email` | email + único tenant | |
| `password` | ✓ | | — | `User.passwordHash` | min 6 | Confirmación solo UI |
| `confirmPassword` | ✓ (UI) | | — | — | Zod refine | No se envía al API |
| `city` / ciudad preferida | ✓ (recom.) | | `/me/preferences` | `User.preferences.city`, `preferredCity`, `preferredCities[]` | min 1 en wizard | Default UI Bariloche |
| `phone` | | ✓ (futuro) | `/me/account` | `User.phone` nullable | — | **No** en signup hoy; opcional V2.1 en cuenta |
| `favoriteCategories` | | | ✓ `/me/preferences` | `User.preferences` JSON | PATCH portal | Post-registro |
| `favoriteSubcategoryIds` | | | ✓ `/me/preferences` | idem | PATCH portal | Post-registro |
| `profileType` | ✓ (=USER) | | — | implícito | default USER | |
| Aceptación `terms_general` | ✓ | | — | `UserLegalAcceptance` SIGNUP | si publicado | Vacío legal = bypass hoy |
| Aceptación `privacy_policy` | ✓ | | — | idem | si publicado | |
| `purchase_refund_policy` | | | ✓ checkout | CHECKOUT context | — | No signup |
| `ticket_transfer_terms` | | | ✓ `/me` portal | PORTAL_ACCESS | — | No signup |

---

### 5.2 PRODUCER / Productora

| Campo | Signup req | Signup opt | Onboarding portal | Persistencia actual (register) | Validación | Comentario |
|-------|:----------:|:----------:|-------------------|-------------------------------|------------|------------|
| Cuenta (nombre, email, password, city) | ✓ | | — | `User` | ver §5.1 | Paso 1 compartido |
| `displayName` | ✓ | | `/producer/profile/identity` | `ProducerProfile.displayName` | min 1 API | Nombre comercial |
| `city` | | ✓ | `/producer/profile/contact` | `ProducerProfile.city` | opcional | Base operativa |
| `description` / `shortDescription` | | ✓ | identity | `shortDescription` | opcional | Register envía `description` |
| `legalName` | | | ✓ identity | — en register | — | Solo apply/logueado opcional |
| `slug` | | | ✓ servidor | — en register | auto en `PATCH/POST /producer/profile` | **No** en signup |
| `logoUrl`, `coverImageUrl`, `galleryUrls` | | | ✓ `/producer/profile/images` | — | — | Completitud frontend |
| `primaryPhone`, `whatsapp`, emails | | | ✓ `/producer/profile/contact` | — | — | |
| `socialLinks` / redes | | | ✓ contact | — | — | |
| `longDescription` | | | ✓ identity | — | — | |
| `country` | | | ✓ contact | — | — | |
| Legales SIGNUP | ✓ | | — | UserLegalAcceptance | generales + privacidad | |
| `producer_terms` | | | ✓ PORTAL_ACCESS | banner portal | no bloqueante | Recomendación: mantener en portal |
| Completitud perfil | | | ✓ `/producer/profile` | — | `producer-profile-completeness.ts` | No signup |

**Mínimo signup recomendado V2:** cuenta + `displayName` + legales SIGNUP.  
**Reducir respecto a hoy:** `description` y `city` opcionales en UI (ya opcionales en API).

---

### 5.3 GASTRO / Gastronómico

| Campo | Signup req | Signup opt | Onboarding portal | Persistencia register | Validación | Comentario |
|-------|:----------:|:----------:|-------------------|----------------------|------------|------------|
| Cuenta | ✓ | | — | `User` | | |
| `displayName` | ✓ | | `/gastro` editor local | `GastroProfile.displayName` | min 1 | |
| `contactEmail` | ✓ | | | `GastroProfile.contactEmail` | email | Default email cuenta en UI |
| `province`, `city`, `address` | ✓ (recom.) | | | campos geo | min 1 schema | Necesarios para ficha |
| `lat`, `lng` | | ✓ | ✓ mapa/portal | `geoLat`, `geoLng` | number | **Mover fuera de signup** (defaults CABA hoy = deuda) |
| `summary` | | ✓ | portal | `summary` | max 220 | |
| `detail`, `description` | | | ✓ portal | | | |
| `contactPhone`, `whatsapp` | | | ✓ portal | | | No en register |
| `openingHours` | | | ✓ portal | JSON | | |
| `bannerUrl`, `galleryUrls` | | | ✓ portal | | | |
| `subcategoryId` | | | ✓ portal | | | Tipo de local |
| `menuUrl`, `websiteUrl` | | | ✓ portal | | | |
| `publicEventId` | | | ✓ sync API | null hasta sync | | `gastro-local.service` |
| Legales SIGNUP | ✓ | | — | | | |
| `gastro_terms` | | | ✓ PORTAL_ACCESS | | | |

**Mínimo signup recomendado V2:** cuenta + `displayName` + `contactEmail` + ubicación texto (provincia, ciudad, dirección) sin lat/lng manual.  
**Unificar:** register y apply deben usar **`gastroLocalCreateSchema`** (o subset común).

---

### 5.4 HOTEL

| Campo | Signup req | Signup opt | Onboarding portal | Persistencia register | Validación | Comentario |
|-------|:----------:|:----------:|-------------------|----------------------|------------|------------|
| Cuenta | ✓ | | — | `User` | | |
| `displayName` | ✓ | | `/hotel/editar` | `HotelProfile.displayName` | min 1 | Evitar «alojamiento» en título wizard |
| `websiteUrl` | ✓ | | editar | `HotelProfile.websiteUrl` | https:// | Requerido schema |
| `city` | | ✓ | editar | `city` | | |
| `description` | | ✓ | editar | `description` | | |
| `address`, `geoLat/Lng` | | | ✓ editar | | | No signup |
| `whatsappPhone`, `contactPhone`, `contactEmail` | | | ✓ editar | | | |
| `starCategory`, `amenities`, `galleryUrls` | | | ✓ editar | | | |
| `bookingUrl` | | | ✓ opt | | | **No promover** en signup; sin motor reservas |
| `socialLinks` | | | ✓ editar | | | apply logueado sí pide más |
| `publicEventId` | | | ✓ PATCH `/hotel/me` | | | Ficha pública |
| Legales SIGNUP | ✓ | | — | | | |
| `hotel_terms` | | | ✓ PORTAL_ACCESS | | | |
| Aclaración sin reservas | — | — | ✓ copy portal/registro | — | — | Obligatorio en slice copy |

**Mínimo signup recomendado V2:** cuenta + `displayName` + `websiteUrl` + disclaimer.  
**Apply logueado (`/cuenta/solicitar-hotel`)** es más completo que register → unificar hacia schema hotel completo en **un solo** endpoint/contrato.

---

### 5.5 REFERRER / Referido

| Campo | Signup req | Signup opt | Onboarding portal | Persistencia register | Validación | Comentario |
|-------|:----------:|:----------:|-------------------|----------------------|------------|------------|
| Cuenta | ✓ | | — | `User` | | |
| `displayName` | ✓ | | `/referrer` | `ReferrerProfile.displayName` | min 1 | Nombre público |
| `bio` | | ✓ | portal | `bio` | max 500 | |
| `city` | | ✓ | portal | `city` | | |
| `slug`, `publicHandle` | | | ✓ auto | servidor | único | UI: «se generan solos» |
| `longBio`, `avatarUrl`, `region` | | | ✓ portal | | | |
| `publicVisibility` | | | ✓ portal | default **false** | | |
| `associationLinkToken` | | | ✓ auto | servidor | | |
| Teléfono / WhatsApp / redes | | | ✓ futuro portal | — | — | No en modelo dedicado; usar bio/contacto |
| Legales SIGNUP | ✓ | | — | | | |
| `referrer_terms` | | | ✓ PORTAL_ACCESS | | | |
| Disclaimer pagos externos | | | ✓ UI portal | hardcoded + docs legal | | No signup; slice copy |

**Mínimo signup recomendado V2:** cuenta + `displayName` + legales SIGNUP + línea disclaimer en portal (no bloqueante signup).

---

### 5.6 RENTAL / Proveedor de equipos (según decisión §4)

| Campo | Signup req | Signup opt | Onboarding | Persistencia | Comentario |
|-------|:----------:|:----------:|------------|--------------|------------|
| *(todos los de cuenta)* | — | — | — | — | **No aplica** en wizard V2 |
| `RentalLocation.name` | — | — | Admin | `RentalLocation` | Alta admin |
| `address` | — | — | Admin | | |
| `whatsappPhone` | — | — | Admin | | CTA público |
| `openingHours` | — | — | Admin | JSON | |
| `contactEmail`, `websiteUrl` | — | — | Admin | | |
| Productos rental | — | — | Admin | `Event` category rental | |
| `rental_terms` | — | — | Futuro PORTAL_ACCESS | Legal catálogo | Sin perfil `RENTAL` user |

**Si en V2.1 se implementa Opción C (intención):** capturar solo `email` + `nombre comercial` + `ciudad` + mensaje en inbox/contacto — **fuera** de `POST /auth/register` hasta diseño formal.

---

## 6. Campos globales comunes

| Campo | Aplica a | Requerido V2 | Dónde se captura hoy | Persistencia | Observación |
|-------|----------|:------------:|----------------------|--------------|-------------|
| `firstName`, `lastName` | Todos | ✓ | Register paso 1 | `User` | |
| `email` | Todos | ✓ | paso 1 | `User.email` | lower case en API |
| `password` | Todos | ✓ | paso 1 | `passwordHash` | min 6 |
| `tenantId` | Todos | ✓ (fijo) | hardcode `tenant-demo` | `User.tenantId` | Usar `useTenant()` en slice UX |
| `profileType` | Comerciales + USER | ✓ | paso 2 | body register | enum 5 valores |
| `profileData` | Comerciales | ✓ | paso 3 | según tipo | `unknown` en schema |
| `city` (preferida) | Todos | ✓ recom. | paso 1 | `User.preferences` | Distinto de city del negocio |
| `phone` | Todos | opt | — / cuenta | `User.phone` | No en wizard |
| Aceptación legal (ids) | Todos | ✓ si hay docs | post-register | `UserLegalAcceptance` | `documentVersionIds[]` |
| `context` legal | Todos | SIGNUP | POST accept | `context` enum | Tras signIn |
| JWT / sesión | Todos | — | signIn | NextAuth | `role` siempre USER |

---

## 7. Reglas legales por perfil

| Perfil | SIGNUP requerido (seed flags) | PORTAL_ACCESS requerido | Documento vertical | Bloqueante hoy | Recomendación V2 |
|--------|------------------------------|-------------------------|--------------------|:--------------:|------------------|
| USER | `terms_general`, `privacy_policy` | `terms_general`, `ticket_transfer_terms` | — | SIGNUP: solo si publicados; portal: banner | Mantener |
| PRODUCER | generales + privacidad | + `producer_terms` | `producer_terms` | No | Verticales en primer login portal |
| GASTRO | generales + privacidad | + `gastro_terms` | `gastro_terms` | No | Idem |
| HOTEL | generales + privacidad | + `hotel_terms` | `hotel_terms` | No | Idem + copy sin booking |
| REFERRER | generales + privacidad | + `referrer_terms` | `referrer_terms` | No | Idem + disclaimer pagos |
| RENTAL | — (sin registro) | `rental_terms` (catálogo) | `rental_terms` | N/A | Aplicar cuando exista perfil RENTAL |

**Registro de versión y fecha**

- Implementado: `POST /me/legal/accept` → `documentVersionId`, `acceptedAt`, `context`.
- Gap: fallo post-register; lista vacía si nada publicado.
- Slice legal futuro: bloquear signup sin docs publicados; opcional exigir vertical en primer acceso portal con bloqueo duro.

---

## 8. Comparación register vs apply flows

| Perfil | Register (`/register` → `POST /auth/register`) | Apply (`/cuenta/solicitar-*` → `POST /profiles/*/apply`) | Diferencias clave | Riesgo | Recomendación |
|--------|-----------------------------------------------|-----------------------------------------------------------|-------------------|--------|---------------|
| PRODUCER | `displayName`, `description?`, `city?` | `displayName`, `legalName?`, `description?` | apply permite `legalName`; register no | Bajo | Unificar en `profileProducerSignupSchema` subset |
| GASTRO | **`gastroLocalCreateSchema`** (geo, contactEmail, address…) | **`profileGastroApplySchema`** (solo displayName, description, address plano) | Schemas distintos; apply **no** crea geo ni contactEmail obligatorio | **Alto** | Un solo schema; apply = register payload |
| HOTEL | `displayName`, `websiteUrl`, `description?`, `city?` | Formulario amplio (estrellas, redes, bookingUrl…) | apply más completo que register | Medio | Signup mínimo; apply usa mismo PATCH que `/hotel/editar` |
| REFERRER | `displayName`, `bio?`, `city?` | Similar vía apply | Relativamente alineados | Bajo | Compartir `profileReferrerApplySchema` |
| USER | Sin `profileData` | N/A | — | — | — |
| RENTAL | No | No | Solo admin | — | Admin-only V2 |

**Endpoints**

| Flujo | Endpoint | Auth |
|-------|----------|------|
| Register | `POST /auth/register` | No |
| Apply | `POST /profiles/{tipo}/apply` | Sí |
| Legales register | `POST /me/legal/accept` | Sí (post signIn) |
| Legales apply | — | **No integrado** en solicitar-* |

**Recomendación unificación**

1. Extraer en `packages/shared` un schema **`profileXSignupSchema`** por tipo (= mínimo común register + apply).
2. `authRegisterRequestSchema.profileData` validar con discriminated union por `profileType`.
3. `ProfilesService.apply*` reutilizar misma función que `ProfileRegistrationService`.
4. Deprecar páginas `/cuenta/solicitar-*` o hacerlas thin wrappers que redirigen a `/register` si no hay sesión y a formulario portal si ya hay perfil.
5. Integrar legales en apply: mismos requisitos que tras crear cuenta (o forzar `/register` para nuevos comerciales).

---

## 9. Recomendaciones para schemas / backend (sin implementar)

| # | Cambio propuesto | Motivo |
|---|------------------|--------|
| 1 | `registrationProfileTypeSchema` — **no** agregar `RENTAL` en V2 | Decisión §4 |
| 2 | Discriminated union `profileData` en `authRegisterRequestSchema` | Dejar de usar `z.unknown()` |
| 3 | `profileGastroSignupSchema` = subset de `gastroLocalCreateSchema` | Unificar gastro |
| 4 | `profileProducerSignupSchema`: solo `displayName` req | Alinear register/apply |
| 5 | Normalizar `websiteUrl` (prepend https) en hotel — ya en solicitar-hotel | Paridad |
| 6 | `auth.service.register`: opcional rollback o flag `legalAccepted` si falla accept (cliente) | Riesgo alta |
| 7 | `getPublicRequirements`: modo estricto env `LEGAL_REQUIRE_PUBLISHED_FOR_SIGNUP` | Evitar bypass |
| 8 | Deprecar `POST /auth/apply-role` en docs | Legacy |
| 9 | Futuro: `UserRentalMembership` + `RENTAL` solo con diseño portal | Opción A futura |

---

## 10. Recomendaciones para frontend UX (sin implementar)

### Estructura wizard recomendada

| Paso | Contenido |
|------|-----------|
| 1 | Cuenta: nombre, apellido, email, password, ciudad preferida |
| 2 | Elegir perfil (cards; rental → enlace contacto, no card signup) |
| 3a USER | Solo legales SIGNUP |
| 3b Comercial | Mínimo por matriz §5.2–5.5 + legales |
| 4 | (implícito) register → login → accept → redirect |

### Por perfil

| Perfil | Mover al portal | No pedir en signup |
|--------|-----------------|---------------------|
| USER | categorías favoritas, push | teléfono (opcional después) |
| PRODUCER | logo, contacto, slug, producer_terms UI | descripción larga |
| GASTRO | horarios, imágenes, subcategoría, lat/lng | coordenadas manuales |
| HOTEL | amenities, galería, geo, bookingUrl | promesa reservas |
| REFERRER | visibilidad pública, avatar | handle editable |
| RENTAL | todo | todo (admin) |

### UX transversal

- Indicador de progreso (1/3, 2/3, 3/3).
- Errores API por campo cuando el backend devuelva `details`.
- Estado explícito si `required.length === 0` legal («No hay documentos publicados; no podés registrarte» vs silencio).
- Mobile: una columna; evitar grids lat/lng.

---

## 11. Próximos slices recomendados

Orden ajustado post Slice 2:

| # | Slice | Entregable |
|---|-------|------------|
| 3 | Unificar shared schemas + backend register/apply | Un schema por perfil; gastro unificado |
| 4 | Hardening legal signup | Sin bypass; retry accept; docs publicados obligatorios |
| 5 | Pulir comprador + UX base wizard | Paso legal USER; tenantId; progreso |
| 6 | Pulir productora | Mínimo signup; copy |
| 7 | Pulir gastro | Quitar lat/lng signup; unificar apply |
| 8 | Rental según §4 | Admin + copy público + checklist reinterpretado (**no wizard**) |
| 9 | Pulir hotel | Copy Próximamente; unificar con solicitar-hotel |
| 10 | Pulir referido | Disclaimer pagos; portal |
| 11 | Completitud / onboarding en portales | Banners completitud (productor ya tiene) |
| 12 | Validaciones visibles + mobile QA | E2E manual matriz § Smoke |

---

## 12. Criterios de aceptación

- [x] Documento creado en `docs/onboarding/PROFILE_FIELDS_MATRIX.md`.
- [x] Recomendación clara para Rental: **Opción B (no wizard V2)**.
- [x] Campos signup vs onboarding separados por perfil.
- [x] Relación legal SIGNUP vs PORTAL_ACCESS documentada.
- [x] Comparación `/register` vs `/cuenta/solicitar-*`.
- [x] Cambios schemas/backend/frontend listados sin implementación.
- [x] Orden de próximos slices actualizado.

---

## Smoke futuro derivado de esta matriz

Cuando se implementen los formularios, validar:

1. **USER** solo pide datos mínimos (cuenta + ciudad + legales SIGNUP).
2. **PRODUCER** no duplica todo `/producer/profile` en signup.
3. **GASTRO** usa el **mismo** schema en register y apply; sin defaults geo incorrectos.
4. **HOTEL** no promete reservas ni booking en copy ni campos obligatorios.
5. **REFERRER** muestra disclaimer de pagos externos/manuales en portal.
6. **RENTAL** sigue decisión §4: sin opción wizard; proveedor derivado a contacto/admin.
7. Todos muestran términos generales y privacidad si están publicados.
8. Términos verticales aparecen en **PORTAL_ACCESS** (o signup solo si se cambia política documentada).
9. Si no hay documentos publicados, comportamiento **definido y visible** (no bypass silencioso).
10. Mobile: formularios cortos por paso; sin scroll excesivo en paso 3.

---

## Referencias de código (estado al 2026-05-24)

| Área | Ubicación |
|------|-----------|
| Wizard | `apps/web/components/auth/RegisterWizard.tsx` |
| Register API | `apps/api/src/auth/auth.service.ts`, `profile-registration.service.ts` |
| Apply API | `apps/api/src/modules/profiles/profiles.service.ts` |
| Schemas | `packages/shared/src/schemas/user.schema.ts`, `gastro-locations.ts` |
| Legal seed | `packages/shared/src/constants/legal-documents.ts` |
| Rental admin | `packages/shared/src/schemas/rental-locations.ts`, `/admin/rentals` |
