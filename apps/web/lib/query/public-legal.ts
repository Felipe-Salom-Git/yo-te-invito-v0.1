import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { publicLegalDocumentsKeys } from '@/lib/query/keys';

/** Client fetch for public legal pages (e.g. preview or client-only routes). */
export function usePublicLegalDocument(slug: string, enabled = true) {
  const repos = useRepositories();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: publicLegalDocumentsKeys.bySlug(tenantId, slug),
    queryFn: () => repos.legalDocuments.getPublicLegalDocument(tenantId, slug),
    enabled: enabled && Boolean(tenantId && slug),
    retry: false,
  });
}
