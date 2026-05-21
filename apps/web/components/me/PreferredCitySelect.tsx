'use client';

import { Select } from '@/components';
import { preferredCityOptions } from '@/lib/me/preferred-cities';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  density?: 'default' | 'dense';
};

export function PreferredCitySelect({
  label = 'Ciudad',
  value,
  onChange,
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
      className={className}
      density={density}
    />
  );
}
