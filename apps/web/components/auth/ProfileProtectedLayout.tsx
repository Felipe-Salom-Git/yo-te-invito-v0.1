'use client';

/**
 * Profile-aware protected layout.
 * Allows access via role OR profile membership (from GET /me availableProfiles).
 * Use for producer, gastro, referrer dashboards.
 */
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Role } from '@yo-te-invito/shared';
import { useRole } from '@/hooks/useRole';
import { useMe } from '@/hooks/useMe';

const LOGIN_PATH = '/login';
const PROFILES_PATH = '/profiles';

export type ProfileType = 'producer' | 'gastro' | 'referrer';

interface ProfileProtectedLayoutProps {
  children: React.ReactNode;
  /** Required roles (any of). Legacy role check. */
  allowedRoles?: Role[];
  /** Required profile type. Access granted if role OR profile hasAccess. */
  requiredProfile?: ProfileType;
}

const ROLE_BY_PROFILE: Record<ProfileType, Role[]> = {
  producer: [Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF],
  gastro: [Role.ADMIN, Role.GASTRO_OWNER],
  referrer: [Role.ADMIN, Role.REFERRER],
};

export function ProfileProtectedLayout({
  children,
  allowedRoles = [],
  requiredProfile,
}: ProfileProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, status, hasRole } = useRole();
  const { user, isLoading } = useMe();

  const hasProfileAccess = (): boolean => {
    if (!requiredProfile || !user?.availableProfiles) return false;
    const block =
      requiredProfile === 'producer'
        ? user.availableProfiles.producer
        : requiredProfile === 'gastro'
          ? user.availableProfiles.gastro
          : user.availableProfiles.referrer;
    return !!block?.hasAccess;
  };

  const hasAccess = (): boolean => {
    const roles = allowedRoles.length > 0 ? allowedRoles : (requiredProfile ? ROLE_BY_PROFILE[requiredProfile] : []);
    if (hasRole(roles)) return true;
    if (requiredProfile && hasProfileAccess()) return true;
    return roles.length === 0; // no restriction
  };

  const access = hasAccess();

  useEffect(() => {
    if (status === 'loading' || isLoading) return;

    if (!session) {
      const callbackUrl = encodeURIComponent(pathname ?? '/');
      router.replace(`${LOGIN_PATH}?callbackUrl=${callbackUrl}`);
      return;
    }

    if (!access) {
      router.replace(PROFILES_PATH);
    }
  }, [session, status, isLoading, access, pathname, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-text-muted">Cargando…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!access) {
    return null;
  }

  return <>{children}</>;
}
