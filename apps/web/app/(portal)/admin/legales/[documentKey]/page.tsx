import { AdminLegalDocumentDetailClient } from '@/components/admin/legal/AdminLegalDocumentDetailClient';
import { isLegalDocumentKey } from '@/lib/admin/admin-legal-labels';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ documentKey: string }>;
};

export default async function AdminLegalDocumentPage({ params }: Props) {
  const { documentKey } = await params;
  if (!isLegalDocumentKey(documentKey)) {
    notFound();
  }
  return <AdminLegalDocumentDetailClient documentKey={documentKey} />;
}
