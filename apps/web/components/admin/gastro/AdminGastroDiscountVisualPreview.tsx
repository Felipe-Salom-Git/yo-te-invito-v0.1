'use client';

import { useQuery } from '@tanstack/react-query';
import {
  DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT,
  type GastroDiscountVisualTemplateResponse,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { DiscountTemplateRenderer } from '@/components/gastro/DiscountTemplateRenderer';

type Props = {
  profileId: string;
  discountId: string;
  qrPayload: string | null;
  gastroName?: string | null;
  discountTitle?: string | null;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
};

export function AdminGastroDiscountVisualPreview({
  profileId,
  discountId,
  qrPayload,
  gastroName,
  discountTitle,
  discountType,
  discountValue,
}: Props) {
  const repos = useRepositories();
  const { data, isLoading } = useQuery({
    queryKey: adminGastroKeys.discountVisualTemplate(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscountVisualTemplate(profileId, discountId),
    enabled: !!profileId && !!discountId,
  });

  if (isLoading) {
    return <p className="mt-4 text-sm text-text-muted">Cargando diseño QR…</p>;
  }

  const template = data?.template as GastroDiscountVisualTemplateResponse | null | undefined;
  if (!template) {
    return (
      <p className="mt-4 text-sm text-text-muted">
        Este descuento usa el diseño estándar Yo Te Invito (sin plantilla custom).
      </p>
    );
  }

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Preview QR Studio
      </h3>
      <DiscountTemplateRenderer
        template={template}
        ctx={{
          ...DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT,
          gastroName: gastroName ?? DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT.gastroName,
          discountTitle: discountTitle ?? DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT.discountTitle,
          discountType: discountType ?? 'PERCENT',
          discountValue: discountValue ?? 20,
        }}
        qrPayload={qrPayload}
      />
    </section>
  );
}
