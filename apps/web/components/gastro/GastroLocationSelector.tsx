'use client';

import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { GastroLocationStatusBadge } from './GastroLocationStatusBadge';

export function GastroLocationSelector({ className }: { className?: string }) {
  const { locations, profileId, setProfileId, isLoading } = useGastroActiveLocation();

  if (isLoading) {
    return <p className="text-sm text-text-muted">Cargando locales…</p>;
  }

  if (locations.length <= 1) {
    if (locations.length === 1 && locations[0]) {
      return (
        <div className={className}>
          <p className="text-sm font-medium text-text">{locations[0].displayName}</p>
          <div className="mt-1">
            <GastroLocationStatusBadge status={locations[0].status} />
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={className}>
      <label htmlFor="gastro-location-select" className="mb-1 block text-xs text-text-muted">
        Local activo
      </label>
      <select
        id="gastro-location-select"
        value={profileId ?? ''}
        onChange={(e) => setProfileId(e.target.value || undefined)}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.displayName}
            {loc.city ? ` — ${loc.city}` : ''}
            {loc.status !== 'ACTIVE' ? ` (${loc.status})` : ''}
          </option>
        ))}
      </select>
      {profileId ? (
        <div className="mt-2">
          <GastroLocationStatusBadge
            status={locations.find((l) => l.id === profileId)?.status ?? 'DRAFT'}
          />
        </div>
      ) : null}
    </div>
  );
}
