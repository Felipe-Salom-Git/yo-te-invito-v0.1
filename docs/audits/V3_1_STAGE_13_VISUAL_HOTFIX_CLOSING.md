# V3.1 Etapa 13 — Hotfix visual final pre-QA — Cierre

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** Cerrado con observaciones (build OK; QA manual browser pendiente)

## Objetivo de la etapa

Corregir antes del QA pre-deploy:

1. Fondo/estética siempre dark (sin modo claro visible).
2. Subtítulos coherentes en cards/carruseles de restaurants/gastro.

## Slices ejecutados

| Slice | Commit | Resumen |
|-------|--------|---------|
| 13.1 | `fix(web): force dark visual theme globally` | Dark forzado; toggle removido; `darkMode: class` |
| 13.2 | `fix(web): normalize gastro card subtitles` | Helper subtítulo gastro + cards/modal |
| 13.3 | `docs: close v31 stage 13 visual hotfixes` | Documentación y cierre |

## Modo claro

- **No soportado** en V3.1.
- Se ignora `prefers-color-scheme: light` y se limpia `localStorage yti:theme=light`.
- `color-scheme: dark only` en `html`.

## Subtítulo gastro (prioridad final)

1. `summary`
2. `description`
3. `Restaurant · {subcategoryName}`
4. `city` (fallback)

Ciudad como metadata menor cuando hay propuesta/tipo.

## Rutas auditadas

Públicas: `/`, `/home`, `/categorias`, `/explore`, `/categoria/*`, fichas evento/gastro/excursión/rental/hotel, `/login`, `/register`.  
Portales: `/me`, `/admin`, `/producer`, `/gastro`.

## QA ejecutado

| Check | Resultado |
|-------|-----------|
| `web:lint` (tsc) | PASS |
| `web:build` | PASS |
| QA OS light mode (browser) | Pendiente manual |
| QA gastro cards (browser) | Pendiente manual |
| QA impresión ticket | Sin cambios de código print |

## Comandos

```bash
pnpm exec nx run web:lint
pnpm exec nx run web:build
```

## Pendientes / riesgos

- QA manual con dispositivo/navegador en light mode post-deploy.
- Usuarios con `yti:theme=light` en localStorage: se limpia en primera carga (script inline).
- Algunos componentes admin (QR gastro) mantienen `bg-white` local intencional.

## Recomendación siguiente

**Puede avanzarse a Etapa 0 — Cierre técnico y QA manual pre-deploy**, ejecutando la matriz de rutas en browser con OS en light mode.
