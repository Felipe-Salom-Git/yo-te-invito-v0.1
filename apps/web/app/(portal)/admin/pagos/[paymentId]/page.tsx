import { AdminPaymentDetailPageClient } from '@/components/admin/payments/AdminPaymentDetailPageClient';

type Props = {
  params: Promise<{ paymentId: string }>;
};

export default async function AdminPaymentDetailPage({ params }: Props) {
  const { paymentId } = await params;
  return <AdminPaymentDetailPageClient paymentId={paymentId} />;
}
