'use client';

import { useAvailableProfiles } from '@/hooks/useAvailableProfiles';
import { ProfileCard } from './ProfileCard';
import { PROFILE_OPTIONS } from '@/lib/account/profile-options';

export function ProfileSelector() {
  const { statusMap, isLoading } = useAvailableProfiles();

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-text-muted">Cargando perfiles…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="list">
      {PROFILE_OPTIONS.map((option) => (
        <ProfileCard
          key={option.id}
          option={option}
          statusInfo={statusMap[option.id]}
        />
      ))}
    </div>
  );
}
