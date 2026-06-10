'use client';

import {
  getGastroOpenStatus,
  hasGastroOpeningHoursContent,
  formatGastroOpeningHoursLines,
  type GastroHoursDisplayInput,
} from '@/lib/gastro/openingHoursDisplay';

const CARD_TEXT = 'text-sm text-text-muted';

const STATUS_BADGE: Record<string, string> = {
  open: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  closed: 'border-white/20 bg-white/5 text-text-muted',
  unknown: 'border-white/15 bg-white/[0.03] text-text-muted',
};

export function GastroOpeningHoursSummary(input: GastroHoursDisplayInput) {
  const showHours = hasGastroOpeningHoursContent(input);
  const lines = formatGastroOpeningHoursLines(input);
  const openStatus = getGastroOpenStatus(input);
  const hasNote = Boolean(input.openingHoursNote?.trim());

  if (!showHours && !hasNote) {
    return <p className={CARD_TEXT}>Horarios no informados.</p>;
  }

  return (
    <div className="space-y-2">
      {openStatus.status !== 'unknown' ? (
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[openStatus.status]}`}
        >
          {openStatus.label}
        </span>
      ) : null}
      {lines.length > 0 ? (
        <ul className={`space-y-0.5 ${CARD_TEXT}`}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {hasNote ? (
        <p className={lines.length > 0 ? `mt-1.5 italic ${CARD_TEXT}` : CARD_TEXT}>
          {input.openingHoursNote!.trim()}
        </p>
      ) : null}
    </div>
  );
}
