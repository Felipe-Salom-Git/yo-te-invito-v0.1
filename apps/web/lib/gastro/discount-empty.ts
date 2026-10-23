import type { GastroDiscountLifecycleBucket } from '@yo-te-invito/shared';

export type DiscountEmptyState = {
  title: string;
  description?: string;
  showCreate: boolean;
};

const BUCKET_TITLES: Record<GastroDiscountLifecycleBucket, string> = {
  ACTIVE: 'No hay descuentos activos en este local.',
  PENDING: 'No hay descuentos pendientes de aprobación.',
  FINISHED: 'No hay descuentos vencidos ni finalizados.',
  ARCHIVED: 'No hay descuentos archivados.',
};

/** Empty copy for the owner's public-discount list. Courtesies use their own helper. */
export function resolvePublicDiscountEmptyState(input: {
  bucket: GastroDiscountLifecycleBucket;
  countsByBucket: Record<GastroDiscountLifecycleBucket, number>;
}): DiscountEmptyState {
  const total = Object.values(input.countsByBucket).reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return {
      title: 'Todavía no cargaste descuentos para este local.',
      description: 'Cuando administración lo apruebe, el descuento aparece en la ficha pública.',
      showCreate: true,
    };
  }
  return {
    title: BUCKET_TITLES[input.bucket],
    showCreate: input.bucket !== 'ARCHIVED',
  };
}
