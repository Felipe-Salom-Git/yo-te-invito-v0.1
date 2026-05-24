import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { fetchPublicLegalDocument } from '@/lib/legal/fetch-public-legal-document';
import {
  DEFAULT_PUBLIC_LEGAL_TENANT_ID,
  isPublicLegalSlug,
  publicLegalSeoDescription,
  PUBLIC_LEGAL_SLUGS,
} from '@/lib/legal/public-legal-config';

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PUBLIC_LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isPublicLegalSlug(slug)) {
    return { title: 'Documento no encontrado', robots: { index: false } };
  }

  const doc = await fetchPublicLegalDocument(slug, DEFAULT_PUBLIC_LEGAL_TENANT_ID);
  const title = doc?.title ?? 'Documento legal';
  const description = doc
    ? `${publicLegalSeoDescription(slug)} Versión ${doc.version}.`
    : publicLegalSeoDescription(slug);

  return {
    title,
    description,
    robots: doc ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: `${title} | Yo Te Invito`,
      description,
      type: 'article',
    },
    alternates: {
      canonical: `/legal/${slug}`,
    },
  };
}

export default async function PublicLegalDocumentRoute({ params }: Props) {
  const { slug } = await params;

  if (!isPublicLegalSlug(slug)) {
    notFound();
  }

  const document = await fetchPublicLegalDocument(slug, DEFAULT_PUBLIC_LEGAL_TENANT_ID);

  if (!document) {
    notFound();
  }

  return <LegalDocumentPage document={document} />;
}
