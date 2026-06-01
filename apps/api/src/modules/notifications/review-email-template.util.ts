import type { NotificationKind } from '@prisma/client';
import type { EmailTemplateId } from '../../email/templates/email-template.types';
import { getAppUrl, getDefaultSupportEmail } from '../../email/templates/email-template.util';
import type { PrismaService } from '../../prisma/prisma.service';

export type ReviewEventContext = {
  id: string;
  title: string;
  category: string | null;
};

export type ReviewEmailIds = {
  reviewId?: string;
  disputeId?: string;
};

function formatPersonName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = 'Usuario',
): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
}

function entityTypeLabel(category: string | null): string {
  switch (category) {
    case 'gastro':
      return 'Gastronómico';
    case 'hotel':
      return 'Hotel';
    case 'excursion':
      return 'Excursión';
    case 'rental':
      return 'Rental';
    default:
      return 'Evento';
  }
}

function truncateText(value: string | null | undefined, max = 280): string {
  const text = value?.trim() ?? '';
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function readRating(overallRating: number | null, score: number): number {
  return overallRating ?? score;
}

export function reviewEmailTemplateId(kind: NotificationKind): EmailTemplateId | null {
  switch (kind) {
    case 'REVIEW_RECEIVED':
      return 'REVIEW_RECEIVED';
    case 'REVIEW_OFFICIAL_REPLY':
      return 'REVIEW_OFFICIAL_REPLY';
    case 'REVIEW_DISPUTE_CREATED':
      return 'REVIEW_DISPUTE_CREATED';
    case 'REVIEW_DISPUTE_ACCEPTED':
      return 'REVIEW_DISPUTE_ACCEPTED';
    case 'REVIEW_DISPUTE_REJECTED':
      return 'REVIEW_DISPUTE_REJECTED';
    case 'REVIEW_MODERATION_HIDDEN':
      return 'REVIEW_MODERATION_HIDDEN';
    case 'REVIEW_MODERATION_RESTORED':
      return 'REVIEW_MODERATION_RESTORED';
    default:
      return null;
  }
}

export async function buildReviewEmailTemplateVariables(
  prisma: PrismaService,
  kind: NotificationKind,
  event: ReviewEventContext,
  href: string,
  recipient: { firstName?: string | null; lastName?: string | null },
  ids: ReviewEmailIds,
): Promise<Record<string, unknown> | null> {
  const templateId = reviewEmailTemplateId(kind);
  if (!templateId) return null;

  const appUrl = getAppUrl();
  const supportEmail = getDefaultSupportEmail();
  const recipientName = formatPersonName(recipient.firstName, recipient.lastName);
  const entityTitle = event.title;
  const reviewsUrl = href.startsWith('http') ? href : `${appUrl}${href}`;
  const reviewUrl = ids.reviewId ? `${appUrl}/me/activity?tab=reviews` : reviewsUrl;
  const disputeUrl = reviewsUrl;

  const base = { recipientName, entityTitle, supportEmail, reviewsUrl, reviewUrl, disputeUrl };

  if (kind === 'REVIEW_RECEIVED' && ids.reviewId) {
    const review = await prisma.review.findFirst({
      where: { id: ids.reviewId },
      select: {
        overallRating: true,
        score: true,
        comment: true,
        guestName: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!review) return { ...base, reviewAuthorName: 'Usuario', rating: '', reviewText: '' };
    const reviewAuthorName = review.user
      ? formatPersonName(review.user.firstName, review.user.lastName)
      : review.guestName?.trim() || 'Usuario';
    return {
      ...base,
      reviewAuthorName,
      rating: String(readRating(review.overallRating, review.score)),
      reviewText: truncateText(review.comment),
      entityType: entityTypeLabel(event.category),
    };
  }

  if (kind === 'REVIEW_OFFICIAL_REPLY' && ids.reviewId) {
    const review = await prisma.review.findFirst({
      where: { id: ids.reviewId },
      select: { officialReply: true },
    });
    return {
      userName: recipientName,
      entityTitle,
      officialReply: truncateText(review?.officialReply),
      reviewUrl: reviewsUrl,
      supportEmail,
    };
  }

  if (kind === 'REVIEW_DISPUTE_CREATED' && ids.disputeId) {
    const dispute = await prisma.reviewDisputeRequest.findFirst({
      where: { id: ids.disputeId },
      select: { message: true, status: true, review: { select: { overallRating: true, score: true } } },
    });
    return {
      ...base,
      reason: truncateText(dispute?.message),
      disputeStatus: dispute?.status ?? 'PENDING',
      rating: dispute?.review
        ? String(readRating(dispute.review.overallRating, dispute.review.score))
        : '',
      entityType: entityTypeLabel(event.category),
    };
  }

  if (
    (kind === 'REVIEW_DISPUTE_ACCEPTED' || kind === 'REVIEW_DISPUTE_REJECTED') &&
    ids.disputeId
  ) {
    const dispute = await prisma.reviewDisputeRequest.findFirst({
      where: { id: ids.disputeId },
      select: { adminNote: true },
    });
    return {
      ...base,
      resolutionNote: truncateText(dispute?.adminNote) || 'Sin nota adicional de administración.',
    };
  }

  if (
    (kind === 'REVIEW_MODERATION_HIDDEN' || kind === 'REVIEW_MODERATION_RESTORED') &&
    ids.reviewId
  ) {
    const review = await prisma.review.findFirst({
      where: { id: ids.reviewId },
      select: { hiddenReason: true },
    });
    return {
      recipientName,
      entityTitle,
      reviewsUrl: reviewUrl,
      supportEmail,
      ...(review?.hiddenReason
        ? { moderationReason: truncateText(review.hiddenReason) }
        : {}),
    };
  }

  return base;
}
