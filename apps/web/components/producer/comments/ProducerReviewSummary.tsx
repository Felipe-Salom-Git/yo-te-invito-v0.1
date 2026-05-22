'use client';

import type { ProducerManagedReviewSummary } from '@yo-te-invito/shared';
import { ManagedReviewSummary } from './ManagedReviewSummary';

/** Compat: resumen productor con scope fijo */
export function ProducerReviewSummary({ summary }: { summary: ProducerManagedReviewSummary }) {
  return <ManagedReviewSummary summary={summary} scope="producer" />;
}
