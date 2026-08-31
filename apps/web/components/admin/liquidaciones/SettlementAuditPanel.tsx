'use client';

import { Badge } from '@/components';
import { useAdminBenefitSettlementAudit } from '@/lib/query/benefit-settlements';
import {
  BENEFIT_INTEGRITY_STATUS_LABEL,
  COURTESY_LEDGER_ENTRY_TYPE_LABEL,
  formatBenefitMoneyCents,
  formatSignedBenefitMoneyCents,
} from '@yo-te-invito/shared';

function integrityBadgeVariant(
  status: keyof typeof BENEFIT_INTEGRITY_STATUS_LABEL,
): 'default' | 'muted' {
  if (status === 'OK') return 'muted';
  return 'default';
}

export function SettlementAuditPanel({ settlementId }: { settlementId: string }) {
  const { data, isLoading, isError } = useAdminBenefitSettlementAudit(settlementId);

  if (isLoading) {
    return <p className="mt-4 text-sm text-text-muted">Cargando auditoría…</p>;
  }
  if (isError || !data) {
    return <p className="mt-4 text-sm text-red-500">No se pudo cargar la auditoría.</p>;
  }

  return (
    <section className="mt-8 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-text">Auditoría</h3>
        <Badge variant={integrityBadgeVariant(data.integrityStatus)}>
          {BENEFIT_INTEGRITY_STATUS_LABEL[data.integrityStatus]}
        </Badge>
      </div>

      {data.issues.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {data.issues.map((issue) => (
            <li
              key={`${issue.code}-${issue.entityId ?? issue.message}`}
              className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm"
            >
              <span className="font-medium">{issue.severity}:</span> {issue.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-text-muted">
          Sin inconsistencias detectadas. Cash pendiente y usos sin asignar no se consideran errores.
        </p>
      )}

      {data.agreements.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-text">Acuerdos aplicados</h4>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {data.agreements.map((a) => (
              <li key={a.agreementId}>
                {a.validFrom}
                {a.validTo ? ` → ${a.validTo}` : ' → abierto'}:{' '}
                {formatBenefitMoneyCents(a.unitPriceCents)} / uso · canje ×{a.barterMultiplier}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.timeline.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-text">Línea de tiempo</h4>
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
            {data.timeline.map((event, idx) => (
              <li key={`${event.occurredAt}-${event.kind}-${idx}`} className="border-l-2 border-border pl-3">
                <div className="text-xs text-text-muted">
                  {new Date(event.occurredAt).toLocaleString('es-AR')}
                </div>
                <div>{event.label}</div>
                {event.amountCents ? (
                  <div className="text-text-muted">
                    {formatBenefitMoneyCents(event.amountCents)}
                  </div>
                ) : null}
                {event.actorLabel ? (
                  <div className="text-xs text-text-muted">Por: {event.actorLabel}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.allocations.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <h4 className="text-sm font-medium text-text">Asignaciones</h4>
          <table className="mt-2 min-w-full text-left text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="px-1 py-1">Validación</th>
                <th className="px-1 py-1">Beneficio</th>
                <th className="px-1 py-1">Modo</th>
                <th className="px-1 py-1">Base</th>
              </tr>
            </thead>
            <tbody>
              {data.allocations.map((a) => (
                <tr key={a.allocationId} className="border-t border-border/50">
                  <td className="px-1 py-1 font-mono">{a.validationId.slice(0, 8)}…</td>
                  <td className="px-1 py-1">{a.benefitTitle ?? '—'}</td>
                  <td className="px-1 py-1">{a.mode}</td>
                  <td className="px-1 py-1">{formatBenefitMoneyCents(a.baseAmountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data.ledgerMovements.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <h4 className="text-sm font-medium text-text">Movimientos de crédito</h4>
          <table className="mt-2 min-w-full text-left text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="px-1 py-1">Tipo</th>
                <th className="px-1 py-1">Monto</th>
                <th className="px-1 py-1">Actor</th>
              </tr>
            </thead>
            <tbody>
              {data.ledgerMovements.map((m) => (
                <tr key={m.entryId} className="border-t border-border/50">
                  <td className="px-1 py-1">
                    {COURTESY_LEDGER_ENTRY_TYPE_LABEL[m.type] ?? m.type}
                  </td>
                  <td className="px-1 py-1">{formatSignedBenefitMoneyCents(m.amountCents)}</td>
                  <td className="px-1 py-1">{m.actorLabel ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data.vertical === 'ACTIVITY' ? (
        <p className="mt-4 text-sm text-text-muted">
          Crédito disponible — consumo no habilitado en V3.3.
        </p>
      ) : null}
    </section>
  );
}
