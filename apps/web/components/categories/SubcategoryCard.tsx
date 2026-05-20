'use client';

import { SubcategoryFilterChip } from './SubcategoryFilterChip';
import type { PublicSubcategorySummary } from '@/repositories/interfaces';

export interface SubcategoryCardProps {
  item: PublicSubcategorySummary;
  href: string;
  isActive?: boolean;
}

export function SubcategoryCard({ item, href, isActive = false }: SubcategoryCardProps) {
  return (
    <SubcategoryFilterChip href={href} title={item.name} isActive={isActive} />
  );
}
