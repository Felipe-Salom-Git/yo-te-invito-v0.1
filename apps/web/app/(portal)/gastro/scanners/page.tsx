'use client';

import { ScannerUsersPanel } from '@/components/portal/scanner/ScannerUsersPanel';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';

export default function GastroScannersPage() {
  const { profileId } = useGastroActiveLocation();
  return <ScannerUsersPanel portal="gastro" scopeProfileId={profileId} />;
}
