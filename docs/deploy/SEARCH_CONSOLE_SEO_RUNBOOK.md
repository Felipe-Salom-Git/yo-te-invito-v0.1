# Google Search Console + SEO técnico — Runbook (Yo Te Invito)

Este runbook documenta el procedimiento **manual** para cerrar el bloque de SEO técnico en producción:

- Verificación de dominio en Google Search Console (GSC)
- Envío y control de `sitemap.xml`
- Validación de `robots.txt`, `noindex`, canonical URLs
- Chequeos post‑deploy y frecuencia recomendada

## 1) Prerrequisitos (antes de tocar GSC)

Confirmar en producción (`NEXT_PUBLIC_APP_URL=https://yoteinvito.club`) que:

- `robots.txt` está activo: `GET /robots.txt`
- `sitemap.xml` está activo: `GET /sitemap.xml`
- El sitemap **no** incluye rutas privadas/portales/auth/checkout/dev
- Canonical URLs razonables (al menos en landings y fichas públicas)

Comandos sugeridos (post‑deploy):

```bash
curl -I https://yoteinvito.club
curl https://yoteinvito.club/robots.txt
curl https://yoteinvito.club/sitemap.xml
```

Archivos relevantes:

- `apps/web/app/robots.ts`
- `apps/web/app/sitemap.ts`
- `apps/web/app/layout.tsx` (metadataBase / canonical helpers)

## 2) Crear propiedad en Google Search Console

1. Entrar a Google Search Console con la cuenta de Google operativa.
2. Crear propiedad tipo **Dominio**:
   - `yoteinvito.club`

## 3) Verificación DNS (DonWeb)

GSC va a pedir un TXT record. Procedimiento:

1. Copiar el TXT provisto por GSC.
2. Ir a DonWeb → DNS del dominio `yoteinvito.club`.
3. Agregar registro **TXT** con el valor de verificación.
4. Esperar propagación (puede tardar).
5. Volver a GSC y confirmar verificación.

Notas:

- No publicar secretos. El TXT de verificación no es un secreto, pero mantenerlo documentado solo donde corresponda.
- Si el dominio ya fue verificado anteriormente, reusar la propiedad existente y no duplicar.

## 4) Enviar sitemap

Una vez verificado el dominio:

1. Ir a **Sitemaps**.
2. Enviar:
   - `https://yoteinvito.club/sitemap.xml`

Qué esperar:

- “Success” o “Couldn’t fetch” (si falla, revisar `robots.txt`, status HTTP y cache/CDN).
- En las horas/días siguientes se verá progreso en **Page indexing**.

## 5) Checklist de inspección (URLs críticas)

Inspeccionar en GSC (URL Inspection) una muestra representativa:

- Landing: `/home`, `/explore`, `/categorias`
- Legal: `/legal/terminos` (o slug equivalente)
- Evento: `/events/<id>`
- Rental: `/rentals/<id>`
- Excursión: `/excursiones/<id>`
- Gastro: `/gastronomicos/<id>`
- Hotel: `/hoteles/<id>` (si existe ficha pública)
- Producer: `/producers/<id>`

En cada inspección, revisar:

- **Indexing allowed?** (si es pública debería permitir)
- **Canonical (User-declared / Google-selected)**: debe apuntar a la URL canónica
- **Robots**: no debe bloquear contenido público

Rutas que deben quedar fuera (no enviar ni indexar):

- `/admin`, `/me`, `/producer`, `/gastro`, `/hotel`, `/referrer`
- `/auth`, `/login`, `/register`
- `/checkout`, `/orders`, `/tickets`
- `/_next`, `/api`, `/dev`, `/scanner`

## 6) Validar noindex / robots / canonical

### 6.1 robots.txt

- Confirmar que `robots.txt` incluya `Sitemap: https://yoteinvito.club/sitemap.xml`.
- Confirmar que disallow incluya portales y rutas técnicas.

### 6.2 noindex

- Portales privados deben responder con `noindex` por metadata (cuando aplique).
- Si una ruta no debe indexarse, no debe estar en el sitemap.

### 6.3 canonical

- Confirmar que rutas duplicadas tengan redirect/canonical:
  - Alias `restaurants` → canónica `gastronomicos` (redirect + canonical).

## 7) Rich Results / Enhancements

Luego de que Google recrawlee:

- Revisar **Enhancements** / **Rich results** (si aparecen).
- Para validar puntualmente:
  - Google Rich Results Test sobre una URL de evento y otra de gastro/hotel si aplica.

Reglas de markup:

- No inventar datos (rating, reviews, stock, availability).
- `aggregateRating` solo si hay datos reales y visibles.

## 8) Frecuencia recomendada post‑deploy

- **Después de cada deploy**: chequear `robots.txt`, `sitemap.xml` (HTTP 200) y 1–2 URLs en inspección.
- **Semanal (primer mes)**: revisar “Page indexing” + errores de sitemap.
- **Mensual**: revisar Core Web Vitals + Enhancements.

