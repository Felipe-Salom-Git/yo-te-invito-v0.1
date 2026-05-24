'use client';

import type { MeLegalRequirementItem } from '@/repositories/interfaces';
import { LegalAcceptanceCheckboxList } from './LegalAcceptanceCheckboxList';
import { PageLoader } from '@/components';

type Props = {
  items: MeLegalRequirementItem[];
  selectedVersionIds: string[];
  onChange: (versionIds: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
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
  guestMode = false,
}: Props) {
  if (loading) {
    return <PageLoader message="Cargando documentos legales…" />;
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
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
