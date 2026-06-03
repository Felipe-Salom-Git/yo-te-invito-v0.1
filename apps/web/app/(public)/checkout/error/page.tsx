import { redirect } from 'next/navigation';
import { buildCheckoutReturnCancelledQuery } from '@/lib/getnet-portal-redirect';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Getnet portal fixed error URL → `/checkout/return?cancelled=1` (+ preserved params).
 */
export default async function CheckoutErrorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  redirect(`/checkout/return${buildCheckoutReturnCancelledQuery(params)}`);
}
