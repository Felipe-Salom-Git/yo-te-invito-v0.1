import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminLegalDocumentsKeys } from '@/lib/query/keys';
import type {
  AdminLegalDocumentListQuery,
  AdminPublishLegalDocument,
  AdminSaveLegalDocumentDraft,
  AdminUpdateLegalDocument,
} from '@/repositories/interfaces';

export function useAdminLegalDocuments(
  query: AdminLegalDocumentListQuery | undefined,
  filtersKey: string,
  enabled = true,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminLegalDocumentsKeys.list(filtersKey),
    queryFn: () => repos.legalDocuments.listAdminLegalDocuments(query),
    enabled,
  });
}

export function useAdminLegalDocument(key: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminLegalDocumentsKeys.detail(key),
    queryFn: () => repos.legalDocuments.getAdminLegalDocument(key),
    enabled: enabled && Boolean(key),
  });
}

export function useAdminLegalDocumentVersions(key: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminLegalDocumentsKeys.versions(key),
    queryFn: () => repos.legalDocuments.getAdminLegalDocumentVersions(key),
    enabled: enabled && Boolean(key),
  });
}

export function useUpdateAdminLegalDocument(key: string) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateLegalDocument) =>
      repos.legalDocuments.updateAdminLegalDocument(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminLegalDocumentsKeys.all });
    },
  });
}

export function useSaveLegalDraft(key: string) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminSaveLegalDocumentDraft) =>
      repos.legalDocuments.saveAdminLegalDocumentDraft(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminLegalDocumentsKeys.all });
    },
  });
}

export function usePublishLegalDocument(key: string) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: AdminPublishLegalDocument) =>
      repos.legalDocuments.publishAdminLegalDocument(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminLegalDocumentsKeys.all });
    },
  });
}
