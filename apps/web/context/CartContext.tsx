'use client';

import { createContext, useContext, useState, useCallback } from 'react';

export interface CartItem {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  quantity: number;
  maxPerOrder?: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (ticketTypeId: string, quantity: number) => void;
  removeItem: (ticketTypeId: string) => void;
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = 'yti:cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    saveCart(next);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const qty = item.quantity ?? 1;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.ticketTypeId === item.ticketTypeId);
      let next: CartItem[];
      if (idx >= 0) {
        const existing = prev[idx]!;
        const newQty = Math.min((existing.maxPerOrder ?? 10), existing.quantity + qty);
        next = [...prev];
        next[idx] = { ...existing, quantity: newQty };
      } else {
        next = [...prev, { ...item, quantity: qty }];
      }
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((ticketTypeId: string, quantity: number) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.ticketTypeId === ticketTypeId ? { ...i, quantity: Math.max(0, quantity) } : i
      ).filter((i) => i.quantity > 0);
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((ticketTypeId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.ticketTypeId !== ticketTypeId);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
