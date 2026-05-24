'use client';

import { Select } from '@/components';
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
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={preferredCityOptions(value)}
      placeholder="Elegí tu ciudad"
      error={error}
      className={className}
      density={density}
    />
  );
}
