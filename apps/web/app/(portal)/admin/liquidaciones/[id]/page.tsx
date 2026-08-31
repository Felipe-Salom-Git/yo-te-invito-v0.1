import { SettlementDetailClient } from '@/components/admin/liquidaciones/SettlementDetailClient';

export default async function AdminSettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SettlementDetailClient id={id} />;
}
