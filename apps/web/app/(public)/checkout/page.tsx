'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/schemas/checkout';
import { getReferralCode } from '@/lib/referral-cookie';
import { PageContainer, SectionTitle, Button, Input } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, clearCart, updateQuantity, removeItem } = useCart();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const [form, setForm] = useState<CheckoutFormData>({
    email: (session?.user?.email as string) ?? '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  if (items.length === 0) {
    return (
      <PageContainer>
        <SectionTitle>Checkout</SectionTitle>
        <p className="mt-4 text-text-muted">Tu carrito está vacío.</p>
        <Link href="/home" className="mt-4 inline-block text-accent hover:underline">
          ← Ver eventos
        </Link>
      </PageContainer>
    );
  }

  const byEvent = items.reduce<Record<string, typeof items>>((acc, i) => {
    if (!acc[i.eventId]) acc[i.eventId] = [];
    acc[i.eventId]!.push(i);
    return acc;
  }, {});

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutFormSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        const path = e.path[0] as string;
        if (path) errs[path] = e.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const eventIds = Object.keys(byEvent);
      const orderIds: string[] = [];
      for (const eventId of eventIds) {
        const eventItems = byEvent[eventId]!;
        const order = await repos.orders.create({
          tenantId: t,
          eventId,
          buyerEmail: parsed.data.email,
          buyerName: `${parsed.data.firstName} ${parsed.data.lastName}`,
          buyerUserId: userId || undefined,
          items: eventItems.map((i) => ({
            ticketTypeId: i.ticketTypeId,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
          referralCode: getReferralCode(),
        });
        orderIds.push(order.id);
      }
      clearCart();
      router.push(`/checkout/success?orderIds=${orderIds.join(',')}`);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Error al crear la orden' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver
      </Link>
      <SectionTitle>Checkout</SectionTitle>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold text-text">Resumen</h2>
          <ul className="mt-4 space-y-3">
            {items.map((i) => (
              <li key={i.ticketTypeId} className="flex items-center justify-between rounded border border-border bg-bg-muted p-3">
                <div>
                  <p className="font-medium text-text">{i.eventTitle} — {i.ticketTypeName}</p>
                  <p className="text-sm text-text-muted">${i.price} x {i.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={i.maxPerOrder ?? 10}
                    value={i.quantity}
                    onChange={(e) => updateQuantity(i.ticketTypeId, parseInt(e.target.value, 10) || 0)}
                    className="w-14 rounded border border-border bg-bg px-2 py-1 text-text"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i.ticketTypeId)}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-semibold text-text">Total: ${total}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-bg-muted p-6">
          <h2 className="font-semibold text-text">Datos del comprador</h2>
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
          <Input
            label="Nombre"
            name="firstName"
            value={form.firstName}
            onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            required
          />
          {errors.firstName && <p className="text-sm text-red-400">{errors.firstName}</p>}
          <Input
            label="Apellido"
            name="lastName"
            value={form.lastName}
            onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            required
          />
          {errors.lastName && <p className="text-sm text-red-400">{errors.lastName}</p>}
          <Input
            label="Teléfono (opcional)"
            name="phone"
            value={form.phone ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creando…' : 'Crear orden (PENDING_PAYMENT)'}
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}
