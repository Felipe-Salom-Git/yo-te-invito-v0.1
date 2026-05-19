import { redirect } from 'next/navigation';

/** Legacy route — use /admin/contactos */
export default function AdminConfiguracionRedirectPage() {
  redirect('/admin/contactos');
}
