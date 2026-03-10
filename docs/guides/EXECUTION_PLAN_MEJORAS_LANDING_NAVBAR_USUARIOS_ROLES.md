# Plan de ejecución — Mejoras Landing, Navbar, Usuarios y Roles

**Fecha:** 2025-03-06  
**Reglas de referencia:** PROJECT_RULES.md, AI_WORKFLOW_RULES.md, FRONTEND_CONVENTIONS.md

---

## Objetivo

Implementar de forma ordenada y con impacto mínimo las mejoras solicitadas en:

1. **Landing** (estética)
2. **Navbar** (funcionalidad y estética)
3. **Usuarios** (menú → sidebar según rol; usuario común con barra 5px más abajo)
4. **Roles:** Administración, Gastronómico, Productora (dashboard, formularios, configuración, CRUDs)

Cada bloque se ejecutará en **slices** (un commit o PR por slice cuando sea posible), respetando límite de ~300–400 líneas por archivo y sin refactors masivos.

---

## Fase 1 — Landing (estética)

### Archivos a modificar

- `apps/web/components/home/HomeLanding.tsx`
- `apps/web/components/home/Carousel.tsx`
- `apps/web/components/home/EventCard.tsx`
- `apps/web/styles/globals.css` (ocultar scrollbars si se usa utilidad global)

### Pasos

1. **Scrollbars**
   - Ocultar barras de scroll lateral/vertical en los carruseles: usar `overflow-x-auto` con `scrollbar-hide` o clase que aplique `scrollbar-width: none` y `-ms-overflow-style: none` (+ `::-webkit-scrollbar { display: none }`).
   - Mantener scroll por rueda/arrastre; solo ocultar la barra visual.

2. **Hover fluido y card que sobresale**
   - En `EventCard`: transición más fluida (ej. `transition-all duration-300 ease-out` ya existe; afinar si hace falta).
   - En hover: aumentar escala (ej. `scale-110`), `z-20` o superior para que sobresalga del contenedor, y mostrar más detalle (descripción si existe; en `EventSummary` no hay `description` — usar texto opcional o no mostrarlo en resumen).
   - Ajustar contenedor del carrusel para que no recorte con `overflow-hidden` en el eje correcto o permitir overflow en Y para la card que crece.

3. **Contenedor de cards más al borde**
   - En `HomeLanding.tsx` y `Carousel.tsx`: reducir o eliminar `px-4`/`max-w-6xl` del contenedor de las cards (o usar `px-2` / márgenes menores) para que el carrusel llegue más al borde de la pantalla.

4. **Flechas adelante/atrás**
   - En `Carousel.tsx`: colocar flechas a los costados del contenedor, centradas verticalmente respecto al bloque de cards (ej. `absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none` con botones `pointer-events-auto`).
   - Hover fluido en botones (transición de opacidad/color).

### Riesgos

- Ocultar scrollbar puede afectar accesibilidad (teclado/scroll siguen funcionando).
- Card más grande en hover puede afectar layout en móvil; considerar `max-height` o limitar escala en viewport pequeño.

### Violaciones de reglas

- Ninguna. Sin nuevas dependencias.

---

## Fase 2 — Navbar

### Archivos a modificar

- `apps/web/components/Navbar.tsx`
- `apps/web/components/NavbarUserMenu.tsx`
- `apps/web/components/brand/Logo.tsx`

### Pasos

1. **Funcionalidad**
   - Quitar del Navbar los enlaces "Mis tickets" y "Mis pedidos" (eliminar los dos `Link` correspondientes en `Navbar.tsx`).
   - "Cuenta": mostrarlo solo cuando el usuario esté logueado. Opción: mover "Cuenta" dentro del dropdown de `NavbarUserMenu` (junto a "My Tickets" y "Sign out"). Así el botón de cuenta solo aparece cuando hay sesión, dentro del menú de usuario.

2. **Estética**
   - Logo más grande: en `Logo.tsx`, aumentar tamaños del variant `navbar` (ej. de 120x40 a 160x48 o similar).
   - Mostrar título "Yo Te Invito" al lado del logo en navbar: usar `showText={true}` para variant `navbar` en `Navbar.tsx`, o añadir prop para forzar texto en navbar.

### Riesgos

- Usuarios pueden buscar "Mis tickets" en navbar: seguirán pudiendo entrar por Cuenta → menú usuario si allí se deja el enlace a tickets/pedidos.

### Violaciones de reglas

- Ninguna.

---

## Fase 3 — Usuarios: menú → sidebar (y 5px usuario común)

### Archivos a modificar

- `apps/web/app/(portal)/admin/layout.tsx`
- `apps/web/app/(portal)/gastro/layout.tsx`
- `apps/web/app/(portal)/producer/layout.tsx`
- `apps/web/app/(portal)/referrer/layout.tsx`
- `apps/web/app/(portal)/cuenta/layout.tsx`
- Posible nuevo: `apps/web/components/layout/PortalSidebar.tsx` (sidebar reutilizable)
- Posible: `apps/web/app/(portal)/me/layout.tsx` si se quiere barra consistente para usuario común

### Pasos

1. **Sidebar para admin, gastro, producer, referrer**
   - Crear componente `PortalSidebar` que reciba `items: { href, label }[]` y muestre navegación vertical a la izquierda (sidebar fijo o sticky).
   - En cada layout de admin, gastro, producer, referrer: sustituir la `<nav>` horizontal por layout de dos columnas: sidebar + contenido (`{children}`).
   - Estilos: sidebar estrecho (ej. 200–240px), fondo distinto, links apilados.

2. **Usuario común (rol USER): barra paralela 5px abajo**
   - En `cuenta/layout.tsx`: mantener la barra horizontal debajo del navbar pero añadir `mt-[5px]` (o `margin-top: 5px`) al contenedor del nav para que no se pise con el navbar.
   - Si existe o se crea layout para `/me`: misma lógica (barra horizontal con 5px de separación) para consistencia con "usuario común".

### Criterio de “usuario común”

- Rutas bajo `(portal)` con rol USER: `/cuenta/*`, `/me/*`. Los layouts de admin/gastro/producer/referrer ya están bajo rutas que implican otros roles; el layout de cuenta (y me, si se unifica) es el que se deja con barra horizontal + 5px.

### Riesgos

- Sidebar en móvil: definir comportamiento (drawer, colapsar, o mantener barra arriba en breakpoint pequeño) para no romper UX.

### Violaciones de reglas

- Ninguna. Componente nuevo acotado.

---

## Fase 4 — Administración

### 4.1 Dashboard: Payouts pendientes

- **Archivos:** `apps/web/app/(portal)/admin/page.tsx`
- **Pasos:** Añadir sección o cards que listen "Payouts pendientes" (reutilizar lógica o query de `admin/payouts`: filtrar por estado PENDING/REQUESTED). Mostrar en el dashboard con enlace a `/admin/payouts`.

### 4.2 Carga Excursiones / Rental / Eventos: campos e imágenes

- **Archivos:**  
  `admin/excursiones/nuevo/page.tsx`, `admin/excursiones/[id]/editar/page.tsx`,  
  `admin/rentals/nuevo/page.tsx`, `admin/rentals/[id]/editar/page.tsx`,  
  `admin/eventos/nuevo/page.tsx` (y editar si existe).
- **Pasos:**
  - Fecha, capacidad, “agregar valor” (precio o similar): hacer opcionales donde aplique.
  - Añadir carga de imágenes: por URL y local (input file + preview). Persistencia según API/backend existente (ej. `media[]` en eventos).
  - Ofertas: campo o sección opcional (por definir con backend).
  - Ubicación en Google Maps: integrar mapa (requiere API key; documentar y usar variable de entorno). Campo lat/lng o dirección.

### 4.3 Configuración de plataforma

- **Archivos:** `apps/web/app/(portal)/admin/configuracion/page.tsx`, posibles nuevos componentes para formularios.
- **Pasos:**
  - Permitir cargar y modificar datos de contacto (teléfono, email, dirección, etc.).
  - CRUD de categorías para tipos de servicio: eventos, restaurants, rentals, excursiones (si el backend expone endpoints; si no, definirlos en docs y dejar UI preparada).
  - Eliminar funcionalidad de publicidad: quitar enlace "Publicidad" del layout admin y eliminar o redirigir ruta `/admin/publicidad`.

### Violaciones / dependencias

- Google Maps: nueva dependencia (ej. `@react-google-maps/api` o script de carga). Debe proponerse y aprobarse según PROJECT_RULES.
- Backend: algunos ítems (categorías, contacto) pueden requerir nuevos endpoints; documentar en ejecución.

---

## Fase 5 — Gastronómico

### 5.1 CRUD Contenido

- **Archivos:** `apps/web/app/(portal)/gastro/contenido/page.tsx` y posibles subrutas o modales.
- **Pasos:** Formulario para editar información del gastronómico: imágenes (URL + local), descripción, ubicación (maps). Alta/baja de “contenido” según modelo de negocio. Persistencia vía API existente o a definir.

### 5.2 CRUD Descuentos

- **Archivos:** `apps/web/app/(portal)/gastro/descuentos/page.tsx`, componentes de formulario.
- **Pasos:** Crear y editar descuentos; alta/baja. Los descuentos generan QR con flyer, valor y contador; implementar generación de QR (librería a aprobar) y vista de contador.

### 5.3 Validaciones → Resumen de descuentos

- **Archivos:** `apps/web/app/(portal)/gastro/validaciones/page.tsx` (renombrar o reutilizar).
- **Pasos:** Cambiar "Validaciones" por "Resumen de descuentos": historial de cantidad de personas que consumieron descuentos cargados en la web.

### 5.4 Dashboard: PWA Scanner y valoraciones

- **Archivos:** `apps/web/app/(portal)/gastro/page.tsx`.
- **Pasos:** Añadir botón para descargar PWA del scanner (enlace a la URL del scanner instalable). Añadir vista de valoraciones de clientes (lista o resumen).

### 5.5 Layout gastro

- Actualizar NAV en `gastro/layout.tsx`: "Validaciones" → "Resumen descuentos" (y ruta si cambia).

### Violaciones / dependencias

- QR: posible librería (ej. `qrcode.react` o similar); proponer y aprobar.
- PWA scanner: enlace a build existente del scanner; sin nueva lib.

---

## Fase 6 — Productora

### 6.1 Modal/form de carga de evento

- **Archivos:** `apps/web/app/(portal)/producer/events/page.tsx`, `producer/events/nuevo` o modal existente, `producer/events/[eventId]/page.tsx`.
- **Pasos:**
  - Ubicación en mapa (Google Maps o similar; mismo criterio que admin).
  - Carga de imágenes por URL y local.
  - Tandas: modelo "Tipo de entrada" (nombre) → cada tipo tiene tandas sujetas a **fecha** o **cantidad**; lo que se cumpla primero cambia de tanda. UI para configurar estas reglas.

### 6.2 Referidos: entradas de cortesía

- **Archivos:** `apps/web/app/(portal)/producer/events/[eventId]/referrals/page.tsx` (o donde se agreguen referidos).
- **Pasos:** Al agregar un referido a un evento, ofrecer opción de regalar entradas de cortesía (cantidad y/o tipo).

### Violaciones / dependencias

- Misma consideración que admin para Maps e imágenes.

---

## Orden sugerido de implementación

1. **Slice 1:** Landing (scrollbars, hover, contenedor, flechas) — impacto solo en home.
2. **Slice 2:** Navbar (quitar Mis tickets/Mis pedidos; Cuenta dentro del menú usuario; logo + título).
3. **Slice 3:** Sidebar para admin/gastro/producer/referrer; 5px en cuenta (y me si aplica).
4. **Slice 4:** Admin dashboard payouts pendientes; quitar publicidad del menú y ruta.
5. **Slices 5+:** Resto por fases (formularios admin, configuración, gastro CRUDs, productora), en commits atómicos.

---

## Plan de smoke test (por slice)

- **Landing:** Ver home, scroll horizontal en carruseles, hover en card, flechas, que no aparezcan scrollbars.
- **Navbar:** Sin "Mis tickets" ni "Mis pedidos"; logueado → Cuenta dentro del dropdown; logo más grande y "Yo Te Invito" visible.
- **Sidebar:** Entrar a admin, gastro, producer, referrer y ver sidebar; entrar a cuenta y ver barra horizontal con 5px de margen.
- **Admin:** Dashboard muestra payouts pendientes; sin Publicidad en menú; configuración y formularios según lo implementado.
- **Gastro/Productora:** Flujos principales de cada CRUD y enlaces nuevos.

---

## Documentación a actualizar

- `docs/guides/DEVELOPER_USERS.md` (o equivalente): rutas de admin sin publicidad, nueva estructura de menú y sidebar.
- Si se añaden componentes nuevos (`PortalSidebar`, etc.): breve doc en `docs/components/` o referencia en `FRONTEND_CONVENTIONS.md`.

---

*Fin del plan. Implementación por slices tras validación.*
