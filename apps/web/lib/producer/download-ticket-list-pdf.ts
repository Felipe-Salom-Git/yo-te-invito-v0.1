import { getSession } from 'next-auth/react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function downloadProducerTicketListPdf(eventId: string): Promise<void> {
  const session = await getSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const userId =
    (session?.user as { userId?: string; id?: string } | undefined)?.userId ??
    (session?.user as { id?: string } | undefined)?.id;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (userId) headers['X-Dev-User-Id'] = userId;
  else throw new Error('Debés iniciar sesión como productora.');

  const res = await fetch(
    `${API_BASE}/producer/events/${encodeURIComponent(eventId)}/tickets/export.pdf`,
    { headers },
  );
  if (!res.ok) {
    let message = `Error al exportar (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `entradas-${eventId}.pdf`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
