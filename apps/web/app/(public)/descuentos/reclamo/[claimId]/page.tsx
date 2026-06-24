'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageContainer } from '@/components';
import { GastroDiscountQrCard } from '@/components/gastro/GastroDiscountQrCard';
import { EmailInboxNotice } from '@/components/ux/EmailInboxNotice';
import { useGastroDiscountClaim } from '@/lib/query/useGastroPublishedDiscounts';
import { resolveGastroDiscountDisplayStatus } from '@/lib/gastro/discount-status-ui';

function ClaimContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const claimId = (params?.claimId as string) ?? '';
  const accessToken = searchParams.get('token');

  const { data: claim, isLoading, isError } = useGastroDiscountClaim(claimId, accessToken);

  if (!accessToken) {
    return (
      <PageContainer>
        <p className="text-text-muted">Enlace inválido. Reclamá el descuento nuevamente.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando tu QR…</p>
      </PageContainer>
    );
  }

  if (isError || !claim) {
    return (
      <PageContainer>
        <p className="text-text-muted">No encontramos este código.</p>
        <Link
          href="/categoria/gastro?subcategory=descuentos"
          className="mt-4 inline-block text-accent hover:underline"
        >
          ← Descuentos
        </Link>
      </PageContainer>
    );
  }

  const validTo = claim.validTo ?? claim.discountDate;
  const status = resolveGastroDiscountDisplayStatus(
    claim.status,
    validTo,
    claim.usedAt,
  );
  const title = claim.discountTitle?.trim() || claim.discountLabel?.trim() || 'Tu descuento';

  return (
    <PageContainer>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <EmailInboxNotice variant="qr" className="w-full" />
        <p className="w-full text-center text-sm text-text-muted">
          Enviamos el QR a <span className="font-medium text-text">{claim.email}</span>
          {claim.emailSentAt ? '' : ' (el servicio de email puede no estar configurado en desarrollo)'}.
        </p>

        <GastroDiscountQrCard
          locationName={claim.locationName}
          discountTitle={title}
          discountDescription={claim.discountSummary}
          discountLabel={claim.discountLabel}
          qrPayload={claim.qrPayload}
          status={status}
          validTo={validTo}
          type={claim.type}
        />

        <Link
          href={`/gastronomicos/${claim.locationId}`}
          className="text-sm text-accent hover:underline"
        >
          Ver ficha del local →
        </Link>
      </div>
    </PageContainer>
  );
}

export default function GastroDiscountClaimPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="text-text-muted">Cargando…</p>
        </PageContainer>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
