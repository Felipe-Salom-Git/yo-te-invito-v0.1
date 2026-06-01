# Auditoría SEO técnica — Yo Te Invito (SEO 1)

**Fecha:** 2026-05-31  
**Alcance:** auditoría read-only del frontend Next.js App Router en producción (`https://yoteinvito.club`).  
**Objetivo:** baseline antes de implementar slices SEO 2–9. **Sin cambios de código en este slice.**

**Referencias revisadas:** `apps/web/app/layout.tsx`, rutas `(public)` / `(portal)` / `(auth)`, `next.config.js`, `public/manifest.json`, metadata en layouts/pages, checklist V2 § GSC + § SEO/GEO.

---

## 1. Resumen ejecutivo

| Área | Estado | Nota |
|------|--------|------|
| Metadata global | **Mejorado (SEO 3 aplicado)** | OG/Twitter global + icons + manifest icons (ver §1.1) |
| Metadata dinámica | **Mejorado (SEO 5 aplicado)** | Eventos + fichas públicas principales vía `layout.tsx` server (ver §3.2) |
| Canonical | **Mejorado (SEO 6 aplicado)** | Canonical en rutas base + fichas; dedupe gastro vía redirect |
| Open Graph | **Mejorado (SEO 3 aplicado)** | Global con imagen fallback; dinámico eventos + legales |
| Twitter Cards | **Mejorado (SEO 3 aplicado)** | Global + eventos |
| JSON-LD | **Parcial (SEO 7 aplicado)** | `Event` en `/events/[id]` y `Organization` en `/producers/[id]` |
| `robots.txt` | **Implementado (SEO 4)** | `apps/web/app/robots.ts` (bloquea portales/auth/dev/checkout) |
| `sitemap.xml` | **Implementado (SEO 4)** | `apps/web/app/sitemap.ts` mínimo (rutas públicas estables) |
| No-index privados | **Crítico** | Solo **checkout** tiene `noindex`; portales/auth/dev indexables por defecto |
| Imágenes sociales / GCS | **OK técnico** | Eventos usan `coverImageUrl` (GCS válido); resto sin OG |
| Google Search Console | **Pendiente** | Sin propiedad verificada documentada |
| Favicon / icons | **Parcial (SEO 3 aplicado)** | `icons` apunta a `/brand/logo.png`; falta `favicon.ico` dedicado |

**Conclusión:** la base App Router existe pero el SEO técnico productivo está **incompleto**. Se avanzó con **SEO 3** (metadata global + previews) y **SEO 4** (metadata estática + `robots.txt` + `sitemap.xml` mínimo). Queda pendiente crítico: **`noindex` en route groups privados** (SEO 2 pendiente en web), más metadata dinámica por vertical + JSON‑LD.

---

## 2. Respuestas a preguntas clave

| Pregunta | Respuesta |
|----------|-----------|
| ¿Metadata global en App Router? | **Sí, parcial** — `apps/web/app/layout.tsx` |
| ¿Title template? | **Sí** — `{ default: 'Yo Te Invito', template: '%s \| Yo Te Invito' }` |
| ¿Descripción base global? | **Sí** — ticketera genérica |
| ¿Favicon / app icons reales? | **Parcial** — `icons` usa `/brand/logo.png`; `manifest.json` tiene `icons[]`; falta set estándar (180/192/512) |
| ¿`metadataBase` con `https://yoteinvito.club`? | **Condicional** — `NEXT_PUBLIC_APP_URL`; **no** documentado en `.env.example` |
| ¿Canonical URLs? | **Sí (parcial)** — legales + rutas base + fichas principales (SEO 6) |
| ¿Home metadata adecuada? | **No** — `/` y `/home` son `'use client'`; heredan root genérico |
| ¿Explore metadata adecuada? | **Parcial** — título/descripción estáticos en `explore/layout.tsx` |
| ¿Categorías metadata dinámica? | **No** — `/categorias`, `/categoria/[category]` client-only |
| ¿Fichas públicas metadata dinámica? | **Sí (SEO 5)** — eventos, rentals, excursiones, gastro, hoteles y productoras |
| ¿Open Graph configurado? | **Parcial** — global `type`/`locale`; dinámico eventos/legales |
| ¿Twitter Cards? | **Parcial** — solo eventos (`summary_large_image`) |
| ¿OG por ficha o fallback? | Eventos: imagen cover si existe; **sin fallback** global de marca |
| ¿`robots.txt` Next? | **No** |
| ¿`sitemap.xml` Next? | **No** |
| ¿Sitemap solo públicas? | N/A — no implementado |
| ¿No-index en privados? | **Insuficiente** — checkout sí; portales no |
| ¿JSON-LD eventos? | **No** |
| ¿JSON-LD otras verticales? | **No** |
| ¿Riesgo indexar “Próximamente”? | **Sí** — `/hoteles` es pantalla Próximamente indexable |
| ¿URLs con IDs internos? | **Sí** — CUID/eventId en paths (`/events/[eventId]`, `/rentals/[id]`, etc.) |
| ¿GCS OK para OG? | **Sí** para URLs GCS absolutas; `next/image` permite bucket; OG usa URL directa en eventos |
| ¿Errores obvios App Router? | Client pages sin metadata; posible **doble sufijo** en title eventos; rutas duplicadas gastro |
| ¿Qué implementar primero? | Ver §8 Quick wins y §9 Plan slices |

---

## 3. Estado actual por área

### 3.1 Metadata global (`apps/web/app/layout.tsx`)

```ts
metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
title: { default: 'Yo Te Invito', template: '%s | Yo Te Invito' }
description: 'Plataforma de ticketera y venta de entradas para eventos'
openGraph: { type: 'website', locale: 'es_AR' }
manifest: '/manifest.json'
```

| Elemento | Estado |
|----------|--------|
| `metadataBase` | OK si `NEXT_PUBLIC_APP_URL=https://yoteinvito.club` en VPS |
| Title template | OK (orden: `%s \| Yo Te Invito`, no `Yo Te Invito \| %s` del checklist) |
| Description | Genérica; no menciona gastronomía/rentals/excursiones |
| `openGraph.siteName`, default image, `url` | **Faltan** |
| `twitter` global (`card`, `site`) | **Mejorado (SEO 3)** — `summary_large_image` + fallback image |
| `robots` global | **No definido** (default index) |
| `alternates.canonical` | **Sí (parcial)** — rutas base + fichas principales (SEO 6) |
| `keywords`, `authors` | **No** |

#### 3.1.1 SEO 3 aplicado (2026-06-01)

- Se completó `openGraph` global: `siteName`, `url`, `title`, `description`, `images[]` con fallback (`/brand/logo_2.png`).
- Se completó `twitter` global: `card`, `title`, `description`, `images[]` con fallback.
- Se configuraron `icons` en metadata apuntando a `/brand/logo.png`.
- Se agregó `icons[]` al `public/manifest.json` (con tamaños reales de los assets existentes).
- Se ajustó `events/[eventId]/layout.tsx` para evitar doble sufijo en `<title>` (deja que aplique el template global).

### 3.2 Metadata dinámica

| Ruta / grupo | Mecanismo | Archivo |
|--------------|-----------|---------|
| `/events/[eventId]` | `generateMetadata` (fetch API) | `(public)/events/[eventId]/layout.tsx` |
| `/legal/[slug]` | `generateMetadata` + canonical | `(public)/legal/[slug]/page.tsx` |
| `/rentals/[id]` | `generateMetadata` (fetch API) | `(public)/rentals/[id]/layout.tsx` |
| `/excursiones/[id]` | `generateMetadata` (fetch API) | `(public)/excursiones/[id]/layout.tsx` |
| `/gastronomicos/[id]` | `generateMetadata` (fetch API) | `(public)/gastronomicos/[id]/layout.tsx` |
| `/restaurants/[id]` | canonical alias (SEO 6 pendiente dedupe) | `(public)/restaurants/[id]/layout.tsx` |
| `/hoteles/[id]` | `generateMetadata` (fetch API) | `(public)/hoteles/[id]/layout.tsx` |
| `/producers/[id]` | `generateMetadata` (fetch API) | `(public)/producers/[id]/layout.tsx` |
| `/explore` | Estático | `(public)/explore/layout.tsx` |
| `/checkout/*` | Estático + `noindex` | `(public)/checkout/layout.tsx` |
| Home `/`, `/home`, categorías, fichas gastro/rental/excursion/hotel/productor, explore content | **Ninguno** (pages `'use client'`) |

> **Nota (SEO 5):** para mantener las páginas como `'use client'` sin refactor visual, la metadata dinámica se implementa en `layout.tsx` server que envuelve al page client.

**Eventos — detalle:** título devuelto como `` `${title} | Yo Te Invito` `` con template global → riesgo de **“Evento X \| Yo Te Invito \| Yo Te Invito”** en `<title>`.

**Legales — detalle:** mejor implementación actual: robots condicional, OG `article`, canonical `/legal/${slug}`.

### 3.3 Canonical

| Ruta | Canonical |
|------|-----------|
| `/` | Canonical → `/home` (gateway/intro) |
| `/home` | Sí |
| `/explore` | Sí (aplica también con query params) |
| `/categorias` | Sí |
| `/categoria/[category]` | Sí |
| `/legal/[slug]` | Sí |
| `/events/[eventId]` | Sí |
| `/rentals/[id]` | Sí |
| `/excursiones/[id]` | Sí |
| `/gastronomicos/[id]` | Sí (ruta canónica) |
| `/restaurants/[id]` | Redirect permanente → `/gastronomicos/[id]` |
| `/hoteles/[id]` | Sí |
| `/producers` | Sí |
| `/producers/[id]` | Sí |

**Query params:** se usa canonical fijo en `/explore` para evitar duplicados por `?category=` / `?city=` (SEO 6). En fichas, se define canonical al path sin `tenantId`.

### 3.4 Open Graph

| Contexto | OG |
|----------|-----|
| Global | `type: website`, `locale: es_AR` |
| Eventos | `title`, `description`, `images[]` desde API |
| Legales | `title`, `description`, `type: article` |
| Otras fichas | Heredan global incompleto |

**Imágenes:** eventos usan `coverImageUrl` (GCS OK). Sin imagen → OG sin `images` (preview pobre). Data-URL legacy en BD no serviría en crawlers sociales.

### 3.5 Twitter Cards

Solo en layout de eventos: `summary_large_image` + title/description/images. **No** hay defaults globales ni cards en otras verticales.

### 3.6 JSON-LD

**SEO 7 aplicado (parcial):**

- **Eventos:** se inyecta JSON‑LD `Event` en `apps/web/app/(public)/events/[eventId]/layout.tsx`.
- **Productoras:** se inyecta JSON‑LD `Organization` en `apps/web/app/(public)/producers/[id]/layout.tsx`.

**Reglas cumplidas:** no se inventan ratings, availability ni offers si no hay precio real; campos se omiten cuando faltan datos.

**SEO 8 aplicado (conservador):**

- **Gastro:** JSON‑LD `Restaurant` en `/gastronomicos/[id]` + `AggregateRating` solo si `ratingAvg` y `ratingCount > 0`.
- **Hoteles:** JSON‑LD `Hotel` en `/hoteles/[id]` + `AggregateRating` solo si `ratingAvg` y `ratingCount > 0`.
- **Rentals/Excursiones:** se representa como `Event` (porque hoy usan el endpoint/modelo público de eventos); `Offer` solo si hay `fromPrice` real.

**Reglas:** no se inventan ratings; no `aggregateRating` con count 0; no availability/stock.

**Maps 9 (2026-06-01):** JSON‑LD local en `apps/web/lib/seo/jsonld.ts` — `PostalAddress.addressRegion` (province) y `addressCountry: AR` cuando hay datos reales; `GeoCoordinates` solo si hay `geoLat`/`geoLng`. Productoras: city/country textual sin geo inventado. Validar con [Rich Results Test](https://search.google.com/test/rich-results) post-deploy.

**Pendiente:** JSON‑LD más específico por vertical (si se separan modelos) + `Review` items individuales (solo si API expone reviews públicas completas).

### 3.7 Sitemap

**SEO 9 aplicado:** `apps/web/app/sitemap.ts` ahora genera un sitemap **final** con:

- rutas públicas estables (home/explore/categorías/legal);
- fichas públicas **listadas desde endpoints públicos** (con límites + fallback si falla el fetch):
  - eventos `/events/[id]` (category=event)
  - rentals `/rentals/[id]` (category=rental)
  - excursiones `/excursiones/[id]` (category=excursion)
  - hoteles `/hoteles/[id]` (category=hotel; detalle por `publicEventId`)
  - gastro `/gastronomicos/[id]` (por `public/gastro-locations`)
  - productoras `/producers/[id]` (paginado)

Incluye (base): `/home`, `/explore`, `/categorias`, `/categoria/{event,gastro,rental,excursion}`, `/producers`, `/legal/*` (slugs públicos).

Excluye (a propósito): portales privados + auth + checkout + dev + scanner + API + `/_next` y **el listado** `/hoteles` (Próximamente, `noindex`).

**Pendiente:** ejecutar el flujo manual de GSC (propiedad dominio + TXT + envío sitemap) y cerrar `noindex` de portales (SEO 2).

### 3.8 Robots

**SEO 4 aplicado:** existe `apps/web/app/robots.ts`.

- Permite crawl de rutas públicas.
- Bloquea portales y rutas técnicas (`/admin`, `/me`, `/producer`, `/gastro`, `/hotel`, `/referrer`, `/login`, `/register`, `/checkout`, `/dev`, `/_next`, etc.).
- Incluye `Sitemap: https://yoteinvito.club/sitemap.xml` (vía `NEXT_PUBLIC_APP_URL` o fallback).
- Único `noindex` encontrado: `(public)/checkout/layout.tsx`.

### 3.9 No-index rutas privadas

| Grupo | Prefijos | `noindex` hoy | Riesgo |
|-------|----------|---------------|--------|
| Admin | `/admin/*` | **No** | Alto — shell HTML indexable |
| Productor | `/producer/*` | **No** | Alto |
| Gastro portal | `/gastro/*` | **No** | Alto |
| Hotel portal | `/hotel/*` | **No** | Alto |
| Referrer | `/referrer/*` | **No** | Alto |
| Usuario | `/me/*`, `/cuenta/*` | **No** | Alto |
| Auth | `/login`, `/register/*` | **No** | Medio |
| Checkout | `/checkout/*` | **Sí** | OK |
| Tickets / órdenes | `/me/tickets/*`, `/me/orders/*` | **No** | Alto |
| Dev | `/dev/scanner-sim` | **No** | Medio |
| Profiles hub | `/profiles` | **No** | Medio |

Portales usan `'use client'` + redirect auth; Googlebot puede indexar título genérico “Yo Te Invito” en URLs privadas.

### 3.10 Imágenes sociales y GCS

- `next.config.js`: `remotePatterns` → `storage.googleapis.com/yti-prod-public-assets/**` ✓
- Metadata OG usa URLs **directas** del API (no `_next/image`), válido para crawlers si son HTTPS absolutas GCS.
- Faltan **OG default** (logo institucional en bucket `public/platform/`).

### 3.11 Google Search Console

- Checklist: propiedad dominio + TXT DNS **pendiente**.
- Sin sitemap enviado.
- Sin baseline de cobertura documentado.

### 3.12 Otros hallazgos

| Tema | Detalle |
|------|---------|
| **Duplicación gastro** | `/gastronomicos/[id]` y `/restaurants/[id]` renderizan el mismo componente con distinto param semantics — riesgo contenido duplicado |
| **`/content/[id]`** | Ficha genérica evento; sin metadata; solapa con `/events/[eventId]` |
| **`/r/[code]`** | Redirect client-side; indexable transitoriamente |
| **`/hoteles`** | “Próximamente” — mala señal SEO si se indexa |
| **`/categoria/hotel`** | 404 (`isCategoryLandingId` excluye hotel) — OK |
| **Root `/`** | Gateway/splash client-side; SEO pobre vs `/home` |
| **`manifest.json`** | Sin `icons[]` — PWA incompleto para SEO mobile |
| **`.env.example`** | Falta `NEXT_PUBLIC_APP_URL` — riesgo deploy sin `metadataBase` prod |
| **Middleware** | No hay `middleware.ts` para headers SEO |

---

## 4. Tabla de rutas indexables (recomendado)

Rutas que **deberían** indexarse cuando el contenido es público y completo:

| Ruta | Prioridad | Metadata hoy | Notas |
|------|-----------|--------------|-------|
| `/home` | Alta | Hereda root | Landing principal post-intro |
| `/explore` | Alta | Estático básico | Filtros en query — canonical futuro |
| `/categorias` | Media | Hereda root | Gateway categorías |
| `/categoria/event` | Alta | Hereda root | Landing editorial |
| `/categoria/gastro` | Alta | Hereda root | |
| `/categoria/rental` | Alta | Hereda root | |
| `/categoria/excursion` | Alta | Hereda root | |
| `/events/[eventId]` | Alta | **Dinámica** | Ficha ticketera |
| `/gastronomicos/[id]` | Alta | Hereda root | Preferir una URL canónica vs `/restaurants/` |
| `/restaurants/[id]` | Media | Hereda root | **Duplicado** — canonical o redirect 301 |
| `/rentals/[id]` | Alta | Hereda root | |
| `/excursiones/[id]` | Alta | Hereda root | |
| `/hoteles/[id]` | Media | Hereda root | Ficha informativa |
| `/producers` | Media | Hereda root | Listado |
| `/producers/[id]` | Alta | Hereda root | |
| `/legal/[slug]` | Media | **Dinámica** | Solo si doc publicado |
| `/referrers/[slug]` | Baja | Hereda root | Perfiles referidos públicos |
| `/descuentos/[id]` | Baja | Hereda root | Promo pública si aplica |
| `/` | Baja | Hereda root | Redirige a `/home` — canonical a `/home` recomendado |

**Indexación condicional / baja prioridad:** `/content/[id]`, `/users/[userId]`, `/referrers/join/[token]`, `/descuentos/reclamo/[claimId]`.

**No indexar:** ver §5.

---

## 5. Tabla de rutas no indexables (recomendado)

| Ruta / prefijo | Motivo |
|----------------|--------|
| `/admin/**` | Panel operativo |
| `/producer/**` | Portal productor |
| `/gastro/**` (portal) | Portal operador gastro |
| `/hotel/**` (portal, no `/hoteles`) | Portal hotel |
| `/referrer/**` | Portal referido |
| `/me/**`, `/cuenta/**` | Área usuario |
| `/profiles` | Selector portales autenticado |
| `/checkout/**` | **Ya noindex** ✓ |
| `/me/orders/**`, `/me/tickets/**` | Transaccional |
| `/login`, `/register/**`, `/logout`, `/verify-email` | Auth |
| `/dev/**` | Herramientas dev |
| `/api/**` | API routes NextAuth |
| `/r/[code]` | Redirect efímero |
| `/hoteles` (listado) | **Próximamente** — `noindex` hasta launch |

---

## 6. Riesgos

| Severidad | Riesgo | Impacto |
|-----------|--------|---------|
| **Crítico** | Portales `/admin`, `/me`, `/producer`, etc. sin `noindex` | URLs privadas en Google |
| **Crítico** | Sin `robots.txt` | Crawl sin guía; no bloqueo de `/admin` a nivel archivo |
| **Alto** | Sin sitemap | Descubrimiento lento; GSC incompleto |
| **Medio** | Metadata dinámica incompleta o con dedupe pendiente | Queda SEO 6 (canonicals / dedupe) + SEO 7 (JSON‑LD) |
| **Alto** | `NEXT_PUBLIC_APP_URL` no garantizado | OG/canonical con host incorrecto |
| **Medio** | Sin JSON-LD | Sin rich results (eventos, ratings) |
| **Medio** | `/hoteles` Próximamente indexable | Thin content |
| **Mitigado (SEO 6)** | Duplicado `/gastronomicos` vs `/restaurants` | Redirect permanente `/restaurants/:id` → `/gastronomicos/:id` + canonical |
| **Medio** | Sin favicon | Branding SERP / tabs |
| **Bajo** | Title evento con doble template | UX SERP fea |
| **Bajo** | IDs opacos en URLs | CTR menor (no bloqueante V1) |

---

## 7. Quick wins (corregir antes de SEO 3+)

1. **Confirmar en VPS:** `NEXT_PUBLIC_APP_URL=https://yoteinvito.club` (web `.env`).
2. **SEO 2:** `robots.ts` + disallow `/admin`, `/me`, portales, auth, `/dev`.
3. **SEO 2:** `noindex` en layouts `(portal)` y `(auth)` vía server layout wrapper o metadata export en route group server layout.
4. **SEO 2:** `noindex` en `/hoteles` (Próximamente).
5. **SEO 3:** Favicon + OG image default (asset en GCS `public/platform/`).
6. **SEO 3:** Completar OG/Twitter global en root layout.
7. **SEO 4:** Corregir title eventos — usar `title: event.title` sin repetir sufijo (dejar al template).
8. **Canonical:** decidir URL única gastro (`/gastronomicos/` vs `/restaurants/`) antes de sitemap.

---

## 8. Plan recomendado — slices SEO 2–9

| Slice | Alcance | Entregables |
|-------|---------|-------------|
| **SEO 2** | Fundamentos crawl | `robots.ts`, `sitemap.ts` estático mínimo, `NEXT_PUBLIC_APP_URL` en `.env.example`, `noindex` portal/auth/dev/hoteles-listado |
| **SEO 3** | Metadata global | Favicon, `icon.tsx`, OG/Twitter defaults, `siteName`, imagen fallback, ampliar description |
| **SEO 4** | Metadata estática pública | Server metadata o layouts para `/home`, `/explore`, `/categorias`, `/categoria/[category]`, `/producers` |
| **SEO 5** | Metadata dinámica fichas | `generateMetadata` server para gastro, rental, excursion, hotel, productora (fetch API public) |
| **SEO 6** | Canonical + dedup | Canonical por ficha; redirect 301 `/restaurants/` → `/gastronomicos/` (o viceversa); canonical explore con query handling |
| **SEO 7** | JSON-LD core | `Event`, `Organization` (productora), `BreadcrumbList` en eventos |
| **SEO 8** | JSON-LD vertical + reviews | Gastro (`Restaurant`/`FoodEstablishment`), `Product` rental, `TouristTrip` excursion, hotel; `AggregateRating` donde API lo permita |
| **SEO 9** | GSC + sitemap dinámico + ops | Verificar dominio GSC, sitemap con URLs API, procedimiento post-deploy, validación rich results / OG debuggers |

**Dependencias:** SEO 2 antes de indexación marketing; SEO 5–6 antes de campañas sociales por vertical; SEO 9 después de sitemap estable.

---

## 9. Checklist V2 — estado recomendado (post-auditoría)

### Google Search Console y SEO técnico

- [x] **Auditoría SEO técnica (SEO 1)** — este documento
- [ ] Crear propiedad GSC dominio `yoteinvito.club`
- [ ] Verificar DNS TXT DonWeb
- [ ] Enviar sitemap (bloqueado hasta SEO 2)
- [ ] Validar robots.txt (bloqueado hasta SEO 2)
- [ ] Revisar indexación fichas públicas (post GSC)
- [ ] Validar no-index privados (bloqueado hasta SEO 2)
- [ ] Core Web Vitals (con tráfico)
- [ ] Rich results (bloqueado hasta SEO 7–8)
- [ ] Procedimiento SEO post-deploy (SEO 9)

### SEO, GEO y metadata social

- [x] `next/image` GCS remoto
- [x] Title template global (parcial — orden `%s | Yo Te Invito`)
- [x] Metadata base global (parcial — sin OG/Twitter completos)
- [x] OG dinámico eventos (parcial — sin fallback imagen)
- [x] Twitter eventos (`summary_large_image`)
- [x] Canonical legales
- [x] No-index checkout
- [ ] Favicon / app icons
- [ ] Metadata home, explore, categorías
- [ ] Metadata dinámica gastro/rental/excursion/hotel/productor
- [ ] OG/Twitter global + fallback imagen
- [ ] Canonical fichas públicas
- [ ] JSON-LD todas las verticales
- [ ] Sitemap + robots
- [ ] No-index portales privados
- [ ] GEO/metadata ciudad
- [ ] Validación preview social / rich results

---

## 10. Procedimiento SEO post-deploy (borrador — formalizar en SEO 9)

1. Confirmar `NEXT_PUBLIC_APP_URL` y build web en VPS.
2. Verificar `https://yoteinvito.club/robots.txt` y `https://yoteinvito.club/sitemap.xml`.
3. Spot-check metadata: View Source en `/events/{id}`, `/home`, `/explore`.
4. Probar compartir URL evento en debugger OG (Facebook/LinkedIn) y Twitter Card Validator.
5. GSC → Inspección URL en home + 3 fichas por vertical.
6. GSC → Enviar sitemap; revisar cobertura a 7 días.
7. Buscar `site:yoteinvito.club admin` / `site:yoteinvito.club/me` — no deberían aparecer tras SEO 2.
8. Documentar incidencias en `CONTEXT_PENDIENTES.md`.

---

## 11. Referencias de código

| Archivo | Rol SEO |
|---------|---------|
| `apps/web/app/layout.tsx` | Metadata global |
| `apps/web/app/(public)/events/[eventId]/layout.tsx` | Única ficha con OG/Twitter dinámico |
| `apps/web/app/(public)/legal/[slug]/page.tsx` | Metadata + canonical legales |
| `apps/web/app/(public)/explore/layout.tsx` | Metadata estática explore |
| `apps/web/app/(public)/checkout/layout.tsx` | `noindex` checkout |
| `apps/web/public/manifest.json` | PWA parcial |
| `apps/web/next.config.js` | `remotePatterns` GCS |

**Ausentes:** `app/robots.ts`, `app/sitemap.ts`, `app/icon.*`, JSON-LD components.

---

## 12. Corrección sugerida antes de avanzar

Prioridad inmediata (SEO 2): **`robots.ts` + `noindex` en route groups privados + verificar `NEXT_PUBLIC_APP_URL` en producción.** Sin esto, abrir GSC y enviar sitemap puede indexar URLs de portal y checkout parcial no es suficiente.

No implementado en este slice por alcance.
