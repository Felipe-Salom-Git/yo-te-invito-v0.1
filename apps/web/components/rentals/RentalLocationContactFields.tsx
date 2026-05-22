'use client';

import { Input } from '@/components';

export type RentalContactFormValue = {
  contactPhone: string;
  whatsappPhone: string;
  contactEmail: string;
  websiteUrl: string;
};

export const EMPTY_RENTAL_CONTACT: RentalContactFormValue = {
  contactPhone: '',
  whatsappPhone: '',
  contactEmail: '',
  websiteUrl: '',
};

export function rentalContactPayload(value: RentalContactFormValue) {
  return {
    contactPhone: value.contactPhone.trim() || null,
    whatsappPhone: value.whatsappPhone.trim() || null,
    contactEmail: value.contactEmail.trim() || null,
    websiteUrl: value.websiteUrl.trim() || null,
  };
}

export function rentalContactFromLocation(location: {
  contactPhone?: string | null;
  whatsappPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
}): RentalContactFormValue {
  return {
    contactPhone: location.contactPhone ?? '',
    whatsappPhone: location.whatsappPhone ?? '',
    contactEmail: location.contactEmail ?? '',
    websiteUrl: location.websiteUrl ?? '',
  };
}

type RentalLocationContactFieldsProps = {
  value: RentalContactFormValue;
  onChange: (value: RentalContactFormValue) => void;
};

export function RentalLocationContactFields({
  value,
  onChange,
}: RentalLocationContactFieldsProps) {
  const set = (patch: Partial<RentalContactFormValue>) =>
    onChange({ ...value, ...patch });

  return (
    <fieldset className="space-y-4 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium text-text">Contacto del local</legend>
      <Input
        label="Teléfono de contacto"
        value={value.contactPhone}
        onChange={(e) => set({ contactPhone: e.target.value })}
        placeholder="+54 294 4 ..."
      />
      <div>
        <Input
          label="WhatsApp"
          value={value.whatsappPhone}
          onChange={(e) => set({ whatsappPhone: e.target.value })}
          placeholder="+54 9 294 4 ..."
        />
        <p className="mt-1 text-xs text-text-muted">
          Usar código de país. Ej: +54 9 294 ...
        </p>
      </div>
      <Input
        label="Email (opcional)"
        type="email"
        value={value.contactEmail}
        onChange={(e) => set({ contactEmail: e.target.value })}
      />
      <Input
        label="Sitio web (opcional)"
        value={value.websiteUrl}
        onChange={(e) => set({ websiteUrl: e.target.value })}
        placeholder="https://..."
      />
    </fieldset>
  );
}
