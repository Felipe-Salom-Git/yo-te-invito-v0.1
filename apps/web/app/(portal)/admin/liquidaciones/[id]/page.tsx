import { SettlementDetailClient } from '@/components/admin/liquidaciones/SettlementDetailClient';
import { parseSettlementDetailFromDiscountId } from '@/lib/admin/settlement-generate-context';

export default async function AdminSettlementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const fromDiscountId = parseSettlementDetailFromDiscountId({
    get: (name) => {
      const value = query[name];
      return typeof value === 'string' ? value : null;
    },
  });
  return <SettlementDetailClient id={id} fromDiscountId={fromDiscountId} />;
}
