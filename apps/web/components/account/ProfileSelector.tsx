'use client';

import Link from 'next/link';
import { Role } from '@yo-te-invito/shared';
import { useAvailableProfiles } from '@/hooks/useAvailableProfiles';
import { useRole } from '@/hooks/useRole';
import { ProfileCard } from './ProfileCard';
import { PROFILE_OPTIONS } from '@/lib/account/profile-options';
import { Button } from '@/components';

export function ProfileSelector() {
  const { statusMap, isLoading } = useAvailableProfiles();
  const { hasRole } = useRole();
  const isAdmin = hasRole(Role.ADMIN);

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
      {isAdmin && (
        <div className="flex flex-col gap-4 rounded-xl border border-accent/40 bg-accent/5 p-6">
          <div>
            <h3 className="text-lg font-semibold text-text">Administración</h3>
            <p className="mt-2 text-sm text-text-muted">
              Panel de operaciones, moderación y configuración de la plataforma.
            </p>
          </div>
          <Link href="/admin">
            <Button size="sm" className="min-w-[120px]">
              Entrar
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
