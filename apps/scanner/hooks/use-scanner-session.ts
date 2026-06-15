'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clearScannerSession,
  getScannerSession,
  setScannerSession,
  type ScannerSession,
} from '@/lib/auth/session';

export function useScannerSession() {
  const [session, setSessionState] = useState<ScannerSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSessionState(getScannerSession());
    setHydrated(true);
  }, []);

  const saveSession = useCallback((next: ScannerSession) => {
    setScannerSession(next);
    setSessionState(next);
  }, []);

  const logout = useCallback(() => {
    clearScannerSession();
    setSessionState(null);
  }, []);

  return { session, hydrated, saveSession, logout };
}
