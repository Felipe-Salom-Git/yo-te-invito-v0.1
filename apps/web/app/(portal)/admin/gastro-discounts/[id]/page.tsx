import { redirect } from 'next/navigation';

/** Ruta legacy — los descuentos se gestionan desde cada local en /admin/gastronomicos */
export default function AdminGastroDiscountLegacyRedirectPage() {
  redirect('/admin/gastronomicos');
}
