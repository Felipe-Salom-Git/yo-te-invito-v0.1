'use client';

import { useParams } from 'next/navigation';
import { ProducerCourtesiesPageClient } from '@/components/producer/courtesies/ProducerCourtesiesPageClient';

export default function ProducerEventCourtesiesPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) ?? '';

  return <ProducerCourtesiesPageClient eventId={eventId} />;
}
