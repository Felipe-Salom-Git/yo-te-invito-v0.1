import type { LegalAcceptanceContext, LegalDocument, LegalDocumentVersion } from '@prisma/client';
import {
  LEGAL_KEY_TO_SLUG,
  type LegalDocumentKeyValue,
  type MeLegalRequirementItem,
  type PublicLegalMissingDocument,
  type PublicLegalRequirementsResponse,
  type RegistrationProfileType,
} from '@yo-te-invito/shared';

export type LegalDocumentWithVersions = LegalDocument & {
  versions: LegalDocumentVersion[];
};

export function matchesLegalContextFlag(
  context: LegalAcceptanceContext,
  doc: Pick<
    LegalDocument,
    'isRequiredForSignup' | 'isRequiredForCheckout' | 'isRequiredForPortalAccess'
  >,
): boolean {
  switch (context) {
    case 'SIGNUP':
      return doc.isRequiredForSignup;
    case 'CHECKOUT':
      return doc.isRequiredForCheckout;
    case 'PROFILE_ONBOARDING':
    case 'PORTAL_ACCESS':
      return doc.isRequiredForPortalAccess;
    default:
      return false;
  }
}

export function matchesLegalProfileType(
  doc: Pick<LegalDocument, 'appliesToProfiles'>,
  profileType?: string,
): boolean {
  if (!profileType) return true;
  if (doc.appliesToProfiles.length === 0) return true;
  return doc.appliesToProfiles.includes(profileType);
}

export function buildPublicLegalRequirements(
  documents: LegalDocumentWithVersions[],
  context: LegalAcceptanceContext,
  profileType?: RegistrationProfileType,
): PublicLegalRequirementsResponse {
  const required: MeLegalRequirementItem[] = [];
  const missingRequiredDocuments: PublicLegalMissingDocument[] = [];
  let catalogRequiredCount = 0;

  for (const doc of documents) {
    if (!matchesLegalContextFlag(context, doc)) continue;
    if (!matchesLegalProfileType(doc, profileType)) continue;

    catalogRequiredCount += 1;
    const published = doc.versions.find((v) => v.status === 'PUBLISHED');

    if (!published) {
      missingRequiredDocuments.push({
        documentKey: doc.key as LegalDocumentKeyValue,
        title: doc.title,
        reason: 'NO_PUBLISHED_VERSION',
      });
      continue;
    }

    const slug = LEGAL_KEY_TO_SLUG[doc.key as LegalDocumentKeyValue];
    required.push({
      documentId: doc.id,
      documentKey: doc.key as LegalDocumentKeyValue,
      title: published.title,
      documentVersionId: published.id,
      version: published.version,
      publishedAt: (published.publishedAt ?? published.updatedAt).toISOString(),
      publicSlug: slug ?? null,
      publicPath: slug ? `/legal/${slug}` : null,
      context,
    });
  }

  required.sort((a, b) => a.documentKey.localeCompare(b.documentKey));
  missingRequiredDocuments.sort((a, b) => a.documentKey.localeCompare(b.documentKey));

  const canProceed =
    catalogRequiredCount === 0 ||
    (missingRequiredDocuments.length === 0 && required.length === catalogRequiredCount);

  return {
    context,
    profileType: profileType ?? null,
    required,
    missingRequiredDocuments,
    canProceed,
    catalogRequiredCount,
  };
}
