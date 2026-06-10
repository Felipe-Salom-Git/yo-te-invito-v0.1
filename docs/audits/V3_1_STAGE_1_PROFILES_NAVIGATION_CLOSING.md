# V3.1 Etapa 1 — Limpieza `/profiles` + navegación por rol

**Fecha:** 2026-06-10  
**Estado:** Cerrado con observaciones (QA manual browser pendiente en entornos con credenciales reales)

---

## 1. Objetivo

Desactivar el flujo viejo de selección/solicitud de perfiles en `/profiles`, unificar navegación por rol (sidebar + menú usuario + post-login) y priorizar panel Admin para usuarios `ADMIN` (salvo cuenta maestro documentada).

---

## 2. Slices ejecutados

| Slice | Commit | Resumen |
| ----- | ------ | ------- |
| 1.1 | `fix(web): deprecate profiles route with role redirects` | `/profiles` → redirect por rol; helper `rolePortalHome.ts` |
| 1.2 | `fix(web): remove legacy profile request entrypoints` | CTAs solicitar perfil; rutas `/cuenta/solicitar-*` → redirect |
| 1.3 | `fix(web): scope portal sidebars by role` | Menú usuario/mobile por rol; `PortalLayoutShell` sin cambio (ya scoped) |
| 1.4 | `fix(web): redirect users to role portal after login` | Login credentials + OAuth vía `resolvePostLoginHref` |
| 1.5 | `fix(web): prioritize admin portal navigation` | `/me` bloqueado para ADMIN; menú admin reducido |
| 1.6 | `docs: close v31 stage 1 profiles navigation` | Este documento + checklist/context |

---

## 3. Cambios principales

### `/profiles`

- Ya no renderiza `ProfileSelector`.
- Usuario autenticado → `getPortalHomeHrefForUser(email, role)`.
- Sin sesión → `/login?callbackUrl=%2Fprofiles`.
- Sigue existiendo como **router de rol** (útil para OAuth cuando aún no hay JWT en cliente).

### CTAs legacy

- Eliminados «Solicitar perfil» en `/me/account`, `MeAccountProfiles`, hotel/referrer vacíos.
- `/cuenta/solicitar-*` → `LegacyProfileApplyRedirect` (`/register` o `/me/account`).
- Footer «Mi portal» → `/me` (auth).

### Sidebars

- Sin mezcla en portales normales: cada layout usa `portalKey` único en `PortalLayoutShell`.
- **Excepción maestro:** `MASTER_USER_EMAIL` mantiene `MasterPortalSidebar` / acordeón multi-vertical.

### Redirects post-login

| Rol | Destino |
| --- | ------- |
| ADMIN | `/admin` |
| PRODUCER_OWNER / PRODUCER_STAFF | `/producer` |
| GASTRO_OWNER | `/gastro` |
| HOTEL_OWNER | `/hotel` |
| REFERRER | `/referrer` |
| SCANNER | `NEXT_PUBLIC_SCANNER_APP_URL` o `scanner.yoteinvito.club/door` |
| USER | `/me` |
| Maestro (cualquier rol) | `/me` |

Prioridad documentada cuando hay un solo `User.role` en JWT.

`callbackUrl` seguro se respeta; `/profiles` no se acepta como callback.

### ADMIN y `/me`

- ADMIN no maestro: acceso a `/me/*` redirige a `/admin`.
- Menú navbar: «Panel admin» + cerrar sesión (sin tickets/carro destacados).
- Notificaciones comprador ocultas en navbar para ADMIN no maestro.

---

## 4. Rutas revisadas

- `/profiles`, `/login`, `/register`
- `/me/*`, `/admin/*`, `/producer/*`, `/gastro/*`, `/hotel/*`, `/referrer/*`
- `/cuenta/solicitar-*` (legacy redirect)
- Navbar, footer quick links, `ProfileProtectedLayout`

---

## 5. Matriz QA (documentada — validar en browser con cuentas reales)

| Rol | Login → | `/profiles` directo | Portal sidebar | Menú usuario |
| --- | ------- | ------------------- | -------------- | ------------ |
| USER | `/me` | → `/me` | Solo `/me` | Mi espacio + tickets + cuenta |
| ADMIN | `/admin` | → `/admin` | Solo `/admin` | Panel admin |
| PRODUCER | `/producer` | → `/producer` | Solo productora | Panel productora |
| GASTRO | `/gastro` | → `/gastro` | Solo gastro | Panel gastronómico |
| HOTEL | `/hotel` | → `/hotel` | Solo hotel | Panel hotel |
| REFERRER | `/referrer` | → `/referrer` | Solo referido | Panel referido |
| Maestro | `/me` | → `/me` | Multi-portal acordeón | Inicio del portal + menú completo |

Build: `pnpm --filter web run build` — OK (2026-06-10).

---

## 6. Excepción usuario maestro

`felipe.e.salom@gmail.com` (`MASTER_USER_EMAIL`):

- Entrada en `/me`.
- Sidebar acordeón con todas las verticales en cualquier portal.
- Puede usar `/me` aunque sea `ADMIN`.

---

## 7. Pendientes / riesgos

| Ítem | Notas |
| ---- | ----- |
| QA manual browser por rol | Ejecutar con `DEVELOPER_USERS.md` en staging/prod |
| Endpoints API `POST /profiles/*/apply` | Siguen vivos; sin CTA en UI — deprecación backend opcional |
| Usuario con múltiples perfiles comerciales y rol `USER` | JWT trae un solo rol; portales secundarios vía `/me/account` si `hasAccess` |
| Docs históricos (`NAVBAR_RESPONSIVE_AUDIT`, footer audits) | Mencionan `/profiles` selector — no actualizados en esta etapa |
| SCANNER role | Redirect a PWA externa; sin layout portal propio en web |

---

## 8. Comandos ejecutados

```bash
pnpm --filter web run build
```

(`apps/web` no define script `lint` propio; Next build incluye typecheck.)

---

## 9. Archivos clave

- `apps/web/lib/navigation/rolePortalHome.ts`
- `apps/web/lib/navigation/userNavConfig.ts`
- `apps/web/app/(portal)/profiles/page.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(portal)/me/layout.tsx`
- `apps/web/components/auth/LegacyProfileApplyRedirect.tsx`
- `apps/web/components/auth/ProfileProtectedLayout.tsx`
