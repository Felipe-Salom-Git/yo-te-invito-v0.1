import { redirect } from 'next/navigation';

/** Publicidad feature removed; redirect to admin dashboard. */
export default function AdminPublicidadPage() {
  redirect('/admin');
}
