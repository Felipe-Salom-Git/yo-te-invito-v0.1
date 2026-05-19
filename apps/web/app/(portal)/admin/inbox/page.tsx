import { redirect } from 'next/navigation';

/** Legacy route — use /admin/gastronomicos */
export default function AdminInboxRedirectPage() {
  redirect('/admin/gastronomicos');
}
