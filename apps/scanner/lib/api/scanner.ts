import type { ScanResponse } from '@yo-te-invito/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function scanTicket(qrCode: string): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/scanner/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrCode }),
  });
  if (!res.ok) throw new Error('Scan request failed');
  return res.json();
}
