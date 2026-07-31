'use client';

import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { preferredCityOptions } from '@/lib/me/preferred-cities';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  density?: 'default' | 'dense';
};

export function PreferredCitySelect({
  label = 'Ciudad',
  value,
  onChange,
  error,
  className,
  density = 'default',
}: Props) {
  return (
    <SearchableCombobox
      label={label}
      value={value}
      onChange={onChange}
      options={preferredCityOptions(value)}
      placeholder="Buscar tu ciudad…"
      emptyMessage="Sin ciudades que coincidan"
      error={error}
      className={className}
      density={density}
    />
  );
}
