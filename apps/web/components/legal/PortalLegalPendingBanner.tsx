'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PortalNavKey } from '@/lib/navigation/portalNavConfig';
import {
  PORTAL_LEGAL_PROFILE_BY_KEY,
  portalHasLegalProfile,
} from '@/lib/navigation/portalLegalProfile';
import { useMyLegalRequirements, useAcceptLegalDocuments } from '@/lib/query/me-legal';
import {
  allLegalItemsSelected,
  LEGAL_ACCEPTANCE_REQUIRED_MSG,
} from '@/lib/legal/legal-acceptance-validation';
import { LegalAcceptanceCheckboxList } from './LegalAcceptanceCheckboxList';
import { Button } from '@/components';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  portalKey: PortalNavKey;
};

/**
 * Non-blocking banner when portal-specific terms are pending (PORTAL_ACCESS).
 */
export function PortalLegalPendingBanner({ portalKey }: Props) {
  const profileType = PORTAL_LEGAL_PROFILE_BY_KEY[portalKey];
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const enabled = portalHasLegalProfile(portalKey) && !!profileType;
  const { data, isLoading, refetch } = useMyLegalRequirements(
    { context: 'PORTAL_ACCESS', profileType },
    enabled,
  );
  const acceptMutation = useAcceptLegalDocuments();

  if (!enabled || isLoading || !data || data.allAccepted) {
    return null;
  }

  const pending = data.pending;

  const handleAccept = async () => {
    setLocalError(null);
    if (!allLegalItemsSelected(pending, selectedIds)) {
      setLocalError(LEGAL_ACCEPTANCE_REQUIRED_MSG);
      return;
    }
    try {
      await acceptMutation.mutateAsync({
        documentVersionIds: selectedIds,
        context: 'PORTAL_ACCESS',
      });
      setSelectedIds([]);
      setExpanded(false);
      void refetch();
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  };

  return (
    <div
      className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4"
      role="status"
    >
      <p className="text-sm font-medium text-text">
        Tenés términos del portal pendientes de aceptación
      </p>
      <p className="mt-1 text-sm text-text-muted">
        Para operar con tranquilidad en este portal, revisá y aceptá los documentos vigentes. Podés
        seguir navegando; algunas acciones sensibles pueden requerir la aceptación más adelante.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Ocultar' : 'Revisar y aceptar'}
        </Button>
        {pending[0]?.publicPath ? (
          <Link
            href={pending[0].publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-accent hover:underline"
          >
            Ver documento →
          </Link>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <LegalAcceptanceCheckboxList
            items={pending}
            selectedVersionIds={selectedIds}
            onChange={setSelectedIds}
            disabled={acceptMutation.isPending}
          />
          {localError ? <p className="text-sm text-red-400">{localError}</p> : null}
          <Button
            type="button"
            size="sm"
            onClick={() => void handleAccept()}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? 'Registrando…' : 'Registrar aceptación'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
