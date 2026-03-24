'use client';

import Link from 'next/link';
import { ProfileStatusBadge } from './ProfileStatusBadge';
import { Button } from '@/components';
import type { ProfileOption } from '@/lib/account/profile-options';
import type { ProfileStatusInfo } from '@/lib/account/profile-status';
import { getProfileDestinationRoute } from '@/lib/account/profile-routing';

interface ProfileCardProps {
  option: ProfileOption;
  statusInfo: ProfileStatusInfo;
}

const ICONS: Record<string, React.ReactNode> = {
  tickets: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  producer: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  gastro: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  referrer: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
};

function getPrimaryCtaLabel(status: ProfileStatusInfo['status'], option: ProfileOption): string {
  if (option.id === 'tickets') return 'Entrar';
  switch (status) {
    case 'available':
      return 'Entrar';
    case 'pending':
      return 'Ver estado';
    case 'unavailable':
      return 'Solicitar acceso';
    default:
      return 'Solicitar acceso';
  }
}

export function ProfileCard({ option, statusInfo }: ProfileCardProps) {
  const destination = getProfileDestinationRoute(option, statusInfo);
  const primaryLabel = getPrimaryCtaLabel(statusInfo.status, option);

  return (
    <div
      className="group flex flex-col gap-4 rounded-xl border border-border bg-bg-muted/50 p-6 transition-all hover:border-accent/50 hover:bg-bg-muted focus-within:ring-2 focus-within:ring-accent/50"
      role="article"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {ICONS[option.id] ?? ICONS.tickets}
        </div>
        <ProfileStatusBadge status={statusInfo.status} />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-text">{option.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{option.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={destination}>
          <Button size="sm" className="min-w-[120px]">
            {primaryLabel}
          </Button>
        </Link>
        {option.id === 'tickets' && (
          <Link href="/me/tickets">
            <Button variant="outline" size="sm">
              Mis tickets
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
