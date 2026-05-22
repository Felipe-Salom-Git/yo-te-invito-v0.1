'use client';

import type { RentalOpeningHours } from '@yo-te-invito/shared';
import { RentalLocalCard } from '@/components/rentals/RentalLocalCard';

type GastroLocationCardProps = {
  name: string;
  address?: string | null;
  openingHours?: RentalOpeningHours | null;
  openingHoursNote?: string | null;
  hasLocation: boolean;
  onViewLocation?: () => void;
};

export function GastroLocationCard(props: GastroLocationCardProps) {
  return <RentalLocalCard {...props} />;
}
