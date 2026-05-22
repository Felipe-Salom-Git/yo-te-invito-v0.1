'use client';

import { RentalDescriptionBlock } from '@/components/rentals/RentalDescriptionBlock';

type GastroAboutSectionProps = {
  displayName: string;
  description: string | null;
  hasEditorialContent: boolean;
};

export function GastroAboutSection({
  displayName,
  description,
  hasEditorialContent,
}: GastroAboutSectionProps) {
  if (description) {
    return (
      <RentalDescriptionBlock productTitle={displayName} description={description} />
    );
  }

  if (hasEditorialContent) return null;

  return (
    <section className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-6">
      <h2 className="text-lg font-semibold text-text">Sobre el local</h2>
      <p className="mt-2 text-sm text-text-muted">
        Todavía no hay una descripción extendida publicada para este restaurante.
      </p>
    </section>
  );
}
