import { z } from 'zod';

const BLOCKED_URL_PROTOCOL = /^(javascript|data|vbscript|file):/i;

/** Rejects non-http(s) and dangerous protocols. */
export function isSafeExternalHttpUrl(value: string): boolean {
  const s = value.trim();
  if (!s || BLOCKED_URL_PROTOCOL.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const safeExternalUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeExternalHttpUrl, {
    message: 'Ingresá una URL válida que empiece con http:// o https://',
  });

/** Optional https URL for forms/API — empty string → null. */
export const safeExternalUrlOptionalSchema = z
  .string()
  .max(2048)
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null))
  .transform((s) => {
    if (s == null) return null;
    const t = s.trim();
    return t || null;
  })
  .refine((s) => s == null || isSafeExternalHttpUrl(s), {
    message: 'Ingresá una URL válida que empiece con http:// o https://',
  });

export const entitySocialLinksSchema = z
  .object({
    instagram: safeExternalUrlOptionalSchema,
    facebook: safeExternalUrlOptionalSchema,
    tiktok: safeExternalUrlOptionalSchema,
    youtube: safeExternalUrlOptionalSchema,
    externalUrl: safeExternalUrlOptionalSchema,
  })
  .partial()
  .strict();

export type EntitySocialLinks = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  externalUrl?: string | null;
};

export const entitySocialLinksInputSchema = entitySocialLinksSchema.nullable().optional();

export function parseEntitySocialLinks(raw: unknown): EntitySocialLinks | null {
  if (raw == null) return null;
  const parsed = entitySocialLinksSchema.safeParse(raw);
  if (!parsed.success) return null;
  const out: EntitySocialLinks = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (typeof value === 'string' && value.trim()) {
      (out as Record<string, string>)[key] = value.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function normalizeEntitySocialLinksForWrite(
  value: EntitySocialLinks | null | undefined,
): EntitySocialLinks | null {
  if (value == null) return null;
  const parsed = entitySocialLinksSchema.parse(value);
  const out: EntitySocialLinks = {};
  for (const [key, v] of Object.entries(parsed)) {
    if (typeof v === 'string' && v.trim()) {
      (out as Record<string, string>)[key] = v.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export const ENTITY_SOCIAL_LINK_LABELS_ES: Record<keyof EntitySocialLinks, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  externalUrl: 'Enlace adicional',
};
