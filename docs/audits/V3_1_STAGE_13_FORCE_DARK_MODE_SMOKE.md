# V3.1 Etapa 13 — Slice 13.1 — Force dark visual theme

**Fecha:** 2026-06-10  
**Estado:** Cerrado (código + build; QA browser con OS en light mode pendiente manual en deploy)

## Objetivo

Forzar estética dark premium en toda la web, sin respetar `prefers-color-scheme: light` ni preferencia legacy `yti:theme` en localStorage.

## Decisión de producto

**Modo claro no soportado en V3.1.** La app fuerza dark en todos los dispositivos.

## Cambios

| Archivo | Cambio |
|---------|--------|
| `apps/web/styles/globals.css` | Eliminado bloque `[data-theme="light"]`; `color-scheme: dark only`; fondo fijo `#0a0a0a` en `html`/`body`/`main`/`#__next` |
| `apps/web/tailwind.config.ts` | `darkMode: 'class'` — variantes `dark:*` activas vía clase, no OS |
| `apps/web/app/layout.tsx` | `className="dark"` en `<html>`; script inline limpia `yti:theme=light` |
| `apps/web/components/Navbar.tsx` | Removido `ThemeToggle` |
| `apps/web/components/navigation/MobilePublicNavDrawer.tsx` | Removida fila «Tema» |
| `apps/web/components/ThemeToggle.tsx` | No-op: fuerza dark y limpia legacy (por si se importa) |

## Excepciones preservadas

- `@media print` en `globals.css` — tickets con fondo claro para impresión.
- `TicketQrImage` — `bg-white` solo en pantalla/print de ticket.
- Ticket studio canvas — preview QR blanco (productor).
- Admin gastro QR panel — fondo blanco del código QR.

## Rutas auditadas (estáticas)

`/`, `/home`, `/categorias`, `/explore`, `/categoria/*`, fichas públicas, `/login`, `/register`, portales `/me`, `/admin`, `/producer`, `/gastro`.

## Comandos

```bash
pnpm exec nx run web:lint   # OK 2026-06-10
pnpm exec nx run web:build  # OK 2026-06-10
```

## QA manual (OS/navegador en light mode)

- [ ] Sin fondo blanco en shell global
- [ ] Sin flash blanco relevante al cargar
- [ ] Modales/drawers dark
- [ ] Textos legibles (variantes `dark:*` de Tailwind activas)
- [ ] Impresión ticket sin regresión
