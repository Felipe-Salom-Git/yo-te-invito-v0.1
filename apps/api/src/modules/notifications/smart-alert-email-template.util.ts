import type { GastroDiscountType } from '@prisma/client';
import { getAppUrl, getDefaultSupportEmail } from '../../email/templates/email-template.util';
import {
  buildTransferEventContext,
  formatPersonName,
  type TransferEventContext,
} from '../me/ticket-transfer-notification.util';
import { categoryLabel } from './smart-alerts-matching.util';

export function portalPreferencesUrl(): string {
  return `${getAppUrl()}/me/preferences`;
}

export function buildFavoriteOrExpectedEventSoonVariables(input: {
  userName: string;
  event: {
    id: string;
    title: string;
    startAt: Date;
    venueName?: string | null;
    venueAddress?: string | null;
    city?: string | null;
  };
  variant: 'favorite' | 'expected';
}): Record<string, unknown> {
  const appUrl = getAppUrl();
  const eventUrl = `${appUrl}/events/${input.event.id}`;
  const eventCtx = buildTransferEventContext(input.event);
  return {
    userName: input.userName,
    eventTitle: eventCtx.eventTitle,
    eventDate: eventCtx.eventDate,
    eventTime: eventCtx.eventTime,
    venueName: eventCtx.venueName,
    city: eventCtx.city,
    eventUrl,
    ticketsUrl: eventUrl,
    supportEmail: getDefaultSupportEmail(),
    variant: input.variant,
  };
}

export function buildFollowedProducerNewEventVariables(input: {
  userName: string;
  producerName: string;
  producerProfileId: string;
  event: TransferEventContext & { id: string; city?: string };
  eventCategory: string | null;
}): Record<string, unknown> {
  const appUrl = getAppUrl();
  const eventPath =
    input.eventCategory === 'gastro'
      ? `/restaurants/${input.event.id}`
      : input.eventCategory === 'excursion'
        ? `/excursiones/${input.event.id}`
        : input.eventCategory === 'rental'
          ? `/rentals/${input.event.id}`
          : input.eventCategory === 'hotel'
            ? `/hoteles/${input.event.id}`
            : `/events/${input.event.id}`;

  return {
    userName: input.userName,
    producerName: input.producerName,
    eventTitle: input.event.eventTitle,
    eventDate: input.event.eventDate,
    city: input.event.city,
    eventUrl: `${appUrl}${eventPath}`,
    producerUrl: `${appUrl}/producers/${input.producerProfileId}`,
    supportEmail: getDefaultSupportEmail(),
  };
}

export function buildFavoriteInterestNewContentVariables(input: {
  userName: string;
  contentTitle: string;
  categoryName: string;
  subcategoryName?: string;
  city?: string | null;
  contentUrl: string;
}): Record<string, unknown> {
  return {
    userName: input.userName,
    contentTitle: input.contentTitle,
    categoryName: input.categoryName,
    subcategoryName: input.subcategoryName ?? '',
    city: input.city?.trim() ?? '',
    contentUrl: input.contentUrl,
    preferencesUrl: portalPreferencesUrl(),
    supportEmail: getDefaultSupportEmail(),
  };
}

export function formatGastroDiscountValue(type: GastroDiscountType, value: number): string {
  if (type === 'PERCENT') return `${value}%`;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildFollowedGastroNewDiscountVariables(input: {
  userName: string;
  gastroName: string;
  discountTitle: string;
  discountValue: string;
  validUntil?: string;
  gastroUrl: string;
}): Record<string, unknown> {
  return {
    userName: input.userName,
    gastroName: input.gastroName,
    discountTitle: input.discountTitle,
    discountValue: input.discountValue,
    validUntil: input.validUntil ?? '',
    gastroUrl: input.gastroUrl,
    preferencesUrl: portalPreferencesUrl(),
    supportEmail: getDefaultSupportEmail(),
  };
}

export function eventContextFromPublishedRow(event: {
  title: string;
  startAt: Date;
  city: string | null;
}): TransferEventContext & { id?: string; city?: string } {
  const ctx = buildTransferEventContext({
    title: event.title,
    startAt: event.startAt,
    city: event.city,
  });
  return { ...ctx, city: event.city?.trim() || undefined };
}

export function categoryDisplayName(category: string | null | undefined): string {
  return categoryLabel(category);
}
