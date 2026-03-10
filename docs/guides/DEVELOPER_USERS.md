# Guía de Usuarios Developer — Yo Te Invito

Usuarios mock para probar todas las funcionalidades del frontend en modo LocalStorage (sin base de datos).

**Password para todos**: `demo`

---

## Usuarios por rol

| Rol | Email | Funcionalidades a probar |
|-----|-------|--------------------------|
| **ADMIN** | `admin@demo.local` | Admin dashboard, auditoría, aprobación de eventos, intervenciones, configuración plataforma |
| **PRODUCER_OWNER** | `producer@demo.local` | Dashboard productor, crear/editar eventos, entradas, cortesías, referidos, payouts |
| **GASTRO_OWNER** | `gastro@demo.local` | Portal gastro, descuentos, validaciones, contenido editorial |
| **REFERRER** | `referrer@demo.local` | Dashboard referrer, eventos asignados, links de venta, comisiones |
| **USER** | `user@demo.local` | Compra tickets, mis tickets, mis órdenes, cuenta, preferencias |
| **SCANNER** | `scanner@demo.local` | Scanner UI, validación de QR, historial de scans |

---

## Detalle por usuario

### Admin
- **Email:** `admin@demo.local`
- **Password:** `demo`
- **Rutas:** `/admin`, `/admin/eventos`, `/admin/excursiones`, `/admin/rentals`, `/admin/productoras`, `/admin/tickets`, `/admin/payouts`, `/admin/configuracion`, `/admin/audit`
- **Nota:** Dashboard muestra payouts pendientes. Publicidad eliminada. Configuración (`/admin/configuracion`): datos de contacto y categorías; con USE_API=true persiste en la API; con LocalStorage persiste en localStorage.

### Productor
- **Email:** `producer@demo.local`
- **Password:** `demo`
- **Rutas:** `/producer`, `/producer/events`, `/producer/events/[id]`, cortesías, referidos
- **Nota:** Tiene productora asociada (`producer-demo`)

### Gastro
- **Email:** `gastro@demo.local`
- **Password:** `demo`
- **Rutas:** `/gastro`, `/gastro/contenido`, `/gastro/descuentos`, `/gastro/validaciones` (Resumen descuentos), `/gastro/valoraciones`
- **Nota:** Dashboard con botón PWA Scanner; CRUD contenido y descuentos; valoraciones de clientes.

### Referrer
- **Email:** `referrer@demo.local`
- **Password:** `demo`
- **Rutas:** `/referrer`

### Usuario (comprador)
- **Email:** `user@demo.local`
- **Password:** `demo`
- **Rutas:** `/home`, `/explore`, `/events/[id]`, `/checkout`, `/me/tickets`, `/me/orders`, `/cuenta`
- **Nota:** Mis tickets / Mis pedidos y Cuenta están en el menú de usuario (dropdown) cuando está logueado. Cuenta usa barra horizontal 5px debajo del navbar.

### Scanner
- **Email:** `scanner@demo.local`
- **Password:** `demo`
- **Rutas:** `/dev/scanner-sim` o ruta dedicada de scanner
- **Nota:** Rol para validar tickets en puerta

---

## E2E (Playwright)

- **Ejecutar:** `pnpm e2e` (arranca web y corre tests)
- **UI:** `pnpm e2e:ui` para modo interactivo
- **Tests:** home, login, checkout (requiere seed en /dev/seed con LocalStorage)
- **Modo:** Usa LocalStorage por defecto; con USE_API=true hace falta API + demo:seed

## Mejoras recientes

- **Validación:** Formularios muestran errores por campo (Input con prop `error`).
- **Accesibilidad:** ARIA, focus visible, labels en botones.
- **SEO:** Metadatos por ruta (explore, checkout). Template de título en layout.
- **PWA:** `manifest.json` básico para instalación como app.

## Config de plataforma

- **Footer:** Muestra email, teléfono y dirección si están configurados en `/admin/configuracion`.
- **Explore:** Las categorías del filtro provienen de la config (localStorage o API según `USE_API`).

## Modo API (NEXT_PUBLIC_USE_API=true)

Con `NEXT_PUBLIC_USE_API=true` y `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`:
- **Login:** NextAuth Credentials llama a `POST /auth/login`; el token JWT se guarda en sesión y se envía en `Authorization: Bearer`.
- **Requisitos:** API en ejecución (`pnpm dev:api`), DB migrada (`pnpm db:migrate`), demo-seed (`cd apps/api && pnpm run demo:seed`).
- **Usuarios:** Mismos emails que arriba; contraseña `demo`. Ver [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md).
- **NextAuth:** Crear `apps/web/.env` con `NEXTAUTH_SECRET` (ej: `openssl rand -base64 32`) y `NEXTAUTH_URL=http://localhost:3000`. Sin esto el login puede fallar con JWT decryption error.

## Flujo de inicio rápido (modo LocalStorage)

1. Ir a `/dev/seed` y ejecutar **Seed demo data**
2. Ir a `/login`
3. Iniciar sesión con el email/password del rol deseado
4. Navegar a las rutas correspondientes

---

## Cómo agregar un usuario

Para agregar usuarios en el seed:

- `apps/web/lib/local-db/seed.ts` — agrega entrada en `users`
- `apps/web/lib/auth/demo-users.ts` — agrega entrada en `DEMO_USERS`

Ambos deben usar el mismo `id` y `email`.

---

## Roadmaps

- [ROADMAP_REGISTRO_AUTH_EMAIL.md](./ROADMAP_REGISTRO_AUTH_EMAIL.md) — Registro (users, productoras, gastro), Google OAuth, emails
- [ROADMAP_PENDIENTES_OPCIONALES.md](./ROADMAP_PENDIENTES_OPCIONALES.md) — Backlog de mejoras opcionales

## Configuración externa

- [CONFIG_GOOGLE_RESEND.md](./CONFIG_GOOGLE_RESEND.md) — Google Cloud Console (OAuth), Resend (emails), Redis (cola)
