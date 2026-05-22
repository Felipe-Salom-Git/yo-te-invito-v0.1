'use client';

import { useState } from 'react';

type AdminAuditMetadataPreviewProps = {
  before: unknown;
  after: unknown;
  metadata: unknown;
};

function formatPayload(value: unknown): string {
  if (value == null) return '—';
  try {
    const text = JSON.stringify(value, null, 2);
    return text.length > 2000 ? `${text.slice(0, 1997)}…` : text;
  } catch {
    return String(value);
  }
}

/** Collapsible JSON preview for audit detail fields. */
export function AdminAuditMetadataPreview({
  before,
  after,
  metadata,
}: AdminAuditMetadataPreviewProps) {
  const [open, setOpen] = useState(false);
  const hasDetail =
    before != null || after != null || (metadata != null && metadata !== undefined);

  if (!hasDetail) {
    return <span className="text-xs text-text-muted">—</span>;
  }

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-medium text-accent hover:underline"
      >
        {open ? 'Ocultar detalle' : 'Ver detalle'}
      </button>
      {open ? (
        <div className="mt-2 max-h-48 space-y-2 overflow-auto rounded border border-border/60 bg-bg p-2 font-mono text-[11px] text-text-muted">
          {before != null ? (
            <div>
              <p className="mb-0.5 font-sans font-medium text-text">Antes</p>
              <pre className="whitespace-pre-wrap break-all">{formatPayload(before)}</pre>
            </div>
          ) : null}
          {after != null ? (
            <div>
              <p className="mb-0.5 font-sans font-medium text-text">Después</p>
              <pre className="whitespace-pre-wrap break-all">{formatPayload(after)}</pre>
            </div>
          ) : null}
          {metadata != null ? (
            <div>
              <p className="mb-0.5 font-sans font-medium text-text">Metadata</p>
              <pre className="whitespace-pre-wrap break-all">{formatPayload(metadata)}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
