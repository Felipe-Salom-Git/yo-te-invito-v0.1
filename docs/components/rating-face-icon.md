# RatingFaceIcon

`apps/web/components/reviews/RatingFaceIcon.tsx` — G11.1 (V3.3)

## Purpose

Renders the rating face of a visual level (1–5) with the official icon set
(`apps/web/public/icons/ratings/rating-face-{1..5}.png`, 1 = worst, 5 = best).
Replaces the emoji glyphs previously stored in `VISUAL_FACE_META`.

## Inputs

| Prop | Type | Notes |
|------|------|-------|
| `level` | `number` | Clamped to 1–5 via `visualFaceMeta` |
| `className` | `string?` | Size utilities (default `h-4 w-4`) |
| `decorative` | `boolean?` | Default `true` (`alt=""`, `aria-hidden`): the wrapper carries `publicRatingAriaLabel`. `false` → `alt`/`title` = face label |

## Data flow

Stored rating stays on the internal 1–10 scale (DB/API unchanged).
`publicFaceFromTen(rating10)` / `visualFaceMeta(level)` → `{ level, iconSrc, label }` → `RatingFaceIcon`.
Labels unchanged: Muy insatisfecho · Insatisfecho · Neutral · Conforme · Muy conforme.

## Used by

`RatingInput` (unselected faces dimmed), `ReviewSummary`, `ReviewCard`, `RatingBadge`,
`ContentCard`, `ContentPreviewMeta`, `HomeHero`, Gastro / Hotel hero rating chip,
`ManagedReviewSummary` distribution.

## Edge cases

- Native `<select>` filters (`PublicReviewsFiltersBar`, `ManagedReviewsCommentsPage`) keep
  text labels: `<option>` cannot render images.
- Source assets: 1080×1350 PNG with white background → cropped to the ring, outside made
  transparent, resized to 128×128 (works on the dark theme).
- Assert: `pnpm --filter api run test:rating-face-icons`.
