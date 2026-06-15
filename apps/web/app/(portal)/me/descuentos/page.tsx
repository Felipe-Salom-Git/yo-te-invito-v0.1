'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { qrImageUrl } from '@/lib/qr-image';
import type { MeGastroDiscountItem } from '@yo-te-invito/shared';

const STATUS_LABEL: Record<MeGastroDiscountItem['status'], string> = {
  ACTIVE: 'Activo',
  USED: 'Usado',
  EXPIRED: 'Vencido',
  CANCELLED: 'Cancelado',
};

const TYPE_LABEL: Record<MeGastroDiscountItem['type'], string> = {
  PUBLIC_REQUEST: 'Solicitado',
  COURTESY: 'Cortesía',
};

function DiscountCard({ item }: { item: MeGastroDiscountItem }) {
  const restaurantHref = item.locationSlug
    ? `/eventos/${item.locationSlug}`
    : `/gastro/${item.locationId}`;

  return (
    <li className="rounded-xl border border-border bg-bg-muted/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {TYPE_LABEL[item.type]}
          </p>
          <h2 className="text-lg font-semibold text-text">
            {item.discountTitle ?? item.discountLabel ?? 'Descuento'}
          </h2>
          <p className="text-sm text-text-muted">{item.locationName}</p>
          {item.discountLabel && (
            <p className="mt-1 text-sm text-accent">{item.discountLabel}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            item.status === 'ACTIVE'
              ? 'bg-accent/20 text-accent'
              : 'bg-border text-text-muted'
          }`}
        >
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      {item.status === 'ACTIVE' && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-border bg-bg p-4">
          <Image
            src={qrImageUrl(item.qrPayload, 200)}
            alt="Código QR del descuento"
            width={200}
            height={200}
            unoptimized
            className="rounded-lg border border-border"
          />
          <p className="break-all text-center font-mono text-xs text-text-muted">
            Código: {item.qrCode}
          </p>
        </div>
      )}

      <dl className="mt-4 grid gap-1 text-sm text-text-muted">
        {item.validTo && (
          <div>
            <dt className="inline">Vencimiento: </dt>
            <dd className="inline">{new Date(item.validTo).toLocaleString('es-AR')}</dd>
          </div>
        )}
        <div>
          <dt className="inline">Emitido: </dt>
          <dd className="inline">{new Date(item.createdAt).toLocaleString('es-AR')}</dd>
        </div>
        {item.discountDescription && (
          <div>
            <dt className="block text-text">Condiciones</dt>
            <dd>{item.discountDescription}</dd>
          </div>
        )}
      </dl>

      <Link
        href={restaurantHref}
        className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
      >
        Ver restaurante →
      </Link>
    </li>
  );
}

export default function MeGastroDiscountsPage() {
  const repos = useRepositories();
  const { data, isLoading, error } = useQuery({
    queryKey: ['me', 'gastro-discounts'],
    queryFn: () => repos.mePortal.listGastroDiscounts(),
  });

  const discounts = data?.data ?? [];

  return (
    <PageContainer>
      <SectionTitle>Mis descuentos gastronómicos</SectionTitle>
      <p className="mb-6 text-sm text-text-muted">
        Descuentos que solicitaste o cortesías que recibiste por email.
      </p>

      {isLoading && <p className="text-text-muted">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-400">No se pudieron cargar tus descuentos.</p>
      )}
      {!isLoading && !error && discounts.length === 0 && (
        <p className="rounded-lg border border-border bg-bg-muted px-4 py-8 text-center text-text-muted">
          Todavía no tenés descuentos gastronómicos.
        </p>
      )}

      <ul className="space-y-4">
        {discounts.map((item) => (
          <DiscountCard key={item.claimId} item={item} />
        ))}
      </ul>
    </PageContainer>
  );
}
