import { AdminLegalVersionsPageClient } from '@/components/admin/legal/AdminLegalVersionsPageClient';
import { isLegalDocumentKey } from '@/lib/admin/admin-legal-labels';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ documentKey: string }>;
};

export default async function AdminLegalVersionsPage({ params }: Props) {
  const { documentKey } = await params;
  if (!isLegalDocumentKey(documentKey)) {
    notFound();
  }
  return <AdminLegalVersionsPageClient documentKey={documentKey} />;
}
