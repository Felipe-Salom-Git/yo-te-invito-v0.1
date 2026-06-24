-- Commercial profile terms are required at SIGNUP (not only PORTAL_ACCESS post-registration).
UPDATE "LegalDocument"
SET
  "isRequiredForSignup" = true,
  "isRequiredForPortalAccess" = false,
  "updatedAt" = NOW()
WHERE "key" IN ('producer_terms', 'gastro_terms', 'hotel_terms', 'referrer_terms');
