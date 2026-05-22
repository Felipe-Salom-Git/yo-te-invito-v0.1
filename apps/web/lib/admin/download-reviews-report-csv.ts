import { getSession } from 'next-auth/react';
import type { AdminReviewsReportExportQuery } from '@yo-te-invito/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function downloadAdminReviewsReportCsv(
  query: AdminReviewsReportExportQuery,
): Promise<void> {
  const session = await getSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  if (!token) {
    throw new Error('Debés iniciar sesión como administrador.');
  }

  const url = new URL('/admin/reviews/report/export', API_BASE);
  if (query.category) url.searchParams.set('category', query.category);
  if (query.days != null) url.searchParams.set('days', String(query.days));
  if (query.dataset) url.searchParams.set('dataset', query.dataset);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error al exportar (${res.status})`);
  }

  const blob = await res.blob();
  const dataset = query.dataset ?? 'problematic';
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `reviews-${dataset}-report.csv`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
