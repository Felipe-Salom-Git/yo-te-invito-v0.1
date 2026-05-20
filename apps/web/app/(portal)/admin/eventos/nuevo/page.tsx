import { redirect } from 'next/navigation';

export default function AdminEventoNuevoRedirectPage() {
  redirect('/admin/publicaciones-generales/nuevo');
}
