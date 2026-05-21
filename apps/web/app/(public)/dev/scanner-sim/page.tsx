'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button } from '@/components';
import { StatusBadge } from '@/components/domain/StatusBadge';

export default function ScannerSimPage() {
  const repos = useRepositories();
  const [qrPayload, setQrPayload] = useState('');
  const [result, setResult] = useState<{ result: string; ticket?: { id: string; status: string } } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!qrPayload.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await repos.scanner.scan(qrPayload.trim());
      setResult({ result: res.result, ticket: res.ticket ? { id: res.ticket.id, status: res.ticket.status } : undefined });
    } catch (err) {
      setResult({ result: 'ERROR' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">← Inicio</Link>
      <SectionTitle>Scanner simulado</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">Ingresá un qrPayload para validar. Resultado: OK, ALREADY_USED, REVOKED, INVALID.</p>

      <div className="mt-6 flex gap-4">
        <input
          type="text"
          value={qrPayload}
          onChange={(e) => setQrPayload(e.target.value)}
          placeholder="yti:v1:ticket-01"
          className="flex-1 rounded border border-border bg-bg px-3 py-2 text-text"
        />
        <Button onClick={handleScan} disabled={loading}>
          {loading ? '…' : 'Escanear'}
        </Button>
      </div>

      {result && (
        <div className="mt-6 rounded-lg border border-border bg-bg-muted p-4">
          <p className="font-semibold text-text">
            Resultado: <StatusBadge status={result.result} kind="scan" />
          </p>
          {result.ticket && (
            <p className="mt-2 text-sm text-text-muted">
              Ticket: {result.ticket.id} — <StatusBadge status={result.ticket.status} kind="ticket" className="ml-1" />
            </p>
          )}
        </div>
      )}
    </PageContainer>
  );
}
