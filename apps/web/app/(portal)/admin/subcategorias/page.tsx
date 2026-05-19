import { redirect } from 'next/navigation';

/** Legacy route — use /admin/categorias */
export default function AdminSubcategoriasRedirectPage() {
  redirect('/admin/categorias');
}
