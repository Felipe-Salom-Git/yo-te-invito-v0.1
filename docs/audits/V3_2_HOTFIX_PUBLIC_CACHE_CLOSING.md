# V3.2 Hotfix — Caché anual en páginas públicas (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Síntoma prod:** HTML de `/home`, `/explore`, `/categoria/*` con `Cache-Control: s-maxage=31536000`, `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1`.

---

## 1. Causa exacta

Next.js 15 App Router **prerenderizaba en build** las rutas del grupo `(public)` (muchas son `'use client'` sin segment config). El HTML estático recibe por defecto **`s-maxage=31536000`** (1 año) en Full Route Cache. Tras deploy, usuarios siguen recibiendo el shell/HTML viejo hasta que expire o se limpie caché.

No era un bug de TanStack Query ni de `/_next/static/*` (assets con hash siguen bien con cache larga).

---

## 2. Rutas afectadas (mínimo)

| Ruta | Antes |
|------|--------|
| `/` (gateway entry) | Estática / prerender |
| `/home` | Estática / prerender |
| `/explore` | Estática / prerender |
| `/categorias` | Estática / prerender |
| `/categoria/[category]` | Estática / prerender |

---

## 3. Configuración anterior

- Sin `export const dynamic` / `revalidate` en `(public)/layout.tsx` ni layouts hijos.
- Sin headers `Cache-Control` en `next.config.js` para discovery.
- Páginas client-only no podían declarar segment config en el mismo archivo.

---

## 4. Configuración nueva

| Archivo | Cambio |
|---------|--------|
| `app/(public)/layout.tsx` | `dynamic = 'force-dynamic'`, `revalidate = 0` |
| `app/(public)/page.tsx` | Idem (gateway `/`) |
| `app/(public)/home/layout.tsx` | Idem (+ metadata SEO preservada) |
| `app/(public)/explore/layout.tsx` | Idem (+ metadata SEO preservada) |
| `app/(public)/categoria/layout.tsx` | Idem (nuevo; metadata en `[category]/layout`) |
| `app/(public)/categorias/layout.tsx` | Idem (+ metadata SEO preservada) |
| `next.config.js` | `headers()` → `private, no-cache, no-store, max-age=0, must-revalidate` en `/`, `/home`, `/explore`, `/categorias`, `/categoria/:path*` |

`/_next/static/*` **no** se toca.

---

## 5. Headers esperados (post-deploy limpio)

```txt
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
```

No deben aparecer:

```txt
Cache-Control: s-maxage=31536000
x-nextjs-cache: HIT
x-nextjs-prerender: 1
```

Verificar:

```bash
curl -I https://yoteinvito.club/home
curl -I https://yoteinvito.club/explore
curl -I https://yoteinvito.club/categoria/rental
```

---

## 6. Deploy limpio recomendado (VPS)

```bash
sudo systemctl stop yti-web
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache
pnpm --filter web run build
sudo systemctl start yti-web
```

Luego repetir `curl -I` y smoke Home / Explore / categoría + ADMIN preview.

---

## 7. Validaciones locales

```bash
pnpm --filter web run build
git diff --check
```

En el output de build, rutas discovery deben figurar como dinámicas (`ƒ`), no estáticas (`○`).

---

## 8. Fuera de alcance de este hotfix

- ISR `next: { revalidate: 60 }` en layouts de ficha (`events/[id]`, rentals, etc.) — metadata SEO; el layout `(public)` ya fuerza dynamic en el segmento.
- Políticas CDN externas (Cloudflare, etc.) si hubiera cache layer delante — revisar purge tras deploy si aplica.
