import { redirect } from 'next/navigation';

export default function AdminRentalNuevoRedirectPage() {
  redirect('/admin/rentals/locales/nuevo');
}
