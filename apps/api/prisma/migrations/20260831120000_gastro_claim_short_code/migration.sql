-- Gastro discount claim short codes for manual scanner entry (V3.3 Etapa 3).

ALTER TABLE "GastroDiscountClaim" ADD COLUMN "shortCode" TEXT;

DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR r IN SELECT id FROM "GastroDiscountClaim" WHERE "shortCode" IS NULL LOOP
    attempts := 0;
    LOOP
      new_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "GastroDiscountClaim" WHERE "shortCode" = new_code);
      attempts := attempts + 1;
      IF attempts > 30 THEN
        new_code := upper(substr(replace(r.id, '-', ''), greatest(length(replace(r.id, '-', '')) - 8, 1)));
        EXIT;
      END IF;
    END LOOP;
    UPDATE "GastroDiscountClaim" SET "shortCode" = new_code WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX "GastroDiscountClaim_shortCode_key" ON "GastroDiscountClaim"("shortCode");

ALTER TABLE "GastroDiscountClaim" ALTER COLUMN "shortCode" SET NOT NULL;
