import { redirect } from 'next/navigation';

export default function CuentaFavoritosRedirectPage() {
  redirect('/me/preferences?tab=favorites');
}
