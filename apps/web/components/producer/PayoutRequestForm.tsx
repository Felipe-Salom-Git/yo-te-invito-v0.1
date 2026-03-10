'use client';

import { useState } from 'react';
import { payoutRequestFormSchema } from '@/lib/schemas/payout';
import { Button, Input } from '@/components';

export type PayoutRequestFormProps = {
  eventId: string;
  eventTitle: string;
  maxAmountCents: number;
  onSubmit: (data: {
    amountCents: number;
    bankInfo: { titular: string; banco: string; cbu: string };
  }) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
};

export function PayoutRequestForm({
  eventTitle,
  maxAmountCents,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: PayoutRequestFormProps) {
  const [amountCents, setAmountCents] = useState(Math.min(maxAmountCents, 100000) || 0);
  const [titular, setTitular] = useState('');
  const [banco, setBanco] = useState('');
  const [cbu, setCbu] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = payoutRequestFormSchema.safeParse({
      amountCents,
      titular,
      banco,
      cbu,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        const p = err.path[0] as string;
        if (p) errs[p] = err.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({
      amountCents: parsed.data.amountCents,
      bankInfo: {
        titular: parsed.data.titular,
        banco: parsed.data.banco,
        cbu: parsed.data.cbu,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-text-muted">
        Evento: {eventTitle}. Máximo: ${(maxAmountCents / 100).toLocaleString('es-AR')}
      </p>
      <Input
        label="Monto (centavos)"
        type="number"
        min={1}
        max={maxAmountCents}
        value={amountCents || ''}
        onChange={(e) => setAmountCents(parseInt(e.target.value, 10) || 0)}
        error={errors.amountCents}
      />
      <Input
        label="Titular de la cuenta"
        value={titular}
        onChange={(e) => setTitular(e.target.value)}
        error={errors.titular}
      />
      <Input label="Banco" value={banco} onChange={(e) => setBanco(e.target.value)} error={errors.banco} />
      <Input label="CBU" value={cbu} onChange={(e) => setCbu(e.target.value)} error={errors.cbu} placeholder="22 dígitos" />
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Solicitar retiro'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
