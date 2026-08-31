# V3.3 — Etapa 2: Perfil de usuario / Avatar — cierre técnico

**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** código completado y pusheado — contextos/checklist actualizados; **QA manual acumulado pendiente** (cierre global V3.3).

| Check | Estado |
| ----- | ------ |
| Código | ✅ |
| Build shared | ✅ |
| Build API | ✅ |
| Build web | ✅ |
| Contextos | ✅ |
| Checklist | ✅ |
| Push | ✅ (post-cierre documental) |
| QA manual | ⏳ cierre global V3.3 |

---

## 1. Alcance

Implementación del backlog **A2 — Agregar foto de perfil de usuario**:

- Auditoría del contrato existente (`preferences.avatarUrl`)
- Upload seguro vía GCS (scope `user`)
- Persistencia por `PATCH /me/account`
- UI en cuenta, navbar, reviews y perfil público de comentarista

**Fuera de alcance (no implementado):** cover de perfil, galería, cropper avanzado, columna `User.avatarUrl`, borrado de assets huérfanos en GCS.

---

## 2. Persistencia elegida

| Decisión | Detalle |
| -------- | ------- |
| Campo | `User.preferences.avatarUrl` (JSONB) |
| Migración | **Ninguna** — el contrato ya existía en `MeAccountService` |
| Helper compartido | `readUserAvatarUrl()` en `packages/shared/src/user-preferences.util.ts` |
| Validación PATCH | URL HTTP(S) pública, máx. 2048 chars; rechaza data URLs |

**Por qué:** la API y el schema de cuenta ya leían/escribían `avatarUrl` vía preferences; no había limitación técnica que justificara una columna dedicada.

---

## 3. Upload / storage

| Aspecto | Valor |
| ------- | ----- |
| Endpoint | `POST /uploads/public-image` |
| Scope | `user` (nuevo en shared + API + web) |
| Entity ID | `userId` del JWT (solo propio usuario) |
| Purpose | `profile` |
| Path GCS | `public/users/{userId}/profile/{yyyy}/{mm}/{uuid}.{ext}` |
| Tipos | JPEG, PNG, WebP (`IMAGE_ACCEPT_GCS`) |
| Límite | Mismo que uploads públicos existentes (`IMAGE_UPLOAD_MAX_MB`) |
| Reemplazo | Nueva URL en PATCH; avatar anterior no se borra en GCS (deuda) |
| Error upload | No se llama PATCH → avatar previo intacto |

---

## 4. Backend

| Archivo | Cambio |
| ------- | ------ |
| `packages/shared/src/schemas/public-image-upload.ts` | Scope `user` |
| `packages/shared/src/schemas/user-portal.ts` | `avatarUrl` HTTP(S) ≤2048 |
| `packages/shared/src/user-preferences.util.ts` | `readUserAvatarUrl`, `isHttpImageUrl` |
| `apps/api/src/modules/uploads/upload-paths.ts` | Carpeta `users` |
| `apps/api/src/modules/uploads/uploads-authorization.service.ts` | Auth scope `user` (solo propio id, `purpose: profile`) |
| `apps/api/src/modules/me/me-account.service.ts` | Usa `readUserAvatarUrl` |
| `apps/api/src/modules/reviews/review-public.util.ts` | Avatar desde `user.preferences` |
| `apps/api/src/modules/reviews/public-reviews.service.ts` | `preferences` en selects + perfil público |

No se creó endpoint dedicado de avatar; `PATCH /me/account` es suficiente.

---

## 5. Frontend

| Archivo | Cambio |
| ------- | ------ |
| `apps/web/lib/upload/gcs-image-upload-config.ts` | Scope `user` |
| `apps/web/lib/upload/imageUploadHints.ts` | Variant `avatar` (1080×1080) |
| `apps/web/components/me/MeAccountAvatarSection.tsx` | **Nuevo** — selección, preview, upload GCS, PATCH, quitar foto |
| `apps/web/app/(portal)/me/account/page.tsx` | Sección foto de perfil |
| `apps/web/components/NavbarUserMenu.tsx` | Avatar vía `useMeAccount` |
| `apps/web/components/reviews/UserReviewerAvatar.tsx` | Tamaño `sm` para navbar |
| `apps/web/components/reviews/ReviewCard.tsx` | Avatar del autor |

Flujo cuenta: seleccionar → preview local → upload GCS → `PATCH { avatarUrl }` → invalidación de cache (`usePatchMeAccount`).

---

## 6. Rutas / componentes donde se visualiza

| Contexto | Componente / ruta |
| -------- | ----------------- |
| Cuenta | `/me/account` → `MeAccountAvatarSection` |
| Navbar | `NavbarUserMenu` → `UserReviewerAvatar` size `sm` |
| Reviews | `ReviewCard` → avatar autor; `UserReviewerProfileHeader` en `/users/[userId]` |
| Perfil público | `/users/[userId]` — API devuelve `avatarUrl` desde preferences |

Fallback: iniciales en círculo (`UserReviewerAvatar`) cuando no hay imagen.

---

## 7. Builds

| Check | Resultado |
| ----- | --------- |
| `pnpm --filter shared run build` | ✅ OK |
| `pnpm --filter api run build` | ✅ OK |
| `pnpm --filter web run build` | ✅ OK (ECONNREFUSED en SSG sin API local — preexistente) |

---

## 8. QA manual pendiente

Acumulado para cierre global V3.3 — **no ejecutado en esta etapa**:

- [ ] `/me/account` — subir foto, preview, guardar
- [ ] Reload — avatar persiste
- [ ] Logout / login — avatar en sesión y navbar
- [ ] Navbar — foto visible con fallback sin foto
- [ ] Review card — avatar del autor en listados públicos
- [ ] `/users/[id]` — header con avatar
- [ ] Mobile — controles ≥44px, sin overflow
- [ ] Error de upload — mensaje visible, avatar previo conservado
- [ ] Quitar foto — `PATCH avatarUrl: null`

---

## 9. Riesgos / deuda

| Riesgo | Notas |
| ------ | ----- |
| Assets huérfanos | Al reemplazar avatar, el objeto GCS anterior no se elimina |
| Sin cropper | `object-fit: cover` en UI; usuario debe subir imagen razonablemente cuadrada |
| Cache sesión | Navbar depende de `useMeAccount`; invalidación en patch cubre el caso normal |
| Referrer vs User | `ReferrerProfile.avatarUrl` es entidad distinta; no confundir con avatar de cuenta |
| Contratos legacy | Onboarding u otros flujos con `avatarUrl` en body no fueron tocados |

---

## 10. Commits

| Slice | Hash | Mensaje |
| ----- | ---- | ------- |
| 2.1 | `4142d5e` | `docs(v3.3): audit user avatar flow` |
| 2.2 | `1bdb907` | `feat(v3.3): add user avatar upload` |
| 2.3 | `105696c` | `feat(v3.3): surface user avatars across profile ui` |
| 2.4 | *(este commit)* | `docs(v3.3): close user avatar stage` |

---

## 11. Documentación relacionada

- Auditoría: `docs/audits/V3_3_STAGE_2_AVATAR_AUDIT.md`
- Checklist V3.3: actualizado (A2)
- Contextos (`AI_ENTRYPOINT`, `NEXT_CHAT_HANDOFF`, `PROJECT_CONTEXT`, `FRONTEND_CONTEXT`, `BACKEND_CONTEXT`, `CONTEXT_PENDIENTES`): actualizados post-Etapa 2
