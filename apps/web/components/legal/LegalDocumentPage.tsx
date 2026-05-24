import Link from 'next/link';
import type { PublicLegalDocumentResponse } from '@yo-te-invito/shared';
import { LegalDocumentMeta } from './LegalDocumentMeta';
import { LegalDocumentContent } from './LegalDocumentContent';

type Props = {
  document: PublicLegalDocumentResponse;
  backHref?: string;
  backLabel?: string;
};

export function LegalDocumentPage({
  document,
  backHref = '/home',
  backLabel = 'Volver al inicio',
}: Props) {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href={backHref}
          className="inline-flex text-sm text-text-muted transition-colors hover:text-accent"
        >
          ← {backLabel}
        </Link>

        <LegalDocumentMeta document={document} />
        <LegalDocumentContent contentMarkdown={document.contentMarkdown} />

        <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs text-text-muted">
          <p>© {new Date().getFullYear()} Yo Te Invito</p>
          <p className="mt-1">
            Este texto corresponde a la versión publicada indicada arriba.
          </p>
        </footer>
      </div>
    </div>
  );
}
