'use client';

import { Input } from '@/components';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';
import {
  RentalProductImagesForm,
  type RentalProductImagesValue,
} from '@/components/rentals/RentalProductImagesForm';
import { RentalSummaryField } from '@/components/rentals/RentalSummaryField';
import type { ContentMainCategory } from '@/repositories/interfaces';

export type ServiceCategoryPublicationValue = {
  title: string;
  summary: string;
  description: string;
  subcategoryId: string;
  images: RentalProductImagesValue;
};

export const EMPTY_SERVICE_PUBLICATION_VALUE: ServiceCategoryPublicationValue = {
  title: '',
  summary: '',
  description: '',
  subcategoryId: '',
  images: { headerImageUrl: '', galleryImageUrls: [] },
};

type ServiceCategoryPublicationFieldsProps = {
  category: ContentMainCategory;
  value: ServiceCategoryPublicationValue;
  onChange: (value: ServiceCategoryPublicationValue) => void;
};

export function ServiceCategoryPublicationFields({
  category,
  value,
  onChange,
}: ServiceCategoryPublicationFieldsProps) {
  const patch = (partial: Partial<ServiceCategoryPublicationValue>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="space-y-4">
      <Input
        label="Nombre / título"
        value={value.title}
        onChange={(e) => patch({ title: e.target.value })}
        required
      />
      <RentalSummaryField value={value.summary} onChange={(summary) => patch({ summary })} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Detalle / descripción</label>
        <textarea
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={4}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
        />
      </div>
      <SubcategorySelect
        category={category}
        value={value.subcategoryId}
        onChange={(subcategoryId) => patch({ subcategoryId })}
      />
      <RentalProductImagesForm value={value.images} onChange={(images) => patch({ images })} />
    </div>
  );
}
