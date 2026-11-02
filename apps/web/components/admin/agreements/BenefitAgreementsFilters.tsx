'use client';

import type { AgreementListFilters } from '@/lib/admin/benefit-agreement-list';
import type { SettlementPartnerOption } from '@/lib/admin/settlement-partner-options';

type Props = {
  value: AgreementListFilters;
  onChange: (next: AgreementListFilters) => void;
  partnerOptions: SettlementPartnerOption[];
  discountOptions: SettlementPartnerOption[];
};

const SELECT = 'ml-2 rounded border border-border bg-bg px-2 py-1 text-text';

export function BenefitAgreementsFilters({ value, onChange, partnerOptions, discountOptions }: Props) {
  const set = (patch: Partial<AgreementListFilters>) => onChange({ ...value, ...patch });
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <label className="text-sm text-text-muted">
        Vertical
        <select
          className={SELECT}
          value={value.vertical}
          onChange={(e) =>
            set({ vertical: e.target.value as AgreementListFilters['vertical'], partnerId: '', gastroDiscountId: '' })
          }
        >
          <option value="">Todas</option>
          <option value="GASTRO">Gastronómico</option>
          <option value="ACTIVITY">Activity</option>
        </select>
      </label>
      {value.vertical ? (
        <label className="text-sm text-text-muted">
          {value.vertical === 'GASTRO' ? 'Local' : 'Operador'}
          <select
            className={SELECT}
            value={value.partnerId}
            onChange={(e) => set({ partnerId: e.target.value, gastroDiscountId: '' })}
          >
            <option value="">Todos</option>
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {value.vertical === 'GASTRO' && value.partnerId ? (
        <label className="text-sm text-text-muted">
          Descuento
          <select
            className={SELECT}
            value={value.gastroDiscountId}
            onChange={(e) => set({ gastroDiscountId: e.target.value })}
          >
            <option value="">Todos</option>
            {discountOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="text-sm text-text-muted">
        Vigencia
        <select
          className={SELECT}
          value={value.vigency}
          onChange={(e) => set({ vigency: e.target.value as AgreementListFilters['vigency'] })}
        >
          <option value="ALL">Todas</option>
          <option value="CURRENT">Vigentes</option>
          <option value="PAST">Históricos</option>
          <option value="FUTURE">Futuros</option>
        </select>
      </label>
      <label className="text-sm text-text-muted">
        Alcance
        <select
          className={SELECT}
          value={value.scope}
          onChange={(e) => set({ scope: e.target.value as AgreementListFilters['scope'] })}
        >
          <option value="">Todos</option>
          <option value="DISCOUNT">Por descuento</option>
          <option value="PROFILE_LEGACY">Legacy del local</option>
          <option value="OPERATOR">Operador (Activity)</option>
        </select>
      </label>
    </div>
  );
}
