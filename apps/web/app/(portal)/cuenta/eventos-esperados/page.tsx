import { redirect } from 'next/navigation';

export default function CuentaEventosEsperadosRedirectPage() {
  redirect('/me/preferences?tab=expected');
}
