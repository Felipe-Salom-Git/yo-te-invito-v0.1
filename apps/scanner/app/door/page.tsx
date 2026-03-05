'use client';

import { useState } from 'react';
import { scanTicket } from '@/lib/api/scanner';

/**
 * Door Mode UI — large buttons, high contrast, immediate feedback
 * UI de modo puerta — botones grandes, alto contraste, feedback inmediato
 */
export default function DoorPage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    try {
      // Stub: simulate QR input — in real PWA would use camera/QR lib
      // Stub: simula entrada QR — en PWA real usaría cámara/lib QR
      const res = await scanTicket('stub-qr-' + Date.now());
      setResult(res.result === 'ok' ? `OK: ${res.ticketTypeName ?? 'Valid'}` : res.result);
    } catch (err) {
      setResult('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold text-white">Door Mode</h1>

      <button
        onClick={handleScan}
        disabled={loading}
        className="h-40 w-full max-w-md rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50 sm:w-80"
      >
        {loading ? 'Scanning…' : 'SCAN TICKET'}
      </button>

      {result && (
        <div
          className={`rounded-xl px-8 py-4 text-xl font-semibold ${
            result.startsWith('OK')
              ? 'bg-emerald-700 text-white'
              : 'bg-red-700 text-white'
          }`}
        >
          {result}
        </div>
      )}

      <p className="text-center text-sm text-slate-400">
        Stub: tap button to simulate scan
      </p>
    </main>
  );
}
