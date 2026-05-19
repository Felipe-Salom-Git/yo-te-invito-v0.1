'use client';

import { getCategoryLabel } from '@/lib/home/contentRoutes';

type Chip = { label: string };

type RentalProductHeaderProps = {
  title: string;
  description?: string | null;
  subcategoryName?: string | null;
  localName?: string | null;
  children?: React.ReactNode;
};

export function RentalProductHeader({
  title,
  description,
  subcategoryName,
  localName,
  children,
}: RentalProductHeaderProps) {
  const chips: Chip[] = [{ label: getCategoryLabel('rental') }];
  if (subcategoryName?.trim()) {
    chips.push({ label: subcategoryName.trim() });
  }
  if (localName?.trim()) {
    chips.push({ label: localName.trim() });
  }

  return (
    <header className="mt-6">
      <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">{title}</h1>
      {description?.trim() && (
        <p className="mt-3 text-lg leading-relaxed text-text-muted">{description.trim()}</p>
      )}
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex rounded-full border border-border bg-bg-muted/80 px-3 py-1 text-sm text-text-muted"
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
