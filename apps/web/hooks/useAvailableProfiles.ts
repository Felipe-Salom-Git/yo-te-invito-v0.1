'use client';

import { useMemo } from 'react';
import { useMe } from './useMe';
import {
  getProfileStatusInfo,
  getTicketsProfileStatus,
  type ProfileKind,
  type ProfileStatusInfo,
} from '@/lib/account/profile-status';

export function useAvailableProfiles() {
  const { user, isLoading } = useMe();
  const available = user?.availableProfiles;

  const statusMap = useMemo(() => {
    const map: Record<ProfileKind, ProfileStatusInfo> = {
      tickets: getTicketsProfileStatus(),
      producer: getProfileStatusInfo(available, 'producer'),
      gastro: getProfileStatusInfo(available, 'gastro'),
      hotel: getProfileStatusInfo(available, 'hotel'),
      referrer: getProfileStatusInfo(available, 'referrer'),
    };
    return map;
  }, [available]);

  return {
    availableProfiles: available,
    statusMap,
    isLoading,
    user,
  };
}
