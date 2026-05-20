import { redirect } from 'next/navigation';

/** Ruta legacy — usar /admin/gastronomicos */
export default function AdminGastroDiscountsRedirectPage() {
  redirect('/admin/gastronomicos');
}
