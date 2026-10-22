import {
  BENEFIT_SETTLEMENT_STATUS_LABEL,
  deriveSettlementDisplayStatus,
  type BenefitSettlementDto,
} from '@yo-te-invito/shared';
import { Badge } from '@/components';

/** Derived (human) status first, persisted status as secondary text. */
export function SettlementStatusCell({ row }: { row: BenefitSettlementDto }) {
  const display = deriveSettlementDisplayStatus({ status: row.status, ...row.summary });
  return (
    <>
      <Badge>{display.label}</Badge>
      {display.flags.length > 0 ? (
        <div className="mt-1 text-xs text-text-muted">{display.flags.join(' · ')}</div>
      ) : null}
      <div className="mt-1 text-xs text-text-muted">
        Persistido: {BENEFIT_SETTLEMENT_STATUS_LABEL[row.status]}
      </div>
    </>
  );
}
