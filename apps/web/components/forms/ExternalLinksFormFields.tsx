'use client';

import type { EntitySocialLinks } from '@yo-te-invito/shared';
import { ENTITY_SOCIAL_LINK_LABELS_ES } from '@yo-te-invito/shared';
import { Input } from '@/components';

export type ExternalLinksFormValue = {
  websiteUrl: string;
  bookingUrl: string;
  menuUrl: string;
  socialLinks: EntitySocialLinks;
};

export const EMPTY_EXTERNAL_LINKS_FORM: ExternalLinksFormValue = {
  websiteUrl: '',
  bookingUrl: '',
  menuUrl: '',
  socialLinks: {},
};

type ExternalLinksFormFieldsProps = {
  value: ExternalLinksFormValue;
  onChange: (value: ExternalLinksFormValue) => void;
  showMenuUrl?: boolean;
  sectionTitle?: string;
};

export function externalLinksFromGastroLocal(local: {
  websiteUrl?: string | null;
  bookingUrl?: string | null;
  menuUrl?: string | null;
  socialLinks?: EntitySocialLinks | null;
}): ExternalLinksFormValue {
  return {
    websiteUrl: local.websiteUrl ?? '',
    bookingUrl: local.bookingUrl ?? '',
    menuUrl: local.menuUrl ?? '',
    socialLinks: local.socialLinks ?? {},
  };
}

export function externalLinksFromExcursionOperator(operator: {
  websiteUrl?: string | null;
  bookingUrl?: string | null;
  socialLinks?: EntitySocialLinks | null;
}): ExternalLinksFormValue {
  return {
    websiteUrl: operator.websiteUrl ?? '',
    bookingUrl: operator.bookingUrl ?? '',
    menuUrl: '',
    socialLinks: operator.socialLinks ?? {},
  };
}

export function externalLinksToPayload(value: ExternalLinksFormValue): {
  websiteUrl: string | null;
  bookingUrl: string | null;
  menuUrl?: string | null;
  socialLinks: EntitySocialLinks | null;
} {
  const social: EntitySocialLinks = {};
  for (const key of Object.keys(ENTITY_SOCIAL_LINK_LABELS_ES) as Array<
    keyof EntitySocialLinks
  >) {
    const v = value.socialLinks[key]?.trim();
    if (v) social[key] = v;
  }
  return {
    websiteUrl: value.websiteUrl.trim() || null,
    bookingUrl: value.bookingUrl.trim() || null,
    ...(value.menuUrl !== undefined ? { menuUrl: value.menuUrl.trim() || null } : {}),
    socialLinks: Object.keys(social).length > 0 ? social : null,
  };
}

export function ExternalLinksFormFields({
  value,
  onChange,
  showMenuUrl = false,
  sectionTitle = 'Reservas y redes',
}: ExternalLinksFormFieldsProps) {
  const patch = (partial: Partial<ExternalLinksFormValue>) =>
    onChange({ ...value, ...partial });

  const patchSocial = (key: keyof EntitySocialLinks, url: string) =>
    onChange({
      ...value,
      socialLinks: { ...value.socialLinks, [key]: url },
    });

  return (
    <fieldset className="space-y-4 rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold text-text">{sectionTitle}</legend>
      <p className="text-xs text-text-muted">
        Solo URLs http/https. Los enlaces se muestran en la ficha pública en una sección aparte.
      </p>
      {showMenuUrl ? (
        <Input
          label="Carta / menú (URL)"
          value={value.menuUrl}
          onChange={(e) => patch({ menuUrl: e.target.value })}
          placeholder="https://…"
        />
      ) : null}
      <Input
        label="Sitio web"
        value={value.websiteUrl}
        onChange={(e) => patch({ websiteUrl: e.target.value })}
        placeholder="https://…"
      />
      <Input
        label="Reservas / booking (URL)"
        value={value.bookingUrl}
        onChange={(e) => patch({ bookingUrl: e.target.value })}
        placeholder="https://…"
      />
      {(Object.keys(ENTITY_SOCIAL_LINK_LABELS_ES) as Array<keyof EntitySocialLinks>).map(
        (key) => (
          <Input
            key={key}
            label={ENTITY_SOCIAL_LINK_LABELS_ES[key]}
            value={value.socialLinks[key] ?? ''}
            onChange={(e) => patchSocial(key, e.target.value)}
            placeholder="https://…"
          />
        ),
      )}
    </fieldset>
  );
}
