import { redirect } from 'next/navigation';

export default function CuentaEventosAsistidosRedirectPage() {
  redirect('/me/activity?tab=attended');
}
