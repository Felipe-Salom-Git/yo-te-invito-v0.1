'use client';

import type { MeLegalRequirementItem } from '@/repositories/interfaces';
import { LEGAL_SIGNUP_USER_MESSAGES, type PublicLegalMissingDocument } from '@yo-te-invito/shared';
import { LegalAcceptanceCheckboxList } from './LegalAcceptanceCheckboxList';
import { Button, PageLoader } from '@/components';

type Props = {
  items: MeLegalRequirementItem[];
  selectedVersionIds: string[];
  onChange: (versionIds: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  /** Signup blocked: required docs exist in catalog but none published. */
  configBlocked?: boolean;
  missingRequiredDocuments?: PublicLegalMissingDocument[];
  fetchError?: boolean;
  onRetryFetch?: () => void;
  /** Guest checkout: acknowledgment without server-side /me/legal/accept */
  guestMode?: boolean;
};

/**
 * Legal checkboxes for signup/checkout (authenticated or guest).
 */
export function LegalFlowAcceptanceBlock({
  items,
  selectedVersionIds,
  onChange,
  disabled = false,
  loading = false,
  error,
  configBlocked = false,
  missingRequiredDocuments = [],
  fetchError = false,
  onRetryFetch,
  guestMode = false,
}: Props) {
  if (loading) {
    return <PageLoader message="Cargando documentos legales…" />;
  }

  if (fetchError) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Documentos legales</h3>
        <p className="text-sm text-red-400" role="alert">
          {error ?? LEGAL_SIGNUP_USER_MESSAGES.loadError}
        </p>
        {onRetryFetch ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={onRetryFetch}
          >
            Reintentar carga
          </Button>
        ) : null}
      </div>
    );
  }

  if (configBlocked) {
    return (
      <div className="space-y-3" role="alert">
        <h3 className="text-sm font-semibold text-text">Documentos legales</h3>
        <p className="text-sm text-amber-400">{error}</p>
        {missingRequiredDocuments.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-xs text-text-muted">
            {missingRequiredDocuments.map((doc) => (
              <li key={doc.documentKey}>{doc.title}</li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-text-muted">
          Intentá más tarde o contactá a soporte si el problema continúa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text">Documentos legales</h3>
      {guestMode ? (
        <p className="text-xs text-text-muted">
          Al confirmar la compra declarás haber leído y aceptado las condiciones vigentes. Si
          creás una cuenta o iniciás sesión, la aceptación queda registrada con fecha y versión.
        </p>
      ) : (
        <p className="text-xs text-text-muted">
          Estos documentos pueden actualizarse. Si publicamos una nueva versión requerida, te
          pediremos aceptarla nuevamente. La aceptación queda registrada con fecha y versión.
        </p>
      )}
      <LegalAcceptanceCheckboxList
        items={items}
        selectedVersionIds={selectedVersionIds}
        onChange={onChange}
        disabled={disabled}
      />
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
