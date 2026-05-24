import { formatPublicLegalDate } from '@/lib/legal/format-legal-date';
import type { PublicLegalDocumentResponse } from '@yo-te-invito/shared';

type Props = {
  document: PublicLegalDocumentResponse;
};

export function LegalDocumentMeta({ document }: Props) {
  return (
    <div className="border-b border-border/80 pb-6">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Documento legal
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {document.title}
      </h1>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
        <div>
          <dt className="sr-only">Versión</dt>
          <dd>
            Versión <span className="font-mono text-text">{document.version}</span>
          </dd>
        </div>
        <div>
          <dt className="sr-only">Publicado</dt>
          <dd>Publicado el {formatPublicLegalDate(document.publishedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
