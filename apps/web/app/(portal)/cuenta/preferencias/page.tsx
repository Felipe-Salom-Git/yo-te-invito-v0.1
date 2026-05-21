import { redirect } from 'next/navigation';

export default function CuentaPreferenciasRedirectPage() {
  redirect('/me/preferences');
}
