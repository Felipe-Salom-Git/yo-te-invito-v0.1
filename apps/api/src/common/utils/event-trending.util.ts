import type { Prisma } from '@prisma/client';

/**
 * Public trending sort (Slice 7).
 *
 * There is no `recentScore` on Event — trending uses engagement + ranking:
 * 1. viewCount DESC (page views via POST /public/events/:id/view)
 * 2. rankingScore DESC (review-based score; nulls sort last in Prisma)
 * 3. startAt ASC (sooner events first among ties)
 * 4. createdAt DESC (newer listings break remaining ties)
 *
 * Recommended / top_rated endpoints are unchanged (rankingScore + reviews).
 */
export type TrendingSortRow = {
  viewCount: number;
  rankingScore: number | null;
  startAt: Date;
  createdAt: Date;
};

export const TRENDING_PRISMA_ORDER_BY: Prisma.EventOrderByWithRelationInput[] = [
  { viewCount: 'desc' },
  { rankingScore: 'desc' },
  { startAt: 'asc' },
  { createdAt: 'desc' },
];

/** In-memory comparator — mirrors DB order for unit tests. */
export function compareTrendingEvents(a: TrendingSortRow, b: TrendingSortRow): number {
  if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;

  const rankA = a.rankingScore ?? Number.NEGATIVE_INFINITY;
  const rankB = b.rankingScore ?? Number.NEGATIVE_INFINITY;
  if (rankB !== rankA) return rankB > rankA ? 1 : rankB < rankA ? -1 : 0;

  const startDiff = a.startAt.getTime() - b.startAt.getTime();
  if (startDiff !== 0) return startDiff;

  return b.createdAt.getTime() - a.createdAt.getTime();
}
