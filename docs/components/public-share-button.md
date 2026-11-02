# PublicShareButton

`apps/web/components/share/PublicShareButton.tsx` — G11.2 (V3.3)

## Purpose

Single share action for every public detail. Replaces the G9 gastro share card and the
`EventActionBar` share button (which shared `window.location.href`, query included).

## Inputs

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Shared title / message line |
| `path` | `string` | Public path; query strings are always dropped |
| `kind` | `PublicShareKind` | `place` · `event` · `discount` · `activity` · `rental` · `hotel` · `publication` · `producer` (message intro) |
| `tone` | `overlay \| subtle` | `overlay` on hero images, `subtle` on cards/modals |
| `menuPlacement` | `up \| down` | Fallback menu direction (`up` inside bottom-anchored heroes) |

## Behaviour (same rules as G9)

- `navigator.share` when available (title + message + URL); otherwise a menu with
  **WhatsApp** (`wa.me/?text=`, no destination phone) and **Copiar enlace** (toast «Enlace copiado»).
- Native share failure (not cancel) → opens the fallback menu.
- URL = `buildPublicShareUrl(origin, path)` (`apps/web/lib/share/publicShare.ts`): no `tenantId`,
  no query, no portal/admin route; only `#publicacion-{id}` anchors keep a hash.

## Placement (right under the title)

| Surface | Path |
|---------|------|
| Preview modal (`ContentPreviewModal`, all verticals) | `getContentDetailHref(item)` |
| Event / place hero (`EventHeroPremium`) | `getContentDetailHref({ id, category })` |
| Gastro ficha (`GastroLocationHero.titleAction`) | `/gastronomicos/{profileId}` |
| Gastro publication (`GastroLocationEditorialSection`) | `/gastronomicos/{profileId}#publicacion-{contentId}` |
| Hotel / activity / rental heroes (`titleAction`) | `/hoteles/{eventId}` · `/excursiones/{id}` · `/rentals/{id}` |
| Gastro discount / activity coupon | `/descuentos/{id}` · `/excursiones/cupones/{id}` |
| Producer profile | `/producers/{id}` |
| Portal locations list (`GastroLocationShareActions`) | `/gastronomicos/{profileId}` (ACTIVE only) |

Assert: `pnpm --filter api run test:public-share`.
