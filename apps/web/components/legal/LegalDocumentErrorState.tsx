import Link from 'next/link';

type Variant = 'not-found' | 'unavailable';

type Props = {
  variant?: Variant;
  slug?: string;
};

export function LegalDocumentErrorState({ variant = 'not-found', slug }: Props) {
  const isNotFound = variant === 'not-found';

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Legales
      </p>
      <h1 className="mt-3 text-2xl font-bold text-text">
        {isNotFound ? 'Documento no disponible' : 'No se pudo cargar'}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">
        {isNotFound ? (
          <>
            El documento solicitado no está publicado o no existe
            {slug ? ` («${slug}»)` : ''}. Solo mostramos versiones publicadas oficialmente.
          </>
        ) : (
          'Hubo un problema al cargar el documento. Intentá de nuevo más tarde.'
        )}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/home"
          className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
        >
          Ir al inicio
        </Link>
        <Link
          href="/categorias"
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent/30 hover:text-text"
        >
          Explorar categorías
        </Link>
      </div>
    </div>
  );
}
