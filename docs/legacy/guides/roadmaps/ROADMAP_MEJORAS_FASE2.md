# Roadmap — Mejoras fase 2 (post pre-frontend)

**Fecha:** 2025-03-06  
**Objetivo:** Validación de formularios, responsive, SEO, accesibilidad y PWA básico.

---

## Slices

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **V1** | Validación de formularios (Input con error, mensajes claros) | ✅ Hecho |
| **V2** | Responsive (navbar, admin, checkout) | ✅ Hecho |
| **V3** | SEO (metadata por ruta, template) | ✅ Hecho |
| **V4** | Accesibilidad (ARIA, focus, role) | ✅ Hecho |
| **V5** | PWA (manifest básico) | ✅ Hecho |
| **V6** | E2E con Playwright | ✅ Hecho |

---

## Detalle

### V1 — Validación
- `Input`: prop `error`, `aria-invalid`, `aria-describedby`, `role="alert"`
- Checkout: pasa `error` de Zod a Input, elimina duplicados

### V2 — Responsive
- Navbar: `h-16 sm:h-20`, `px-3 sm:px-4`, `gap-3 sm:gap-6`
- Admin layout: `px-3 sm:px-4`
- Checkout form: `p-4 sm:p-6`
- PortalSidebar: `w-44 sm:w-52` en mobile

### V3 — SEO
- Root: `metadataBase`, `title.template`, `description`, `openGraph`
- Explore: layout con `title`, `description`
- Checkout: layout con `robots: noindex`

### V4 — Accesibilidad
- Navbar: `role="navigation"`, `aria-label`
- Footer: `role="contentinfo"`
- Form checkout: `role="form"`, `aria-label`
- Botones explore: `aria-label`, `focus:ring`

### V5 — PWA
- `public/manifest.json`: name, start_url, theme_color
- Layout: `manifest: '/manifest.json'`

---

### V6 — E2E
- `@playwright/test` instalado
- `playwright.config.ts`: baseURL localhost:3000, webServer dev:web
- `e2e/home.spec.ts`: home load, navegación a explore
- `e2e/login.spec.ts`: login form, login demo, error credenciales
- `e2e/checkout.spec.ts`: seed + login + checkout flow
- Comandos: `pnpm e2e`, `pnpm e2e:ui`
