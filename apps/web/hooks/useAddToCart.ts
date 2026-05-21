'use client';

import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { useMeCartMutations } from '@/lib/query/me-portal';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const DEFAULT_TENANT = 'tenant-demo';

export type AddToCartInput = {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  /** Solo carrito local (invitados) */
  eventTitle?: string;
  ticketTypeName?: string;
  price?: number;
  maxPerOrder?: number;
};

/**
 * Agrega al carrito API si hay sesión; si no, persiste en localStorage (CartContext).
 */
export function useAddToCart() {
  const { data: session, status } = useSession();
  const { tenantId } = useTenant();
  const { addItem: addLocal, totalItems: localTotal } = useCart();
  const { addItem: addApi } = useMeCartMutations();
  const { addToast } = useToast();

  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const t = tenantId || DEFAULT_TENANT;
  const cartHref = isAuthenticated ? '/me/cart' : '/checkout';

  const addToCart = (
    input: AddToCartInput,
    options?: { onSuccess?: () => void; silent?: boolean },
  ) => {
    if (input.quantity < 1) return;

    if (isAuthenticated) {
      addApi.mutate(
        {
          eventId: input.eventId,
          ticketTypeId: input.ticketTypeId,
          quantity: input.quantity,
          tenantId: t,
        },
        {
          onSuccess: () => {
            if (!options?.silent) addToast('Agregado al carrito', 'success');
            options?.onSuccess?.();
          },
          onError: (err) => addToast(getErrorMessage(err), 'error'),
        },
      );
      return;
    }

    if (
      input.eventTitle &&
      input.ticketTypeName != null &&
      input.price != null
    ) {
      addLocal({
        eventId: input.eventId,
        eventTitle: input.eventTitle,
        ticketTypeId: input.ticketTypeId,
        ticketTypeName: input.ticketTypeName,
        price: input.price,
        quantity: input.quantity,
        maxPerOrder: input.maxPerOrder,
      });
      if (!options?.silent) addToast('Agregado al carrito', 'success');
      options?.onSuccess?.();
    }
  };

  return {
    addToCart,
    isAuthenticated,
    cartHref,
    isPending: addApi.isPending,
    localTotal,
  };
}
