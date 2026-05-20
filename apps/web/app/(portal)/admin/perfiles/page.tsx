import { redirect } from 'next/navigation';

/** Ruta deprecada — los perfiles se activan al registrarse o crearse. */
export default function AdminPerfilesDeprecatedPage() {
  redirect('/admin');
}
