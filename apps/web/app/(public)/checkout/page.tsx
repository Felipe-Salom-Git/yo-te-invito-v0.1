'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/schemas/checkout';
import { getReferralCode } from '@/lib/referral-cookie';
import { PageContainer, SectionTitle, Button, Input, PageLoader } from '@/components';
import { useState } from 'react';

const TENANT_ID = 'tenant-demo';

/**
 * Checkout invitado (carrito en localStorage).
 * Usuarios autenticados usan /me/cart + API.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { status } = useSession();
  const { items, clearCart, updateQuantity, removeItem } = useCart();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  const [form, setForm] = useState<CheckoutFormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/me/cart');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <PageContainer>
        <PageLoader message="Redirigiendo al carrito…" />
      </PageContainer>
    );
  }

  if (items.length === 0) {
    return (
      <PageContainer>
        <SectionTitle>Checkout</SectionTitle>
        <p className="mt-4 text-text-muted">Tu carrito está vacío.</p>
        <Link href="/explore" className="mt-4 inline-block text-accent hover:underline">
          Explorar eventos
        </Link>
        <p className="mt-4 text-sm text-text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Iniciá sesión
          </Link>{' '}
          para guardar el carrito en tu cuenta.
        </p>
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
      parsed.error.errors.forEach((err) => {
        const path = err.path[0] as string;
        if (path) errs[path] = err.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const orderIds: string[] = [];
      for (const eventId of Object.keys(byEvent)) {
        const eventItems = byEvent[eventId]!;
        const order = await repos.orders.create({
          tenantId: t,
          eventId,
          buyerEmail: parsed.data.email,
          buyerName: `${parsed.data.firstName} ${parsed.data.lastName}`,
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
      <p className="mt-1 text-sm text-text-muted">
        Compra como invitado.{' '}
        <Link href="/login" className="text-accent hover:underline">
          Iniciá sesión
        </Link>{' '}
        para usar el carrito guardado en tu cuenta.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold text-text">Resumen</h2>
          <ul className="mt-4 space-y-3">
            {items.map((i) => (
              <li
                key={i.ticketTypeId}
                className="flex items-center justify-between rounded border border-border bg-bg-muted p-3"
              >
                <div>
                  <p className="font-medium text-text">
                    {i.eventTitle} — {i.ticketTypeName}
                  </p>
                  <p className="text-sm text-text-muted">
                    ${i.price} x {i.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={i.maxPerOrder ?? 10}
                    value={i.quantity}
                    onChange={(e) =>
                      updateQuantity(i.ticketTypeId, parseInt(e.target.value, 10) || 0)
                    }
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

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-bg-muted p-6"
        >
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
            {loading ? 'Creando…' : 'Crear orden y pagar'}
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}
