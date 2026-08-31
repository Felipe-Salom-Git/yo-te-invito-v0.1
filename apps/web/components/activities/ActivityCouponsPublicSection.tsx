'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { activityCouponsKeys } from '@/lib/query/keys';
import { ExcursionDetailSectionHeading } from '@/components/excursions/ExcursionDetailSectionHeading';

export function ActivityCouponsPublicSection({
  eventId,
  tenantId,
}: {
  eventId: string;
  tenantId: string;
}) {
  const repos = useRepositories();
  const { data } = useQuery({
    queryKey: activityCouponsKeys.publicByEvent(tenantId, eventId),
    queryFn: () => repos.activityCoupons.listPublicByEvent(tenantId, eventId),
    enabled: !!eventId && !!tenantId,
  });
  const coupons = data?.data ?? [];
  if (coupons.length === 0) return null;

  return (
    <section className="mt-10">
      <ExcursionDetailSectionHeading title="Beneficios / Cupones" />
      <ul className="mt-4 space-y-3">
        {coupons.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-bg-muted p-4">
            <p className="font-medium text-text">{c.title}</p>
            <p className="mt-1 text-sm text-accent">{c.benefitLabel}</p>
            {c.summary ? <p className="mt-1 text-sm text-text-muted">{c.summary}</p> : null}
            <Link
              href={`/excursiones/cupones/${c.id}`}
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Reclamar cupón →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
