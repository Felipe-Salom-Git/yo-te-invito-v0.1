import { redirect } from 'next/navigation';
import {
  isDemoCheckoutSuccess,
  searchParamsToQueryString,
} from '@/lib/getnet-portal-redirect';
import CheckoutSuccessDemo from './CheckoutSuccessDemo';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Getnet portal fixed success URL → `/checkout/return` (preserves query).
 * Guest cart demo (`orderIds=`) keeps the legacy multi-order success UI.
 */
export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (isDemoCheckoutSuccess(params)) {
    return <CheckoutSuccessDemo />;
  }

  redirect(`/checkout/return${searchParamsToQueryString(params)}`);
}
