'use client';

import { Button, Input } from '@/components';
import { LEGAL_PROFILE_OPTIONS } from '@/lib/admin/admin-legal-labels';
import type { AdminLegalDocumentDetail } from '@/repositories/interfaces';

export type MetadataFormState = {
  title: string;
  description: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  appliesToProfiles: string[];
  isRequiredForSignup: boolean;
  isRequiredForCheckout: boolean;
  isRequiredForPortalAccess: boolean;
  isActive: boolean;
};

export function metadataFromDetail(detail: AdminLegalDocumentDetail): MetadataFormState {
  const d = detail.document;
  return {
    title: d.title,
    description: d.description ?? '',
    visibility: d.visibility,
    appliesToProfiles: [...d.appliesToProfiles],
    isRequiredForSignup: d.isRequiredForSignup,
    isRequiredForCheckout: d.isRequiredForCheckout,
    isRequiredForPortalAccess: d.isRequiredForPortalAccess,
    isActive: d.isActive,
  };
}

type Props = {
  state: MetadataFormState;
  onChange: (state: MetadataFormState) => void;
  onSave: () => void;
  saving: boolean;
};

export function AdminLegalDocumentMetadataForm({ state, onChange, onSave, saving }: Props) {
  const toggleProfile = (profile: string) => {
    const set = new Set(state.appliesToProfiles);
    if (set.has(profile)) set.delete(profile);
    else set.add(profile);
    onChange({ ...state, appliesToProfiles: [...set] });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
      <div>
        <label htmlFor="legal-title" className="block text-sm font-medium text-text">
          Título del documento
        </label>
        <Input
          id="legal-title"
          value={state.title}
          onChange={(e) => onChange({ ...state, title: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label htmlFor="legal-desc" className="block text-sm font-medium text-text">
          Descripción (admin)
        </label>
        <textarea
          id="legal-desc"
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div>
        <span className="block text-sm font-medium text-text">Visibilidad</span>
        <div className="mt-2 flex gap-4">
          {(['PUBLIC', 'INTERNAL'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="radio"
                name="visibility"
                checked={state.visibility === v}
                onChange={() => onChange({ ...state, visibility: v })}
              />
              {v === 'PUBLIC' ? 'Público' : 'Interno'}
            </label>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-sm font-medium text-text">Perfiles aplicables</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEGAL_PROFILE_OPTIONS.map((p) => (
            <label
              key={p}
              className={`cursor-pointer rounded-lg border px-2 py-1 text-xs ${
                state.appliesToProfiles.includes(p)
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-border text-text-muted'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={state.appliesToProfiles.includes(p)}
                onChange={() => toggleProfile(p)}
              />
              {p}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 text-text-muted">
          <input
            type="checkbox"
            checked={state.isRequiredForSignup}
            onChange={(e) => onChange({ ...state, isRequiredForSignup: e.target.checked })}
          />
          Requerido en registro
        </label>
        <label className="flex items-center gap-2 text-text-muted">
          <input
            type="checkbox"
            checked={state.isRequiredForCheckout}
            onChange={(e) => onChange({ ...state, isRequiredForCheckout: e.target.checked })}
          />
          Requerido en checkout
        </label>
        <label className="flex items-center gap-2 text-text-muted">
          <input
            type="checkbox"
            checked={state.isRequiredForPortalAccess}
            onChange={(e) =>
              onChange({ ...state, isRequiredForPortalAccess: e.target.checked })
            }
          />
          Requerido en portal
        </label>
        <label className="flex items-center gap-2 text-text-muted">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => onChange({ ...state, isActive: e.target.checked })}
          />
          Documento activo
        </label>
      </div>
      <Button type="button" onClick={onSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </Button>
    </div>
  );
}
