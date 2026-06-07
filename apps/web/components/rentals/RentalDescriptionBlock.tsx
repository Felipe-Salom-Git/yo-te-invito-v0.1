'use client';

import { PublicDescriptionBlock } from '@/components/public/PublicDescriptionBlock';
import { RENTAL_DETAIL_SECTION_TITLE } from '@/lib/rentals/rentalDetailUi';

type RentalDescriptionBlockProps = {
  productTitle: string;
  description?: string | null;
};

export function RentalDescriptionBlock({
  productTitle,
  description,
}: RentalDescriptionBlockProps) {
  return (
    <PublicDescriptionBlock
      title={productTitle}
      description={description}
      sectionTitle={RENTAL_DETAIL_SECTION_TITLE}
      readMoreLabel="Leer más"
    />
  );
}
