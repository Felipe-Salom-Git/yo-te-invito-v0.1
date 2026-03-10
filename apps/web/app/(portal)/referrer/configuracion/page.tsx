'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle } from '@/components';

export default function ReferrerConfiguracionPage() {
  return (
    <PageContainer>
      <Link href="/referrer" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Configuración</SectionTitle>
      <p className="mt-2 text-text-muted">
        Cambio de contraseña, preferencias. (Próximamente)
      </p>
      <p className="mt-6 text-text-muted text-sm">
        En la versión demo, la contraseña es &quot;demo&quot; para todos los usuarios.
      </p>
    </PageContainer>
  );
}
