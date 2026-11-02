'use client';

import {
  formatBenefitMoneyCents,
  isSafeExternalHttpUrl,
  type BenefitSettlementTransferDto,
  type BenefitVertical,
} from '@yo-te-invito/shared';
import { Badge } from '@/components';
import { describeTransferAttribution } from '@/lib/admin/settlement-transfer-attribution-ui';

type Props = {
  transfers: BenefitSettlementTransferDto[];
  vertical: BenefitVertical;
  settlementLocalName: string | null;
  reverseDisabled: boolean;
  onReverse: (transfer: BenefitSettlementTransferDto) => void;
};

/** G10.D5 — CASH transfers of a settlement with their exact attribution (GASTRO) or settlement level. */
export function SettlementTransfersTable({ transfers, vertical, settlementLocalName, reverseDisabled, onReverse }: Props) {
  const isGastro = vertical === 'GASTRO';
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-text-muted">
            <th className="px-2 py-2">Fecha</th>
            {isGastro ? <th className="px-2 py-2">Descuento</th> : null}
            {isGastro ? <th className="px-2 py-2">Local</th> : null}
            <th className="px-2 py-2">Monto</th>
            <th className="px-2 py-2">Referencia</th>
            <th className="px-2 py-2">Comprobante</th>
            <th className="px-2 py-2">Estado</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => {
            const view = describeTransferAttribution(t, vertical, settlementLocalName);
            return (
              <tr key={t.id} className="border-b border-border/60 align-top">
                <td className="px-2 py-2">{new Date(t.transferredAt).toLocaleDateString('es-AR')}</td>
                {isGastro ? (
                  <td className="px-2 py-2">
                    <div>{view.discountLabel}</div>
                    {view.badge ? (
                      <Badge variant={view.badge === 'EXACT' ? 'muted' : 'accent'} className="mt-1">
                        {view.badge}
                      </Badge>
                    ) : null}
                  </td>
                ) : null}
                {isGastro ? <td className="px-2 py-2">{view.localLabel}</td> : null}
                <td className={`px-2 py-2 ${t.isActive ? '' : 'text-text-muted line-through'}`}>
                  {formatBenefitMoneyCents(t.amountCents)}
                </td>
                <td className="px-2 py-2">{t.reference ?? '—'}</td>
                <td className="px-2 py-2">
                  {t.proofUrl && isSafeExternalHttpUrl(t.proofUrl) ? (
                    <a href={t.proofUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      Ver comprobante
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-2">
                  <Badge>{t.isActive ? 'Registrada' : 'Revertida'}</Badge>
                  {!t.isActive ? (
                    <div className="mt-1 max-w-xs text-xs text-text-muted">
                      {t.reversedAt ? new Date(t.reversedAt).toLocaleString('es-AR') : null}
                      {t.reversalReason ? ` — ${t.reversalReason}` : null}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  {t.isActive ? (
                    <button
                      type="button"
                      className="text-sm text-accent hover:underline disabled:opacity-50"
                      disabled={reverseDisabled}
                      onClick={() => onReverse(t)}
                    >
                      Revertir
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
