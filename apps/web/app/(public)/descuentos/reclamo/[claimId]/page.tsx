'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageContainer, SectionTitle } from '@/components';
import { useGastroDiscountClaim } from '@/lib/query/useGastroPublishedDiscounts';
import { isValidGastroDiscountQrPayload } from '@/lib/gastro/discount-qr';
import { qrImageUrl } from '@/lib/qr-image';

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
        <Link href="/categoria/gastro?subcategory=descuentos" className="mt-4 inline-block text-accent hover:underline">
          ← Descuentos
        </Link>
      </PageContainer>
    );
  }

  const title = claim.discountTitle?.trim() || 'Tu descuento';
  const qrOk = isValidGastroDiscountQrPayload(claim.qrPayload);

  return (
    <PageContainer>
      <SectionTitle>{title}</SectionTitle>
      <p className="mt-1 text-text-muted">{claim.locationName}</p>
      <p className="mt-2 text-sm text-text-muted">
        Enviamos el QR a <span className="font-medium text-text">{claim.email}</span>
        {claim.emailSentAt ? '' : ' (el servicio de email puede no estar configurado en desarrollo)'}.
      </p>

      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-bg-muted p-6 text-center">
          {qrOk ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrImageUrl(claim.qrPayload, 280)}
              alt="Código QR del descuento"
              width={280}
              height={280}
              className="mx-auto rounded-lg border border-border"
            />
          ) : (
            <p className="text-sm text-red-300">
              No pudimos generar un QR válido. Contactá soporte o reclamá de nuevo el descuento.
            </p>
          )}
          <p className="mt-4 text-sm text-text-muted">Presentá este código en el local</p>
        </div>

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
