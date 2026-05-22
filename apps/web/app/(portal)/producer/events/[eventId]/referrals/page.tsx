'use client';

import { useParams } from 'next/navigation';
import { ProducerEventReferralsPageClient } from '@/components/producer/referrals/ProducerEventReferralsPageClient';

export default function ProducerEventReferralsPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) ?? '';

  return <ProducerEventReferralsPageClient eventId={eventId} />;
}
