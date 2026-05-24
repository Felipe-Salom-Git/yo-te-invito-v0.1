import { ARGENTINA_PROVINCES } from './argentina-locations';

export function provinceLabelFromValue(provinceValue: string): string {
  if (!provinceValue) return '';
  return ARGENTINA_PROVINCES.find((p) => p.value === provinceValue)?.label ?? provinceValue;
}

export function cityLabelFromValue(cityValue: string): string {
  if (!cityValue) return '';
  for (const p of ARGENTINA_PROVINCES) {
    const c = p.cities.find((x) => x.value === cityValue);
    if (c) return c.label;
  }
  return cityValue;
}
