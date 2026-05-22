'use client';

import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { CATEGORY_LANDING_META } from '@/lib/categories/categoryLandingConfig';

export function CategoryLandingEditorial({ category }: { category: CategoryGatewayId }) {
  const meta = CATEGORY_LANDING_META[category];

  return (
    <div className="border-b border-white/10 px-4 py-4 sm:px-6 md:px-10 lg:px-12">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent sm:text-xs">
        {meta.title}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-[0.95rem]">
        {meta.editorialDescription}
      </p>
    </div>
  );
}
