import { Prisma } from '@prisma/client';
import {
  normalizeEntitySocialLinksForWrite,
  parseEntitySocialLinks,
  type EntitySocialLinks,
} from '@yo-te-invito/shared';

export function readEntitySocialLinks(raw: unknown): EntitySocialLinks | null {
  return parseEntitySocialLinks(raw);
}

export function writeEntitySocialLinks(
  value: EntitySocialLinks | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  const normalized = normalizeEntitySocialLinksForWrite(value);
  if (normalized == null) return Prisma.JsonNull;
  return normalized as Prisma.InputJsonValue;
}
