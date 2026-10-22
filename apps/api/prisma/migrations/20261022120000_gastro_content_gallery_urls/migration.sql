-- G3.1 — GastroContent multi-image gallery (Json String[]), preserve legacy imageUrl.
ALTER TABLE "GastroContent" ADD COLUMN "galleryUrls" JSONB;

-- Backfill: existing single imageUrl becomes a one-item ordered gallery.
UPDATE "GastroContent"
SET "galleryUrls" = jsonb_build_array("imageUrl")
WHERE "imageUrl" IS NOT NULL
  AND btrim("imageUrl") <> ''
  AND "galleryUrls" IS NULL;
