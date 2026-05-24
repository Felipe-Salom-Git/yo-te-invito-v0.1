'use client';

import Link from 'next/link';
import type { MeLegalRequirementItem } from '@/repositories/interfaces';
import { formatPublicLegalDate } from '@/lib/legal/format-legal-date';
import { LegalRequirementNotice } from './LegalRequirementNotice';

type Props = {
  items: MeLegalRequirementItem[];
  selectedVersionIds: string[];
  onChange: (versionIds: string[]) => void;
  disabled?: boolean;
  showNotice?: boolean;
};

export function LegalAcceptanceCheckboxList({
  items,
  selectedVersionIds,
  onChange,
  disabled = false,
  showNotice = true,
}: Props) {
  const allSelected =
    items.length > 0 && items.every((i) => selectedVersionIds.includes(i.documentVersionId));

  const toggle = (versionId: string) => {
    if (disabled) return;
    if (selectedVersionIds.includes(versionId)) {
      onChange(selectedVersionIds.filter((id) => id !== versionId));
    } else {
      onChange([...selectedVersionIds, versionId]);
    }
  };

  const toggleAll = () => {
    if (disabled) return;
    if (allSelected) {
      onChange([]);
    } else {
      onChange(items.map((i) => i.documentVersionId));
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-emerald-400/90">
        No tenés documentos legales pendientes de aceptación para este paso.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
      {showNotice ? <LegalRequirementNotice /> : null}

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text">
        <input
          type="checkbox"
          className="rounded border-border text-accent focus:ring-accent"
          checked={allSelected}
          disabled={disabled}
          onChange={toggleAll}
        />
        Aceptar todos los documentos listados
      </label>

      <ul className="space-y-3">
        {items.map((item) => {
          const checked = selectedVersionIds.includes(item.documentVersionId);
          return (
            <li
              key={item.documentVersionId}
              className="rounded-lg border border-border/60 bg-bg/50 px-3 py-3"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-border text-accent focus:ring-accent"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(item.documentVersionId)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-text">{item.title}</span>
                  <span className="mt-1 block text-xs text-text-muted">
                    Versión {item.version} · publicada el{' '}
                    {formatPublicLegalDate(item.publishedAt)}
                  </span>
                  {item.publicPath ? (
                    <Link
                      href={item.publicPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Leer documento completo →
                    </Link>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
