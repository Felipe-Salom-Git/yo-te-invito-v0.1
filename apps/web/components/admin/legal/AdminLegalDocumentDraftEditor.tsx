'use client';

import { Button } from '@/components';

export type DraftFormState = {
  title: string;
  summary: string;
  contentMarkdown: string;
};

type Props = {
  state: DraftFormState;
  onChange: (state: DraftFormState) => void;
  onSave: () => void;
  saving: boolean;
};

export function AdminLegalDocumentDraftEditor({ state, onChange, onSave, saving }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
      <p className="text-sm text-text-muted">
        Editá el borrador. La versión publicada no cambia hasta que publiques.
      </p>
      <div>
        <label htmlFor="draft-title" className="block text-sm font-medium text-text">
          Título (versión)
        </label>
        <input
          id="draft-title"
          value={state.title}
          onChange={(e) => onChange({ ...state, title: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div>
        <label htmlFor="draft-summary" className="block text-sm font-medium text-text">
          Resumen del cambio (opcional)
        </label>
        <input
          id="draft-summary"
          value={state.summary}
          onChange={(e) => onChange({ ...state, summary: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div>
        <label htmlFor="draft-md" className="block text-sm font-medium text-text">
          Contenido (Markdown)
        </label>
        <textarea
          id="draft-md"
          value={state.contentMarkdown}
          onChange={(e) => onChange({ ...state, contentMarkdown: e.target.value })}
          rows={16}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text"
        />
      </div>
      <Button type="button" onClick={onSave} disabled={saving}>
        {saving ? 'Guardando borrador…' : 'Guardar borrador'}
      </Button>
    </div>
  );
}
