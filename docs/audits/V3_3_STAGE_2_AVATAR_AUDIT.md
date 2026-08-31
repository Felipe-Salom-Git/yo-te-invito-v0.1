# V3.3 — Etapa 2: Avatar de usuario — auditoría

**Rama:** `feat/v1-s03-api-foundation`  
**Fecha:** 2026-08-31  
**Backlog:** A2 — Agregar foto de perfil de usuario

---

## 1. Persistencia actual

| Aspecto | Hallazgo |
| ------- | -------- |
| Columna `User.avatarUrl` | **No existe** en modelo `User` (Prisma). `avatarUrl` en schema pertenece a `ReferrerProfile`. |
| Ubicación real | `User.preferences` (JSONB) → clave `avatarUrl` (string). |
| Servicio | `MeAccountService.readAccountFields()` / `patchAccount()` en `apps/api/src/modules/me/me-account.service.ts`. |
| Endpoint | `GET /me/account`, `PATCH /me/account` (`MePortalController`). |

**Decisión Etapa 2:** mantener `preferences.avatarUrl`. Sin migración nueva.

---

## 2. Contrato API

### `MeAccount` (shared `meAccountSchema`)

- Expone `avatarUrl: string | null | optional` en respuesta de cuenta.

### `PatchMeAccountBody` (`patchMeAccountBodySchema`)

- Acepta `avatarUrl` opcional/nullable.
- **Problema detectado:** `max(2_000_000)` pensado para data URLs legacy — debe endurecerse a URL HTTP(S) ≤2048 en Slice 2.2.

### Reviews / perfil público

- `buildPublicReviewItem` lee `review.user?.avatarUrl` pero **User no tiene ese campo** → siempre `null` hoy.
- `PublicReviewsService.getUserPublicProfile()` devuelve `avatarUrl: null` hardcodeado.
- Queries de reviews incluyen `user.select` sin `preferences`.

**Slice 2.2:** helper compartido `readUserAvatarUrl(preferences)` + propagar en reviews y perfil público.

---

## 3. Frontend actual

| Área | Estado |
| ---- | ------ |
| `/me/account` | Formulario nombre/teléfono/ciudad — **sin sección avatar**. |
| `useMeAccount` / `usePatchMeAccount` | Existen; patch no envía `avatarUrl`. |
| `NavbarUserMenu` | Icono genérico + email; sin avatar. |
| `UserReviewerAvatar` | Listo: imagen circular + iniciales fallback. |
| `/users/[userId]` | `UserReviewerProfileHeader` usa `profile.avatarUrl` (siempre null hoy). |
| `ReviewCard` | No muestra avatar del autor (solo nombre + badge). |

---

## 4. Storage GCS existente

| Pieza | Ubicación |
| ----- | --------- |
| Endpoint | `POST /uploads/public-image` |
| Hook web | `useGcsImageUpload` → `useUploadPublicImage` → `ApiRepository.uploadPublicImage` |
| Scopes actuales | `event`, `producer`, `gastro`, `rental`, `hotel`, `excursion`, `platform` |
| Purposes | `cover`, `gallery`, `profile`, `logo`, `banner`, `content` |
| Auth | `UploadsAuthorizationService` — roles comerciales por scope |

**Gap:** no existe scope `user`. Productores usan `scope: producer`, `purpose: logo` como referencia.

**Decisión Slice 2.2:** agregar scope `user` con `entityId = userId` del JWT; cualquier usuario autenticado solo puede subir a su propio id. Path GCS: `public/users/{userId}/profile/{yyyy}/{mm}/{uuid}.ext`.

---

## 5. Validación de imagen

Reutilizar:

- `validatePublicImageFile` (web)
- `detectImageMime` + límite MB (API)
- `IMAGE_ACCEPT_GCS` = JPEG/PNG/WebP
- `ImageUploadHint` variant `logo` (512×512) con copy override para avatar 1080×1080

---

## 6. Eliminar avatar

`PATCH /me/account` con `avatarUrl: null` ya es válido en servicio (asigna null en preferences).

Incluir botón «Quitar foto» en UI Slice 2.3 si el contrato endurecido mantiene `.nullable()`.

No borrar objeto GCS anterior (deuda: orphan cleanup).

---

## 7. Alcance slices 2.2–2.4

| Slice | Alcance |
| ----- | ------- |
| **2.2** | Scope `user` upload; helper avatar; fix reviews/perfil API; validación URL en patch |
| **2.3** | `MeAccountAvatarSection`; navbar; ReviewCard avatar; quitar foto |
| **2.4** | Builds + doc cierre + QA manual documentado |

**Fuera de alcance:** cropper, cover image, migración columna, username, scanner branding.

---

## 8. Archivos previstos

**Shared/API:** `user-preferences.util.ts`, `public-image-upload.ts`, `upload-paths.ts`, `uploads-authorization.service.ts`, `me-account.service.ts`, `public-reviews.service.ts`, `review-public.util.ts`, `user-portal.ts`

**Web:** `gcs-image-upload-config.ts`, `MeAccountAvatarSection.tsx`, `me/account/page.tsx`, `NavbarUserMenu.tsx`, `ReviewCard.tsx`, `imageUploadHints.ts` (variant avatar opcional)
