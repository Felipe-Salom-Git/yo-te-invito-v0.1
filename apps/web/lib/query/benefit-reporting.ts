import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminBenefitReportingKeys } from '@/lib/query/keys';
import type {
  BenefitReportingIntegrityQuery,
  BenefitReportingPartnersQuery,
  BenefitReportingPeriodQuery,
} from '@yo-te-invito/shared';

export function useAdminBenefitReportingMonthly(query: BenefitReportingPeriodQuery | null) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminBenefitReportingKeys.monthly(filtersKey),
    queryFn: () => repos.adminBenefitReporting.monthly(query!),
    enabled: Boolean(query?.periodKey),
  });
}

export function useAdminBenefitReportingPartners(query: BenefitReportingPartnersQuery | null) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminBenefitReportingKeys.partners(filtersKey),
    queryFn: () => repos.adminBenefitReporting.partners(query!),
    enabled: Boolean(query?.periodKey),
  });
}

export function useAdminBenefitReportingIntegrity(query: BenefitReportingIntegrityQuery | null) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminBenefitReportingKeys.integrity(filtersKey),
    queryFn: () => repos.adminBenefitReporting.integrity(query!),
    enabled: Boolean(query),
  });
}
