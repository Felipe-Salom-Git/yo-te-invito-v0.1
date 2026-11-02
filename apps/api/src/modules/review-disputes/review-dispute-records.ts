import { Prisma, ReviewDisputeStatus } from '@prisma/client';
import type {
  CreateReviewDisputeInput,
  ReviewDisputeResponse,
  ReviewPublicStatus,
} from '@yo-te-invito/shared';
import { eventCategoryToReviewCategory, readOverallRating } from '../reviews/review-public.util';

/**
 * Shared persistence + mapping for review disputes (producer events and gastro locals, G12.1-C).
 * Persistencia + mapeo compartidos de disputas de valoraciones (productoras y locales gastro).
 */

export const OPEN_DISPUTE_STATUSES: ReviewDisputeStatus[] = ['PENDING', 'IN_REVIEW'];

export const DISPUTE_REVIEW_INCLUDE = {
  review: {
    include: { user: { select: { firstName: true, lastName: true } } },
  },
  event: { select: { title: true, category: true, producerId: true } },
} as const;

export const DISPUTE_ADMIN_INCLUDE = {
  ...DISPUTE_REVIEW_INCLUDE,
  producerProfile: { select: { displayName: true } },
  gastroProfile: { select: { displayName: true } },
} as const;

/** Exactly one owner scope per dispute (mirrors the DB CHECK constraint). */
export type ReviewDisputeOwner = { producerProfileId: string } | { gastroProfileId: string };

export function reviewUserName(row: {
  guestName: string | null;
  user: { firstName: string; lastName: string } | null;
}): string {
  if (row.user) {
    return `${row.user.firstName} ${row.user.lastName}`.trim() || 'Usuario';
  }
  return row.guestName?.trim() || 'Invitado';
}

export function mapDispute(row: {
  id: string;
  reviewId: string;
  producerProfileId: string | null;
  gastroProfileId: string | null;
  eventId: string;
  reasonType: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  review: {
    score: number;
    overallRating?: number | null;
    comment: string | null;
    guestName: string | null;
    status?: string;
    hiddenFromPublic?: boolean;
    officialReply?: string | null;
    user: { firstName: string; lastName: string } | null;
  };
  event: { title: string; category?: string | null };
}): ReviewDisputeResponse {
  const overall = readOverallRating({
    overallRating: row.review.overallRating ?? null,
    score: row.review.score,
  });
  return {
    id: row.id,
    reviewId: row.reviewId,
    ownerType: row.gastroProfileId ? 'GASTRO' : 'PRODUCER',
    producerProfileId: row.producerProfileId,
    gastroProfileId: row.gastroProfileId,
    eventId: row.eventId,
    eventTitle: row.event.title,
    eventCategory: eventCategoryToReviewCategory(row.event.category),
    reasonType: row.reasonType as ReviewDisputeResponse['reasonType'],
    message: row.message,
    status: row.status as ReviewDisputeResponse['status'],
    adminNote: row.adminNote,
    reviewScore: row.review.score,
    reviewOverallRating: overall,
    reviewComment: row.review.comment,
    reviewUserDisplayName: reviewUserName(row.review),
    reviewPublicStatus: (row.review.status ?? 'VISIBLE') as ReviewPublicStatus,
    reviewHiddenFromPublic: row.review.hiddenFromPublic ?? false,
    hasOfficialReply: Boolean(row.review.officialReply?.trim()),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

type DisputeTxClient = Pick<Prisma.TransactionClient, 'review' | 'inboxItem' | 'reviewDisputeRequest'>;

/**
 * Same effects for every owner: review → IN_REVIEW, ADMIN inbox item, PENDING dispute row.
 * Mismos efectos para todo owner: review → IN_REVIEW, item de inbox ADMIN, disputa PENDING.
 */
export async function createDisputeRecord(
  prisma: { $transaction<T>(fn: (tx: DisputeTxClient) => Promise<T>): Promise<T> },
  params: {
    tenantId: string;
    userId: string;
    review: { id: string; eventId: string; eventTitle: string };
    owner: ReviewDisputeOwner;
    body: CreateReviewDisputeInput;
  },
) {
  const { tenantId, userId, review, owner, body } = params;
  return prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: review.id },
      data: { status: 'IN_REVIEW' },
    });

    const inbox = await tx.inboxItem.create({
      data: {
        tenantId,
        kind: 'REVIEW_DISPUTE_REQUEST',
        status: 'PENDING',
        createdByUserId: userId,
        assigneeRole: 'ADMIN',
        title: `Revisión valoración · ${review.eventTitle}`,
        summary: body.message.slice(0, 500),
        payload: {
          reviewId: review.id,
          reasonType: body.reasonType,
          message: body.message,
          eventId: review.eventId,
          ...owner,
        } as object,
      },
    });

    return tx.reviewDisputeRequest.create({
      data: {
        tenantId,
        reviewId: review.id,
        ...owner,
        eventId: review.eventId,
        requestedByUserId: userId,
        reasonType: body.reasonType,
        message: body.message,
        status: 'PENDING',
        inboxItemId: inbox.id,
      },
      include: DISPUTE_REVIEW_INCLUDE,
    });
  });
}
