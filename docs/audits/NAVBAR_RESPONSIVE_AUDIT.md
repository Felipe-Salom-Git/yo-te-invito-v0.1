# Auditoría Navbar y Navegación Responsive

**Proyecto:** Yo Te Invito (`apps/web`)  
**Slice:** 1 — Auditoría (sin cambios funcionales)  
**Fecha:** 2026-05-23  
**Fuentes:** `docs/rules/*`, `docs/context/FRONTEND_CONTEXT.md`, `docs/context/PROJECT_CONTEXT.md`, código en `apps/web`

---

## 1. Resumen ejecutivo

El navbar público es un **único componente global** montado en `app/layout.tsx` y visible en **todas las rutas** (públicas, portales, auth y checkout). No existe menú hamburguesa ni variante mobile: en viewports pequeños los links públicos, el toggle de tema, notificaciones, carrito y login compiten en una sola fila horizontal, con **alto riesgo de overflow** y pérdida de accesibilidad a links clave.

Los portales usan **`PortalSidebar`** (scroll horizontal en mobile, columna sticky en `md+`), pero **no ocultan** el navbar global, generando **doble navegación** (navbar + sidebar + en `/me` un link «Volver al inicio»).

El carrito en navbar funciona con **dos fuentes**: `CartContext` + `localStorage` (`yti:cart`) para invitados y `useMeCart` → API para usuarios autenticados. Hay duplicación de enlaces (Mi Carro en barra y en dropdown; Admin en barra y dropdown).

**Riesgos principales antes de rediseñar:** overflow mobile, doble nav en portales, badge de carrito con posible parpadeo por hidratación, footer con link «Admin» visible sin rol, y deuda arquitectural del carrito invitado en `localStorage`.

**Validación técnica:** `pnpm lint` falla por errores TypeScript **preexistentes** en `web` y `scanner` (no introducidos por este slice). No existe script `pnpm typecheck` en el monorepo; `lint` ejecuta `tsc --noEmit` por proyecto.

---

## 2. Archivos/componentes revisados

| Área | Archivo | Rol | Observaciones |
|------|---------|-----|---------------|
| Layout raíz | `apps/web/app/layout.tsx` | Monta `Navbar` + `Footer` en todas las páginas | Sin excepciones por ruta |
| Navbar público | `apps/web/components/Navbar.tsx` | Links públicos + `NavbarUserMenu` | `sticky top-0 z-40`; sin breakpoints responsive |
| Menú usuario | `apps/web/components/NavbarUserMenu.tsx` | Auth, carrito, notificaciones, dropdown | `useMeCart`, `useCart`, `useMeNotificationsUnread` |
| Logo | `apps/web/components/brand/Logo.tsx` | Variante `navbar` (`h-20`) | Logo apunta a `/categorias` vía `CATEGORY_GATEWAY_PATH` |
| Tema | `apps/web/components/ThemeToggle.tsx` | Light/dark | Usa `localStorage` `yti:theme` (preferencia UI, no datos de negocio) |
| Footer | `apps/web/components/Footer.tsx` | Links secundarios | Incluye `/admin` sin guard de rol |
| Sidebar portales | `apps/web/components/layout/PortalSidebar.tsx` | Nav vertical/horizontal reutilizable | `md:sticky md:top-20`; scroll-x en mobile |
| Portal `/me` | `apps/web/app/(portal)/me/layout.tsx` | `NAV` + auth redirect | 7 ítems; «← Volver al inicio» → `/home` |
| Portal admin | `apps/web/app/(portal)/admin/layout.tsx` | 14 ítems + `ProfileProtectedLayout` | Lista larga en scroll horizontal mobile |
| Portal producer | `apps/web/app/(portal)/producer/layout.tsx` | 6 ítems | Roles + `requiredProfile="producer"` |
| Portal gastro | `apps/web/app/(portal)/gastro/layout.tsx` | 6 ítems | |
| Portal hotel | `apps/web/app/(portal)/hotel/layout.tsx` | 3 ítems | |
| Portal referrer | `apps/web/app/(portal)/referrer/layout.tsx` | 3 ítems | Sin ítem explícito «métricas» o payouts |
| Portal wrapper | `apps/web/app/(portal)/layout.tsx` | `ProtectedLayout` genérico | Cualquier usuario autenticado |
| Legacy cuenta | `apps/web/app/(portal)/cuenta/layout.tsx` | Contenedor mínimo | Sin sidebar; redirects a `/me/*` |
| Perfiles | `apps/web/app/(portal)/profiles/page.tsx` | Selector multi-portal | Acceso desde dropdown «Cambiar perfil» |
| Perfiles UI | `apps/web/components/account/ProfileSelector.tsx` | Cards por vertical | `PROFILE_OPTIONS` en `lib/account/profile-options.ts` |
| Auth guard | `apps/web/components/auth/ProtectedLayout.tsx` | Redirect login | |
| Auth perfil | `apps/web/components/auth/ProfileProtectedLayout.tsx` | Rol o `availableProfiles` | Sin acceso → `/profiles` |
| Carrito invitado | `apps/web/context/CartContext.tsx` | Estado + `localStorage` `yti:cart` | No ApiRepository |
| Carrito API | `apps/web/lib/query/me-portal.ts` | `useMeCart`, mutaciones | `itemCount` en respuesta |
| Sesión | `apps/web/hooks/useRole.ts` | NextAuth session + `hasRole` | |
| Redirect roles | `apps/web/lib/roleRedirect.ts` | `getDashboardForRole` | **No usado** en navbar actual |
| Gateway config | `apps/web/lib/home/categoryGatewayConfig.ts` | Logo → `/categorias`; tiles → `/categoria/{id}` | Ciudad fija `BARILOCHE` en copy |
| Gateway UI | `apps/web/components/category-gateway/*` | Pantalla editorial | Footer propio `/home`, `/explore` |
| Providers | `apps/web/app/providers.tsx` | `CartProvider`, Query, Session | |
| Logout | `apps/web/app/(auth)/logout/page.tsx` | `signOut` → `/home` | Texto «Signing out…» en inglés |
| UI overlay | `apps/web/components/ui/SideSheet.tsx` | Panel lateral reutilizable | No usado en navbar; referencia para mobile futuro |
| Público layout | `apps/web/app/(public)/layout.tsx` | Passthrough | No oculta navbar |
| Explore ciudad | `apps/web/components/explore/ExplorePageContent.tsx` | Filtro `city` en página | **No** en navbar |
| E2E navbar | `e2e/notifications.spec.ts` | Badge notificaciones en navbar | |
| E2E portal | `e2e/user-portal.spec.ts` | Navegación sidebar `Menú del portal` | |

**No encontrado en el repo:** `MobileNav`, `NavbarCitySelector`, `CartNavbarButton`, menú hamburguesa, layout que oculte el navbar en portales.

---

## 3. Navbar público actual

### Desktop (≥ ~1024px, comportamiento efectivo)

**Estado actual**

- Barra `sticky top-0 z-40`, altura `h-16 sm:h-20`, `max-w-6xl`, fondo degradado negro + `backdrop-blur`.
- Izquierda: logo `variant="navbar"` + texto → `/categorias`.
- Derecha (`flex gap-2 sm:gap-6`): `ThemeToggle`, **Eventos** (`/home`), **Explorar** (`/explore`), **Referidores** (`/referrers`), **Admin** (solo `role === 'ADMIN'`), bloque `NavbarUserMenu`.
- `NavbarUserMenu` (logueado): link **Notificaciones** (`/me/notifications`) con badge, **Mi Carro** con badge, botón email → dropdown.
- Dropdown: Cambiar perfil, Administración (admin), Inicio, Mi Carro, Mis tickets, Mis pedidos, Sign out.
- Deslogueado: Registrarse, Iniciar sesión.

**Problemas**

- No hay link textual a **Categorías** (`/categorias`) ni a landings por vertical (`/categoria/*`).
- **Admin** duplicado (link en barra + ítem en dropdown).
- **Mi Carro** duplicado (link visible + ítem en dropdown).
- **Sign out** en inglés; resto del UI en español.
- `getDashboardForRole` no se usa: usuarios productor/gastro no tienen atajo directo al portal desde el menú (solo vía `/profiles`).
- Footer global muestra **Admin** a todos los visitantes.

**Riesgos al tocar**

- `Navbar.tsx`: bajo — solo estructura/links.
- `NavbarUserMenu.tsx`: medio — carrito, notificaciones, auth; regresiones en badge y rutas.
- Condicional `role === 'ADMIN'`: medio — alinear con `hasRole` y perfiles.

### Tablet (~640px–1023px, Tailwind `sm`/`md` sin ocultar links)

**Breakpoints relevantes**

- Tailwind por defecto: `sm` 640px, `md` 768px, `lg` 1024px (sin overrides en `tailwind.config.ts`).
- Navbar aplica `sm:h-20`, `sm:gap-6`, `sm:px-4` pero **no oculta** ningún link.

**Estado actual**

- Misma fila que desktop con más compresión; logo sigue `h-20` (grande).
- Bloque derecho puede incluir 5–8 controles visibles (tema + 3 links + notificaciones + carrito + auth/dropdown).

**Problemas**

- Probable **overflow horizontal** o solapamiento del email truncado (`max-w-[120px]`) con badges.
- Sin menú colapsado: no hay `hidden md:flex` ni drawer.
- Sticky `z-40` compite con sidebars portal `md:top-20` (alineado) pero no con CTAs fijos de fichas (`z-40` también).

**Recomendación futura**

- Colapsar links públicos en drawer desde `md` o `lg`.
- Reducir logo en `< sm` o usar `variant="icon"`.
- Iconificar carrito/notificaciones con `aria-label`.

**Riesgos**

- Medio: cualquier `hidden` mal aplicado puede ocultar rutas críticas en tablet.

### Mobile (< 640px)

**Estado actual**

- **Sin hamburguesa** ni `SideSheet` de navegación.
- Todos los links públicos permanecen en DOM (texto completo).
- `NavbarUserMenu` añade hasta 3 controles extra si hay sesión.
- Logo alto (`h-20`) consume ancho vertical y horizontal.

**Problemas críticos**

- **Overflow / links inaccesibles** sin scroll horizontal en el nav (el `<nav>` no define `overflow-x-auto`).
- Botones con `py-1.5` y texto — área táctil **por debajo** de ~44px recomendado en varios ítems.
- Usuario logueado: difícil llegar a **Explorar** o **Referidores** si la fila desborda.
- No hay cierre con Escape ni focus trap (no aplica sin drawer); dropdown usuario solo cierra con click outside.

**Problemas menores**

- Loading auth muestra «…» sin `aria-live`.
- `ThemeToggle` retorna `null` hasta mount → posible salto de layout.

**Riesgos UX**

- Alta frustración en compra mobile (carrito puede quedar fuera de vista).
- Conflicto visual con **sticky CTAs** de evento/rental (`fixed bottom-0 z-40`) — navbar arriba, CTA abajo (aceptable) pero doble chrome en portales.

---

## 4. Menú de usuario/login

**Estado actual**

| Estado | UI |
|--------|-----|
| `status === 'loading'` | Texto «…» |
| Deslogueado | Registrarse (`/register`), Iniciar sesión (`/login`) |
| Logueado | Notificaciones, Mi Carro, dropdown email |

**Links actuales (dropdown, logueado)**

| Link | Ruta | Notas |
|------|------|-------|
| Cambiar perfil | `/profiles` | Selector multi-portal |
| Administración | `/admin` | Solo admin; duplica link navbar |
| Inicio | `/me` | Portal usuario |
| Mi Carro | `/me/cart` | Duplica link exterior |
| Mis tickets | `/me/tickets` | |
| Mis pedidos | `/me/orders` | Fuera del menú principal `/me` según docs |
| Sign out | `/logout` | Página hace `signOut` |

**Links por rol**

- Link **Admin** en navbar: `role === 'ADMIN'` (string), no `hasRole(Role.ADMIN)`.
- Dropdown Administración: `hasRole(Role.ADMIN)`.
- No hay entradas directas a `/producer`, `/gastro`, `/hotel`, `/referrer` (correcto si se usa `/profiles`; sobrecarga el flujo).

**Problemas detectados**

- Menú **sobrecargado** vs propuesta futura (Inicio portal, Mis tickets, Mi cuenta, Cerrar sesión).
- **Inglés** en Sign out y página logout.
- **Mis pedidos** expuesto en navbar pero no en sidebar `/me`.
- No usa `getDashboardForRole` para «Inicio» contextual.
- Rutas legacy `/cuenta/*` no aparecen en menú (bien); solicitudes de rol siguen en `/cuenta/solicitar-*`.

**Recomendación para slice futuro**

- Simplificar dropdown a: portal home según rol/perfil activo, Mis tickets, Mi cuenta (`/me/account`), Cerrar sesión (español).
- Mover notificaciones solo a icono+badge o al portal `/me`.
- Unificar acceso admin: solo dropdown o solo navbar, no ambos.
- Mantener `/profiles` como «Cambiar perfil» para multi-vertical.

---

## 5. Carrito en navbar

**Estado actual**

- Botón **Mi Carro** siempre visible (invitado y logueado).
- Badge numérico si `totalItems > 0`.
- `cartHref`: autenticado → `/me/cart`; invitado → `/checkout`.

**Fuente de datos**

| Usuario | Fuente | Implementación |
|---------|--------|----------------|
| Invitado | `useCart().totalItems` | `CartContext` persiste en `localStorage` (`yti:cart`) |
| Logueado | `useMeCart().data?.itemCount` | TanStack Query → `repos.mePortal.getCart()` |

**Comportamiento invitado**

- Carrito solo en cliente; SSR no muestra cantidad inicial.
- Checkout público en `/checkout` alineado con `cartHref`.

**Comportamiento usuario logueado**

- Conteo desde API; coherente con portal `/me/cart`.
- Documentación (`USER_PORTAL.md`) indica checkout autenticado vía `/me/cart`, no `/checkout`.

**Problemas detectados**

- **Doble modelo** invitado (localStorage) vs logueado (API) — riesgo de confusión si el usuario inicia sesión sin migrar ítems (comportamiento a validar en slice carrito).
- **Hidratación / parpadeo**: invitado carga cart en `useState(loadCart)` en cliente; badge puede aparecer tras primer paint.
- Invitado: `useMeCart(false)` no corre; correcto.
- Link sin `aria-label` descriptivo (solo texto «Mi Carro»).
- No hay icono compacto para mobile.

**Recomendación slice futuro**

- Extraer `CartNavbarButton` con props `variant="icon|label"`, fuente unificada vía hook `useNavbarCartCount()` que encapsule la bifurcación guest/API.
- Documentar política de merge al login.
- Evitar ampliar uso de `localStorage` más allá del guest cart existente sin plan explícito.

---

## 6. Navegación de portales

En todos los portales el **navbar global permanece visible**. El layout de portal añade `PortalSidebar` debajo (sin offset top en el contenedor principal; el sidebar usa `md:top-20` para sticky).

### `/me`

| Aspecto | Detalle |
|---------|---------|
| Desktop | Sidebar vertical 7 ítems; contenido a la derecha |
| Mobile | Sidebar **horizontal** `overflow-x-auto`; 7 tabs |
| Navbar público | Sigue visible; duplica Notificaciones y Mi Carro |
| Extra | Link «← Volver al inicio» → `/home` |

**Ítems sidebar:** Inicio, Mis tickets, Mi Carro, Preferencias, Actividad, Notificaciones, Mi cuenta — **alineado con docs**.

**Problemas:** triple vía a carrito/notificaciones (navbar ×2 + sidebar). En mobile, 7 pills + navbar = mucho chrome.

**Riesgo:** alto en mobile UX; medio al refactorizar solo sidebar sin tocar navbar.

**Recomendación:** En slice portal mobile, ocultar o simplificar navbar en rutas `/me/*` o deduplicar ítems del navbar global.

### `/producer`

| Desktop | Sidebar: Dashboard, Perfil, Eventos, Comentarios, Referidos, Payouts |
| Mobile | Scroll horizontal mismos ítems |
| Navbar | Completo + `/profiles` para cambio de perfil |

**Problemas:** doble nav; sin link rápido a ticket studio desde sidebar (ruta anidada bajo eventos).

**Riesgo:** medio.

**Recomendación:** `MobilePortalNav` compartido; considerar ocultar links públicos del navbar en `/producer/*`.

### `/admin`

| Desktop | 14 ítems operativos (eventos, auditoría, reputación, disputas, productoras, publicaciones, gastronómicos, excursiones, rentals, payouts, usuarios, tickets, contactos, subcategorías) |
| Mobile | Scroll horizontal largo — fácil perder ítems fuera de viewport |

**Problemas:** lista extensa; rutas críticas (usuarios, eventos) pueden quedar fuera de pantalla sin indicador de scroll.

**Riesgo:** alto en mobile para operaciones.

**Recomendación:** agrupar en secciones, drawer mobile, o nav secundaria por módulo; no duplicar Admin en navbar si ya está en portal.

### `/gastro`

| Ítems | Dashboard, Mi local, Contenido, Descuentos, Resumen descuentos, Valoraciones |
| Mobile | Scroll horizontal |

**Problemas:** doble nav; label «Resumen descuentos» vs expectativa «Validaciones».

**Riesgo:** medio.

### `/hotel`

| Ítems | Mi establecimiento, Editar ficha, Valoraciones |
| Mobile | Scroll horizontal |

**Problemas:** doble nav; dashboard y ficha pueden solaparse conceptualmente.

**Riesgo:** bajo–medio.

### `/referrer`

| Ítems sidebar | Dashboard (`/referrer`), Eventos (`/referrer/eventos`), Configuración (`/referrer/configuracion`) |
| No en sidebar | Métricas detalladas, propuestas/acuerdos, solicitudes de pago — pueden vivir **dentro** del dashboard (`ReferrerPortalPageClient`) |

**Problemas:** expectativa de slice menciona métricas y payouts como nav; hoy no hay ítems dedicados.

**Riesgo:** medio para descubrimiento de features en mobile.

**Recomendación:** auditar dashboard antes de añadir ítems; evitar inflar sidebar sin jerarquía.

---

## 7. Accesibilidad

Checklist:

- [ ] **aria-labels** — Parcial: logo «Elegir categoría», ThemeToggle, link Eventos; faltan Mi Carro, botón menú usuario, notificaciones (solo texto visible).
- [x] **aria-expanded** — Dropdown usuario: `aria-expanded`, `aria-haspopup`.
- [x] **foco visible** — ThemeToggle tiene `focus:ring`; links navbar dependen de estilos globales.
- [ ] **teclado** — Dropdown no documenta flechas; sin roving tabindex.
- [ ] **Escape** — Dropdown **no** cierra con Escape.
- [x] **click outside** — `mousedown` en `document` cierra dropdown.
- [x] **contraste** — Dark premium + acento verde en badges; ThemeToggle light mode vía `data-theme`.
- [ ] **tamaño táctil** — Varios controles ~32px altura (`py-1.5`); por debajo de 44px en mobile.

**Observaciones concretas**

- Navbar root: `role="navigation"` `aria-label="Menú principal"` — correcto.
- Portal sidebar: `aria-label="Menú del portal"`.
- Dropdown sin `role="menu"` / `menuitem` en links.
- `SideSheet` (no usado en nav) tiene `role="dialog"` `aria-modal` — buen patrón para mobile futuro.
- Footer Admin sin `aria-hidden` para usuarios no admin.

---

## 8. Problemas críticos detectados

| Prioridad | Problema | Ruta/componente | Impacto | Recomendación |
|-----------|----------|-----------------|---------|---------------|
| Alta | Sin menú mobile; todos los links en una fila | `Navbar.tsx` | Links ilegibles o inaccesibles en mobile | Slice menú mobile público + ocultar links en `< md` |
| Alta | Doble (triple en `/me`) navegación portal + navbar | `app/layout.tsx` + `PortalSidebar` | Chrome excesivo, duplicación carrito/notificaciones | Layout condicional o navbar contextual por segmento |
| Alta | Overflow horizontal probable en navbar mobile | `Navbar.tsx`, `NavbarUserMenu.tsx` | UX rota en 320–390px | Drawer + iconos; `overflow-x-auto` solo como parche |
| Media | Carrito invitado en `localStorage` vs API logueado | `CartContext.tsx`, `NavbarUserMenu.tsx` | Conteos inconsistentes al login | Hook unificado + política merge documentada |
| Media | Badge carrito/notificaciones post-hidratación | `NavbarUserMenu.tsx` | Parpadeo visual | SSR-safe placeholder o suprimir badge hasta mounted |
| Media | Footer expone `/admin` sin auth | `Footer.tsx` | Confusión; superficie innecesaria | Ocultar por rol o quitar |
| Media | Admin sidebar 14 ítems en scroll-x mobile | `admin/layout.tsx` | Rutas operativas ocultas | MobilePortalNav agrupado |
| Media | Sin Escape en dropdown usuario | `NavbarUserMenu.tsx` | Accesibilidad teclado | `useEffect` keydown Escape |
| Baja | Sign out / logout en inglés | `NavbarUserMenu.tsx`, `logout/page.tsx` | Inconsistencia i18n | Copiar en español |
| Baja | Admin y Mi Carro duplicados | Navbar + dropdown | Ruido visual | Simplificar menú slice 2 |
| Baja | `getDashboardForRole` sin uso | `roleRedirect.ts` | Perdida oportunidad atajo portal | Integrar en menú simplificado |

---

## 9. Recomendación de arquitectura para próximos slices

**Conservar**

- `PortalSidebar` como base desktop y scroll-x mobile temporal.
- `NavbarUserMenu` como contenedor de auth/carrito (refactor interno).
- `categoryGatewayConfig.ts` para rutas logo/categorías.
- `ProfileProtectedLayout` / `ProtectedLayout`.
- `useMeCart` + `useMeNotificationsUnread` (patrón Query → Repository).

**Dividir**

- `Navbar.tsx` → `PublicNavLinks`, `NavbarActions` (tema + auth).
- Extraer dropdown a `UserAccountMenu.tsx` con menú declarativo por config.
- Badge logic → `useNavbarCartCount()` / `useNavbarNotificationCount()`.

**Crear (propuesto, no implementar aún)**

| Componente | Motivo |
|------------|--------|
| `MobilePublicNav` | Drawer/`SideSheet` con links públicos + auth en `< lg` |
| `MobilePortalNav` | Drawer opcional para portales con muchos ítems (admin) |
| `CartNavbarButton` | Icono + badge + `aria-label`; reutilizable |
| `NavbarCitySelector` | Solo si producto confirma multi-ciudad; hoy ciudad en explore URL y copy fijo Bariloche |
| `lib/navigation/*.ts` | Config central: `PUBLIC_NAV`, `USER_MENU_LINKS`, `PORTAL_NAV` por clave |

**Layout**

- Evaluar `app/(portal)/layout.tsx` que renderice navbar reducido (logo + cerrar sesión) o sin links públicos.
- No duplicar ítems entre navbar y `PortalSidebar`.

---

## 10. Plan sugerido de slices siguientes

1. **Definir estructura final navbar público** — IA/links, logo, breakpoints, qué ocultar en portales.
2. **Simplificar menú de usuario** — 4 ítems + perfiles; español; quitar duplicados.
3. **Carrito + badge** — `CartNavbarButton`, hook conteo, política guest→auth.
4. **Selector ciudad** — Solo si negocio prioriza; si no, dejar filtro en `/explore`.
5. **Menú mobile público** — `MobilePublicNav` + SideSheet; bloqueo scroll.
6. **Menú mobile contextual portales** — Admin prioritario; opcional otros portales.
7. **Accesibilidad** — Escape, aria-labels, táctil 44px, roles menú.
8. **Smoke visual** — Checklist §11 en staging/local.

---

## 11. Smoke manual recomendado

**Precondiciones:** `pnpm db:up`, `pnpm db:migrate`, `pnpm run -w dev`, usuario en `docs/guides/DEVELOPER_USERS.md`. Para rutas dinámicas, tomar IDs desde `/home`, `/explore` o cards (`a[href*="/events/"]` en E2E).

### Públicas

| Ruta | Qué validar |
|------|-------------|
| `/home` | Navbar completo; rails no tapados por sticky; scroll |
| `/explore` | Navbar + filtros página (ciudad no en navbar) |
| `/categoria/event` | Navbar; carruseles |
| `/categoria/gastro` | Idem |
| `/categoria/rental` | Idem |
| `/categoria/excursion` | Idem |
| `/categoria/hotel` | 404 esperado según contexto |
| `/events/[id]` | Carrito invitado; sticky CTA mobile no tapa checkout |
| `/restaurants/[id]` | Sin ticketera; navbar |
| `/rentals/[id]` | Sticky CTA `lg:hidden` + navbar `z-40` |
| `/excursiones/[id]` | Navbar |
| `/hoteles` | Próximamente |
| `/hoteles/[id]` | ID = `publicEventId` del perfil hotel (ver `e2e/hotel.spec.ts`) |
| `/checkout` | Mi Carro invitado → esta ruta; badge |

### Portales (usuario con rol adecuado)

| Ruta | Qué validar |
|------|-------------|
| `/me` | Sidebar 7 ítems; navbar duplicados |
| `/me/cart` | Conteo API vs navbar |
| `/me/tickets` | Acceso sidebar + menú usuario |
| `/me/notifications` | Badge navbar vs bandeja |
| `/producer` | Sidebar 6; acceso perfil |
| `/producer/events` | Nav activo |
| `/admin` | Scroll sidebar mobile |
| `/admin/eventos` | Ítem activo |
| `/admin/usuarios` | |
| `/gastro` | 6 ítems |
| `/hotel` | 3 ítems |
| `/referrer` | Dashboard + métricas in-page |

### Viewports

- 390×844 (mobile), 768×1024 (tablet), 1280×800 (desktop).

### Automatizado existente

- `pnpm e2e:portal` — navegación sidebar `/me`.
- `pnpm e2e:notifications` — link y badge Notificaciones en navbar.

---

## 12. Conclusión

La navegación actual es **funcional en desktop** pero **no está diseñada para mobile**: falta colapso, el navbar global compite con sidebars de portal, y el menú de usuario concentra demasiados enlaces duplicados. Antes de rediseño visual conviene acordar **navbar contextual por segmento** (`(public)` vs `(portal)`), **config central de links** y **componentes mobile dedicados**, sin tocar contratos API.

**Próximo slice recomendado (post–Slice 6):** **Slice 7 — Navegación mobile contextual de portales** (fuera de alcance Slice 6).

---

## Avance Slice 6 — Menú mobile público

**Fecha:** 2026-05-23

### Estructura mobile

```txt
[ Logo ]                    [ Mi Carro ] [ ☰ Menú ]
```

- Links públicos y cuenta solo dentro del **drawer** (`md:hidden`).
- Desktop (`md+`) sin cambios: home, Explorar, ciudad, tema, carrito, menú usuario dropdown.
- `NavbarUserMenu` oculto en `< md`; auth en drawer.

### Links incluidos

**Públicos** (`getMobilePublicNavDrawerItems` / `publicNavConfig`):

- Inicio / Categorías → `/categorias`
- Explorar → `/explore`
- Eventos, Gastronomía, Equipos y rentals, Excursiones → `/categoria/*`
- Hoteles — Próximamente (no navegable)

**Ciudad:** selector en drawer (`NavbarCitySelectField`).

**Cuenta logueada:** Portal / Cambiar perfil, Mis tickets, Mi cuenta, Cerrar sesión.

**Invitado:** Iniciar sesión, Crear cuenta.

Referidores **no** están en el drawer (solo desktop futuro / footer).

### Comportamiento apertura/cierre

- Panel derecho + overlay `bg-black/60`; `body overflow: hidden` con cleanup.
- Cierra: link navegado, overlay, botón ✕, tecla Escape, toggle ☰.
- `aria-expanded`, `aria-label` abrir/cerrar, `role="dialog"`.

### Archivos

| Archivo | Acción |
|---------|--------|
| `components/navigation/MobilePublicNavDrawer.tsx` | Nuevo |
| `components/navigation/NavbarMobileNav.tsx` | Nuevo |
| `components/navigation/NavbarCitySelectField.tsx` | Nuevo (compartido desktop/drawer) |
| `components/navigation/NavbarCitySelector.tsx` | Refactor desktop wrapper |
| `components/Navbar.tsx` | Integración mobile |
| `components/NavbarUserMenu.tsx` | Solo `md+` |
| `lib/navigation/publicNavConfig.ts` | Orden drawer + labels |
| `components/navbar/NavbarMobileMenuPlaceholder.tsx` | Eliminado |

### Pendientes

| Slice | Pendiente |
|-------|-----------|
| 7+ | `MobilePortalNav` — nav contextual en `/me`, `/admin`, etc. sin mezclar con drawer público |
| 7 | Accesibilidad fina (focus trap, roles menú) |

### Validación Slice 6

- `pnpm nx run web:lint`: errores TS preexistentes; sin errores en archivos del slice.

---

## Avance Slice 5 — Selector ciudad navbar

**Fecha:** 2026-05-23

### Fuente de ciudades usada

| Capa | Uso |
|------|-----|
| Catálogo producto | `PROVINCE_CITY_CATALOG` (`lib/me/preferred-cities.ts`) — provincias Río Negro / Neuquén |
| Disponibilidad | `repos.events.search` → `meta.total > 0` por ciudad del catálogo (sin endpoint nuevo) |
| Ampliación | Muestra de hasta 100 ítems en búsqueda amplia por categoría — ciudades extra agrupadas en «Ciudades» |

**Deuda técnica:** `GET /public/events/cities?tenantId&category` evitaría N probes y nombres exactos en BD vs catálogo (p. ej. «San Carlos de Bariloche» vs «Bariloche»).

### Comportamiento por ruta

| Ruta | Selector | Al elegir ciudad |
|------|----------|------------------|
| `/explore` | Visible (`md+`) | `router.replace` — conserva `q`, `category`, `subcategoryId`, fechas; resetea `page`; setea `city` |
| `/categoria/[category]` | Visible | Navega a `/explore?category={cat}&city={city}` (`getCategoryExploreHref`) |
| `/home`, `/` | Visible | Navega a `/explore?city={city}` |
| Otras | Visible si hay ciudades | `/explore?city=` (o con `category` si aplica) |
| Sin contenido / error API | Oculto | No rompe navbar |

«Todas las ciudades» → quita `city` del query en explore.

### Limitaciones

- Solo visible desde `md` (evita overflow mobile hasta Slice 6).
- Ciudades del catálogo con nombre distinto al de BD pueden no aparecer aunque haya eventos.
- Búsqueda amplia limitada a 100 eventos — ciudades raras pueden faltar hasta endpoint dedicado.
- Eventos no tienen `province` en schema — agrupación viene del catálogo, no de la API.

### Archivos

| Archivo | Acción |
|---------|--------|
| `components/navigation/NavbarCitySelector.tsx` | Nuevo |
| `components/navbar/NavbarCitySlot.tsx` | Integra selector + Suspense |
| `hooks/useNavbarCitySelection.ts` | Nuevo |
| `lib/query/navbar-cities.ts` | Nuevo |
| `lib/navigation/navbarCityConfig.ts` | Nuevo |
| `lib/navigation/groupCitiesByProvince.ts` | Nuevo |
| `lib/query/keys.ts` | `navbarCityKeys` |
| `lib/categories/categoryLandingConfig.ts` | `getCategoryExploreHref` + `city` |

### Validación Slice 5

- `pnpm nx run web:lint`: falla por errores TS preexistentes; sin errores en archivos del slice.

---

## Avance Slice 4 — Carro navbar

**Fecha:** 2026-05-23

### Fuente invitado

- `useCart()` → `CartContext` / `localStorage` (`yti:cart`) — sin cambios de contrato.
- Badge solo después de `hydrated` (client mount) para evitar mismatch SSR.

### Fuente logueado

- `useMeCart(enabled)` → API `repos.mePortal.getCart()` → `itemCount`.
- Badge solo cuando `!cartQuery.isPending`; en error API → sin badge (navbar estable).

### Destinos

| Estado | Href |
|--------|------|
| Invitado / sesión pendiente | `/checkout` |
| Autenticado | `/me/cart` |

### Badge

- Visible solo si `count > 0` y conteo resuelto (`showBadge`).
- Sin número durante `status === 'loading'` o mientras `useMeCart` está `isPending`.
- `aria-label`: «Abrir carro» / «Abrir carro con N ítems».
- Display: número exacto hasta 99, luego `99+`.

### Archivos

| Archivo | Acción |
|---------|--------|
| `apps/web/hooks/useNavbarCart.ts` | Nuevo |
| `apps/web/components/navbar/NavbarCartButton.tsx` | Nuevo |
| `apps/web/components/Navbar.tsx` | Monta `NavbarCartButton` fuera del menú usuario |
| `apps/web/components/NavbarUserMenu.tsx` | Quita carrito (siempre visible vía botón dedicado) |

### Pendientes

| Slice | Pendiente |
|-------|-----------|
| — | Migrar carrito invitado → API al login (fuera de alcance) |
| 5 | Selector ciudad |
| 6 | Drawer mobile |

### Validación Slice 4

- `pnpm nx run web:lint`: falla por errores TS preexistentes; sin errores en archivos del slice.

---

## Avance Slice 3 — Menú usuario/login

**Fecha:** 2026-05-23

### Cambios realizados

- Config `apps/web/lib/navigation/userNavConfig.ts` con los 4 ítems del menú logueado.
- Dropdown simplificado en `NavbarUserMenu.tsx`; eliminados Admin, Mi Carro, Mis pedidos, Inicio `/me`, «Cambiar perfil».
- Microcopy en español; página `/logout` → «Cerrando sesión…».
- Cierre del menú con Escape (mejora menor de accesibilidad).
- Deslogueado: «Crear cuenta» + «Iniciar sesión» / «Entrar» (mobile).

### Links finales del menú

| Estado | Ítem | Destino |
|--------|------|---------|
| Logueado | Inicio del portal | `/profiles` |
| Logueado | Mis tickets | `/me/tickets` |
| Logueado | Mi cuenta | `/me/account` |
| Logueado | Cerrar sesión | `/logout` → NextAuth `signOut` |
| Deslogueado | Crear cuenta | `/register` (visible `sm+`) |
| Deslogueado | Iniciar sesión | `/login` |

**Fuera del dropdown (barra):** `NavbarCartButton` (Slice 4), Notificaciones (`lg+`), sin duplicar en menú.

### Decisiones por rol

| Rol / necesidad | Acceso |
|-----------------|--------|
| Admin, productor, gastro, hotel, referrer | `/profiles` → `ProfileSelector` (sin cambios) |
| Comprador | `/profiles` → tarjeta «Mis Tickets» → `/me`; tickets/cuenta también en menú |
| Rutas `/admin`, `/producer`, etc. | Sin cambios; layouts y guards intactos |

### Pendientes

| Slice | Pendiente |
|-------|-----------|
| 4 | Extraer `CartNavbarButton` + hook conteo |
| 6 | Drawer mobile público |
| 7 | Roles menú / foco teclado completo |
| — | Notificaciones solo en barra (`lg+`); bandeja en `/me/notifications` y sidebar `/me` |

### Validación Slice 3

- `pnpm nx run web:lint`: falla por errores TS preexistentes; sin errores en `NavbarUserMenu.tsx` ni `userNavConfig.ts`.

---

## Avance Slice 2 — Arquitectura navbar público

**Fecha:** 2026-05-23

### Cambios realizados

- Config central `apps/web/lib/navigation/publicNavConfig.ts` (`PUBLIC_NAV_ITEMS`, `getDesktopPublicNavItems`, `getMobileMenuPublicNavItems`).
- Navbar modular: `NavbarHomeButton`, `NavbarPublicLinks`, `NavbarCitySlot`, `NavbarMobileMenuPlaceholder`.
- Desktop: logo → `/categorias`; botón compacto inicio (icono) → `/home`; **Explorar** como único link textual público destacado; tema solo `md+`.
- Mobile: logo compacto; sin links públicos en fila; carrito y cuenta con iconos + `aria-label`; espacio reservado para drawer (Slice 6); `overflow-x-hidden` en barra.
- Eliminados de la barra: «Eventos» textual, Referidores, Admin (admin sigue en dropdown de usuario).
- Categorías verticales, Referidores y Hoteles (próximamente) quedan en config `mobileMenu: true` para Slice 6.

### Archivos tocados

| Archivo | Acción |
|---------|--------|
| `apps/web/lib/navigation/publicNavConfig.ts` | Nuevo |
| `apps/web/components/navbar/NavbarHomeButton.tsx` | Nuevo |
| `apps/web/components/navbar/NavbarPublicLinks.tsx` | Nuevo |
| `apps/web/components/navbar/NavbarCitySlot.tsx` | Nuevo |
| `apps/web/components/navbar/NavbarMobileMenuPlaceholder.tsx` | Nuevo |
| `apps/web/components/Navbar.tsx` | Refactor |
| `apps/web/components/NavbarUserMenu.tsx` | Responsive / iconos (sin cambiar lógica carrito/API) |

### Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Logo | `/categorias` (gateway editorial) |
| Inicio compacto | `/home` (home operativa con rails) — reemplaza el antiguo link «Eventos» |
| Explorar | Visible solo desktop (`md+`), `emphasized` |
| Ciudad | `NavbarCitySelector` vía `NavbarCitySlot` — Slice 5 |
| Drawer mobile | Solo reserva de espacio — Slice 6 |
| Portales | Navegación mobile contextual — **Slice 7** |
| Admin en navbar | Quitado de barra (Slice 2); acceso vía `/profiles` (Slice 3) |

### Pendientes por slice

| Slice | Pendiente |
|-------|-----------|
| 3 | Simplificar menú usuario | **Hecho** (Slice 3) |
| 4 | `NavbarCartButton` + `useNavbarCart` | **Hecho** (Slice 4) |
| 5 | `NavbarCitySelector` real | **Hecho** (Slice 5) |
| 6 | Drawer mobile público | **Hecho** (Slice 6) |
| 7 | Navegación mobile portales | **Hecho** (Slice 7) |
| 8 | Accesibilidad navbar (roles menú) |
| 9 | Smoke visual multi-viewport |

### Validación Slice 2

- `pnpm nx run web:lint`: falla por errores TS **preexistentes** (rentals admin, gastro gallery, `registerPush`, etc.); **ningún error en archivos nuevos del navbar**.
- `pnpm lint` (monorepo): mismo conjunto + scanner.

---

## Anexo — Validación `pnpm lint` / typecheck

| Comando | Resultado | Notas |
|---------|-----------|-------|
| `pnpm lint` | **Falló** (exit 1) | Errores TS preexistentes |
| `pnpm typecheck` | **No existe** en `package.json` raíz | Equivalente parcial: `nx run web:lint` → `tsc --noEmit` |

**Errores resumidos (no introducidos por este slice):**

- `apps/scanner/app/door/page.tsx` — tipos `ScanHistoryItem` incompatibles.
- `apps/web` — rentals admin contact fields, `EmptyState` props, gastro gallery types, `ProducerReferralMetricsPanel` imports, `registerPush.ts` types.

**Motivo:** auditoría solo documentación; no corresponde corregir deuda ajena en Slice 1.

---

## Anexo — Mapa rápido navbar (post Slice 2)

**Desktop (`md+`):**

```
[ Logo → /categorias ] [ 🏠 → /home ] [ Explorar ] [ ciudad: slot ]     [ Tema ] [ Notif? ] [ Carro ] [ Usuario ▼ ]
```

**Menú usuario (logueado, post Slice 3):** Inicio del portal · Mis tickets · Mi cuenta · Cerrar sesión

**Mobile (post Slice 6):**

```
[ Logo ]                              [ Carro ] [ Menú ☰ ]
```

Navegación pública y cuenta dentro del drawer lateral derecho.

Enlaces secundarios (categorías, referidores, hoteles) → config `mobileMenu` → **Slice 6**.

---

## Avance Slice 7 — Navegación mobile de portales

**Fecha:** 2026-05-23

### Config por portal

- `apps/web/lib/navigation/portalNavConfig.ts` — ítems centralizados para `me`, `producer`, `admin`, `gastro`, `hotel`, `referrer`.
- Rutas alineadas con los layouts previos (sin rutas inventadas).
- `isPortalNavItemActive` + `PORTAL_INDEX_HREFS` evitan marcar el dashboard activo en rutas hijas (p. ej. `/producer/events` no activa `/producer`).

### Componente mobile creado

- `apps/web/components/portal/MobilePortalNav.tsx` — barra compacta (`md:hidden`) con título del portal, sección activa y botón «Menú».
- Drawer lateral derecho (portal en `document.body`): cierra al elegir link, al tocar backdrop, con **Escape**; `aria-expanded` / `aria-controls`.
- `/me`: enlace «← Volver al inicio público» en el pie del drawer (`showPublicHomeLink`); en desktop se mantiene el link sobre el contenido (`hidden md:inline-block`).

### Layouts integrados

- `apps/web/components/portal/PortalLayoutShell.tsx` — compone `MobilePortalNav` + `PortalSidebar`.
- `apps/web/components/layout/PortalSidebar.tsx` — sidebar solo desktop (`hidden md:block`); eliminado scroll horizontal mobile.
- Layouts actualizados: `app/(portal)/me|admin|producer|gastro|hotel|referrer/layout.tsx`.

### Rutas cubiertas

| Portal | Prefijo | Ítems (resumen) |
|--------|---------|-----------------|
| `/me` | 7 | Inicio, tickets, carro, preferencias, actividad, notificaciones, cuenta |
| `/producer` | 6 | Dashboard, perfil, eventos, comentarios, referidos, payouts |
| `/admin` | 14 | Dashboard, eventos, auditoría, reputación, disputas, verticales, payouts, usuarios, tickets, contactos, subcategorías |
| `/gastro` | 6 | Dashboard, local, contenido, descuentos, validaciones (resumen), valoraciones |
| `/hotel` | 3 | Establecimiento, editar, valoraciones |
| `/referrer` | 3 | Dashboard, eventos, configuración |

### Pendientes

| Tema | Notas |
|------|-------|
| Navbar global en portales | Sigue visible en mobile (navbar público + menú portal); reducción contextual del navbar en portales queda fuera de este slice |
| E2E mobile viewport | Tests actuales usan sidebar desktop (`md+`); en viewport &lt; `md` hay que abrir el drawer «Menú» antes de navegar |
| Slice 8 | Footer / link Admin | **Hecho** (Slice 8) |
| Slice 9 | Accesibilidad navegación | **Hecho** (Slice 9) |
| 10 | Smoke visual multi-viewport |

### Validación Slice 7

- `pnpm lint` / `pnpm nx run web:lint`: revisar salida; errores TS preexistentes fuera de archivos del slice.

---

## Avance Slice 8 — Footer / Admin link

**Fecha:** 2026-05-23

### Comportamiento anterior

- `apps/web/components/Footer.tsx` mostraba **Admin** (`/admin`) a todos los visitantes (logueados o no), sin comprobar rol.
- Duplicaba superficie de acceso ya retirada del navbar en Slice 2; el acceso legítimo para administradores está en `/profiles` → tarjeta Administración (`ProfileSelector`, solo `Role.ADMIN`).

### Corrección aplicada

- Eliminado el link **Admin** del footer global.
- Se mantiene el link público **Eventos** → `/home` (sin rediseño del footer).
- Envuelto en `<nav aria-label="Enlaces del sitio">` (mejora mínima de semántica).

### Decisión tomada

| Opción | Elección |
|--------|----------|
| Ocultar Admin solo si `Role.ADMIN` | No |
| **No mostrar Admin en footer público** | **Sí** — alineado con navbar (Slice 2) y menú usuario (Slice 3): portales y admin vía `/profiles` |

Los usuarios admin siguen entrando a `/admin` desde el selector de perfiles; las rutas y `ProfileProtectedLayout` no cambian.

### Deudas para bloque «Footer público completo»

| Tema | Notas |
|------|-------|
| Footer mínimo | Solo copyright, contacto opcional (`usePlatformConfig`) y un link «Eventos» |
| Sin legales | Términos, privacidad, ayuda — pendiente del bloque footer completo |
| Consistencia de copy | Footer dice «Eventos»; navbar usa «Inicio» para `/home` — unificar en bloque footer |
| Links públicos | Valorar `/explore`, `/categorias`, verticales — como `CategoryGatewayFooter` y `publicNavConfig` |
| Footer en portales | Mismo `Footer` en `app/layout.tsx` en todas las rutas (incl. portales) — evaluar ocultar o simplificar en bloque footer |
| `CategoryGatewayFooter` | Footer propio en gateway `/categorias` (Ir al inicio / Explorar todo) — no modificado en este slice |

### Validación Slice 8

- `pnpm nx run web:lint`: falla por errores TS **preexistentes**; sin errores en `Footer.tsx`.

---

## Avance Slice 9 — Accesibilidad navegación

**Fecha:** 2026-05-23

### Elementos revisados

| Área | Componente |
|------|------------|
| Navbar global | `Navbar.tsx`, logo, `NavbarHomeButton`, `NavbarPublicLinks`, `NavbarCitySlot` / `NavbarCitySelectField` |
| Carro | `NavbarCartButton`, `useNavbarCart` (`ariaLabel` con conteo) |
| Usuario | `NavbarUserMenu` (dropdown desktop) |
| Drawer público mobile | `NavbarMobileNav`, `MobilePublicNavDrawer` |
| Portal mobile | `MobilePortalNav` |
| Tema | `ThemeToggle` |
| Footer | `Footer.tsx` (link Eventos; Admin ya retirado en Slice 8) |

### Correcciones aplicadas

| Tema | Cambio |
|------|--------|
| `aria-label` | Home/casita, carro (con ítems), menú mobile público/portal, usuario, notificaciones, ciudad (`select` + `label`), tema, backdrop drawers |
| `aria-expanded` / `aria-controls` / `aria-haspopup` | Botones menú público, portal, dropdown usuario (`useId` + `menuId`) |
| Escape + click outside | Ya existían; mantenidos en dropdown y drawers |
| Trap de foco | `hooks/useOverlayA11y.ts` (`useFocusTrap`, `useReturnFocus`) en drawers público/portal y menú usuario |
| Foco visible | `lib/navigation/navA11yClasses.ts` — `navFocusRing` unificado (`focus-visible:ring-accent`) |
| Táctil mobile | `navTouchTarget` (`min-h-11` / `min-w-11` en `< md`) en carro, menú, cerrar, login, portal |
| Badge carrito / notif. | Conteo en `aria-label` del control; badge visual `aria-hidden` + `ring-1` para contraste |
| Idioma | Loading cuenta: «Cargando cuenta…»; logout page ya en español; menú usuario sin «Sign out» |
| Contraste select ciudad | `py-2.5`, `focus-visible:ring-2` |

### Pendientes conocidos

| Tema | Notas |
|------|-------|
| `inert` en `<main>` con overlay | No implementado; el trap de foco mitiga tab fuera del drawer |
| Auditoría WCAG formal | Contraste exacto (ratio) no medido con herramienta en este slice |
| Notificaciones en navbar | Solo `lg+`; mobile usa drawer / `/me/notifications` |
| Smoke visual | Slice 10 — probar Tab manual en `/home`, `/explore`, `/me`, `/admin` |

### Checklist accesibilidad (Slice 9)

| Criterio | Estado |
|----------|--------|
| Botones icónicos con `aria-label` | Sí |
| Menús con `aria-expanded` / `aria-controls` | Sí |
| Escape cierra menús | Sí |
| Click outside cierra menús | Sí (dropdown + backdrop) |
| Tab sin foco perdido en overlay | Sí (focus trap) |
| Foco visible | Sí (`navFocusRing`) |
| Sin inglés en nav principal | Sí |
| Sin API / dependencias nuevas | Sí |
| Responsive intacto | Sí |

### Validación Slice 9

- `pnpm nx run web:lint`: errores TS **preexistentes**; archivos del slice sin errores nuevos.

---

## Avance Slice 10 — Smoke visual responsive

**Fecha:** 2026-05-23

### Entregables

- `docs/audits/NAVBAR_RESPONSIVE_SMOKE.md` — tablas por ruta, breakpoints, checklist, rutas dinámicas, deudas.
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` — bloque «Navbar y navegación responsive» marcado completo (con nota de pendientes fuera de alcance).

### Correcciones menores (código)

| Cambio | Motivo |
|--------|--------|
| `scroll-padding-top` en `html` | Navbar sticky no oculta foco/anclas |
| `overflow-x: clip` en `body` / `main` | Evitar scroll horizontal global |
| `navFocusRing` en `PortalSidebar` | Consistencia foco teclado desktop portales |

### Cierre del bloque

Slices 1–10 completos. Smoke documentado; validación manual en navegador recomendada antes de release (ver smoke doc §10).

---

## Fix — Dropdown navbar flotante

**Fecha:** 2026-05-23

- **Problema:** al abrir el menú de usuario (desktop), el panel se desplegaba dentro del flujo del `<nav>` y el navbar ganaba scroll vertical en lugar de flotar sobre la página.
- **Causa:** `overflow-x-hidden` en `<nav>` hace que, por reglas CSS, `overflow-y` se compute como `auto`, creando un contenedor scrollable que incluye el dropdown absoluto; además el wrapper `md:contents` aplanaba el árbol de flex sin aportar contexto estable.
- **Corrección:**
  - `Navbar.tsx`: `overflow-x-clip overflow-y-visible` en `<nav>`; `overflow-x-clip` en la fila interna; wrapper usuario `md:flex` en lugar de `md:contents`.
  - `NavbarUserMenu.tsx`: panel del menú con `createPortal` → `document.body`, posición `fixed` calculada desde el botón (`getBoundingClientRect`), `z-[60]`, scroll solo dentro del panel (`max-h` + `overflow-y-auto`).
- **Archivos modificados:** `apps/web/components/Navbar.tsx`, `apps/web/components/NavbarUserMenu.tsx`
- **Validación visual:** `/home`, `/explore`, `/me`, `/producer`, `/admin` — desktop (`md+`); menú no altera altura del navbar; Escape / click outside / links cierran el menú. Drawer mobile público sin cambios (ya usaba portal `fixed`).
