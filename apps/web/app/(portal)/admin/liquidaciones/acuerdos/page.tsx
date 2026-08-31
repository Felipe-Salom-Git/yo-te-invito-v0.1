'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  PageContainer,
  SectionTitle,
} from '@/components';
import {
  useAdminBenefitAgreementsList,
  useCloseAdminBenefitAgreement,
  useReplaceAdminBenefitAgreement,
} from '@/lib/query/benefit-agreements';
import {
  BENEFIT_AGREEMENT_VIGENCY_LABEL,
  BENEFIT_VERTICAL_LABEL,
} from '@/lib/admin/benefit-agreement-labels';
import { formatBenefitMoneyCents } from '@yo-te-invito/shared';

export default function AdminBenefitAgreementsPage() {
  const [vertical, setVertical] = useState<string>('');
  const [vigency, setVigency] = useState<string>('ALL');
  const query = useMemo(
    () => ({
      ...(vertical ? { vertical } : {}),
      ...(vigency !== 'ALL' ? { vigency } : {}),
    }),
    [vertical, vigency],
  );
  const { data, isLoading, isError } = useAdminBenefitAgreementsList(query);
  const closeMutation = useCloseAdminBenefitAgreement();
  const replaceMutation = useReplaceAdminBenefitAgreement();

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>Acuerdos comerciales</SectionTitle>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Tarifas por uso validado para locales gastronómicos y operadores de excursiones. Los
            términos económicos son inmutables: para cambiar precio o multiplicador de canje, cerrá
            o reemplazá el acuerdo.
          </p>
        </div>
        <Link href="/admin/liquidaciones/acuerdos/nuevo">
          <Button>Nuevo acuerdo</Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="text-sm text-text-muted">
          Vertical
          <select
            className="ml-2 rounded border border-border bg-bg px-2 py-1 text-text"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="GASTRO">Gastronómico</option>
            <option value="ACTIVITY">Activity</option>
          </select>
        </label>
        <label className="text-sm text-text-muted">
          Vigencia
          <select
            className="ml-2 rounded border border-border bg-bg px-2 py-1 text-text"
            value={vigency}
            onChange={(e) => setVigency(e.target.value)}
          >
            <option value="ALL">Todas</option>
            <option value="CURRENT">Vigentes</option>
            <option value="PAST">Históricos</option>
            <option value="FUTURE">Futuros</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : isError ? (
        <p className="mt-6 text-sm text-red-400">No se pudieron cargar los acuerdos.</p>
      ) : !data?.data.length ? (
        <EmptyState
          className="mt-8"
          title="Sin acuerdos"
          description="Creá el primer acuerdo comercial para un partner."
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {data.data.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-bg-muted p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text">
                  {row.partnerDisplayName ?? 'Partner'}
                </span>
                <Badge>{BENEFIT_VERTICAL_LABEL[row.vertical]}</Badge>
                <Badge>{BENEFIT_AGREEMENT_VIGENCY_LABEL[row.vigency]}</Badge>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {formatBenefitMoneyCents(row.unitPriceCents)} / uso · canje ×{row.barterMultiplier}{' '}
                · {row.validFrom}
                {row.validTo ? ` → ${row.validTo}` : ' → abierto'}
              </p>
              {row.notes ? (
                <p className="mt-1 text-sm text-text-muted">Notas: {row.notes}</p>
              ) : null}
              {row.isOpen ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={closeMutation.isPending}
                    onClick={() => {
                      const validTo = window.prompt('Cerrar acuerdo — fecha fin (YYYY-MM-DD):');
                      if (!validTo) return;
                      closeMutation.mutate({ id: row.id, body: { validTo } });
                    }}
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={replaceMutation.isPending}
                    onClick={() => {
                      const effectiveFrom = window.prompt(
                        'Reemplazar — vigencia nueva desde (YYYY-MM-DD):',
                      );
                      const pesos = window.prompt('Nuevo precio por uso (pesos ARS, sin centavos):');
                      const multiplier = window.prompt('Multiplicador canje (ej. 2):', '2');
                      if (!effectiveFrom || !pesos || !multiplier) return;
                      const unitPriceCents = (
                        BigInt(pesos.replace(/\D/g, '') || '0') * BigInt(100)
                      ).toString();
                      replaceMutation.mutate({
                        id: row.id,
                        body: {
                          effectiveFrom,
                          unitPriceCents,
                          barterMultiplier: multiplier,
                          currency: 'ARS',
                        },
                      });
                    }}
                  >
                    Reemplazar tarifa
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
