'use client';

import { PublicDescriptionBlock } from '@/components/public/PublicDescriptionBlock';
import { RENTAL_DETAIL_DESCRIPTION_LABEL } from '@/lib/rentals/rentalDetailUi';

type RentalDescriptionBlockProps = {
  productTitle: string;
  description?: string | null;
  /** `null` hides section heading when parent already renders one. */
  sectionTitle?: string | null;
};

export function RentalDescriptionBlock({
  productTitle,
  description,
  sectionTitle = RENTAL_DETAIL_DESCRIPTION_LABEL,
}: RentalDescriptionBlockProps) {
  return (
    <PublicDescriptionBlock
      title={productTitle}
      description={description}
      sectionTitle={sectionTitle}
      readMoreLabel="Leer más"
    />
  );
}
