import type { GastroDiscountEconomicSummary } from '@yo-te-invito/shared';
import {
  ECONOMIC_HISTORY_KIND_LABEL,
  ECONOMIC_SUMMARY_COPY,
  describeEconomicHistoryEvent,
  eventActorLabel,
} from '@/lib/gastro/discount-economic-summary-ui';
import { EconomicBlock, EmptyLine } from './EconomicSummaryPrimitives';

/** Block 7 — economic timeline of THIS discount, newest first (persisted facts only). */
export function DiscountEconomicHistoryList({ summary }: { summary: GastroDiscountEconomicSummary }) {
  const events: ReadonlyArray<GastroDiscountEconomicSummary['history'][number]> = summary.history;
  const ordered = [...events].reverse();
  return (
    <EconomicBlock title="Historial económico">
      {ordered.length === 0 ? (
        <EmptyLine>{ECONOMIC_SUMMARY_COPY.noHistory}</EmptyLine>
      ) : (
        <ol className="space-y-2">
          {ordered.map((event, index) => {
            const actor = eventActorLabel(event);
            return (
              <li key={`${event.kind}-${event.at}-${index}`} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-text">{ECONOMIC_HISTORY_KIND_LABEL[event.kind]}</span>
                  <span className="text-xs text-text-muted">{new Date(event.at).toLocaleString('es-AR')}</span>
                </div>
                <p className="mt-0.5 text-text-muted">
                  {describeEconomicHistoryEvent(event, summary.currency)}
                  {actor ? ` · ${actor}` : ''}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </EconomicBlock>
  );
}
