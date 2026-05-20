import { redirect } from 'next/navigation';

export default function AdminExcursionLegacyNuevoRedirect() {
  redirect('/admin/excursiones/operadores/nuevo');
}
