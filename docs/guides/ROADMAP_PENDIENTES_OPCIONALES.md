# Roadmap — Pendientes opcionales (backlog)

**Fecha:** 2025-03-06  
**Objetivo:** No olvidar mejoras opcionales. Ir agregando ítems aquí cuando se dejan de lado y priorizarlos cuando haya capacidad.

---

## Ítems en backlog

| # | Ítem | Descripción | Prioridad sugerida |
|---|------|-------------|--------------------|
| 1 | **Service worker / offline** | Manifest ya existe. Falta SW para cache de assets y modo offline. | Baja |
| 2 | **E2E: checkout más robusto** | Test actual se salta si no hay link comprar. Mejorar para eventos con tickets. | Media |
| 3 | **Tests unitarios** | Jest o Vitest para lógica (getErrorMessage, schemas Zod, utils). | Media |
| 4 | **CI/CD** | GitHub Actions: build, lint, E2E en cada PR. | Media |
| 5 | **Docs de deploy** | Guía producción: env vars, build, Docker, Vercel/Railway. | Media |
| 6 | **Pulido de UI** | Refinamiento visual del frontend (ya listos los cimientos). | Media |
| 7 | **Internacionalización (i18n)** | Si se planea multi-idioma. | Baja |
| 8 | **Rate limiting** | Límite de requests por IP/usuario en API. | Baja |
| 9 | **Monitoring / logging** | Sentry, Datadog o similar para errores en prod. | Media |
| 10 | **PWA instalable** | Mejorar manifest, íconos, splash para "Add to home screen". | Baja |
| 11 | **Reenvío verificación email** | `POST /auth/resend-verification` para usuarios cuyo token expiró. | Baja |
| 12 | **Login condicionado a verificación** | Bloquear o advertir si el usuario no tiene email verificado. | Baja |
| 13 | **Bienvenida solo tras verificar** | Enviar email de bienvenida después de verificar, no al registrarse. | Baja |
| 14 | **Redis en Docker** | Agregar servicio Redis al docker-compose para probar cola en local. | Baja |
| 15 | **E2E flujo verificación** | Test: registro → email (mock) → click verify. | Baja |

### Frontend (web)

| # | Ítem | Descripción | Prioridad sugerida |
|---|------|-------------|--------------------|
| F1 | **Estados de carga consistentes** | Skeleton loaders o spinners en listados (eventos, tickets, órdenes). | Media |
| F2 | **Feedback de errores** | Toasts/alertas visibles al fallar mutations; retry en errores de red. | Media |
| F3 | **Empty states** | Ilustraciones/mensajes cuando no hay eventos, tickets, órdenes. | Media |
| F4 | **Búsqueda y filtros** | Mejorar filtros en explore/eventos; búsqueda por texto. | Media |
| F5 | **Dark/light mode** | Toggle de tema si la app soporta ambos. | Baja |
| F6 | **Animaciones sutiles** | Transiciones entre rutas, micro-interacciones en botones/cards. | Baja |
| F7 | **Responsive** | Revisar breakpoints en móvil (checkout, admin, formularios largos). | Media |
| F8 | **Accesibilidad** | Revisar contraste, focus, labels en forms, screen readers. | Media |
| F9 | **Optimistic updates** | Actualizar UI antes de confirmar (ej. carrito, favoritos). | Baja |
| F10 | **Breadcrumbs** | Navegación en páginas profundas (admin, producer, referrer). | Baja |

---

## Cómo usar este roadmap

1. **Agregar:** Cuando se deje algo opcional sin implementar, añadirlo aquí con descripción breve.
2. **Priorizar:** Marcar prioridad (Alta/Media/Baja) según impacto.
3. **Mover a implementación:** Cuando se decida hacer un ítem, crear un plan en un doc dedicado y marcarlo "En curso" en la tabla.
4. **Archivar:** Al completar, mover a una sección "Completados" al final del doc.

---

## Completados (archivo)

_(Los ítems que se implementen se mueven aquí con fecha.)_

- _(ninguno aún)_
