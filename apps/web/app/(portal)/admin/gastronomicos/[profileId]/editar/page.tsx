'use client';

import { useParams } from 'next/navigation';
import { AdminGastroLocationFormClient } from '@/components/admin/gastro/AdminGastroLocationFormClient';

export default function AdminGastroLocalEditarPage() {
  const params = useParams();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';

  return <AdminGastroLocationFormClient mode="edit" profileId={profileId} />;
}
