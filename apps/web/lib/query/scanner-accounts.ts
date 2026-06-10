'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { ScannerAccountsPortal } from '@/repositories/interfaces';
import type {
  CreateScannerUserBody,
  ResetScannerPasswordBody,
} from '@yo-te-invito/shared';
import { scannerAccountsKeys } from './keys';

export function useScannerAccountsList(portal: ScannerAccountsPortal, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: scannerAccountsKeys.list(portal),
    queryFn: () => repos.scannerAccounts.list(portal),
    enabled,
  });
}

export function useScannerAccountsMutations(portal: ScannerAccountsPortal) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const listKey = scannerAccountsKeys.list(portal);

  const invalidate = () => qc.invalidateQueries({ queryKey: listKey });

  const create = useMutation({
    mutationFn: (body: CreateScannerUserBody) => repos.scannerAccounts.create(portal, body),
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: ({ accountId, isActive }: { accountId: string; isActive: boolean }) =>
      repos.scannerAccounts.updateStatus(portal, accountId, isActive),
    onSuccess: invalidate,
  });

  const resetPassword = useMutation({
    mutationFn: ({
      accountId,
      body,
    }: {
      accountId: string;
      body?: ResetScannerPasswordBody;
    }) => repos.scannerAccounts.resetPassword(portal, accountId, body),
    onSuccess: invalidate,
  });

  return { create, updateStatus, resetPassword };
}
