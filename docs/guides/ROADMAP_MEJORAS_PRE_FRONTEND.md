# Roadmap — Mejoras pre-frontend

**Fecha:** 2025-03-06  
**Objetivo:** Manejo de errores, estados de carga consistentes y consumo de platformConfig antes de pulir UI/UX.

---

## Slices

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **A** | Manejo de errores API (toast en fallos de mutations y queries) | ✅ Hecho |
| **B** | Estados de carga consistentes (Cargando…, skeletons donde aplique) | ✅ Hecho |
| **C** | Consumo de platformConfig (Footer contacto, Explore categorías) | ✅ Hecho |

---

## Slice A — Manejo de errores

- Páginas con `useMutation` sin `onError` → añadir `onError: (err) => addToast(...)`
- `ApiClientError`: extraer mensaje de `body.message` o status (401, 500, etc.)
- QueryClient global o retry/onError en queries críticas para mostrar toast en fallo

**Archivos:** admin/configuracion, admin/eventos/nuevo, checkout, gastro, referrer, etc.

---

## Slice B — Estados de carga

- Todas las páginas con datos remotos deben mostrar "Cargando…" o skeleton
- Patrón: `{isLoading ? <p className="text-text-muted">Cargando…</p> : ...}`
- Explore ya tiene skeletons; mantener consistencia

---

## Slice C — Consumo de platformConfig

- `usePlatformConfig(tenantId)`: hook que llama a `repos.platformConfig.get`
- Footer: mostrar email, teléfono, dirección cuando existan
- Explore: usar `platformConfig.categories` para filtro de categorías (hoy hardcodeadas)

**Archivos:** `hooks/usePlatformConfig.ts`, `Footer.tsx`, `explore/page.tsx`

---

## Smoke test

1. **A:** Detener API, intentar acción → toast de error visible
2. **B:** Recargar listados → "Cargando…" visible
3. **C:** Configurar contacto en `/admin/configuracion` → ver en Footer; categorías en Explore

---

## Referencias

- `PROJECT_RULES.md`, `AI_WORKFLOW_RULES.md`
- `ToastProvider`, `useToast` en `components/ui/Toast.tsx`
- `ApiClientError` en `lib/api/client.ts`
